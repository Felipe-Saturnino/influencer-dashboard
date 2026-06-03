import { ClipboardList, FileSignature, Layers, StickyNote, Users } from "lucide-react";
import type { CSSProperties } from "react";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { FiltroBarCampoSelect, FiltroBarTabButton } from "../../../components/dashboard";
import type { Theme } from "../../../constants/theme";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import {
  FILTRO_BAR_TAB_ICON_SIZE,
  getFilterBarRowStyle,
  getFilterBarWrapperStyle,
  handleFiltroBarTabsArrowKeyDown,
} from "../../../lib/filterBarStyles";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import type { RhFuncionarioTipoContrato } from "../../../types/rhFuncionario";
import {
  ABAS_PAGINA_RH_FUNC,
  PRESTADOR_STATUS_FILTRO_EXTRA,
  TIPOS_CONTRATO,
  type AbaPaginaRhFunc,
  type FiltroStatusPrestador,
} from "./gestaoPrestadorHelpers";

type DashboardBrand = ReturnType<
  typeof import("../../../hooks/useDashboardBrand").useDashboardBrand
>;

type Props = {
  brand: DashboardBrand;
  t: Theme;
  filtroDiretoria: string;
  onFiltroDiretoriaChange: (v: string) => void;
  opcoesFiltroDiretoria: { value: string; label: string }[];
  filtroGerencia: string;
  onFiltroGerenciaChange: (v: string) => void;
  opcoesFiltroGerencia: { value: string; label: string }[];
  filtroSetor: string;
  onFiltroSetorChange: (v: string) => void;
  opcoesFiltroSetor: { value: string; label: string }[];
  filtroContrato: RhFuncionarioTipoContrato | "todos";
  onFiltroContratoChange: (v: RhFuncionarioTipoContrato | "todos") => void;
  filtroStatus: FiltroStatusPrestador;
  onFiltroStatusChange: (v: FiltroStatusPrestador) => void;
  busca: string;
  onBuscaChange: (v: string) => void;
  abaPagina: AbaPaginaRhFunc;
  onAbaPaginaChange: (k: AbaPaginaRhFunc) => void;
  panelPaginaRhId: string;
  mostrarCtaAbaPaginaRh: boolean;
  podeCriarHeadcount: boolean;
  podeRhTalks: boolean;
  onNovoPrestador: () => void;
  onRhTalks: () => void;
};

function iconAbaPagina(k: AbaPaginaRhFunc) {
  const sz = FILTRO_BAR_TAB_ICON_SIZE;
  const p = { size: sz, strokeWidth: 2 as const, "aria-hidden": "true" as const };
  if (k === "headcount") return <Users {...p} />;
  if (k === "acoes_rh") return <ClipboardList {...p} />;
  return <StickyNote {...p} />;
}

function idTabPagina(k: AbaPaginaRhFunc) {
  return `rh-gest-func-pag-${k}`;
}

function filterBarSection(t: Theme, withTopBorder: boolean): CSSProperties {
  return {
    ...getFilterBarRowStyle(),
    width: "100%",
    ...(withTopBorder
      ? { paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }
      : {}),
  };
}

export function PrestadorFiltroBar({
  brand,
  t,
  filtroDiretoria,
  onFiltroDiretoriaChange,
  opcoesFiltroDiretoria,
  filtroGerencia,
  onFiltroGerenciaChange,
  opcoesFiltroGerencia,
  filtroSetor,
  onFiltroSetorChange,
  opcoesFiltroSetor,
  filtroContrato,
  onFiltroContratoChange,
  filtroStatus,
  onFiltroStatusChange,
  busca,
  onBuscaChange,
  abaPagina,
  onAbaPaginaChange,
  panelPaginaRhId,
  mostrarCtaAbaPaginaRh,
  podeCriarHeadcount,
  podeRhTalks,
  onNovoPrestador,
  onRhTalks,
}: Props) {
  return (
    <div style={getFilterBarWrapperStyle(brand, t)}>
      <div style={filterBarSection(t, false)}>
        <FiltroBarCampoSelect
          id="rh-filtro-dir"
          value={filtroDiretoria}
          onChange={onFiltroDiretoriaChange}
          options={opcoesFiltroDiretoria}
          icon={FilterBarIcons.diretoria}
          ariaLabel="Diretorias"
          todasLabel="Todas Diretorias"
        />
        <FiltroBarCampoSelect
          id="rh-filtro-ger"
          value={filtroGerencia}
          onChange={onFiltroGerenciaChange}
          options={opcoesFiltroGerencia}
          icon={<Layers size={15} strokeWidth={2} aria-hidden="true" />}
          ariaLabel="Gerências"
          todasLabel="Todas Gerências"
        />
        <FiltroBarCampoSelect
          id="rh-func-setor"
          value={filtroSetor}
          onChange={onFiltroSetorChange}
          options={opcoesFiltroSetor}
          icon={FilterBarIcons.time}
          ariaLabel="Setores"
          todasLabel="Todos Setores"
        />
        <FiltroBarCampoSelect
          id="rh-func-contrato"
          value={filtroContrato}
          onChange={(v) => onFiltroContratoChange(v as RhFuncionarioTipoContrato | "todos")}
          options={TIPOS_CONTRATO}
          icon={<FileSignature size={15} strokeWidth={2} aria-hidden="true" />}
          ariaLabel="Tipos de contrato"
          todasValue="todos"
          todasLabel="Todos Contratos"
        />
        <FiltroBarCampoSelect
          id="rh-func-status"
          value={filtroStatus}
          onChange={(v) => onFiltroStatusChange(v as FiltroStatusPrestador)}
          options={[]}
          extraOptions={PRESTADOR_STATUS_FILTRO_EXTRA}
          icon={FilterBarIcons.status}
          ariaLabel="Status"
          todasValue="disponiveis"
          todasLabel="Todos Status"
        />
      </div>
      <div style={filterBarSection(t, true)}>
        <BarraPesquisaPagina
          id="rh-func-busca"
          value={busca}
          onChange={onBuscaChange}
          placeholder={PAGE_SEARCH.nomeCpfEmail}
          aria-label="Pesquisar por nome, CPF ou e-mail"
          wrapperStyle={{ width: "100%", flex: "1 1 280px", maxWidth: "100%" }}
        />
      </div>
      <div style={filterBarSection(t, true)}>
        {mostrarCtaAbaPaginaRh ? (
          <div className="app-filter-bar-tabs-cta">
            <span className="app-filter-bar-tabs-cta__spacer" aria-hidden="true" />
            <div
              role="tablist"
              aria-label="Módulos de gestão de colaboradores"
              className="app-filter-bar-tabs-cta__tabs"
            >
              {ABAS_PAGINA_RH_FUNC.map((tb) => (
                <FiltroBarTabButton
                  key={tb.key}
                  id={idTabPagina(tb.key)}
                  active={abaPagina === tb.key}
                  aria-controls={panelPaginaRhId}
                  onClick={() => onAbaPaginaChange(tb.key)}
                  onKeyDown={(e) =>
                    handleFiltroBarTabsArrowKeyDown(
                      e,
                      ABAS_PAGINA_RH_FUNC.map((x) => x.key),
                      tb.key,
                      onAbaPaginaChange,
                      "rh-gest-func-pag-",
                    )
                  }
                  icon={iconAbaPagina(tb.key)}
                >
                  {tb.label}
                </FiltroBarTabButton>
              ))}
            </div>
            <div className="app-filter-bar-tabs-cta__actions">
              {abaPagina === "headcount" && podeCriarHeadcount ? (
                <CtaCriarButton type="button" onClick={onNovoPrestador}>
                  Novo Prestador
                </CtaCriarButton>
              ) : null}
              {abaPagina === "anotacoes" && podeRhTalks ? (
                <CtaCriarButton type="button" onClick={onRhTalks}>
                  RH Talks
                </CtaCriarButton>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            role="tablist"
            aria-label="Módulos de gestão de colaboradores"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
            }}
          >
            {ABAS_PAGINA_RH_FUNC.map((tb) => (
              <FiltroBarTabButton
                key={tb.key}
                id={idTabPagina(tb.key)}
                active={abaPagina === tb.key}
                aria-controls={panelPaginaRhId}
                onClick={() => onAbaPaginaChange(tb.key)}
                onKeyDown={(e) =>
                  handleFiltroBarTabsArrowKeyDown(
                    e,
                    ABAS_PAGINA_RH_FUNC.map((x) => x.key),
                    tb.key,
                    onAbaPaginaChange,
                    "rh-gest-func-pag-",
                  )
                }
                icon={iconAbaPagina(tb.key)}
              >
                {tb.label}
              </FiltroBarTabButton>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
