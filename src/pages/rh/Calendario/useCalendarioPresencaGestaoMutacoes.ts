import { useCallback, type Dispatch, type SetStateAction } from "react";
import { supabase } from "../../../lib/supabase";
import {
  appendHistoricoPresenca,
  chavePresencaGestao,
  presencaCorrecaoAnaliseStatusEfetivo,
  type PresencaDiaGestao,
  type PresencaJustificativaMeta,
  type PresencaMesAprovacaoLinha,
} from "../../../lib/rhCalendarioPresencaGestao";
import {
  salvarPresencaGestaoDia,
  salvarPresencaGestaoDiaLote,
} from "../../../lib/rhCalendarioPresencaGestaoDb";
import { salvarAprovacaoPresencaMes, type PresencaAprovacaoMes } from "../../../lib/rhCalendarioPresencaAprovacaoMesDb";
import { uploadAtestadoPresencaCalendario } from "../../../lib/rhCalendarioPresencaAtestadoFiles";
import type { PresencaTurnoAlvo } from "./ModalAprovacaoPresencaCalendario";
import type {
  PresencaJustificarAlvo,
  PresencaJustificativaSubmitPayload,
} from "./ModalJustificarPresencaCalendario";

/** Chave YYYY-MM-DD no fuso local (alinhada a `dia_iso` da grade). */
function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function horaRegistoSP(isoTs: string | null | undefined): string {
  if (!isoTs) return "—";
  const d = new Date(isoTs);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

type PontoDia = { check_in_at: string | null; check_out_at: string | null };

export type UseCalendarioPresencaGestaoMutacoesOpts = {
  nomeUsuarioPresencaGestao: string;
  mapaPontoPorDiaIso: Map<string, PontoDia>;
  pontoRelatorioPorFid: Map<string, PontoDia>;
  presencaFilterStaffIds: string[];
  mesPresencaFechado: boolean;
  linhasAprovacaoPresencaMes: PresencaMesAprovacaoLinha[];
  current: Date;
  presencaGestaoPorChave: Map<string, PresencaDiaGestao>;
  setPresencaGestaoPorChave: Dispatch<SetStateAction<Map<string, PresencaDiaGestao>>>;
  gestaoRelatorioPorChave: Map<string, PresencaDiaGestao>;
  setGestaoRelatorioPorChave: Dispatch<SetStateAction<Map<string, PresencaDiaGestao>>>;
  setPresencaGestaoTick: Dispatch<SetStateAction<number>>;
  setAprovacaoPresencaMes: Dispatch<SetStateAction<PresencaAprovacaoMes | null>>;
  setModalAprovarPresencaMesAberto: Dispatch<SetStateAction<boolean>>;
  presencaAlvoModal: PresencaTurnoAlvo | null;
  setPresencaAlvoModal: Dispatch<SetStateAction<PresencaTurnoAlvo | null>>;
  presencaJustificarAlvo: PresencaJustificarAlvo | null;
  setPresencaJustificarAlvo: Dispatch<SetStateAction<PresencaJustificarAlvo | null>>;
};

/**
 * Mutações de gestão de presença (aprovar, corrigir, justificar, aprovar mês).
 * Estado e loads permanecem na página — este hook só orquestra setState + persistência.
 */
export function useCalendarioPresencaGestaoMutacoes(opts: UseCalendarioPresencaGestaoMutacoesOpts) {
  const {
    nomeUsuarioPresencaGestao,
    mapaPontoPorDiaIso,
    pontoRelatorioPorFid,
    presencaFilterStaffIds,
    mesPresencaFechado,
    linhasAprovacaoPresencaMes,
    current,
    presencaGestaoPorChave,
    setPresencaGestaoPorChave,
    gestaoRelatorioPorChave,
    setGestaoRelatorioPorChave,
    setPresencaGestaoTick,
    setAprovacaoPresencaMes,
    setModalAprovarPresencaMesAberto,
    presencaAlvoModal,
    setPresencaAlvoModal,
    presencaJustificarAlvo,
    setPresencaJustificarAlvo,
  } = opts;

  const persistirPresencaGestao = useCallback(
    async (funcionarioId: string, diaIso: string, gestao: PresencaDiaGestao): Promise<boolean> => {
      const { ok } = await salvarPresencaGestaoDia(supabase, funcionarioId, diaIso, gestao);
      if (!ok) {
        console.error("Não foi possível salvar a gestão de presença.");
        setPresencaGestaoTick((x) => x + 1);
      }
      return ok;
    },
    [setPresencaGestaoTick],
  );

  const confirmarAprovacaoPresenca = useCallback(async (): Promise<boolean> => {
    if (!presencaAlvoModal) return false;
    const diaIso = toISO(presencaAlvoModal.dia);
    const fid = presencaAlvoModal.funcionarioId;
    const chave = chavePresencaGestao(fid, diaIso);
    const em = new Date().toISOString();
    const atual =
      gestaoRelatorioPorChave.get(chave) ?? presencaGestaoPorChave.get(chave);
    const comHistorico = appendHistoricoPresenca(atual, {
      tipo: "aprovacao",
      em,
      por: nomeUsuarioPresencaGestao,
    });
    const novo: PresencaDiaGestao = {
      ...comHistorico,
      statusGestao: "aprovado",
      correcao: atual?.correcao,
      justificativa: atual?.justificativa,
    };

    const ok = await persistirPresencaGestao(fid, diaIso, novo);
    if (!ok) return false;

    setPresencaGestaoPorChave((prev) => {
      const next = new Map(prev);
      next.set(chave, novo);
      return next;
    });
    setGestaoRelatorioPorChave((prev) => {
      const next = new Map(prev);
      next.set(chave, novo);
      return next;
    });
    setPresencaAlvoModal(null);
    return true;
  }, [
    presencaAlvoModal,
    gestaoRelatorioPorChave,
    presencaGestaoPorChave,
    nomeUsuarioPresencaGestao,
    persistirPresencaGestao,
    setPresencaGestaoPorChave,
    setGestaoRelatorioPorChave,
    setPresencaAlvoModal,
  ]);

  const aprovarPresencaMesTodos = useCallback(async (): Promise<boolean> => {
    const fid = presencaFilterStaffIds[0];
    if (!fid || !mesPresencaFechado) return false;
    const em = new Date().toISOString();
    const nextMap = new Map(presencaGestaoPorChave);
    const lote: Array<{ diaIso: string; gestao: PresencaDiaGestao }> = [];

    for (const linha of linhasAprovacaoPresencaMes) {
      if (linha.status !== "Registrado") continue;
      const chave = chavePresencaGestao(fid, linha.diaIso);
      const atual = nextMap.get(chave);
      const comHistorico = appendHistoricoPresenca(atual, {
        tipo: "aprovacao",
        em,
        por: nomeUsuarioPresencaGestao,
      });
      const novo: PresencaDiaGestao = {
        ...comHistorico,
        statusGestao: "aprovado",
        correcao: atual?.correcao,
        justificativa: atual?.justificativa,
      };
      lote.push({ diaIso: linha.diaIso, gestao: novo });
      nextMap.set(chave, novo);
    }

    if (lote.length > 0) {
      const { ok: okLote } = await salvarPresencaGestaoDiaLote(supabase, fid, lote);
      if (!okLote) return false;
    }

    const { ok, aprovacao } = await salvarAprovacaoPresencaMes(
      supabase,
      fid,
      current,
      nomeUsuarioPresencaGestao,
    );
    if (!ok || !aprovacao) return false;

    setPresencaGestaoPorChave(nextMap);
    setAprovacaoPresencaMes(aprovacao);
    setModalAprovarPresencaMesAberto(false);
    setPresencaGestaoTick((x) => x + 1);
    return true;
  }, [
    presencaFilterStaffIds,
    mesPresencaFechado,
    linhasAprovacaoPresencaMes,
    presencaGestaoPorChave,
    nomeUsuarioPresencaGestao,
    current,
    setPresencaGestaoPorChave,
    setAprovacaoPresencaMes,
    setModalAprovarPresencaMesAberto,
    setPresencaGestaoTick,
  ]);

  const salvarCorrecaoPresenca = useCallback(
    async (payload: { entrada: string; saida: string; observacao: string }): Promise<boolean> => {
      if (!presencaAlvoModal) return false;
      const diaIso = toISO(presencaAlvoModal.dia);
      const fid = presencaAlvoModal.funcionarioId;
      const chave = chavePresencaGestao(fid, diaIso);
      const pt = mapaPontoPorDiaIso.get(diaIso) ?? pontoRelatorioPorFid.get(fid);
      const entradaRealAnterior = horaRegistoSP(pt?.check_in_at);
      const saidaRealAnterior = horaRegistoSP(pt?.check_out_at);
      const atual =
        gestaoRelatorioPorChave.get(chave) ?? presencaGestaoPorChave.get(chave);
      const comHistorico = appendHistoricoPresenca(atual, {
        tipo: "correcao",
        em: new Date().toISOString(),
        por: nomeUsuarioPresencaGestao,
      });
      const novo: PresencaDiaGestao = {
        ...comHistorico,
        statusGestao: "em_analise",
        correcao: {
          entradaRealAnterior,
          saidaRealAnterior,
          entradaCorrigida: payload.entrada,
          saidaCorrigida: payload.saida,
          observacao: payload.observacao.trim() || null,
          corrigidoPorNome: nomeUsuarioPresencaGestao,
          corrigidoEm: new Date().toISOString(),
          analiseStatus: "pendente",
        },
      };

      const ok = await persistirPresencaGestao(fid, diaIso, novo);
      if (!ok) return false;

      setPresencaGestaoPorChave((prev) => {
        const next = new Map(prev);
        next.set(chave, novo);
        return next;
      });
      setGestaoRelatorioPorChave((prev) => {
        const next = new Map(prev);
        next.set(chave, novo);
        return next;
      });
      setPresencaAlvoModal(null);
      return true;
    },
    [
      presencaAlvoModal,
      mapaPontoPorDiaIso,
      pontoRelatorioPorFid,
      gestaoRelatorioPorChave,
      presencaGestaoPorChave,
      nomeUsuarioPresencaGestao,
      persistirPresencaGestao,
      setPresencaGestaoPorChave,
      setGestaoRelatorioPorChave,
      setPresencaAlvoModal,
    ],
  );

  const analisarCorrecaoPresenca = useCallback(
    (funcionarioId: string, diaIso: string, decisao: "aprovada" | "recusada") => {
      const chave = chavePresencaGestao(funcionarioId, diaIso);
      const em = new Date().toISOString();
      const aplicar = (prev: Map<string, PresencaDiaGestao>) => {
        const next = new Map(prev);
        const atual = next.get(chave);
        if (!atual?.correcao) return prev;
        if (presencaCorrecaoAnaliseStatusEfetivo(atual.correcao) !== "pendente") return prev;

        let novo: PresencaDiaGestao;
        if (decisao === "aprovada") {
          const comHistorico = appendHistoricoPresenca(atual, {
            tipo: "aprovacao",
            em,
            por: nomeUsuarioPresencaGestao,
          });
          novo = {
            ...comHistorico,
            statusGestao: "aprovado",
            correcao: {
              ...atual.correcao,
              analiseStatus: "aprovada",
              analisePorNome: nomeUsuarioPresencaGestao,
              analiseEm: em,
            },
          };
        } else {
          novo = {
            ...atual,
            statusGestao: undefined,
            correcao: {
              ...atual.correcao,
              analiseStatus: "recusada",
              analisePorNome: nomeUsuarioPresencaGestao,
              analiseEm: em,
            },
          };
        }
        next.set(chave, novo);
        void persistirPresencaGestao(funcionarioId, diaIso, novo);
        return next;
      };
      setPresencaGestaoPorChave(aplicar);
      setGestaoRelatorioPorChave(aplicar);
    },
    [nomeUsuarioPresencaGestao, persistirPresencaGestao, setPresencaGestaoPorChave, setGestaoRelatorioPorChave],
  );

  const salvarJustificativaPresenca = useCallback(
    async (payload: PresencaJustificativaSubmitPayload): Promise<boolean> => {
      if (!presencaJustificarAlvo) return false;
      const diaIso = toISO(presencaJustificarAlvo.dia);
      const fid = presencaJustificarAlvo.funcionarioId;
      const chave = chavePresencaGestao(fid, diaIso);
      const pt =
        (presencaFilterStaffIds[0] === fid ? mapaPontoPorDiaIso.get(diaIso) : undefined) ??
        pontoRelatorioPorFid.get(fid);
      const entradaRealAnterior = horaRegistoSP(pt?.check_in_at);
      const saidaRealAnterior = horaRegistoSP(pt?.check_out_at);
      const em = new Date().toISOString();
      const atual = gestaoRelatorioPorChave.get(chave) ?? presencaGestaoPorChave.get(chave);

      if (payload.motivo === "medico") {
        const up = await uploadAtestadoPresencaCalendario(fid, diaIso, payload.arquivo);
        if (!up.ok) return false;
        const comHistorico = appendHistoricoPresenca(atual, {
          tipo: "justificativa",
          em,
          por: nomeUsuarioPresencaGestao,
        });
        const justificativa: PresencaJustificativaMeta = {
          motivo: "medico",
          registradoPorNome: nomeUsuarioPresencaGestao,
          registradoEm: em,
          atestadoInicio: payload.atestadoInicio,
          atestadoFim: payload.atestadoFim,
          atestadoStoragePath: up.storagePath,
          atestadoFileName: up.fileName,
          observacao: payload.observacao.trim() || null,
          atestadoStatus: "em_analise",
          atestadoDiaRegistro: diaIso,
        };
        const novo: PresencaDiaGestao = {
          ...comHistorico,
          statusGestao: "em_analise",
          justificativa,
        };
        const ok = await persistirPresencaGestao(fid, diaIso, novo);
        if (!ok) return false;
        const patchGestao = (prev: Map<string, PresencaDiaGestao>) => {
          const next = new Map(prev);
          next.set(chave, novo);
          return next;
        };
        setPresencaGestaoPorChave(patchGestao);
        setGestaoRelatorioPorChave(patchGestao);
        setPresencaGestaoTick((x) => x + 1);
        setPresencaJustificarAlvo(null);
        return true;
      }

      if (payload.motivo === "esquecimento") {
        let base = appendHistoricoPresenca(atual, {
          tipo: "justificativa",
          em,
          por: nomeUsuarioPresencaGestao,
        });
        base = appendHistoricoPresenca(base, {
          tipo: "correcao",
          em,
          por: nomeUsuarioPresencaGestao,
        });
        const justificativa: PresencaJustificativaMeta = {
          motivo: "esquecimento",
          registradoPorNome: nomeUsuarioPresencaGestao,
          registradoEm: em,
        };
        const novo: PresencaDiaGestao = {
          ...base,
          statusGestao: "em_analise",
          justificativa,
          correcao: {
            entradaRealAnterior,
            saidaRealAnterior,
            entradaCorrigida: payload.entrada,
            saidaCorrigida: payload.saida,
            observacao: null,
            corrigidoPorNome: nomeUsuarioPresencaGestao,
            corrigidoEm: em,
            analiseStatus: "pendente",
          },
        };
        const ok = await persistirPresencaGestao(fid, diaIso, novo);
        if (!ok) return false;
        const patchGestaoEsq = (prev: Map<string, PresencaDiaGestao>) => {
          const next = new Map(prev);
          next.set(chave, novo);
          return next;
        };
        setPresencaGestaoPorChave(patchGestaoEsq);
        setGestaoRelatorioPorChave(patchGestaoEsq);
        setPresencaJustificarAlvo(null);
        return true;
      }

      const comHistorico = appendHistoricoPresenca(atual, {
        tipo: "justificativa",
        em,
        por: nomeUsuarioPresencaGestao,
      });
      const justificativa: PresencaJustificativaMeta = {
        motivo: "outro",
        registradoPorNome: nomeUsuarioPresencaGestao,
        registradoEm: em,
        observacao: payload.observacao,
      };
      const novo: PresencaDiaGestao = { ...comHistorico, justificativa };
      const ok = await persistirPresencaGestao(fid, diaIso, novo);
      if (!ok) return false;
      const patchGestaoOutro = (prev: Map<string, PresencaDiaGestao>) => {
        const next = new Map(prev);
        next.set(chave, novo);
        return next;
      };
      setPresencaGestaoPorChave(patchGestaoOutro);
      setGestaoRelatorioPorChave(patchGestaoOutro);
      setPresencaJustificarAlvo(null);
      return true;
    },
    [
      presencaJustificarAlvo,
      presencaGestaoPorChave,
      gestaoRelatorioPorChave,
      mapaPontoPorDiaIso,
      pontoRelatorioPorFid,
      presencaFilterStaffIds,
      nomeUsuarioPresencaGestao,
      persistirPresencaGestao,
      setPresencaGestaoPorChave,
      setGestaoRelatorioPorChave,
      setPresencaGestaoTick,
      setPresencaJustificarAlvo,
    ],
  );

  return {
    confirmarAprovacaoPresenca,
    aprovarPresencaMesTodos,
    salvarCorrecaoPresenca,
    analisarCorrecaoPresenca,
    salvarJustificativaPresenca,
  };
}
