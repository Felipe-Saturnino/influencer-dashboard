import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalThreadSolicitacao } from "./ModalThreadSolicitacao";
export interface OperadoraTagDados {
  slug: string;
  nome: string;
  cor_primaria?: string | null;
}

interface BannerPendenciasProps {
  operadoraSlugs: string[];
  operadoras: OperadoraTagDados[];
}

export function BannerPendencias({ operadoraSlugs, operadoras }: BannerPendenciasProps) {
  const { theme: t, user } = useApp();
  const [pendentes, setPendentes] = useState<{ id: string; titulo: string | null }[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "operador" || !operadoraSlugs.length) {
      setPendentes([]);
      return;
    }

    async function buscar() {
      let q = supabase
        .from("dealer_solicitacoes")
        .select("id, titulo")
        .eq("aguarda_resposta_de", "operadora")
        .in("status", ["pendente", "em_andamento"])
        .order("created_at", { ascending: false })
        .limit(20);
      q = operadoraSlugs.length === 1 ? q.eq("operadora_slug", operadoraSlugs[0]) : q.in("operadora_slug", operadoraSlugs);
      const { data } = await q;
      setPendentes((data ?? []) as { id: string; titulo: string | null }[]);
    }

    void buscar();
    const ch = supabase
      .channel("banner_pendencias_op")
      .on("postgres_changes", { event: "*", schema: "public", table: "dealer_solicitacoes" }, () => {
        void buscar();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user?.role, operadoraSlugs.join(",")]);

  if (user?.role !== "operador" || pendentes.length === 0) return null;

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
          onClick={() => setThreadId(pendentes[0]?.id ?? null)}
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
      {threadId ? (
        <ModalThreadSolicitacao
          solicitacaoId={threadId}
          operadoras={operadoras}
          onClose={() => setThreadId(null)}
          onResolvido={() => setThreadId(null)}
        />
      ) : null}
    </>
  );
}
