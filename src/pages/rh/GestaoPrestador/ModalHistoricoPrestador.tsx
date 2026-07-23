import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ListaHistoricoRh } from "../../../components/rh/ListaHistoricoRh";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import type { RhFuncionario, RhFuncionarioHistorico } from "../../../types/rhFuncionario";
import {
  FILTRO_TIPO_ACAO_HIST_PRESTADOR_OPTS,
  type FiltroTipoAcaoHistoricoPrestador,
} from "./gestaoPrestadorHelpers";

type Props = {
  row: RhFuncionario;
  items: RhFuncionarioHistorico[];
  itemsFiltrados: RhFuncionarioHistorico[];
  loading: boolean;
  filtroTipo: FiltroTipoAcaoHistoricoPrestador;
  onFiltroTipoChange: (v: FiltroTipoAcaoHistoricoPrestador) => void;
  onClose: () => void;
  t: Theme;
};

/** Modal de histórico do prestador (filtro por tipo de ação + lista). */
export function ModalHistoricoPrestador({
  row,
  items,
  itemsFiltrados,
  loading,
  filtroTipo,
  onFiltroTipoChange,
  onClose,
  t,
}: Props) {
  return (
    <ModalBase maxWidth={720} onClose={onClose}>
      <ModalHeader title="Histórico" onClose={onClose} />
      <div style={{ padding: "0 4px 16px", fontFamily: FONT.body }}>
        <div style={{ marginBottom: 12, fontSize: 13, color: t.textMuted }}>
          <strong style={{ color: t.text }}>{row.nome}</strong>
        </div>
        <label
          htmlFor="filtro-tipo-acao-historico-prestador"
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 700,
            color: t.textMuted,
            marginBottom: 6,
            fontFamily: FONT.body,
          }}
        >
          Tipo de ação
        </label>
        <select
          id="filtro-tipo-acao-historico-prestador"
          aria-label="Filtrar por tipo de ação"
          value={filtroTipo}
          onChange={(e) => onFiltroTipoChange(e.target.value as FiltroTipoAcaoHistoricoPrestador)}
          style={{
            width: "100%",
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          {FILTRO_TIPO_ACAO_HIST_PRESTADOR_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div style={{ maxHeight: "min(60vh, 480px)", overflowY: "auto", paddingRight: 2 }}>
          <ListaHistoricoRh
            items={itemsFiltrados}
            loading={loading}
            t={t}
            emptyMessage={
              items.length === 0 && !loading
                ? "Sem dados para o período selecionado."
                : "Nenhum registro deste tipo no histórico."
            }
          />
        </div>
      </div>
    </ModalBase>
  );
}
