import { useCallback, useMemo, useState } from "react";
import { FONT } from "../../../constants/theme";
import brazilMap from "../../../assets/comercial/brazil-states-paths.json";
import { UF_NOMES } from "./helpers";

type BrazilMapData = {
  viewBox: string;
  states: { sigla: string; nome: string; d: string }[];
};

const MAP = brazilMap as BrazilMapData;

type EmpresaUf = { id: string; razao: string };

type Props = {
  porUf: Map<string, { count: number; empresas: EmpresaUf[] }>;
  brandPrimary: string;
  brandAccent: string;
  t: {
    cardBorder: string;
    inputBg: string;
    textMuted: string;
    isDark?: boolean;
  };
};

export function GeoDistributionBlock({ porUf, brandPrimary, brandAccent, t }: Props) {
  const [selectedUf, setSelectedUf] = useState<string | null>(null);

  const maxCount = useMemo(() => {
    let m = 0;
    for (const v of porUf.values()) m = Math.max(m, v.count);
    return m || 1;
  }, [porUf]);

  const sortedUfs = useMemo(
    () =>
      [...porUf.entries()]
        .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
        .map(([uf]) => uf),
    [porUf],
  );

  const selectUf = useCallback((uf: string) => {
    setSelectedUf((prev) => (prev === uf ? null : uf));
  }, []);

  const panel = selectedUf ? porUf.get(selectedUf) : null;
  const panelNome = selectedUf ? UF_NOMES[selectedUf] ?? selectedUf : "";

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
          aria-label="Mapa do Brasil — empresas por estado"
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
                aria-label={`${st.nome}${count ? ` — ${count} empresas` : " — sem empresas"}`}
                onClick={() => selectUf(st.sigla)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectUf(st.sigla);
                  }
                }}
              />
            );
          })}
          <text x="16" y="838" fill="#6b7280" fontSize="10">
            Intensidade = nº de empresas
          </text>
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 400 }}>
        <div style={{ display: "flex", flexDirection: "column", maxHeight: 420 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: t.textMuted,
              padding: "0 4px 10px",
              borderBottom: `1px solid ${t.cardBorder}`,
              display: "grid",
              gridTemplateColumns: "36px 1fr 56px",
              gap: 8,
            }}
          >
            <span>UF</span>
            <span>Estado</span>
            <span style={{ textAlign: "right" }}>Empresas</span>
          </div>
          <div
            role="list"
            aria-label="Estados por volume de empresas"
            style={{ overflowY: "auto", flex: 1, maxHeight: 220, paddingTop: 4 }}
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
                Nenhuma empresa com UF cadastrada para os filtros selecionados.
              </p>
            ) : (
              sortedUfs.map((uf) => {
                const entry = porUf.get(uf)!;
                const pct = Math.round((entry.count / maxCount) * 100);
                const isSel = selectedUf === uf;
                return (
                  <div
                    key={uf}
                    role="listitem"
                    tabIndex={0}
                    onClick={() => selectUf(uf)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectUf(uf);
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
                      background: isSel
                        ? `color-mix(in srgb, ${brandAccent} 12%, ${t.inputBg})`
                        : undefined,
                      outline: isSel
                        ? `1px solid color-mix(in srgb, ${brandAccent} 35%, transparent)`
                        : undefined,
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
                      }}
                    >
                      {entry.count}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div
          aria-live="polite"
          style={{
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 10,
            background: t.inputBg,
            padding: "12px 14px",
            minHeight: 120,
            fontFamily: FONT.body,
          }}
        >
          <h4
            style={{
              margin: "0 0 8px",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: t.textMuted,
              fontFamily: FONT.body,
            }}
          >
            {panel ? (
              <>
                Empresas em{" "}
                <span style={{ color: brandPrimary, fontStyle: "normal" }}>
                  {panelNome} ({selectedUf})
                </span>
              </>
            ) : (
              "Empresas na região"
            )}
          </h4>
          {!panel ? (
            <p style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.45 }}>
              Selecione um estado no mapa ou na lista para ver as empresas cadastradas na região.
            </p>
          ) : panel.empresas.length === 0 ? (
            <p style={{ fontSize: 12, color: t.textMuted }}>Nenhuma empresa neste estado.</p>
          ) : (
            <>
              {panel.empresas.slice(0, 12).map((e) => (
                <div
                  key={e.id}
                  style={{
                    padding: "6px 0",
                    borderBottom: `1px solid color-mix(in srgb, ${t.cardBorder} 70%, transparent)`,
                    fontSize: 12,
                  }}
                >
                  {e.razao}
                </div>
              ))}
              {panel.empresas.length > 12 ? (
                <p style={{ marginTop: 8, fontSize: 11, color: t.textMuted }}>
                  Mostrando 12 de {panel.empresas.length} empresas nesta região.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
