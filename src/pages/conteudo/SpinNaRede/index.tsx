import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT, FONT_TITLE } from "../../../constants/theme";

type SpinNaRedeMencaoRow = {
  id: string;
  item_url: string;
  titulo: string;
  resumo: string | null;
  published_at: string | null;
  feed_url: string | null;
  fonte_host: string | null;
  imagem_url: string | null;
};

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Limite de caracteres no cartão (meio termo entre resumo curto e texto completo). */
const RESUMO_MAX_CARACTERES = 520;

function resumoParaCartao(limpo: string): string {
  if (limpo.length <= RESUMO_MAX_CARACTERES) return limpo;
  return `${limpo.slice(0, RESUMO_MAX_CARACTERES).trim()}…`;
}

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const IMG_URL_ATTR_RES = [
  /\bdata-lazy-src=["']([^"']+)["']/i,
  /\bdata-src=["']([^"']+)["']/i,
  /\bdata-original=["']([^"']+)["']/i,
  /\bsrc=["']([^"']+)["']/i,
] as const;

/** Primeira URL útil em HTML de resumo (lazy-load costuma não usar `src` real). */
function primeiraUrlImgNoHtml(html: string): string | null {
  for (const re of IMG_URL_ATTR_RES) {
    const m = html.match(re);
    const raw = m?.[1]?.trim();
    if (!raw) continue;
    if (/^data:image\//i.test(raw)) continue;
    if (/^(about:|javascript:)/i.test(raw)) continue;
    return raw;
  }
  return null;
}

/** URL absoluta http(s) segura para <img src>; corrige &amp;; `basePageUrl` resolve caminhos relativos. */
function sanitizarImagemUrl(raw: string | null | undefined, basePageUrl?: string | null): string | null {
  if (!raw?.trim()) return null;
  let u = raw
    .trim()
    .replace(/\s+/g, "")
    .replace(/&amp;/g, "&")
    .replace(/^['"]|['"]$/g, "");
  if (/[<>]/.test(u) || u.length > 2048) return null;
  if (u.startsWith("//")) u = `https:${u}`;
  try {
    const parsed = /^https?:\/\//i.test(u)
      ? new URL(u)
      : basePageUrl?.trim()
        ? new URL(u, basePageUrl.trim())
        : new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname || parsed.hostname.length < 2) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function urlMiniaturaParaCartao(row: SpinNaRedeMencaoRow): string | null {
  const base = row.item_url?.trim() || null;
  const daColuna = sanitizarImagemUrl(row.imagem_url, base);
  if (daColuna) return daColuna;
  if (!row.resumo?.trim()) return null;
  const raw = primeiraUrlImgNoHtml(row.resumo);
  return sanitizarImagemUrl(raw, base);
}

/** 1ª tentativa sem referrerPolicy; 2ª com no-referrer (CDNs divergentes); depois esconde. */
type ThumbLoadPhase = "a" | "b" | "dead";

export default function SpinNaRede() {
  const { theme: t } = useApp();
  const perm = usePermission("spin_na_rede");

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [itens, setItens] = useState<SpinNaRedeMencaoRow[]>([]);
  /** Fase de carregamento da miniatura por item (retry com referrer antes de esconder). */
  const [thumbPhase, setThumbPhase] = useState<Record<string, ThumbLoadPhase>>({});

  const carregar = useCallback(async () => {
    if (perm.loading || perm.canView === "nao") return;
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase
      .from("spin_na_rede_mencao")
      .select("id, item_url, titulo, resumo, published_at, feed_url, fonte_host, imagem_url")
      .eq("passou_filtro", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) {
      console.error("[SpinNaRede]", error.message);
      setErro("Não foi possível carregar as menções. Tente novamente.");
      setItens([]);
    } else {
      setItens((data ?? []) as SpinNaRedeMencaoRow[]);
      setThumbPhase({});
    }
    setLoading(false);
  }, [perm.loading, perm.canView]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 10 }}>
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden="true" />
          <span style={{ color: t.textMuted, fontSize: 14 }}>Carregando…</span>
        </div>
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  return (
    <div className="app-page-shell app-page-shell--pb64" style={{ fontFamily: FONT.body }}>
      <PageHeader
        icon={<PageMenuIcon pageKey="spin_na_rede" />}
        title={getPageMenuLabel("spin_na_rede")}
        subtitle="Acompanhe as menções e aparições públicas da Spin Gaming na mídia."
      />

      {erro && (
        <div
          role="alert"
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(232,64,37,0.12)",
            border: "1px solid rgba(232,64,37,0.35)",
            color: "#e84025",
            fontSize: 13,
          }}
        >
          {erro}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "24px 0" }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden="true" />
          <span style={{ color: t.textMuted, fontSize: 13 }}>Carregando menções…</span>
        </div>
      ) : itens.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
          Ainda não há menções indexadas. Quando o agregador RSS estiver ativo, os itens aparecerão aqui.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {itens.map((row) => {
            const resumoLimpo = row.resumo ? stripHtml(row.resumo) : "";
            const resumoCard = resumoParaCartao(resumoLimpo);
            const fonte = row.fonte_host?.trim() || "—";
            const imgAlt = row.titulo.length > 120 ? `${row.titulo.slice(0, 117)}…` : row.titulo;
            const thumb = urlMiniaturaParaCartao(row);
            const phase = thumbPhase[row.id];
            const thumbMorto = phase === "dead";
            const thumbNoReferrer = phase === "b";
            const mostrarThumb = Boolean(thumb) && !thumbMorto;
            return (
              <li
                key={row.id}
                style={{
                  borderRadius: 14,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.cardBg,
                  boxShadow: cardShadow,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 14,
                    alignItems: "flex-start",
                  }}
                >
                  {mostrarThumb && thumb && (
                    <a
                      href={row.item_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={-1}
                      aria-hidden
                      style={{
                        flexShrink: 0,
                        borderRadius: 10,
                        overflow: "hidden",
                        border: `1px solid ${t.cardBorder}`,
                        lineHeight: 0,
                        textDecoration: "none",
                        color: "transparent",
                      }}
                    >
                      <img
                        key={`${row.id}-${phase ?? "a"}`}
                        src={thumb}
                        alt=""
                        width={160}
                        height={90}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy={thumbNoReferrer ? "no-referrer" : undefined}
                        onError={() =>
                          setThumbPhase((prev) => {
                            const cur = prev[row.id];
                            if (cur === undefined) return { ...prev, [row.id]: "b" };
                            if (cur === "b") return { ...prev, [row.id]: "dead" };
                            return prev;
                          })
                        }
                        style={{
                          display: "block",
                          width: 160,
                          height: 90,
                          objectFit: "cover",
                          background: t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                        }}
                      />
                    </a>
                  )}
                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <time dateTime={row.published_at ?? undefined} style={{ fontSize: 11, color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>
                        {fmtData(row.published_at)}
                      </time>
                      <span style={{ fontSize: 11, color: t.textMuted }} title={row.feed_url ?? undefined}>
                        {fonte}
                      </span>
                    </div>
                    <h2 style={{ margin: "8px 0 6px", fontSize: 15, fontWeight: 700, color: t.text, fontFamily: FONT_TITLE, lineHeight: 1.35 }}>
                      {row.titulo}
                    </h2>
                    {resumoCard.length > 0 && (
                      <p
                        style={{
                          margin: "0 0 10px",
                          fontSize: 13,
                          color: t.textMuted,
                          lineHeight: 1.55,
                          wordBreak: "break-word",
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical" as const,
                          WebkitLineClamp: 8,
                          overflow: "hidden",
                        }}
                      >
                        {resumoCard}
                      </p>
                    )}
                    <a
                      href={row.item_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Ir para a matéria: ${imgAlt}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--brand-primary, #7c3aed)",
                        textDecoration: "none",
                      }}
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                      Ir para a matéria
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
