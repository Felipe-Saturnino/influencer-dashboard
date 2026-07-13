import { Loader2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { fmtDataColunaGerenciamento } from "../../../../lib/informativosWorkflow";
import { setHomeGaleriaFocus } from "../../../../lib/homeGaleriaDeepLink";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { useHomeBlogueiroSpinFeed, type HomeBlogueiroSpinItem } from "../hooks/useHomeBlogueiroSpinFeed";
import { useHomeStaffLidoCollapse } from "../hooks/useHomeStaffLidoCollapse";
import { HomeStaffFeedCard } from "./HomeStaffFeedCard";
import { homeSectionTitleStyle, HOME_BODY_MUTED, HOME_LINK_BUTTON } from "./homeSharedUi";

function rodapeAutorData(autorNome: string, dataIso: string | null) {
  const dataFmt = dataIso ? fmtDataColunaGerenciamento(dataIso) : "—";
  return autorNome ? `${autorNome} · ${dataFmt}` : dataFmt;
}

function tituloCard(item: HomeBlogueiroSpinItem): string {
  if (item.kind === "galeria_gerais") return `Album ${item.eventoNome} com fotos novas`;
  if (item.kind === "galeria_minhas") return "Temos Fotos novas sua";
  return "Spin saiu novamente na Mídia";
}

function DescricaoBlogueiro({ item }: { item: HomeBlogueiroSpinItem }) {
  const { theme: t } = useApp();
  const { propsFor, navigateTo } = useAppPageNav();
  const spinNav = propsFor("spin_na_rede");
  const galeriaBase = propsFor("galeria_fotos", "galeria");

  if (item.kind === "galeria_gerais") {
    const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setHomeGaleriaFocus({ subAba: "gerais", eventoId: item.eventoId });
      navigateTo("galeria_fotos", "galeria");
    };
    return (
      <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55, fontFamily: FONT.body }}>
        Temos fotos novas no álbum {item.eventoNome}, acesse a{" "}
        <a href={galeriaBase.href} onClick={onClick} style={HOME_LINK_BUTTON}>
          Galeria de Fotos
        </a>{" "}
        para ver!
      </p>
    );
  }

  if (item.kind === "galeria_minhas") {
    const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setHomeGaleriaFocus({ subAba: "minhas_fotos" });
      navigateTo("galeria_fotos", "galeria");
    };
    return (
      <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55, fontFamily: FONT.body }}>
        Temos fotos novas no seu álbum pessoal, acesse a{" "}
        <a href={galeriaBase.href} onClick={onClick} style={HOME_LINK_BUTTON}>
          Galeria de Fotos
        </a>{" "}
        para ver!
      </p>
    );
  }

  return (
    <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55, fontFamily: FONT.body }}>
      A reportagem {item.titulo} acaba de sair, acesse o{" "}
      <a href={spinNav.href} onClick={spinNav.onClick} style={HOME_LINK_BUTTON}>
        Spin na Rede
      </a>{" "}
      para ver!
    </p>
  );
}

function rodapeItem(item: HomeBlogueiroSpinItem): string | undefined {
  if (item.kind === "spin_na_rede") {
    return item.published_at ? fmtDataColunaGerenciamento(item.published_at) : undefined;
  }
  return rodapeAutorData(item.autorNome, item.created_at);
}

export function BlogueiroSpinStaffHome({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const { loading, erro, lista } = useHomeBlogueiroSpinFeed();
  const { isRecolhido, marcarLido, expandir } = useHomeStaffLidoCollapse(user?.id, "blogueiro");
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-blogueiro-title`;

  if (!loading && !erro && lista.length === 0) return null;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Blogueiro Spin
      </h2>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      ) : erro ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar o Blogueiro Spin. Se o problema persistir, entre em contato com o suporte.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {lista.map((item) => (
            <li key={item.id}>
              <HomeStaffFeedCard
                title={tituloCard(item)}
                recolhido={isRecolhido(item.id)}
                onExpandir={() => expandir(item.id)}
                onLiEOcultar={() => marcarLido(item.id)}
                rodape={rodapeItem(item)}
              >
                <DescricaoBlogueiro item={item} />
              </HomeStaffFeedCard>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
