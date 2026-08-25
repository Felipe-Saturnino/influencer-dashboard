import { useMemo, useState } from "react";
import { ClipboardCheck, MessageSquareText } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import {
  ITEM_ALOCADO_STATUS_LABEL,
  salvarChecklistItensAlocados,
  TIPO_VERIFICACAO_LABEL,
  type ItemAlocadoSetRow,
  type ItemAlocadoStatus,
  type TipoVerificacaoChecklist,
} from "../../../lib/techOpsItensAlocados";

type AbaChk = "itens" | "anotacoes";

const STATUS_OPTS: ItemAlocadoStatus[] = ["em_uso", "verificar", "manutencao"];

export function ModalChecklistItensAlocados({
  localLabel,
  localChave,
  mesaId,
  itens,
  autorNome,
  onClose,
  onSalvo,
}: {
  localLabel: string;
  localChave: string;
  mesaId: string | null;
  itens: ItemAlocadoSetRow[];
  autorNome: string;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const [aba, setAba] = useState<AbaChk>("itens");
  const [statusMap, setStatusMap] = useState<Record<string, ItemAlocadoStatus>>(() =>
    Object.fromEntries(itens.map((i) => [`${i.entidade_tipo}:${i.entidade_id}`, i.status])),
  );
  const [tipoVerificacao, setTipoVerificacao] = useState<TipoVerificacaoChecklist | "">("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const tabs = useMemo(
    () =>
      [
        { id: "itens" as const, label: "Itens", icon: <ClipboardCheck {...FILTRO_BAR_TAB_ICON_PROPS} /> },
        { id: "anotacoes" as const, label: "Anotações", icon: <MessageSquareText {...FILTRO_BAR_TAB_ICON_PROPS} /> },
      ] as const,
    [],
  );

  async function salvar() {
    if (!tipoVerificacao || !observacao.trim()) {
      setAba("anotacoes");
      setErro("Preencha Tipo de Verificação e Observação. Ambos são obrigatórios.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await salvarChecklistItensAlocados({
        localChave,
        mesaId,
        tipoVerificacao,
        observacao,
        autorNome,
        itens: itens.map((i) => {
          const key = `${i.entidade_tipo}:${i.entidade_id}`;
          return {
            entidade_tipo: i.entidade_tipo,
            entidade_id: i.entidade_id,
            status_anterior: i.status,
            status_novo: statusMap[key] ?? i.status,
            label_snapshot: `${i.codigo} — ${i.nome}`,
          };
        }),
      });
      onSalvo();
      onClose();
    } catch (e) {
      console.error("Itens Alocados: falha ao salvar checklist", e);
      setErro("Não foi possível salvar o checklist. Se o problema persistir, entre em contato com o suporte.");
    } finally {
      setSalvando(false);
    }
  }

  const inputStyle = {
    width: "100%" as const,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
  };

  return (
    <ModalBase onClose={onClose} maxWidth={860}>
      <ModalHeader title="Checklist do Set" onClose={onClose} />
      <p style={{ margin: "-12px 0 16px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{localLabel}</p>

      <div
        role="tablist"
        aria-label="Checklist"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
        onKeyDown={(e) =>
          onFiltroBarTabsKeyDown(
            e,
            tabs.map((tb) => tb.id),
            setAba,
            (k) => `tab-chk-ia-${k}`,
          )
        }
      >
        {tabs.map((tb) => (
          <FiltroBarTabButton
            key={tb.id}
            id={`tab-chk-ia-${tb.id}`}
            active={aba === tb.id}
            aria-controls={`panel-chk-ia-${tb.id}`}
            onClick={() => setAba(tb.id)}
            icon={tb.icon}
          >
            {tb.label}
          </FiltroBarTabButton>
        ))}
      </div>

      {erro ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
          {erro}
        </div>
      ) : null}

      <ModalTabPanel active={aba === "itens"} id="panel-chk-ia-itens" labelledBy="tab-chk-ia-itens">
        <div className="app-table-wrap" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: 520 })}>
            <caption style={{ display: "none" }}>Itens do checklist</caption>
            <thead>
              <tr>
                <th scope="col" style={dataTable.thHeader}>
                  Código
                </th>
                <th scope="col" style={dataTable.thHeader}>
                  Nome
                </th>
                <th scope="col" style={dataTable.thHeader}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ ...dataTable.tdCenter, padding: 32, color: t.textMuted }}>
                    Nenhum item neste local.
                  </td>
                </tr>
              ) : (
                itens.map((i, idx) => {
                  const key = `${i.entidade_tipo}:${i.entidade_id}`;
                  return (
                    <tr key={key} style={{ background: dataTable.zebraRow(idx) }}>
                      <td style={{ ...dataTable.tdCenter, fontWeight: 600 }}>{i.codigo}</td>
                      <td style={dataTable.tdCenter}>{i.nome}</td>
                      <td style={dataTable.tdCenter}>
                        <select
                          aria-label={`Status de ${i.nome}`}
                          value={statusMap[key] ?? i.status}
                          onChange={(e) =>
                            setStatusMap((prev) => ({ ...prev, [key]: e.target.value as ItemAlocadoStatus }))
                          }
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: `1px solid ${t.cardBorder}`,
                            background: t.inputBg,
                            color: t.text,
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: FONT.body,
                          }}
                        >
                          {STATUS_OPTS.map((s) => (
                            <option key={s} value={s}>
                              {ITEM_ALOCADO_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </ModalTabPanel>

      <ModalTabPanel active={aba === "anotacoes"} id="panel-chk-ia-anotacoes" labelledBy="tab-chk-ia-anotacoes">
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
              Tipo de Verificação
              <CampoObrigatorioMark />
            </label>
            <select
              value={tipoVerificacao}
              onChange={(e) => setTipoVerificacao(e.target.value as TipoVerificacaoChecklist | "")}
              style={inputStyle}
              aria-required
            >
              <option value="">Selecione…</option>
              {(Object.keys(TIPO_VERIFICACAO_LABEL) as TipoVerificacaoChecklist[]).map((k) => (
                <option key={k} value={k}>
                  {TIPO_VERIFICACAO_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
              Observação
              <CampoObrigatorioMark />
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={5}
              placeholder="Descreva a verificação realizada…"
              style={{ ...inputStyle, resize: "vertical", minHeight: 110 }}
              aria-required
            />
          </div>
        </div>
      </ModalTabPanel>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={salvando || itens.length === 0}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: salvando || itens.length === 0 ? "not-allowed" : "pointer",
            opacity: salvando || itens.length === 0 ? 0.7 : 1,
            background: getCtaCriarGradient(brand),
          }}
        >
          {salvando ? "Salvando…" : "Salvar Checklist"}
        </button>
      </div>
    </ModalBase>
  );
}
