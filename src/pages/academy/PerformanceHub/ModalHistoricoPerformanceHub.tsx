import { useEffect, useState } from "react";
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

export function ModalHistoricoPerformanceHub({ avaliacao, onClose }: Props) {
  const { theme: t } = useApp();
  const [itens, setItens] = useState<PerformanceHubHistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchHistoricoAvaliacaoPerformanceHub(avaliacao.id).then((rows) => {
      if (cancelled) return;
      setItens(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [avaliacao.id]);

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
