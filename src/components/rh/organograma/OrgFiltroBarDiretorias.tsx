import { useMemo, type Dispatch, type SetStateAction } from "react";
import { ChevronLeft, ChevronRight, LayoutList, Loader2, Network } from "lucide-react";
import { FiltroBarTabButton } from "../../dashboard/FiltroBarTabButton";
import { FILTRO_BAR_TAB_ICON_SIZE, handleFiltroBarTabsArrowKeyDown } from "../../../lib/filterBarStyles";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { FiltroBarPillButton } from "../../dashboard/FiltroBarPillButton";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import type { RhOrgDiretoria } from "../../../types/rhOrganograma";
import { AjudaContextualAcoes } from "../../AjudaContextualAcoes";

const TODAS_KEY = "todas" as const;

export type FiltroDiretoriaOrganograma = typeof TODAS_KEY | string;

export const ORG_FILTRO_TODAS_DIRETORIAS = TODAS_KEY;

type Theme = { text: string; textMuted: string; cardBorder: string; inputBg: string; cardBg?: string };

type BrandBar = { blockBg: string; accent: string; useBrand: boolean };

type ModoOrganograma = "visual" | "gerenciar";

export function OrgFiltroBarDiretorias({
  diretorias,
  filtroDiretoriaId,
  onFiltroChange,
  t,
  brand,
  loading,
  podeEditar,
  modo,
  setModo,
}: {
  diretorias: RhOrgDiretoria[];
  filtroDiretoriaId: FiltroDiretoriaOrganograma;
  onFiltroChange: (id: FiltroDiretoriaOrganograma) => void;
  t: Theme;
  brand: BrandBar;
  loading?: boolean;
  podeEditar: boolean;
  modo: ModoOrganograma;
  setModo: Dispatch<SetStateAction<ModoOrganograma>>;
}) {
  const sorted = useMemo(
    () => [...diretorias].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [diretorias],
  );

  const todas = filtroDiretoriaId === ORG_FILTRO_TODAS_DIRETORIAS;
  const idxAtual = useMemo(() => {
    if (todas) return -1;
    const i = sorted.findIndex((d) => d.id === filtroDiretoriaId);
    return i;
  }, [filtroDiretoriaId, sorted, todas]);

  const idxValido = idxAtual >= 0;
  const isPrimeiro = !todas && idxValido && idxAtual === 0;
  const isUltimo = !todas && idxValido && sorted.length > 0 && idxAtual >= sorted.length - 1;

  const irAnterior = () => {
    if (todas || !idxValido || sorted.length === 0) return;
    const i = Math.max(0, idxAtual - 1);
    onFiltroChange(sorted[i].id);
  };

  const irProximo = () => {
    if (todas || !idxValido || sorted.length === 0) return;
    const i = Math.min(sorted.length - 1, idxAtual + 1);
    onFiltroChange(sorted[i].id);
  };

  const toggleTodasDiretorias = () => {
    if (todas) {
      const first = sorted[0];
      onFiltroChange(first?.id ?? ORG_FILTRO_TODAS_DIRETORIAS);
      return;
    }
    onFiltroChange(ORG_FILTRO_TODAS_DIRETORIAS);
  };

  const labelCentro = todas
    ? "Todas as diretorias"
    : sorted.length === 0
      ? "—"
      : idxValido
        ? sorted[idxAtual]!.nome
        : "—";

  const tabIds: ModoOrganograma[] = ["visual", "gerenciar"];
  const tabLabels: Record<ModoOrganograma, string> = {
    visual: "Visualização",
    gerenciar: "Gerenciamento",
  };
  const tabsVisiveis: ModoOrganograma[] = podeEditar ? tabIds : [];
  const navPrevDisabled = todas || !idxValido || isPrimeiro || sorted.length === 0;
  const navNextDisabled = todas || !idxValido || isUltimo || sorted.length === 0;

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${t.cardBorder}`,
          background: brand.blockBg,
          padding: "12px 20px",
        }}
      >
        <div className="app-filter-bar-tabs-cta" style={{ marginBottom: podeEditar ? 12 : 0 }}>
          <span className="app-filter-bar-tabs-cta__spacer" aria-hidden="true" />
          <div className="app-filter-bar-tabs-cta__tabs">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <button
              type="button"
              aria-label="Diretoria anterior"
              aria-disabled={navPrevDisabled}
              style={getCarouselBtnNavStyle(t, navPrevDisabled)}
              onClick={irAnterior}
              disabled={navPrevDisabled}
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
              aria-label="Próxima diretoria"
              aria-disabled={navNextDisabled}
              style={getCarouselBtnNavStyle(t, navNextDisabled)}
              onClick={irProximo}
              disabled={navNextDisabled}
            >
              <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
            </button>
            </div>

            <FiltroBarPillButton
              active={todas}
              onClick={toggleTodasDiretorias}
              icon={FilterBarIcons.diretoria}
              aria-label={
                todas ? "Ver uma diretoria de cada vez" : "Ver todas as diretorias de uma vez"
              }
            >
              Todas as diretorias
            </FiltroBarPillButton>

            {loading ? (
              <span
                style={{
                  fontSize: 12,
                  color: t.textMuted,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
                aria-live="polite"
              >
                <Loader2 size={14} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                Carregando…
              </span>
            ) : null}
          </div>
          <div className="app-filter-bar-tabs-cta__actions">
            <AjudaContextualAcoes pageKey="rh_organograma" />
          </div>
        </div>

        {podeEditar ? (
          <div
            role="tablist"
            aria-label="Modo de visualização do organograma"
            onKeyDown={(e) => {
              if (tabsVisiveis.length < 2) return;
              const el = e.target as HTMLElement;
              if (el.getAttribute("role") !== "tab") return;
              const currentKey = tabsVisiveis.find((k) => `tab-org-${k}` === el.id);
              if (!currentKey) return;
              handleFiltroBarTabsArrowKeyDown(e, tabsVisiveis, currentKey, setModo, "tab-org-");
            }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}
          >
            {tabsVisiveis.map((key) => (
              <FiltroBarTabButton
                key={key}
                id={`tab-org-${key}`}
                active={modo === key}
                aria-controls={`panel-org-${key}`}
                onClick={() => setModo(key)}
                icon={
                  key === "visual" ? (
                    <Network size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <LayoutList size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />
                  )
                }
              >
                {tabLabels[key]}
              </FiltroBarTabButton>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
