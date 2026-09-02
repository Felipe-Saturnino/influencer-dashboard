import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Ban, Check, Eye, Pencil } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
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
import { formatDiaBr, formatDiaCurto } from "./helpers";

export type AbaNotificacoesProps = {
  /** YYYY-MM-DD — dia selecionado no carrossel */
  diaIso: string;
  busca: string;
};

const LIDERANCA_ATUAL = "Você";

type MesaCadastro = {
  id: string;
  label: string;
  nome: string;
  estudio: string;
  jogo: string;
};

type PrestadorMock = { id: string; nome: string; time: string };

type FechamentoRow = {
  id: string;
  dataRegistro: string;
  fechamento: string;
  reabertura: string;
  naoReaberta: boolean;
  observacao: string;
  liderancaFechamento: string;
  liderancaReabertura: string;
};

type MotivoAusencia = "medico" | "pessoal";

type AusenciaRow = {
  id: string;
  prestadorId: string;
  motivo: MotivoAusencia;
  inicio: string;
  fim: string;
  fimNaoInformado: boolean;
  observacao: string;
  lideranca: string;
};

type RecomendacaoKey =
  | "orientacao"
  | "alinhamento"
  | "notif_descumprimento"
  | "notif_suspensao"
  | "persistencia";

type FeedbackStatus = "aplicado" | "revisar";

type FeedbackRow = {
  id: string;
  dataRegistro: string;
  prestadorId: string;
  recomendacao: RecomendacaoKey;
  status: FeedbackStatus;
  observacao: string;
  lideranca: string;
  aplicadoPor: string;
};

type ManutTipo = "ti" | "limpeza" | "tech_ops";
type ManutStatus = "aberto" | "em_andamento" | "concluido" | "cancelado";

type LocalManut = {
  value: string;
  label: string;
  tipo: "estudio" | "especial";
  estudioSlug?: string;
  estudioNome?: string;
};

type ManutencaoRow = {
  id: string;
  abertura: string;
  solicitante: string;
  tipo: ManutTipo;
  local: string;
  mesaId: string;
  observacao: string;
  status: ManutStatus;
};

const MESAS_CADASTRO: MesaCadastro[] = [
  { id: "b-bj1", label: "Blaze - 1", nome: "1", estudio: "Blaze", jogo: "Blackjack" },
  { id: "b-bj2", label: "Blaze - 2", nome: "2", estudio: "Blaze", jogo: "Blackjack" },
  { id: "b-bj3", label: "Blaze - 3", nome: "3", estudio: "Blaze", jogo: "Blackjack" },
  { id: "b-rl1", label: "Blaze - Roleta 6140", nome: "Roleta 6140", estudio: "Blaze", jogo: "Roleta" },
  { id: "c-bj1", label: "CDA - 1", nome: "1", estudio: "CDA", jogo: "Blackjack" },
  { id: "c-bj2", label: "CDA - 2", nome: "2", estudio: "CDA", jogo: "Blackjack" },
  { id: "c-rl1", label: "CDA - Roleta 6130", nome: "Roleta 6130", estudio: "CDA", jogo: "Roleta" },
  { id: "s-bj1", label: "Sports Club - 1", nome: "1", estudio: "Sports Club", jogo: "Blackjack" },
  { id: "s-bj2", label: "Sports Club - 2", nome: "2", estudio: "Sports Club", jogo: "Blackjack" },
  { id: "s-bj3", label: "Sports Club - 3", nome: "3", estudio: "Sports Club", jogo: "Blackjack" },
  { id: "s-bj4", label: "Sports Club - 4", nome: "4", estudio: "Sports Club", jogo: "Blackjack" },
  { id: "s-rl1", label: "Sports Club - Roleta 6115", nome: "Roleta 6115", estudio: "Sports Club", jogo: "Roleta" },
];

const PRESTADORES: PrestadorMock[] = [
  { id: "p1", nome: "Ana Souza", time: "Game Presenter" },
  { id: "p2", nome: "Bruno Lima", time: "Game Presenter" },
  { id: "p3", nome: "Carla Dias", time: "Game Presenter" },
  { id: "p4", nome: "Diego Alves", time: "Shuffler" },
  { id: "p5", nome: "Elena Costa", time: "Shuffler" },
  { id: "p6", nome: "Felipe Rocha", time: "Game Presenter" },
  { id: "p7", nome: "Giulia Mendes", time: "Game Presenter" },
  { id: "p8", nome: "Hugo Prado", time: "Shuffler" },
];

const RECOMENDACAO_LABEL: Record<RecomendacaoKey, string> = {
  orientacao: "Orientação",
  alinhamento: "Alinhamento de Execução",
  notif_descumprimento: "Notificação de Descumprimento Contratual",
  notif_suspensao: "Notificação de Suspensão da Execução Contratual",
  persistencia: "Persistência do Descumprimento",
};

const MANUT_TIPO_LABEL: Record<ManutTipo, string> = {
  ti: "TI",
  limpeza: "Limpeza",
  tech_ops: "Tech Ops",
};

const MANUT_STATUS_LABEL: Record<ManutStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const LOCAIS_MANUT: LocalManut[] = [
  { value: "estudio:blaze", label: "Blaze", tipo: "estudio", estudioSlug: "blaze", estudioNome: "Blaze" },
  { value: "estudio:cda", label: "CDA", tipo: "estudio", estudioSlug: "cda", estudioNome: "CDA" },
  {
    value: "estudio:sports_club",
    label: "Sports Club",
    tipo: "estudio",
    estudioSlug: "sports_club",
    estudioNome: "Sports Club",
  },
  { value: "shuffler_room", label: "Shuffler Room", tipo: "especial" },
  { value: "ocr", label: "OCR", tipo: "especial" },
];

const SEED_FECHAMENTOS: FechamentoRow[] = [
  {
    id: "s-bj2",
    dataRegistro: "2026-08-11",
    fechamento: "06:40",
    reabertura: "",
    naoReaberta: true,
    observacao: "Manutenção preventiva da mesa — aguardando retorno da Telecom.",
    liderancaFechamento: "Bruno Lima",
    liderancaReabertura: "",
  },
  {
    id: "c-bj1",
    dataRegistro: "2026-08-12",
    fechamento: "10:15",
    reabertura: "11:05",
    naoReaberta: false,
    observacao: "Troca de baralho e limpeza rápida.",
    liderancaFechamento: "Bruno Lima",
    liderancaReabertura: "Ana Costa",
  },
];

const SEED_AUSENCIAS: AusenciaRow[] = [
  {
    id: "a1",
    prestadorId: "p3",
    motivo: "medico",
    inicio: "2026-08-12",
    fim: "",
    fimNaoInformado: true,
    observacao: "Atestado médico — aguardando retorno do RH.",
    lideranca: "Bruno Lima",
  },
  {
    id: "a2",
    prestadorId: "p5",
    motivo: "pessoal",
    inicio: "2026-08-10",
    fim: "2026-08-11",
    fimNaoInformado: false,
    observacao: "Ausência pessoal já encerrada.",
    lideranca: "Ana Costa",
  },
  {
    id: "a3",
    prestadorId: "p7",
    motivo: "medico",
    inicio: "2026-08-12",
    fim: "2026-08-14",
    fimNaoInformado: false,
    observacao: "Atestado com data de retorno informada.",
    lideranca: "Bruno Lima",
  },
];

const SEED_FEEDBACKS: FeedbackRow[] = [
  {
    id: "f1",
    dataRegistro: "2026-08-12",
    prestadorId: "p2",
    recomendacao: "orientacao",
    status: "aplicado",
    observacao: "Reforço sobre pontualidade no check-in.",
    lideranca: "Ana Costa",
    aplicadoPor: "Ana Costa",
  },
  {
    id: "f2",
    dataRegistro: "2026-08-11",
    prestadorId: "p6",
    recomendacao: "alinhamento",
    status: "revisar",
    observacao: "Desvio de procedimento na troca de cartas.",
    lideranca: "Bruno Lima",
    aplicadoPor: "",
  },
];

const SEED_MANUTENCOES: ManutencaoRow[] = [
  {
    id: "m1",
    abertura: "2026-08-11",
    solicitante: "Bruno Lima",
    tipo: "tech_ops",
    local: "estudio:sports_club",
    mesaId: "s-bj2",
    observacao: "Leitor de cartas com falha intermitente.",
    status: "aberto",
  },
  {
    id: "m2",
    abertura: "2026-08-12",
    solicitante: "Ana Costa",
    tipo: "ti",
    local: "shuffler_room",
    mesaId: "",
    observacao: "Monitor do painel sem sinal HDMI.",
    status: "em_andamento",
  },
  {
    id: "m3",
    abertura: "2026-08-12",
    solicitante: LIDERANCA_ATUAL,
    tipo: "limpeza",
    local: "estudio:blaze",
    mesaId: "estudio_geral",
    observacao: "Limpeza geral do estúdio após turno da manhã.",
    status: "concluido",
  },
  {
    id: "m4",
    abertura: "2026-08-10",
    solicitante: "Bruno Lima",
    tipo: "ti",
    local: "ocr",
    mesaId: "",
    observacao: "Solicitação cancelada — equipamento já substituído.",
    status: "cancelado",
  },
];

function mesaMeta(id: string): MesaCadastro {
  return (
    MESAS_CADASTRO.find((m) => m.id === id) ?? {
      id,
      label: id,
      nome: id,
      estudio: "—",
      jogo: "—",
    }
  );
}

function mesaLabel(id: string): string {
  return mesaMeta(id).label;
}

function prestadorNome(id: string): string {
  return PRESTADORES.find((p) => p.id === id)?.nome ?? id;
}

function motivoAusLabel(m: MotivoAusencia): string {
  return m === "medico" ? "Médico" : "Pessoal";
}

function localManutMeta(value: string): LocalManut | undefined {
  return LOCAIS_MANUT.find((l) => l.value === value);
}

function localManutLabel(value: string): string {
  return localManutMeta(value)?.label ?? value ?? "—";
}

function localEhEstudio(value: string): boolean {
  return localManutMeta(value)?.tipo === "estudio";
}

function mesaManutLabel(mesaId: string, localValue: string): string {
  if (!localEhEstudio(localValue)) return "—";
  if (mesaId === "estudio_geral") return "Estúdio Geral";
  return mesaLabel(mesaId);
}

function localExibicaoTabela(m: ManutencaoRow): string {
  const base = localManutLabel(m.local);
  if (!localEhEstudio(m.local)) return base;
  const mesa = mesaManutLabel(m.mesaId, m.local);
  return mesa && mesa !== "—" ? `${base} · ${mesa}` : base;
}

function fechamentoVisivelNoDia(f: FechamentoRow, dia: string): boolean {
  const reg = f.dataRegistro || dia;
  if (reg > dia) return false;
  if (reg === dia) return true;
  return !!f.naoReaberta;
}

function ausenciaVisivelNoDia(a: AusenciaRow, dia: string): boolean {
  if (!a.inicio || a.inicio > dia) return false;
  if (a.fimNaoInformado || !a.fim) return true;
  return a.fim >= dia;
}

function feedbackVisivelNoDia(f: FeedbackRow, dia: string): boolean {
  const reg = f.dataRegistro || dia;
  if (reg > dia) return false;
  if (reg === dia) return true;
  return f.status !== "aplicado";
}

function manutencaoVisivelNoDia(m: ManutencaoRow, dia: string): boolean {
  const reg = m.abertura || dia;
  if (reg > dia) return false;
  if (reg === dia) return true;
  return m.status !== "cancelado" && m.status !== "concluido";
}

function novoId(prefix: string): string {
  return `${prefix}${Date.now()}`;
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

function CampoDetalhe({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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

function inputStyle(t: {
  text: string;
  inputBg: string;
  cardBorder: string;
}): CSSProperties {
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

type MesaDraft = {
  fechamento: string;
  reabertura: string;
  naoReaberta: boolean;
  observacao: string;
};

type PrestadorSelectProps = {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
};

function PrestadorSelect({ value, onChange, disabled }: PrestadorSelectProps) {
  const { theme: t } = useApp();
  const [open, setOpen] = useState(false);
  const [buscaPainel, setBuscaPainel] = useState("");

  const filtrados = useMemo(
    () =>
      PRESTADORES.filter((p) => textoContemBuscaEmAlgum(buscaPainel, p.nome, p.time)),
    [buscaPainel],
  );

  const selecionado = PRESTADORES.find((p) => p.id === value);

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
                      background: on ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)" : "transparent",
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

type MesaMultiSelectProps = {
  selected: Record<string, MesaDraft>;
  onToggle: (id: string) => void;
  locked?: boolean;
};

function MesaMultiSelect({ selected, onToggle, locked }: MesaMultiSelectProps) {
  const { theme: t } = useApp();
  const [open, setOpen] = useState(false);
  const [buscaPainel, setBuscaPainel] = useState("");
  const ids = Object.keys(selected);

  const filtrados = useMemo(
    () => MESAS_CADASTRO.filter((m) => textoContemBusca(m.label, buscaPainel)),
    [buscaPainel],
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
              {mesaLabel(id)}
              {!locked ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remover ${mesaLabel(id)}`}
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
                      background: on ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)" : "transparent",
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
}: {
  title: string;
  sub: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 16,
      }}
    >
      <SectionTitle compact sub={sub}>
        {title}
      </SectionTitle>
      <CtaCriarButton onClick={onCta}>{ctaLabel}</CtaCriarButton>
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

export default function AbaNotificacoes({ diaIso, busca }: AbaNotificacoesProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const diaSub = formatDiaCurto(diaIso);

  const [fechamentos, setFechamentos] = useState<FechamentoRow[]>(SEED_FECHAMENTOS);
  const [ausencias, setAusencias] = useState<AusenciaRow[]>(SEED_AUSENCIAS);
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>(SEED_FEEDBACKS);
  const [manutencoes, setManutencoes] = useState<ManutencaoRow[]>(SEED_MANUTENCOES);

  const [hoverKey, setHoverKey] = useState<string | null>(null);

  /* —— Fechamento —— */
  const [modalFechamento, setModalFechamento] = useState(false);
  const [fechEditId, setFechEditId] = useState<string | null>(null);
  const [mesasDraft, setMesasDraft] = useState<Record<string, MesaDraft>>({});
  const [fechErro, setFechErro] = useState("");
  const [verFechamento, setVerFechamento] = useState<FechamentoRow | null>(null);

  /* —— Ausência —— */
  const [modalAusencia, setModalAusencia] = useState(false);
  const [ausEditId, setAusEditId] = useState<string | null>(null);
  const [ausForm, setAusForm] = useState({
    prestadorId: "",
    motivo: "" as "" | MotivoAusencia,
    inicio: "",
    fim: "",
    fimNaoInformado: false,
    observacao: "",
  });
  const [ausErro, setAusErro] = useState("");
  const [verAusencia, setVerAusencia] = useState<AusenciaRow | null>(null);

  /* —— Feedback —— */
  const [modalFeedback, setModalFeedback] = useState(false);
  const [fbForm, setFbForm] = useState({
    prestadorId: "",
    recomendacao: "" as "" | RecomendacaoKey,
    observacao: "",
  });
  const [fbErro, setFbErro] = useState("");
  const [verFeedback, setVerFeedback] = useState<FeedbackRow | null>(null);
  const [avisoAplicar, setAvisoAplicar] = useState("");

  /* —— Manutenção —— */
  const [modalManut, setModalManut] = useState(false);
  const [manutForm, setManutForm] = useState({
    tipo: "" as "" | ManutTipo,
    local: "",
    mesaId: "",
    observacao: "",
  });
  const [manutErro, setManutErro] = useState("");
  const [verManut, setVerManut] = useState<ManutencaoRow | null>(null);
  const [cancelManutId, setCancelManutId] = useState<string | null>(null);

  const fechVisiveis = useMemo(() => {
    return fechamentos
      .filter((f) => fechamentoVisivelNoDia(f, diaIso))
      .filter((f) => textoContemBusca(mesaLabel(f.id), busca));
  }, [fechamentos, diaIso, busca]);

  const ausVisiveis = useMemo(() => {
    return ausencias
      .filter((a) => ausenciaVisivelNoDia(a, diaIso))
      .filter((a) =>
        textoContemBuscaEmAlgum(
          busca,
          prestadorNome(a.prestadorId),
          motivoAusLabel(a.motivo),
          a.lideranca,
          a.observacao,
        ),
      );
  }, [ausencias, diaIso, busca]);

  const fbVisiveis = useMemo(() => {
    return feedbacks
      .filter((f) => feedbackVisivelNoDia(f, diaIso))
      .filter((f) =>
        textoContemBuscaEmAlgum(
          busca,
          formatDiaBr(f.dataRegistro),
          prestadorNome(f.prestadorId),
          RECOMENDACAO_LABEL[f.recomendacao],
          f.status,
          f.lideranca,
          f.aplicadoPor,
          f.observacao,
        ),
      );
  }, [feedbacks, diaIso, busca]);

  const manutVisiveis = useMemo(() => {
    return manutencoes
      .filter((m) => manutencaoVisivelNoDia(m, diaIso))
      .filter((m) =>
        textoContemBuscaEmAlgum(
          busca,
          formatDiaBr(m.abertura),
          m.solicitante,
          MANUT_TIPO_LABEL[m.tipo],
          localExibicaoTabela(m),
          MANUT_STATUS_LABEL[m.status],
          m.observacao,
        ),
      );
  }, [manutencoes, diaIso, busca]);

  function abrirRegistrarFechamento() {
    setFechEditId(null);
    setMesasDraft({});
    setFechErro("");
    setModalFechamento(true);
  }

  function abrirEditarFechamento(row: FechamentoRow) {
    setFechEditId(row.id);
    setMesasDraft({
      [row.id]: {
        fechamento: row.fechamento,
        reabertura: row.reabertura,
        naoReaberta: row.naoReaberta,
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

  function salvarFechamento() {
    const ids = Object.keys(mesasDraft);
    if (!ids.length) {
      setFechErro("Selecione ao menos uma mesa.");
      return;
    }
    for (const id of ids) {
      const st = mesasDraft[id];
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

    setFechamentos((prev) => {
      let next = [...prev];
      for (const id of ids) {
        const st = mesasDraft[id];
        const existing = next.find((f) => f.id === id);
        let liderFech = existing?.liderancaFechamento || LIDERANCA_ATUAL;
        if (!existing?.liderancaFechamento) liderFech = LIDERANCA_ATUAL;
        let liderReab = existing?.liderancaReabertura || "";
        if (!st.naoReaberta) {
          if (
            !existing ||
            existing.naoReaberta ||
            existing.reabertura !== st.reabertura ||
            !existing.liderancaReabertura
          ) {
            liderReab = LIDERANCA_ATUAL;
          }
        } else {
          liderReab = "";
        }
        const novo: FechamentoRow = {
          id,
          dataRegistro: existing?.dataRegistro || diaIso,
          fechamento: st.fechamento,
          reabertura: st.naoReaberta ? "" : st.reabertura,
          naoReaberta: !!st.naoReaberta,
          observacao: st.observacao.trim(),
          liderancaFechamento: liderFech,
          liderancaReabertura: liderReab,
        };
        const idx = next.findIndex((f) => f.id === id);
        if (idx >= 0) next[idx] = novo;
        else next.push(novo);
      }
      if (fechEditId && !mesasDraft[fechEditId]) {
        next = next.filter((f) => f.id !== fechEditId);
      }
      return next;
    });
    setModalFechamento(false);
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

  function abrirEditarAusencia(row: AusenciaRow) {
    setAusEditId(row.id);
    setAusForm({
      prestadorId: row.prestadorId,
      motivo: row.motivo,
      inicio: row.inicio,
      fim: row.fimNaoInformado ? "" : row.fim,
      fimNaoInformado: row.fimNaoInformado,
      observacao: row.observacao,
    });
    setAusErro("");
    setModalAusencia(true);
  }

  function salvarAusencia() {
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

    const prev = ausEditId ? ausencias.find((a) => a.id === ausEditId) : null;
    const novo: AusenciaRow = {
      id: ausEditId || novoId("a"),
      prestadorId: ausForm.prestadorId,
      motivo: ausForm.motivo,
      inicio: ausForm.inicio,
      fim: ausForm.fimNaoInformado ? "" : ausForm.fim,
      fimNaoInformado: ausForm.fimNaoInformado,
      observacao: ausForm.observacao.trim(),
      lideranca: prev?.lideranca || LIDERANCA_ATUAL,
    };
    setAusencias((list) => {
      if (ausEditId) return list.map((a) => (a.id === ausEditId ? novo : a));
      return [...list, novo];
    });
    setModalAusencia(false);
  }

  function abrirRegistrarFeedback() {
    setFbForm({ prestadorId: "", recomendacao: "", observacao: "" });
    setFbErro("");
    setModalFeedback(true);
  }

  function salvarFeedback() {
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

    const isOrientacao = fbForm.recomendacao === "orientacao";
    const lideranca = LIDERANCA_ATUAL;
    const novo: FeedbackRow = {
      id: novoId("f"),
      dataRegistro: diaIso,
      prestadorId: fbForm.prestadorId,
      recomendacao: fbForm.recomendacao,
      status: isOrientacao ? "aplicado" : "revisar",
      observacao: fbForm.observacao.trim(),
      lideranca,
      aplicadoPor: isOrientacao ? lideranca : "",
    };
    setFeedbacks((list) => [...list, novo]);
    setModalFeedback(false);
  }

  function aplicarFeedbackPlaceholder() {
    setAvisoAplicar("Mock: modal Aplicar Feedback será trabalhado em seguida.");
    window.setTimeout(() => setAvisoAplicar(""), 4000);
  }

  function abrirSolicitarManutencao() {
    setManutForm({ tipo: "", local: "", mesaId: "", observacao: "" });
    setManutErro("");
    setModalManut(true);
  }

  function salvarManutencao() {
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

    const novo: ManutencaoRow = {
      id: novoId("m"),
      abertura: diaIso,
      solicitante: LIDERANCA_ATUAL,
      tipo: manutForm.tipo,
      local: manutForm.local,
      mesaId: localEhEstudio(manutForm.local) ? manutForm.mesaId : "",
      observacao: manutForm.observacao.trim(),
      status: "aberto",
    };
    setManutencoes((list) => [...list, novo]);
    setModalManut(false);
  }

  function confirmarCancelarManutencao() {
    if (!cancelManutId) return;
    setManutencoes((list) =>
      list.map((m) => (m.id === cancelManutId ? { ...m, status: "cancelado" as const } : m)),
    );
    setCancelManutId(null);
  }

  const mesasDoLocal = useMemo(() => {
    const meta = localManutMeta(manutForm.local);
    if (!meta?.estudioNome) return [];
    return MESAS_CADASTRO.filter((m) => m.estudio === meta.estudioNome);
  }, [manutForm.local]);

  const rowHoverBg = t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";

  function trStyle(key: string, i: number): CSSProperties {
    return {
      background: hoverKey === key ? rowHoverBg : dataTable.zebraRow(i),
    };
  }

  return (
    <>
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

      {/* —— 1. Fechamento de Mesa —— */}
      <div style={pageBox}>
        <BlocoCabecalho
          title="Fechamento de Mesa"
          sub={diaSub}
          ctaLabel="Registrar Fechamento"
          onCta={abrirRegistrarFechamento}
        />
        {fechVisiveis.length === 0 ? (
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
                  const herdado = (f.dataRegistro || diaIso) < diaIso;
                  const lideranca = f.naoReaberta
                    ? f.liderancaFechamento || "—"
                    : f.liderancaReabertura || f.liderancaFechamento || "—";
                  const key = `fech-${f.id}`;
                  return (
                    <tr
                      key={f.id}
                      style={trStyle(key, i)}
                      onMouseEnter={() => setHoverKey(key)}
                      onMouseLeave={() => setHoverKey(null)}
                    >
                      <td style={{ ...dataTable.tdCenter, textAlign: "left" }}>
                        {mesaLabel(f.id)}
                        {herdado ? <TagDiaAnterior t={t} /> : null}
                      </td>
                      <td style={dataTable.tdCenter}>{f.fechamento || "—"}</td>
                      <td style={dataTable.tdCenter}>{f.naoReaberta ? "—" : f.reabertura || "—"}</td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          {f.naoReaberta ? (
                            <StatusPill label="Não aberta" color="#f59e0b" />
                          ) : (
                            <StatusPill label="Reaberta" color="#22c55e" />
                          )}
                        </div>
                      </td>
                      <td style={{ ...dataTable.tdCenter, textAlign: "left" }}>{lideranca}</td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "inline-flex", gap: 6, justifyContent: "center" }}>
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Ver")}
                            onClick={() => setVerFechamento(f)}
                          >
                            <Eye size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Editar")}
                            onClick={() => abrirEditarFechamento(f)}
                          >
                            <Pencil size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
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

      {/* —— 2. Ausências —— */}
      <div style={pageBox}>
        <BlocoCabecalho
          title="Ausências"
          sub={diaSub}
          ctaLabel="Registrar Ausência"
          onCta={abrirRegistrarAusencia}
        />
        {ausVisiveis.length === 0 ? (
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
                      <td style={{ ...dataTable.tdCenter, textAlign: "left" }}>
                        {prestadorNome(a.prestadorId)}
                      </td>
                      <td style={dataTable.tdCenter}>{motivoAusLabel(a.motivo)}</td>
                      <td style={dataTable.tdCenter}>{formatDiaBr(a.inicio)}</td>
                      <td style={dataTable.tdCenter}>
                        {a.fimNaoInformado ? "Não informado" : formatDiaBr(a.fim)}
                      </td>
                      <td style={{ ...dataTable.tdCenter, textAlign: "left" }}>{a.lideranca || "—"}</td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "inline-flex", gap: 6, justifyContent: "center" }}>
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Ver")}
                            onClick={() => setVerAusencia(a)}
                          >
                            <Eye size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Editar")}
                            onClick={() => abrirEditarAusencia(a)}
                          >
                            <Pencil size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
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

      {/* —— 3. Feedbacks —— */}
      <div style={pageBox}>
        <BlocoCabecalho
          title="Feedbacks"
          sub={diaSub}
          ctaLabel="Registrar Feedback"
          onCta={abrirRegistrarFeedback}
        />
        {fbVisiveis.length === 0 ? (
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
                      <td style={dataTable.tdCenter}>{formatDiaBr(f.dataRegistro)}</td>
                      <td style={{ ...dataTable.tdCenter, textAlign: "left" }}>
                        {prestadorNome(f.prestadorId)}
                      </td>
                      <td style={{ ...dataTable.tdCenter, textAlign: "left" }}>
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
                      <td style={{ ...dataTable.tdCenter, textAlign: "left" }}>{f.lideranca || "—"}</td>
                      <td style={{ ...dataTable.tdCenter, textAlign: "left" }}>
                        {f.status === "aplicado" ? f.aplicadoPor || "—" : "—"}
                      </td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "inline-flex", gap: 6, justifyContent: "center" }}>
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Ver")}
                            onClick={() => setVerFeedback(f)}
                          >
                            <Eye size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                          {f.status === "revisar" ? (
                            <BtnIconeAcaoLinha
                              label={tooltipAcao("Aplicar")}
                              onClick={aplicarFeedbackPlaceholder}
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

      {/* —— 4. Solicitação de Manutenção —— */}
      <div style={pageBox}>
        <BlocoCabecalho
          title="Solicitação de Manutenção"
          sub={diaSub}
          ctaLabel="Solicitar Manutenção"
          onCta={abrirSolicitarManutencao}
        />
        {manutVisiveis.length === 0 ? (
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
                  const podeCancelar = m.status === "aberto" || m.status === "em_andamento";
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
                      <td style={{ ...dataTable.tdCenter, textAlign: "left" }}>{m.solicitante || "—"}</td>
                      <td style={dataTable.tdCenter}>{MANUT_TIPO_LABEL[m.tipo]}</td>
                      <td style={{ ...dataTable.tdCenter, textAlign: "left" }}>{localExibicaoTabela(m)}</td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <StatusPill label={MANUT_STATUS_LABEL[m.status]} color={statusColor} />
                        </div>
                      </td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "inline-flex", gap: 6, justifyContent: "center" }}>
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Ver")}
                            onClick={() => setVerManut(m)}
                          >
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

      {/* —— Modal Registrar/Editar Fechamento —— */}
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
                locked={!!fechEditId}
              />
            </div>
            {Object.keys(mesasDraft).map((id) => {
              const st = mesasDraft[id];
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
                    {mesaLabel(id)}
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
                            [id]: { ...prev[id], fechamento: e.target.value },
                          }))
                        }
                        style={inputStyle(t)}
                        aria-label={`Hora de Fechamento — ${mesaLabel(id)}`}
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
                            [id]: { ...prev[id], reabertura: e.target.value },
                          }))
                        }
                        style={{ ...inputStyle(t), opacity: st.naoReaberta ? 0.55 : 1 }}
                        aria-label={`Hora de Reabertura — ${mesaLabel(id)}`}
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
                            ...prev[id],
                            naoReaberta: e.target.checked,
                            reabertura: e.target.checked ? "" : prev[id].reabertura,
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
                          [id]: { ...prev[id], observacao: e.target.value },
                        }))
                      }
                      placeholder="Descreva o motivo do fechamento..."
                      rows={3}
                      style={{ ...inputStyle(t), resize: "vertical", minHeight: 96 }}
                      aria-label={`Observação — ${mesaLabel(id)}`}
                    />
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                type="button"
                onClick={salvarFechamento}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: getCtaCriarGradient(brand),
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}

      {/* —— Modal Ver Fechamento —— */}
      {verFechamento ? (
        <ModalBase onClose={() => setVerFechamento(null)} maxWidth={560}>
          <ModalHeader title="Detalhes do Fechamento" onClose={() => setVerFechamento(null)} />
          <div style={{ padding: "0 4px 8px" }}>
            <div className="app-grid-2" style={{ gap: 8 }}>
              <CampoDetalhe label="Status da Mesa">
                {verFechamento.naoReaberta ? (
                  <StatusPill label="Não aberta" color="#f59e0b" />
                ) : (
                  <StatusPill label="Reaberta" color="#22c55e" />
                )}
              </CampoDetalhe>
              <CampoDetalhe label="Data do Registro">{formatDiaBr(verFechamento.dataRegistro)}</CampoDetalhe>
              <CampoDetalhe label="Nome da Mesa">{mesaMeta(verFechamento.id).nome}</CampoDetalhe>
              <CampoDetalhe label="Jogo">{mesaMeta(verFechamento.id).jogo}</CampoDetalhe>
              <CampoDetalhe label="Estúdio">{mesaMeta(verFechamento.id).estudio}</CampoDetalhe>
              <CampoDetalhe label="Hora de Fechamento">{verFechamento.fechamento || "—"}</CampoDetalhe>
              <CampoDetalhe label="Hora de Abertura">
                {verFechamento.naoReaberta ? "—" : verFechamento.reabertura || "—"}
              </CampoDetalhe>
            </div>
            <CampoDetalhe label="Observação">
              <span style={{ whiteSpace: "pre-wrap" }}>{verFechamento.observacao.trim() || "—"}</span>
            </CampoDetalhe>
          </div>
        </ModalBase>
      ) : null}

      {/* —— Modal Registrar/Editar Ausência —— */}
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
                  setAusForm((f) => ({ ...f, motivo: e.target.value as "" | MotivoAusencia }))
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
                onClick={salvarAusencia}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: getCtaCriarGradient(brand),
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                Salvar
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
              <CampoDetalhe label="Prestador">{prestadorNome(verAusencia.prestadorId)}</CampoDetalhe>
              <CampoDetalhe label="Motivo">{motivoAusLabel(verAusencia.motivo)}</CampoDetalhe>
              <CampoDetalhe label="Início da Ausência">{formatDiaBr(verAusencia.inicio)}</CampoDetalhe>
              <CampoDetalhe label="Fim da Ausência">
                {verAusencia.fimNaoInformado ? "Não informado" : formatDiaBr(verAusencia.fim)}
              </CampoDetalhe>
              <CampoDetalhe label="Liderança">{verAusencia.lideranca || "—"}</CampoDetalhe>
            </div>
            <CampoDetalhe label="Observação">
              <span style={{ whiteSpace: "pre-wrap" }}>{verAusencia.observacao || "—"}</span>
            </CampoDetalhe>
          </div>
        </ModalBase>
      ) : null}

      {/* —— Modal Registrar/Editar Feedback —— */}
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
                    recomendacao: e.target.value as "" | RecomendacaoKey,
                  }))
                }
                style={inputStyle(t)}
              >
                <option value="">Selecionar...</option>
                {(Object.keys(RECOMENDACAO_LABEL) as RecomendacaoKey[]).map((k) => (
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
                onClick={salvarFeedback}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: getCtaCriarGradient(brand),
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                Salvar
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
              <CampoDetalhe label="Data do Registro">{formatDiaBr(verFeedback.dataRegistro)}</CampoDetalhe>
              <CampoDetalhe label="Prestador">{prestadorNome(verFeedback.prestadorId)}</CampoDetalhe>
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
              <CampoDetalhe label="Liderança">{verFeedback.lideranca || "—"}</CampoDetalhe>
              <CampoDetalhe label="Aplicado Por">
                {verFeedback.status === "aplicado" ? verFeedback.aplicadoPor || "—" : "—"}
              </CampoDetalhe>
            </div>
            <CampoDetalhe label="Observação">
              <span style={{ whiteSpace: "pre-wrap" }}>{verFeedback.observacao || "—"}</span>
            </CampoDetalhe>
          </div>
        </ModalBase>
      ) : null}

      {/* —— Modal Solicitar Manutenção —— */}
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
                  setManutForm((f) => ({ ...f, tipo: e.target.value as "" | ManutTipo }))
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
                {LOCAIS_MANUT.map((l) => (
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
                onClick={salvarManutencao}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: getCtaCriarGradient(brand),
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                Salvar
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
              <CampoDetalhe label="Solicitante">{verManut.solicitante || "—"}</CampoDetalhe>
              <CampoDetalhe label="Tipo">{MANUT_TIPO_LABEL[verManut.tipo]}</CampoDetalhe>
              <CampoDetalhe label="Local">{localManutLabel(verManut.local)}</CampoDetalhe>
              {localEhEstudio(verManut.local) ? (
                <CampoDetalhe label="Mesa">{mesaManutLabel(verManut.mesaId, verManut.local)}</CampoDetalhe>
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
                onClick={confirmarCancelarManutencao}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "#e84025",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                Cancelar Solicitação
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}
    </>
  );
}
