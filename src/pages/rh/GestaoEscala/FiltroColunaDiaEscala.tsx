import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Filter } from "lucide-react";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { BarraPesquisaFiltroPainel } from "../../../components/BarraPesquisaFiltroPainel";
import { textoContemBusca } from "../../../lib/searchText";
import { placeholderPesquisaFiltro } from "../../../lib/searchBarConstants";

type Props = {
  t: Theme;
  diaLabel: string;
  /** Valores únicos presentes na coluna (rótulos de exibição). */
  opcoes: string[];
  /** `null` = sem filtro (todos). */
  selecionados: string[] | null;
  onChange: (next: string[] | null) => void;
};

type Coords = { top: number; left: number };

const Z_TOOLTIP = 5200;

/**
 * Filtro estilo Excel no cabeçalho de uma coluna de dia da Escala Diária:
 * checklist de valores da coluna; filtro ativo destaca o ícone.
 */
export function FiltroColunaDiaEscala({ t, diaLabel, opcoes, selecionados, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [busca, setBusca] = useState("");
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const ativo = selecionados != null;
  const opcoesFiltradas = useMemo(
    () => opcoes.filter((o) => textoContemBusca(o, busca)),
    [opcoes, busca],
  );

  const setAll = (checked: boolean) => {
    if (checked) {
      onChange(null);
      return;
    }
    onChange([]);
  };

  const toggleValor = (valor: string) => {
    const base = selecionados == null ? [...opcoes] : [...selecionados];
    const idx = base.indexOf(valor);
    if (idx >= 0) base.splice(idx, 1);
    else base.push(valor);
    if (base.length === opcoes.length && opcoes.every((o) => base.includes(o))) {
      onChange(null);
      return;
    }
    onChange(base);
  };

  const isChecked = (valor: string) =>
    selecionados == null ? true : selecionados.includes(valor);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const panelW = 220;
    let left = rect.right - panelW;
    if (left < 8) left = 8;
    if (left + panelW > window.innerWidth - 8) left = window.innerWidth - panelW - 8;
    setCoords({ top: rect.bottom + 4, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const tEl = e.target as Node;
      if (anchorRef.current?.contains(tEl)) return;
      if (panelRef.current?.contains(tEl)) return;
      setOpen(false);
      setBusca("");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setBusca("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const accent = "var(--brand-primary, #7c3aed)";
  const panel =
    open && coords ? (
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label={`Filtrar coluna do dia ${diaLabel}`}
        style={{
          position: "fixed",
          top: coords.top,
          left: coords.left,
          width: 220,
          maxHeight: 320,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 10,
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          background: t.isDark ? "#1a1625" : "#ffffff",
          boxShadow: t.isDark
            ? "0 12px 32px rgba(0,0,0,0.55)"
            : "0 12px 28px rgba(17,24,39,0.18)",
          zIndex: Z_TOOLTIP,
          fontFamily: FONT.body,
          fontSize: 12,
          color: t.text,
        }}
      >
        {opcoes.length > 5 ? (
          <BarraPesquisaFiltroPainel
            value={busca}
            onChange={setBusca}
            placeholder={placeholderPesquisaFiltro("valor")}
            aria-label="Pesquisar valor da coluna"
          />
        ) : null}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontWeight: 700,
            borderBottom: `1px solid ${t.cardBorder}`,
            paddingBottom: 6,
          }}
        >
          <input
            type="checkbox"
            checked={selecionados == null}
            onChange={(e) => setAll(e.target.checked)}
            aria-label="Selecionar todos os valores"
          />
          (Selecionar tudo)
        </label>
        <div style={{ overflowY: "auto", maxHeight: 220, display: "flex", flexDirection: "column", gap: 4 }}>
          {opcoesFiltradas.length === 0 ? (
            <div style={{ color: t.textMuted, padding: "6px 0" }}>Nenhum valor.</div>
          ) : (
            opcoesFiltradas.map((o) => (
              <label
                key={o}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  padding: "2px 0",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked(o)}
                  onChange={() => toggleValor(o)}
                  aria-label={`Filtrar ${o}`}
                />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {o}
                </span>
              </label>
            ))
          )}
        </div>
        {ativo ? (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
              setBusca("");
            }}
            style={{
              alignSelf: "flex-end",
              border: "none",
              background: "transparent",
              color: accent,
              fontFamily: FONT.body,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              padding: "4px 0",
            }}
          >
            Limpar filtro
          </button>
        ) : null}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={`Filtrar dia ${diaLabel}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={ativo ? "Filtro ativo nesta coluna" : "Filtrar valores desta coluna"}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          padding: 0,
          marginTop: 2,
          border: "none",
          borderRadius: 4,
          background: ativo
            ? `color-mix(in srgb, ${accent} 18%, transparent)`
            : "transparent",
          color: ativo ? accent : t.textMuted,
          cursor: "pointer",
        }}
      >
        <Filter size={11} strokeWidth={2.5} aria-hidden="true" />
      </button>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
