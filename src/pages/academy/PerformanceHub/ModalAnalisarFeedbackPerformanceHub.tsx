import { useMemo, useState, type ReactNode } from "react";
import {
  ClipboardList,
  Image,
  ListChecks,
  MessageSquare,
  MessageSquareText,
  TableProperties,
} from "lucide-react";
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
import { formatDataHoraHistoricoPerformanceHub } from "../../../lib/academyPerformanceHubAvaliacoesFetch";

type ModalTab = "dados" | "comunicacao" | "imagem" | "mesa" | "procedimentos" | "feedback";

export type ModalRevisaoAvaliacaoModo = "analisar" | "aplicar" | "ver";

type Props = {
  avaliacao: PerformanceHubAvaliacao;
  variantTime: PerformanceHubTimeSlug;
  config: PerformanceHubScoringConfigGamePresenter | PerformanceHubScoringConfigShuffler;
  estudios: PerformanceHubEstudioCadastro[];
  modo: ModalRevisaoAvaliacaoModo;
  onClose: () => void;
  /** Prestador em Aguardando — aprova sem texto. */
  onAprovar?: () => void | Promise<void>;
  /** Prestador em Aguardando — solicita esclarecimento. */
  onSolicitarFeedback?: (texto: string) => void | Promise<void>;
  /** Coach em Feedback — aplica feedback e aprova. */
  onAplicarFeedback?: (texto: string) => void | Promise<void>;
};

const TABS_GP_BASE: { key: ModalTab; label: string; icon: typeof ClipboardList }[] = [
  { key: "dados", label: "Dados da Avaliação", icon: ClipboardList },
  { key: "comunicacao", label: "Comunicação", icon: MessageSquare },
  { key: "imagem", label: "Imagem", icon: Image },
  { key: "mesa", label: "Mesa", icon: TableProperties },
];

const TABS_SHUFFLER_BASE: { key: ModalTab; label: string; icon: typeof ClipboardList }[] = [
  { key: "dados", label: "Dados da Avaliação", icon: ClipboardList },
  { key: "comunicacao", label: "Comunicação", icon: MessageSquare },
  { key: "imagem", label: "Imagem", icon: Image },
  { key: "procedimentos", label: "Procedimentos", icon: ListChecks },
];

const PLACEHOLDER_SOLICITAR =
  "Descreva abaixo o que da avaliação você deseja entender melhor para que o Shift Leader possa repassar contigo";

const PLACEHOLDER_APLICAR = "Descreva o feedback aplicado para registro do repasse";

export function ModalAnalisarFeedbackPerformanceHub({
  avaliacao,
  variantTime,
  config,
  estudios,
  modo,
  onClose,
  onAprovar,
  onSolicitarFeedback,
  onAplicarFeedback,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const isShuffler = variantTime === "shuffler";
  const configGp = isShuffler ? null : (config as PerformanceHubScoringConfigGamePresenter);
  const configSh = isShuffler ? (config as PerformanceHubScoringConfigShuffler) : null;

  const temAbaFeedback =
    modo === "ver" &&
    Boolean(
      avaliacao.solicitacaoFeedbackTexto?.trim() ||
        avaliacao.aplicacaoFeedbackTexto?.trim(),
    );

  const tabsVisiveis = useMemo(() => {
    const base = isShuffler ? TABS_SHUFFLER_BASE : TABS_GP_BASE;
    if (!temAbaFeedback) return base;
    return [
      ...base,
      { key: "feedback" as const, label: "Feedback", icon: MessageSquareText },
    ];
  }, [isShuffler, temAbaFeedback]);

  const [aba, setAba] = useState<ModalTab>("dados");
  const [popupAprovar, setPopupAprovar] = useState(false);
  const [popupSolicitar, setPopupSolicitar] = useState(false);
  const [popupAplicar, setPopupAplicar] = useState(false);
  const [textoSolicitacao, setTextoSolicitacao] = useState("");
  const [textoAplicacao, setTextoAplicacao] = useState("");
  const [erroTexto, setErroTexto] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const showSolicitar = modo === "analisar" && avaliacao.status !== "feedback";
  const showAprovarSimples = modo === "analisar";
  const showAplicar = modo === "aplicar";

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
    if (!onAprovar) return;
    setSalvando(true);
    setErroTexto(null);
    try {
      await onAprovar();
    } catch {
      setErroTexto(
        "Não foi possível aprovar a avaliação. Se o problema persistir, entre em contato com o suporte.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarSolicitar() {
    const texto = textoSolicitacao.trim();
    if (!texto) {
      setErroTexto("Descreva o que deseja entender melhor para solicitar feedback.");
      return;
    }
    if (!onSolicitarFeedback) return;
    setErroTexto(null);
    setSalvando(true);
    try {
      await onSolicitarFeedback(texto);
    } catch {
      setErroTexto(
        "Não foi possível solicitar feedback. Se o problema persistir, entre em contato com o suporte.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarAplicar() {
    const texto = textoAplicacao.trim();
    if (!texto) {
      setErroTexto("Descreva o feedback aplicado para registro do repasse.");
      return;
    }
    if (!onAplicarFeedback) return;
    setErroTexto(null);
    setSalvando(true);
    try {
      await onAplicarFeedback(texto);
    } catch {
      setErroTexto(
        "Não foi possível aplicar o feedback. Se o problema persistir, entre em contato com o suporte.",
      );
    } finally {
      setSalvando(false);
    }
  }

  const tituloModal =
    modo === "aplicar"
      ? `Aplicar Feedback · ${avaliacao.avaliadoNome}`
      : modo === "ver"
        ? `${avaliacao.avaliadoNome} · ${avaliacao.data}`
        : `${avaliacao.avaliadoNome} · ${avaliacao.data}`;

  return (
    <>
      <ModalBase maxWidth={920} onClose={onClose}>
        <ModalHeader title={tituloModal} onClose={onClose} />
        <p style={{ margin: "0 0 14px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
          Avaliador {avaliacao.avaliadorNome}
        </p>

        <div
          role="tablist"
          aria-label="Abas da avaliação"
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
          onKeyDown={(e) =>
            onFiltroBarTabsKeyDown(
              e,
              tabsVisiveis.map((tab) => tab.key),
              setAba,
              (k) => `tab-modal-revisao-${k}`,
            )
          }
        >
          {tabsVisiveis.map((tab) => {
            const Icon = tab.icon;
            return (
              <FiltroBarTabButton
                key={tab.key}
                id={`tab-modal-revisao-${tab.key}`}
                active={aba === tab.key}
                aria-controls={`panel-modal-revisao-${tab.key}`}
                onClick={() => setAba(tab.key)}
                icon={<Icon {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                {tab.label}
              </FiltroBarTabButton>
            );
          })}
        </div>

        <ModalTabPanel active={aba === "dados"} id="panel-modal-revisao-dados" labelledBy="tab-modal-revisao-dados">
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
            <strong>Vídeo:</strong>{" "}
            <LinkAssistirVideoPerformanceHub
              videoUrl={avaliacao.videoUrl}
              videoRemovidoEm={avaliacao.videoRemovidoEm}
            />
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
          id="panel-modal-revisao-comunicacao"
          labelledBy="tab-modal-revisao-comunicacao"
        >
          {renderCriteriosTexto(config.comunicacao.criterios, avaliacao.criterios, t)}
        </ModalTabPanel>

        <ModalTabPanel active={aba === "imagem"} id="panel-modal-revisao-imagem" labelledBy="tab-modal-revisao-imagem">
          {renderCriteriosTexto(config.imagem.criterios, avaliacao.criterios, t)}
        </ModalTabPanel>

        <ModalTabPanel active={aba === "mesa"} id="panel-modal-revisao-mesa" labelledBy="tab-modal-revisao-mesa">
          {renderCriteriosTexto(mesaCriterios, avaliacao.criterios, t)}
        </ModalTabPanel>

        <ModalTabPanel
          active={aba === "procedimentos"}
          id="panel-modal-revisao-procedimentos"
          labelledBy="tab-modal-revisao-procedimentos"
        >
          {configSh ? renderCriteriosTexto(configSh.procedimentos.criterios, avaliacao.criterios, t) : null}
        </ModalTabPanel>

        <ModalTabPanel
          active={aba === "feedback"}
          id="panel-modal-revisao-feedback"
          labelledBy="tab-modal-revisao-feedback"
        >
          {avaliacao.solicitacaoFeedbackTexto?.trim() ? (
            <QuadroFeedback
              t={t}
              titulo="Solicitação de Feedback"
              usuario={avaliacao.solicitacaoFeedbackPorNome ?? avaliacao.avaliadoNome}
              quando={avaliacao.solicitacaoFeedbackEm}
              mensagem={avaliacao.solicitacaoFeedbackTexto}
            />
          ) : null}
          {avaliacao.aplicacaoFeedbackTexto?.trim() ? (
            <QuadroFeedback
              t={t}
              titulo="Aplicação de Feedback"
              usuario={avaliacao.aplicacaoFeedbackPorNome ?? avaliacao.avaliadorNome}
              quando={avaliacao.aplicacaoFeedbackEm}
              mensagem={avaliacao.aplicacaoFeedbackTexto}
            />
          ) : null}
          {!avaliacao.solicitacaoFeedbackTexto?.trim() && !avaliacao.aplicacaoFeedbackTexto?.trim() ? (
            <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
              Nenhum registro de feedback nesta avaliação.
            </p>
          ) : null}
        </ModalTabPanel>

        {modo !== "ver" ? (
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
            {showSolicitar ? (
              <button type="button" onClick={() => setPopupSolicitar(true)} style={btnSecundario(t)}>
                Solicitar Feedback
              </button>
            ) : null}
            {showAprovarSimples ? (
              <button type="button" onClick={() => setPopupAprovar(true)} style={btnPrimario(brand)}>
                Aprovar
              </button>
            ) : null}
            {showAplicar ? (
              <button type="button" onClick={() => setPopupAplicar(true)} style={btnPrimario(brand)}>
                Aprovar
              </button>
            ) : null}
          </div>
        ) : null}
      </ModalBase>

      {popupAprovar ? (
        <ModalBase maxWidth={440} onClose={() => !salvando && setPopupAprovar(false)} zIndex={1100}>
          <ModalHeader title="Aprovar Avaliação" onClose={() => !salvando && setPopupAprovar(false)} />
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
              if (erroTexto) setErroTexto(null);
            }}
            placeholder={PLACEHOLDER_SOLICITAR}
            rows={5}
            style={textareaStyle(t, Boolean(erroTexto))}
            aria-label="Descreva o que deseja entender melhor na avaliação"
          />
          {erroTexto ? <AlertaErro texto={erroTexto} /> : null}
          <div style={{ display: "flex", gap: 10, marginTop: erroTexto ? 0 : 4 }}>
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

      {popupAplicar ? (
        <ModalBase maxWidth={480} onClose={() => !salvando && setPopupAplicar(false)} zIndex={1100}>
          <ModalHeader title="Aplicar Feedback" onClose={() => !salvando && setPopupAplicar(false)} />
          <label htmlFor="aplicacaoFeedbackTexto" style={labelCampoStyle(t)}>
            Feedback
            <CampoObrigatorioMark />
          </label>
          <textarea
            id="aplicacaoFeedbackTexto"
            value={textoAplicacao}
            onChange={(e) => {
              setTextoAplicacao(e.target.value);
              if (erroTexto) setErroTexto(null);
            }}
            placeholder={PLACEHOLDER_APLICAR}
            rows={5}
            style={textareaStyle(t, Boolean(erroTexto))}
            aria-label="Descreva o feedback aplicado para registro do repasse"
          />
          {erroTexto ? <AlertaErro texto={erroTexto} /> : null}
          <div style={{ display: "flex", gap: 10, marginTop: erroTexto ? 0 : 4 }}>
            <button
              type="button"
              disabled={salvando}
              onClick={() => setPopupAplicar(false)}
              style={btnSecundario(t, { flex: 1 })}
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={() => void confirmarAplicar()}
              style={btnPrimario(brand, { flex: 1 })}
            >
              {salvando ? "Salvando…" : "Aprovar"}
            </button>
          </div>
        </ModalBase>
      ) : null}
    </>
  );
}

function QuadroFeedback({
  t,
  titulo,
  usuario,
  quando,
  mensagem,
}: {
  t: ReturnType<typeof useApp>["theme"];
  titulo: string;
  usuario: string;
  quando: string | null | undefined;
  mensagem: string;
}) {
  return (
    <div
      style={{
        marginBottom: 14,
        padding: 14,
        borderRadius: 12,
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg,
        fontFamily: FONT.body,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--brand-primary, #7c3aed)",
          marginBottom: 8,
        }}
      >
        {titulo}
      </div>
      <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>
        {usuario}
        {" · "}
        {quando ? formatDataHoraHistoricoPerformanceHub(quando) : "—"}
      </div>
      <div style={{ fontSize: 13, color: t.text, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{mensagem}</div>
    </div>
  );
}

function AlertaErro({ texto }: { texto: string }) {
  return (
    <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginBottom: 16, fontFamily: FONT.body }}>
      {texto}
    </div>
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

function textareaStyle(t: ReturnType<typeof useApp>["theme"], erro: boolean) {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${erro ? "#e84025" : t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    resize: "vertical" as const,
    minHeight: 120,
    boxSizing: "border-box" as const,
    marginBottom: erro ? 8 : 20,
  };
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
