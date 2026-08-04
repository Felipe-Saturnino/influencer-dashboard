import {
  chavePresencaGestao,
  presencaCorrecaoCampoAprovado,
  resolverStatusPresencaLinha,
  type PresencaDiaGestao,
} from "./rhCalendarioPresencaGestao";
import type { RhFuncionario } from "../types/rhFuncionario";
import {
  chaveMovimentacaoCelula,
  formatarDetalheMovimentacao,
  movimentacaoEhFolgaVendida,
  movimentacaoEhTroca,
  movimentacaoEhTurnoVendido,
  situacaoEhCompraMarketplace,
  type OverviewPrestadorMovimentacaoCelula,
} from "./overviewPrestadorMovimentacoes";
import {
  diasDoMesRef,
  duracaoMinutosEntreTimestampsIso,
  duracaoMinutosRelogioHHMM,
  entradaAtrasadaMais5Min,
  horaRegistoSP,
  isoEstaNoPeriodo,
  obterEntradaSaidaEscaladasPrestadorDia,
  areaKeyGradeDia,
  primeiroValorGradeDiaParaPrestador,
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
  /** Preenchido na visão de time. */
  prestadorId?: string;
  prestadorNome?: string;
  timeRotulo?: string;
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
  /** Ofertas venda_turno — célula Venda (sem espelhar a Compra). */
  turnosVendidos: number;
  /** Ofertas venda_folga — célula Venda do interessado (sem espelhar a Compra). */
  folgasVendidas: number;
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
  turnosVendidos: 0,
  folgasVendidas: 0,
  detalhamento: [],
};

export type CalcularMetricasPrestadorInput = {
  funcionarioId: string;
  prestador: RhFuncionario | undefined;
  opTurnos: OpTurnosHorarioPick | null;
  gradeRows: RpcGradeCalendarioRow[];
  pontoRows: RpcPontoMesRow[];
  presencaGestao: Map<string, PresencaDiaGestao>;
  /** Snapshot Marketplace (contraparte) — chave `funcionarioId|YYYY-MM-DD`. */
  movimentacoes?: Map<string, OverviewPrestadorMovimentacaoCelula>;
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
  const entExib = presencaCorrecaoCampoAprovado(correcao, "entrada")
    ? (correcao?.entradaCorrigida ?? entReal)
    : entReal;
  const saiExib = presencaCorrecaoCampoAprovado(correcao, "saida")
    ? (correcao?.saidaCorrigida ?? saiReal)
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
    movimentacoes,
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
  let turnosVendidos = 0;
  let folgasVendidas = 0;

  for (const { ano, mes } of mesesRef) {
    for (const dia of diasDoMesRef(ano, mes)) {
      const iso = toIsoLocal(dia);
      if (!isoEstaNoPeriodo(iso, periodoInicio, periodoFim)) continue;

      const valorG = primeiroValorGradeDiaParaPrestador(gradeRows, funcionarioId, iso, prestador);
      const situacao = situacaoGestaoEscalaParaDia(valorG);
      const snapMov = movimentacoes?.get(chaveMovimentacaoCelula(funcionarioId, iso));
      const esc = obterEntradaSaidaEscaladasPrestadorDia(
        prestador,
        valorG,
        opTurnos,
        prestador?.area_atuacao === "escritorio"
          ? "escritorio"
          : areaKeyGradeDia(gradeRows, funcionarioId, iso),
      );
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

      const ehVenda = situacao === "Venda";
      const ehCompra = situacaoEhCompraMarketplace(situacao);
      const ehTroca = situacao === "Troca" || ((ehVenda || ehCompra) && movimentacaoEhTroca(snapMov));
      if (ehTroca) {
        trocas += 1;
        detalhamento.push({
          dataIso: iso,
          ocorrencia: "Troca",
          detalhe: formatarDetalheMovimentacao("Troca", snapMov),
        });
      } else if (movimentacaoEhTurnoVendido(situacao, snapMov)) {
        turnosVendidos += 1;
        detalhamento.push({
          dataIso: iso,
          ocorrencia: "Venda",
          detalhe: formatarDetalheMovimentacao("Venda", snapMov),
        });
      } else if (movimentacaoEhFolgaVendida(situacao, snapMov)) {
        folgasVendidas += 1;
        detalhamento.push({
          dataIso: iso,
          ocorrencia: "Venda",
          detalhe: formatarDetalheMovimentacao("Folga Vendida", snapMov),
        });
      } else if (ehCompra) {
        // Compra espelha a venda — não entra no gráfico; mantém no Detalhamento.
        detalhamento.push({
          dataIso: iso,
          ocorrencia: "Compra",
          detalhe: formatarDetalheMovimentacao("Compra", snapMov),
        });
      } else if (ehVenda) {
        turnosVendidos += 1;
        detalhamento.push({
          dataIso: iso,
          ocorrencia: "Venda",
          detalhe: formatarDetalheMovimentacao("Venda", snapMov),
        });
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

        if (temCheckIn || status === "Aprovado" || status === "Atestado" || status === "Abonado") {
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
    turnosVendidos,
    folgasVendidas,
    detalhamento,
  };
}

export function somarMetricasPrestador(
  partes: OverviewPrestadorMetricas[],
): OverviewPrestadorMetricas {
  const out: OverviewPrestadorMetricas = { ...OVERVIEW_PRESTADOR_METRICAS_ZERO, detalhamento: [] };
  for (const m of partes) {
    out.diasEscalado += m.diasEscalado;
    out.diasRealizado += m.diasRealizado;
    out.horasEscaladasMin += m.horasEscaladasMin;
    out.horasRealizadasMin += m.horasRealizadasMin;
    out.entradasAtrasadas += m.entradasAtrasadas;
    out.saidasAntecipadas += m.saidasAntecipadas;
    out.checkInNaoRegistrado += m.checkInNaoRegistrado;
    out.checkOutNaoRegistrado += m.checkOutNaoRegistrado;
    out.diasAtestado += m.diasAtestado;
    out.trocas += m.trocas;
    out.turnosVendidos += m.turnosVendidos;
    out.folgasVendidas += m.folgasVendidas;
    out.detalhamento.push(...m.detalhamento);
  }
  out.detalhamento.sort((a, b) => b.dataIso.localeCompare(a.dataIso));
  return out;
}

export type OverviewPrestadorAtencaoLinha = {
  prestadorId: string;
  nome: string;
  timeRotulo: string;
  presencaPct: number | null;
  atrasos: number;
  pontoIncompleto: number;
  atestadoDias: number;
  severidade: "alta" | "media" | "ok";
};

export function severidadeAtencaoPrestador(m: OverviewPrestadorMetricas): "alta" | "media" | "ok" {
  const presenca =
    m.diasEscalado > 0 ? (m.diasRealizado / m.diasEscalado) * 100 : null;
  const ocorrencias =
    m.entradasAtrasadas +
    m.saidasAntecipadas +
    m.checkInNaoRegistrado +
    m.checkOutNaoRegistrado +
    (m.diasAtestado > 0 ? 1 : 0);
  if (presenca != null && presenca < 90) return "alta";
  if (ocorrencias >= 3) return "media";
  return "ok";
}

export function montarLinhaAtencao(
  prestadorId: string,
  nome: string,
  timeRotulo: string,
  m: OverviewPrestadorMetricas,
): OverviewPrestadorAtencaoLinha {
  const presencaPct =
    m.diasEscalado > 0 ? Math.round((m.diasRealizado / m.diasEscalado) * 1000) / 10 : null;
  return {
    prestadorId,
    nome,
    timeRotulo,
    presencaPct,
    atrasos: m.entradasAtrasadas + m.saidasAntecipadas,
    pontoIncompleto: m.checkInNaoRegistrado + m.checkOutNaoRegistrado,
    atestadoDias: m.diasAtestado,
    severidade: severidadeAtencaoPrestador(m),
  };
}

export type OverviewPrestadorCoberturaLinha = {
  chave: string;
  label: string;
  prestadores: number;
  jornadasEscaladas: number;
  jornadasRealizadas: number;
  movimentacoes: number;
};

export type OverviewPrestadorEstudioFatia = {
  slug: string;
  label: string;
  dias: number;
};
