import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { agendarReuniaoRhCalendario } from "../../../lib/rhCalendarioAgendarReuniaoRh";
import { supabase } from "../../../lib/supabase";
import {
  RH_REUNIAO_COM_OPCOES,
  diaIsoEhEstritamenteFuturo,
  labelReuniaoCom,
  type RhReuniaoComValor,
} from "../../../lib/rhCalendarioAcaoHelpers";

type ThemePick = {
  text: string;
  textMuted: string;
  cardBorder: string;
  inputBg: string;
};

type BrandPick = {
  accent: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAgendado: () => void;
  t: ThemePick;
  brand: BrandPick;
  refMesIso: string;
  solicitanteFuncionarioId: string;
  diasEscalados: { iso: string; label: string; turno: string }[];
};

export function ModalAgendarReuniaoCalendario({
  open,
  onClose,
  onAgendado,
  t,
  brand,
  refMesIso,
  solicitanteFuncionarioId,
  diasEscalados,
}: Props) {
  const [reuniaoCom, setReuniaoCom] = useState<RhReuniaoComValor | "">("");
  const [motivo, setMotivo] = useState("");
  const [diaIso, setDiaIso] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReuniaoCom("");
    setMotivo("");
    setDiaIso("");
    setErro(null);
    setGravando(false);
  }, [open]);

  if (!open) return null;

  const inputStyle: CSSProperties = {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 14,
    fontFamily: FONT.body,
  };

  function validar(): string | null {
    if (!reuniaoCom) return "Selecione com quem será a reunião.";
    if (!(motivo ?? "").trim()) return "Informe o motivo da reunião.";
    if (!diaIso) return "Selecione a data da reunião.";
    if (!diaIsoEhEstritamenteFuturo(diaIso)) return "A data da reunião deve ser um dia futuro.";
    const hit = diasEscalados.find((d) => d.iso === diaIso);
    if (!hit) return "Escolha um dia futuro em que está escalado neste mês.";
    return null;
  }

  async function confirmar() {
    const v = validar();
    if (v) {
      setErro(v);
      return;
    }
    const hit = diasEscalados.find((d) => d.iso === diaIso)!;
    setGravando(true);
    setErro(null);

    if (reuniaoCom === "rh") {
      const res = await agendarReuniaoRhCalendario({
        solicitanteFuncionarioId,
        refMesIso,
        diaIso,
        turno: hit.turno,
        motivo: motivo.trim(),
      });
      setGravando(false);
      if (!res.ok) {
        setErro("Não foi possível agendar a reunião. Se o problema persistir, entre em contato com o suporte.");
        return;
      }
    } else {
      const { error } = await supabase.from("rh_calendario_acoes").insert({
        solicitante_funcionario_id: solicitanteFuncionarioId,
        tipo_acao: "agendamento_reuniao",
        status: "Agendado",
        ref_mes: refMesIso,
        payload: {
          dia_iso: diaIso,
          turno: hit.turno,
          reuniao_com: reuniaoCom,
          reuniao_com_label: labelReuniaoCom(reuniaoCom as string),
          motivo: motivo.trim(),
        },
      });
      setGravando(false);
      if (error) {
        setErro("Não foi possível agendar a reunião. Se o problema persistir, entre em contato com o suporte.");
        console.error("[ModalAgendarReuniaoCalendario]", error);
        return;
      }
    }
    onAgendado();
    onClose();
  }

  return (
    <ModalBase maxWidth={480} onClose={onClose} zIndex={1140}>
      <ModalHeader title="Agendar reunião" onClose={onClose} />
      <div style={{ padding: "4px 4px 0", fontFamily: FONT.body, color: t.text }}>
        {diasEscalados.length === 0 ? (
          <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.55, color: t.textMuted }}>
            Não há dias futuros com escala de trabalho neste mês na gestão de escala. Avance o mês ou confirme a
            sua escala na Gestão de Escala.
          </p>
        ) : null}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }} htmlFor="cal-agendar-reuniao-com">
            Com quem será a reunião
            <CampoObrigatorioMark />
          </label>
          <select
            id="cal-agendar-reuniao-com"
            aria-label="Com quem será a reunião"
            value={reuniaoCom}
            onChange={(e) => setReuniaoCom((e.target.value || "") as RhReuniaoComValor | "")}
            style={inputStyle}
          >
            <option value="">Selecione…</option>
            {RH_REUNIAO_COM_OPCOES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }} htmlFor="cal-agendar-reuniao-motivo">
            Motivo da Reunião
            <CampoObrigatorioMark />
          </label>
          <textarea
            id="cal-agendar-reuniao-motivo"
            aria-label="Motivo da reunião"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={5}
            placeholder="Descreve o assunto ou tópico do que se trata a reunião"
            style={{ ...inputStyle, resize: "vertical", minHeight: 100, lineHeight: 1.45 }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }} htmlFor="cal-agendar-reuniao-data">
            Data da reunião
            <CampoObrigatorioMark />
          </label>
          <select
            id="cal-agendar-reuniao-data"
            aria-label="Data da reunião"
            value={diaIso}
            onChange={(e) => setDiaIso(e.target.value)}
            disabled={diasEscalados.length === 0}
            style={inputStyle}
          >
            <option value="">Selecione…</option>
            {diasEscalados.map((o) => (
              <option key={o.iso} value={o.iso}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {erro ? (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#e84025" }} role="alert">
            {erro}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: "transparent",
              color: t.text,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONT.body,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={gravando || diasEscalados.length === 0}
            onClick={() => void confirmar()}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: `1px solid ${brand.accent}`,
              background: brand.accent,
              color: "#fff",
              fontWeight: 700,
              cursor: gravando || diasEscalados.length === 0 ? "not-allowed" : "pointer",
              fontFamily: FONT.body,
              opacity: gravando ? 0.7 : 1,
            }}
          >
            {gravando ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color="#fff" />
                Salvando…
              </span>
            ) : (
              "Agendar reunião"
            )}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
