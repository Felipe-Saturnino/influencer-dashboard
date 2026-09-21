import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { PERFORMANCE_HUB_HISTORICO_ACAO_LABEL } from "../../../lib/academyPerformanceHubConstants";
import type { PerformanceHubAvaliacao, PerformanceHubHistoricoItem } from "../../../lib/academyPerformanceHubTypes";
import {
  fetchHistoricoAvaliacaoPerformanceHub,
  formatDataHoraHistoricoPerformanceHub,
} from "../../../lib/academyPerformanceHubAvaliacoesFetch";

type Props = {
  avaliacao: PerformanceHubAvaliacao;
  onClose: () => void;
};

const BTN_RETRY_STYLE = {
  fontFamily: FONT.body,
  fontSize: 13,
  fontWeight: 700,
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid rgba(232,64,37,0.35)",
  background: "transparent",
  color: "#e84025",
  cursor: "pointer",
} as const;

const ERRO_HISTORICO =
  "Não foi possível carregar o histórico. Se o problema persistir, entre em contato com o suporte.";

export function ModalHistoricoPerformanceHub({ avaliacao, onClose }: Props) {
  const { theme: t } = useApp();
  const [itens, setItens] = useState<PerformanceHubHistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const carregar = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErro(null);
    void fetchHistoricoAvaliacaoPerformanceHub(avaliacao.id)
      .then((rows) => {
        if (cancelled) return;
        setItens(rows);
      })
      .catch((e) => {
        console.error(e);
        if (cancelled) return;
        setItens([]);
        setErro(ERRO_HISTORICO);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [avaliacao.id, reloadTick]);

  return (
    <ModalBase maxWidth={560} onClose={onClose}>
      <ModalHeader title={`Histórico · ${avaliacao.avaliadoNome}`} onClose={onClose} />
      <p style={{ margin: "0 0 14px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
        Avaliação de {avaliacao.data}
      </p>

      {loading ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Carregando…
        </div>
      ) : erro ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "24px 0",
          }}
        >
          <span>{erro}</span>
          <button type="button" onClick={carregar} style={BTN_RETRY_STYLE}>
            Tentar de novo
          </button>
        </div>
      ) : itens.length === 0 ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Nenhum registro de histórico para esta avaliação.
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {itens.map((item) => (
            <li
              key={item.id}
              style={{
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                fontFamily: FONT.body,
              }}
            >
              <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>
                {formatDataHoraHistoricoPerformanceHub(item.createdAt)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: item.mensagem ? 6 : 0 }}>
                {PERFORMANCE_HUB_HISTORICO_ACAO_LABEL[item.acao]}
                {" — "}
                {item.usuarioNome}
              </div>
              {item.mensagem?.trim() ? (
                <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {item.mensagem}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </ModalBase>
  );
}
