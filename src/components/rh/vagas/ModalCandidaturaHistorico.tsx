import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { fmtDataHoraBR } from "../../../lib/rhVagaCandidaturaKanban";
import { RH_CANDIDATURA_HISTORICO_SELECT } from "../../../lib/rhVagaCandidaturaQueries";
import type { RhVagaCandidaturaHistoricoRow } from "../../../lib/rhVagaCandidaturaHistorico";
import { labelVagaComCodigo } from "../../../lib/rhVagasFormat";
import type { RhVagaCandidaturaRow } from "../../../types/rhVagaCandidatura";
import { ModalBase, ModalHeader } from "../../OperacoesModal";

type Theme = { text: string; textMuted: string; cardBorder: string; inputBg: string; cardBg?: string };

function detalhesTexto(detalhes: Record<string, unknown>): string | null {
  const partes: string[] = [];
  const campos: [string, string][] = [
    ["data_agendamento", "Data de agendamento"],
    ["data_aprovacao", "Data de aprovação"],
    ["data_contratacao", "Data de contratação"],
    ["data_dispensa", "Data de dispensa"],
    ["motivo_dispensa", "Motivo da dispensa"],
    ["nome_arquivo", "Arquivo"],
    ["conteudo", "Anotação"],
  ];
  for (const [k, label] of campos) {
    const v = detalhes[k];
    if (v != null && String(v).trim()) partes.push(`${label}: ${String(v).trim()}`);
  }
  if (detalhes.de != null && detalhes.para != null) {
    partes.unshift(`De «${String(detalhes.de)}» para «${String(detalhes.para)}»`);
  }
  return partes.length ? partes.join(" · ") : null;
}

export function ModalCandidaturaHistorico({
  open,
  candidatura,
  onClose,
  t,
}: {
  open: boolean;
  candidatura: RhVagaCandidaturaRow | null;
  onClose: () => void;
  t: Theme;
}) {
  const [itens, setItens] = useState<RhVagaCandidaturaHistoricoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!candidatura?.id) return;
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase
      .from("rh_vaga_candidatura_historico")
      .select(RH_CANDIDATURA_HISTORICO_SELECT)
      .eq("candidatura_id", candidatura.id)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      setErro(error.message);
      setItens([]);
      return;
    }
    setItens((data ?? []) as unknown as RhVagaCandidaturaHistoricoRow[]);
  }, [candidatura?.id]);

  useEffect(() => {
    if (!open || !candidatura) {
      setItens([]);
      setErro(null);
      return;
    }
    void carregar();
  }, [open, candidatura, carregar]);

  if (!open || !candidatura) return null;

  const subtitulo = candidatura.vaga ? labelVagaComCodigo(candidatura.vaga) : "—";

  return (
    <ModalBase maxWidth={560} onClose={onClose} zIndex={1102}>
      <ModalHeader title={`Histórico — ${candidatura.nome_completo}`} onClose={onClose} />
      <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>{subtitulo}</p>

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
          Nenhum registro no histórico.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "min(60dvh, 480px)", overflowY: "auto" }}>
          {itens.map((h) => {
            const extra = detalhesTexto(h.detalhes ?? {});
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
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>{fmtDataHoraBR(h.created_at)}</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>{autor}</div>
                <div style={{ fontSize: 13, color: t.text, lineHeight: 1.45 }}>{h.resumo}</div>
                {extra ? (
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6, lineHeight: 1.4 }}>{extra}</div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </ModalBase>
  );
}
