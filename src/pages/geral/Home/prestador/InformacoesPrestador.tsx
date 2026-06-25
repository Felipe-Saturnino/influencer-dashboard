import { Loader2 } from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { CorpoHtmlInformativo } from "../../../../components/conteudo/CorpoHtmlInformativo";
import { fmtDataColunaGerenciamento } from "../../../../lib/informativosWorkflow";
import { getPageContentBoxStyle, getPageContentBoxShadow } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { useHomePrestadorInformacoesFeed, type HomePrestadorInformacaoItem } from "../hooks/useHomePrestadorInformacoesFeed";
import { homeSectionTitleStyle, HOME_BODY_MUTED, HOME_LINK_BUTTON } from "../shared/homeSharedUi";

function rodapeAutorData(autorNome: string, dataIso: string | null) {
  const dataFmt = dataIso ? fmtDataColunaGerenciamento(dataIso) : "—";
  return autorNome ? `${autorNome} · ${dataFmt}` : dataFmt;
}

function DescricaoGaleriaCard({ item }: { item: HomePrestadorInformacaoItem }) {
  const { theme: t } = useApp();
  const galeriaNav = useAppPageNav().propsFor("galeria_fotos");

  if (item.kind === "galeria_gerais") {
    return (
      <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55, fontFamily: FONT.body }}>
        Temos fotos novas no álbum {item.eventoNome}, acesse a{" "}
        <a href={galeriaNav.href} onClick={galeriaNav.onClick} style={HOME_LINK_BUTTON}>
          Galeria de Fotos
        </a>{" "}
        para ver!
      </p>
    );
  }

  if (item.kind === "galeria_minhas") {
    return (
      <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55, fontFamily: FONT.body }}>
        Você possui fotos novas no seu álbum, acesse a{" "}
        <a href={galeriaNav.href} onClick={galeriaNav.onClick} style={HOME_LINK_BUTTON}>
          Galeria de Fotos
        </a>{" "}
        para ver!
      </p>
    );
  }

  return null;
}

export function InformacoesPrestador() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { loading, erro, lista } = useHomePrestadorInformacoesFeed();
  const box = getPageContentBoxStyle(brand, t);
  const cardShadow = getPageContentBoxShadow(t.isDark ?? false);

  return (
    <section style={box} aria-labelledby="home-prestador-info-title">
      <h2 id="home-prestador-info-title" style={homeSectionTitleStyle(t.sectionTitle)}>
        Informações
      </h2>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      ) : erro ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar as informações. Se o problema persistir, entre em contato com o suporte.
        </p>
      ) : lista.length === 0 ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Nenhuma informação publicada para seu perfil no momento.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {lista.map((item) => (
            <li key={item.kind === "informativo" ? item.id : item.id}>
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
                  {item.kind === "informativo" ? item.assunto : "Novas fotos disponíveis"}
                </h3>
                <div style={{ marginTop: 12 }}>
                  {item.kind === "informativo" ? (
                    <CorpoHtmlInformativo html={item.descricao} color={t.text} />
                  ) : (
                    <DescricaoGaleriaCard item={item} />
                  )}
                </div>
                <p style={{ fontSize: 12, color: t.textMuted, margin: "14px 0 0", fontFamily: FONT.body }}>
                  {item.kind === "informativo"
                    ? rodapeAutorData(item.autorNome, item.published_at)
                    : rodapeAutorData(item.autorNome, item.created_at)}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
