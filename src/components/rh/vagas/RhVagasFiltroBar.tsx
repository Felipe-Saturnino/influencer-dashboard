import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { Briefcase, ClipboardList, ClipboardType, SlidersHorizontal, UserCheck } from "lucide-react";
import { FiltroBarTabButton } from "../../dashboard/FiltroBarTabButton";
import { FILTRO_BAR_TAB_ICON_SIZE, handleFiltroBarTabsArrowKeyDown } from "../../../lib/filterBarStyles";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { getFilterBarRowStyle, getFilterBarWrapperStyle } from "../../../lib/filterBarStyles";
import {
  VAGA_FILTRO_STATUS_ARIA_LABEL,
  VAGA_FILTRO_TIPO_ARIA_LABEL,
  VAGA_FILTRO_TODAS_VAGAS_LABEL,
  VAGA_FILTRO_TODAS_VAGAS_VALUE,
  VAGA_FILTRO_TODOS_STATUS_LABEL,
  VAGA_FILTRO_TODOS_STATUS_VALUE,
  VAGA_FILTRO_TODOS_TIPOS_LABEL,
  VAGA_FILTRO_TODOS_TIPOS_VALUE,
  VAGA_FILTRO_VAGAS_ARIA_LABEL,
  VAGA_STATUS_FILTRO_OPCOES,
  VAGA_TIPO_FILTRO_OPCOES,
  type VagaFiltroStatusValue,
  type VagaFiltroTipoCandidaturasValue,
} from "../../../lib/rhVagasFiltroConstants";
import type { FiltroBarCampoOption } from "../../FiltroBarCampoSelect";
import { FiltroBarCampoSelect } from "../../FiltroBarCampoSelect";
import { BarraPesquisaPagina } from "../../BarraPesquisaPagina";
import { CtaCriarButton } from "../../CtaCriarButton";
import type { RhVagasAba } from "../../../types/rhVaga";

const TAB_BASE: RhVagasAba[] = ["abertas", "em_andamento", "gerenciamento"];
const TAB_LABELS: Record<RhVagasAba, string> = {
  abertas: "Vagas Abertas",
  em_andamento: "Vagas em Andamento",
  gerenciamento: "Gerenciamento de Vagas",
  candidaturas: "Candidaturas",
};

type Theme = { text: string; textMuted: string; cardBorder: string; inputBg?: string; cardBg?: string };

export function RhVagasFiltroBar({
  aba,
  setAba,
  mostrarGerenciamento,
  mostrarCandidaturas,
  t,
  busca,
  onBuscaChange,
  buscaId,
  buscaPlaceholder,
  buscaAriaLabel,
  filtroStatusGestao,
  onFiltroStatusGestao,
  podeCriarVaga,
  onNovaVaga,
  filtroStatusCandidaturas,
  onFiltroStatusCandidaturas,
  filtroTipoCandidaturas,
  onFiltroTipoCandidaturas,
  opcoesVagaCandidaturas,
  vagaIdFiltroCandidaturas,
  onVagaIdFiltroCandidaturas,
}: {
  aba: RhVagasAba;
  setAba: Dispatch<SetStateAction<RhVagasAba>>;
  mostrarGerenciamento: boolean;
  mostrarCandidaturas: boolean;
  t: Theme;
  busca: string;
  onBuscaChange: (value: string) => void;
  buscaId: string;
  buscaPlaceholder: string;
  buscaAriaLabel: string;
  filtroStatusGestao?: VagaFiltroStatusValue;
  onFiltroStatusGestao?: (value: VagaFiltroStatusValue) => void;
  podeCriarVaga?: boolean;
  onNovaVaga?: () => void;
  filtroStatusCandidaturas?: VagaFiltroStatusValue;
  onFiltroStatusCandidaturas?: (value: VagaFiltroStatusValue) => void;
  filtroTipoCandidaturas?: VagaFiltroTipoCandidaturasValue;
  onFiltroTipoCandidaturas?: (value: VagaFiltroTipoCandidaturasValue) => void;
  opcoesVagaCandidaturas?: readonly FiltroBarCampoOption[];
  vagaIdFiltroCandidaturas?: string;
  onVagaIdFiltroCandidaturas?: (value: string) => void;
}) {
  const brand = useDashboardBrand();
  const tabs: RhVagasAba[] = [
    ...TAB_BASE.filter((k) => k !== "gerenciamento" || mostrarGerenciamento),
    ...(mostrarCandidaturas ? (["candidaturas"] as const) : []),
  ];

  const filterBarSection = (withTopBorder: boolean): CSSProperties => ({
    ...getFilterBarRowStyle(),
    width: "100%",
    alignItems: "center",
    ...(withTopBorder
      ? { paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }
      : {}),
  });

  const linha2Filtros: ReactNode[] = [];

  if (aba === "gerenciamento" && filtroStatusGestao != null && onFiltroStatusGestao) {
    linha2Filtros.push(
      <FiltroBarCampoSelect
        key="status-gestao"
        id="filtro-status-vaga-gestao"
        value={filtroStatusGestao}
        onChange={(v) => onFiltroStatusGestao(v as VagaFiltroStatusValue)}
        options={VAGA_STATUS_FILTRO_OPCOES}
        icon={FilterBarIcons.status}
        ariaLabel={VAGA_FILTRO_STATUS_ARIA_LABEL}
        todasValue={VAGA_FILTRO_TODOS_STATUS_VALUE}
        todasLabel={VAGA_FILTRO_TODOS_STATUS_LABEL}
      />,
    );
  }

  if (aba === "candidaturas") {
    if (filtroStatusCandidaturas != null && onFiltroStatusCandidaturas) {
      linha2Filtros.push(
        <FiltroBarCampoSelect
          key="status-cand"
          id="filtro-status-vaga-cand"
          value={filtroStatusCandidaturas}
          onChange={(v) => onFiltroStatusCandidaturas(v as VagaFiltroStatusValue)}
          options={VAGA_STATUS_FILTRO_OPCOES}
          icon={FilterBarIcons.status}
          ariaLabel={VAGA_FILTRO_STATUS_ARIA_LABEL}
          todasValue={VAGA_FILTRO_TODOS_STATUS_VALUE}
          todasLabel={VAGA_FILTRO_TODOS_STATUS_LABEL}
        />,
      );
    }
    if (filtroTipoCandidaturas != null && onFiltroTipoCandidaturas) {
      linha2Filtros.push(
        <FiltroBarCampoSelect
          key="tipo-cand"
          id="filtro-tipo-vaga-cand"
          value={filtroTipoCandidaturas}
          onChange={(v) => onFiltroTipoCandidaturas(v as VagaFiltroTipoCandidaturasValue)}
          options={VAGA_TIPO_FILTRO_OPCOES}
          icon={<ClipboardType size={15} strokeWidth={2} aria-hidden="true" />}
          ariaLabel={VAGA_FILTRO_TIPO_ARIA_LABEL}
          todasValue={VAGA_FILTRO_TODOS_TIPOS_VALUE}
          todasLabel={VAGA_FILTRO_TODOS_TIPOS_LABEL}
        />,
      );
    }
    if (vagaIdFiltroCandidaturas != null && onVagaIdFiltroCandidaturas) {
      linha2Filtros.push(
        <FiltroBarCampoSelect
          key="vaga-cand"
          id="filtro-vaga-cand"
          value={vagaIdFiltroCandidaturas}
          onChange={onVagaIdFiltroCandidaturas}
          options={opcoesVagaCandidaturas ?? []}
          icon={<ClipboardType size={15} strokeWidth={2} aria-hidden="true" />}
          ariaLabel={VAGA_FILTRO_VAGAS_ARIA_LABEL}
          todasValue={VAGA_FILTRO_TODAS_VAGAS_VALUE}
          todasLabel={VAGA_FILTRO_TODAS_VAGAS_LABEL}
          minWidth={240}
        />,
      );
    }
  }

  const mostrarNovaVaga = aba === "gerenciamento" && podeCriarVaga && onNovaVaga;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={getFilterBarWrapperStyle(brand)}>
        <div
          role="tablist"
          aria-label="Seções de vagas"
          style={filterBarSection(false)}
        >
          {tabs.map((key) => {
            const TabIcon =
              key === "abertas"
                ? Briefcase
                : key === "em_andamento"
                  ? ClipboardList
                  : key === "gerenciamento"
                    ? SlidersHorizontal
                    : UserCheck;
            return (
              <FiltroBarTabButton
                key={key}
                id={`tab-rh-vagas-${key}`}
                active={aba === key}
                aria-controls={`panel-rh-vagas-${key}`}
                onClick={() => setAba(key)}
                onKeyDown={(e) => handleFiltroBarTabsArrowKeyDown(e, tabs, key, setAba, "tab-rh-vagas-")}
                icon={<TabIcon size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
              >
                {TAB_LABELS[key]}
              </FiltroBarTabButton>
            );
          })}
        </div>

        <div
          style={{
            ...filterBarSection(true),
            justifyContent: mostrarNovaVaga ? "space-between" : "center",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
              flex: "1 1 auto",
              minWidth: 0,
            }}
          >
            <BarraPesquisaPagina
              id={buscaId}
              value={busca}
              onChange={onBuscaChange}
              placeholder={buscaPlaceholder}
              aria-label={buscaAriaLabel}
              wrapperStyle={{ flex: "1 1 280px", maxWidth: "100%", minWidth: 200 }}
            />
            {linha2Filtros}
          </div>
          {mostrarNovaVaga ? (
            <CtaCriarButton type="button" onClick={onNovaVaga} style={{ flexShrink: 0 }}>
              Nova Vaga
            </CtaCriarButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
