import { useMemo, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { Building2, ChevronLeft, ChevronRight, LayoutList, Loader2, Network } from "lucide-react";
import { FONT } from "../../../constants/theme";
import type { RhOrgDiretoria } from "../../../types/rhOrganograma";

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

  const btnNavStyle: CSSProperties = {
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

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
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: podeEditar ? 12 : 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <button
              type="button"
              aria-label="Diretoria anterior"
              style={{
                ...btnNavStyle,
                opacity: todas || !idxValido || isPrimeiro || sorted.length === 0 ? 0.35 : 1,
                cursor: todas || !idxValido || isPrimeiro || sorted.length === 0 ? "not-allowed" : "pointer",
              }}
              onClick={irAnterior}
              disabled={todas || !idxValido || isPrimeiro || sorted.length === 0}
            >
              <ChevronLeft size={14} aria-hidden />
            </button>

            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT.body,
                minWidth: "clamp(120px, 40vw, 220px)",
                textAlign: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={!todas && idxValido ? labelCentro : undefined}
            >
              {labelCentro}
            </span>

            <button
              type="button"
              aria-label="Próxima diretoria"
              style={{
                ...btnNavStyle,
                opacity: todas || !idxValido || isUltimo || sorted.length === 0 ? 0.35 : 1,
                cursor: todas || !idxValido || isUltimo || sorted.length === 0 ? "not-allowed" : "pointer",
              }}
              onClick={irProximo}
              disabled={todas || !idxValido || isUltimo || sorted.length === 0}
            >
              <ChevronRight size={14} aria-hidden />
            </button>
          </div>

          <button
            type="button"
            aria-label={
              todas ? "Ver uma diretoria de cada vez" : "Ver todas as diretorias de uma vez"
            }
            aria-pressed={todas}
            onClick={toggleTodasDiretorias}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              minHeight: 44,
              borderRadius: 999,
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              border: todas ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
              background: todas
                ? brand.useBrand
                  ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                  : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                : "transparent",
              color: todas ? brand.accent : t.textMuted,
              fontWeight: todas ? 700 : 400,
              transition: "all 0.15s",
            }}
          >
            <Building2 size={15} aria-hidden />
            Todas as diretorias
          </button>

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

        {podeEditar ? (
          <div
            role="tablist"
            aria-label="Modo do organograma"
            style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
          >
            {tabIds.map((key) => {
              const ativo = modo === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`tab-org-${key}`}
                  tabIndex={ativo ? 0 : -1}
                  aria-selected={ativo}
                  aria-controls={`panel-org-${key}`}
                  onClick={() => setModo(key)}
                  onKeyDown={(e) => {
                    const tabs = tabIds;
                    const current = tabs.indexOf(key);
                    if (e.key === "ArrowRight") {
                      e.preventDefault();
                      const next = tabs[(current + 1) % tabs.length];
                      setModo(next);
                      requestAnimationFrame(() => {
                        document.getElementById(`tab-org-${next}`)?.focus();
                      });
                    }
                    if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      const next = tabs[(current - 1 + tabs.length) % tabs.length];
                      setModo(next);
                      requestAnimationFrame(() => {
                        document.getElementById(`tab-org-${next}`)?.focus();
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
                  {key === "visual" ? <Network size={16} aria-hidden /> : <LayoutList size={16} aria-hidden />}
                  {tabLabels[key]}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
