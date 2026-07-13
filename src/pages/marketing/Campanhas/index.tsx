import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Link2, Megaphone } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { Campanha, CampanhaLink } from "../../../types";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import {
  FiltroBarTabButton,
  FiltroBarPillButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
  OPERADORA_FILTRO_TODAS_LABEL,
  OPERADORA_FILTRO_TODAS_VALUE,
} from "../../../components/dashboard";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { getFilterBarRowStyle } from "../../../lib/filterBarStyles";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { carregarCampanhaLinks } from "../../../lib/campanhaLinks";
import { CampanhasTabContent } from "./CampanhasTabContent";
import { GeracaoLinksTabContent } from "./GeracaoLinksTabContent";

type AbaCampanhas = "campanhas" | "geracao_links";

const ABAS: AbaCampanhas[] = ["campanhas", "geracao_links"];

const ABA_LABEL: Record<AbaCampanhas, string> = {
  campanhas: "Campanhas",
  geracao_links: "Geração de Links",
};

export default function Campanhas() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("campanhas");
  const { showFiltroOperadora, operadoraSlugsForcado } = useDashboardFiltros();

  const [aba, setAba] = useRouteTab("campanhas", "campanhas", ABAS);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [links, setLinks] = useState<CampanhaLink[]>([]);
  const [operadoras, setOperadoras] = useState<{ slug: string; nome: string }[]>([]);
  const [operadorasFiltro, setOperadorasFiltro] = useState<{ slug: string; nome: string }[]>([]);
  const [loadingCampanhas, setLoadingCampanhas] = useState(true);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [filtroOperadora, setFiltroOperadora] = useState<string>(OPERADORA_FILTRO_TODAS_VALUE);

  const carregarCampanhas = useCallback(async () => {
    setLoadingCampanhas(true);
    const { data } = await supabase.from("campanhas").select("*").order("nome");
    setCampanhas(data ?? []);
    setLoadingCampanhas(false);
  }, []);

  const carregarLinks = useCallback(async () => {
    setLoadingLinks(true);
    const slug =
      filtroOperadora === OPERADORA_FILTRO_TODAS_VALUE
        ? operadoraSlugsForcado?.length === 1
          ? operadoraSlugsForcado[0]!
          : null
        : filtroOperadora;
    const list = await carregarCampanhaLinks(slug);
    setLinks(list);
    setLoadingLinks(false);
  }, [filtroOperadora, operadoraSlugsForcado]);

  useEffect(() => {
    void carregarCampanhas();
  }, [carregarCampanhas]);

  useEffect(() => {
    if (aba === "geracao_links") {
      void carregarLinks();
    }
  }, [aba, carregarLinks]);

  useEffect(() => {
    void supabase
      .from("operadoras")
      .select("slug, nome")
      .order("nome")
      .then(({ data }) => setOperadoras(data ?? []));
    void supabase
      .from("operadoras")
      .select("slug, nome")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setOperadorasFiltro(data ?? []));
  }, []);

  useEffect(() => {
    if (operadoraSlugsForcado?.length === 1) {
      setFiltroOperadora(operadoraSlugsForcado[0]!);
    }
  }, [operadoraSlugsForcado]);

  const operadorasCarrossel = useMemo(() => {
    if (operadoraSlugsForcado?.length) {
      return operadorasFiltro.filter((o) => operadoraSlugsForcado.includes(o.slug));
    }
    return operadorasFiltro;
  }, [operadorasFiltro, operadoraSlugsForcado]);

  const todas = filtroOperadora === OPERADORA_FILTRO_TODAS_VALUE;
  const idxAtual = useMemo(() => {
    if (todas) return -1;
    return operadorasCarrossel.findIndex((o) => o.slug === filtroOperadora);
  }, [filtroOperadora, operadorasCarrossel, todas]);

  const idxValido = idxAtual >= 0;
  const navPrevDisabled = todas || !idxValido || idxAtual === 0 || operadorasCarrossel.length === 0;
  const navNextDisabled =
    todas || !idxValido || idxAtual >= operadorasCarrossel.length - 1 || operadorasCarrossel.length === 0;

  const labelCentro = todas
    ? OPERADORA_FILTRO_TODAS_LABEL
    : operadorasCarrossel.length === 0
      ? "—"
      : idxValido
        ? operadorasCarrossel[idxAtual]!.nome
        : "—";

  const irAnterior = () => {
    if (todas || !idxValido || operadorasCarrossel.length === 0) return;
    setFiltroOperadora(operadorasCarrossel[Math.max(0, idxAtual - 1)]!.slug);
  };

  const irProximo = () => {
    if (todas || !idxValido || operadorasCarrossel.length === 0) return;
    setFiltroOperadora(
      operadorasCarrossel[Math.min(operadorasCarrossel.length - 1, idxAtual + 1)]!.slug,
    );
  };

  const toggleTodasOperadoras = () => {
    if (todas) {
      const first = operadorasCarrossel[0];
      if (first) setFiltroOperadora(first.slug);
      return;
    }
    setFiltroOperadora(OPERADORA_FILTRO_TODAS_VALUE);
  };

  const campanhasFiltradas = useMemo(() => {
    if (todas) {
      if (operadoraSlugsForcado?.length) {
        return campanhas.filter(
          (c) => !c.operadora_slug || operadoraSlugsForcado.includes(c.operadora_slug),
        );
      }
      return campanhas;
    }
    return campanhas.filter(
      (c) => c.operadora_slug === filtroOperadora || c.operadora_slug == null,
    );
  }, [campanhas, filtroOperadora, todas, operadoraSlugsForcado]);

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const mostrarCarrosselOperadora = showFiltroOperadora && operadorasCarrossel.length > 0;

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="campanhas" />}
        title={getPageMenuLabel("campanhas")}
        subtitle="Cadastre campanhas de mídia e vincule UTMs para monitorar performance nos dashboards."
      />

      <div style={getPageFilterBoxStyle(brand, t)}>
        {mostrarCarrosselOperadora ? (
          <div style={{ ...getFilterBarRowStyle(), marginBottom: 12, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <button
                type="button"
                aria-label="Operadora anterior"
                disabled={navPrevDisabled}
                style={getCarouselBtnNavStyle(t, navPrevDisabled)}
                onClick={irAnterior}
              >
                <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
              </button>
              <span
                style={getCarouselPeriodLabelStyle(t, {
                  minWidth: "clamp(120px, 40vw, 220px)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                })}
                title={!todas && idxValido ? labelCentro : undefined}
              >
                {labelCentro}
              </span>
              <button
                type="button"
                aria-label="Próxima operadora"
                disabled={navNextDisabled}
                style={getCarouselBtnNavStyle(t, navNextDisabled)}
                onClick={irProximo}
              >
                <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            <FiltroBarPillButton
              active={todas}
              onClick={toggleTodasOperadoras}
              icon={FilterBarIcons.operadora}
              aria-label={
                todas ? "Filtrar por uma operadora de cada vez" : "Ver todas as operadoras de uma vez"
              }
            >
              {OPERADORA_FILTRO_TODAS_LABEL}
            </FiltroBarPillButton>
          </div>
        ) : null}

        <div
          role="tablist"
          aria-label="Abas de Campanhas"
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ABAS, setAba, (k) => `tab-campanhas-${k}`)}
          style={{ ...getFilterBarRowStyle(), width: "100%" }}
        >
          <FiltroBarTabButton
            id="tab-campanhas-campanhas"
            active={aba === "campanhas"}
            aria-controls="panel-campanhas-campanhas"
            onClick={() => setAba("campanhas")}
            icon={<Megaphone {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            {ABA_LABEL.campanhas}
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-campanhas-geracao_links"
            active={aba === "geracao_links"}
            aria-controls="panel-campanhas-geracao_links"
            onClick={() => setAba("geracao_links")}
            icon={<Link2 {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            {ABA_LABEL.geracao_links}
          </FiltroBarTabButton>
        </div>
      </div>

      <div
        id="panel-campanhas-campanhas"
        role="tabpanel"
        aria-labelledby="tab-campanhas-campanhas"
        hidden={aba !== "campanhas"}
      >
        {aba === "campanhas" ? (
          <CampanhasTabContent
            campanhas={campanhasFiltradas}
            operadoras={operadoras}
            loading={loadingCampanhas}
            onRecarregar={carregarCampanhas}
          />
        ) : null}
      </div>

      <div
        id="panel-campanhas-geracao_links"
        role="tabpanel"
        aria-labelledby="tab-campanhas-geracao_links"
        hidden={aba !== "geracao_links"}
      >
        {aba === "geracao_links" ? (
          <GeracaoLinksTabContent
            links={links}
            operadoras={operadoras}
            loading={loadingLinks}
            onNovoLink={() => {
              /* Modal Novo Link — próxima entrega */
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
