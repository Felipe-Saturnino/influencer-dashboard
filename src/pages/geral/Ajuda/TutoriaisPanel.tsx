import { useEffect, useMemo, useState } from "react";
import { BRAND_SEMANTIC, FONT, FONT_TITLE, type Theme } from "../../../constants/theme";
import type { PermissaoValor } from "../../../types";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { textoContemBusca } from "../../../lib/searchText";
import { SEARCH_PLACEHOLDER_ELLIPSIS } from "../../../lib/searchBarConstants";
import { AjudaPaginaAcessoLink } from "../../../components/AppPageLink";
import { buildTutoriaisNav } from "./tutoriais/catalog";
import type { TutorialDef } from "./tutoriais/types";
import { GraduationCap } from "lucide-react";

type Props = {
  t: Theme;
  permissions: Partial<Record<string, PermissaoValor | null | undefined>>;
  cardShadow: string;
};

export function TutoriaisPanel({ t, permissions, cardShadow }: Props) {
  const brand = useDashboardBrand();
  const [busca, setBusca] = useState("");
  const [tutorialId, setTutorialId] = useState<string | null>(null);

  const nav = useMemo(() => buildTutoriaisNav(permissions), [permissions]);

  const navFiltrado = useMemo(() => {
    const q = busca.trim();
    if (!q) return nav;
    return nav
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) => textoContemBusca(item.titulo, q) || textoContemBusca(sec.section, q),
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [nav, busca]);

  const primeiroId = nav[0]?.items[0]?.id ?? null;

  const tutorialAtivoVisivel = useMemo(() => {
    if (!tutorialId) return false;
    return nav.some((sec) => sec.items.some((i) => i.id === tutorialId));
  }, [nav, tutorialId]);

  useEffect(() => {
    if (!primeiroId) {
      setTutorialId(null);
      return;
    }
    if (!tutorialAtivoVisivel) setTutorialId(primeiroId);
  }, [primeiroId, tutorialAtivoVisivel]);

  const tutorial: TutorialDef | null = useMemo(() => {
    if (!tutorialId) return null;
    for (const sec of nav) {
      const found = sec.items.find((i) => i.id === tutorialId);
      if (found) return found;
    }
    return null;
  }, [nav, tutorialId]);

  const navActiveBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-primary) 12%, transparent)"
    : `${BRAND_SEMANTIC.roxo}18`;
  const navIconBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-primary) 22%, transparent)"
    : `${BRAND_SEMANTIC.roxo}30`;
  const tituloGradient = brand.useBrand
    ? "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))"
    : `linear-gradient(90deg, ${BRAND_SEMANTIC.roxo}, ${BRAND_SEMANTIC.azul})`;

  if (nav.length === 0) {
    return (
      <div
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
          <GraduationCap size={22} color={brand.primary} aria-hidden="true" />
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
          Nenhum tutorial disponível para o seu perfil.
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
          Os tutoriais aparecem conforme as páginas a que você tem permissão de Ver.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
      <aside
        aria-label="Navegação de tutoriais"
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
          value={busca}
          onChange={setBusca}
          placeholder={`Pesquisar tutorial${SEARCH_PLACEHOLDER_ELLIPSIS}`}
          aria-label="Buscar tutorial"
          wrapperStyle={{ width: "100%", marginBottom: 14 }}
          inputStyle={{ fontSize: 12, padding: "8px 12px 8px 34px" }}
        />
        <nav>
          {navFiltrado.length === 0 ? (
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
              Nenhum tutorial encontrado.
            </p>
          ) : (
            navFiltrado.map((sec) => (
              <div key={sec.section} style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "1.4px",
                    textTransform: "uppercase",
                    color: t.textMuted,
                    marginBottom: 8,
                    fontFamily: FONT.body,
                    paddingLeft: 10,
                  }}
                >
                  {sec.section}
                </div>
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const ativo = tutorialId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTutorialId(item.id)}
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
                        border: ativo
                          ? `1px solid color-mix(in srgb, ${brand.accent} 35%, transparent)`
                          : "1px solid transparent",
                        width: "100%",
                        textAlign: "left",
                        marginBottom: 2,
                        transition: "all 0.15s",
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: ativo ? navIconBg : `${t.textMuted}18`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={11} color={ativo ? brand.accent : t.textMuted} aria-hidden />
                      </div>
                      {item.titulo}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </nav>
      </aside>

      <div
        style={{
          flex: 1,
          minWidth: 300,
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 18,
          padding: "28px 32px",
          boxShadow: cardShadow,
        }}
      >
        {tutorial ? (
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
                {tutorial.titulo}
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

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 24,
                fontSize: 13,
                lineHeight: 1.65,
                color: t.textMuted,
                fontFamily: FONT.body,
              }}
            >
              <p style={{ margin: 0 }}>
                <strong style={{ color: t.text }}>Público:</strong> {tutorial.publico}
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: t.text }}>Objetivo:</strong> {tutorial.objetivo}
              </p>
              {tutorial.preRequisitos ? (
                <p style={{ margin: 0 }}>
                  <strong style={{ color: t.text }}>Pré-requisitos:</strong> {tutorial.preRequisitos}
                </p>
              ) : null}
              {tutorial.tempoEstimado ? (
                <p style={{ margin: 0 }}>
                  <strong style={{ color: t.text }}>Tempo estimado:</strong> {tutorial.tempoEstimado}
                </p>
              ) : null}
            </div>

            {tutorial.relatedPageKey ? (
              <div style={{ marginBottom: 24 }}>
                <AjudaPaginaAcessoLink pageKey={tutorial.relatedPageKey} />
              </div>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {tutorial.passos.map((passo, i) => (
                <div key={passo.titulo}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      color: brand.accent,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      margin: "0 0 8px",
                    }}
                  >
                    {passo.titulo}
                  </p>
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
                    {passo.texto}
                  </p>
                  {passo.imagens?.length ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                        marginTop: 14,
                      }}
                    >
                      {passo.imagens.map((img) => (
                        <figure key={img.src} style={{ margin: 0 }}>
                          <img
                            src={img.src}
                            alt={img.alt}
                            style={{
                              display: "block",
                              width: "100%",
                              maxWidth: 720,
                              borderRadius: 12,
                              border: `1px solid ${t.cardBorder}`,
                            }}
                          />
                          <figcaption
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              color: t.textMuted,
                              fontFamily: FONT.body,
                            }}
                          >
                            {img.alt}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : null}
                  {i < tutorial.passos.length - 1 || tutorial.notasFinais ? (
                    <div
                      style={{
                        height: 1,
                        background: t.cardBorder,
                        marginTop: 24,
                      }}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            {tutorial.notasFinais ? (
              <div style={{ marginTop: 8 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: FONT.body,
                    color: brand.accent,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    margin: "0 0 8px",
                  }}
                >
                  Observações finais
                </p>
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
                  {tutorial.notasFinais}
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
