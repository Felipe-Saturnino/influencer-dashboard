import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalThreadSolicitacao } from "./ModalThreadSolicitacao";
import type { ThreadSolicitacaoOrigem } from "./ModalThreadSolicitacao";

export interface OperadoraTagDados {
  slug: string;
  nome: string;
  cor_primaria?: string | null;
}

interface PendenciaItem {
  id: string;
  titulo: string | null;
  origem: ThreadSolicitacaoOrigem;
}

interface BannerPendenciasProps {
  operadoraSlugs: string[];
  operadoras: OperadoraTagDados[];
  /** role_permissions.can_editar para a página Central de Notificações (Gestão de Usuários). */
  podeInteragir?: boolean;
}

export function BannerPendencias({ operadoraSlugs, operadoras, podeInteragir = true }: BannerPendenciasProps) {
  const { theme: t, user } = useApp();
  const [pendentes, setPendentes] = useState<PendenciaItem[]>([]);
  const [threadCtx, setThreadCtx] = useState<{ id: string; origem: ThreadSolicitacaoOrigem } | null>(null);

  useEffect(() => {
    if (user?.role !== "operador" || !operadoraSlugs.length) {
      setPendentes([]);
      return;
    }

    async function buscar() {
      let qDealer = supabase
        .from("dealer_solicitacoes")
        .select("id, titulo")
        .eq("aguarda_resposta_de", "operadora")
        .in("status", ["pendente", "em_andamento"])
        .order("created_at", { ascending: false })
        .limit(20);
      qDealer = operadoraSlugs.length === 1 ? qDealer.eq("operadora_slug", operadoraSlugs[0]) : qDealer.in("operadora_slug", operadoraSlugs);

      let qCamp = supabase
        .from("roteiro_campanha_solicitacoes")
        .select("id, titulo")
        .eq("aguarda_resposta_de", "operadora")
        .in("status", ["pendente", "em_andamento"])
        .order("created_at", { ascending: false })
        .limit(20);
      qCamp = operadoraSlugs.length === 1 ? qCamp.eq("operadora_slug", operadoraSlugs[0]) : qCamp.in("operadora_slug", operadoraSlugs);

      const [{ data: dDealer }, { data: dCamp }] = await Promise.all([qDealer, qCamp]);
      const lista: PendenciaItem[] = [
        ...(dDealer ?? []).map((r) => ({ id: r.id as string, titulo: r.titulo as string | null, origem: "dealer" as const })),
        ...(dCamp ?? []).map((r) => ({ id: r.id as string, titulo: r.titulo as string | null, origem: "campanha_roteiro" as const })),
      ];
      setPendentes(lista);
    }

    void buscar();
    const ch = supabase
      .channel("banner_pendencias_op_merged")
      .on("postgres_changes", { event: "*", schema: "public", table: "dealer_solicitacoes" }, () => {
        void buscar();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "roteiro_campanha_solicitacoes" }, () => {
        void buscar();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user?.role, operadoraSlugs.join(",")]);

  if (user?.role !== "operador" || pendentes.length === 0) return null;

  const primeiro = pendentes[0];

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "12px 16px",
          marginBottom: 18,
          borderRadius: 12,
          background: "rgba(245,158,11,0.12)",
          border: "1px solid rgba(245,158,11,0.35)",
          fontFamily: FONT.body,
        }}
      >
        <Bell size={18} color="#f59e0b" aria-hidden />
        <span style={{ flex: 1, minWidth: 200, fontSize: 13, color: t.text }}>
          Você tem {pendentes.length} solicitaç{pendentes.length === 1 ? "ão" : "ões"} aguardando sua resposta.
        </span>
        <button
          type="button"
          onClick={() => primeiro && setThreadCtx({ id: primeiro.id, origem: primeiro.origem })}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid rgba(245,158,11,0.45)",
            background: "rgba(245,158,11,0.15)",
            color: "#b45309",
            fontWeight: 700,
            fontSize: 12,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Ver
        </button>
      </div>
      {threadCtx ? (
        <ModalThreadSolicitacao
          solicitacaoId={threadCtx.id}
          operadoras={operadoras}
          origem={threadCtx.origem}
          podeInteragir={podeInteragir}
          onClose={() => setThreadCtx(null)}
          onResolvido={() => setThreadCtx(null)}
        />
      ) : null}
    </>
  );
}
