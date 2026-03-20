import { Plus, Trash2 } from "lucide-react";
import type { Operadora } from "../../../types";
import { BRAND } from "./constants";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";

interface ParesAgenciaUIProps {
  pares: Array<{ influencerId: string; operadoraSlug: string }>;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, field: "influencerId" | "operadoraSlug", val: string) => void;
  influencers: { id: string; nome: string }[];
  operadoras: Operadora[];
  labelStyle: React.CSSProperties;
  selectStyle: React.CSSProperties;
  field: React.CSSProperties;
  t: Theme;
}

export function ParesAgenciaUI({
  pares,
  onAdd,
  onRemove,
  onUpdate,
  influencers,
  operadoras,
  labelStyle,
  selectStyle,
  field,
  t,
}: ParesAgenciaUIProps) {
  return (
    <div style={field}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={labelStyle}>
          Pares Influencer × Operadora
          <span style={{ color: BRAND.vermelho, marginLeft: 4 }}>*</span>
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
          <Plus size={14} /> Adicionar par
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pares.map((par, idx) => (
          <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select
              style={{ ...selectStyle, flex: 1, minWidth: 140 }}
              value={par.influencerId}
              onChange={(e) => onUpdate(idx, "influencerId", e.target.value)}
            >
              <option value="">Selecione o influencer</option>
              {[...influencers].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>
            <span style={{ color: t.textMuted, fontSize: 14 }}>×</span>
            <select
              style={{ ...selectStyle, flex: 1, minWidth: 140 }}
              value={par.operadoraSlug}
              onChange={(e) => onUpdate(idx, "operadoraSlug", e.target.value)}
            >
              <option value="">Selecione a operadora</option>
              {[...operadoras].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((op) => (
                <option key={op.slug} value={op.slug}>
                  {op.nome}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: 8,
                border: "none",
                background: "none",
                color: t.textMuted,
                cursor: "pointer",
                borderRadius: 6,
              }}
              title="Remover par"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = BRAND.vermelho;
                e.currentTarget.style.background = `${BRAND.vermelho}18`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = t.textMuted;
                e.currentTarget.style.background = "none";
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted, marginTop: 6 }}>
        {pares.filter((p) => p.influencerId && p.operadoraSlug).length} par
        {pares.filter((p) => p.influencerId && p.operadoraSlug).length !== 1 ? "es" : ""} definido
        {pares.filter((p) => p.influencerId && p.operadoraSlug).length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
