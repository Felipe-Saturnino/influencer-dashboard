import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Ban, Check, Eye, Loader2, Pencil } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { BarraPesquisaFiltroPainel } from "../../../components/BarraPesquisaFiltroPainel";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { SectionTitle } from "../../../components/dashboard";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { textoContemBusca, textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { placeholderPesquisaFiltro } from "../../../lib/searchBarConstants";
import {
  MSG_ERRO_CT,
  MSG_ERRO_CT_SALVAR,
  createAusencia,
  createFechamentos,
  createFeedback,
  createManutencao,
  getCurrentUserNome,
  listAusencias,
  listEstudiosAtivos,
  listFechamentos,
  listFeedbacks,
  listManutencoes,
  listMesasForFechamento,
  listPrestadoresGpShuffler,
  locaisManutFromEstudios,
  updateAusencia,
  updateFechamento,
  updateFeedback,
  updateManutencao,
  type CtAusenciaRow,
  type CtEstudioOpt,
  type CtFeedbackRecomendacao,
  type CtFeedbackRow,
  type CtFechamentoRow,
  type CtManutTipo,
  type CtManutencaoRow,
  type CtMesaOpt,
  type CtMotivoAusencia,
  type CtPrestadorOpt,
} from "../../../lib/escalaControleTurno";
import { formatDiaBr, formatDiaCurto } from "./helpers";

export type AbaNotificacoesProps = {
  diaIso: string;
  busca: string;
};

const RECOMENDACAO_LABEL: Record<CtFeedbackRecomendacao, string> = {
  orientacao: "Orientação",
  alinhamento: "Alinhamento de Execução",
  notif_descumprimento: "Notificação de Descumprimento Contratual",
  notif_suspensao: "Notificação de Suspensão da Execução Contratual",
  persistencia: "Persistência do Descumprimento",
};

const MANUT_TIPO_LABEL: Record<CtManutTipo, string> = {
  ti: "TI",
  limpeza: "Limpeza",
  tech_ops: "Tech Ops",
};

const MANUT_STATUS_LABEL = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
} as const;

type MesaDraft = {
  fechamento: string;
  reabertura: string;
  naoReaberta: boolean;
  observacao: string;
};

function motivoAusLabel(m: CtMotivoAusencia): string {
  return m === "medico" ? "Médico" : "Pessoal";
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 20,
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function TagDiaAnterior({ t }: { t: { textMuted: string; cardBorder: string; inputBg: string } }) {
  return (
    <span
      style={{
        marginLeft: 6,
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 999,
        color: t.textMuted,
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg,
        whiteSpace: "nowrap",
        verticalAlign: "middle",
      }}
    >
      Dia anterior
    </span>
  );
}

function CampoDetalhe({ label, children }: { label: string; children: ReactNode }) {
  const { theme: t } = useApp();
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: t.text, fontFamily: FONT.body }}>{children}</div>
    </div>
  );
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

function PrestadorSelect({
  value,
  onChange,
  prestadores,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  prestadores: CtPrestadorOpt[];
  disabled?: boolean;
}) {
  const { theme: t } = useApp();
  const [open, setOpen] = useState(false);
  const [buscaPainel, setBuscaPainel] = useState("");

  const filtrados = useMemo(
    () => prestadores.filter((p) => textoContemBuscaEmAlgum(buscaPainel, p.nome, p.time)),
    [buscaPainel, prestadores],
  );
  const selecionado = prestadores.find((p) => p.id === value);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Prestador"
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
          setBuscaPainel("");
        }}
        style={{
          ...inputStyle(t),
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {selecionado ? (
          <span>
            {selecionado.nome}
            <span style={{ color: t.textMuted, fontSize: 11 }}> · {selecionado.time}</span>
          </span>
        ) : (
          <span style={{ color: t.textMuted }}>Selecionar prestador...</span>
        )}
      </button>
      {open ? (
        <div
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 20,
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            borderRadius: 12,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            boxShadow: t.isDark ? "0 8px 24px rgba(0,0,0,0.35)" : "0 8px 24px rgba(0,0,0,0.12)",
            padding: 8,
            maxHeight: 280,
            overflow: "auto",
          }}
        >
          <BarraPesquisaFiltroPainel
            value={buscaPainel}
            onChange={setBuscaPainel}
            placeholder={placeholderPesquisaFiltro("Prestador")}
            aria-label="Pesquisar Prestador"
          />
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
            {filtrados.length === 0 ? (
              <div style={{ padding: 12, color: t.textMuted, fontSize: 12, fontFamily: FONT.body }}>
                Nenhum prestador encontrado.
              </div>
            ) : (
              filtrados.map((p) => {
                const on = p.id === value;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    tabIndex={-1}
                    onClick={() => {
                      onChange(p.id);
                      setOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: on
                        ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)"
                        : "transparent",
                      color: t.text,
                      fontSize: 13,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>
                      {p.nome}
                      <span style={{ color: t.textMuted, fontSize: 11 }}> · {p.time}</span>
                    </span>
                    {on ? <Check size={14} aria-hidden /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MesaMultiSelect({
  selected,
  onToggle,
  mesas,
  locked,
  mesaLabelFn,
}: {
  selected: Record<string, MesaDraft>;
  onToggle: (id: string) => void;
  mesas: CtMesaOpt[];
  locked?: boolean;
  mesaLabelFn: (id: string) => string;
}) {
  const { theme: t } = useApp();
  const [open, setOpen] = useState(false);
  const [buscaPainel, setBuscaPainel] = useState("");
  const ids = Object.keys(selected);

  const filtrados = useMemo(
    () => mesas.filter((m) => textoContemBusca(m.label, buscaPainel)),
    [buscaPainel, mesas],
  );

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        disabled={locked}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Mesas"
        onClick={() => {
          if (locked) return;
          setOpen((v) => !v);
          setBuscaPainel("");
        }}
        style={{
          ...inputStyle(t),
          minHeight: 44,
          textAlign: "left",
          cursor: locked ? "not-allowed" : "pointer",
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
          opacity: locked ? 0.7 : 1,
        }}
      >
        {ids.length === 0 ? (
          <span style={{ color: t.textMuted }}>Selecionar mesas...</span>
        ) : (
          ids.map((id) => (
            <span
              key={id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--brand-primary, #7c3aed) 30%, transparent)",
              }}
            >
              {mesaLabelFn(id)}
              {!locked ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remover ${mesaLabelFn(id)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggle(id);
                    }
                  }}
                  style={{ cursor: "pointer", lineHeight: 1 }}
                >
                  ×
                </span>
              ) : null}
            </span>
          ))
        )}
      </button>
      {open && !locked ? (
        <div
          role="listbox"
          aria-multiselectable
          style={{
            position: "absolute",
            zIndex: 20,
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            borderRadius: 12,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            boxShadow: t.isDark ? "0 8px 24px rgba(0,0,0,0.35)" : "0 8px 24px rgba(0,0,0,0.12)",
            padding: 8,
            maxHeight: 280,
            overflow: "auto",
          }}
        >
          <BarraPesquisaFiltroPainel
            value={buscaPainel}
            onChange={setBuscaPainel}
            placeholder={placeholderPesquisaFiltro("Mesa")}
            aria-label="Pesquisar Mesa"
          />
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
            {filtrados.length === 0 ? (
              <div style={{ padding: 12, color: t.textMuted, fontSize: 12, fontFamily: FONT.body }}>
                Nenhuma mesa encontrada.
              </div>
            ) : (
              filtrados.map((m) => {
                const on = !!selected[m.id];
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    tabIndex={-1}
                    onClick={() => onToggle(m.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: on
                        ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)"
                        : "transparent",
                      color: t.text,
                      fontSize: 13,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {m.label}
                    {on ? <Check size={14} aria-hidden /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BlocoCabecalho({
  title,
  sub,
  ctaLabel,
  onCta,
  showCta,
}: {
  title: string;
  sub: string;
  ctaLabel: string;
  onCta: () => void;
  showCta: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 14,
      }}
    >
      <SectionTitle compact sub={sub}>
        {title}
      </SectionTitle>
      {showCta ? <CtaCriarButton onClick={onCta}>{ctaLabel}</CtaCriarButton> : null}
    </div>
  );
}

function EmptyDia({ msg }: { msg: string }) {
  const { theme: t } = useApp();
  return (
    <div
      style={{
        padding: "40px 0",
        textAlign: "center",
        color: t.textMuted,
        fontSize: 13,
        fontFamily: FONT.body,
      }}
    >
      {msg}
    </div>
  );
}

function LoadingBloco() {
  const { theme: t } = useApp();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0", gap: 8 }}>
      <Loader2 size={18} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
      <span style={{ fontSize: 13, fontFamily: FONT.body, color: t.textMuted }}>Carregando…</span>
    </div>
  );
}

export default function AbaNotificacoes({ diaIso, busca }: AbaNotificacoesProps) {
  const { theme: t, dadosUsuarioEfetivo } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_controle_turno");
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const diaSub = formatDiaCurto(diaIso);
  const liderancaNome = getCurrentUserNome(dadosUsuarioEfetivo?.name);

  const [mesas, setMesas] = useState<CtMesaOpt[]>([]);
  const [prestadores, setPrestadores] = useState<CtPrestadorOpt[]>([]);
  const [estudios, setEstudios] = useState<CtEstudioOpt[]>([]);
  const [fechamentos, setFechamentos] = useState<CtFechamentoRow[]>([]);
  const [ausencias, setAusencias] = useState<CtAusenciaRow[]>([]);
  const [feedbacks, setFeedbacks] = useState<CtFeedbackRow[]>([]);
  const [manutencoes, setManutencoes] = useState<CtManutencaoRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [erroPagina, setErroPagina] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const [modalFechamento, setModalFechamento] = useState(false);
  const [fechEditId, setFechEditId] = useState<string | null>(null);
  const [fechEditMesaId, setFechEditMesaId] = useState<string | null>(null);
  const [mesasDraft, setMesasDraft] = useState<Record<string, MesaDraft>>({});
  const [fechErro, setFechErro] = useState("");
  const [verFechamento, setVerFechamento] = useState<CtFechamentoRow | null>(null);

  const [modalAusencia, setModalAusencia] = useState(false);
  const [ausEditId, setAusEditId] = useState<string | null>(null);
  const [ausForm, setAusForm] = useState({
    prestadorId: "",
    motivo: "" as "" | CtMotivoAusencia,
    inicio: "",
    fim: "",
    fimNaoInformado: false,
    observacao: "",
  });
  const [ausErro, setAusErro] = useState("");
  const [verAusencia, setVerAusencia] = useState<CtAusenciaRow | null>(null);

  const [modalFeedback, setModalFeedback] = useState(false);
  const [fbForm, setFbForm] = useState({
    prestadorId: "",
    recomendacao: "" as "" | CtFeedbackRecomendacao,
    observacao: "",
  });
  const [fbErro, setFbErro] = useState("");
  const [verFeedback, setVerFeedback] = useState<CtFeedbackRow | null>(null);
  const [avisoAplicar, setAvisoAplicar] = useState("");

  const [modalManut, setModalManut] = useState(false);
  const [manutForm, setManutForm] = useState({
    tipo: "" as "" | CtManutTipo,
    local: "",
    mesaId: "",
    observacao: "",
  });
  const [manutErro, setManutErro] = useState("");
  const [verManut, setVerManut] = useState<CtManutencaoRow | null>(null);
  const [cancelManutId, setCancelManutId] = useState<string | null>(null);

  const locaisManut = useMemo(() => locaisManutFromEstudios(estudios), [estudios]);
  const mesaById = useMemo(() => new Map(mesas.map((m) => [m.id, m])), [mesas]);

  const mesaLabelFn = useCallback(
    (id: string) => mesaById.get(id)?.label ?? id,
    [mesaById],
  );

  const carregarDia = useCallback(async () => {
    setLoading(true);
    setErroPagina("");
    try {
      const [f, a, fb, m] = await Promise.all([
        listFechamentos(diaIso),
        listAusencias(diaIso),
        listFeedbacks(diaIso),
        listManutencoes(diaIso),
      ]);
      setFechamentos(f);
      setAusencias(a);
      setFeedbacks(fb);
      setManutencoes(m);
    } catch (e) {
      console.error(e);
      setErroPagina(MSG_ERRO_CT);
      setFechamentos([]);
      setAusencias([]);
      setFeedbacks([]);
      setManutencoes([]);
    } finally {
      setLoading(false);
    }
  }, [diaIso]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [mesasList, prestList, estList] = await Promise.all([
          listMesasForFechamento(),
          listPrestadoresGpShuffler(),
          listEstudiosAtivos(),
        ]);
        if (cancelled) return;
        setMesas(mesasList);
        setPrestadores(prestList);
        setEstudios(estList);
      } catch (e) {
        console.error(e);
        if (!cancelled) setErroPagina(MSG_ERRO_CT);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void carregarDia();
  }, [carregarDia]);

  const fechVisiveis = useMemo(() => {
    return fechamentos.filter((f) => textoContemBusca(f.mesa_label, busca));
  }, [fechamentos, busca]);

  const ausVisiveis = useMemo(() => {
    return ausencias.filter((a) =>
      textoContemBuscaEmAlgum(
        busca,
        a.prestador_nome,
        motivoAusLabel(a.motivo),
        a.lideranca_nome,
        a.observacao,
      ),
    );
  }, [ausencias, busca]);

  const fbVisiveis = useMemo(() => {
    return feedbacks.filter((f) =>
      textoContemBuscaEmAlgum(
        busca,
        formatDiaBr(f.data_registro),
        f.prestador_nome,
        RECOMENDACAO_LABEL[f.recomendacao],
        f.status,
        f.lideranca_nome,
        f.aplicado_por_nome,
        f.observacao,
      ),
    );
  }, [feedbacks, busca]);

  function localManutLabel(value: string): string {
    return locaisManut.find((l) => l.value === value)?.label ?? value ?? "—";
  }

  function localEhEstudio(value: string): boolean {
    return locaisManut.find((l) => l.value === value)?.tipo === "estudio";
  }

  function mesaManutLabel(mesaRef: string | null, localValue: string): string {
    if (!localEhEstudio(localValue)) return "—";
    if (!mesaRef) return "—";
    if (mesaRef === "estudio_geral") return "Estúdio Geral";
    return mesaLabelFn(mesaRef);
  }

  function localExibicaoTabela(m: CtManutencaoRow): string {
    const base = localManutLabel(m.local_key);
    if (!localEhEstudio(m.local_key)) return base;
    const mesa = mesaManutLabel(m.mesa_ref, m.local_key);
    return mesa && mesa !== "—" ? `${base} · ${mesa}` : base;
  }

  const manutVisiveis = useMemo(() => {
    return manutencoes.filter((m) =>
      textoContemBuscaEmAlgum(
        busca,
        formatDiaBr(m.abertura),
        m.solicitante_nome,
        MANUT_TIPO_LABEL[m.tipo],
        localExibicaoTabela(m),
        MANUT_STATUS_LABEL[m.status],
        m.observacao,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- localExibicao depends on mesas/locais
  }, [manutencoes, busca, mesas, locaisManut]);

  function abrirRegistrarFechamento() {
    setFechEditId(null);
    setFechEditMesaId(null);
    setMesasDraft({});
    setFechErro("");
    setModalFechamento(true);
  }

  function abrirEditarFechamento(row: CtFechamentoRow) {
    setFechEditId(row.id);
    setFechEditMesaId(row.mesa_id);
    setMesasDraft({
      [row.mesa_id]: {
        fechamento: row.hora_fechamento,
        reabertura: row.hora_reabertura ?? "",
        naoReaberta: row.nao_reaberta,
        observacao: row.observacao,
      },
    });
    setFechErro("");
    setModalFechamento(true);
  }

  function toggleMesaDraft(id: string) {
    setMesasDraft((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return {
        ...prev,
        [id]: { fechamento: "", reabertura: "", naoReaberta: false, observacao: "" },
      };
    });
  }

  async function salvarFechamento() {
    const ids = Object.keys(mesasDraft);
    if (!ids.length) {
      setFechErro("Selecione ao menos uma mesa.");
      return;
    }
    for (const id of ids) {
      const st = mesasDraft[id]!;
      if (!st.fechamento) {
        setFechErro("Informe a Hora de Fechamento de todas as mesas selecionadas.");
        return;
      }
      if (!st.naoReaberta && !st.reabertura) {
        setFechErro("Informe a Hora de Reabertura ou marque que a mesa ainda não foi reaberta.");
        return;
      }
      if (!st.observacao.trim()) {
        setFechErro("Preencha a Observação com o motivo do fechamento de todas as mesas selecionadas.");
        return;
      }
    }

    setSalvando(true);
    setFechErro("");
    try {
      if (fechEditId && fechEditMesaId) {
        const st = mesasDraft[fechEditMesaId]!;
        const existing = fechamentos.find((f) => f.id === fechEditId);
        const setLiderancaReaberturaAtual =
          !st.naoReaberta &&
          (!existing ||
            existing.nao_reaberta ||
            existing.hora_reabertura !== st.reabertura ||
            !existing.lideranca_reabertura_nome);
        await updateFechamento({
          id: fechEditId,
          horaFechamento: st.fechamento,
          horaReabertura: st.naoReaberta ? null : st.reabertura,
          naoReaberta: st.naoReaberta,
          observacao: st.observacao,
          liderancaFechamentoNome: existing?.lideranca_fechamento_nome || liderancaNome,
          liderancaReaberturaNome: existing?.lideranca_reabertura_nome || "",
          setLiderancaReaberturaAtual,
          liderancaNomeAtual: liderancaNome,
        });
      } else {
        await createFechamentos({
          dataRegistro: diaIso,
          liderancaNome,
          mesas: ids.map((mesaId) => {
            const st = mesasDraft[mesaId]!;
            return {
              mesaId,
              horaFechamento: st.fechamento,
              horaReabertura: st.naoReaberta ? null : st.reabertura,
              naoReaberta: st.naoReaberta,
              observacao: st.observacao,
            };
          }),
        });
      }
      setModalFechamento(false);
      await carregarDia();
    } catch (e) {
      console.error(e);
      setFechErro(MSG_ERRO_CT_SALVAR);
    } finally {
      setSalvando(false);
    }
  }

  function abrirRegistrarAusencia() {
    setAusEditId(null);
    setAusForm({
      prestadorId: "",
      motivo: "",
      inicio: "",
      fim: "",
      fimNaoInformado: false,
      observacao: "",
    });
    setAusErro("");
    setModalAusencia(true);
  }

  function abrirEditarAusencia(row: CtAusenciaRow) {
    setAusEditId(row.id);
    setAusForm({
      prestadorId: row.prestador_id,
      motivo: row.motivo,
      inicio: row.inicio,
      fim: row.fim_nao_informado ? "" : row.fim ?? "",
      fimNaoInformado: row.fim_nao_informado,
      observacao: row.observacao,
    });
    setAusErro("");
    setModalAusencia(true);
  }

  async function salvarAusencia() {
    if (!ausForm.prestadorId) {
      setAusErro("Selecione o Prestador.");
      return;
    }
    if (!ausForm.motivo) {
      setAusErro("Selecione o Motivo.");
      return;
    }
    if (!ausForm.inicio) {
      setAusErro("Informe o Início da Ausência.");
      return;
    }
    if (!ausForm.fimNaoInformado && !ausForm.fim) {
      setAusErro("Informe o Fim da Ausência ou marque Não informado.");
      return;
    }
    if (!ausForm.fimNaoInformado && ausForm.fim < ausForm.inicio) {
      setAusErro("O Fim da Ausência deve ser após o Início.");
      return;
    }
    if (!ausForm.observacao.trim()) {
      setAusErro("Preencha a Observação.");
      return;
    }

    setSalvando(true);
    setAusErro("");
    try {
      if (ausEditId) {
        await updateAusencia({
          id: ausEditId,
          prestadorId: ausForm.prestadorId,
          motivo: ausForm.motivo,
          inicio: ausForm.inicio,
          fim: ausForm.fimNaoInformado ? null : ausForm.fim,
          fimNaoInformado: ausForm.fimNaoInformado,
          observacao: ausForm.observacao,
        });
      } else {
        await createAusencia({
          prestadorId: ausForm.prestadorId,
          motivo: ausForm.motivo,
          inicio: ausForm.inicio,
          fim: ausForm.fimNaoInformado ? null : ausForm.fim,
          fimNaoInformado: ausForm.fimNaoInformado,
          observacao: ausForm.observacao,
          liderancaNome,
        });
      }
      setModalAusencia(false);
      await carregarDia();
    } catch (e) {
      console.error(e);
      setAusErro(MSG_ERRO_CT_SALVAR);
    } finally {
      setSalvando(false);
    }
  }

  function abrirRegistrarFeedback() {
    setFbForm({ prestadorId: "", recomendacao: "", observacao: "" });
    setFbErro("");
    setModalFeedback(true);
  }

  async function salvarFeedback() {
    if (!fbForm.prestadorId) {
      setFbErro("Selecione o Prestador.");
      return;
    }
    if (!fbForm.recomendacao) {
      setFbErro("Selecione a Recomendação.");
      return;
    }
    if (!fbForm.observacao.trim()) {
      setFbErro("Preencha a Observação.");
      return;
    }

    setSalvando(true);
    setFbErro("");
    try {
      await createFeedback({
        dataRegistro: diaIso,
        prestadorId: fbForm.prestadorId,
        recomendacao: fbForm.recomendacao,
        observacao: fbForm.observacao,
        liderancaNome,
      });
      setModalFeedback(false);
      await carregarDia();
    } catch (e) {
      console.error(e);
      setFbErro(MSG_ERRO_CT_SALVAR);
    } finally {
      setSalvando(false);
    }
  }

  async function aplicarFeedback(row: CtFeedbackRow) {
    if (!perm.canEditarOk) return;
    setAvisoAplicar("");
    try {
      await updateFeedback({
        id: row.id,
        status: "aplicado",
        aplicadoPorNome: liderancaNome,
      });
      await carregarDia();
    } catch (e) {
      console.error(e);
      setAvisoAplicar(MSG_ERRO_CT_SALVAR);
      window.setTimeout(() => setAvisoAplicar(""), 4000);
    }
  }

  function abrirSolicitarManutencao() {
    setManutForm({ tipo: "", local: "", mesaId: "", observacao: "" });
    setManutErro("");
    setModalManut(true);
  }

  async function salvarManutencao() {
    if (!manutForm.tipo) {
      setManutErro("Selecione o Tipo.");
      return;
    }
    if (!manutForm.local) {
      setManutErro("Selecione o Local.");
      return;
    }
    if (localEhEstudio(manutForm.local) && !manutForm.mesaId) {
      setManutErro("Selecione a Mesa.");
      return;
    }
    if (!manutForm.observacao.trim()) {
      setManutErro("Preencha a Observação.");
      return;
    }

    setSalvando(true);
    setManutErro("");
    try {
      await createManutencao({
        abertura: diaIso,
        tipo: manutForm.tipo,
        localKey: manutForm.local,
        mesaRef: localEhEstudio(manutForm.local) ? manutForm.mesaId : null,
        observacao: manutForm.observacao,
        solicitanteNome: liderancaNome,
      });
      setModalManut(false);
      await carregarDia();
    } catch (e) {
      console.error(e);
      setManutErro(MSG_ERRO_CT_SALVAR);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarCancelarManutencao() {
    if (!cancelManutId) return;
    setSalvando(true);
    try {
      await updateManutencao({ id: cancelManutId, status: "cancelado" });
      setCancelManutId(null);
      await carregarDia();
    } catch (e) {
      console.error(e);
      setErroPagina(MSG_ERRO_CT_SALVAR);
    } finally {
      setSalvando(false);
    }
  }

  const mesasDoLocal = useMemo(() => {
    const meta = locaisManut.find((l) => l.value === manutForm.local);
    if (!meta?.estudioSlug) return [];
    return mesas.filter((m) => m.estudioSlug === meta.estudioSlug);
  }, [manutForm.local, locaisManut, mesas]);

  const rowHoverBg = t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";

  function trStyle(key: string, i: number): CSSProperties {
    return {
      background: hoverKey === key ? rowHoverBg : dataTable.zebraRow(i),
    };
  }

  const podeCriar = perm.canCriarOk;
  const podeEditar = perm.canEditarOk;

  return (
    <>
      {erroPagina ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(232,64,37,0.12)",
            border: "1px solid rgba(232,64,37,0.35)",
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          {erroPagina}
        </div>
      ) : null}

      {avisoAplicar ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.35)",
            color: "#f59e0b",
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          {avisoAplicar}
        </div>
      ) : null}

      <div style={pageBox}>
        <BlocoCabecalho
          title="Fechamento de Mesa"
          sub={diaSub}
          ctaLabel="Registrar Fechamento"
          onCta={abrirRegistrarFechamento}
          showCta={podeCriar}
        />
        {loading ? (
          <LoadingBloco />
        ) : fechVisiveis.length === 0 ? (
          <EmptyDia msg="Sem fechamentos registrados no dia." />
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 720 })}>
              <caption style={{ display: "none" }}>Fechamentos de mesa do dia</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>Mesa</th>
                  <th scope="col" style={dataTable.thHeader}>Hora de Fechamento</th>
                  <th scope="col" style={dataTable.thHeader}>Hora de Reabertura</th>
                  <th scope="col" style={dataTable.thHeader}>Status</th>
                  <th scope="col" style={dataTable.thHeader}>Liderança</th>
                  <th scope="col" style={dataTable.thHeader}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {fechVisiveis.map((f, i) => {
                  const herdado = (f.data_registro || diaIso) < diaIso;
                  const lideranca = f.nao_reaberta
                    ? f.lideranca_fechamento_nome || "—"
                    : f.lideranca_reabertura_nome || f.lideranca_fechamento_nome || "—";
                  const key = `fech-${f.id}`;
                  return (
                    <tr
                      key={f.id}
                      style={trStyle(key, i)}
                      onMouseEnter={() => setHoverKey(key)}
                      onMouseLeave={() => setHoverKey(null)}
                    >
                      <td style={dataTable.tdCenter}>
                        {f.mesa_label}
                        {herdado ? <TagDiaAnterior t={t} /> : null}
                      </td>
                      <td style={dataTable.tdCenter}>{f.hora_fechamento || "—"}</td>
                      <td style={dataTable.tdCenter}>{f.nao_reaberta ? "—" : f.hora_reabertura || "—"}</td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          {f.nao_reaberta ? (
                            <StatusPill label="Não aberta" color="#f59e0b" />
                          ) : (
                            <StatusPill label="Reaberta" color="#22c55e" />
                          )}
                        </div>
                      </td>
                      <td style={dataTable.tdCenter}>{lideranca}</td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "inline-flex", gap: 6, justifyContent: "center" }}>
                          <BtnIconeAcaoLinha label={tooltipAcao("Ver")} onClick={() => setVerFechamento(f)}>
                            <Eye size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                          {podeEditar ? (
                            <BtnIconeAcaoLinha
                              label={tooltipAcao("Editar")}
                              onClick={() => abrirEditarFechamento(f)}
                            >
                              <Pencil size={13} aria-hidden />
                            </BtnIconeAcaoLinha>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={pageBox}>
        <BlocoCabecalho
          title="Ausências"
          sub={diaSub}
          ctaLabel="Registrar Ausência"
          onCta={abrirRegistrarAusencia}
          showCta={podeCriar}
        />
        {loading ? (
          <LoadingBloco />
        ) : ausVisiveis.length === 0 ? (
          <EmptyDia msg="Sem ausências registradas no dia." />
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 720 })}>
              <caption style={{ display: "none" }}>Ausências do dia</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>Prestador</th>
                  <th scope="col" style={dataTable.thHeader}>Motivo</th>
                  <th scope="col" style={dataTable.thHeader}>Início da Ausência</th>
                  <th scope="col" style={dataTable.thHeader}>Fim da Ausência</th>
                  <th scope="col" style={dataTable.thHeader}>Liderança</th>
                  <th scope="col" style={dataTable.thHeader}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {ausVisiveis.map((a, i) => {
                  const key = `aus-${a.id}`;
                  return (
                    <tr
                      key={a.id}
                      style={trStyle(key, i)}
                      onMouseEnter={() => setHoverKey(key)}
                      onMouseLeave={() => setHoverKey(null)}
                    >
                      <td style={dataTable.tdCenter}>{a.prestador_nome}</td>
                      <td style={dataTable.tdCenter}>{motivoAusLabel(a.motivo)}</td>
                      <td style={dataTable.tdCenter}>{formatDiaBr(a.inicio)}</td>
                      <td style={dataTable.tdCenter}>
                        {a.fim_nao_informado ? "Não informado" : formatDiaBr(a.fim ?? "")}
                      </td>
                      <td style={dataTable.tdCenter}>{a.lideranca_nome || "—"}</td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "inline-flex", gap: 6, justifyContent: "center" }}>
                          <BtnIconeAcaoLinha label={tooltipAcao("Ver")} onClick={() => setVerAusencia(a)}>
                            <Eye size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                          {podeEditar ? (
                            <BtnIconeAcaoLinha
                              label={tooltipAcao("Editar")}
                              onClick={() => abrirEditarAusencia(a)}
                            >
                              <Pencil size={13} aria-hidden />
                            </BtnIconeAcaoLinha>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={pageBox}>
        <BlocoCabecalho
          title="Feedbacks"
          sub={diaSub}
          ctaLabel="Registrar Feedback"
          onCta={abrirRegistrarFeedback}
          showCta={podeCriar}
        />
        {loading ? (
          <LoadingBloco />
        ) : fbVisiveis.length === 0 ? (
          <EmptyDia msg="Sem feedbacks registrados no dia." />
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 800 })}>
              <caption style={{ display: "none" }}>Feedbacks do dia</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>Data do Registro</th>
                  <th scope="col" style={dataTable.thHeader}>Prestador</th>
                  <th scope="col" style={dataTable.thHeader}>Recomendação</th>
                  <th scope="col" style={dataTable.thHeader}>Status</th>
                  <th scope="col" style={dataTable.thHeader}>Liderança</th>
                  <th scope="col" style={dataTable.thHeader}>Aplicado Por</th>
                  <th scope="col" style={dataTable.thHeader}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {fbVisiveis.map((f, i) => {
                  const key = `fb-${f.id}`;
                  return (
                    <tr
                      key={f.id}
                      style={trStyle(key, i)}
                      onMouseEnter={() => setHoverKey(key)}
                      onMouseLeave={() => setHoverKey(null)}
                    >
                      <td style={dataTable.tdCenter}>{formatDiaBr(f.data_registro)}</td>
                      <td style={dataTable.tdCenter}>{f.prestador_nome}</td>
                      <td style={dataTable.tdCenter}>
                        {RECOMENDACAO_LABEL[f.recomendacao]}
                      </td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          {f.status === "aplicado" ? (
                            <StatusPill label="Aplicado" color="#22c55e" />
                          ) : (
                            <StatusPill label="Revisar" color="#f59e0b" />
                          )}
                        </div>
                      </td>
                      <td style={dataTable.tdCenter}>{f.lideranca_nome || "—"}</td>
                      <td style={dataTable.tdCenter}>
                        {f.status === "aplicado" ? f.aplicado_por_nome || "—" : "—"}
                      </td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "inline-flex", gap: 6, justifyContent: "center" }}>
                          <BtnIconeAcaoLinha label={tooltipAcao("Ver")} onClick={() => setVerFeedback(f)}>
                            <Eye size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                          {f.status === "revisar" && podeEditar ? (
                            <BtnIconeAcaoLinha
                              label={tooltipAcao("Aplicar")}
                              onClick={() => void aplicarFeedback(f)}
                            >
                              <Check size={13} aria-hidden />
                            </BtnIconeAcaoLinha>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={pageBox}>
        <BlocoCabecalho
          title="Solicitação de Manutenção"
          sub={diaSub}
          ctaLabel="Solicitar Manutenção"
          onCta={abrirSolicitarManutencao}
          showCta={podeCriar}
        />
        {loading ? (
          <LoadingBloco />
        ) : manutVisiveis.length === 0 ? (
          <EmptyDia msg="Sem solicitações de manutenção no dia." />
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 720 })}>
              <caption style={{ display: "none" }}>Solicitações de manutenção do dia</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>Abertura</th>
                  <th scope="col" style={dataTable.thHeader}>Solicitante</th>
                  <th scope="col" style={dataTable.thHeader}>Tipo</th>
                  <th scope="col" style={dataTable.thHeader}>Local</th>
                  <th scope="col" style={dataTable.thHeader}>Status</th>
                  <th scope="col" style={dataTable.thHeader}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {manutVisiveis.map((m, i) => {
                  const key = `manut-${m.id}`;
                  const podeCancelar =
                    podeEditar && (m.status === "aberto" || m.status === "em_andamento");
                  const statusColor =
                    m.status === "concluido"
                      ? "#22c55e"
                      : m.status === "cancelado"
                        ? "#e84025"
                        : "#f59e0b";
                  return (
                    <tr
                      key={m.id}
                      style={trStyle(key, i)}
                      onMouseEnter={() => setHoverKey(key)}
                      onMouseLeave={() => setHoverKey(null)}
                    >
                      <td style={dataTable.tdCenter}>{formatDiaBr(m.abertura)}</td>
                      <td style={dataTable.tdCenter}>
                        {m.solicitante_nome || "—"}
                      </td>
                      <td style={dataTable.tdCenter}>{MANUT_TIPO_LABEL[m.tipo]}</td>
                      <td style={dataTable.tdCenter}>{localExibicaoTabela(m)}</td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <StatusPill label={MANUT_STATUS_LABEL[m.status]} color={statusColor} />
                        </div>
                      </td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "inline-flex", gap: 6, justifyContent: "center" }}>
                          <BtnIconeAcaoLinha label={tooltipAcao("Ver")} onClick={() => setVerManut(m)}>
                            <Eye size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                          {podeCancelar ? (
                            <BtnIconeAcaoLinha
                              label={tooltipAcao("Cancelar")}
                              onClick={() => setCancelManutId(m.id)}
                              style={{
                                color: "#e84025",
                                borderColor: "rgba(232,64,37,0.35)",
                              }}
                            >
                              <Ban size={13} aria-hidden />
                            </BtnIconeAcaoLinha>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalFechamento ? (
        <ModalBase onClose={() => setModalFechamento(false)} maxWidth={720}>
          <ModalHeader
            title={fechEditId ? "Editar Fechamento" : "Registrar Fechamento"}
            onClose={() => setModalFechamento(false)}
          />
          <div style={{ padding: "0 4px 8px" }}>
            {fechErro ? (
              <div
                role="alert"
                aria-live="polite"
                style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
              >
                {fechErro}
              </div>
            ) : null}
            <div style={{ marginBottom: 14 }}>
              <label style={labelCampoStyle(t)}>
                Mesas
                <CampoObrigatorioMark />
              </label>
              <MesaMultiSelect
                selected={mesasDraft}
                onToggle={toggleMesaDraft}
                mesas={mesas}
                locked={!!fechEditId}
                mesaLabelFn={mesaLabelFn}
              />
            </div>
            {Object.keys(mesasDraft).map((id) => {
              const st = mesasDraft[id]!;
              return (
                <div
                  key={id}
                  style={{
                    marginBottom: 14,
                    padding: 14,
                    borderRadius: 12,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, fontFamily: FONT.body }}>
                    {mesaLabelFn(id)}
                  </div>
                  <div className="app-grid-2" style={{ gap: 12, marginBottom: 10 }}>
                    <div>
                      <label style={labelCampoStyle(t)}>
                        Hora de Fechamento
                        <CampoObrigatorioMark />
                      </label>
                      <input
                        type="time"
                        value={st.fechamento}
                        onChange={(e) =>
                          setMesasDraft((prev) => ({
                            ...prev,
                            [id]: { ...prev[id]!, fechamento: e.target.value },
                          }))
                        }
                        style={inputStyle(t)}
                        aria-label={`Hora de Fechamento — ${mesaLabelFn(id)}`}
                      />
                    </div>
                    <div>
                      <label style={labelCampoStyle(t)}>
                        Hora de Reabertura
                        <CampoObrigatorioMark />
                      </label>
                      <input
                        type="time"
                        value={st.reabertura}
                        disabled={st.naoReaberta}
                        onChange={(e) =>
                          setMesasDraft((prev) => ({
                            ...prev,
                            [id]: { ...prev[id]!, reabertura: e.target.value },
                          }))
                        }
                        style={{ ...inputStyle(t), opacity: st.naoReaberta ? 0.55 : 1 }}
                        aria-label={`Hora de Reabertura — ${mesaLabelFn(id)}`}
                      />
                    </div>
                  </div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      fontFamily: FONT.body,
                      marginBottom: 10,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={st.naoReaberta}
                      onChange={(e) =>
                        setMesasDraft((prev) => ({
                          ...prev,
                          [id]: {
                            ...prev[id]!,
                            naoReaberta: e.target.checked,
                            reabertura: e.target.checked ? "" : prev[id]!.reabertura,
                          },
                        }))
                      }
                    />
                    Mesa ainda não foi reaberta
                  </label>
                  <div>
                    <label style={labelCampoStyle(t)}>
                      Observação
                      <CampoObrigatorioMark />
                    </label>
                    <textarea
                      value={st.observacao}
                      onChange={(e) =>
                        setMesasDraft((prev) => ({
                          ...prev,
                          [id]: { ...prev[id]!, observacao: e.target.value },
                        }))
                      }
                      placeholder="Descreva o motivo do fechamento..."
                      rows={3}
                      style={{ ...inputStyle(t), resize: "vertical", minHeight: 96 }}
                      aria-label={`Observação — ${mesaLabelFn(id)}`}
                    />
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                type="button"
                disabled={salvando}
                onClick={() => void salvarFechamento()}
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

      {verFechamento ? (
        <ModalBase onClose={() => setVerFechamento(null)} maxWidth={560}>
          <ModalHeader title="Detalhes do Fechamento" onClose={() => setVerFechamento(null)} />
          <div style={{ padding: "0 4px 8px" }}>
            <div className="app-grid-2" style={{ gap: 8 }}>
              <CampoDetalhe label="Status da Mesa">
                {verFechamento.nao_reaberta ? (
                  <StatusPill label="Não aberta" color="#f59e0b" />
                ) : (
                  <StatusPill label="Reaberta" color="#22c55e" />
                )}
              </CampoDetalhe>
              <CampoDetalhe label="Data do Registro">{formatDiaBr(verFechamento.data_registro)}</CampoDetalhe>
              <CampoDetalhe label="Nome da Mesa">{verFechamento.mesa_nome}</CampoDetalhe>
              <CampoDetalhe label="Jogo">{verFechamento.mesa_jogo}</CampoDetalhe>
              <CampoDetalhe label="Estúdio">{verFechamento.mesa_estudio}</CampoDetalhe>
              <CampoDetalhe label="Hora de Fechamento">{verFechamento.hora_fechamento || "—"}</CampoDetalhe>
              <CampoDetalhe label="Hora de Abertura">
                {verFechamento.nao_reaberta ? "—" : verFechamento.hora_reabertura || "—"}
              </CampoDetalhe>
            </div>
            <CampoDetalhe label="Observação">
              <span style={{ whiteSpace: "pre-wrap" }}>{verFechamento.observacao.trim() || "—"}</span>
            </CampoDetalhe>
          </div>
        </ModalBase>
      ) : null}

      {modalAusencia ? (
        <ModalBase onClose={() => setModalAusencia(false)} maxWidth={560}>
          <ModalHeader
            title={ausEditId ? "Editar Ausência" : "Registrar Ausência"}
            onClose={() => setModalAusencia(false)}
          />
          <div style={{ padding: "0 4px 8px" }}>
            {ausErro ? (
              <div
                role="alert"
                aria-live="polite"
                style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
              >
                {ausErro}
              </div>
            ) : null}
            <div style={{ marginBottom: 14 }}>
              <label style={labelCampoStyle(t)}>
                Prestador
                <CampoObrigatorioMark />
              </label>
              <PrestadorSelect
                value={ausForm.prestadorId}
                onChange={(id) => setAusForm((f) => ({ ...f, prestadorId: id }))}
                prestadores={prestadores}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelCampoStyle(t)} htmlFor="aus-motivo">
                Motivo
                <CampoObrigatorioMark />
              </label>
              <select
                id="aus-motivo"
                aria-label="Motivo"
                value={ausForm.motivo}
                onChange={(e) =>
                  setAusForm((f) => ({ ...f, motivo: e.target.value as "" | CtMotivoAusencia }))
                }
                style={inputStyle(t)}
              >
                <option value="">Selecionar...</option>
                <option value="medico">Médico</option>
                <option value="pessoal">Pessoal</option>
              </select>
            </div>
            <div className="app-grid-2" style={{ gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelCampoStyle(t)} htmlFor="aus-inicio">
                  Início da Ausência
                  <CampoObrigatorioMark />
                </label>
                <input
                  id="aus-inicio"
                  type="date"
                  value={ausForm.inicio}
                  onChange={(e) => {
                    const inicio = e.target.value;
                    setAusForm((f) => ({
                      ...f,
                      inicio,
                      fim: f.fim && inicio && f.fim < inicio ? "" : f.fim,
                    }));
                  }}
                  style={inputStyle(t)}
                />
              </div>
              <div>
                <label style={labelCampoStyle(t)} htmlFor="aus-fim">
                  Fim da Ausência
                  <CampoObrigatorioMark />
                </label>
                <input
                  id="aus-fim"
                  type="date"
                  value={ausForm.fim}
                  min={ausForm.inicio || undefined}
                  disabled={ausForm.fimNaoInformado}
                  onChange={(e) => setAusForm((f) => ({ ...f, fim: e.target.value }))}
                  style={{ ...inputStyle(t), opacity: ausForm.fimNaoInformado ? 0.55 : 1 }}
                />
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 8,
                    fontSize: 13,
                    fontFamily: FONT.body,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={ausForm.fimNaoInformado}
                    onChange={(e) =>
                      setAusForm((f) => ({
                        ...f,
                        fimNaoInformado: e.target.checked,
                        fim: e.target.checked ? "" : f.fim,
                      }))
                    }
                  />
                  Não informado
                </label>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelCampoStyle(t)} htmlFor="aus-obs">
                Observação
                <CampoObrigatorioMark />
              </label>
              <textarea
                id="aus-obs"
                value={ausForm.observacao}
                onChange={(e) => setAusForm((f) => ({ ...f, observacao: e.target.value }))}
                placeholder="Descreva a ausência..."
                rows={3}
                style={{ ...inputStyle(t), resize: "vertical", minHeight: 96 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={salvando}
                onClick={() => void salvarAusencia()}
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

      {verAusencia ? (
        <ModalBase onClose={() => setVerAusencia(null)} maxWidth={560}>
          <ModalHeader title="Detalhes da Ausência" onClose={() => setVerAusencia(null)} />
          <div style={{ padding: "0 4px 8px" }}>
            <div className="app-grid-2" style={{ gap: 8 }}>
              <CampoDetalhe label="Prestador">{verAusencia.prestador_nome}</CampoDetalhe>
              <CampoDetalhe label="Motivo">{motivoAusLabel(verAusencia.motivo)}</CampoDetalhe>
              <CampoDetalhe label="Início da Ausência">{formatDiaBr(verAusencia.inicio)}</CampoDetalhe>
              <CampoDetalhe label="Fim da Ausência">
                {verAusencia.fim_nao_informado ? "Não informado" : formatDiaBr(verAusencia.fim ?? "")}
              </CampoDetalhe>
              <CampoDetalhe label="Liderança">{verAusencia.lideranca_nome || "—"}</CampoDetalhe>
            </div>
            <CampoDetalhe label="Observação">
              <span style={{ whiteSpace: "pre-wrap" }}>{verAusencia.observacao || "—"}</span>
            </CampoDetalhe>
          </div>
        </ModalBase>
      ) : null}

      {modalFeedback ? (
        <ModalBase onClose={() => setModalFeedback(false)} maxWidth={560}>
          <ModalHeader title="Registrar Feedback" onClose={() => setModalFeedback(false)} />
          <div style={{ padding: "0 4px 8px" }}>
            {fbErro ? (
              <div
                role="alert"
                aria-live="polite"
                style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
              >
                {fbErro}
              </div>
            ) : null}
            <div style={{ marginBottom: 14 }}>
              <label style={labelCampoStyle(t)}>
                Prestador
                <CampoObrigatorioMark />
              </label>
              <PrestadorSelect
                value={fbForm.prestadorId}
                onChange={(id) => setFbForm((f) => ({ ...f, prestadorId: id }))}
                prestadores={prestadores}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelCampoStyle(t)} htmlFor="fb-recomendacao">
                Recomendação
                <CampoObrigatorioMark />
              </label>
              <select
                id="fb-recomendacao"
                aria-label="Recomendação"
                value={fbForm.recomendacao}
                onChange={(e) =>
                  setFbForm((f) => ({
                    ...f,
                    recomendacao: e.target.value as "" | CtFeedbackRecomendacao,
                  }))
                }
                style={inputStyle(t)}
              >
                <option value="">Selecionar...</option>
                {(Object.keys(RECOMENDACAO_LABEL) as CtFeedbackRecomendacao[]).map((k) => (
                  <option key={k} value={k}>
                    {RECOMENDACAO_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelCampoStyle(t)} htmlFor="fb-obs">
                Observação
                <CampoObrigatorioMark />
              </label>
              <textarea
                id="fb-obs"
                value={fbForm.observacao}
                onChange={(e) => setFbForm((f) => ({ ...f, observacao: e.target.value }))}
                placeholder="Descreva o feedback..."
                rows={3}
                style={{ ...inputStyle(t), resize: "vertical", minHeight: 96 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={salvando}
                onClick={() => void salvarFeedback()}
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

      {verFeedback ? (
        <ModalBase onClose={() => setVerFeedback(null)} maxWidth={560}>
          <ModalHeader title="Detalhes do Feedback" onClose={() => setVerFeedback(null)} />
          <div style={{ padding: "0 4px 8px" }}>
            <div className="app-grid-2" style={{ gap: 8 }}>
              <CampoDetalhe label="Data do Registro">{formatDiaBr(verFeedback.data_registro)}</CampoDetalhe>
              <CampoDetalhe label="Prestador">{verFeedback.prestador_nome}</CampoDetalhe>
              <CampoDetalhe label="Recomendação">
                {RECOMENDACAO_LABEL[verFeedback.recomendacao]}
              </CampoDetalhe>
              <CampoDetalhe label="Status">
                {verFeedback.status === "aplicado" ? (
                  <StatusPill label="Aplicado" color="#22c55e" />
                ) : (
                  <StatusPill label="Revisar" color="#f59e0b" />
                )}
              </CampoDetalhe>
              <CampoDetalhe label="Liderança">{verFeedback.lideranca_nome || "—"}</CampoDetalhe>
              <CampoDetalhe label="Aplicado Por">
                {verFeedback.status === "aplicado" ? verFeedback.aplicado_por_nome || "—" : "—"}
              </CampoDetalhe>
            </div>
            <CampoDetalhe label="Observação">
              <span style={{ whiteSpace: "pre-wrap" }}>{verFeedback.observacao || "—"}</span>
            </CampoDetalhe>
          </div>
        </ModalBase>
      ) : null}

      {modalManut ? (
        <ModalBase onClose={() => setModalManut(false)} maxWidth={560}>
          <ModalHeader title="Solicitar Manutenção" onClose={() => setModalManut(false)} />
          <div style={{ padding: "0 4px 8px" }}>
            {manutErro ? (
              <div
                role="alert"
                aria-live="polite"
                style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
              >
                {manutErro}
              </div>
            ) : null}
            <div style={{ marginBottom: 14 }}>
              <label style={labelCampoStyle(t)} htmlFor="manut-tipo">
                Tipo
                <CampoObrigatorioMark />
              </label>
              <select
                id="manut-tipo"
                aria-label="Tipo"
                value={manutForm.tipo}
                onChange={(e) =>
                  setManutForm((f) => ({ ...f, tipo: e.target.value as "" | CtManutTipo }))
                }
                style={inputStyle(t)}
              >
                <option value="">Selecionar...</option>
                <option value="ti">TI</option>
                <option value="limpeza">Limpeza</option>
                <option value="tech_ops">Tech Ops</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelCampoStyle(t)} htmlFor="manut-local">
                Local
                <CampoObrigatorioMark />
              </label>
              <select
                id="manut-local"
                aria-label="Local"
                value={manutForm.local}
                onChange={(e) =>
                  setManutForm((f) => ({ ...f, local: e.target.value, mesaId: "" }))
                }
                style={inputStyle(t)}
              >
                <option value="">Selecionar...</option>
                {locaisManut.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            {localEhEstudio(manutForm.local) ? (
              <div style={{ marginBottom: 14 }}>
                <label style={labelCampoStyle(t)} htmlFor="manut-mesa">
                  Mesa
                  <CampoObrigatorioMark />
                </label>
                <select
                  id="manut-mesa"
                  aria-label="Mesa"
                  value={manutForm.mesaId}
                  onChange={(e) => setManutForm((f) => ({ ...f, mesaId: e.target.value }))}
                  style={inputStyle(t)}
                >
                  <option value="">Selecionar...</option>
                  <option value="estudio_geral">Estúdio Geral</option>
                  {mesasDoLocal.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div style={{ marginBottom: 14 }}>
              <label style={labelCampoStyle(t)} htmlFor="manut-obs">
                Observação
                <CampoObrigatorioMark />
              </label>
              <textarea
                id="manut-obs"
                value={manutForm.observacao}
                onChange={(e) => setManutForm((f) => ({ ...f, observacao: e.target.value }))}
                placeholder="Descreva a solicitação de manutenção..."
                rows={3}
                style={{ ...inputStyle(t), resize: "vertical", minHeight: 96 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={salvando}
                onClick={() => void salvarManutencao()}
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

      {verManut ? (
        <ModalBase onClose={() => setVerManut(null)} maxWidth={560}>
          <ModalHeader title="Detalhes da Solicitação" onClose={() => setVerManut(null)} />
          <div style={{ padding: "0 4px 8px" }}>
            <div className="app-grid-2" style={{ gap: 8 }}>
              <CampoDetalhe label="Abertura">{formatDiaBr(verManut.abertura)}</CampoDetalhe>
              <CampoDetalhe label="Solicitante">{verManut.solicitante_nome || "—"}</CampoDetalhe>
              <CampoDetalhe label="Tipo">{MANUT_TIPO_LABEL[verManut.tipo]}</CampoDetalhe>
              <CampoDetalhe label="Local">{localManutLabel(verManut.local_key)}</CampoDetalhe>
              {localEhEstudio(verManut.local_key) ? (
                <CampoDetalhe label="Mesa">{mesaManutLabel(verManut.mesa_ref, verManut.local_key)}</CampoDetalhe>
              ) : null}
              <CampoDetalhe label="Status">
                <StatusPill
                  label={MANUT_STATUS_LABEL[verManut.status]}
                  color={
                    verManut.status === "concluido"
                      ? "#22c55e"
                      : verManut.status === "cancelado"
                        ? "#e84025"
                        : "#f59e0b"
                  }
                />
              </CampoDetalhe>
            </div>
            <CampoDetalhe label="Observação">
              <span style={{ whiteSpace: "pre-wrap" }}>{verManut.observacao || "—"}</span>
            </CampoDetalhe>
          </div>
        </ModalBase>
      ) : null}

      {cancelManutId ? (
        <ModalBase onClose={() => setCancelManutId(null)} maxWidth={440}>
          <ModalHeader title="Cancelar Solicitação" onClose={() => setCancelManutId(null)} />
          <div style={{ padding: "0 4px 8px" }}>
            <p style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.5, color: t.text, fontFamily: FONT.body }}>
              Deseja cancelar esta solicitação de manutenção?
              <br />
              <br />
              O status será alterado para Cancelado. Esta ação não poderá ser desfeita.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setCancelManutId(null)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontWeight: 600,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={() => void confirmarCancelarManutencao()}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "#e84025",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: salvando ? "not-allowed" : "pointer",
                }}
              >
                {salvando ? "Salvando…" : "Cancelar Solicitação"}
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}
    </>
  );
}
