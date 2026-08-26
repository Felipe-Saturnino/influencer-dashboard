import { useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { SelectComIcone } from "../../../components/dashboard";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import {
  fetchHistoricoChecklistItem,
  fetchHistoricoMovimentacaoItem,
  formatDataHoraEstoque,
  type HistoricoChecklistEvento,
  type HistoricoMovimentacaoEvento,
  type HistoricoEventoTipo,
  type ItemAlocadoSetRow,
} from "../../../lib/techOpsItensAlocados";
import { CampoCardAlocado, ROW2_ALOCADO } from "./itensAlocadosUi";

const ERRO =
  "Não foi possível carregar o histórico. Se o problema persistir, entre em contato com o suporte.";

export function ModalHistoricoItemAlocado({
  item,
  estudioNomePorSlug,
  onClose,
}: {
  item: ItemAlocadoSetRow;
  estudioNomePorSlug: Record<string, string>;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const [tipo, setTipo] = useState<HistoricoEventoTipo>("checklist");
  const [chk, setChk] = useState<HistoricoChecklistEvento[]>([]);
  const [mov, setMov] = useState<HistoricoMovimentacaoEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoading(true);
      setErro(null);
      try {
        const [c, m] = await Promise.all([
          fetchHistoricoChecklistItem(item.entidade_tipo, item.entidade_id),
          fetchHistoricoMovimentacaoItem(item.entidade_tipo, item.entidade_id, estudioNomePorSlug),
        ]);
        if (cancel) return;
        setChk(c);
        setMov(m);
      } catch (e) {
        console.error("Itens Alocados: falha ao carregar histórico", e);
        if (!cancel) setErro(ERRO);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [item.entidade_tipo, item.entidade_id, estudioNomePorSlug]);

  return (
    <ModalBase onClose={onClose} maxWidth={860}>
      <ModalHeader title="Histórico" onClose={onClose} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          margin: "-12px 0 16px",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          {item.codigo} — {item.nome}
        </p>
        <SelectComIcone
          icon={FilterBarIcons.historico}
          label="Tipo de Histórico"
          value={tipo}
          onChange={(v) => setTipo(v as HistoricoEventoTipo)}
          pill
          minWidth={180}
        >
          <option value="checklist">Check-list</option>
          <option value="manutencao">Manutenção</option>
          <option value="movimentacao">Movimentação</option>
        </SelectComIcone>
      </div>

      {erro ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
          {erro}
        </div>
      ) : loading ? (
        <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Carregando…</div>
      ) : tipo === "manutencao" ? (
        <div style={{ padding: "48px 16px", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 8 }}>Manutenção</div>
          <div style={{ fontSize: 13 }}>Este card será definido após o fluxo de manutenção da página.</div>
        </div>
      ) : tipo === "checklist" ? (
        chk.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Nenhum checklist registrado.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {chk.map((h) => (
              <div
                key={h.id}
                style={{ border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: "12px 14px", background: t.inputBg }}
              >
                <div style={ROW2_ALOCADO}>
                  <CampoCardAlocado label="Data/Hora do Checklist" value={formatDataHoraEstoque(h.data_hora)} />
                  <CampoCardAlocado label="Usuário que realizou alteração" value={h.autor_nome} />
                  <CampoCardAlocado label="Tipo de Verificação" value={h.tipo_verificacao} />
                  <CampoCardAlocado label="Status anterior" value={h.status_anterior} />
                  <CampoCardAlocado label="Status atual" value={h.status_novo} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <CampoCardAlocado label="Observação do Checklist" value={h.observacao} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : mov.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Nenhuma movimentação registrada.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {mov.map((m) => (
            <div
              key={m.id}
              style={{ border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: "12px 14px", background: t.inputBg }}
            >
              <div style={ROW2_ALOCADO}>
                <CampoCardAlocado label="Número da OS" value={m.codigo_os} />
                <CampoCardAlocado label="Data/hora da OS" value={formatDataHoraEstoque(m.data_hora)} />
                <CampoCardAlocado label="Usuário que criou a OS" value={m.usuario} />
                <CampoCardAlocado label="Origem cadastrada na OS" value={m.origem} />
              </div>
              <div style={{ marginTop: 12 }}>
                <CampoCardAlocado label="Observação da OS" value={m.observacao} />
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalBase>
  );
}
