import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Upload } from "lucide-react";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { CampoUploadArquivos } from "../../../components/CampoUploadArquivos";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import {
  aplicarMascaraHorarioPresencaHHMM,
  normalizarHorarioPresencaHHMM,
  validarHorarioPresencaHHMM,
  type PresencaJustificativaMotivo,
} from "../../../lib/rhCalendarioPresencaGestao";
import {
  RH_CALENDARIO_PRESENCA_ATESTADO_ACCEPT,
} from "../../../lib/rhCalendarioPresencaAtestadoFiles";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";

export type PresencaJustificarAlvo = {
  funcionarioId: string;
  dia: Date;
  entRealOriginal: string;
  saiRealOriginal: string;
};

export type PresencaJustificativaSubmitPayload =
  | {
      motivo: "medico";
      atestadoInicio: string;
      atestadoFim: string;
      arquivo: File;
      observacao: string;
    }
  | { motivo: "esquecimento"; entrada: string; saida: string }
  | { motivo: "outro"; observacao: string };

type Props = {
  open: boolean;
  alvo: PresencaJustificarAlvo | null;
  onClose: () => void;
  onSalvar: (payload: PresencaJustificativaSubmitPayload) => Promise<boolean>;
  t: Theme;
  brand: ReturnType<typeof useDashboardBrand>;
};

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

function subtituloJustificarPt(d: Date): string {
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

function validarDatasAtestado(inicio: string, fim: string): string | null {
  if (!inicio.trim()) return "Informe o início do atestado.";
  if (!fim.trim()) return "Informe o fim do atestado.";
  if (fim < inicio) return "A data fim não pode ser anterior à data de início.";
  return null;
}

export function ModalJustificarPresencaCalendario({ open, alvo, onClose, onSalvar, t, brand }: Props) {
  const [motivo, setMotivo] = useState<PresencaJustificativaMotivo | "">("");
  const [atestadoInicio, setAtestadoInicio] = useState("");
  const [atestadoFim, setAtestadoFim] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [observacao, setObservacao] = useState("");
  const [entradaEsquecimento, setEntradaEsquecimento] = useState("");
  const [saidaEsquecimento, setSaidaEsquecimento] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const alvoDiaMs = alvo?.dia.getTime();
  const alvoFuncionarioId = alvo?.funcionarioId;

  useEffect(() => {
    if (!open || alvoDiaMs == null || !alvoFuncionarioId) return;
    setMotivo("");
    setAtestadoInicio("");
    setAtestadoFim("");
    setArquivo(null);
    setObservacao("");
    setEntradaEsquecimento("");
    setSaidaEsquecimento("");
    setErr(null);
    setSalvando(false);
  }, [open, alvoDiaMs, alvoFuncionarioId]);

  if (!open || !alvo) return null;

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

  const salvar = async () => {
    setErr(null);
    if (!motivo) {
      setErr("Selecione o motivo da justificativa.");
      return;
    }

    if (motivo === "medico") {
      const errDatas = validarDatasAtestado(atestadoInicio, atestadoFim);
      if (errDatas) {
        setErr(errDatas);
        return;
      }
      if (!arquivo) {
        setErr("Anexe o atestado.");
        return;
      }
      setSalvando(true);
      const ok = await onSalvar({
        motivo: "medico",
        atestadoInicio,
        atestadoFim,
        arquivo,
        observacao: observacao.trim(),
      });
      setSalvando(false);
      if (!ok) {
        setErr("Não foi possível salvar a justificativa. Se o problema persistir, entre em contato com o suporte.");
      }
      return;
    }

    if (motivo === "esquecimento") {
      const ent = normalizarHorarioPresencaHHMM(entradaEsquecimento);
      const sai = normalizarHorarioPresencaHHMM(saidaEsquecimento);
      if (!validarHorarioPresencaHHMM(ent)) {
        setErr("Informe a correção de entrada no formato HH:MM.");
        return;
      }
      if (!validarHorarioPresencaHHMM(sai)) {
        setErr("Informe a correção de saída no formato HH:MM.");
        return;
      }
      setSalvando(true);
      const ok = await onSalvar({ motivo: "esquecimento", entrada: ent, saida: sai });
      setSalvando(false);
      if (!ok) {
        setErr("Não foi possível salvar a justificativa. Se o problema persistir, entre em contato com o suporte.");
      }
      return;
    }

    if (!observacao.trim()) {
      setErr("Informe a observação.");
      return;
    }
    setSalvando(true);
    const ok = await onSalvar({ motivo: "outro", observacao: observacao.trim() });
    setSalvando(false);
    if (!ok) {
      setErr("Não foi possível salvar a justificativa. Se o problema persistir, entre em contato com o suporte.");
    }
  };

  return (
    <ModalBase maxWidth={480} onClose={onClose} zIndex={1300}>
      <ModalHeader title="Justificar" onClose={onClose} />
      <p
        style={{
          margin: "0 0 16px",
          color: t.textMuted,
          fontSize: 13,
          fontFamily: FONT.body,
        }}
      >
        {subtituloJustificarPt(alvo.dia)}
      </p>

      <div style={{ marginBottom: 14 }}>
        <label htmlFor="pres-just-motivo" style={labelField}>
          Motivo
          <CampoObrigatorioMark />
        </label>
        <select
          id="pres-just-motivo"
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value as PresencaJustificativaMotivo | "");
            setErr(null);
          }}
          style={inputField(t)}
          aria-required="true"
          aria-label="Motivo da justificativa"
        >
          <option value="">Selecione...</option>
          <option value="medico">Médico</option>
          <option value="esquecimento">Esquecimento</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      {motivo === "medico" ? (
        <>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="pres-just-inicio" style={labelField}>
              Início do Atestado
              <CampoObrigatorioMark />
            </label>
            <input
              id="pres-just-inicio"
              type="date"
              value={atestadoInicio}
              onChange={(e) => setAtestadoInicio(e.target.value)}
              style={inputField(t)}
              aria-required="true"
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="pres-just-fim" style={labelField}>
              Fim do Atestado
              <CampoObrigatorioMark />
            </label>
            <input
              id="pres-just-fim"
              type="date"
              value={atestadoFim}
              min={atestadoInicio || undefined}
              onChange={(e) => setAtestadoFim(e.target.value)}
              style={inputField(t)}
              aria-required="true"
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <CampoUploadArquivos
              id="pres-just-atestado"
              label="Atestado"
              buttonLabel="Anexar arquivo"
              icon={Upload}
              accept={RH_CALENDARIO_PRESENCA_ATESTADO_ACCEPT}
              multiple={false}
              obrigatorio
              items={
                arquivo ? [{ key: "atestado", label: arquivo.name, pendente: true }] : []
              }
              onAdd={(files) => {
                const f = files[0];
                if (f) {
                  setArquivo(f);
                  setErr(null);
                }
              }}
              onRemove={() => setArquivo(null)}
              disabled={salvando}
              t={t}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="pres-just-obs-medico" style={labelField}>
              Observação
            </label>
            <textarea
              id="pres-just-obs-medico"
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              style={{ ...inputField(t), resize: "vertical" }}
            />
          </div>
        </>
      ) : null}

      {motivo === "esquecimento" ? (
        <>
          <p
            style={{
              margin: "0 0 14px",
              color: t.textMuted,
              fontSize: 12,
              fontFamily: FONT.body,
              lineHeight: 1.5,
            }}
          >
            Informe entrada e saída realizadas. Após salvar, a correção seguirá o fluxo de aprovação pelo líder.
          </p>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="pres-just-entrada" style={labelField}>
              Correção de Entrada
              <CampoObrigatorioMark />
            </label>
            <input
              id="pres-just-entrada"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="00:00"
              maxLength={5}
              value={entradaEsquecimento}
              onChange={(e) => setEntradaEsquecimento(aplicarMascaraHorarioPresencaHHMM(e.target.value))}
              style={inputField(t)}
              aria-required="true"
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="pres-just-saida" style={labelField}>
              Correção de Saída
              <CampoObrigatorioMark />
            </label>
            <input
              id="pres-just-saida"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="00:00"
              maxLength={5}
              value={saidaEsquecimento}
              onChange={(e) => setSaidaEsquecimento(aplicarMascaraHorarioPresencaHHMM(e.target.value))}
              style={inputField(t)}
              aria-required="true"
            />
          </div>
        </>
      ) : null}

      {motivo === "outro" ? (
        <div style={{ marginBottom: 8 }}>
          <label htmlFor="pres-just-obs-outro" style={labelField}>
            Observação
            <CampoObrigatorioMark />
          </label>
          <textarea
            id="pres-just-obs-outro"
            rows={4}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            style={{ ...inputField(t), resize: "vertical" }}
            aria-required="true"
          />
        </div>
      ) : null}

      {err ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
          {err}
        </div>
      ) : null}

      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
        {motivo ? (
          <button type="button" onClick={() => void salvar()} disabled={salvando} style={btnPrimario}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        ) : null}
      </div>
    </ModalBase>
  );
}
