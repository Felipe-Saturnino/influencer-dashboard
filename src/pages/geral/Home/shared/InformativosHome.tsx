import { Loader2 } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { CorpoHtmlInformativo } from "../../../../components/conteudo/CorpoHtmlInformativo";
import { fmtDataColunaGerenciamento } from "../../../../lib/informativosWorkflow";
import { getPageContentBoxStyle, getPageContentBoxShadow } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import type { Role } from "../../../../types";
import { useHomeInformativos } from "../hooks/useHomeInformativos";
import { homeSectionTitleStyle, HOME_BODY_MUTED } from "./homeSharedUi";

export function InformativosHome({ perfil, sectionIdPrefix }: { perfil: Role; sectionIdPrefix: string }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { loading, erro, lista } = useHomeInformativos(perfil);
  const box = getPageContentBoxStyle(brand, t);
  const cardShadow = getPageContentBoxShadow(t.isDark ?? false);

  return (
    <section style={box} aria-labelledby={`${sectionIdPrefix}-info-title`}>
      <h2 id={`${sectionIdPrefix}-info-title`} style={homeSectionTitleStyle(t.sectionTitle)}>
        Informações
      </h2>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      ) : erro ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar os informativos. Se o problema persistir, entre em contato com o suporte.
        </p>
      ) : lista.length === 0 ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Nenhum informativo publicado para seu perfil no momento.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {lista.map((item) => (
            <li key={item.id}>
              <article
                style={{
                  background: t.cardBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 14,
                  padding: "16px 18px",
                  boxShadow: cardShadow,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 800,
                    color: t.text,
                    fontFamily: FONT.body,
                  }}
                >
                  {item.assunto}
                </h3>
                <div style={{ marginTop: 12 }}>
                  <CorpoHtmlInformativo html={item.descricao} color={t.text} />
                </div>
                <p style={{ fontSize: 12, color: t.textMuted, margin: "14px 0 0", fontFamily: FONT.body }}>
                  {item.autorNome ? `${item.autorNome} · ` : ""}
                  {item.published_at ? fmtDataColunaGerenciamento(item.published_at) : "—"}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
