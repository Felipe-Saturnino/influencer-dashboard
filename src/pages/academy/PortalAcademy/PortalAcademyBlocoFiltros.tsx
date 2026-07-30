import type { CSSProperties, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { FiltroHistoricoButton } from "../../../components/dashboard";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import type { MesCarrosselEntry } from "./portalAcademyCarrossel";

const LINHA_FILTRO: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  width: "100%",
};

function linhaSeparador(t: ReturnType<typeof useApp>["theme"]): CSSProperties {
  return {
    paddingTop: 12,
    marginTop: 12,
    borderTop: `1px solid ${t.cardBorder}`,
    width: "100%",
  };
}

export function PortalAcademyBlocoFiltros({
  meses,
  idxMes,
  onIdxMesChange,
  modoHistorico,
  onModoHistoricoChange,
  busca,
  onBuscaChange,
  buscaPlaceholder = PAGE_SEARCH.portalAcademy,
  buscaAriaLabel = "Pesquisar postagens por palavras-chave",
  acoesAjuda,
  linhaAbas,
  linhaSubabas,
}: {
  meses: MesCarrosselEntry[];
  idxMes: number;
  onIdxMesChange: (fn: (i: number) => number) => void;
  modoHistorico: boolean;
  onModoHistoricoChange: (ativo: boolean) => void;
  busca: string;
  onBuscaChange: (v: string) => void;
  buscaPlaceholder?: string;
  buscaAriaLabel?: string;
  acoesAjuda?: ReactNode;
  linhaAbas?: ReactNode;
  linhaSubabas?: ReactNode;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const mesSel = meses[idxMes];
  const carouselPrimeiro = idxMes <= 0;
  const carouselUltimo = idxMes >= meses.length - 1;
  const carrosselBloqueado = modoHistorico;
  const labelCarrossel = modoHistorico ? "Todo o período" : (mesSel?.label ?? "—");
  const sep = linhaSeparador(t);

  return (
    <div style={getPageFilterBoxStyle(brand, t)}>
      <div className="app-filter-bar-tabs-cta">
      <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
      <div className="app-filter-bar-tabs-cta__tabs" style={{ ...LINHA_FILTRO, width: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button
            type="button"
            aria-label="Mês anterior"
            disabled={carouselPrimeiro || carrosselBloqueado}
            onClick={() => onIdxMesChange((i) => Math.max(0, i - 1))}
            style={getCarouselBtnNavStyle(t, carouselPrimeiro || carrosselBloqueado)}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <span style={getCarouselPeriodLabelStyle(t)}>{labelCarrossel}</span>
          <button
            type="button"
            aria-label="Próximo mês"
            disabled={carouselUltimo || carrosselBloqueado}
            onClick={() => onIdxMesChange((i) => Math.min(meses.length - 1, i + 1))}
            style={getCarouselBtnNavStyle(t, carouselUltimo || carrosselBloqueado)}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
        <FiltroHistoricoButton active={modoHistorico} onClick={() => onModoHistoricoChange(!modoHistorico)} />
      </div>
      <div className="app-filter-bar-tabs-cta__actions">{acoesAjuda}</div>
      </div>

      {linhaAbas ? <div style={{ ...LINHA_FILTRO, ...sep }}>{linhaAbas}</div> : null}

      <div
        style={{
          paddingTop: 12,
          marginTop: 12,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          width: "100%",
        }}
      >
        <div style={{ flex: "1 1 200px", minWidth: 0, maxWidth: "100%" }}>
          <BarraPesquisaPagina
            value={busca}
            onChange={onBuscaChange}
            placeholder={buscaPlaceholder}
            aria-label={buscaAriaLabel}
            wrapperStyle={{ width: "100%" }}
          />
        </div>
        {linhaSubabas ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              flex: "1 1 auto",
            }}
          >
            {linhaSubabas}
          </div>
        ) : null}
      </div>
    </div>
  );
}
