import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { getDataTableStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import {
  aplicarMascaraHorarioPresencaHHMM,
  normalizarHorarioPresencaHHMM,
  validarHorarioPresencaHHMM,
} from "../../../lib/rhCalendarioPresencaGestao";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";

export type PresencaTurnoAlvo = {
  funcionarioId: string;
  dia: Date;
  entEsc: string;
  saiEsc: string;
  horasEsc: string;
  entReal: string;
  saiReal: string;
  horasReal: string;
  /** Horários originais do ponto — valores iniciais do modal de correção. */
  entRealOriginal: string;
  saiRealOriginal: string;
};

function valorInicialCorrecaoPresenca(realizado: string): string {
  if (realizado === "—" || !realizado.trim()) return "";
  const n = normalizarHorarioPresencaHHMM(realizado);
  return validarHorarioPresencaHHMM(n) ? n : "";
}

function correcaoPresencaIgualRealizado(correcao: string, realizado: string): boolean {
  if (realizado === "—" || !realizado.trim()) return false;
  if (!validarHorarioPresencaHHMM(correcao)) return false;
  const r = normalizarHorarioPresencaHHMM(realizado);
  if (!validarHorarioPresencaHHMM(r)) return false;
  return normalizarHorarioPresencaHHMM(correcao) === r;
}

type PresencaGestaoSaveResult = { ok: boolean; semPermissao?: boolean };

type Props = {
  open: boolean;
  alvo: PresencaTurnoAlvo;
  onClose: () => void;
  onAprovar: () => boolean | Promise<boolean | PresencaGestaoSaveResult>;
  onSalvarCorrecao: (payload: {
    entrada: string;
    saida: string;
    observacao: string;
  }) => boolean | Promise<boolean | PresencaGestaoSaveResult>;
  t: Theme;
  brand: ReturnType<typeof useDashboardBrand>;
};

const MSG_ERRO_APROVAR =
  "Não foi possível aprovar o turno. Se o problema persistir, entre em contato com o suporte.";
const MSG_ERRO_APROVAR_PERM =
  "Você não tem permissão de Editar para aprovar este turno. Peça liberação em Gestão de Usuários → Permissões (Calendário).";
const MSG_ERRO_CORRECAO =
  "Não foi possível salvar a correção. Se o problema persistir, entre em contato com o suporte.";
const MSG_ERRO_CORRECAO_PERM =
  "Você não tem permissão de Editar para corrigir este turno. Peça liberação em Gestão de Usuários → Permissões (Calendário).";

function normalizarResultadoSave(
  result: boolean | PresencaGestaoSaveResult,
): PresencaGestaoSaveResult {
  if (typeof result === "boolean") return { ok: result };
  return result;
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DAYS_LONG = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function subtituloAprovacaoTurnoPt(d: Date): string {
  const dow = (DAYS_LONG[d.getDay()] ?? "").replace("-feira", "");
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = MONTHS[d.getMonth()] ?? "";
  return `${dow}, ${dia} de ${mes}`;
}

const labelField: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "inherit",
  fontFamily: FONT.body,
  marginBottom: 6,
};

const inputField = (t: Theme): CSSProperties => ({
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${t.cardBorder}`,
  background: t.inputBg,
  color: t.text,
  fontSize: 13,
  fontFamily: FONT.body,
  boxSizing: "border-box",
});

export function ModalAprovacaoPresencaCalendario({
  open,
  alvo,
  onClose,
  onAprovar,
  onSalvarCorrecao,
  t,
  brand,
}: Props) {
  const dataTable = useDataTableBlock();
  const [modo, setModo] = useState<"aprovacao" | "correcao">("aprovacao");
  const [entradaCorrecao, setEntradaCorrecao] = useState("");
  const [saidaCorrecao, setSaidaCorrecao] = useState("");
  const [observacao, setObservacao] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setModo("aprovacao");
    setEntradaCorrecao("");
    setSaidaCorrecao("");
    setObservacao("");
    setErr(null);
    setSalvando(false);
  }, [open, alvo.dia, alvo.funcionarioId]);

  if (!open) return null;

  const btnSecundario: CSSProperties = {
    padding: "10px 18px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontWeight: 700,
    fontFamily: FONT.body,
    fontSize: 13,
    cursor: "pointer",
  };

  const btnPrimario: CSSProperties = {
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    background: getCtaCriarGradient(brand),
    color: "#fff",
    fontWeight: 700,
    fontFamily: FONT.body,
    fontSize: 13,
    cursor: salvando ? "not-allowed" : "pointer",
    opacity: salvando ? 0.7 : 1,
  };

  const salvarCorrecao = () => {
    setErr(null);
    const ent = normalizarHorarioPresencaHHMM(entradaCorrecao);
    const sai = normalizarHorarioPresencaHHMM(saidaCorrecao);
    if (!validarHorarioPresencaHHMM(ent)) {
      setErr("Informe a correção de entrada no formato HH:MM.");
      return;
    }
    if (!validarHorarioPresencaHHMM(sai)) {
      setErr("Informe a correção de saída no formato HH:MM.");
      return;
    }
    if (!observacao.trim()) {
      setErr("Informe a observação da correção.");
      return;
    }
    if (
      correcaoPresencaIgualRealizado(ent, alvo.entRealOriginal) &&
      correcaoPresencaIgualRealizado(sai, alvo.saiRealOriginal)
    ) {
      setErr("Informe pelo menos um horário de correção diferente do realizado.");
      return;
    }
    setSalvando(true);
    void (async () => {
      try {
        const result = normalizarResultadoSave(
          await Promise.resolve(
            onSalvarCorrecao({ entrada: ent, saida: sai, observacao: observacao.trim() }),
          ),
        );
        if (!result.ok) {
          setErr(result.semPermissao ? MSG_ERRO_CORRECAO_PERM : MSG_ERRO_CORRECAO);
        }
      } catch (e) {
        console.error("[ModalAprovacaoPresenca] correção:", e);
        setErr(MSG_ERRO_CORRECAO);
      } finally {
        setSalvando(false);
      }
    })();
  };

  const aprovarTurno = () => {
    setErr(null);
    setSalvando(true);
    void (async () => {
      try {
        const result = normalizarResultadoSave(await Promise.resolve(onAprovar()));
        if (!result.ok) {
          setErr(result.semPermissao ? MSG_ERRO_APROVAR_PERM : MSG_ERRO_APROVAR);
        }
      } catch (e) {
        console.error("[ModalAprovacaoPresenca] aprovação:", e);
        setErr(MSG_ERRO_APROVAR);
      } finally {
        setSalvando(false);
      }
    })();
  };

  if (modo === "correcao") {
    return (
      <ModalBase maxWidth={480} onClose={onClose} zIndex={1300}>
        <ModalHeader title="Correção de presença" onClose={onClose} />
        <p
          style={{
            margin: "0 0 16px",
            color: t.textMuted,
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          {subtituloAprovacaoTurnoPt(alvo.dia)}
        </p>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="pres-correcao-entrada" style={labelField}>
            Correção de Entrada
            <CampoObrigatorioMark />
          </label>
          <input
            id="pres-correcao-entrada"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="00:00"
            maxLength={5}
            value={entradaCorrecao}
            onChange={(e) => setEntradaCorrecao(aplicarMascaraHorarioPresencaHHMM(e.target.value))}
            onBlur={() => {
              const n = normalizarHorarioPresencaHHMM(entradaCorrecao);
              if (validarHorarioPresencaHHMM(n)) setEntradaCorrecao(n);
            }}
            style={inputField(t)}
            aria-required="true"
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="pres-correcao-saida" style={labelField}>
            Correção de Saída
            <CampoObrigatorioMark />
          </label>
          <input
            id="pres-correcao-saida"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="00:00"
            maxLength={5}
            value={saidaCorrecao}
            onChange={(e) => setSaidaCorrecao(aplicarMascaraHorarioPresencaHHMM(e.target.value))}
            onBlur={() => {
              const n = normalizarHorarioPresencaHHMM(saidaCorrecao);
              if (validarHorarioPresencaHHMM(n)) setSaidaCorrecao(n);
            }}
            style={inputField(t)}
            aria-required="true"
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label htmlFor="pres-correcao-obs" style={labelField}>
            Observação
            <CampoObrigatorioMark />
          </label>
          <textarea
            id="pres-correcao-obs"
            rows={3}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            style={{ ...inputField(t), resize: "vertical" }}
            aria-required="true"
          />
        </div>
        {err ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
            {err}
          </div>
        ) : null}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={salvarCorrecao} disabled={salvando} style={btnPrimario}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </ModalBase>
    );
  }

  return (
    <ModalBase maxWidth={560} onClose={onClose} zIndex={1200}>
      <ModalHeader title="Aprovar turno" onClose={onClose} />
      <p
        style={{
          margin: "0 0 16px",
          color: t.textMuted,
          fontSize: 13,
          fontFamily: FONT.body,
        }}
      >
        {subtituloAprovacaoTurnoPt(alvo.dia)}
      </p>
      <div className="app-table-wrap" style={{ marginBottom: 20 }}>
        <table style={getDataTableStyle({ minWidth: 420 })}>
          <caption style={{ display: "none" }}>Comparativo escalado e realizado do turno</caption>
          <thead>
            <tr>
              <th scope="col" style={dataTable.thHeader} />
              <th scope="col" style={dataTable.thHeader}>
                Entrada
              </th>
              <th scope="col" style={dataTable.thHeader}>
                Saída
              </th>
              <th scope="col" style={dataTable.thHeader}>
                Horas
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: dataTable.zebraRow(0) }}>
              <th scope="row" style={{ ...dataTable.tdCenter, fontWeight: 700, textAlign: "center" }}>
                Escalado
              </th>
              <td style={dataTable.tdCenter}>{alvo.entEsc}</td>
              <td style={dataTable.tdCenter}>{alvo.saiEsc}</td>
              <td style={dataTable.tdCenter}>{alvo.horasEsc}</td>
            </tr>
            <tr style={{ background: dataTable.zebraRow(1) }}>
              <th scope="row" style={{ ...dataTable.tdCenter, fontWeight: 700, textAlign: "center" }}>
                Realizado
              </th>
              <td style={dataTable.tdCenter}>{alvo.entReal}</td>
              <td style={dataTable.tdCenter}>{alvo.saiReal}</td>
              <td style={dataTable.tdCenter}>{alvo.horasReal}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {err ? (
        <div
          role="alert"
          aria-live="polite"
          style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
        >
          {err}
        </div>
      ) : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={salvando}
          onClick={() => {
            setEntradaCorrecao(valorInicialCorrecaoPresenca(alvo.entRealOriginal));
            setSaidaCorrecao(valorInicialCorrecaoPresenca(alvo.saiRealOriginal));
            setObservacao("");
            setErr(null);
            setModo("correcao");
          }}
          style={btnSecundario}
        >
          Editar
        </button>
        <button type="button" onClick={aprovarTurno} disabled={salvando} style={btnPrimario}>
          {salvando ? "Aprovando…" : "Aprovar"}
        </button>
      </div>
    </ModalBase>
  );
}
