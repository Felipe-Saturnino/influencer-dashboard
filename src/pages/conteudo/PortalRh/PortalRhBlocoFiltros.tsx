import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, History, Search } from "lucide-react";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
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
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const mesSel = meses[idxMes];
  const carouselPrimeiro = idxMes <= 0;
  const carouselUltimo = idxMes >= meses.length - 1;

  const btnNav = {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } as const;

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
      {/* Linha 1 — carrossel de mês + Histórico */}
      <div style={{ ...LINHA_FILTRO, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            aria-label="Mês anterior"
            disabled={carouselPrimeiro || modoHistorico}
            onClick={() => onIdxMesChange((i) => Math.max(0, i - 1))}
            style={{
              ...btnNav,
              opacity: carouselPrimeiro || modoHistorico ? 0.4 : 1,
              cursor: carouselPrimeiro || modoHistorico ? "not-allowed" : "pointer",
            }}
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: t.text,
              fontFamily: FONT.body,
              minWidth: "clamp(120px, 36vw, 180px)",
              textAlign: "center",
            }}
          >
            {modoHistorico ? "Arquivados" : (mesSel?.label ?? "—")}
          </span>
          <button
            type="button"
            aria-label="Próximo mês"
            disabled={carouselUltimo || modoHistorico}
            onClick={() => onIdxMesChange((i) => Math.min(meses.length - 1, i + 1))}
            style={{
              ...btnNav,
              opacity: carouselUltimo || modoHistorico ? 0.4 : 1,
              cursor: carouselUltimo || modoHistorico ? "not-allowed" : "pointer",
            }}
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>

        <button
          type="button"
          aria-pressed={modoHistorico}
          aria-label={modoHistorico ? "Desativar modo histórico" : "Ver arquivados"}
          onClick={() => onModoHistoricoChange(!modoHistorico)}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: `1px solid ${modoHistorico ? brand.primary : t.cardBorder}`,
            background: modoHistorico
              ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)"
              : t.inputBg,
            color: modoHistorico ? brand.primary : t.textMuted,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: FONT.body,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <History size={14} aria-hidden />
          Histórico
        </button>
      </div>

      {/* Linha 2 — pesquisa */}
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          marginLeft: "auto",
          marginRight: "auto",
          marginBottom: linhaSubabas ? 12 : 0,
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

      {/* Linha 3 — sub-abas (Comunicados / Políticas) */}
      {linhaSubabas ? <div style={LINHA_FILTRO}>{linhaSubabas}</div> : null}
    </div>
  );
}
