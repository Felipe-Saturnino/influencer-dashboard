import { BookOpen, Loader2, Megaphone, Newspaper } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { linhaMetaAutorPortalAcademy } from "../../../../lib/academyPortalAutorMeta";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { useHomeCentralAcademyFeed, type HomeCentralAcademyItem } from "../hooks/useHomeCentralAcademyFeed";
import { useHomeStaffLidoCollapse } from "../hooks/useHomeStaffLidoCollapse";
import { HomeStaffFeedCard } from "./HomeStaffFeedCard";
import { homeSectionTitleStyle, HOME_BODY_MUTED, HOME_LINK_BUTTON } from "./homeSharedUi";

const ICON_PROPS = { size: 16, strokeWidth: 2, "aria-hidden": true as const };

function iconeTitulo(kind: HomeCentralAcademyItem["kind"]): ReactNode {
  if (kind === "comunicado") return <Megaphone {...ICON_PROPS} />;
  if (kind === "dica") return <Newspaper {...ICON_PROPS} />;
  return <BookOpen {...ICON_PROPS} />;
}

function tituloCard(item: HomeCentralAcademyItem): string {
  if (item.kind === "comunicado") return `Academy Informa: ${item.titulo}!`;
  if (item.kind === "dica") return `Nova Dica Academy: ${item.titulo}`;
  return "Novo Manual de Academy na área!";
}

function DescricaoAcademy({ item }: { item: HomeCentralAcademyItem }) {
  const { theme: t } = useApp();
  const { propsFor, navigateTo } = useAppPageNav();

  if (item.kind === "comunicado") {
    const nav = propsFor("academy_portal", "Comunicados");
    const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      navigateTo("academy_portal", "Comunicados");
    };
    return (
      <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55, fontFamily: FONT.body }}>
        Acesse a página do{" "}
        <a href={nav.href} onClick={onClick} style={HOME_LINK_BUTTON}>
          Portal da Academy
        </a>{" "}
        para ver mais!
      </p>
    );
  }

  if (item.kind === "dica") {
    const nav = propsFor("academy_portal", "Dicas");
    const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      navigateTo("academy_portal", "Dicas");
    };
    return (
      <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55, fontFamily: FONT.body }}>
        Veja esta e outras Dicas no{" "}
        <a href={nav.href} onClick={onClick} style={HOME_LINK_BUTTON}>
          Portal da Academy
        </a>
        !
      </p>
    );
  }

  const nav = propsFor("academy_portal", "Manuais");
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigateTo("academy_portal", "Manuais");
  };
  return (
    <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55, fontFamily: FONT.body }}>
      Acesse o novo Manual de {item.titulo} no{" "}
      <a href={nav.href} onClick={onClick} style={HOME_LINK_BUTTON}>
        Portal da Academy
      </a>
      !
    </p>
  );
}

export function CentralAcademyStaffHome({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const { loading, erro, lista, podeVer } = useHomeCentralAcademyFeed();
  const { isRecolhido, marcarLido, expandir } = useHomeStaffLidoCollapse(user?.id, "academy");
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-central-academy-title`;

  if (!podeVer) return null;
  if (!loading && !erro && lista.length === 0) return null;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Central Academy
      </h2>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      ) : erro ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar a Central Academy. Se o problema persistir, entre em contato com o suporte.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {lista.map((item) => {
            const mostrarLiEOcultar = !item.cienciaPendente;
            return (
              <li key={item.id}>
                <HomeStaffFeedCard
                  title={tituloCard(item)}
                  titleIcon={iconeTitulo(item.kind)}
                  recolhido={mostrarLiEOcultar && isRecolhido(item.id)}
                  onExpandir={() => expandir(item.id)}
                  onLiEOcultar={() => marcarLido(item.id)}
                  mostrarLiEOcultar={mostrarLiEOcultar}
                  rodape={linhaMetaAutorPortalAcademy({ nome: item.autorNome }, item.published_at)}
                >
                  <DescricaoAcademy item={item} />
                </HomeStaffFeedCard>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
