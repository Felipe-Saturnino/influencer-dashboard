import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import type { SmSinalRow } from "../../../lib/smSinaisTypes";
import {
  formatTimestampUtc,
  labelEstudioSinal,
  labelJogoSinal,
  labelMesaSinal,
  labelRelatorSinal,
  labelSmAtendente,
  labelSmSinal,
} from "../../../lib/smSinaisHelpers";

function Campo({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  const { theme: t } = useApp();
  return (
    <div style={{ minWidth: 0, ...(fullWidth ? { gridColumn: "1 / -1" } : null) }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.06em",
          color: t.textMuted,
          fontFamily: FONT.body,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: t.text,
          fontFamily: FONT.body,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

const row2 = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
} as const;

const row3 = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
} as const;

export function ModalVerSinal({ sinal, onClose }: { sinal: SmSinalRow; onClose: () => void }) {
  return (
    <ModalBase onClose={onClose} maxWidth={720}>
      <ModalHeader title="Ver Sinal" onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={row2}>
          <Campo label="ID do Sinal" value={sinal.signal_id} />
          <Campo label="Data/Hora UTC do Sinal" value={formatTimestampUtc(sinal.issued_at)} />
        </div>
        <div style={row2}>
          <Campo label="Motivo" value={labelSmSinal(sinal)} />
          <Campo label="Relator" value={labelRelatorSinal(sinal)} />
        </div>
        <div style={row2}>
          <Campo label="Data/Hora UTC de Atendimento" value={formatTimestampUtc(sinal.taken_at)} />
          <Campo label="Atendente" value={labelSmAtendente(sinal)} />
        </div>
        <div style={row3}>
          <Campo label="Mesa" value={labelMesaSinal(sinal)} />
          <Campo label="Jogo" value={labelJogoSinal(sinal)} />
          <Campo label="Estúdio" value={labelEstudioSinal(sinal)} />
        </div>
        <div style={row2}>
          <Campo label="Data/Hora UTC da Resolução" value={formatTimestampUtc(sinal.timer_stopped_at)} />
          <Campo label="Resolução" value={(sinal.resolution_conclusion ?? "").trim() || "—"} />
        </div>
      </div>
    </ModalBase>
  );
}
