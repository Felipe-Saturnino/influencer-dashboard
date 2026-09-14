import { useState, useEffect } from "react";
import { Search, Lock, CircleCheckBig, VenetianMask, ShieldBan, Megaphone } from "lucide-react";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../components/dashboard";
import { FONT } from "../../constants/theme";
import { buildLoginPath } from "../../lib/appRoutes";
import { useDisableAppUiZoom } from "../../hooks/useDisableAppUiZoom";
import { CanalDenunciarPanel } from "./CanalDenunciarPanel";
import { CanalConsultarPanel } from "./CanalConsultarPanel";

const BADGES: {
  Icon: typeof Lock;
  title: string;
  text: string;
}[] = [
  {
    Icon: Lock,
    title: "Confidencial",
    text: "Suas informações são protegidas e tratadas com total sigilo.",
  },
  {
    Icon: CircleCheckBig,
    title: "Toda Denúncia Importa",
    text: "Nenhum relato é ignorado. Cada caso recebe atenção dedicada e retorno formal.",
  },
  {
    Icon: VenetianMask,
    title: "Anônimo",
    text: "Você pode denunciar sem se identificar. O anonimato é garantido.",
  },
  {
    Icon: ShieldBan,
    title: "Sem retaliação",
    text: "Qualquer forma de retaliação a denunciantes é proibida e punível.",
  },
];

type TabKey = "denunciar" | "consultar";

const CANAL_TABS: TabKey[] = ["denunciar", "consultar"];

/** Evita faixa clara no rodapé: tema claro do `body`/`#root` ficava visível atrás do zoom. */
function useCanalDenunciasPublicViewportBg() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const snap = {
      htmlBg: html.style.background,
      htmlMinH: html.style.minHeight,
      bodyBg: body.style.background,
      bodyMinH: body.style.minHeight,
      rootBg: root?.style.background ?? "",
      rootMinH: root?.style.minHeight ?? "",
    };
    const grad = "linear-gradient(135deg, #0a0a0f 0%, #2d1b4e 100%)";
    html.style.background = "#0a0a0f";
    html.style.minHeight = "100%";
    body.style.background = grad;
    body.style.minHeight = "100%";
    if (root) {
      root.style.minHeight = "100%";
      root.style.background = grad;
    }
    return () => {
      html.style.background = snap.htmlBg;
      html.style.minHeight = snap.htmlMinH;
      body.style.background = snap.bodyBg;
      body.style.minHeight = snap.bodyMinH;
      if (root) {
        root.style.background = snap.rootBg;
        root.style.minHeight = snap.rootMinH;
      }
    };
  }, []);
}

export default function CanalDenunciasSpinPage() {
  useCanalDenunciasPublicViewportBg();
  /** B7 — zoom do `#root` desalinha cliques nas abas/Pesquisar (mesmo padrão do Login). */
  useDisableAppUiZoom(true);

  const [aba, setAba] = useState<TabKey>("denunciar");
  const [protocoloParaConsulta, setProtocoloParaConsulta] = useState("");

  return (
    <div
      className="app-full-viewport-zoomed app-public-screen"
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #0a0a0f 0%, #2d1b4e 100%)",
        fontFamily: FONT.body,
        color: "#e5dce1",
        padding: "clamp(16px, 4vw, 40px)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/Logo Spin Gaming White.png"
            alt="Spin Gaming"
            style={{ height: "clamp(56px, 14vw, 96px)", objectFit: "contain" }}
          />
          <h1
            style={{
              margin: "16px 0 0",
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            Canal de Denúncias Spin
          </h1>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "clamp(0.95rem, 2.5vw, 1.05rem)",
              color: "#d4c4e8",
              lineHeight: 1.5,
              maxWidth: 520,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Um espaço seguro para relatar irregularidades com total confidencialidade.
          </p>
        </div>

        <div className="canal-denuncias-badges-grid" style={{ marginBottom: 28 }}>
          {BADGES.map(({ Icon, title, text }) => (
            <div
              key={title}
              style={{
                padding: "14px 14px 16px",
                borderRadius: 14,
                border: "1px solid rgba(124,58,237,0.35)",
                background: "rgba(15,15,26,0.75)",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(124,58,237,0.25)",
                    color: "var(--brand-icon, #70cae4)",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} strokeWidth={2} aria-hidden />
                </span>
                <span style={{ fontWeight: 800, fontSize: 13, color: "#fff", lineHeight: 1.25 }}>{title}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#c9b8e0", lineHeight: 1.5 }}>{text}</p>
            </div>
          ))}
        </div>

        <div
          role="tablist"
          aria-label="Formulário do canal de denúncias"
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, CANAL_TABS, setAba, (k) => `tab-canal-${k}`)}
        >
          <FiltroBarTabButton
            id="tab-canal-denunciar"
            active={aba === "denunciar"}
            aria-controls="panel-canal-denunciar"
            onClick={() => setAba("denunciar")}
            icon={<Megaphone {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Realizar denúncia
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-canal-consultar"
            active={aba === "consultar"}
            aria-controls="panel-canal-consultar"
            onClick={() => setAba("consultar")}
            icon={<Search {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Consultar denúncia
          </FiltroBarTabButton>
        </div>

        {aba === "denunciar" ? (
          <CanalDenunciarPanel
            onIrParaConsultar={(protocolo) => {
              setProtocoloParaConsulta(protocolo);
              setAba("consultar");
            }}
          />
        ) : null}

        {aba === "consultar" ? (
          <CanalConsultarPanel key={protocoloParaConsulta || "consulta"} protocoloInicial={protocoloParaConsulta} />
        ) : null}

        <p style={{ textAlign: "center", marginTop: 32, marginBottom: 24, fontSize: 12, color: "#8a7aa8" }}>
          <a href={buildLoginPath()} style={{ color: "var(--brand-icon, #70cae4)", fontWeight: 600 }}>
            Voltar ao login da plataforma
          </a>
        </p>
      </div>
    </div>
  );
}
