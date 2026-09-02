import { useMemo, useState } from "react";
import { ClipboardPlus, History } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { SectionTitle } from "../../../components/dashboard";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { formatDiaCurto, labelTurnoCurto } from "./helpers";
import type { ControleTurnoTurno } from "./types";

type StatusPresenca = "presente" | "atraso" | "falta" | "pendente" | "saida_antecipada" | "hora_adicional";

type RowPresenca = {
  id: string;
  nome: string;
  nick: string;
  time: string;
  entrada: string;
  saida: string;
  status: StatusPresenca;
  registrado: boolean;
};

const STATUS_LABEL: Record<StatusPresenca, string> = {
  presente: "Presente",
  atraso: "Atraso",
  falta: "Falta",
  pendente: "Pendente",
  saida_antecipada: "Saída antecipada",
  hora_adicional: "Hora adicional",
};

const STATUS_COR: Record<StatusPresenca, string> = {
  presente: "#22c55e",
  atraso: "#f59e0b",
  falta: "#e84025",
  pendente: "#6b7280",
  saida_antecipada: "#f59e0b",
  hora_adicional: "#a78bfa",
};

const SEED: RowPresenca[] = [
  { id: "ana", nome: "Ana Souza", nick: "AnaS", time: "Game Presenter", entrada: "06:58", saida: "", status: "presente", registrado: false },
  { id: "bruno", nome: "Bruno Lima", nick: "BrunoL", time: "Game Presenter", entrada: "07:12", saida: "", status: "atraso", registrado: false },
  { id: "carla", nome: "Carla Dias", nick: "CarlaD", time: "Game Presenter", entrada: "", saida: "", status: "falta", registrado: false },
  { id: "diego", nome: "Diego Alves", nick: "DiegoA", time: "Shuffler", entrada: "06:55", saida: "15:02", status: "presente", registrado: false },
  { id: "elena", nome: "Elena Costa", nick: "ElenaC", time: "Shuffler", entrada: "", saida: "", status: "pendente", registrado: false },
];

type Props = {
  diaIso: string;
  turno: ControleTurnoTurno;
  busca: string;
};

export function AbaEscala({ diaIso, turno, busca }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const [rows, setRows] = useState(SEED);

  const filtradas = useMemo(
    () =>
      rows.filter((r) =>
        textoContemBuscaEmAlgum(busca, r.nome, r.nick, r.time, STATUS_LABEL[r.status]),
      ),
    [rows, busca],
  );

  const gps = rows.filter((r) => r.time === "Game Presenter");
  const shuf = rows.filter((r) => r.time === "Shuffler");
  const sub = `— ${labelTurnoCurto(turno)} · ${formatDiaCurto(diaIso)}`;

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub={sub.slice(2)}>Consolidado</SectionTitle>
        <div className="app-grid-2" style={{ gap: 12 }}>
          <KpiTime
            titulo="Game Presenters"
            n={gps.length}
            presentes={gps.filter((r) => r.status === "presente" || r.status === "atraso").length}
            faltas={gps.filter((r) => r.status === "falta").length}
            t={t}
          />
          <KpiTime
            titulo="Shuffler"
            n={shuf.length}
            presentes={shuf.filter((r) => r.status === "presente" || r.status === "atraso").length}
            faltas={shuf.filter((r) => r.status === "falta").length}
            t={t}
          />
        </div>
      </div>

      <div style={pageBox}>
        <SectionTitle sub="prestadores do dia/turno">Controle de Presença</SectionTitle>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          Dados de demonstração nesta entrega — a persistência e o modal Registrar serão ligados em seguida.
        </p>
        <div className="app-table-wrap" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: 720 })}>
            <caption style={{ display: "none" }}>Controle de presença do turno</caption>
            <thead>
              <tr>
                <th scope="col" style={dataTable.thHeader}>Nome</th>
                <th scope="col" style={dataTable.thHeader}>Nickname</th>
                <th scope="col" style={dataTable.thHeader}>Time</th>
                <th scope="col" style={dataTable.thHeader}>Entrada</th>
                <th scope="col" style={dataTable.thHeader}>Saída</th>
                <th scope="col" style={dataTable.thHeader}>Status</th>
                <th scope="col" style={dataTable.thHeader}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...dataTable.tdCenter, color: t.textMuted, padding: 24 }}>
                    Sem dados para o período selecionado.
                  </td>
                </tr>
              ) : (
                filtradas.map((r, i) => (
                  <tr key={r.id} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={{ ...dataTable.tdCenter, textAlign: "left" }}>{r.nome}</td>
                    <td style={dataTable.tdCenter}>{r.nick}</td>
                    <td style={dataTable.tdCenter}>{r.time}</td>
                    <td style={dataTable.tdCenter}>{r.entrada || "—"}</td>
                    <td style={dataTable.tdCenter}>{r.saida || "—"}</td>
                    <td style={dataTable.tdCenter}>
                      <span
                        style={{
                          display: "inline-flex",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: 20,
                          background: `${STATUS_COR[r.status]}22`,
                          color: STATUS_COR[r.status],
                          border: `1px solid ${STATUS_COR[r.status]}44`,
                        }}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "inline-flex", gap: 6, justifyContent: "center" }}>
                        {!r.registrado ? (
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Registrar")}
                            onClick={() =>
                              setRows((prev) =>
                                prev.map((x) => (x.id === r.id ? { ...x, registrado: true } : x)),
                              )
                            }
                          >
                            <ClipboardPlus size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                        ) : null}
                        <BtnIconeAcaoLinha label={tooltipAcao("Histórico")} onClick={() => undefined}>
                          <History size={13} aria-hidden />
                        </BtnIconeAcaoLinha>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function KpiTime({
  titulo,
  n,
  presentes,
  faltas,
  t,
}: {
  titulo: string;
  n: number;
  presentes: number;
  faltas: number;
  t: { text: string; textMuted: string; cardBorder: string; inputBg: string };
}) {
  return (
    <div
      style={{
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 12,
        padding: 14,
        background: t.inputBg,
        fontFamily: FONT.body,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: t.text, marginBottom: 6 }}>{titulo}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: t.text }}>{n}</div>
      <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 8 }}>Escalados</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e" }}>Presentes {presentes}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#e84025" }}>Faltas {faltas}</span>
      </div>
    </div>
  );
}
