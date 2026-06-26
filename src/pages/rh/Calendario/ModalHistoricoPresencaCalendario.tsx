import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import {
  PRESENCA_HISTORICO_LABEL,
  type PresencaHistoricoItem,
} from "../../../lib/rhCalendarioPresencaGestao";

type Props = {
  open: boolean;
  dia: Date;
  historico: PresencaHistoricoItem[];
  onClose: () => void;
  t: Theme;
};

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DAYS_LONG = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function subtituloHistoricoPresencaPt(d: Date): string {
  const dow = (DAYS_LONG[d.getDay()] ?? "").replace("-feira", "");
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = MONTHS[d.getMonth()] ?? "";
  return `${dow}, ${dia} de ${mes}`;
}

function fmtHistoricoDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function ModalHistoricoPresencaCalendario({ open, dia, historico, onClose, t }: Props) {
  const dataTable = useDataTableBlock();
  if (!open) return null;

  const ordenado = [...historico].sort((a, b) => b.em.localeCompare(a.em));

  return (
    <ModalBase maxWidth={560} onClose={onClose} zIndex={1300}>
      <ModalHeader title="Histórico de presença" onClose={onClose} />
      <p
        style={{
          margin: "0 0 16px",
          color: t.textMuted,
          fontSize: 13,
          fontFamily: FONT.body,
        }}
      >
        {subtituloHistoricoPresencaPt(dia)}
      </p>
      {ordenado.length === 0 ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Nenhuma ação registrada neste dia.
        </div>
      ) : (
        <div className="app-table-wrap" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: 480 })}>
            <caption style={{ display: "none" }}>Histórico de ações de presença do dia</caption>
            <thead>
              <tr>
                <th scope="col" style={dataTable.thHeader}>
                  Ação
                </th>
                <th scope="col" style={dataTable.thHeader}>
                  Data/hora
                </th>
                <th scope="col" style={dataTable.thHeader}>
                  Usuário
                </th>
              </tr>
            </thead>
            <tbody>
              {ordenado.map((item, i) => (
                <tr key={`${item.em}-${item.tipo}-${i}`} style={{ background: dataTable.zebraRow(i) }}>
                  <td style={dataTable.tdCenter}>{PRESENCA_HISTORICO_LABEL[item.tipo]}</td>
                  <td style={dataTable.tdCenter}>{fmtHistoricoDataHora(item.em)}</td>
                  <td style={dataTable.tdCenter}>{item.por}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontWeight: 700,
            fontFamily: FONT.body,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Fechar
        </button>
      </div>
    </ModalBase>
  );
}
