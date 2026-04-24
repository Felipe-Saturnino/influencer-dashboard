import type { Dispatch, SetStateAction } from "react";
import { Briefcase, ClipboardList, SlidersHorizontal } from "lucide-react";
import { FONT } from "../../../constants/theme";
import type { RhVagasAba } from "../../../types/rhVaga";

type Theme = { text: string; textMuted: string; cardBorder: string; inputBg?: string; cardBg?: string };
type BrandBar = { blockBg: string; accent: string; useBrand: boolean };

const TAB_IDS: RhVagasAba[] = ["abertas", "em_andamento", "gerenciamento"];
const TAB_LABELS: Record<RhVagasAba, string> = {
  abertas: "Vagas Abertas",
  em_andamento: "Vagas em Andamento",
  gerenciamento: "Gerenciamento de Vagas",
};

/** Bloco de abas no estilo do filtro do Organograma (sem carrossel de diretorias). */
export function RhVagasFiltroBar({
  aba,
  setAba,
  mostrarGerenciamento,
  t,
  brand,
}: {
  aba: RhVagasAba;
  setAba: Dispatch<SetStateAction<RhVagasAba>>;
  mostrarGerenciamento: boolean;
  t: Theme;
  brand: BrandBar;
}) {
  const tabs = mostrarGerenciamento ? TAB_IDS : (["abertas", "em_andamento"] as const);

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
        <div
          role="tablist"
          aria-label="Seções de vagas"
          style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
        >
          {tabs.map((key) => {
            const ativo = aba === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`tab-rh-vagas-${key}`}
                tabIndex={ativo ? 0 : -1}
                aria-selected={ativo}
                aria-controls={`panel-rh-vagas-${key}`}
                onClick={() => setAba(key)}
                onKeyDown={(e) => {
                  const list = [...tabs];
                  const current = list.indexOf(key);
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    const next = list[(current + 1) % list.length]!;
                    setAba(next);
                    requestAnimationFrame(() => {
                      document.getElementById(`tab-rh-vagas-${next}`)?.focus();
                    });
                  }
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next = list[(current - 1 + list.length) % list.length]!;
                    setAba(next);
                    requestAnimationFrame(() => {
                      document.getElementById(`tab-rh-vagas-${next}`)?.focus();
                    });
                  }
                }}
                style={{
                  padding: "10px 18px",
                  minHeight: 44,
                  borderRadius: 10,
                  border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                  background: ativo
                    ? brand.useBrand
                      ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                      : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                    : (t.inputBg ?? t.cardBg ?? "transparent"),
                  color: ativo ? brand.accent : t.textMuted,
                  fontWeight: ativo ? 700 : 500,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {key === "abertas" ? <Briefcase size={16} aria-hidden /> : null}
                {key === "em_andamento" ? <ClipboardList size={16} aria-hidden /> : null}
                {key === "gerenciamento" ? <SlidersHorizontal size={16} aria-hidden /> : null}
                {TAB_LABELS[key]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
