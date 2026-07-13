import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import type { IntegracaoHistorico, IntegracaoRow } from "./types";
import { fmtDataHora, historicoDisplayValor } from "./helpers";
import { HISTORICO_CAMPO_LABEL_INTEGRACAO } from "./constants";

export function ModalHistoricoIntegracao({
  row,
  onClose,
}: {
  row: IntegracaoRow;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const [itens, setItens] = useState<IntegracaoHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comercial_integracao_historico")
      .select("id, integracao_id, campo, valor_anterior, valor_novo, created_at, usuario_id")
      .eq("integracao_id", row.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
      setItens([]);
      setLoading(false);
      return;
    }

    const userIds = new Set<string>();
    (data ?? []).forEach((h) => h.usuario_id && userIds.add(h.usuario_id));
    let names: Record<string, string> = {};
    if (userIds.size) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", [...userIds]);
      names = Object.fromEntries((profs ?? []).map((p) => [p.id, p.name ?? ""]));
    }

    setItens(
      (data ?? []).map((h) => ({
        ...h,
        usuario_nome: h.usuario_id ? names[h.usuario_id] ?? null : null,
      })),
    );
    setLoading(false);
  }, [row.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ModalBase onClose={onClose} maxWidth={560} zIndex={1000}>
      <ModalHeader title={`Histórico — ${row.operador_nome}`} onClose={onClose} />
      {loading ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Carregando…
        </div>
      ) : itens.length === 0 ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Nenhuma alteração registrada.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "60dvh", overflowY: "auto" }}>
          {itens.map((h) => (
            <li
              key={h.id}
              style={{
                padding: "12px 0",
                borderBottom: `1px solid ${t.cardBorder}`,
                fontFamily: FONT.body,
                fontSize: 13,
                color: t.text,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {HISTORICO_CAMPO_LABEL_INTEGRACAO[h.campo] ?? h.campo}
              </div>
              <div style={{ color: t.textMuted, fontSize: 12 }}>
                {h.campo === "comentario" ? (
                  <>{historicoDisplayValor(h.campo, h.valor_novo)}</>
                ) : (
                  <>
                    {historicoDisplayValor(h.campo, h.valor_anterior)}
                    {" → "}
                    {historicoDisplayValor(h.campo, h.valor_novo)}
                  </>
                )}
              </div>
              <div style={{ color: t.textMuted, fontSize: 11, marginTop: 6 }}>
                {fmtDataHora(h.created_at)}
                {h.usuario_nome ? ` · ${h.usuario_nome}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ModalBase>
  );
}
