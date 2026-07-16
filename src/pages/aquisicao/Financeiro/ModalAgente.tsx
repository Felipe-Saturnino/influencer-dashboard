import { useState } from "react";
import { Loader2, Plus } from "lucide-react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { BASE_COLORS, FONT } from "../../../constants/theme"
import { supabase } from "../../../lib/supabase"
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"

export function ModalAgente({ cicloId, filterOperadora, operadorasList, podeVerOperadora, onClose, onSalvo }: {
  cicloId: string;
  filterOperadora: string;
  operadorasList: { slug: string; nome: string }[];
  podeVerOperadora: (slug: string) => boolean;
  onClose: () => void;
  onSalvo: () => Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [operadoraSlug, setOperadoraSlug] = useState(filterOperadora !== "todas" ? filterOperadora : "");

  const opcoes = operadorasList.filter((o) => podeVerOperadora(o.slug));
  const precisaSelecionarOp = filterOperadora === "todas" && opcoes.length > 1;
  const opUnica = opcoes.length === 1 ? opcoes[0]!.slug : "";
  const opFinal =
    filterOperadora !== "todas" ? filterOperadora : (operadoraSlug || opUnica);

  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const canSubmit = descricao.trim().length > 0 && valorNum > 0 && Boolean(opFinal);

  async function handleConfirm() {
    if (!canSubmit || !opFinal) return;
    setSaving(true);
    setErr("");
    const { error } = await supabase.from("pagamentos_agentes").insert({
      ciclo_id: cicloId,
      operadora_slug: opFinal,
      descricao: descricao.trim(),
      total: valorNum,
      status: "em_analise",
    });
    if (error) {
      console.error("pagamentos_agentes insert:", error);
      setErr(
        "Não foi possível registrar o pagamento. Se o problema persistir, entre em contato com o suporte.",
      );
      setSaving(false);
      return;
    }
    await onSalvo();
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "10px",
    border: `1px solid ${t.cardBorder}`, background: t.inputBg,
    color: t.inputText, fontSize: "13px", fontFamily: FONT.body,
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 700, color: t.textMuted,
    textTransform: "uppercase", letterSpacing: "1px",
    display: "block", marginBottom: "6px", fontFamily: FONT.body,
  };

  return (
    <ModalBase maxWidth={400} onClose={onClose}>
      <ModalHeader title="Pagamento de agente" onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {precisaSelecionarOp && (
          <div>
            <label style={labelStyle}>
              Operadora
              <CampoObrigatorioMark />
            </label>
            <select
              aria-label="Operadoras"
              value={operadoraSlug}
              onChange={e => setOperadoraSlug(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Selecione...</option>
              {[...opcoes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map(o => <option key={o.slug} value={o.slug}>{o.nome}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={labelStyle}>
            Nome do agente
            <CampoObrigatorioMark />
          </label>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: João Silva" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>
            Valor (R$)
            <CampoObrigatorioMark />
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={valor}
            onChange={e => {
              const v = e.target.value;
              if (v === "") { setValor(v); return; }
              if (v === "-") return;
              const num = parseFloat(v.replace(",", "."));
              if (!isNaN(num) && num < 0) return;
              setValor(v);
            }}
            placeholder="0,00"
            style={inputStyle}
          />
        </div>
        {err ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
            {err}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={saving || !canSubmit}
          style={{
            flex: 2,
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            cursor: saving || !canSubmit ? "not-allowed" : "pointer",
            opacity: saving || !canSubmit ? 0.6 : 1,
            background: brand.useBrand
              ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
              : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
            color: "#fff",
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: FONT.body,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={13} className="app-lucide-spin" color="#fff" aria-hidden />
              Salvando…
            </>
          ) : (
            <>
              <Plus size={13} aria-hidden />
              Adicionar
            </>
          )}
        </button>
      </div>
    </ModalBase>
  );
}
