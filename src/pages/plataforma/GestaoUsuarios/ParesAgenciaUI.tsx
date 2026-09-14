import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import type { Operadora } from "../../../types";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { SelectListaComBusca } from "../../../components/SelectListaComBusca";
import { FILTER_SEARCH_INFLUENCER, FILTER_SEARCH_OPERADORA } from "../../../lib/searchBarConstants";
import { BRAND } from "./constants";
import { FONT } from "../../../constants/theme";

interface ParesAgenciaUIProps {
  pares: Array<{ influencerId: string; operadoraSlug: string }>;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, field: "influencerId" | "operadoraSlug", val: string) => void;
  influencers: { id: string; nome: string }[];
  operadoras: Operadora[];
  labelStyle: React.CSSProperties;
  field: React.CSSProperties;
}

export function ParesAgenciaUI({
  pares,
  onAdd,
  onRemove,
  onUpdate,
  influencers,
  operadoras,
  labelStyle,
  field,
}: ParesAgenciaUIProps) {
  const { theme: t } = useApp();

  const influencerOptions = useMemo(
    () => [
      { value: "", label: "Selecione o influencer" },
      ...[...influencers]
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((i) => ({ value: i.id, label: i.nome })),
    ],
    [influencers],
  );

  const operadoraOptions = useMemo(
    () => [
      { value: "", label: "Selecione a operadora" },
      ...[...operadoras]
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((op) => ({ value: op.slug, label: op.nome })),
    ],
    [operadoras],
  );

  const paresDefinidos = pares.filter((p) => p.influencerId && p.operadoraSlug).length;

  return (
    <div style={field}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={labelStyle}>
          Pares Influencer × Operadora
          <CampoObrigatorioMark />
        </label>
        <button
          type="button"
          onClick={onAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            border: `1px solid ${BRAND.roxoVivo}`,
            background: `${BRAND.roxoVivo}18`,
            color: BRAND.roxoVivo,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FONT.body,
          }}
        >
          <Plus size={14} aria-hidden /> Adicionar par
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pares.map((par, idx) => (
          <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <SelectListaComBusca
                variant="campo"
                label={`Influencer — par ${idx + 1}`}
                value={par.influencerId}
                onChange={(v) => onUpdate(idx, "influencerId", v)}
                options={influencerOptions}
                searchPlaceholder={FILTER_SEARCH_INFLUENCER}
              />
            </div>
            <span style={{ color: t.textMuted, fontSize: 14 }} aria-hidden>
              ×
            </span>
            <div style={{ flex: 1, minWidth: 140 }}>
              <SelectListaComBusca
                variant="campo"
                label={`Operadora — par ${idx + 1}`}
                value={par.operadoraSlug}
                onChange={(v) => onUpdate(idx, "operadoraSlug", v)}
                options={operadoraOptions}
                searchPlaceholder={FILTER_SEARCH_OPERADORA}
              />
            </div>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              aria-label={`Remover par ${idx + 1}`}
              title={`Remover par ${idx + 1}`}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: BRAND.vermelho,
                border: "none",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Trash2 size={12} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted, marginTop: 6 }}>
        {paresDefinidos} par
        {paresDefinidos !== 1 ? "es" : ""} definido
        {paresDefinidos !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
