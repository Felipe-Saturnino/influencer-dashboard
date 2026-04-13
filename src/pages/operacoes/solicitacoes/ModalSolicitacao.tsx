import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import type { Dealer } from "../../../types";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import type { SolicitacaoTipo } from "./solicitacoesUtils";

export interface ModalSolicitacaoProps {
  dealer: Dealer;
  operadoraSlug: string;
  onClose: () => void;
  onEnviado: () => void;
}

export function ModalSolicitacao({ dealer, operadoraSlug, onClose, onEnviado }: ModalSolicitacaoProps) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const [tipo, setTipo] = useState<SolicitacaoTipo>("troca_dealer");
  const [texto, setTexto] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function enviar() {
    setErr("");
    const tTrim = texto.trim();
    if (tTrim.length < 10) {
      setErr("Descreva a solicitação com pelo menos 10 caracteres.");
      return;
    }
    if (!user?.id) {
      setErr("Sessão inválida. Faça login novamente.");
      return;
    }

    setLoading(true);
    try {
      const titulo =
        tipo === "troca_dealer" ? `Troca · ${dealer.nickname}` : `Feedback · ${dealer.nickname}`;

      const { data: sol, error: e1 } = await supabase
        .from("dealer_solicitacoes")
        .insert({
          dealer_id: dealer.id,
          operadora_slug: operadoraSlug,
          tipo,
          status: "pendente",
          aguarda_resposta_de: "gestor",
          titulo,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (e1 || !sol?.id) {
        setErr(e1?.message ?? "Não foi possível criar a solicitação.");
        return;
      }

      const { error: e2 } = await supabase.from("solicitacao_mensagens").insert({
        solicitacao_id: sol.id,
        autor: "operadora",
        usuario_id: user.id,
        texto: tTrim,
      });

      if (e2) {
        setErr(e2.message ?? "Erro ao registrar a mensagem.");
        return;
      }

      onEnviado();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const pill = (ativo: boolean) => ({
    padding: "8px 14px",
    borderRadius: 10,
    fontFamily: FONT.body,
    fontSize: 13,
    fontWeight: 700 as const,
    cursor: loading ? "not-allowed" : "pointer",
    border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
    background: ativo
      ? brand.useBrand
        ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
        : "rgba(124,58,237,0.15)"
      : "transparent",
    color: ativo ? brand.accent : t.textMuted,
    opacity: loading ? 0.6 : 1,
  });

  return (
    <ModalBase onClose={() => { if (!loading) onClose(); }} maxWidth={480}>
      <ModalHeader title={`Nova solicitação — ${dealer.nickname}`} onClose={() => { if (!loading) onClose(); }} />
      <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
        Escolha o tipo e descreva o pedido ao estúdio.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          type="button"
          aria-pressed={tipo === "troca_dealer"}
          disabled={loading}
          style={pill(tipo === "troca_dealer")}
          onClick={() => setTipo("troca_dealer")}
        >
          Solicitar troca de dealer
        </button>
        <button
          type="button"
          aria-pressed={tipo === "feedback"}
          disabled={loading}
          style={pill(tipo === "feedback")}
          onClick={() => setTipo("feedback")}
        >
          Deixar feedback
        </button>
      </div>
      <label htmlFor="sol-texto" style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
        Descrição
      </label>
      <textarea
        id="sol-texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Descreva sua solicitação..."
        rows={5}
        disabled={loading}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 12,
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg ?? t.cardBg,
          color: t.text,
          fontSize: 13,
          fontFamily: FONT.body,
          outline: "none",
          resize: "vertical",
        }}
      />
      {err ? (
        <div role="alert" style={{ color: "#ef4444", fontSize: 12, fontFamily: FONT.body, marginTop: 12 }}>
          {err}
        </div>
      ) : null}
      <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: "transparent",
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void enviar()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: brand.useBrand
              ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
              : "linear-gradient(135deg, #4a2082, #1e36f8)",
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.85 : 1,
          }}
        >
          {loading ? <Loader2 size={16} className="app-lucide-spin" color="#fff" aria-hidden /> : null}
          Enviar solicitação
        </button>
      </div>
    </ModalBase>
  );
}
