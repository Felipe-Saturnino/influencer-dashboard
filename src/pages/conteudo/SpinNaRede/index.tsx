import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Radio } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
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
};

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function SpinNaRede() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("spin_na_rede");

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [itens, setItens] = useState<SpinNaRedeMencaoRow[]>([]);

  const carregar = useCallback(async () => {
    if (perm.loading || perm.canView === "nao") return;
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase
      .from("spin_na_rede_mencao")
      .select("id, item_url, titulo, resumo, published_at, feed_url, fonte_host")
      .eq("passou_filtro", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) {
      console.error("[SpinNaRede]", error.message);
      setErro("Não foi possível carregar as menções. Tente novamente.");
      setItens([]);
    } else {
      setItens((data ?? []) as SpinNaRedeMencaoRow[]);
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
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  return (
    <div className="app-page-shell app-page-shell--pb64" style={{ fontFamily: FONT.body }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: brand.primaryIconBg,
            border: brand.primaryIconBorder,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: brand.primaryIconColor,
            flexShrink: 0,
          }}
        >
          <Radio size={16} aria-hidden="true" />
        </span>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: brand.primary,
            fontFamily: FONT_TITLE,
            margin: 0,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Spin na Rede
        </h1>
      </div>

      <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted, maxWidth: 720, lineHeight: 1.45 }}>
        Citações e menções públicas à Spin em notícias e feeds. Os itens são preenchidos automaticamente (Edge Function
        agendada) ou manualmente por quem tiver permissão de edição nesta página.
      </p>

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
          <span style={{ color: t.textMuted, fontSize: 13 }}>A carregar menções…</span>
        </div>
      ) : itens.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>
          Ainda não há menções indexadas. Quando o agregador RSS estiver ativo, os itens aparecerão aqui.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {itens.map((row) => {
            const resumoLimpo = row.resumo ? stripHtml(row.resumo) : "";
            const fonte = row.fonte_host?.trim() || "—";
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
                {resumoLimpo.length > 0 && (
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: t.textMuted, lineHeight: 1.45 }}>
                    {resumoLimpo.length > 220 ? `${resumoLimpo.slice(0, 220).trim()}…` : resumoLimpo}
                  </p>
                )}
                <a
                  href={row.item_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: brand.accent,
                    textDecoration: "none",
                  }}
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  Abrir fonte
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
