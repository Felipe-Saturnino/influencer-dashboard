import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import type { MesCarrosselEscalaEntry } from "../../../lib/escalaMesCarrosselOverviewStyle";

interface MesCarrosselPeriodoProps {
  mesesDisponiveis: MesCarrosselEscalaEntry[];
  idxMes: number;
  onIdxMesChange: (i: number) => void;
  t: Theme;
  brand: { blockBg: string; cardBorder: string };
}

/**
 * Navegação de mês no mesmo padrão visual do Overview Spin (setas + rótulo central),
 * com lista de meses gerida pelo pai (`getMesesDisponiveisEscalaCarrossel`).
 */
export function MesCarrosselPeriodo({ mesesDisponiveis, idxMes, onIdxMesChange, t, brand }: MesCarrosselPeriodoProps) {
  const mesSelecionado = mesesDisponiveis[idxMes];
  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes >= mesesDisponiveis.length - 1;

  const btnNav: CSSProperties = {
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
  };

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        background: brand.blockBg,
        padding: "12px 20px",
        flex: "1 1 280px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          aria-label="Mês anterior"
          style={{
            ...btnNav,
            opacity: isPrimeiro ? 0.35 : 1,
            cursor: isPrimeiro ? "not-allowed" : "pointer",
          }}
          onClick={() => onIdxMesChange(Math.max(0, idxMes - 1))}
          disabled={isPrimeiro}
        >
          <ChevronLeft size={14} aria-hidden="true" />
        </button>
        <span
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: t.text,
            fontFamily: FONT.body,
            minWidth: "min(100%, 180px)",
            textAlign: "center",
          }}
        >
          {mesSelecionado?.label ?? "—"}
        </span>
        <button
          type="button"
          aria-label="Próximo mês"
          style={{
            ...btnNav,
            opacity: isUltimo ? 0.35 : 1,
            cursor: isUltimo ? "not-allowed" : "pointer",
          }}
          onClick={() => onIdxMesChange(Math.min(mesesDisponiveis.length - 1, idxMes + 1))}
          disabled={isUltimo}
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
