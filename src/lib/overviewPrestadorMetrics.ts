import {
  chavePresencaGestao,
  presencaCorrecaoAnaliseStatusEfetivo,
  presencaCorrecaoCampoAlterado,
  resolverStatusPresencaLinha,
  type PresencaDiaGestao,
} from "./rhCalendarioPresencaGestao";
import type { RhFuncionario } from "../types/rhFuncionario";
import {
  diasDoMesRef,
  duracaoMinutosEntreTimestampsIso,
  duracaoMinutosRelogioHHMM,
  entradaAtrasadaMais5Min,
  horaRegistoSP,
  isoEstaNoPeriodo,
  obterEntradaSaidaEscaladasPrestadorDia,
  primeiroValorGradeDia,
  saidaAntecipadaMais5Min,
  situacaoGestaoEscalaParaDia,
  statusPresencaNoDia,
  toIsoLocal,
  type OpTurnosHorarioPick,
  type RpcGradeCalendarioRow,
  type RpcPontoMesRow,
} from "./overviewPrestadorCalendarioHelpers";

export type OverviewPrestadorOcorrencia =
  | "Troca"
  | "Atestado"
  | "Atraso"
  | "Esquecimento"
  | "Compra"
  | "Venda";

export type OverviewPrestadorDetalheLinha = {
  dataIso: string;
  ocorrencia: OverviewPrestadorOcorrencia;
  detalhe: string;
};

export type OverviewPrestadorMetricas = {
  diasEscalado: number;
  diasRealizado: number;
  horasEscaladasMin: number;
  horasRealizadasMin: number;
  entradasAtrasadas: number;
  saidasAntecipadas: number;
  checkInNaoRegistrado: number;
  checkOutNaoRegistrado: number;
  diasAtestado: number;
  trocas: number;
  vendas: number;
  compras: number;
  detalhamento: OverviewPrestadorDetalheLinha[];
};

export const OVERVIEW_PRESTADOR_METRICAS_ZERO: OverviewPrestadorMetricas = {
  diasEscalado: 0,
  diasRealizado: 0,
  horasEscaladasMin: 0,
  horasRealizadasMin: 0,
  entradasAtrasadas: 0,
  saidasAntecipadas: 0,
  checkInNaoRegistrado: 0,
  checkOutNaoRegistrado: 0,
  diasAtestado: 0,
  trocas: 0,
  vendas: 0,
  compras: 0,
  detalhamento: [],
};

export type CalcularMetricasPrestadorInput = {
  funcionarioId: string;
  prestador: RhFuncionario | undefined;
  opTurnos: OpTurnosHorarioPick | null;
  gradeRows: RpcGradeCalendarioRow[];
  pontoRows: RpcPontoMesRow[];
  presencaGestao: Map<string, PresencaDiaGestao>;
  periodoInicio: string;
  periodoFim: string;
  /** Meses a iterar (ano, mes0) — ex.: mês do carrossel ou todos no histórico. */
  mesesRef: { ano: number; mes: number }[];
};

function pontoPorDia(pontoRows: RpcPontoMesRow[]): Map<string, RpcPontoMesRow> {
  const map = new Map<string, RpcPontoMesRow>();
  for (const r of pontoRows) {
    const iso = (r.dia_sp ?? "").slice(0, 10);
    if (iso) map.set(iso, r);
  }
  return map;
}

function contarDiasAtestado(inicio: string, fim: string, periodoInicio: string, periodoFim: string): number {
  const start = inicio.slice(0, 10);
  const end = fim.slice(0, 10);
  const from = start > periodoInicio ? start : periodoInicio;
  const to = end < periodoFim ? end : periodoFim;
  if (from > to) return 0;
  const d0 = new Date(from + "T12:00:00");
  const d1 = new Date(to + "T12:00:00");
  return Math.round((d1.getTime() - d0.getTime()) / 86400000) + 1;
}

function horariosRealizadosExib(
  pt: RpcPontoMesRow | undefined,
  gestao: PresencaDiaGestao | undefined,
): { ent: string; sai: string; checkInIso: string | null; checkOutIso: string | null } {
  const entReal = horaRegistoSP(pt?.check_in_at);
  const saiReal = horaRegistoSP(pt?.check_out_at);
  const correcao = gestao?.correcao;
  const correcaoAprovada =
    Boolean(correcao) && presencaCorrecaoAnaliseStatusEfetivo(correcao) === "aprovada";
  const entExib =
    correcaoAprovada && correcao && presencaCorrecaoCampoAlterado("entrada", correcao)
      ? correcao.entradaCorrigida
      : entReal;
  const saiExib =
    correcaoAprovada && correcao && presencaCorrecaoCampoAlterado("saida", correcao)
      ? correcao.saidaCorrigida
      : saiReal;
  return {
    ent: entExib,
    sai: saiExib,
    checkInIso: pt?.check_in_at ?? null,
    checkOutIso: pt?.check_out_at ?? null,
  };
}

export function calcularMetricasPrestadorPeriodo(input: CalcularMetricasPrestadorInput): OverviewPrestadorMetricas {
  const {
    funcionarioId,
    prestador,
    opTurnos,
    gradeRows,
    pontoRows,
    presencaGestao,
    periodoInicio,
    periodoFim,
    mesesRef,
  } = input;

  const mapaPonto = pontoPorDia(pontoRows);
  const detalhamento: OverviewPrestadorDetalheLinha[] = [];
  const atestadosProcessados = new Set<string>();

  let diasEscalado = 0;
  let diasRealizado = 0;
  let horasEscaladasMin = 0;
  let horasRealizadasMin = 0;
  let entradasAtrasadas = 0;
  let saidasAntecipadas = 0;
  let checkInNaoRegistrado = 0;
  let checkOutNaoRegistrado = 0;
  let diasAtestado = 0;
  let trocas = 0;
  let vendas = 0;
  let compras = 0;

  for (const { ano, mes } of mesesRef) {
    for (const dia of diasDoMesRef(ano, mes)) {
      const iso = toIsoLocal(dia);
      if (!isoEstaNoPeriodo(iso, periodoInicio, periodoFim)) continue;

      const valorG = primeiroValorGradeDia(gradeRows, funcionarioId, iso);
      const situacao = situacaoGestaoEscalaParaDia(valorG);
      const esc = obterEntradaSaidaEscaladasPrestadorDia(prestador, valorG, opTurnos);
      const pt = mapaPonto.get(iso);
      const gestao = presencaGestao.get(chavePresencaGestao(funcionarioId, iso));
      const { ent: entRealExib, sai: saiRealExib, checkInIso, checkOutIso } = horariosRealizadosExib(
        pt,
        gestao,
      );
      const entEsc = esc ? esc.entrada : "—";
      const saiEsc = esc ? esc.saida : "—";
      const temCheckIn = Boolean(checkInIso);
      const temCheckOut = Boolean(checkOutIso);
      const stBase = statusPresencaNoDia(esc, checkInIso, checkOutIso);
      const status = resolverStatusPresencaLinha({
        situacao,
        diaIso: iso,
        entEsc,
        saiEsc,
        temCheckIn,
        temCheckOut,
        statusBase: stBase,
        gestao,
      });

      if (situacao === "Troca") {
        trocas += 1;
        detalhamento.push({ dataIso: iso, ocorrencia: "Troca", detalhe: "—" });
      }
      if (situacao === "Venda") {
        vendas += 1;
        detalhamento.push({ dataIso: iso, ocorrencia: "Venda", detalhe: "—" });
      }
      if (situacao === "Compra") {
        compras += 1;
        detalhamento.push({ dataIso: iso, ocorrencia: "Compra", detalhe: "—" });
      }

      const just = gestao?.justificativa;
      if (just?.motivo === "medico" && just.atestadoInicio && just.atestadoFim) {
        const chave = `${just.atestadoInicio}:${just.atestadoFim}`;
        if (!atestadosProcessados.has(chave)) {
          atestadosProcessados.add(chave);
          const dias = contarDiasAtestado(
            just.atestadoInicio,
            just.atestadoFim,
            periodoInicio,
            periodoFim,
          );
          if (dias > 0) {
            diasAtestado += dias;
            detalhamento.push({
              dataIso: iso,
              ocorrencia: "Atestado",
              detalhe: `${dias} ${dias === 1 ? "dia" : "dias"}`,
            });
          }
        }
      }

      if (just?.motivo === "esquecimento") {
        const faltouCheckIn = !temCheckIn;
        const faltouCheckOut = !temCheckOut;
        if (faltouCheckIn) checkInNaoRegistrado += 1;
        if (faltouCheckOut) checkOutNaoRegistrado += 1;
        const partes: string[] = [];
        if (faltouCheckIn) partes.push("Check-in");
        if (faltouCheckOut) partes.push("Check-out");
        if (partes.length > 0) {
          detalhamento.push({
            dataIso: iso,
            ocorrencia: "Esquecimento",
            detalhe: partes.join(" e "),
          });
        }
      }

      if (situacao === "Escalado") {
        diasEscalado += 1;
        const escMin = duracaoMinutosRelogioHHMM(entEsc, saiEsc);
        if (escMin != null) horasEscaladasMin += escMin;

        if (temCheckIn || status === "Aprovado") {
          diasRealizado += 1;
        }

        const realMin =
          duracaoMinutosEntreTimestampsIso(checkInIso, checkOutIso) ??
          duracaoMinutosRelogioHHMM(entRealExib, saiRealExib);
        if (realMin != null && temCheckIn && temCheckOut) {
          horasRealizadasMin += realMin;
        }

        if (temCheckIn && entEsc !== "—" && entRealExib !== "—" && entradaAtrasadaMais5Min(entEsc, entRealExib)) {
          entradasAtrasadas += 1;
          const diff = (() => {
            const m1 = /^(\d{1,2}):(\d{2})$/.exec(entEsc.trim());
            const m2 = /^(\d{1,2}):(\d{2})$/.exec(entRealExib.trim());
            if (!m1 || !m2) return null;
            return parseInt(m2[1]!, 10) * 60 + parseInt(m2[2]!, 10) - (parseInt(m1[1]!, 10) * 60 + parseInt(m1[2]!, 10));
          })();
          detalhamento.push({
            dataIso: iso,
            ocorrencia: "Atraso",
            detalhe: diff != null && diff > 0 ? `${Math.floor(diff / 60) > 0 ? `${Math.floor(diff / 60)}h ` : ""}${diff % 60} min`.trim() : "—",
          });
        }

        if (temCheckOut && saiEsc !== "—" && saiRealExib !== "—" && saidaAntecipadaMais5Min(saiEsc, saiRealExib)) {
          saidasAntecipadas += 1;
          const diff = (() => {
            const m1 = /^(\d{1,2}):(\d{2})$/.exec(saiEsc.trim());
            const m2 = /^(\d{1,2}):(\d{2})$/.exec(saiRealExib.trim());
            if (!m1 || !m2) return null;
            return parseInt(m2[1]!, 10) * 60 + parseInt(m2[2]!, 10) - (parseInt(m1[1]!, 10) * 60 + parseInt(m1[2]!, 10));
          })();
          if (diff != null && diff < 0) {
            const abs = Math.abs(diff);
            detalhamento.push({
              dataIso: iso,
              ocorrencia: "Atraso",
              detalhe: `Saída antecipada ${Math.floor(abs / 60) > 0 ? `${Math.floor(abs / 60)}h ` : ""}${abs % 60} min`.trim(),
            });
          }
        }
      }
    }
  }

  detalhamento.sort((a, b) => b.dataIso.localeCompare(a.dataIso));

  return {
    diasEscalado,
    diasRealizado,
    horasEscaladasMin,
    horasRealizadasMin,
    entradasAtrasadas,
    saidasAntecipadas,
    checkInNaoRegistrado,
    checkOutNaoRegistrado,
    diasAtestado,
    trocas,
    vendas,
    compras,
    detalhamento,
  };
}
