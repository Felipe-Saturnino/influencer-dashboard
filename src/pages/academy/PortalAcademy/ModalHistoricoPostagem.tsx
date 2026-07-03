import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { useApp } from "../../../context/AppContext";
import { fmtDataHoraPortalAcademy } from "../../../lib/academyPortalAutorMeta";
import { type AcademyPostagemContentType } from "../../../lib/academyPortalWorkflow";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";

type HistRow = {
  id: string;
  alteracao: string;
  created_at: string;
  created_by: string;
  autor?: { name: string | null } | null;
};

const ERRO_HISTORICO = "Não foi possível carregar o histórico. Se o problema persistir, entre em contato com o suporte.";

export function ModalHistoricoPostagem({
  open,
  assunto,
  contentType,
  contentId,
  onClose,
}: {
  open: boolean;
  assunto: string;
  contentType: AcademyPostagemContentType | null;
  contentId: string | null;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const [itens, setItens] = useState<HistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!contentType || !contentId) return;
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase
      .from("academy_portal_postagem_status_historico")
      .select("id, alteracao, created_at, created_by")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .order("created_at", { ascending: false });

    setLoading(false);
    if (error) {
      console.error("[ModalHistoricoPostagem Academy]", error);
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
  }, [contentType, contentId]);

  useEffect(() => {
    if (!open || !contentType || !contentId) {
      setItens([]);
      setErro(null);
      return;
    }
    void carregar();
  }, [open, contentType, contentId, carregar]);

  if (!open) return null;

  return (
    <ModalBase maxWidth={560} onClose={onClose} zIndex={1100}>
      <ModalHeader title={`Histórico — ${assunto}`} onClose={onClose} />
      {loading ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 8, fontFamily: FONT.body }}>Carregando…</div>
        </div>
      ) : erro ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
          {erro}
        </div>
      ) : itens.length === 0 ? (
        <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, textAlign: "center", padding: "20px 0" }}>
          Nenhum registro no histórico.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {itens.map((item) => (
            <li
              key={item.id}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                fontFamily: FONT.body,
              }}
            >
              <div style={{ fontSize: 13, color: t.text }}>{item.alteracao}</div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>
                {(item.autor?.name ?? "Usuário").trim() || "Usuário"} · {fmtDataHoraPortalAcademy(item.created_at)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ModalBase>
  );
}
