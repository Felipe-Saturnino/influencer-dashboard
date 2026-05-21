import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { FiltroHistoricoButton } from "../../../components/dashboard";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FONT } from "../../../constants/theme";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import type { MesCarrosselEntry } from "./portalRhCarrossel";

const LINHA_FILTRO: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  width: "100%",
};

export function PortalRhBlocoFiltros({
  meses,
  idxMes,
  onIdxMesChange,
  modoHistorico,
  onModoHistoricoChange,
  busca,
  onBuscaChange,
  buscaPlaceholder = "Pesquisar por assunto ou descrição",
  buscaAriaLabel = "Pesquisar por assunto ou descrição",
  linhaSubabas,
  linhaAposSubabas,
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
  linhaSubabas?: ReactNode;
  /** Ex.: botão Criar no Gerenciamento — centralizado após a linha de filtros. */
  linhaAposSubabas?: ReactNode;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const mesSel = meses[idxMes];
  const carouselPrimeiro = idxMes <= 0;
  const carouselUltimo = idxMes >= meses.length - 1;
  const carrosselBloqueado = modoHistorico;
  const labelCarrossel = modoHistorico ? "Todo o período" : (mesSel?.label ?? "—");

  return (
    <div
      style={{
        borderRadius: 14,
        border: brand.primaryTransparentBorder,
        background: brand.primaryTransparentBg,
        padding: "14px 18px",
        marginBottom: 16,
      }}
    >
      {/* Linha 1 — carrossel de mês + Histórico (data de publicação) */}
      <div style={{ ...LINHA_FILTRO, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
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

        <FiltroHistoricoButton
          active={modoHistorico}
          onClick={() => onModoHistoricoChange(!modoHistorico)}
        />
      </div>

      {/* Linha 2 — pesquisa */}
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          marginLeft: "auto",
          marginRight: "auto",
          marginBottom: linhaSubabas || linhaAposSubabas ? 12 : 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            padding: "8px 12px",
            width: "100%",
          }}
        >
          <Search size={16} color={t.textMuted} aria-hidden style={{ flexShrink: 0 }} />
          <input
            type="search"
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder={buscaPlaceholder}
            aria-label={buscaAriaLabel}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              color: t.text,
              fontSize: 13,
              outline: "none",
              fontFamily: FONT.body,
              minWidth: 0,
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Linha 3 — filtros extras (categorias ou tipo/status) */}
      {linhaSubabas ? <div style={{ ...LINHA_FILTRO, marginBottom: linhaAposSubabas ? 12 : 0 }}>{linhaSubabas}</div> : null}

      {/* Linha 4 — ação (ex.: Criar no Gerenciamento) */}
      {linhaAposSubabas ? <div style={LINHA_FILTRO}>{linhaAposSubabas}</div> : null}
    </div>
  );
}
