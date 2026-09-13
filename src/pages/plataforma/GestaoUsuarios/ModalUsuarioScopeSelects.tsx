import { useMemo, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { BarraPesquisaFiltroPainel } from "../../../components/BarraPesquisaFiltroPainel";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { MODAL_SCROLL_FOCUS_SAFE_PAD } from "../../../components/OperacoesModal";
import { placeholderPesquisaFiltro } from "../../../lib/searchBarConstants";
import { textoContemBusca } from "../../../lib/searchText";
import { BRAND } from "./constants";

function ChipListScroll({
  t,
  children,
}: {
  t: Theme;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...MODAL_SCROLL_FOCUS_SAFE_PAD,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 8,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        maxHeight: 160,
        overflowY: "auto",
        background: t.inputBg ?? t.cardBg,
        paddingBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

export function SingleSelectOperadora({
  t,
  label,
  items,
  selected,
  onSelect,
  cor = BRAND.roxoVivo,
  obrigatorio = false,
  field,
  labelStyle,
}: {
  t: Theme;
  label: string;
  items: { value: string; label: string }[];
  selected: string[];
  onSelect: (v: string) => void;
  cor?: string;
  obrigatorio?: boolean;
  field: CSSProperties;
  labelStyle: CSSProperties;
}) {
  const [busca, setBusca] = useState("");
  const filtrados = useMemo(
    () => (busca.trim() ? items.filter((i) => textoContemBusca(i.label, busca)) : items),
    [items, busca],
  );

  return (
    <div style={field} role="group" aria-label={label}>
      <div style={labelStyle}>
        {label}
        {obrigatorio ? <CampoObrigatorioMark /> : null}
        <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 6 }}>(seleção única)</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <BarraPesquisaFiltroPainel
          value={busca}
          onChange={setBusca}
          placeholder={placeholderPesquisaFiltro("Operadora")}
          aria-label="Pesquisar operadora"
        />
        <ChipListScroll t={t}>
          {filtrados.length === 0 ? (
            <span style={{ fontFamily: FONT.body, fontSize: 12, color: t.textMuted }}>
              Nenhum resultado para a busca.
            </span>
          ) : (
            filtrados.map((op) => {
              const sel = selected.includes(op.value);
              return (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => onSelect(op.value)}
                  style={{
                    border: `1px solid ${sel ? cor : t.cardBorder}`,
                    background: sel ? `${cor}22` : "transparent",
                    color: sel ? cor : t.text,
                    borderRadius: 20,
                    padding: "5px 12px",
                    cursor: "pointer",
                    fontFamily: FONT.body,
                    fontSize: 12,
                    fontWeight: sel ? 700 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  {op.label}
                </button>
              );
            })
          )}
        </ChipListScroll>
      </div>
      {selected.length > 0 && (
        <p style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted, marginTop: 4 }}>
          Operadora selecionada: {items.find((i) => i.value === selected[0])?.label ?? selected[0]}
        </p>
      )}
    </div>
  );
}

export function MultiSelect({
  t,
  label,
  items,
  selected,
  onToggle,
  cor = BRAND.roxoVivo,
  obrigatorio = false,
  field,
  labelStyle,
  searchNome,
}: {
  t: Theme;
  label: string;
  items: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  cor?: string;
  obrigatorio?: boolean;
  field: CSSProperties;
  labelStyle: CSSProperties;
  /** Nome do domínio no placeholder «Pesquisar …» (default: label sem sufixos). */
  searchNome?: string;
}) {
  const [busca, setBusca] = useState("");
  const nomeBusca = searchNome ?? (label.replace(/\s*\(.*?\)\s*/g, "").trim() || "item");
  const filtrados = useMemo(
    () => (busca.trim() ? items.filter((i) => textoContemBusca(i.label, busca)) : items),
    [items, busca],
  );

  return (
    <div style={field} role="group" aria-label={label}>
      <div style={labelStyle}>
        {label}
        {obrigatorio ? <CampoObrigatorioMark /> : null}
        <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 6 }}>(multi-seleção)</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <BarraPesquisaFiltroPainel
          value={busca}
          onChange={setBusca}
          placeholder={placeholderPesquisaFiltro(nomeBusca)}
          aria-label={`Pesquisar ${nomeBusca}`}
        />
        <ChipListScroll t={t}>
          {filtrados.length === 0 ? (
            <span style={{ fontFamily: FONT.body, fontSize: 12, color: t.textMuted }}>
              Nenhum resultado para a busca.
            </span>
          ) : (
            filtrados.map((op) => {
              const sel = selected.includes(op.value);
              return (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => onToggle(op.value)}
                  style={{
                    border: `1px solid ${sel ? cor : t.cardBorder}`,
                    background: sel ? `${cor}22` : "transparent",
                    color: sel ? cor : t.text,
                    borderRadius: 20,
                    padding: "5px 12px",
                    cursor: "pointer",
                    fontFamily: FONT.body,
                    fontSize: 12,
                    fontWeight: sel ? 700 : 400,
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: sel ? 5 : 0,
                  }}
                >
                  {op.label}
                  {sel && <X size={10} style={{ flexShrink: 0 }} aria-hidden="true" />}
                </button>
              );
            })
          )}
        </ChipListScroll>
      </div>
      {selected.length > 0 && (
        <p style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted, marginTop: 4 }}>
          {selected.length} selecionado{selected.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
