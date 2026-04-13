import { useState } from "react";
import { Search, ChevronRight, X } from "lucide-react";
import { BRAND_SEMANTIC, FONT, FONT_TITLE, type Theme } from "../../../constants/theme";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { GLOSSARIO_CATEGORIAS, type GlossarioCategoria } from "./glossarioData";

type DashboardBrand = ReturnType<typeof useDashboardBrand>;

function GlossarioCategCard({
  cat,
  dark,
  t,
}: {
  cat: GlossarioCategoria;
  dark: boolean;
  t: Theme;
}) {
  const [aberta, setAberta] = useState(true);

  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          borderBottom: aberta ? `1px solid ${t.cardBorder}` : "none",
          transition: "background 0.15s",
        }}
      >
        <div
          style={{
            width: 3,
            height: 16,
            borderRadius: 2,
            background: cat.accentColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: FONT_TITLE,
            fontSize: 12,
            fontWeight: 700,
            color: t.text,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            flex: 1,
            textAlign: "left",
          }}
        >
          {cat.label}
        </span>
        <span
          style={{
            fontSize: 11,
            color: t.textMuted,
            fontFamily: FONT.body,
            marginRight: 8,
          }}
        >
          {cat.termos.length} {cat.termos.length === 1 ? "termo" : "termos"}
        </span>
        <ChevronRight
          size={14}
          color={t.textMuted}
          aria-hidden="true"
          style={{
            transform: aberta ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />
      </button>

      {aberta && (
        <div>
          {cat.termos.map((termo, i) => (
            <div
              key={`${cat.key}-${termo.termo}-${i}`}
              style={{
                padding: "16px 20px",
                borderBottom: i < cat.termos.length - 1 ? `1px solid ${t.cardBorder}` : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: FONT.body,
                    fontSize: 14,
                    fontWeight: 700,
                    color: t.text,
                  }}
                >
                  {termo.termo}
                </span>
                {termo.referencia && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: cat.accentColor,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontFamily: FONT.body,
                      opacity: 0.85,
                    }}
                  >
                    {termo.referencia}
                  </span>
                )}
              </div>

              <p
                style={{
                  fontFamily: FONT.body,
                  fontSize: 13,
                  color: t.text,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {termo.definicao}
              </p>

              {termo.formula && (
                <code
                  style={{
                    display: "block",
                    marginTop: 8,
                    padding: "6px 12px",
                    background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace",
                    color: cat.accentColor,
                    border: `1px solid ${cat.accentColor}28`,
                  }}
                >
                  {termo.formula}
                </code>
              )}

              {termo.nota && (
                <p
                  style={{
                    fontFamily: FONT.body,
                    fontSize: 12,
                    color: t.textMuted,
                    lineHeight: 1.55,
                    margin: "8px 0 0",
                  }}
                >
                  {termo.nota}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AbaGlossario({
  dark,
  t,
  brand,
}: {
  dark: boolean;
  t: Theme;
  brand: DashboardBrand;
}) {
  const [busca, setBusca] = useState("");
  const q = busca.trim().toLowerCase();

  const categoriasFiltradas = q
    ? GLOSSARIO_CATEGORIAS.map((cat) => ({
        ...cat,
        termos: cat.termos.filter(
          (termo) =>
            termo.termo.toLowerCase().includes(q) ||
            termo.definicao.toLowerCase().includes(q) ||
            (termo.nota ?? "").toLowerCase().includes(q) ||
            (termo.formula ?? "").toLowerCase().includes(q),
        ),
      })).filter((cat) => cat.termos.length > 0)
    : GLOSSARIO_CATEGORIAS;

  const totalTermos = GLOSSARIO_CATEGORIAS.reduce((sum, cat) => sum + cat.termos.length, 0);
  const resultadosCount = categoriasFiltradas.reduce((sum, cat) => sum + cat.termos.length, 0);

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search
          size={14}
          color={t.textMuted}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={`Buscar entre ${totalTermos} termos e métricas...`}
          aria-label="Buscar no glossário"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 14px 10px 38px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontSize: 14,
            fontFamily: FONT.body,
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = brand.useBrand ? "var(--brand-primary)" : BRAND_SEMANTIC.roxoVivo;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = t.cardBorder;
          }}
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca("")}
            aria-label="Limpar busca"
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: t.textMuted,
              display: "flex",
              padding: 2,
            }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {busca.trim() && (
        <p style={{ fontFamily: FONT.body, fontSize: 12, color: t.textMuted, marginBottom: 16 }}>
          {resultadosCount} resultado(s) para &quot;{busca.trim()}&quot;
        </p>
      )}

      {categoriasFiltradas.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            color: t.textMuted,
            fontFamily: FONT.body,
          }}
        >
          Nenhum termo encontrado para &quot;{busca.trim()}&quot;.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {categoriasFiltradas.map((cat) => (
            <GlossarioCategCard key={cat.key} cat={cat} dark={dark} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
