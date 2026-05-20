import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { fmtDataHoraPt, type RhPostagemContentType } from "../../../lib/portalRhWorkflow";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";

type Theme = { text: string; textMuted: string; cardBorder: string };

type HistRow = {
  id: string;
  alteracao: string;
  created_at: string;
  created_by: string;
  autor?: { name: string | null } | null;
};

export function ModalHistoricoPostagem({
  open,
  assunto,
  contentType,
  contentId,
  onClose,
  t,
}: {
  open: boolean;
  assunto: string;
  contentType: RhPostagemContentType | null;
  contentId: string | null;
  onClose: () => void;
  t: Theme;
}) {
  const [itens, setItens] = useState<HistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!contentType || !contentId) return;
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase
      .from("rh_portal_postagem_status_historico")
      .select("id, alteracao, created_at, created_by")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .order("created_at", { ascending: false });

    setLoading(false);
    if (error) {
      setErro(error.message);
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
  }, [contentType, contentId]);

  useEffect(() => {
    if (!open || !contentType || !contentId) {
      setItens([]);
      setErro(null);
      return;
    }
    void carregar();
  }, [open, contentType, contentId, carregar]);

  if (!open || !contentType || !contentId) return null;

  return (
    <ModalBase maxWidth={560} onClose={onClose} zIndex={1102}>
      <ModalHeader title={`Histórico — ${assunto || "Postagem"}`} onClose={onClose} />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
        </div>
      ) : erro ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
          {erro}
        </div>
      ) : itens.length === 0 ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Nenhum registro de alteração de status.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "min(60dvh, 480px)", overflowY: "auto" }}>
          {itens.map((h) => {
            const autor = (h.autor?.name ?? "").trim() || "Usuário";
            return (
              <li
                key={h.id}
                style={{
                  padding: "12px 0",
                  borderBottom: `1px solid ${t.cardBorder}`,
                  fontFamily: FONT.body,
                }}
              >
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>{fmtDataHoraPt(h.created_at)}</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>{autor}</div>
                <div style={{ fontSize: 13, color: t.text, lineHeight: 1.45 }}>{h.alteracao}</div>
              </li>
            );
          })}
        </ul>
      )}
    </ModalBase>
  );
}
