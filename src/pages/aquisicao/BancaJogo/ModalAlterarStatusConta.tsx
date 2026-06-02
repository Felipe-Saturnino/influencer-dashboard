import { useEffect, useState } from "react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { BASE_COLORS, FONT } from "../../../constants/theme"
import { supabase } from "../../../lib/supabase"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"
import { type BancaStatusConta } from "./bancaJogoTypes"

export function ModalAlterarStatusConta({
  influencerId,
  nome,
  statusContaAtual,
  onClose,
  onSalvo,
}: {
  influencerId: string;
  nome: string;
  /** Status da conta na banca (operadora), não o status do cadastro do influencer. */
  statusContaAtual: BancaStatusConta;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [paraLiberada, setParaLiberada] = useState(statusContaAtual === "liberada");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [idsOperadoraTxt, setIdsOperadoraTxt] = useState("…");

  useEffect(() => {
    setParaLiberada(statusContaAtual === "liberada");
  }, [influencerId, statusContaAtual]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("influencer_operadoras")
        .select("id_operadora")
        .eq("influencer_id", influencerId)
        .eq("ativo", true);
      const ids = [...new Set((data ?? [])
        .map((r: { id_operadora?: string | null }) => (r.id_operadora ?? "").trim())
        .filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      setIdsOperadoraTxt(ids.length ? ids.join(" · ") : "—");
    })();
  }, [influencerId]);

  async function salvar() {
    setErr("");
    const novoConta: BancaStatusConta = paraLiberada ? "liberada" : "bloqueada";
    if (novoConta === statusContaAtual) {
      onClose();
      return;
    }
    setSaving(true);
    const agora = new Date().toISOString();
    const patch: Record<string, string> = { banca_status_conta: novoConta };
    if (paraLiberada) patch.banca_data_desbloqueio = agora;
    else patch.banca_data_bloqueio = agora;
    const { error } = await supabase.from("influencer_perfil").update(patch).eq("id", influencerId);
    setSaving(false);
    if (error) {
      setErr(error.message ?? "Não foi possível atualizar.");
      return;
    }
    onSalvo();
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={440}>
      <ModalHeader title="Status da Conta" onClose={onClose} />
      <p style={{
        margin: "0 0 12px",
        fontSize: 14,
        fontWeight: 700,
        color: t.text,
        fontFamily: FONT.body,
        lineHeight: 1.45,
      }}
      >
        {nome} / {idsOperadoraTxt}
      </p>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.55 }}>
        Garanta que a conta esteja Bloqueada enquanto a ação continua ativa para evitar saques por parte do Influencer do dinheiro destinado a ação.
      </p>
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {(["liberada", "bloqueada"] as BancaStatusConta[]).map((opt) => (
          <button
            key={opt}
            type="button"
            aria-pressed={paraLiberada === (opt === "liberada")}
            onClick={() => setParaLiberada(opt === "liberada")}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 10,
              fontWeight: 700,
              fontFamily: FONT.body,
              fontSize: 13,
              cursor: "pointer",
              border: `1px solid ${paraLiberada === (opt === "liberada") ? (opt === "liberada" ? "#10b981" : "#ef4444") : t.cardBorder}`,
              background: paraLiberada === (opt === "liberada") ? (opt === "liberada" ? "#10b98122" : "#ef444422") : "transparent",
              color: paraLiberada === (opt === "liberada") ? (opt === "liberada" ? "#10b981" : "#ef4444") : t.textMuted,
            }}
          >
            {opt === "liberada" ? "Liberada" : "Bloqueada"}
          </button>
        ))}
      </div>
      {err ? <div style={{ color: "#ef4444", fontSize: 12, marginTop: 12, fontFamily: FONT.body }}>{err}</div> : null}
      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={saving}
          style={{
            flex: 1, padding: 12, borderRadius: 10, border: "none", fontWeight: 700, fontFamily: FONT.body,
            cursor: saving ? "not-allowed" : "pointer",
            background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
            color: "#fff",
          }}
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </ModalBase>
  );
}
