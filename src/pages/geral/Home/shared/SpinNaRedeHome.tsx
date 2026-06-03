import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { getPageContentBoxShellStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { FONT_TITLE } from "../../../../lib/dashboardConstants";
import { useHomeInvestidorSpinNaRede, type HomeSpinNaRedeItem } from "../hooks/useHomeInvestidorSpinNaRede";
import { homeSectionTitleStyle } from "./homeSharedUi";

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function fmtDataMencao(iso: string | null): string {
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

const RESUMO_MAX = 520;

function resumoParaCartao(limpo: string): string {
  if (limpo.length <= RESUMO_MAX) return limpo;
  return `${limpo.slice(0, RESUMO_MAX).trim()}…`;
}

function sanitizarImagemUrl(raw: string | null | undefined, basePageUrl?: string | null): string | null {
  if (!raw?.trim()) return null;
  let u = raw.trim().replace(/\s+/g, "").replace(/&amp;/g, "&").replace(/^['"]|['"]$/g, "");
  if (/[<>]/.test(u) || u.length > 2048) return null;
  if (u.startsWith("//")) u = `https:${u}`;
  try {
    const parsed = /^https?:\/\//i.test(u) ? new URL(u) : basePageUrl?.trim() ? new URL(u, basePageUrl.trim()) : new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function urlMiniatura(row: HomeSpinNaRedeItem): string | null {
  return sanitizarImagemUrl(row.imagem_url, row.item_url?.trim() || null);
}

type ThumbPhase = "b" | "dead";

function MencaoCard({ row }: { row: HomeSpinNaRedeItem }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [thumbPhase, setThumbPhase] = useState<ThumbPhase | undefined>(undefined);

  const resumoLimpo = row.resumo ? stripHtml(row.resumo) : "";
  const resumoCard = resumoParaCartao(resumoLimpo);
  const fonte = row.fonte_host?.trim() || "—";
  const thumb = urlMiniatura(row);
  const thumbMorto = thumbPhase === "dead";
  const thumbNoReferrer = thumbPhase === "b";
  const mostrarThumb = Boolean(thumb) && !thumbMorto;
  const listItemBox = getPageContentBoxShellStyle(brand, t, { padding: "14px 16px", marginBottom: 0 });

  return (
    <li style={listItemBox}>
      <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
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
            }}
          >
            <img
              src={thumb}
              alt=""
              width={160}
              height={90}
              loading="lazy"
              decoding="async"
              referrerPolicy={thumbNoReferrer ? "no-referrer" : undefined}
              onError={() =>
                setThumbPhase((prev) => {
                  if (prev === undefined) return "b";
                  if (prev === "b") return "dead";
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
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <time dateTime={row.published_at ?? undefined} style={{ fontSize: 11, color: t.textMuted }}>
              {fmtDataMencao(row.published_at)}
            </time>
            <span style={{ fontSize: 11, color: t.textMuted }}>{fonte}</span>
          </div>
          <h3
            style={{
              margin: "8px 0 6px",
              fontSize: 15,
              fontWeight: 700,
              color: t.text,
              fontFamily: FONT_TITLE,
              lineHeight: 1.35,
            }}
          >
            {row.titulo}
          </h3>
          {resumoCard.length > 0 && (
            <p style={{ margin: "0 0 10px", fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>{resumoCard}</p>
          )}
          <a
            href={row.item_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 700,
              color: "var(--brand-primary, #7c3aed)",
              textDecoration: "none",
            }}
          >
            Ler na fonte
            <ExternalLink size={13} aria-hidden />
          </a>
        </div>
      </div>
    </li>
  );
}

export function SpinNaRedeHome({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { loading, erro, itens } = useHomeInvestidorSpinNaRede();
  const box = getPageContentBoxShellStyle(brand, t, { padding: 20 });

  if (!loading && !erro && itens.length === 0) {
    return null;
  }

  return (
    <section style={{ ...box, marginBottom: 14 }} aria-labelledby={`${sectionIdPrefix}-spin-title`}>
      <h2 id={`${sectionIdPrefix}-spin-title`} style={{ ...homeSectionTitleStyle(t.sectionTitle), marginBottom: 14 }}>
        Spin na Rede
      </h2>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando menções…</span>
        </div>
      ) : erro ? (
        <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
          Não foi possível carregar as menções. Se o problema persistir, entre em contato com o suporte.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {itens.map((row) => (
            <MencaoCard key={row.id} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}
