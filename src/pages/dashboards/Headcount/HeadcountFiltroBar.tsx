import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { Theme } from "../../../constants/theme";
import type { RhAreaAtuacao, RhFuncionarioTipoContrato } from "../../../types/rhFuncionario";
import {
  FiltroBarCampoSelect,
  FiltroHistoricoButton,
} from "../../../components/dashboard";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { getFilterBarRowStyle } from "../../../lib/filterBarStyles";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import type { HeadcountDiretoriaRef } from "../../../lib/headcountMetrics";
import { TIPOS_CONTRATO } from "../../rh/GestaoPrestador/gestaoPrestadorHelpers";

type Brand = ReturnType<typeof useDashboardBrand>;

type Props = {
  brand: Brand;
  t: Theme;
  historico: boolean;
  onToggleHistorico: () => void;
  labelCarrossel: string;
  carrosselAnteriorDisabled: boolean;
  carrosselProximoDisabled: boolean;
  onCarrosselAnterior: () => void;
  onCarrosselProximo: () => void;
  filtroDiretoria: string;
  onFiltroDiretoria: (v: string) => void;
  diretorias: HeadcountDiretoriaRef[];
  filtroArea: RhAreaAtuacao | "todas";
  onFiltroArea: (v: RhAreaAtuacao | "todas") => void;
  filtroContrato: RhFuncionarioTipoContrato | "todos";
  onFiltroContrato: (v: RhFuncionarioTipoContrato | "todos") => void;
  loading: boolean;
};

export function HeadcountFiltroBar({
  brand,
  t,
  historico,
  onToggleHistorico,
  labelCarrossel,
  carrosselAnteriorDisabled,
  carrosselProximoDisabled,
  onCarrosselAnterior,
  onCarrosselProximo,
  filtroDiretoria,
  onFiltroDiretoria,
  diretorias,
  filtroArea,
  onFiltroArea,
  filtroContrato,
  onFiltroContrato,
  loading,
}: Props) {
  return (
    <div style={getPageFilterBoxStyle(brand, t)}>
      <div style={getFilterBarRowStyle()}>
        <button
          type="button"
          aria-label="Mês anterior"
          style={getCarouselBtnNavStyle(t, carrosselAnteriorDisabled)}
          onClick={onCarrosselAnterior}
          disabled={carrosselAnteriorDisabled}
        >
          <ChevronLeft size={14} aria-hidden="true" />
        </button>

        <span style={getCarouselPeriodLabelStyle(t, { minWidth: "clamp(120px, 40vw, 180px)" })}>
          {labelCarrossel}
        </span>

        <button
          type="button"
          aria-label="Próximo mês"
          style={getCarouselBtnNavStyle(t, carrosselProximoDisabled)}
          onClick={onCarrosselProximo}
          disabled={carrosselProximoDisabled}
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>

        <FiltroHistoricoButton active={historico} onClick={onToggleHistorico} />

        <FiltroBarCampoSelect
          value={filtroDiretoria}
          onChange={onFiltroDiretoria}
          options={diretorias.map((d) => ({ value: d.id, label: d.nome }))}
          icon={FilterBarIcons.diretoria}
          ariaLabel="Diretorias"
          todasValue="todas"
          todasLabel="Todas as diretorias"
          minWidth={200}
        />

        <FiltroBarCampoSelect
          value={filtroArea}
          onChange={(v) => onFiltroArea(v as RhAreaAtuacao | "todas")}
          options={[
            { value: "estudio", label: "Estúdio" },
            { value: "escritorio", label: "Escritório" },
          ]}
          icon={FilterBarIcons.estudio}
          ariaLabel="Área de atuação"
          todasValue="todas"
          todasLabel="Todas as áreas"
          minWidth={180}
        />

        <FiltroBarCampoSelect
          value={filtroContrato}
          onChange={(v) => onFiltroContrato(v as RhFuncionarioTipoContrato | "todos")}
          options={TIPOS_CONTRATO.map((c) => ({ value: c.value, label: c.label }))}
          icon={FilterBarIcons.status}
          ariaLabel="Tipos de contrato"
          todasValue="todos"
          todasLabel="Todos os contratos"
          minWidth={180}
        />

        {loading && (
          <span
            style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 4 }}
            aria-live="polite"
          >
            <Clock size={12} aria-hidden />
            Carregando…
          </span>
        )}
      </div>
    </div>
  );
}
