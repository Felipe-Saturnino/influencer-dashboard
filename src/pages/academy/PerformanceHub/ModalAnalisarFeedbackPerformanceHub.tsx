import { useMemo, useState, type ReactNode } from "react";
import { ClipboardList, Image, ListChecks, MessageSquare, TableProperties } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import {
  FILTRO_BAR_TAB_ICON_PROPS,
  FiltroBarTabButton,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import type {
  PerformanceHubAvaliacao,
  PerformanceHubCriterioConfig,
  PerformanceHubCriterioResposta,
  PerformanceHubJogoKey,
  PerformanceHubScoringConfigGamePresenter,
  PerformanceHubScoringConfigShuffler,
  PerformanceHubTimeSlug,
} from "../../../lib/academyPerformanceHubTypes";
import {
  criteriosMesaPorTipo,
  formatNotaPerformanceHub,
  labelTerceiraDimensaoTime,
} from "../../../lib/academyPerformanceHubScoring";
import { PERFORMANCE_HUB_JOGOS_META } from "../../../lib/academyPerformanceHubDadosCatalog";
import type { PerformanceHubEstudioCadastro } from "../../../lib/academyPerformanceHubCadastroPrefill";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { LinkAssistirVideoPerformanceHub } from "../../../components/LinkAssistirVideoPerformanceHub";

type ModalTab = "dados" | "comunicacao" | "imagem" | "mesa" | "procedimentos";

type Props = {
  avaliacao: PerformanceHubAvaliacao;
  variantTime: PerformanceHubTimeSlug;
  config: PerformanceHubScoringConfigGamePresenter | PerformanceHubScoringConfigShuffler;
  estudios: PerformanceHubEstudioCadastro[];
  onClose: () => void;
  onAprovar: () => void | Promise<void>;
  onSolicitarFeedback: (texto: string) => void | Promise<void>;
};

const TABS_GP: { key: ModalTab; label: string; icon: typeof ClipboardList }[] = [
  { key: "dados", label: "Dados da Avaliação", icon: ClipboardList },
  { key: "comunicacao", label: "Comunicação", icon: MessageSquare },
  { key: "imagem", label: "Imagem", icon: Image },
  { key: "mesa", label: "Mesa", icon: TableProperties },
];

const TABS_SHUFFLER: { key: ModalTab; label: string; icon: typeof ClipboardList }[] = [
  { key: "dados", label: "Dados da Avaliação", icon: ClipboardList },
  { key: "comunicacao", label: "Comunicação", icon: MessageSquare },
  { key: "imagem", label: "Imagem", icon: Image },
  { key: "procedimentos", label: "Procedimentos", icon: ListChecks },
];

const PLACEHOLDER_SOLICITAR =
  "Descreva abaixo o que da avaliação você deseja entender melhor para que o Shift Leader possa repassar contigo";

export function ModalAnalisarFeedbackPerformanceHub({
  avaliacao,
  variantTime,
  config,
  estudios,
  onClose,
  onAprovar,
  onSolicitarFeedback,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const isShuffler = variantTime === "shuffler";
  const configGp = isShuffler ? null : (config as PerformanceHubScoringConfigGamePresenter);
  const configSh = isShuffler ? (config as PerformanceHubScoringConfigShuffler) : null;
  const tabsVisiveis = isShuffler ? TABS_SHUFFLER : TABS_GP;

  const [aba, setAba] = useState<ModalTab>("dados");
  const [popupAprovar, setPopupAprovar] = useState(false);
  const [popupSolicitar, setPopupSolicitar] = useState(false);
  const [textoSolicitacao, setTextoSolicitacao] = useState("");
  const [erroSolicitacao, setErroSolicitacao] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const estudioNome = useMemo(() => {
    const slug = avaliacao.estudioId;
    if (!slug) return "—";
    return estudios.find((e) => e.slug === slug)?.nome ?? slug;
  }, [avaliacao.estudioId, estudios]);

  const jogoLabel = useMemo(() => {
    const jogo = avaliacao.jogo;
    if (!jogo) return "—";
    return PERFORMANCE_HUB_JOGOS_META[jogo as PerformanceHubJogoKey]?.label ?? jogo;
  }, [avaliacao.jogo]);

  const mesaCriterios = useMemo(() => {
    if (!configGp || !avaliacao.jogo) return [];
    const mesaTipo = PERFORMANCE_HUB_JOGOS_META[avaliacao.jogo].mesaTipo;
    return criteriosMesaPorTipo(configGp, mesaTipo);
  }, [configGp, avaliacao.jogo]);

  const labelTerceira = labelTerceiraDimensaoTime(variantTime);
  const notaTerceira = isShuffler ? avaliacao.notaProcedimentos : avaliacao.notaMesa;

  async function confirmarAprovar() {
    setSalvando(true);
    try {
      await onAprovar();
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarSolicitar() {
    const texto = textoSolicitacao.trim();
    if (!texto) {
      setErroSolicitacao("Descreva o que deseja entender melhor para solicitar feedback.");
      return;
    }
    setErroSolicitacao(null);
    setSalvando(true);
    try {
      await onSolicitarFeedback(texto);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <ModalBase maxWidth={920} onClose={onClose}>
        <ModalHeader title={`${avaliacao.avaliadoNome} · ${avaliacao.data}`} onClose={onClose} />
        <p style={{ margin: "0 0 14px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
          Avaliador {avaliacao.avaliadorNome}
        </p>

        <div
          role="tablist"
          aria-label="Abas da análise de feedback"
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
          onKeyDown={(e) =>
            onFiltroBarTabsKeyDown(
              e,
              tabsVisiveis.map((tab) => tab.key),
              setAba,
              (k) => `tab-modal-feedback-${k}`,
            )
          }
        >
          {tabsVisiveis.map((tab) => {
            const Icon = tab.icon;
            return (
              <FiltroBarTabButton
                key={tab.key}
                id={`tab-modal-feedback-${tab.key}`}
                active={aba === tab.key}
                aria-controls={`panel-modal-feedback-${tab.key}`}
                onClick={() => setAba(tab.key)}
                icon={<Icon {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                {tab.label}
              </FiltroBarTabButton>
            );
          })}
        </div>

        <ModalTabPanel active={aba === "dados"} id="panel-modal-feedback-dados" labelledBy="tab-modal-feedback-dados">
          <LinhaTexto t={t}>
            <strong>Turno:</strong> {avaliacao.turno ?? "—"}
            {" · "}
            <strong>Estúdio:</strong> {estudioNome}
            {!isShuffler ? (
              <>
                {" · "}
                <strong>Jogo:</strong> {jogoLabel}
              </>
            ) : null}
            {" · "}
            <strong>Vídeo:</strong> <LinkAssistirVideoPerformanceHub videoUrl={avaliacao.videoUrl} />
          </LinhaTexto>
          <LinhaTexto t={t}>
            <strong>Notas:</strong> Total {formatNotaPerformanceHub(avaliacao.notaTotal)} · Imagem{" "}
            {formatNotaPerformanceHub(avaliacao.notaImagem)} · Comunicação{" "}
            {formatNotaPerformanceHub(avaliacao.notaComunicacao)} · {labelTerceira}{" "}
            {formatNotaPerformanceHub(notaTerceira)}
          </LinhaTexto>
          <LinhaTexto t={t} label="Pontos Fortes">
            {avaliacao.pontosFortes?.trim() || "—"}
          </LinhaTexto>
          <LinhaTexto t={t} label="Pontos a Desenvolver">
            {avaliacao.pontosDesenvolver?.trim() || "—"}
          </LinhaTexto>
        </ModalTabPanel>

        <ModalTabPanel
          active={aba === "comunicacao"}
          id="panel-modal-feedback-comunicacao"
          labelledBy="tab-modal-feedback-comunicacao"
        >
          {renderCriteriosTexto(config.comunicacao.criterios, avaliacao.criterios, t)}
        </ModalTabPanel>

        <ModalTabPanel active={aba === "imagem"} id="panel-modal-feedback-imagem" labelledBy="tab-modal-feedback-imagem">
          {renderCriteriosTexto(config.imagem.criterios, avaliacao.criterios, t)}
        </ModalTabPanel>

        <ModalTabPanel active={aba === "mesa"} id="panel-modal-feedback-mesa" labelledBy="tab-modal-feedback-mesa">
          {renderCriteriosTexto(mesaCriterios, avaliacao.criterios, t)}
        </ModalTabPanel>

        <ModalTabPanel
          active={aba === "procedimentos"}
          id="panel-modal-feedback-procedimentos"
          labelledBy="tab-modal-feedback-procedimentos"
        >
          {configSh ? renderCriteriosTexto(configSh.procedimentos.criterios, avaliacao.criterios, t) : null}
        </ModalTabPanel>

        <div
          style={{
            marginTop: 18,
            borderTop: `1px solid ${t.cardBorder}`,
            paddingTop: 14,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <button type="button" onClick={() => setPopupAprovar(true)} style={btnSecundario(t)}>
            Aprovar
          </button>
          <button type="button" onClick={() => setPopupSolicitar(true)} style={btnPrimario(brand)}>
            Solicitar Feedback
          </button>
        </div>
      </ModalBase>

      {popupAprovar ? (
        <ModalBase maxWidth={440} onClose={() => !salvando && setPopupAprovar(false)} zIndex={1100}>
          <ModalHeader
            title="Aprovar Avaliação"
            onClose={() => !salvando && setPopupAprovar(false)}
          />
          <p style={textoPopupStyle(t)}>
            Ao clicar abaixo você informa que entendeu os pontos sinalizados na avaliação
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              disabled={salvando}
              onClick={() => setPopupAprovar(false)}
              style={btnSecundario(t, { flex: 1 })}
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={() => void confirmarAprovar()}
              style={btnPrimario(brand, { flex: 1 })}
            >
              {salvando ? "Aprovando…" : "Aprovar"}
            </button>
          </div>
        </ModalBase>
      ) : null}

      {popupSolicitar ? (
        <ModalBase maxWidth={480} onClose={() => !salvando && setPopupSolicitar(false)} zIndex={1100}>
          <ModalHeader
            title="Solicitar Feedback da Avaliação"
            onClose={() => !salvando && setPopupSolicitar(false)}
          />
          <label htmlFor="solicitacaoFeedbackTexto" style={labelCampoStyle(t)}>
            Mensagem
            <CampoObrigatorioMark />
          </label>
          <textarea
            id="solicitacaoFeedbackTexto"
            value={textoSolicitacao}
            onChange={(e) => {
              setTextoSolicitacao(e.target.value);
              if (erroSolicitacao) setErroSolicitacao(null);
            }}
            placeholder={PLACEHOLDER_SOLICITAR}
            rows={5}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${erroSolicitacao ? "#e84025" : t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontSize: 13,
              fontFamily: FONT.body,
              resize: "vertical",
              minHeight: 120,
              boxSizing: "border-box",
              marginBottom: erroSolicitacao ? 8 : 20,
            }}
            aria-label="Descreva o que deseja entender melhor na avaliação"
          />
          {erroSolicitacao ? (
            <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginBottom: 16, fontFamily: FONT.body }}>
              {erroSolicitacao}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              disabled={salvando}
              onClick={() => setPopupSolicitar(false)}
              style={btnSecundario(t, { flex: 1 })}
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={() => void confirmarSolicitar()}
              style={btnPrimario(brand, { flex: 1 })}
            >
              {salvando ? "Solicitando…" : "Solicitar"}
            </button>
          </div>
        </ModalBase>
      ) : null}
    </>
  );
}

function renderCriteriosTexto(
  criterios: PerformanceHubCriterioConfig[],
  respostas: Record<string, PerformanceHubCriterioResposta> | undefined,
  t: ReturnType<typeof useApp>["theme"],
) {
  if (criterios.length === 0) {
    return (
      <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>Sem critérios registrados.</p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {criterios.map((c) => {
        const resp = respostas?.[c.slug];
        const comentario = resp?.comentario?.trim();
        return (
          <div key={c.slug}>
            <LinhaTexto t={t}>
              <strong>{c.label}</strong>
              {" · "}
              <strong>Nota:</strong> {formatNotaPerformanceHub(resp?.nota ?? null)}
            </LinhaTexto>
            {comentario ? (
              <LinhaTexto t={t} muted>
                {comentario}
              </LinhaTexto>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function LinhaTexto({
  t,
  label,
  muted,
  children,
}: {
  t: ReturnType<typeof useApp>["theme"];
  label?: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12, fontFamily: FONT.body }}>
      {label ? (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: t.textMuted,
            marginBottom: 4,
          }}
        >
          {label}
        </div>
      ) : null}
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          color: muted ? t.textMuted : t.text,
          whiteSpace: "pre-wrap",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function textoPopupStyle(t: ReturnType<typeof useApp>["theme"]) {
  return {
    fontSize: 14,
    color: t.text,
    fontFamily: FONT.body,
    lineHeight: 1.55,
    margin: "0 0 24px",
  } as const;
}

function labelCampoStyle(t: ReturnType<typeof useApp>["theme"]) {
  return {
    display: "block",
    fontSize: 12,
    color: t.textMuted,
    marginBottom: 6,
    fontFamily: FONT.body,
  } as const;
}

function btnSecundario(t: ReturnType<typeof useApp>["theme"], extra?: { flex?: number }) {
  return {
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: FONT.body,
    cursor: "pointer",
    flex: extra?.flex,
  } as const;
}

function btnPrimario(brand: ReturnType<typeof useDashboardBrand>, extra?: { flex?: number }) {
  return {
    borderRadius: 10,
    border: "none",
    background: getCtaCriarGradient(brand),
    color: "#fff",
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: FONT.body,
    cursor: "pointer",
    flex: extra?.flex,
  } as const;
}
