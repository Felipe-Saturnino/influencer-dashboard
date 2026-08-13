import { BookOpen, ChevronRight, GraduationCap, LifeBuoy } from "lucide-react";
import { useState, type MouseEvent, type ReactNode } from "react";
import { useApp } from "../context/AppContext";
import { FONT } from "../constants/theme";
import { buildAppPath, getAppRouteByPageKey } from "../lib/appRoutes";
import {
  AJUDA_CONTEXTUAL_ICON_SIZE,
  getAjudaContextualAcaoStyle,
  type AjudaContextualAcao,
} from "../lib/ajudaContextualStyles";
import { tutorialVisivelParaRole } from "../lib/ajudaTutorialVisibilidade";
import type { PageKey } from "../types";
import { ModalBase, ModalHeader } from "./OperacoesModal";

export type AjudaContextualTutorial = {
  id: string;
  urlSlug: string;
  /** Título no pop-up quando há mais de um tutorial na aba. */
  titulo?: string;
  /** Uma linha de descrição no pop-up. */
  descricao?: string;
};

type AjudaContextualAcoesProps = {
  pageKey: PageKey;
  /** Um tutorial, ou vários da mesma aba (pop-up se o perfil vir 2+). */
  tutorial?: AjudaContextualTutorial | AjudaContextualTutorial[] | null;
};

type LinkAjudaProps = {
  acao: AjudaContextualAcao;
  href: string;
  label: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
};

function normalizarTutoriais(
  tutorial: AjudaContextualTutorial | AjudaContextualTutorial[] | null | undefined,
): AjudaContextualTutorial[] {
  if (!tutorial) return [];
  return Array.isArray(tutorial) ? tutorial : [tutorial];
}

/** Atalhos da barra de filtros para Conheça, Troubleshooting e tutorial permitido. */
export function AjudaContextualAcoes({ pageKey, tutorial }: AjudaContextualAcoesProps) {
  const {
    theme: t,
    effectiveRole,
    navigateTo,
    tutorialVisibility,
    tutorialVisibilityLoaded,
  } = useApp();
  const [modalTutoriaisAberto, setModalTutoriaisAberto] = useState(false);
  const pageSlug = getAppRouteByPageKey(pageKey)?.pageSlug;
  if (!pageSlug) return null;

  const visiveis = tutorialVisibilityLoaded
    ? normalizarTutoriais(tutorial).filter((item) =>
        tutorialVisivelParaRole(
          item.id,
          effectiveRole,
          tutorialVisibility,
          effectiveRole === "admin",
        ),
      )
    : [];
  const unico = visiveis.length === 1 ? visiveis[0] : null;
  const varios = visiveis.length >= 2;

  const LinkAjuda = ({ acao, href, label, onClick, children }: LinkAjudaProps) => (
    <a
      href={href}
      aria-label={label}
      title={label}
      onClick={onClick}
      style={getAjudaContextualAcaoStyle(acao, t.isDark)}
    >
      {children}
    </a>
  );

  const irParaTutorial = (item: AjudaContextualTutorial) => {
    setModalTutoriaisAberto(false);
    navigateTo("ajuda", "Tutoriais", { detailSlug: item.urlSlug });
  };

  return (
    <div
      role="group"
      aria-label="Ajuda contextual"
      style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}
    >
      <LinkAjuda
        acao="conheca"
        href={buildAppPath("ajuda", "ConhecaAPlataforma", pageSlug)}
        label="Conheça esta página"
        onClick={(event) => {
          event.preventDefault();
          navigateTo("ajuda", "ConhecaAPlataforma", { detailSlug: pageSlug });
        }}
      >
        <BookOpen size={AJUDA_CONTEXTUAL_ICON_SIZE} aria-hidden="true" />
      </LinkAjuda>
      <LinkAjuda
        acao="troubleshooting"
        href={buildAppPath("ajuda", "Troubleshooting", pageSlug)}
        label="Troubleshooting desta página"
        onClick={(event) => {
          event.preventDefault();
          navigateTo("ajuda", "Troubleshooting", { detailSlug: pageSlug });
        }}
      >
        <LifeBuoy size={AJUDA_CONTEXTUAL_ICON_SIZE} aria-hidden="true" />
      </LinkAjuda>
      {unico ? (
        <LinkAjuda
          acao="tutorial"
          href={buildAppPath("ajuda", "Tutoriais", unico.urlSlug)}
          label="Abrir tutorial desta seção"
          onClick={(event) => {
            event.preventDefault();
            navigateTo("ajuda", "Tutoriais", { detailSlug: unico.urlSlug });
          }}
        >
          <GraduationCap size={AJUDA_CONTEXTUAL_ICON_SIZE} aria-hidden="true" />
        </LinkAjuda>
      ) : null}
      {varios ? (
        <button
          type="button"
          aria-label="Escolher tutorial desta seção"
          title="Escolher tutorial desta seção"
          onClick={() => setModalTutoriaisAberto(true)}
          style={{
            ...getAjudaContextualAcaoStyle("tutorial", t.isDark),
            font: "inherit",
          }}
        >
          <GraduationCap size={AJUDA_CONTEXTUAL_ICON_SIZE} aria-hidden="true" />
        </button>
      ) : null}

      {modalTutoriaisAberto && varios ? (
        <ModalEscolherTutorialAjuda
          tutoriais={visiveis}
          onClose={() => setModalTutoriaisAberto(false)}
          onEscolher={irParaTutorial}
        />
      ) : null}
    </div>
  );
}

function ModalEscolherTutorialAjuda({
  tutoriais,
  onClose,
  onEscolher,
}: {
  tutoriais: AjudaContextualTutorial[];
  onClose: () => void;
  onEscolher: (item: AjudaContextualTutorial) => void;
}) {
  const { theme: t } = useApp();

  return (
    <ModalBase onClose={onClose} maxWidth={440} zIndex={1100}>
      <ModalHeader title="Tutoriais desta aba" onClose={onClose} />
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {tutoriais.map((item) => {
          const href = buildAppPath("ajuda", "Tutoriais", item.urlSlug);
          const titulo = item.titulo?.trim() || "Tutorial";
          return (
            <li key={item.id}>
              <a
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  onEscolher(item);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  textDecoration: "none",
                  color: t.text,
                }}
              >
                <span
                  style={{
                    ...getAjudaContextualAcaoStyle("tutorial", t.isDark),
                    cursor: "inherit",
                  }}
                  aria-hidden
                >
                  <GraduationCap size={AJUDA_CONTEXTUAL_ICON_SIZE} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontFamily: FONT.body,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--brand-primary, #7c3aed)",
                    }}
                  >
                    {titulo}
                  </span>
                  {item.descricao?.trim() ? (
                    <span
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontFamily: FONT.body,
                        fontSize: 13,
                        fontWeight: 400,
                        color: t.textMuted,
                        lineHeight: 1.4,
                      }}
                    >
                      {item.descricao.trim()}
                    </span>
                  ) : null}
                </span>
                <ChevronRight size={16} color={t.textMuted} aria-hidden />
              </a>
            </li>
          );
        })}
      </ul>
    </ModalBase>
  );
}

/**
 * Só o ícone de tutorial (ex.: no cabeçalho de um modal, à esquerda do X).
 * Respeita a mesma regra de visibilidade por perfil.
 */
export function AjudaContextualTutorialAtalho({
  tutorial,
  label = "Abrir tutorial desta seção",
}: {
  tutorial: AjudaContextualTutorial;
  label?: string;
}) {
  const {
    theme: t,
    effectiveRole,
    navigateTo,
    tutorialVisibility,
    tutorialVisibilityLoaded,
  } = useApp();

  const visivel =
    tutorialVisibilityLoaded &&
    tutorialVisivelParaRole(
      tutorial.id,
      effectiveRole,
      tutorialVisibility,
      effectiveRole === "admin",
    );
  if (!visivel) return null;

  const href = buildAppPath("ajuda", "Tutoriais", tutorial.urlSlug);
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.preventDefault();
        navigateTo("ajuda", "Tutoriais", { detailSlug: tutorial.urlSlug });
      }}
      style={getAjudaContextualAcaoStyle("tutorial", t.isDark)}
    >
      <GraduationCap size={AJUDA_CONTEXTUAL_ICON_SIZE} aria-hidden="true" />
    </a>
  );
}
