import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { Campanha } from "../../../types";
import { AlertCircle } from "lucide-react";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";

const COR = {
  vermelho: "#e84025",
  cinza: "#6b7280",
} as const;

const MSG_ERRO_SALVAR =
  "Não foi possível salvar a campanha. Se o problema persistir, entre em contato com o suporte.";

interface ModalCampanhaProps {
  editando: Campanha | null;
  operadoras: { slug: string; nome: string }[];
  onClose: () => void;
  onSalvo: () => void;
}

export function ModalCampanha({ editando, operadoras, onClose, onSalvo }: ModalCampanhaProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [operadoraSlug, setOperadoraSlug] = useState(editando?.operadora_slug ?? "");
  const [ativo, setAtivo] = useState(editando?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const nomeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => nomeInputRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, []);

  const salvar = async () => {
    setErro("");
    if (!nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        nome: nome.trim(),
        operadora_slug: operadoraSlug || null,
        ativo,
        updated_at: new Date().toISOString(),
      };
      if (editando) {
        const { error } = await supabase.from("campanhas").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("campanhas").insert(payload);
        if (error) throw error;
      }
      onSalvo();
      onClose();
    } catch (e: unknown) {
      console.error("[Campanhas] Erro ao salvar:", e);
      setErro(MSG_ERRO_SALVAR);
    } finally {
      setSalvando(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: t.inputBg ?? t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 10,
    padding: "10px 14px",
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: FONT.body,
    fontSize: 11,
    fontWeight: 700,
    color: t.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "1px",
  };
  const fieldStyle: React.CSSProperties = { marginBottom: 18 };
  const accentActive = brand.accent;

  return (
    <ModalBase
      onClose={() => {
        if (!salvando) onClose();
      }}
      maxWidth={460}
    >
      <ModalHeader
        title={editando ? "Editar campanha" : "Nova campanha"}
        onClose={() => {
          if (!salvando) onClose();
        }}
      />

      <div style={fieldStyle}>
        <label style={labelStyle}>
          Nome
          <CampoObrigatorioMark />
        </label>
        <input
          ref={nomeInputRef}
          style={inputStyle}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Black Friday, Lançamento Produto X"
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Operadora (opcional)</label>
        <select
          value={operadoraSlug}
          onChange={(e) => setOperadoraSlug(e.target.value)}
          style={{
            ...inputStyle,
            cursor: "pointer",
          }}
        >
          <option value="">Todas / Nenhuma</option>
          {[...operadoras]
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
            .map((op) => (
              <option key={op.slug} value={op.slug}>
                {op.nome}
              </option>
            ))}
        </select>
      </div>

      {editando && (
        <div style={{ ...fieldStyle, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <label style={{ ...labelStyle, margin: 0 }}>Status</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { val: true as const, label: "Ativa", cor: "#059669" },
              { val: false as const, label: "Inativa", cor: COR.cinza },
            ].map(({ val, label, cor }) => (
              <button
                key={label}
                type="button"
                aria-pressed={ativo === val}
                onClick={() => setAtivo(val)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontFamily: FONT.body,
                  fontSize: 13,
                  cursor: "pointer",
                  border: `1px solid ${ativo === val ? cor : t.cardBorder}`,
                  background: ativo === val ? `${cor}22` : "transparent",
                  color: ativo === val ? cor : t.textMuted,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {!ativo && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: accentActive,
                fontFamily: FONT.body,
              }}
            >
              <AlertCircle size={13} aria-hidden /> UTMs mapeados permanecem vinculados
            </div>
          )}
        </div>
      )}

      {erro ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: `${COR.vermelho}18`,
            border: `1px solid ${COR.vermelho}44`,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            color: COR.vermelho,
            marginBottom: 16,
            fontFamily: FONT.body,
          }}
        >
          <AlertCircle size={14} aria-hidden /> {erro}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button
          type="button"
          onClick={() => {
            if (!salvando) onClose();
          }}
          style={{
            background: "transparent",
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 10,
            padding: "9px 18px",
            cursor: "pointer",
            fontFamily: FONT.body,
            fontSize: 13,
            color: t.text,
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={salvando}
          style={{
            background: getCtaCriarGradient(brand),
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "9px 20px",
            cursor: salvando ? "not-allowed" : "pointer",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 700,
            opacity: salvando ? 0.7 : 1,
          }}
        >
          {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Criar campanha"}
        </button>
      </div>
    </ModalBase>
  );
}
