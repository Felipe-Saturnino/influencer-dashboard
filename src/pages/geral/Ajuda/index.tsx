import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BRAND_SEMANTIC, FONT, FONT_TITLE } from "../../../constants/theme";
import { buildMenuAjudaVisivel } from "../../../lib/ajudaVisibilidade";
import { AbaGlossario } from "./GlossarioPanel";
import type { PageKey, Role } from "../../../types";
import { HelpCircle, BookOpen, LifeBuoy, BookMarked, GraduationCap } from "lucide-react";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../components/dashboard";
import { PageHeader } from "../../../components/PageHeader";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { PAGE_HEADER_ICON_PROPS } from "../../../lib/pageHeaderStyles";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { textoContemBusca } from "../../../lib/searchText";
import { AjudaPaginaAcessoLink } from "../../../components/AppPageLink";
import { renderAjudaTexto } from "../../../lib/ajudaInlineText";
import {
  carregarTutorialVisibilidade,
  type TutorialVisibilidadeMap,
} from "../../../lib/ajudaTutorialVisibilidade";
import { temAlgumTutorialVisivel } from "./tutoriais/catalog";
import { CONTEUDO_CONHECA } from "./conteudo/conheca";
import { CONTEUDO_TROUBLE, TROUBLESHOOTING_TRANSVERSAL } from "./conteudo/troubleshooting";
import { TutoriaisPanel } from "./TutoriaisPanel";

type Aba = "conheca" | "troubleshooting" | "glossario" | "tutoriais";

// ─── Conteúdo: Conheça a Plataforma ──────────────────────────────────────────
// Handoffs de seção (ex.: Dashboards, Lives): fundir aqui texto legado útil + itens novos do handoff,
// estendendo subtítulos existentes — evitar blocos duplicados; não descartar o handoff só porque Ajuda é antiga.

// ─── Componente principal ─────────────────────────────────────────────────────
const ABAS: Aba[] = ["conheca", "troubleshooting", "glossario", "tutoriais"];

const LABELS_ABA: Record<Aba, string> = {
  conheca: "Conheça a Plataforma",
  troubleshooting: "Troubleshooting",
  glossario: "Glossário",
  tutoriais: "Tutoriais",
};

const AJUDA_TAB_ICONS: Record<Aba, ReactNode> = {
  conheca: <BookOpen {...FILTRO_BAR_TAB_ICON_PROPS} />,
  troubleshooting: <LifeBuoy {...FILTRO_BAR_TAB_ICON_PROPS} />,
  glossario: <BookMarked {...FILTRO_BAR_TAB_ICON_PROPS} />,
  tutoriais: <GraduationCap {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

export default function Ajuda() {
  const { theme: t, isDark, permissions, user, effectiveRole } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("ajuda");
  const isAdmin = user?.role === "admin";
  const roleEfetivo = (effectiveRole ?? user?.role) as Role | null | undefined;

  const [visibility, setVisibility] = useState<TutorialVisibilidadeMap>({});
  const [visibilityLoaded, setVisibilityLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const map = await carregarTutorialVisibilidade();
      if (cancelled) return;
      setVisibility(map);
      setVisibilityLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const podeVerAbaTutoriais = useMemo(
    () =>
      isAdmin ||
      (visibilityLoaded && temAlgumTutorialVisivel(roleEfetivo, visibility, false)),
    [isAdmin, visibilityLoaded, roleEfetivo, visibility],
  );

  const abasVisiveis = useMemo(
    (): Aba[] => (podeVerAbaTutoriais ? ABAS : ABAS.filter((a) => a !== "tutoriais")),
    [podeVerAbaTutoriais],
  );

  const [aba, setAba] = useRouteTab("ajuda", "conheca", abasVisiveis);
  const [paginaSelecionada, setPaginaSelecionada] = useState<PageKey>("streamers");
  const [buscaPagina, setBuscaPagina] = useState("");

  useEffect(() => {
    if (aba === "tutoriais" && visibilityLoaded && !podeVerAbaTutoriais) {
      setAba("conheca");
    }
  }, [aba, visibilityLoaded, podeVerAbaTutoriais, setAba]);

  const menuAjudaVisivel = useMemo(
    () => buildMenuAjudaVisivel(permissions),
    [permissions],
  );

  const menuAjudaFiltrado = useMemo(() => {
    const q = buscaPagina.trim();
    if (!q) return menuAjudaVisivel;
    return menuAjudaVisivel
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) => textoContemBusca(item.label, q) || textoContemBusca(sec.section, q),
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [menuAjudaVisivel, buscaPagina]);

  const primeiroPageKeyVisivel = useMemo((): PageKey | null => {
    const first = menuAjudaVisivel[0]?.items[0];
    return first?.key ?? null;
  }, [menuAjudaVisivel]);

  const paginaAtualVisivel = useMemo(
    () => menuAjudaVisivel.some((sec) => sec.items.some((item) => item.key === paginaSelecionada)),
    [menuAjudaVisivel, paginaSelecionada],
  );

  useEffect(() => {
    if (!primeiroPageKeyVisivel) return;
    if (!paginaAtualVisivel) {
      setPaginaSelecionada(primeiroPageKeyVisivel);
    }
  }, [primeiroPageKeyVisivel, paginaAtualVisivel]);

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
  const navActiveBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-primary) 12%, transparent)"
    : `${BRAND_SEMANTIC.roxo}18`;
  const navIconBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-primary) 22%, transparent)"
    : `${BRAND_SEMANTIC.roxo}30`;
  const tituloGradient =
    brand.useBrand
      ? "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))"
      : `linear-gradient(90deg, ${BRAND_SEMANTIC.roxo}, ${BRAND_SEMANTIC.azul})`;

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a Ajuda.
      </div>
    );
  }

  const dadosConteudo =
    aba === "conheca"
      ? CONTEUDO_CONHECA[paginaSelecionada]
      : aba === "troubleshooting"
        ? CONTEUDO_TROUBLE[paginaSelecionada]
        : undefined;

  const renderAjudaBlocos = (
    blocos: { subtitulo?: string; texto: string }[],
    opts?: { pageKeyLink?: PageKey; skipLink?: boolean },
  ) =>
    blocos.map((bloco, i) => (
      <div key={`${bloco.subtitulo ?? "bloco"}-${i}`}>
        {bloco.subtitulo ? (
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: FONT.body,
              color: brand.accent,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: "0 0 6px",
            }}
          >
            {bloco.subtitulo}
          </p>
        ) : null}
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.75,
            color: t.text,
            fontFamily: FONT.body,
            margin: 0,
            whiteSpace: "pre-line",
          }}
        >
          {renderAjudaTexto(bloco.texto)}
        </p>
        {!opts?.skipLink && i === 0 && opts?.pageKeyLink ? (
          <AjudaPaginaAcessoLink pageKey={opts.pageKeyLink} />
        ) : null}
        {i < blocos.length - 1 ? (
          <div
            style={{
              height: 1,
              background: t.cardBorder,
              marginTop: 20,
            }}
          />
        ) : null}
      </div>
    ));

  return (
    <div className="app-page-shell" style={{ maxWidth: "1100px", margin: "0 auto" }}>

      <PageHeader
        icon={<HelpCircle {...PAGE_HEADER_ICON_PROPS} />}
        title="Ajuda"
        subtitle={getPageCanonicalSubtitle("ajuda")}
      />

      <div
        role="tablist"
        aria-label="Seções de ajuda"
        style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, abasVisiveis, setAba, (k) => `tab-ajuda-${k}`)}
      >
        {abasVisiveis.map((a) => (
          <FiltroBarTabButton
            key={a}
            id={`tab-ajuda-${a}`}
            active={aba === a}
            aria-controls={`panel-ajuda-${a}`}
            onClick={() => setAba(a)}
            icon={AJUDA_TAB_ICONS[a]}
          >
            {LABELS_ABA[a]}
          </FiltroBarTabButton>
        ))}
      </div>

      {aba === "glossario" ? (
        <div
          role="tabpanel"
          id="panel-ajuda-glossario"
          aria-labelledby="tab-ajuda-glossario"
        >
          <div
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 18,
              padding: "28px 32px",
              boxShadow: cardShadow,
            }}
          >
            <AbaGlossario dark={isDark} t={t} permissions={permissions} />
          </div>
        </div>
      ) : aba === "tutoriais" ? (
        <div
          role="tabpanel"
          id="panel-ajuda-tutoriais"
          aria-labelledby="tab-ajuda-tutoriais"
        >
          <TutoriaisPanel
            t={t}
            cardShadow={cardShadow}
            role={roleEfetivo}
            isAdmin={isAdmin}
            visibility={visibility}
            onVisibilityChange={(tutorialId, roles) => {
              setVisibility((prev) => ({ ...prev, [tutorialId]: roles }));
            }}
          />
        </div>
      ) : menuAjudaVisivel.length === 0 ? (
        <div
          role="tabpanel"
          id={`panel-ajuda-${aba}`}
          aria-labelledby={`tab-ajuda-${aba}`}
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 18,
            padding: "48px 32px",
            boxShadow: cardShadow,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: navActiveBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <HelpCircle size={22} color={brand.primary} aria-hidden="true" />
          </div>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: t.text,
              fontFamily: FONT.body,
              margin: "0 auto 8px",
              maxWidth: 420,
            }}
          >
            Você não tem acesso às páginas da plataforma.
          </p>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: t.textMuted,
              fontFamily: FONT.body,
              margin: "0 auto",
              maxWidth: 420,
            }}
          >
            Procure o administrador para solicitar as permissões necessárias em Gestão de Usuários.
          </p>
        </div>
      ) : (
        <div
          role="tabpanel"
          id={`panel-ajuda-${aba}`}
          aria-labelledby={`tab-ajuda-${aba}`}
          style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}
        >
          <aside
            aria-label="Navegação de ajuda"
            style={{
              width: 240,
              maxWidth: "100%",
              flexShrink: 0,
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 18,
              padding: "16px 12px",
              boxShadow: cardShadow,
            }}
          >
            <BarraPesquisaPagina
              value={buscaPagina}
              onChange={setBuscaPagina}
              placeholder={PAGE_SEARCH.ajudaPagina}
              aria-label="Buscar página na ajuda"
              wrapperStyle={{ width: "100%", marginBottom: 14 }}
              inputStyle={{ fontSize: 12, padding: "8px 12px 8px 34px" }}
            />
            <nav>
              {menuAjudaFiltrado.length === 0 ? (
                <p
                  style={{
                    margin: "8px 4px 0",
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: t.textMuted,
                    fontFamily: FONT.body,
                    textAlign: "center",
                  }}
                >
                  Nenhuma página encontrada.
                </p>
              ) : (
                menuAjudaFiltrado.map((sec) => (
                  <div key={sec.section} style={{ marginBottom: 20 }}>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "1.4px",
                      textTransform: "uppercase",
                      color: t.textMuted,
                      marginBottom: 8,
                      fontFamily: FONT.body,
                      paddingLeft: 10,
                    }}>
                      {sec.section}
                    </div>
                    {sec.items.map(({ key, label, icon: Icon }) => {
                      const ativo = paginaSelecionada === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPaginaSelecionada(key)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "9px 12px",
                            borderRadius: 10,
                            cursor: "pointer",
                            background: ativo ? navActiveBg : "transparent",
                            color: ativo ? brand.accent : t.text,
                            fontSize: 13,
                            fontFamily: FONT.body,
                            fontWeight: ativo ? 700 : 500,
                            border: ativo ? `1px solid color-mix(in srgb, ${brand.accent} 35%, transparent)` : "1px solid transparent",
                            width: "100%",
                            textAlign: "left",
                            marginBottom: 2,
                            transition: "all 0.15s",
                          }}
                        >
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: ativo ? navIconBg : `${t.textMuted}18`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <Icon size={11} color={ativo ? brand.accent : t.textMuted} />
                          </div>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </nav>
          </aside>

          <div style={{
            flex: 1,
            minWidth: 300,
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 18,
            padding: "28px 32px",
            boxShadow: cardShadow,
          }}>
            {aba === "troubleshooting" || dadosConteudo ? (
              <>
                {aba === "troubleshooting" ? (
                  <>
                    <div style={{ marginBottom: dadosConteudo ? 28 : 0 }}>
                      <div style={{ marginBottom: 20 }}>
                        <h2
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: t.text,
                            fontFamily: FONT_TITLE,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            margin: "0 0 8px",
                          }}
                        >
                          {TROUBLESHOOTING_TRANSVERSAL.titulo}
                        </h2>
                        <div
                          style={{
                            height: 2,
                            width: 40,
                            background: tituloGradient,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {renderAjudaBlocos([...TROUBLESHOOTING_TRANSVERSAL.blocos], { skipLink: true })}
                      </div>
                    </div>
                    {dadosConteudo ? (
                      <div
                        style={{
                          height: 1,
                          background: t.cardBorder,
                          margin: "0 0 28px",
                        }}
                      />
                    ) : null}
                  </>
                ) : null}

                {dadosConteudo ? (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      <h2
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: t.text,
                          fontFamily: FONT_TITLE,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          margin: "0 0 8px",
                        }}
                      >
                        {dadosConteudo.titulo}
                      </h2>
                      <div
                        style={{
                          height: 2,
                          width: 40,
                          background: tituloGradient,
                          borderRadius: 2,
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {renderAjudaBlocos(dadosConteudo.blocos, { pageKeyLink: paginaSelecionada })}
                    </div>
                  </>
                ) : aba === "troubleshooting" ? null : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "60px 20px",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: navActiveBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <HelpCircle size={22} color={brand.primary} aria-hidden="true" />
                    </div>
                    <p
                      style={{
                        fontSize: 14,
                        color: t.textMuted,
                        fontFamily: FONT.body,
                        margin: 0,
                        textAlign: "center",
                      }}
                    >
                      Conteúdo em construção para esta página.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                gap: 12,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: navActiveBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <HelpCircle size={22} color={brand.primary} aria-hidden="true" />
                </div>
                <p style={{
                  fontSize: 14,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  margin: 0,
                  textAlign: "center",
                }}>
                  Conteúdo em construção para esta página.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
