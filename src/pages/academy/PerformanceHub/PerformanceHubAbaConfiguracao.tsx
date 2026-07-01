import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import type { PerformanceHubScoringConfig } from "../../../lib/academyPerformanceHubTypes";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { CtaCriarButton, SectionTitle } from "../../../components/dashboard";

type Props = {
  config: PerformanceHubScoringConfig;
  onChange: (next: PerformanceHubScoringConfig) => void;
  onSalvar: () => void;
};

export function PerformanceHubAbaConfiguracao({ config, onChange, onSalvar }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const pageBox = getPageContentBoxStyle(brand, t);
  const [salvando, setSalvando] = useState(false);

  function updatePesoDimensao(key: keyof PerformanceHubScoringConfig, value: string) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    onChange({
      ...config,
      [key]: {
        ...config[key],
        pesoDimensao: parsed,
      },
    });
  }

  function updatePesoCriterio(
    key: keyof PerformanceHubScoringConfig,
    criterioSlug: string,
    value: string,
  ) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    onChange({
      ...config,
      [key]: {
        ...config[key],
        criterios: config[key].criterios.map((c) => (c.slug === criterioSlug ? { ...c, peso: parsed } : c)),
      },
    });
  }

  async function handleSalvar() {
    setSalvando(true);
    onSalvar();
    window.setTimeout(() => setSalvando(false), 500);
  }

  return (
    <div style={pageBox}>
      <SectionTitle sub="Escala 0–10 · alterações aplicam-se a novas avaliações">
        Configuração de Pesos
      </SectionTitle>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {(Object.keys(config) as (keyof PerformanceHubScoringConfig)[]).map((dimKey) => {
          const dim = config[dimKey];
          return (
            <section
              key={dimKey}
              style={{
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.06em", color: brand.primary }}>
                  {dim.label}
                </h3>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: t.textMuted }}>
                  Peso da dimensão
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={dim.pesoDimensao}
                    onChange={(e) => updatePesoDimensao(dimKey, e.target.value)}
                    style={inputStyle(t)}
                    aria-label={`Peso da dimensão ${dim.label}`}
                  />
                </label>
              </div>

              <div className="app-table-wrap" style={{ borderRadius: 12, border: `1px solid ${t.cardBorder}` }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <caption style={{ display: "none" }}>Pesos de critérios da dimensão {dim.label}</caption>
                  <thead>
                    <tr>
                      <th scope="col" style={thStyle(t)}>Critério</th>
                      <th scope="col" style={thStyle(t)}>Peso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dim.criterios.map((criterio, idx) => (
                      <tr key={criterio.slug} style={{ background: idx % 2 ? "color-mix(in srgb, var(--brand-secondary, #1e36f8) 8%, transparent)" : t.cardBg }}>
                        <td style={tdStyle(t)}>
                          {criterio.label}
                          {criterio.mesaTipo ? (
                            <span style={{ marginLeft: 8, color: t.textMuted, fontSize: 11 }}>({criterio.mesaTipo})</span>
                          ) : null}
                        </td>
                        <td style={{ ...tdStyle(t), textAlign: "center" }}>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            value={criterio.peso}
                            onChange={(e) => updatePesoCriterio(dimKey, criterio.slug, e.target.value)}
                            style={inputStyle(t)}
                            aria-label={`Peso do critério ${criterio.label}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <CtaCriarButton type="button" onClick={() => void handleSalvar()} loading={salvando} loadingLabel="Salvando…">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Save size={14} aria-hidden />
            Salvar
          </span>
        </CtaCriarButton>
      </div>

      {salvando ? (
        <div style={{ marginTop: 10, color: t.textMuted, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Loader2 size={12} className="app-lucide-spin" aria-hidden />
          Salvando…
        </div>
      ) : null}
    </div>
  );
}

function inputStyle(t: ReturnType<typeof useApp>["theme"]) {
  return {
    width: 84,
    padding: "8px 10px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.cardBg,
    color: t.text,
    fontSize: 12,
    fontFamily: FONT.body,
    textAlign: "center" as const,
  };
}

function thStyle(t: ReturnType<typeof useApp>["theme"]) {
  return {
    textAlign: "center" as const,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: t.textMuted,
    padding: "10px 12px",
    borderBottom: `1px solid ${t.cardBorder}`,
    background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)",
  };
}

function tdStyle(t: ReturnType<typeof useApp>["theme"]) {
  return {
    fontSize: 13,
    color: t.text,
    fontFamily: FONT.body,
    padding: "10px 12px",
    borderBottom: `1px solid ${t.cardBorder}`,
  };
}
