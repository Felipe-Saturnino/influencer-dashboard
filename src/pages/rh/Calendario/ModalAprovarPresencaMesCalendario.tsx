import { useState } from "react";
import type { CSSProperties } from "react";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import {
  subtituloMesAnoPresencaPt,
  type PresencaMesAprovacaoLinha,
} from "../../../lib/rhCalendarioPresencaGestao";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";

type Props = {
  open: boolean;
  refMes: Date;
  linhas: PresencaMesAprovacaoLinha[];
  onClose: () => void;
  onAprovarTodos: () => Promise<boolean>;
  t: Theme;
  brand: ReturnType<typeof useDashboardBrand>;
};

export function ModalAprovarPresencaMesCalendario({
  open,
  refMes,
  linhas,
  onClose,
  onAprovarTodos,
  t,
  brand,
}: Props) {
  const dataTable = useDataTableBlock();
  const [err, setErr] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!open) return null;

  const btnPrimario: CSSProperties = {
    padding: "10px 20px",
    borderRadius: 10,
    border: "none",
    background: getCtaCriarGradient(brand),
    color: "#fff",
    fontWeight: 700,
    fontFamily: FONT.body,
    fontSize: 13,
    cursor: salvando ? "not-allowed" : "pointer",
    opacity: salvando ? 0.7 : 1,
  };

  const aprovarTodos = async () => {
    setErr(null);
    setSalvando(true);
    const ok = await onAprovarTodos();
    setSalvando(false);
    if (!ok) {
      setErr("Não foi possível aprovar a presença. Se o problema persistir, entre em contato com o suporte.");
    }
  };

  return (
    <ModalBase maxWidth={720} onClose={onClose} zIndex={1300}>
      <ModalHeader title="Aprovar Presença" onClose={onClose} />
      <p
        style={{
          margin: "0 0 16px",
          color: t.textMuted,
          fontSize: 13,
          fontFamily: FONT.body,
        }}
      >
        {subtituloMesAnoPresencaPt(refMes)}
      </p>

      <div className="app-table-wrap" style={{ ...getDataTableWrapStyle(), marginBottom: 16 }}>
        <table style={getDataTableStyle({ minWidth: 560 })}>
          <caption style={{ display: "none" }}>
            Presença do mês — dias escalados com horários realizados e status
          </caption>
          <thead>
            <tr>
              <th scope="col" style={dataTable.thHeader}>
                Data
              </th>
              <th scope="col" style={dataTable.thHeader}>
                Entrada Realizada
              </th>
              <th scope="col" style={dataTable.thHeader}>
                Saída Realizada
              </th>
              <th scope="col" style={dataTable.thHeader}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr style={{ background: dataTable.zebraRow(0) }}>
                <td colSpan={4} style={{ ...dataTable.tdCenter, color: t.textMuted, padding: "24px 12px" }}>
                  Nenhum dia escalado neste mês.
                </td>
              </tr>
            ) : (
              linhas.map((linha, i) => (
                <tr key={linha.diaIso} style={{ background: dataTable.zebraRow(i) }}>
                  <td style={dataTable.tdCenter}>{linha.dataLabel}</td>
                  <td style={dataTable.tdCenter}>{linha.entRealExib}</td>
                  <td style={dataTable.tdCenter}>{linha.saiRealExib}</td>
                  <td style={dataTable.tdCenter}>{linha.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {err ? (
        <div
          role="alert"
          aria-live="polite"
          style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
        >
          {err}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => void aprovarTodos()} disabled={salvando || linhas.length === 0} style={btnPrimario}>
          {salvando ? "Aprovando…" : "Aprovar Todos"}
        </button>
      </div>
    </ModalBase>
  );
}
