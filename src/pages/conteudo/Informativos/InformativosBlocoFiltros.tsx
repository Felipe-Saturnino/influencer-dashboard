import type { CSSProperties, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { FiltroHistoricoButton } from "../../../components/dashboard";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import type { MesCarrosselEntry } from "../PortalRh/portalRhCarrossel";

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

export function InformativosBlocoFiltros({
  meses,
  idxMes,
  onIdxMesChange,
  modoHistorico,
  onModoHistoricoChange,
  busca,
  onBuscaChange,
  linhaAbas,
  linhaAposSubabas,
  filtroStatusGerenciamento,
}: {
  meses: MesCarrosselEntry[];
  idxMes: number;
  onIdxMesChange: (fn: (i: number) => number) => void;
  modoHistorico: boolean;
  onModoHistoricoChange: (ativo: boolean) => void;
  busca: string;
  onBuscaChange: (v: string) => void;
  linhaAbas?: ReactNode;
  linhaAposSubabas?: ReactNode;
  filtroStatusGerenciamento?: ReactNode;
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
      <div className="app-marketplace-filtro-minhas">
        <span className="app-marketplace-filtro-minhas__spacer" aria-hidden="true" />
        <div className="app-marketplace-filtro-minhas__centro" style={LINHA_FILTRO}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <button
              type="button"
              aria-label="Mês anterior"
              disabled={carrosselBloqueado || carouselPrimeiro}
              onClick={() => onIdxMesChange((i) => Math.max(0, i - 1))}
              style={getCarouselBtnNavStyle(t, carrosselBloqueado || carouselPrimeiro)}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span style={getCarouselPeriodLabelStyle(t)}>{labelCarrossel}</span>
            <button
              type="button"
              aria-label="Próximo mês"
              disabled={carrosselBloqueado || carouselUltimo}
              onClick={() => onIdxMesChange((i) => Math.min(meses.length - 1, i + 1))}
              style={getCarouselBtnNavStyle(t, carrosselBloqueado || carouselUltimo)}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
          <FiltroHistoricoButton active={modoHistorico} onClick={() => onModoHistoricoChange(!modoHistorico)} />
        </div>
        <div className="app-marketplace-filtro-minhas__cta">
          <AjudaContextualAcoes pageKey="informativos" />
        </div>
      </div>

      {linhaAbas ? (
        <>
          <div style={sep} />
          <div style={LINHA_FILTRO}>{linhaAbas}</div>
        </>
      ) : null}

      <div style={sep} />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          width: "100%",
        }}
      >
        <BarraPesquisaPagina
          value={busca}
          onChange={onBuscaChange}
          placeholder={PAGE_SEARCH.informativos}
          aria-label="Buscar informativos por palavras-chave"
          wrapperStyle={{ flex: "1 1 220px", minWidth: 200, maxWidth: 480 }}
        />
        {filtroStatusGerenciamento}
        {linhaAposSubabas ? (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", flexShrink: 0 }}>
            {linhaAposSubabas}
          </div>
        ) : null}
      </div>
    </div>
  );
}
