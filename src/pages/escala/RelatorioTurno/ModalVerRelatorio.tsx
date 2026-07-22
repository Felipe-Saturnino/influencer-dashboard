import type { ReactNode } from "react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import {
  contagemManutencoes,
  formatDataBr,
  labelTurno,
  totaisRelatorioTurno,
  type RelatorioEstudioRow,
  type RelatorioTurnoRow,
} from "../../../lib/escalaRelatorioTurno";

export function ModalVerRelatorioTurno({
  row,
  onClose,
}: {
  row: RelatorioTurnoRow;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const totais = totaisRelatorioTurno(row);
  const blocos = row.escala_relatorio_turno_estudio ?? [];
  const shuf = row.escala_relatorio_turno_shuffler;

  return (
    <ModalBase onClose={onClose} maxWidth={720}>
      <ModalHeader title="Relatório do Turno" onClose={onClose} />
      <div style={{ padding: "0 20px 20px", maxHeight: "70dvh", overflowY: "auto", fontFamily: FONT.body }}>
        <MetaLinha
          data={formatDataBr(row.data)}
          turno={labelTurno(row.turno)}
          relator={row.relator_nome}
          extra={`Escalados: ${totais.escalados} · Absenteísmo: ${totais.absenteismo}`}
        />
        {blocos.map((b) => (
          <Bloco key={b.estudio_slug} titulo={b.estudio_nome}>
            <p style={{ margin: "0 0 6px", fontSize: 13 }}>
              GP Escalados: <strong>{b.gp_escalados}</strong> · Absenteísmo:{" "}
              <strong>{b.absenteismo}</strong>
            </p>
            <p style={{ margin: 0, fontSize: 13, whiteSpace: "pre-wrap", color: t.text }}>{b.resumo}</p>
          </Bloco>
        ))}
        {shuf ? (
          <Bloco titulo="Shufflers">
            <p style={{ margin: "0 0 6px", fontSize: 13 }}>
              Shuffler Escalados: <strong>{shuf.shuffler_escalados}</strong> · Absenteísmo:{" "}
              <strong>{shuf.absenteismo}</strong>
            </p>
            <p style={{ margin: 0, fontSize: 13, whiteSpace: "pre-wrap" }}>{shuf.resumo}</p>
          </Bloco>
        ) : null}
        <Bloco titulo="Geral">
          <p style={{ margin: 0, fontSize: 13, whiteSpace: "pre-wrap" }}>{row.geral}</p>
        </Bloco>
      </div>
    </ModalBase>
  );
}

export function ModalVerRelatorioEstudio({
  row,
  onClose,
}: {
  row: RelatorioEstudioRow;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const m = row.manutencao;
  const cnt = contagemManutencoes(m);

  return (
    <ModalBase onClose={onClose} maxWidth={720}>
      <ModalHeader title="Relatório de Estúdio" onClose={onClose} />
      <div style={{ padding: "0 20px 20px", maxHeight: "70dvh", overflowY: "auto", fontFamily: FONT.body }}>
        <MetaLinha
          data={formatDataBr(row.data)}
          turno={labelTurno(row.turno)}
          relator={row.relator_nome}
          extra={`SOS: ${row.sos} · Sinais: ${row.sinais} · Payout: ${row.payout} · Manutenções: ${cnt.feitos} / ${cnt.total}`}
        />
        <Bloco titulo="Resumo">
          <p style={{ margin: 0, fontSize: 13, whiteSpace: "pre-wrap" }}>{row.resumo}</p>
        </Bloco>
        <Bloco titulo="Manutenção">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: t.textMuted }}>Roletas</div>
          {(m.roletas ?? []).length === 0 ? (
            <p style={{ margin: "0 0 10px", fontSize: 13, color: t.textMuted }}>—</p>
          ) : (
            (m.roletas ?? []).map((r) => (
              <p key={r.key} style={{ margin: "0 0 4px", fontSize: 13 }}>
                {r.feito ? "✓" : "○"} {r.label}
              </p>
            ))
          )}
          <div style={{ fontSize: 12, fontWeight: 700, margin: "10px 0 6px", color: t.textMuted }}>Mesas</div>
          {(m.mesas ?? []).map((x) => (
            <p key={x.slug} style={{ margin: "0 0 4px", fontSize: 13 }}>
              {x.feito ? "✓" : "○"} {x.nome}
            </p>
          ))}
          <p style={{ margin: "10px 0 4px", fontSize: 13 }}>
            CC Machine: <strong>{m.cc_machine ? "Concluído" : "Pendente"}</strong>
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Cartas Contadas: <strong>{m.cartas_contadas ? "Concluído" : "Pendente"}</strong>
          </p>
        </Bloco>
      </div>
    </ModalBase>
  );
}

function MetaLinha({
  data,
  turno,
  relator,
  extra,
}: {
  data: string;
  turno: string;
  relator: string;
  extra: string;
}) {
  const { theme: t } = useApp();
  return (
    <div style={{ marginBottom: 14, fontSize: 13, color: t.textMuted }}>
      <strong style={{ color: t.text }}>{data}</strong> · {turno} · {relator}
      <div style={{ marginTop: 4 }}>{extra}</div>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { theme: t } = useApp();
  return (
    <div
      style={{
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        background: t.inputBg,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 8,
          color: t.text,
        }}
      >
        {titulo}
      </div>
      {children}
    </div>
  );
}
