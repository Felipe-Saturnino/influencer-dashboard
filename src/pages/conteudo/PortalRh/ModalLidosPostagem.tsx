import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { fmtDataHoraPortalRh } from "../../../lib/portalRhAutorMeta";
import { supabase } from "../../../lib/supabase";

type LidoRow = {
  userId: string;
  nome: string;
  readAt: string;
};

const ERRO_LIDOS =
  "Não foi possível carregar quem marcou como lido. Se o problema persistir, entre em contato com o suporte.";

export function ModalLidosPostagem({
  open,
  titulo,
  contentType,
  contentId,
  onClose,
}: {
  open: boolean;
  titulo: string;
  contentType: "comunicado" | null;
  contentId: string | null;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const [itens, setItens] = useState<LidoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!contentType || !contentId) return;
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase
      .from("rh_portal_read_receipt")
      .select("user_id, read_at")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .not("read_at", "is", null)
      .order("read_at", { ascending: false });

    if (error) {
      console.error("[ModalLidosPostagem] carregar:", error);
      setLoading(false);
      setErro(ERRO_LIDOS);
      setItens([]);
      return;
    }

    const rows = (data ?? []) as { user_id: string; read_at: string }[];
    const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    const nomes: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
      for (const p of profs ?? []) {
        const pr = p as { id: string; name: string | null };
        nomes[pr.id] = (pr.name ?? "").trim() || "Usuário";
      }
    }

    setItens(
      rows.map((r) => ({
        userId: r.user_id,
        nome: nomes[r.user_id] ?? "Usuário",
        readAt: r.read_at,
      })),
    );
    setLoading(false);
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
    <ModalBase maxWidth={480} onClose={onClose} zIndex={1102}>
      <ModalHeader title={`Lidos — ${titulo || "Comunicado"}`} onClose={onClose} />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span className="sr-only">Carregando…</span>
        </div>
      ) : erro ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
          {erro}
        </div>
      ) : itens.length === 0 ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Ninguém marcou este comunicado como lido ainda.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "min(50dvh, 360px)", overflowY: "auto" }}>
          {itens.map((row) => (
            <li
              key={`${row.userId}-${row.readAt}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 0",
                borderBottom: `1px solid ${t.cardBorder}`,
                fontFamily: FONT.body,
                fontSize: 13,
              }}
            >
              <span style={{ color: t.text, fontWeight: 600 }}>{row.nome}</span>
              <span style={{ color: t.textMuted, whiteSpace: "nowrap" }}>{fmtDataHoraPortalRh(row.readAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </ModalBase>
  );
}
