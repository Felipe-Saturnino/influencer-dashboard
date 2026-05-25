import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { useApp } from "../../../context/AppContext";
import { fmtDataHoraPt } from "../../../lib/informativosWorkflow";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";

type HistRow = {
  id: string;
  alteracao: string;
  created_at: string;
  created_by: string;
  autor?: { name: string | null } | null;
};

const ERRO_HISTORICO = "Não foi possível carregar o histórico. Tente novamente.";

export function ModalHistoricoInformativo({
  open,
  assunto,
  informativoId,
  onClose,
}: {
  open: boolean;
  assunto: string;
  informativoId: string | null;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const [itens, setItens] = useState<HistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!informativoId) return;
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase
      .from("conteudo_informativo_status_historico")
      .select("id, alteracao, created_at, created_by")
      .eq("informativo_id", informativoId)
      .order("created_at", { ascending: false });

    setLoading(false);
    if (error) {
      console.error("[ModalHistoricoInformativo] carregar:", error);
      setErro(ERRO_HISTORICO);
      setItens([]);
      return;
    }
    const rows = (data ?? []) as Omit<HistRow, "autor">[];
    const ids = [...new Set(rows.map((r) => r.created_by).filter(Boolean))];
    const nomes: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
      for (const p of profs ?? []) {
        const pr = p as { id: string; name: string | null };
        nomes[pr.id] = pr.name ?? "";
      }
    }
    setItens(
      rows.map((r) => ({
        ...r,
        autor: { name: nomes[r.created_by] ?? null },
      })),
    );
  }, [informativoId]);

  useEffect(() => {
    if (!open || !informativoId) {
      setItens([]);
      setErro(null);
      return;
    }
    void carregar();
  }, [open, informativoId, carregar]);

  return (
    <ModalBase open={open} onClose={onClose} maxWidth={520}>
      <ModalHeader title={`Histórico — ${assunto}`} onClose={onClose} />
      <div style={{ padding: "0 20px 20px", fontFamily: FONT.body }}>
        {erro ? (
          <div role="alert" style={{ color: "#e84025", fontSize: 13, marginBottom: 12 }}>
            {erro}
          </div>
        ) : null}
        {loading ? (
          <div style={{ textAlign: "center", padding: 24, color: t.textMuted }}>
            <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
          </div>
        ) : itens.length === 0 ? (
          <p style={{ color: t.textMuted, fontSize: 13, margin: 0 }}>Nenhum registro de alteração.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {itens.map((item) => (
              <li
                key={item.id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg ?? t.cardBg,
                }}
              >
                <div style={{ fontSize: 13, color: t.text }}>{item.alteracao}</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>
                  {item.autor?.name ?? "—"} · {fmtDataHoraPt(item.created_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModalBase>
  );
}
