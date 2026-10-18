import { BookOpen, CircleCheck, FileText, ListOrdered } from "lucide-react";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { FiltroBarCampoSelect, FiltroBarTabButton } from "../../../components/dashboard";
import type { Theme } from "../../../constants/theme";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import {
  ACADEMY_CRONOGRAMA_PAGE_KEY,
  ACADEMY_CRONOGRAMA_TABS,
} from "../../../lib/academyCronogramaConstants";
import type { AcademyCatalogoStatus, AcademyCronograma, AcademyCronogramaTab } from "../../../lib/academyCronogramaTypes";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../lib/filterBarStyles";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";

type Brand = ReturnType<typeof useDashboardBrand>;

type Props = {
  brand: Brand;
  t: Theme;
  aba: AcademyCronogramaTab;
  onSelectAba: (tab: AcademyCronogramaTab) => void;
  cronogramas: AcademyCronograma[];
  cronogramaId: string;
  onSelecionarCronograma: (id: string) => void;
  busca: string;
  onBusca: (value: string) => void;
  status: AcademyCatalogoStatus;
  onStatus: (value: AcademyCatalogoStatus) => void;
  canCriar: boolean;
  onNovoCronograma: () => void;
  onNovaTrilha: () => void;
  onNovoMaterial: () => void;
  onNovaProva: () => void;
};

const TAB_ICONS: Record<AcademyCronogramaTab, React.ReactNode> = {
  cronogramas: <ListOrdered {...FILTRO_BAR_TAB_ICON_PROPS} />,
  trilhas: <BookOpen {...FILTRO_BAR_TAB_ICON_PROPS} />,
  materiais: <FileText {...FILTRO_BAR_TAB_ICON_PROPS} />,
  provas: <CircleCheck {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

const TAB_LABEL: Record<AcademyCronogramaTab, string> = {
  cronogramas: "Cronogramas",
  trilhas: "Trilhas",
  materiais: "Materiais",
  provas: "Provas",
};

const CTA_LABEL: Record<AcademyCronogramaTab, string> = {
  cronogramas: "Novo Cronograma",
  trilhas: "Nova Trilha",
  materiais: "Novo Material",
  provas: "Nova Prova",
};

const BUSCA_PLACEHOLDER: Record<Exclude<AcademyCronogramaTab, "cronogramas">, string> = {
  trilhas: "Buscar trilha…",
  materiais: "Buscar material…",
  provas: "Buscar prova…",
};

export function CronogramaFiltroBar({
  brand,
  t,
  aba,
  onSelectAba,
  cronogramas,
  cronogramaId,
  onSelecionarCronograma,
  busca,
  onBusca,
  status,
  onStatus,
  canCriar,
  onNovoCronograma,
  onNovaTrilha,
  onNovoMaterial,
  onNovaProva,
}: Props) {
  const onCta =
    aba === "cronogramas"
      ? onNovoCronograma
      : aba === "trilhas"
        ? onNovaTrilha
        : aba === "materiais"
          ? onNovoMaterial
          : onNovaProva;

  return (
    <div style={getPageFilterBoxStyle(brand, t)}>
      <div className="app-filter-bar-tabs-cta" role="tablist" aria-label="Abas de Cronograma">
        <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
        <div
          className="app-filter-bar-tabs-cta__tabs"
          onKeyDown={(e) =>
            onFiltroBarTabsKeyDown(e, ACADEMY_CRONOGRAMA_TABS, onSelectAba, (k) => `tab-cronograma-${k}`)
          }
        >
          {ACADEMY_CRONOGRAMA_TABS.map((tab) => (
            <FiltroBarTabButton
              key={tab}
              id={`tab-cronograma-${tab}`}
              aria-controls={`panel-cronograma-${tab}`}
              active={aba === tab}
              icon={TAB_ICONS[tab]}
              onClick={() => onSelectAba(tab)}
            >
              {TAB_LABEL[tab]}
            </FiltroBarTabButton>
          ))}
        </div>
        <div className="app-filter-bar-tabs-cta__actions">
          <AjudaContextualAcoes pageKey={ACADEMY_CRONOGRAMA_PAGE_KEY} />
        </div>
      </div>

      <div className="app-filter-bar-tabs-cta" style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${t.cardBorder}` }}>
        <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
        <div className="app-filter-bar-tabs-cta__tabs">
          {aba === "cronogramas" ? (
            <FiltroBarCampoSelect
              id="filtro-cronograma-select"
              value={cronogramaId}
              onChange={onSelecionarCronograma}
              options={cronogramas.map((c) => ({ value: c.id, label: c.nome }))}
              icon={FilterBarIcons.modoVisualizacao}
              ariaLabel="Cronogramas"
              showTodasOption={cronogramas.length === 0}
              todasValue=""
              todasLabel="Nenhum cronograma"
              highlightWhenFiltered={false}
              minWidth={240}
            />
          ) : (
            <>
              <BarraPesquisaPagina
                id={`busca-cronograma-${aba}`}
                value={busca}
                onChange={onBusca}
                placeholder={BUSCA_PLACEHOLDER[aba]}
                aria-label={BUSCA_PLACEHOLDER[aba]}
                wrapperStyle={{ width: 280 }}
              />
              <FiltroBarCampoSelect
                id={`filtro-status-${aba}`}
                value={status}
                onChange={(v) => onStatus(v === "arquivado" ? "arquivado" : "publicado")}
                options={[
                  { value: "publicado", label: "Publicado" },
                  { value: "arquivado", label: "Arquivado" },
                ]}
                icon={FilterBarIcons.status}
                ariaLabel="Status"
                showTodasOption={false}
                todasValue="publicado"
                minWidth={160}
              />
            </>
          )}
        </div>
        <div className="app-filter-bar-tabs-cta__actions">
          {canCriar ? <CtaCriarButton onClick={onCta}>{CTA_LABEL[aba]}</CtaCriarButton> : null}
        </div>
      </div>
    </div>
  );
}
