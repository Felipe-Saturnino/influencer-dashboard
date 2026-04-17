import { useCallback, useRef, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FONT } from "../../../constants/theme";
import type { RhOrgDiretoria } from "../../../types/rhOrganograma";

type Theme = { text: string; textMuted: string; cardBorder: string; inputBg: string };

const TODAS_KEY = "todas" as const;

export type FiltroDiretoriaOrganograma = typeof TODAS_KEY | string;

export function OrgCarouselDiretorias({
  diretorias,
  selecionado,
  onSelecionar,
  t,
  blockBg,
  useBrand,
}: {
  diretorias: RhOrgDiretoria[];
  selecionado: FiltroDiretoriaOrganograma;
  onSelecionar: (id: FiltroDiretoriaOrganograma) => void;
  t: Theme;
  blockBg: string;
  useBrand: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  const pillBase = (ativo: boolean): CSSProperties => ({
    flex: "0 0 auto",
    padding: "10px 16px",
    borderRadius: 999,
    border: `1px solid ${ativo ? "var(--brand-action, #7c3aed)" : t.cardBorder}`,
    background: ativo ? "color-mix(in srgb, var(--brand-action, #7c3aed) 14%, transparent)" : t.inputBg,
    color: t.text,
    cursor: "pointer",
    fontFamily: FONT.body,
    fontSize: 13,
    fontWeight: ativo ? 800 : 500,
    whiteSpace: "nowrap",
    maxWidth: 260,
    overflow: "hidden",
    textOverflow: "ellipsis",
  });

  const btnNav: CSSProperties = {
    flex: "0 0 auto",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    cursor: "pointer",
  };

  const sorted = [...diretorias].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        background: useBrand ? blockBg : t.inputBg,
        padding: "12px 14px",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" aria-label="Rolar carrossel para a esquerda" onClick={() => scrollBy(-200)} style={btnNav}>
          <ChevronLeft size={18} aria-hidden />
        </button>
        <div
          ref={scrollerRef}
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            overflowX: "auto",
            scrollSnapType: "x proximity",
            paddingBottom: 4,
            scrollbarWidth: "thin",
          }}
        >
          <button
            type="button"
            style={{ ...pillBase(selecionado === TODAS_KEY), scrollSnapAlign: "start" }}
            onClick={() => onSelecionar(TODAS_KEY)}
          >
            Todas as diretorias
          </button>
          {sorted.map((d) => (
            <button
              key={d.id}
              type="button"
              title={d.nome}
              style={{ ...pillBase(selecionado === d.id), scrollSnapAlign: "start" }}
              onClick={() => onSelecionar(d.id)}
            >
              {d.nome}
            </button>
          ))}
        </div>
        <button type="button" aria-label="Rolar carrossel para a direita" onClick={() => scrollBy(200)} style={btnNav}>
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export const ORG_FILTRO_TODAS_DIRETORIAS = TODAS_KEY;
