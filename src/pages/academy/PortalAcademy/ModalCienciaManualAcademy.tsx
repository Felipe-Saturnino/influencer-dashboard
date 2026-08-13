import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { fmtDataHoraPortalAcademy } from "../../../lib/academyPortalAutorMeta";
import { supabase } from "../../../lib/supabase";

type CienciaRow = {
  userId: string;
  nome: string;
  acknowledgedAt: string;
};

const ERRO_CIENCIA =
  "Não foi possível carregar quem registrou ciência. Se o problema persistir, entre em contato com o suporte.";

/** Lista quem registrou ciência no manual — só Editar = Sim (espelho Ver Lidos do Portal RH). */
export function ModalCienciaManualAcademy({
  open,
  titulo,
  contentId,
  onClose,
}: {
  open: boolean;
  titulo: string;
  contentId: string | null;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const [itens, setItens] = useState<CienciaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!contentId) return;
    setLoading(true);
    setErro(null);

    const { data, error } = await supabase
      .from("academy_portal_read_receipt")
      .select("user_id, acknowledged_at")
      .eq("content_id", contentId)
      .not("acknowledged_at", "is", null)
      .order("acknowledged_at", { ascending: false });

    if (error) {
      console.error("[ModalCienciaManualAcademy] carregar:", error);
      setLoading(false);
      setErro(ERRO_CIENCIA);
      setItens([]);
      return;
    }

    const rows = (data ?? []) as { user_id: string; acknowledged_at: string }[];
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
        acknowledgedAt: r.acknowledged_at,
      })),
    );
    setLoading(false);
  }, [contentId]);

  useEffect(() => {
    if (!open || !contentId) {
      setItens([]);
      setErro(null);
      return;
    }
    void carregar();
  }, [open, contentId, carregar]);

  if (!open || !contentId) return null;

  return (
    <ModalBase maxWidth={480} onClose={onClose} zIndex={1102}>
      <ModalHeader title={`Ciência — ${titulo || "Manual"}`} onClose={onClose} />

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
          Ninguém registrou ciência neste manual ainda.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "min(50dvh, 360px)", overflowY: "auto" }}>
          {itens.map((row) => (
            <li
              key={`${row.userId}-${row.acknowledgedAt}`}
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
              <span style={{ color: t.textMuted, whiteSpace: "nowrap" }}>
                {fmtDataHoraPortalAcademy(row.acknowledgedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ModalBase>
  );
}
