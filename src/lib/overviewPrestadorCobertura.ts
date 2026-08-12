import type { RhFuncionario } from "../types/rhFuncionario";
import {
  turnoOperacionalParaSiglaGrade,
} from "./rhEscalaTurnos";
import { turnoOperacionalValorGrade } from "./rhCalendarioAcaoHelpers";
import type { OverviewPrestadorTimeCaps } from "./overviewPrestadorTeamConfig";
import {
  chavePresencaGestao,
  resolverStatusPresencaLinha,
  type PresencaDiaGestao,
} from "./rhCalendarioPresencaGestao";
import type {
  OverviewPrestadorCoberturaLinha,
  OverviewPrestadorEstudioFatia,
} from "./overviewPrestadorMetrics";
import {
  areaKeyGradeDia,
  diasDoMesRef,
  isoEstaNoPeriodo,
  obterEntradaSaidaEscaladasPrestadorDia,
  primeiroValorGradeDiaParaPrestador,
  situacaoGestaoEscalaParaDia,
  situacaoOverviewContaComoEscalado,
  statusPresencaNoDia,
  toIsoLocal,
  type OpTurnosHorarioPick,
  type RpcGradeCalendarioRow,
  type RpcPontoMesRow,
} from "./overviewPrestadorCalendarioHelpers";
import type { OverviewPrestadorMovimentacaoCelula } from "./overviewPrestadorMovimentacoes";
import { chaveMovimentacaoCelula } from "./overviewPrestadorMovimentacoes";
import { normalizarTextoBusca } from "./searchText";

const ESTUDIO_TODOS = "todos";

/**
 * O snapshot do Marketplace grava o **rótulo** do estúdio; o cadastro do Staff grava o
 * **slug**. Sem esta resolução a mesma unidade rende duas linhas na Cobertura por estúdio.
 */
function resolverSlugEstudio(
  valorRaw: string,
  estudiosNome: Record<string, string>,
): string {
  const valor = valorRaw.trim();
  if (!valor || valor === "—") return "";
  if (estudiosNome[valor]) return valor;
  const alvo = normalizarTextoBusca(valor);
  for (const [slug, nome] of Object.entries(estudiosNome)) {
    if (normalizarTextoBusca(nome) === alvo || normalizarTextoBusca(slug) === alvo) return slug;
  }
  return valor;
}

function parseEstudioSlugs(row: RhFuncionario): string[] {
  const fromArray = Array.isArray(row.staff_estudio_slugs)
    ? row.staff_estudio_slugs.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (fromArray.length > 0) return fromArray;
  const direct = (row.staff_estudio_slug ?? "").trim();
  return direct ? [direct] : [];
}

function slugEstudioPrimario(row: RhFuncionario, opParaEstudio: Record<string, string>): string {
  const slugs = parseEstudioSlugs(row);
  if (slugs.includes(ESTUDIO_TODOS)) return "";
  if (slugs[0]) return slugs[0];
  const op = (row.staff_operadora_slug ?? "").trim();
  return op && opParaEstudio[op] ? opParaEstudio[op]! : "";
}

function siglaTurnoDaCelula(valor: string): "MRN" | "AFT" | "NGT" | null {
  const turno = turnoOperacionalValorGrade(valor);
  if (!turno) return null;
  const sigla = turnoOperacionalParaSiglaGrade(turno);
  if (sigla === "MRN" || sigla === "AFT" || sigla === "NGT") return sigla;
  return null;
}

type AccBucket = {
  label: string;
  prestadores: Set<string>;
  jornadasEscaladas: number;
  jornadasRealizadas: number;
  movimentacoes: number;
};

function emptyAcc(label: string): AccBucket {
  return {
    label,
    prestadores: new Set(),
    jornadasEscaladas: 0,
    jornadasRealizadas: 0,
    movimentacoes: 0,
  };
}

function diaRealizado(
  funcionarioId: string,
  iso: string,
  situacao: string,
  valorG: string | null,
  prestador: RhFuncionario | undefined,
  opTurnos: OpTurnosHorarioPick | null,
  gradeRows: RpcGradeCalendarioRow[],
  mapaPonto: Map<string, RpcPontoMesRow>,
  presencaGestao: Map<string, PresencaDiaGestao>,
): boolean {
  if (situacao !== "Escalado" && situacao !== "Atestado" && !situacao.startsWith("Compra")) return false;
  const esc = obterEntradaSaidaEscaladasPrestadorDia(
    prestador,
    valorG,
    opTurnos,
    prestador?.area_atuacao === "escritorio"
      ? "escritorio"
      : areaKeyGradeDia(gradeRows, funcionarioId, iso),
  );
  const pt = mapaPonto.get(`${funcionarioId}|${iso}`) ?? mapaPonto.get(iso);
  const gestao = presencaGestao.get(chavePresencaGestao(funcionarioId, iso));
  const temCheckIn = Boolean(pt?.check_in_at);
  const temCheckOut = Boolean(pt?.check_out_at);
  const entEsc = esc ? esc.entrada : "—";
  const saiEsc = esc ? esc.saida : "—";
  const stBase = statusPresencaNoDia(esc, pt?.check_in_at ?? null, pt?.check_out_at ?? null);
  const status = resolverStatusPresencaLinha({
    situacao: situacao.startsWith("Compra") ? "Escalado" : situacao,
    diaIso: iso,
    entEsc,
    saiEsc,
    temCheckIn,
    temCheckOut,
    statusBase: stBase,
    gestao,
  });
  return temCheckIn || status === "Aprovado" || status === "Atestado" || status === "Abonado";
}

export type CoberturaInput = {
  funcionarioIds: string[];
  prestadorPorId: Map<string, RhFuncionario>;
  opTurnosPorFuncionario: Map<string, OpTurnosHorarioPick | null>;
  gradeRows: RpcGradeCalendarioRow[];
  /** Chave `funcionarioId|YYYY-MM-DD` ou só `YYYY-MM-DD` (visão individual). */
  pontoPorChave: Map<string, RpcPontoMesRow>;
  presencaGestao: Map<string, PresencaDiaGestao>;
  movimentacoes?: Map<string, OverviewPrestadorMovimentacaoCelula>;
  periodoInicio: string;
  periodoFim: string;
  mesesRef: { ano: number; mes: number }[];
  caps: OverviewPrestadorTimeCaps;
  opParaEstudio: Record<string, string>;
  estudiosNome: Record<string, string>;
};

function toLinhas(map: Map<string, AccBucket>, ordem: { chave: string; label: string }[]): OverviewPrestadorCoberturaLinha[] {
  const rows: OverviewPrestadorCoberturaLinha[] = [];
  const totalPrest = new Set<string>();
  let totalEsc = 0;
  let totalReal = 0;
  let totalMov = 0;
  for (const o of ordem) {
    const acc = map.get(o.chave);
    if (!acc || (acc.jornadasEscaladas === 0 && acc.movimentacoes === 0)) continue;
    rows.push({
      chave: o.chave,
      label: o.label,
      prestadores: acc.prestadores.size,
      jornadasEscaladas: acc.jornadasEscaladas,
      jornadasRealizadas: acc.jornadasRealizadas,
      movimentacoes: acc.movimentacoes,
    });
    acc.prestadores.forEach((id) => totalPrest.add(id));
    totalEsc += acc.jornadasEscaladas;
    totalReal += acc.jornadasRealizadas;
    totalMov += acc.movimentacoes;
  }
  if (rows.length === 0) return [];
  rows.push({
    chave: "__total__",
    label: "Total",
    prestadores: totalPrest.size,
    jornadasEscaladas: totalEsc,
    jornadasRealizadas: totalReal,
    movimentacoes: totalMov,
  });
  return rows;
}

/** Cobertura por turno (e opcionalmente por estúdio) a partir da grade aprovada. */
export function calcularCoberturaPrestadorPeriodo(input: CoberturaInput): {
  porTurno: OverviewPrestadorCoberturaLinha[];
  porEstudio: OverviewPrestadorCoberturaLinha[];
} {
  const {
    funcionarioIds,
    prestadorPorId,
    opTurnosPorFuncionario,
    gradeRows,
    pontoPorChave,
    presencaGestao,
    movimentacoes,
    periodoInicio,
    periodoFim,
    mesesRef,
    caps,
    opParaEstudio,
    estudiosNome,
  } = input;

  const porTurno = new Map<string, AccBucket>();
  for (const t of caps.turnos) porTurno.set(t.key, emptyAcc(t.label));

  const porEstudio = new Map<string, AccBucket>();

  for (const funcionarioId of funcionarioIds) {
    const prestador = prestadorPorId.get(funcionarioId);
    const opTurnos = opTurnosPorFuncionario.get(funcionarioId) ?? null;
    for (const { ano, mes } of mesesRef) {
      for (const dia of diasDoMesRef(ano, mes)) {
        const iso = toIsoLocal(dia);
        if (!isoEstaNoPeriodo(iso, periodoInicio, periodoFim)) continue;
        const valorG = primeiroValorGradeDiaParaPrestador(gradeRows, funcionarioId, iso, prestador);
        const situacao = situacaoGestaoEscalaParaDia(valorG);
        const ehJornada =
          situacaoOverviewContaComoEscalado(situacao) || situacaoEhCompraLocal(situacao);
        const ehTrabalho = ehJornada || situacao === "Troca";
        if (!ehTrabalho && situacao !== "Venda") continue;

        const sigla = valorG ? siglaTurnoDaCelula(valorG) : null;
        const turnoKey =
          sigla && porTurno.has(sigla)
            ? sigla
            : caps.turnos.length === 2 && sigla === "AFT"
              ? null
              : sigla && caps.turnos.some((t) => t.key === sigla)
                ? sigla
                : null;

        const movDia =
          situacao === "Troca" || situacao === "Venda" || situacaoEhCompraLocal(situacao) ? 1 : 0;
        const realizado = ehJornada
          ? diaRealizado(
              funcionarioId,
              iso,
              situacao,
              valorG,
              prestador,
              opTurnos,
              gradeRows,
              pontoPorChave,
              presencaGestao,
            )
          : false;

        if (turnoKey && (ehJornada || situacao === "Troca")) {
          const acc = porTurno.get(turnoKey)!;
          // Prestadores = quadro que cumpre jornada no turno; dia só de Troca não aloca ninguém.
          if (ehJornada) {
            acc.prestadores.add(funcionarioId);
            acc.jornadasEscaladas += 1;
            if (realizado) acc.jornadasRealizadas += 1;
          }
          acc.movimentacoes += movDia;
        }

        if (caps.porEstudio && prestador && (ehJornada || situacao === "Troca")) {
          const snap = movimentacoes?.get(chaveMovimentacaoCelula(funcionarioId, iso));
          const estudioSnap = resolverSlugEstudio(snap?.estudioTrabalhar ?? "", estudiosNome);
          let bucketKey = estudioSnap;
          let bucketLabel = estudioSnap ? (estudiosNome[estudioSnap] ?? estudioSnap) : "";
          if (!bucketKey) {
            const slugs = parseEstudioSlugs(prestador);
            if (slugs.includes(ESTUDIO_TODOS)) continue;
            bucketKey = slugEstudioPrimario(prestador, opParaEstudio);
            if (!bucketKey) continue;
            bucketLabel = estudiosNome[bucketKey] ?? bucketKey;
          }
          let accE = porEstudio.get(bucketKey);
          if (!accE) {
            accE = emptyAcc(bucketLabel);
            porEstudio.set(bucketKey, accE);
          }
          if (ehJornada) {
            accE.prestadores.add(funcionarioId);
            accE.jornadasEscaladas += 1;
            if (realizado) accE.jornadasRealizadas += 1;
          }
          accE.movimentacoes += movDia;
        }
      }
    }
  }

  const ordemTurno = caps.turnos.map((t) => ({ chave: t.key, label: t.label }));
  const ordemEstudio = [...porEstudio.entries()]
    .sort((a, b) => a[1].label.localeCompare(b[1].label, "pt-BR"))
    .map(([chave, v]) => ({ chave, label: v.label }));

  return {
    porTurno: toLinhas(porTurno, ordemTurno),
    porEstudio: caps.porEstudio ? toLinhas(porEstudio, ordemEstudio) : [],
  };
}

function situacaoEhCompraLocal(situacao: string): boolean {
  return situacao === "Compra" || situacao.startsWith("Compra - ");
}

/** Distribuição de dias realizados por estúdio (visão individual GP). */
export function calcularDistribuicaoEstudioIndividual(input: {
  funcionarioId: string;
  prestador: RhFuncionario | undefined;
  opTurnos: OpTurnosHorarioPick | null;
  gradeRows: RpcGradeCalendarioRow[];
  pontoRows: RpcPontoMesRow[];
  presencaGestao: Map<string, PresencaDiaGestao>;
  movimentacoes?: Map<string, OverviewPrestadorMovimentacaoCelula>;
  periodoInicio: string;
  periodoFim: string;
  mesesRef: { ano: number; mes: number }[];
  opParaEstudio: Record<string, string>;
  estudiosNome: Record<string, string>;
}): OverviewPrestadorEstudioFatia[] {
  const {
    funcionarioId,
    prestador,
    opTurnos,
    gradeRows,
    pontoRows,
    presencaGestao,
    movimentacoes,
    periodoInicio,
    periodoFim,
    mesesRef,
    opParaEstudio,
    estudiosNome,
  } = input;
  if (!prestador) return [];

  const mapaPonto = new Map<string, RpcPontoMesRow>();
  for (const r of pontoRows) {
    const iso = (r.dia_sp ?? "").slice(0, 10);
    if (iso) mapaPonto.set(iso, r);
  }

  const slugsCadastro = parseEstudioSlugs(prestador);
  const fallbackSlug = slugEstudioPrimario(prestador, opParaEstudio);
  const counts = new Map<string, { label: string; dias: number }>();

  for (const { ano, mes } of mesesRef) {
    for (const dia of diasDoMesRef(ano, mes)) {
      const iso = toIsoLocal(dia);
      if (!isoEstaNoPeriodo(iso, periodoInicio, periodoFim)) continue;
      const valorG = primeiroValorGradeDiaParaPrestador(gradeRows, funcionarioId, iso, prestador);
      const situacao = situacaoGestaoEscalaParaDia(valorG);
      if (!situacaoOverviewContaComoEscalado(situacao) && !situacaoEhCompraLocal(situacao)) continue;
      const realizado = diaRealizado(
        funcionarioId,
        iso,
        situacao,
        valorG,
        prestador,
        opTurnos,
        gradeRows,
        mapaPonto,
        presencaGestao,
      );
      if (!realizado) continue;

      const snap = movimentacoes?.get(chaveMovimentacaoCelula(funcionarioId, iso));
      let slug = resolverSlugEstudio(snap?.estudioTrabalhar ?? "", estudiosNome);
      if (!slug) {
        if (slugsCadastro.includes(ESTUDIO_TODOS)) continue;
        slug = fallbackSlug;
      }
      if (!slug) continue;
      const cur = counts.get(slug) ?? { label: estudiosNome[slug] ?? slug, dias: 0 };
      cur.dias += 1;
      counts.set(slug, cur);
    }
  }

  return [...counts.entries()]
    .map(([slug, v]) => ({ slug, label: v.label, dias: v.dias }))
    .sort((a, b) => b.dias - a.dias || a.label.localeCompare(b.label, "pt-BR"));
}
