import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ClipboardPlus, History, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { SectionTitle } from "../../../components/dashboard";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import {
  getPageContentBoxRadius,
  getPageContentBoxStyle,
} from "../../../lib/pageContentBoxStyles";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import {
  MSG_ERRO_CT,
  MSG_ERRO_CT_SALVAR,
  getCurrentUserNome,
  listHistoricoPresenca,
  listPresencaDiaTurno,
  upsertPresencaRegistro,
  type CtPresencaRegistroRow,
  type CtPresencaRow,
  type CtPresencaStatus,
  type CtPresencaTipo,
} from "../../../lib/escalaControleTurno";
import { formatDiaBr, formatDiaCurto, labelTurnoCurto } from "./helpers";
import { CONTROLE_TURNO_TURNO_LABEL, type ControleTurnoTurno } from "./types";

const STATUS_LABEL: Record<CtPresencaStatus, string> = {
  presente: "Presente",
  atraso: "Atraso",
  falta: "Falta",
  pendente: "Pendente",
  saida_antecipada: "Saída antecipada",
  hora_adicional: "Hora adicional",
};

const STATUS_COR: Record<CtPresencaStatus, string> = {
  presente: "#22c55e",
  atraso: "#f59e0b",
  falta: "#e84025",
  pendente: "#6b7280",
  saida_antecipada: "#f59e0b",
  hora_adicional: "#a78bfa",
};

const TIPO_LABEL: Record<CtPresencaTipo, string> = {
  falta: "Falta",
  saida_antecipada: "Saída Antecipada",
  hora_adicional: "Hora Adicional",
  registrar_horario: "Registrar Horário",
};

const TIPO_OPCOES: readonly CtPresencaTipo[] = [
  "falta",
  "saida_antecipada",
  "hora_adicional",
  "registrar_horario",
];

const MOTIVO_LABEL: Record<CtPresencaTipo, string> = {
  falta: "Motivo da Falta",
  saida_antecipada: "Motivo da Saída Antecipada",
  hora_adicional: "Motivo da Hora Adicional",
  registrar_horario: "Comentário",
};

const MOTIVO_PLACEHOLDER: Record<CtPresencaTipo, string> = {
  falta: "Descreva o motivo da falta...",
  saida_antecipada: "Descreva o motivo da saída antecipada...",
  hora_adicional: "Descreva o motivo da hora adicional...",
  registrar_horario: "Comentário sobre o horário...",
};

const MOTIVO_ERRO: Record<CtPresencaTipo, string> = {
  falta: "Preencha o Motivo da Falta.",
  saida_antecipada: "Preencha o Motivo da Saída Antecipada.",
  hora_adicional: "Preencha o Motivo da Hora Adicional.",
  registrar_horario: "Preencha o Comentário.",
};

const STATUS_PRESENTES: readonly CtPresencaStatus[] = [
  "presente",
  "atraso",
  "saida_antecipada",
  "hora_adicional",
];

type GrupoTime = "gp" | "shuffler";

function grupoDoTime(time: string): GrupoTime {
  return time.toLowerCase().includes("shuffler") ? "shuffler" : "gp";
}

function labelCampoStyle(t: { text: string }): CSSProperties {
  return {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: t.text,
    marginBottom: 6,
    fontFamily: FONT.body,
  };
}

function inputStyle(t: { text: string; inputBg: string; cardBorder: string }): CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    boxSizing: "border-box",
  };
}

type Props = {
  diaIso: string;
  turno: ControleTurnoTurno;
  busca: string;
};

export function AbaEscala({ diaIso, turno, busca }: Props) {
  const { theme: t, dadosUsuarioEfetivo } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_controle_turno");
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const liderancaNome = getCurrentUserNome(dadosUsuarioEfetivo?.name);
  const podeRegistrar = perm.canCriarOk || perm.canEditarOk;

  const [rows, setRows] = useState<CtPresencaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroPagina, setErroPagina] = useState("");

  const [alvoRegistrar, setAlvoRegistrar] = useState<CtPresencaRow | null>(null);
  const [tipo, setTipo] = useState<CtPresencaTipo | "">("");
  const [entrada, setEntrada] = useState("");
  const [saida, setSaida] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erroModal, setErroModal] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [alvoHistorico, setAlvoHistorico] = useState<CtPresencaRow | null>(null);
  const [historico, setHistorico] = useState<CtPresencaRegistroRow[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [erroHistorico, setErroHistorico] = useState("");
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [filtroTime, setFiltroTime] = useState<"gp" | "shuffler" | null>(null);

  const loadSeq = useRef(0);
  const rowHoverBg = t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";

  const carregar = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setErroPagina("");
    try {
      const lista = await listPresencaDiaTurno(diaIso, turno);
      if (seq !== loadSeq.current) return;
      setRows(lista);
    } catch (e) {
      if (seq !== loadSeq.current) return;
      console.error(e);
      setRows([]);
      setErroPagina(MSG_ERRO_CT);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [diaIso, turno]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    setFiltroTime(null);
  }, [diaIso, turno]);

  const filtradas = useMemo(
    () =>
      rows.filter((r) => {
        if (filtroTime && grupoDoTime(r.time) !== filtroTime) return false;
        return textoContemBuscaEmAlgum(
          busca,
          r.nome,
          r.nickname,
          r.time,
          r.estudio,
          STATUS_LABEL[r.status],
        );
      }),
    [rows, busca, filtroTime],
  );

  const gps = useMemo(() => rows.filter((r) => grupoDoTime(r.time) === "gp"), [rows]);
  const shufflers = useMemo(() => rows.filter((r) => grupoDoTime(r.time) === "shuffler"), [rows]);
  const sub = `${labelTurnoCurto(turno)} · ${formatDiaCurto(diaIso)}`;

  function abrirRegistrar(row: CtPresencaRow) {
    setAlvoRegistrar(row);
    setTipo("");
    setEntrada(row.entrada);
    setSaida(row.saida);
    setMotivo("");
    setErroModal("");
  }

  function fecharRegistrar() {
    setAlvoRegistrar(null);
    setErroModal("");
  }

  async function salvarRegistro() {
    if (!alvoRegistrar || !podeRegistrar) return;
    if (!tipo) {
      setErroModal("Selecione o Status.");
      return;
    }
    if (tipo !== "falta") {
      if (!entrada) {
        setErroModal("Informe a Entrada realizada.");
        return;
      }
      if (!saida) {
        setErroModal("Informe a Saída realizada.");
        return;
      }
    }
    if (!motivo.trim()) {
      setErroModal(MOTIVO_ERRO[tipo]);
      return;
    }

    setSalvando(true);
    setErroModal("");
    try {
      await upsertPresencaRegistro({
        data: diaIso,
        turno,
        prestadorId: alvoRegistrar.id,
        tipo,
        entrada,
        saida,
        motivo,
        liderancaNome,
      });
      fecharRegistrar();
      await carregar();
    } catch (e) {
      console.error(e);
      setErroModal(MSG_ERRO_CT_SALVAR);
    } finally {
      setSalvando(false);
    }
  }

  async function abrirHistorico(row: CtPresencaRow) {
    setAlvoHistorico(row);
    setHistorico([]);
    setErroHistorico("");
    setLoadingHistorico(true);
    try {
      const lista = await listHistoricoPresenca(row.id, diaIso);
      setHistorico(lista);
    } catch (e) {
      console.error(e);
      setErroHistorico(MSG_ERRO_CT);
    } finally {
      setLoadingHistorico(false);
    }
  }

  return (
    <>
      {erroPagina ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginBottom: 14,
            color: "#e84025",
            fontSize: 12,
            fontFamily: FONT.body,
          }}
        >
          {erroPagina}
        </div>
      ) : null}

      <div style={pageBox}>
        <SectionTitle sub={sub}>Consolidado</SectionTitle>
        <div className="app-grid-2" style={{ gap: 12 }}>
          <KpiTime
            titulo="Game Presenters"
            rows={gps}
            t={t}
            brand={brand}
            active={filtroTime === "gp"}
            onClick={() => setFiltroTime((prev) => (prev === "gp" ? null : "gp"))}
          />
          <KpiTime
            titulo="Shuffler"
            rows={shufflers}
            t={t}
            brand={brand}
            active={filtroTime === "shuffler"}
            onClick={() => setFiltroTime((prev) => (prev === "shuffler" ? null : "shuffler"))}
          />
        </div>
      </div>

      <div style={pageBox}>
        <SectionTitle sub="prestadores do dia/turno">Controle de Presença</SectionTitle>
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px 0",
              gap: 8,
            }}
          >
            <Loader2
              size={18}
              className="app-lucide-spin"
              color="var(--brand-primary, #7c3aed)"
              aria-hidden
            />
            <span style={{ fontSize: 13, fontFamily: FONT.body, color: t.textMuted }}>
              Carregando…
            </span>
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 800 })}>
              <caption style={{ display: "none" }}>Controle de presença do turno</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>Nome</th>
                  <th scope="col" style={dataTable.thHeader}>Nickname</th>
                  <th scope="col" style={dataTable.thHeader}>Time</th>
                  <th scope="col" style={dataTable.thHeader}>Estúdio</th>
                  <th scope="col" style={dataTable.thHeader}>Entrada</th>
                  <th scope="col" style={dataTable.thHeader}>Saída</th>
                  <th scope="col" style={dataTable.thHeader}>Status</th>
                  <th scope="col" style={dataTable.thHeader}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...dataTable.tdCenter, color: t.textMuted, padding: 24 }}>
                      Sem dados para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  filtradas.map((r, i) => (
                    <tr
                      key={r.id}
                      style={{
                        background: hoverKey === r.id ? rowHoverBg : dataTable.zebraRow(i),
                      }}
                      onMouseEnter={() => setHoverKey(r.id)}
                      onMouseLeave={() => setHoverKey(null)}
                    >
                      <td style={dataTable.tdCenter}>{r.nome}</td>
                      <td style={dataTable.tdCenter}>{r.nickname || "—"}</td>
                      <td style={dataTable.tdCenter}>{r.time || "—"}</td>
                      <td style={dataTable.tdCenter}>{r.estudio || "—"}</td>
                      <td style={dataTable.tdCenter}>{r.entrada || "—"}</td>
                      <td style={dataTable.tdCenter}>{r.saida || "—"}</td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
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
                              whiteSpace: "nowrap",
                            }}
                          >
                            {STATUS_LABEL[r.status]}
                          </span>
                        </div>
                      </td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "inline-flex", gap: 6, justifyContent: "center" }}>
                          {podeRegistrar && !r.registrado ? (
                            <BtnIconeAcaoLinha
                              label={tooltipAcao("Registrar")}
                              onClick={() => abrirRegistrar(r)}
                            >
                              <ClipboardPlus size={13} aria-hidden />
                            </BtnIconeAcaoLinha>
                          ) : null}
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Histórico")}
                            onClick={() => void abrirHistorico(r)}
                          >
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
        )}
      </div>

      {alvoRegistrar ? (
        <ModalBase onClose={fecharRegistrar} maxWidth={560}>
          <ModalHeader title="Registrar" onClose={fecharRegistrar} />
          <div style={{ padding: "0 4px 8px" }}>
            {erroModal ? (
              <div
                role="alert"
                aria-live="polite"
                style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
              >
                {erroModal}
              </div>
            ) : null}

            <p
              style={{
                margin: "0 0 14px",
                fontSize: 12,
                color: t.textMuted,
                fontFamily: FONT.body,
              }}
            >
              {alvoRegistrar.nome}
              {alvoRegistrar.nickname ? ` · ${alvoRegistrar.nickname}` : ""} ·{" "}
              {CONTROLE_TURNO_TURNO_LABEL[turno]} · {formatDiaBr(diaIso)}
            </p>

            <div style={{ marginBottom: 12 }}>
              <label htmlFor="ct-reg-status" style={labelCampoStyle(t)}>
                Status
                <CampoObrigatorioMark />
              </label>
              <select
                id="ct-reg-status"
                aria-label="Status"
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value as CtPresencaTipo | "");
                  setErroModal("");
                }}
                style={inputStyle(t)}
              >
                <option value="">Selecionar...</option>
                {TIPO_OPCOES.map((op) => (
                  <option key={op} value={op}>
                    {TIPO_LABEL[op]}
                  </option>
                ))}
              </select>
            </div>

            {tipo && tipo !== "falta" ? (
              <div className="app-grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label htmlFor="ct-reg-entrada" style={labelCampoStyle(t)}>
                    Entrada realizada
                    <CampoObrigatorioMark />
                  </label>
                  <input
                    id="ct-reg-entrada"
                    type="time"
                    value={entrada}
                    onChange={(e) => setEntrada(e.target.value)}
                    style={inputStyle(t)}
                  />
                </div>
                <div>
                  <label htmlFor="ct-reg-saida" style={labelCampoStyle(t)}>
                    Saída realizada
                    <CampoObrigatorioMark />
                  </label>
                  <input
                    id="ct-reg-saida"
                    type="time"
                    value={saida}
                    onChange={(e) => setSaida(e.target.value)}
                    style={inputStyle(t)}
                  />
                </div>
              </div>
            ) : null}

            {tipo ? (
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="ct-reg-motivo" style={labelCampoStyle(t)}>
                  {MOTIVO_LABEL[tipo]}
                  <CampoObrigatorioMark />
                </label>
                <textarea
                  id="ct-reg-motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder={MOTIVO_PLACEHOLDER[tipo]}
                  rows={4}
                  style={{ ...inputStyle(t), resize: "vertical" }}
                />
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={salvando}
                onClick={() => void salvarRegistro()}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: getCtaCriarGradient(brand),
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: salvando ? "not-allowed" : "pointer",
                }}
              >
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}

      {alvoHistorico ? (
        <ModalBase onClose={() => setAlvoHistorico(null)} maxWidth={640}>
          <ModalHeader title="Histórico" onClose={() => setAlvoHistorico(null)} />
          <div style={{ padding: "0 4px 8px" }}>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: 12,
                color: t.textMuted,
                fontFamily: FONT.body,
              }}
            >
              {alvoHistorico.nome}
              {alvoHistorico.nickname ? ` · ${alvoHistorico.nickname}` : ""}
            </p>

            {erroHistorico ? (
              <div
                role="alert"
                aria-live="polite"
                style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}
              >
                {erroHistorico}
              </div>
            ) : loadingHistorico ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px 0",
                  gap: 8,
                }}
              >
                <Loader2
                  size={18}
                  className="app-lucide-spin"
                  color="var(--brand-primary, #7c3aed)"
                  aria-hidden
                />
                <span style={{ fontSize: 13, fontFamily: FONT.body, color: t.textMuted }}>
                  Carregando…
                </span>
              </div>
            ) : historico.length === 0 ? (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  color: t.textMuted,
                  fontSize: 13,
                  fontFamily: FONT.body,
                }}
              >
                Nenhum registro de presença para este prestador.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {historico.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      border: `1px solid ${t.cardBorder}`,
                      borderRadius: 10,
                      padding: 12,
                      background: t.inputBg,
                      fontFamily: FONT.body,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                        {TIPO_LABEL[h.tipo]}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: 20,
                          background: `${STATUS_COR[h.status_presenca]}22`,
                          color: STATUS_COR[h.status_presenca],
                          border: `1px solid ${STATUS_COR[h.status_presenca]}44`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {STATUS_LABEL[h.status_presenca]}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 6 }}>
                      {formatDiaBr(h.data)} · {CONTROLE_TURNO_TURNO_LABEL[h.turno]} ·{" "}
                      {h.entrada_hhmm || "—"} → {h.saida_hhmm || "—"} ·{" "}
                      {h.lideranca_nome || "—"}
                    </div>
                    <div
                      style={{ fontSize: 13, color: t.text, whiteSpace: "pre-wrap" }}
                    >
                      {h.motivo || "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ModalBase>
      ) : null}
    </>
  );
}

function KpiTime({
  titulo,
  rows,
  t,
  brand,
  active,
  onClick,
}: {
  titulo: string;
  rows: CtPresencaRow[];
  t: {
    text: string;
    textMuted: string;
    cardBorder: string;
    inputBg: string;
    isDark: boolean;
  };
  brand: ReturnType<typeof useDashboardBrand>;
  active: boolean;
  onClick: () => void;
}) {
  const presentes = rows.filter((r) => STATUS_PRESENTES.includes(r.status)).length;
  const faltas = rows.filter((r) => r.status === "falta").length;
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`Filtrar por ${titulo}`}
      onClick={onClick}
      style={{
        border: active
          ? `1.5px solid ${brand.accent ?? brand.primary}`
          : `1px solid ${t.cardBorder}`,
        borderRadius: getPageContentBoxRadius(t.isDark),
        padding: "12px 14px",
        background: active
          ? `color-mix(in srgb, ${brand.accent ?? brand.primary} 12%, ${t.inputBg})`
          : t.inputBg,
        fontFamily: FONT.body,
        textAlign: "center",
        cursor: "pointer",
        width: "100%",
        boxShadow: active
          ? `0 0 0 1px color-mix(in srgb, ${brand.accent ?? brand.primary} 25%, transparent)`
          : "none",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: t.textMuted,
          marginBottom: 4,
        }}
      >
        {titulo}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: brand.primary,
          lineHeight: 1.1,
          marginBottom: 4,
        }}
      >
        {rows.length}
      </div>
      <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 8 }}>Escalados</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>
          Presentes {presentes}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#e84025" }}>Faltas {faltas}</span>
      </div>
    </button>
  );
}
