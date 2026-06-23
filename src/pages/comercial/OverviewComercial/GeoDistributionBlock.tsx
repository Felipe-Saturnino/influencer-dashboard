import { useState, type CSSProperties } from "react";
import { FONT } from "../../../constants/theme";
import { groupMarcasPorCidade, type GeoUfEntry, UF_NOMES } from "./helpers";
import brazilMap from "../../../assets/comercial/brazil-states-paths.json";

type BrazilMapData = {
  viewBox: string;
  states: { sigla: string; nome: string; d: string }[];
};

const MAP = brazilMap as BrazilMapData;

const PANEL_HEADER: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "inherit",
  padding: "0 4px 10px",
  borderBottom: "1px solid var(--geo-panel-border)",
  fontFamily: FONT.body,
};

type Props = {
  porUf: Map<string, GeoUfEntry>;
  brandPrimary: string;
  brandAccent: string;
  t: {
    cardBorder: string;
    inputBg: string;
    text: string;
    textMuted: string;
    isDark?: boolean;
  };
};

export function GeoDistributionBlock({ porUf, brandPrimary, brandAccent, t }: Props) {
  const [selectedUf, setSelectedUf] = useState<string | null>(null);

  const maxCount = Math.max(1, ...[...porUf.values()].map((v) => v.count));

  const sortedUfs = [...porUf.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([uf]) => uf);

  const panel = selectedUf ? porUf.get(selectedUf) : null;
  const panelNome = selectedUf ? (UF_NOMES[selectedUf] ?? selectedUf) : "";
  const porCidade = panel ? groupMarcasPorCidade(panel.marcas) : [];

  const toggleUf = (uf: string) => {
    setSelectedUf((prev) => (prev === uf ? null : uf));
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.35fr 0.65fr",
        gap: 28,
        alignItems: "start",
        minHeight: 400,
      }}
      className="app-grid-2-tight"
    >
      <div
        style={{
          background: t.isDark
            ? `color-mix(in srgb, ${brandPrimary} 6%, transparent)`
            : "linear-gradient(165deg, #f8fafc 0%, #eef2ff 100%)",
          borderRadius: 12,
          border: `1px solid ${t.cardBorder}`,
          padding: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          viewBox={MAP.viewBox}
          preserveAspectRatio="xMidYMid meet"
          aria-label="Mapa do Brasil — marcas por estado"
          style={{ width: "100%", maxHeight: 420, display: "block" }}
        >
          {MAP.states.map((st) => {
            const data = porUf.get(st.sigla);
            const count = data?.count ?? 0;
            const opacity = count ? 0.18 + (count / maxCount) * 0.82 : 0.1;
            const isSel = selectedUf === st.sigla;
            const isDim = selectedUf != null && !isSel;
            return (
              <path
                key={st.sigla}
                d={st.d}
                fill={brandPrimary}
                fillOpacity={isDim ? 0.12 : isSel ? 1 : opacity}
                stroke={isSel ? brandAccent : "#fff"}
                strokeWidth={isSel ? 1.4 : 0.8}
                style={{ cursor: "pointer", transition: "fill-opacity 0.15s" }}
                role="button"
                tabIndex={0}
                aria-label={`${st.nome}${count ? ` — ${count} marcas` : " — sem marcas"}`}
                aria-pressed={isSel}
                onClick={() => toggleUf(st.sigla)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleUf(st.sigla);
                  }
                }}
              />
            );
          })}
          <text x="16" y="838" fill="#6b7280" fontSize="10">
            Intensidade = nº de marcas
          </text>
        </svg>
      </div>

      <div
        style={
          {
            "--geo-panel-border": t.cardBorder,
            display: "flex",
            flexDirection: "column",
            minHeight: 400,
            maxHeight: 420,
            fontFamily: FONT.body,
          } as CSSProperties
        }
      >
        {!selectedUf ? (
          <>
            <div
              style={{
                ...PANEL_HEADER,
                color: t.textMuted,
                display: "grid",
                gridTemplateColumns: "36px 1fr 56px",
                gap: 8,
              }}
            >
              <span>UF</span>
              <span>Estado</span>
              <span style={{ textAlign: "right" }}>Marcas</span>
            </div>
            <div
              role="list"
              aria-label="Estados por volume de marcas"
              style={{ overflowY: "auto", flex: 1, paddingTop: 4 }}
            >
              {sortedUfs.length === 0 ? (
                <p
                  style={{
                    padding: "16px 4px",
                    fontSize: 12,
                    color: t.textMuted,
                    fontFamily: FONT.body,
                  }}
                >
                  Nenhuma marca com UF cadastrada para os filtros selecionados.
                </p>
              ) : (
                sortedUfs.map((uf) => {
                  const entry = porUf.get(uf)!;
                  const pct = Math.round((entry.count / maxCount) * 100);
                  return (
                    <div
                      key={uf}
                      role="listitem"
                      tabIndex={0}
                      onClick={() => toggleUf(uf)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleUf(uf);
                        }
                      }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "36px 1fr 56px",
                        gap: 8,
                        alignItems: "center",
                        padding: "7px 4px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: FONT.body,
                      }}
                    >
                      <span style={{ fontWeight: 800, color: brandPrimary }}>{uf}</span>
                      <span>
                        <span style={{ color: t.textMuted, fontSize: 11 }}>
                          {UF_NOMES[uf] ?? uf}
                        </span>
                        <div
                          style={{
                            height: 4,
                            background: t.inputBg,
                            borderRadius: 999,
                            overflow: "hidden",
                            marginTop: 2,
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              borderRadius: 999,
                              background: `linear-gradient(90deg, ${brandPrimary}, ${brandAccent})`,
                            }}
                          />
                        </div>
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          textAlign: "right",
                          color: t.text,
                        }}
                      >
                        {entry.count}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                ...PANEL_HEADER,
                color: t.textMuted,
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span>
                Cidade —{" "}
                <span style={{ color: brandPrimary, textTransform: "none", letterSpacing: 0 }}>
                  {panelNome} ({selectedUf})
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedUf(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  color: brandAccent,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Todos estados
              </button>
            </div>
            <div
              aria-live="polite"
              aria-label={`Marcas por cidade em ${panelNome}`}
              style={{ overflowY: "auto", flex: 1, paddingTop: 8 }}
            >
              {!panel || panel.marcas.length === 0 ? (
                <p style={{ padding: "8px 4px", fontSize: 12, color: t.textMuted }}>
                  Nenhuma marca neste estado.
                </p>
              ) : (
                porCidade.map(({ cidade, marcas }) => (
                  <div
                    key={cidade}
                    style={{
                      marginBottom: 14,
                      paddingBottom: 12,
                      borderBottom: `1px solid color-mix(in srgb, ${t.cardBorder} 80%, transparent)`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        color: t.text,
                        marginBottom: 6,
                        padding: "0 4px",
                      }}
                    >
                      <span>{cidade}</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: t.textMuted,
                        }}
                      >
                        {marcas.length}
                      </span>
                    </div>
                    <ul
                      style={{
                        listStyle: "none",
                        margin: 0,
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      {marcas.map((m) => (
                        <li
                          key={m.id}
                          style={{
                            fontSize: 12,
                            padding: "4px 4px 4px 12px",
                            color: t.text,
                            borderLeft: `2px solid color-mix(in srgb, ${brandAccent} 35%, transparent)`,
                          }}
                        >
                          <strong>{m.nome}</strong>
                          <span style={{ color: t.textMuted }}> · {m.empresa}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
