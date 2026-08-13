import { FileText, Loader2, Megaphone, MessagesSquare } from "lucide-react";
import { useMemo, type MouseEvent, type ReactNode } from "react";
import type { Role } from "../../../../types";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { useAppPageNav } from "../../../../hooks/useAppPageNav";
import { CorpoHtmlInformativo } from "../../../../components/conteudo/CorpoHtmlInformativo";
import { getHomeStaffFeedNovidadeDesdeIso } from "../../../../lib/homePrestadorGaleriaNovidades";
import { fmtDataColunaGerenciamento } from "../../../../lib/informativosWorkflow";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { FONT } from "../../../../constants/theme";
import { useHomeInformativos } from "../hooks/useHomeInformativos";
import { useHomePortalRhFeed, type HomePortalRhItem } from "../hooks/useHomePortalRhFeed";
import { useHomeStaffLidoCollapse } from "../hooks/useHomeStaffLidoCollapse";
import { HomeStaffFeedCard } from "./HomeStaffFeedCard";
import { homeSectionTitleStyle, HOME_BODY_MUTED, HOME_LINK_BUTTON } from "./homeSharedUi";

const ICON_PROPS = { size: 16, strokeWidth: 2, "aria-hidden": true as const };

type ItemInformativo = {
  source: "informativo";
  id: string;
  titulo: string;
  descricao: string;
  published_at: string | null;
  autorNome: string;
};

type ItemPortalRh = {
  source: "portal_rh";
  kind: HomePortalRhItem["kind"];
  id: string;
  titulo: string;
  published_at: string | null;
  autorNome: string;
};

type ItemInformacoes = ItemInformativo | ItemPortalRh;

function rodapeAutorData(autorNome: string, dataIso: string | null) {
  const dataFmt = dataIso ? fmtDataColunaGerenciamento(dataIso) : "—";
  return autorNome ? `${autorNome} · ${dataFmt}` : dataFmt;
}

function tsItem(publishedAt: string | null): number {
  if (!publishedAt) return 0;
  const t = Date.parse(publishedAt);
  return Number.isFinite(t) ? t : 0;
}

function iconePortalRh(kind: HomePortalRhItem["kind"]): ReactNode {
  if (kind === "comunicado") return <Megaphone {...ICON_PROPS} />;
  if (kind === "politica") return <FileText {...ICON_PROPS} />;
  return <MessagesSquare {...ICON_PROPS} />;
}

function tituloPortalRh(item: ItemPortalRh): string {
  if (item.kind === "comunicado") return `RH Informa: ${item.titulo}!`;
  if (item.kind === "politica") return `Nova política no Portal de RH: ${item.titulo}`;
  return `Novo RH Talk: ${item.titulo}`;
}

function abaPortalRh(kind: HomePortalRhItem["kind"]): string {
  if (kind === "comunicado") return "Comunicados";
  if (kind === "politica") return "PoliticasENormativas";
  return "RHTalks";
}

function DescricaoPortalRh({ item }: { item: ItemPortalRh }) {
  const { theme: t } = useApp();
  const { propsFor, navigateTo } = useAppPageNav();
  const tab = abaPortalRh(item.kind);
  const nav = propsFor("rh_portal", tab);
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigateTo("rh_portal", tab);
  };

  if (item.kind === "comunicado") {
    return (
      <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55, fontFamily: FONT.body }}>
        Acesse o{" "}
        <a href={nav.href} onClick={onClick} style={HOME_LINK_BUTTON}>
          Portal de RH
        </a>{" "}
        para ver o comunicado!
      </p>
    );
  }

  if (item.kind === "politica") {
    return (
      <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55, fontFamily: FONT.body }}>
        Consulte a política no{" "}
        <a href={nav.href} onClick={onClick} style={HOME_LINK_BUTTON}>
          Portal de RH
        </a>
        !
      </p>
    );
  }

  return (
    <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.55, fontFamily: FONT.body }}>
      Veja o RH Talk no{" "}
      <a href={nav.href} onClick={onClick} style={HOME_LINK_BUTTON}>
        Portal de RH
      </a>
      !
    </p>
  );
}

export function InformacoesStaffHome({
  perfil,
  sectionIdPrefix,
}: {
  perfil: Role;
  sectionIdPrefix: string;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const publicadoDesdeIso = useMemo(() => getHomeStaffFeedNovidadeDesdeIso(), []);
  const info = useHomeInformativos(perfil, { publicadoDesdeIso });
  const portal = useHomePortalRhFeed();
  const { isRecolhido, isLido, marcarLido, expandir } = useHomeStaffLidoCollapse(user?.id, "informativo");
  const box = getPageContentBoxStyle(brand, t);
  const titleId = `${sectionIdPrefix}-info-title`;

  const lista = useMemo(() => {
    const items: ItemInformacoes[] = [];

    for (const row of info.lista) {
      items.push({
        source: "informativo",
        id: row.id,
        titulo: row.assunto,
        descricao: row.descricao,
        published_at: row.published_at,
        autorNome: row.autorNome,
      });
    }

    for (const row of portal.lista) {
      // Só some da Home após «Li e Ocultar» (sem janela de 10 dias).
      if (isLido(row.id)) continue;
      items.push({
        source: "portal_rh",
        kind: row.kind,
        id: row.id,
        titulo: row.titulo,
        published_at: row.published_at,
        autorNome: row.autorNome,
      });
    }

    items.sort((a, b) => tsItem(b.published_at) - tsItem(a.published_at));
    return items;
  }, [info.lista, portal.lista, isLido]);

  const loading = info.loading || portal.loading;
  const erroTotal = lista.length === 0 && (info.erro || portal.erro);

  if (!loading && !erroTotal && lista.length === 0) return null;

  return (
    <section style={box} aria-labelledby={titleId}>
      <h2 id={titleId} style={homeSectionTitleStyle(t.sectionTitle)}>
        Informações
      </h2>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
          <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      ) : erroTotal ? (
        <p style={{ ...HOME_BODY_MUTED, color: t.textMuted }}>
          Não foi possível carregar as informações. Se o problema persistir, entre em contato com o suporte.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {lista.map((item) =>
            item.source === "informativo" ? (
              <li key={item.id}>
                <HomeStaffFeedCard
                  title={item.titulo}
                  recolhido={isRecolhido(item.id)}
                  onExpandir={() => expandir(item.id)}
                  onLiEOcultar={() => marcarLido(item.id)}
                  rodape={rodapeAutorData(item.autorNome, item.published_at)}
                >
                  <CorpoHtmlInformativo html={item.descricao} color={t.text} />
                </HomeStaffFeedCard>
              </li>
            ) : (
              <li key={item.id}>
                <HomeStaffFeedCard
                  title={tituloPortalRh(item)}
                  titleIcon={iconePortalRh(item.kind)}
                  recolhido={false}
                  onExpandir={() => undefined}
                  onLiEOcultar={() => marcarLido(item.id)}
                  rodape={rodapeAutorData(item.autorNome, item.published_at)}
                >
                  <DescricaoPortalRh item={item} />
                </HomeStaffFeedCard>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
