import { useEffect, useId, useState } from "react";
import { Calendar, Check, Copy, Loader2, Mail, Smartphone } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import { FiltroBarTabButton } from "../../../components/dashboard";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../lib/filterBarStyles";
import {
  mensagemErroCalendarioIcsFeed,
  obterFeedCalendarioIcs,
  regenerarFeedCalendarioIcs,
  urlPublicaCalendarioIcs,
} from "../../../lib/rhCalendarioIcsFeed";

type AbaAgenda = "google" | "outlook" | "apple";

const ABAS: AbaAgenda[] = ["google", "outlook", "apple"];

type Props = {
  onClose: () => void;
};

export function ModalAdicionarAgendaCalendario({ onClose }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const uid = useId();
  const [aba, setAba] = useState<AbaAgenda>("google");
  const [url, setUrl] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [regenerando, setRegenerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [erroCopia, setErroCopia] = useState<string | null>(null);
  const [confirmarRegen, setConfirmarRegen] = useState(false);
  const [avisoRegen, setAvisoRegen] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setCarregando(true);
    setErro(null);
    void obterFeedCalendarioIcs().then((r) => {
      if (cancel) return;
      setCarregando(false);
      if (!r.ok) {
        setErro(mensagemErroCalendarioIcsFeed(r.error));
        return;
      }
      setUrl(urlPublicaCalendarioIcs(r.token));
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!copiado) return;
    const id = window.setTimeout(() => setCopiado(false), 2000);
    return () => window.clearTimeout(id);
  }, [copiado]);

  const copiar = async () => {
    if (!url) return;
    setErroCopia(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch (e: unknown) {
      console.error("[Calendario] Erro ao copiar link iCal:", e);
      setErroCopia("Não foi possível copiar o link. Selecione o endereço e copie manualmente.");
    }
  };

  const confirmarNovoLink = async () => {
    setRegenerando(true);
    setErro(null);
    setAvisoRegen(null);
    const r = await regenerarFeedCalendarioIcs();
    setRegenerando(false);
    if (!r.ok) {
      setErro(mensagemErroCalendarioIcsFeed(r.error));
      return;
    }
    setUrl(urlPublicaCalendarioIcs(r.token));
    setConfirmarRegen(false);
    setCopiado(false);
    setAvisoRegen("Novo link gerado. Cole-o de novo na sua agenda.");
  };

  const linkStripBg = t.isDark
    ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)"
    : brand.primaryTransparentBg;
  const linkStripBorder = brand.primaryTransparentBorder;
  const ocupado = carregando || regenerando;

  return (
    <ModalBase maxWidth={560} onClose={onClose}>
      <ModalHeader title="Adicionar à agenda" onClose={onClose} />

      <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted, lineHeight: 1.55, fontFamily: FONT.body }}>
        Cole este link na agenda Google, Outlook ou Apple. Passam a aparecer os seus turnos e as reuniões{" "}
        <strong style={{ color: t.text, fontWeight: 700 }}>aprovadas</strong>.
      </p>

      <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 8, fontFamily: FONT.body }}>
        Link da sua agenda
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 10, marginBottom: 14 }}>
        <div
          style={{
            flex: "1 1 240px",
            minWidth: 0,
            padding: "12px 14px",
            borderRadius: 12,
            border: linkStripBorder,
            background: linkStripBg,
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            color: t.text,
            wordBreak: "break-all",
            lineHeight: 1.5,
            display: "flex",
            alignItems: "center",
            minHeight: 44,
          }}
        >
          {carregando ? "Carregando…" : url || "—"}
        </div>
        <button
          type="button"
          onClick={() => void copiar()}
          disabled={!url || ocupado}
          aria-label={copiado ? "Link copiado" : "Copiar link"}
          title={copiado ? "Link copiado" : "Copiar link"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 18px",
            borderRadius: 12,
            border: brand.primaryTransparentBorder,
            background: brand.primaryTransparentBg,
            color: copiado ? "#22c55e" : t.text,
            fontWeight: 600,
            fontSize: 13,
            fontFamily: FONT.body,
            cursor: !url || ocupado ? "not-allowed" : "pointer",
            opacity: !url || ocupado ? 0.7 : 1,
          }}
        >
          {copiado ? <Check size={18} color="#22c55e" aria-hidden /> : <Copy size={18} aria-hidden />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>

      {erroCopia ? (
        <div
          role="alert"
          aria-live="polite"
          style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
        >
          {erroCopia}
        </div>
      ) : null}

      {erro ? (
        <div
          role="alert"
          aria-live="polite"
          style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
        >
          {erro}
        </div>
      ) : null}

      <div
        role="note"
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          padding: "12px 14px",
          borderRadius: 12,
          marginBottom: 18,
          background: "#f59e0b14",
          border: "1px solid #f59e0b44",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: "#f59e0b",
            marginTop: 5,
            flexShrink: 0,
          }}
        />
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: t.text, fontFamily: FONT.body }}>
          As plataformas de Agenda costumam atualizar <strong>cerca de uma vez por dia</strong>. Trocas no Marketplace
          ou alterações de escala podem aparecer apenas no dia seguinte. A fonte da verdade continua sendo esta página.
        </p>
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--brand-primary, #7c3aed)",
          margin: "0 0 10px",
          fontFamily: FONT.body,
        }}
      >
        Como conectar
      </div>
      <div
        role="tablist"
        aria-label="Instruções por agenda"
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ABAS, setAba, (k) => `${uid}-tab-${k}`)}
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}
      >
        <FiltroBarTabButton
          id={`${uid}-tab-google`}
          active={aba === "google"}
          aria-controls={`${uid}-panel-google`}
          onClick={() => setAba("google")}
          icon={<Calendar {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Google
        </FiltroBarTabButton>
        <FiltroBarTabButton
          id={`${uid}-tab-outlook`}
          active={aba === "outlook"}
          aria-controls={`${uid}-panel-outlook`}
          onClick={() => setAba("outlook")}
          icon={<Mail {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Outlook
        </FiltroBarTabButton>
        <FiltroBarTabButton
          id={`${uid}-tab-apple`}
          active={aba === "apple"}
          aria-controls={`${uid}-panel-apple`}
          onClick={() => setAba("apple")}
          icon={<Smartphone {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Apple
        </FiltroBarTabButton>
      </div>

      <div
        style={{
          padding: "14px 16px",
          borderRadius: 12,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg,
          marginBottom: 18,
          fontSize: 13,
          color: t.text,
          fontFamily: FONT.body,
          lineHeight: 1.5,
        }}
      >
        <ModalTabPanel active={aba === "google"} id={`${uid}-panel-google`} labelledBy={`${uid}-tab-google`}>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            <li style={{ marginBottom: 8 }}>
              No computador, abra o <strong>Google Agenda</strong>.
            </li>
            <li style={{ marginBottom: 8 }}>
              Clique na engrenagem → <strong>Configurações</strong>.
            </li>
            <li style={{ marginBottom: 8 }}>
              À esquerda, <strong>Adicionar agenda</strong> → <strong>Por URL</strong>.
            </li>
            <li>
              Cole o link copiado e clique em <strong>Adicionar agenda</strong>.
            </li>
          </ol>
        </ModalTabPanel>
        <ModalTabPanel active={aba === "outlook"} id={`${uid}-panel-outlook`} labelledBy={`${uid}-tab-outlook`}>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            <li style={{ marginBottom: 8 }}>
              Abra o <strong>Outlook na web</strong>.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong>Adicionar calendário</strong> → <strong>Inscrever-se a partir da web</strong>.
            </li>
            <li>Cole o link e salve. O calendário aparece na lista à esquerda.</li>
          </ol>
        </ModalTabPanel>
        <ModalTabPanel active={aba === "apple"} id={`${uid}-panel-apple`} labelledBy={`${uid}-tab-apple`}>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            <li style={{ marginBottom: 8 }}>
              No Mac: app <strong>Calendário</strong> → Arquivo → <strong>Nova assinatura de calendário</strong>.
            </li>
            <li style={{ marginBottom: 8 }}>
              No iPhone: Ajustes → Apps → Calendário → Contas → <strong>Adicionar conta inscrita</strong>.
            </li>
            <li>Cole o link. A agenda passa a atualizar sozinha.</li>
          </ol>
        </ModalTabPanel>
      </div>

      <div style={{ paddingTop: 4, borderTop: `1px solid ${t.cardBorder}` }}>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: t.textMuted, lineHeight: 1.5, fontFamily: FONT.body }}>
          Se o link vazar ou deixar de funcionar, gere um novo. O link antigo para de atualizar na agenda em que já foi
          colado.
        </p>
        <button
          type="button"
          onClick={() => setConfirmarRegen(true)}
          disabled={ocupado}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 10,
            cursor: ocupado ? "not-allowed" : "pointer",
            border: `1px solid ${t.cardBorder}`,
            background: "transparent",
            color: t.textMuted,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: FONT.body,
          }}
        >
          Gerar novo link
        </button>
        {confirmarRegen ? (
          <div
            style={{
              marginTop: 12,
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid rgba(232,64,37,0.35)",
              background: "#e8402514",
            }}
          >
            <p style={{ margin: "0 0 12px", fontSize: 13, color: t.text, lineHeight: 1.5, fontFamily: FONT.body }}>
              Deseja gerar um novo link?
              <br />
              <br />
              O endereço atual deixa de funcionar. Será preciso colar o link novo na agenda.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setConfirmarRegen(false)}
                disabled={regenerando}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  cursor: regenerando ? "not-allowed" : "pointer",
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: FONT.body,
                }}
              >
                Manter link atual
              </button>
              <button
                type="button"
                onClick={() => void confirmarNovoLink()}
                disabled={regenerando}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  cursor: regenerando ? "not-allowed" : "pointer",
                  border: "none",
                  background: "#e84025",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: FONT.body,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {regenerando ? (
                  <Loader2 size={14} className="app-lucide-spin" aria-hidden color="#fff" />
                ) : null}
                {regenerando ? "Gerando…" : "Gerar novo link"}
              </button>
            </div>
          </div>
        ) : null}
        {avisoRegen ? (
          <p
            role="status"
            aria-live="polite"
            style={{ margin: "12px 0 0", fontSize: 13, color: t.text, fontFamily: FONT.body }}
          >
            {avisoRegen}
          </p>
        ) : null}
      </div>
    </ModalBase>
  );
}
