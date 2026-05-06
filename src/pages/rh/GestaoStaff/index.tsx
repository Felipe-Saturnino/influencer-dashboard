import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Eye, Loader2, Pencil, Search, StickyNote, Trash2, Upload, Users } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { BRAND, FONT_TITLE } from "../../../lib/dashboardConstants";
import {
  isGamePresenterTimeNome,
  readStaffDealerBioForUi,
  readStaffDealerFotosForUi,
  readStaffDealerGeneroForUi,
  syncGamePresenterDealerFromRhFuncionario,
} from "../../../lib/rhGamePresenterDealerSync";
import type { DealerGenero } from "../../../types";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
import { opcoesTurnoPorEscalaRh, turnoRhCoerenteComEscala } from "../../../lib/rhEscalaTurnos";
import {
  escalaComHorarioTurnoSomenteOperadora,
  escalaUsaHorarioTurnoEditavel,
  horarioTurnoStaffValorPermitido,
  labelHorarioTurnoStaffPorValor,
  opcoesHorarioTurnoStaff,
  textoHorarioTurnoSomenteOperadora,
} from "../../../lib/rhStaffHorarioTurno";
import type { Operadora } from "../../../types";
import { PageHeader } from "../../../components/PageHeader";
import { SortTableTh, type SortDir } from "../../../components/dashboard/SortTableTh";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import type { RhFuncionario, RhFuncionarioHistorico, RhStaffAnotacao } from "../../../types/rhFuncionario";

type StaffTimeRow = { id: string; nome: string; gerencia_id: string; gerencia_nome: string };

type StaffSkillKey = "baccarat" | "blackjack" | "vip" | "roleta" | "futebol_studio";
type StaffSkillStatus = "ativo" | "treinamento" | "inativo";

const STAFF_SKILL_KEYS: { key: StaffSkillKey; label: string }[] = [
  { key: "baccarat", label: "Baccarat" },
  { key: "blackjack", label: "Blackjack" },
  { key: "vip", label: "VIP" },
  { key: "roleta", label: "Roleta" },
  { key: "futebol_studio", label: "Futebol Studio" },
];

const SKILL_STATUS_OPTS: { value: StaffSkillStatus; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "treinamento", label: "Treinamento" },
  { value: "inativo", label: "Inativo" },
];

function labelStatusPrestador(s: RhFuncionario["status"]): string {
  if (s === "ativo") return "Ativo";
  if (s === "indisponivel") return "Indisponível";
  return "Encerrado";
}

function fmtDataHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

/** Nome do time do organograma normalizado para regras de UI (acentos, espaços). */
function normStaffNomeTimeUi(nome: string | null | undefined): string {
  return (nome ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/** Times em que a tabela (vista time a time) troca Operadora por Horário do Turno e os modais ocultam operadora/bio/fotos. */
function staffUiTimeSemOperadoraHorarioModaisRestritos(nomeTime: string): boolean {
  const n = normStaffNomeTimeUi(nomeTime);
  return (
    n === "service manager" ||
    n === "customer service" ||
    n === "shift leader" ||
    n === "performance coach"
  );
}

/** Shuffler: só ocultar Bio e Fotos na aba Dados de função (visualizar). */
function staffUiTimeShufflerOcultarBioFotosVer(nomeTime: string): boolean {
  return normStaffNomeTimeUi(nomeTime) === "shuffler";
}

type OpTurnosStaffPick = Pick<Operadora, "turno_manha_inicio" | "turno_tarde_inicio" | "turno_noite_inicio">;

/** Texto da coluna «Horário do Turno» na tabela (com dados de operadora quando necessário). */
function textoHorarioTurnoStaffEmTabela(row: RhFuncionario, opBySlug: Record<string, OpTurnosStaffPick | null>): string {
  const te = turnoRhCoerenteComEscala(row.escala, row.staff_turno);
  if (escalaUsaHorarioTurnoEditavel(row.escala, te)) {
    return labelHorarioTurnoStaffPorValor(row.staff_horario_turno);
  }
  if (escalaComHorarioTurnoSomenteOperadora(row.escala)) {
    const slug = row.staff_operadora_slug?.trim();
    const op = slug ? opBySlug[slug] ?? null : null;
    const txt = textoHorarioTurnoSomenteOperadora(row.escala, te, op).trim();
    return txt || "—";
  }
  return "—";
}

function normalizarSkills(raw: Record<string, unknown> | null | undefined): Record<StaffSkillKey, StaffSkillStatus> {
  const out: Record<string, StaffSkillStatus> = {};
  for (const { key } of STAFF_SKILL_KEYS) {
    const v = String(raw?.[key] ?? "inativo").toLowerCase();
    out[key] =
      v === "ativo" || v === "treinamento" || v === "inativo" ? (v as StaffSkillStatus) : "inativo";
  }
  return out as Record<StaffSkillKey, StaffSkillStatus>;
}

function skillsParaJson(s: Record<StaffSkillKey, StaffSkillStatus>): Record<string, string> {
  const o: Record<string, string> = {};
  STAFF_SKILL_KEYS.forEach(({ key }) => {
    o[key] = s[key];
  });
  return o;
}

function stringifySkills(s: Record<StaffSkillKey, StaffSkillStatus>): string {
  return JSON.stringify(skillsParaJson(s));
}

/** Títulos no histórico: novos saves já usam nome curto; entradas antigas são normalizadas na leitura. */
function labelCampoHistorico(campo: string): string {
  const c = campo.trim();
  if (c === "Operadora (slug)") return "Operadora";
  if (c === "Skills (JSON)") return "Skills";
  if (c === "Horário do Turno") return "Horário do Turno";
  return c;
}

type VerAba = "pessoal" | "funcao" | "skills" | "historico";

type EditarAba = "funcao" | "skills" | "dealer";

const DEALER_GENERO_LABEL: Record<DealerGenero, string> = {
  feminino: "Feminino",
  masculino: "Masculino",
};

type StaffTabelaSortCol =
  | "nome"
  | "nickname"
  | "time"
  | "funcao"
  | "escala"
  | "turno"
  | "horario_turno"
  | "operadora"
  | "status"
  | "id_op";

function CampoLeitura({ k, v, t }: { k: string; v: string; t: { textMuted: string; text: string } }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>{k}</div>
      <div style={{ fontSize: 13, color: t.text, fontFamily: FONT.body, lineHeight: 1.45 }}>{v || "—"}</div>
    </div>
  );
}

function ModalStaffAnotacoes({
  row,
  onClose,
  t,
  brand,
  canEditarOk,
}: {
  row: RhFuncionario;
  onClose: () => void;
  t: ReturnType<typeof useApp>["theme"];
  brand: ReturnType<typeof useDashboardBrand>;
  canEditarOk: boolean;
}) {
  const [lista, setLista] = useState<RhStaffAnotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomesAutor, setNomesAutor] = useState<Record<string, string>>({});
  const [textoNovo, setTextoNovo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [err, setErr] = useState("");

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: t.textMuted,
    marginBottom: 6,
    fontFamily: FONT.body,
  };
  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 13,
    boxSizing: "border-box",
    minHeight: 120,
    resize: "vertical" as const,
    lineHeight: 1.45,
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    setErr("");
    const { data, error } = await supabase
      .from("rh_staff_anotacoes")
      .select("id, rh_funcionario_id, texto, created_at, created_by")
      .eq("rh_funcionario_id", row.id)
      .order("created_at", { ascending: false });
    if (error) {
      setLista([]);
      setNomesAutor({});
      setErr(error.message || "Não foi possível carregar as anotações.");
      setLoading(false);
      return;
    }
    const items = (data ?? []) as RhStaffAnotacao[];
    setLista(items);
    const ids = [...new Set(items.map((a) => a.created_by).filter(Boolean))] as string[];
    if (ids.length === 0) {
      setNomesAutor({});
      setLoading(false);
      return;
    }
    const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
    const m: Record<string, string> = {};
    (profs ?? []).forEach((p: { id: string; name: string | null }) => {
      m[p.id] = (p.name ?? "").trim() || p.id.slice(0, 8);
    });
    setNomesAutor(m);
    setLoading(false);
  }, [row.id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const nomeAutor = (a: RhStaffAnotacao) => {
    if (!a.created_by) return "—";
    return nomesAutor[a.created_by] ?? `${a.created_by.slice(0, 8)}…`;
  };

  const salvar = async () => {
    const textoTrim = textoNovo.trim();
    if (!textoTrim) {
      setErr("Escreva a anotação antes de salvar.");
      return;
    }
    setErr("");
    setSalvando(true);
    const { error } = await supabase.from("rh_staff_anotacoes").insert({
      rh_funcionario_id: row.id,
      texto: textoTrim,
    });
    if (error) {
      setErr(error.message || "Não foi possível salvar a anotação.");
      setSalvando(false);
      return;
    }
    setTextoNovo("");
    await carregar();
    setSalvando(false);
  };

  return (
    <ModalBase maxWidth={600} onClose={onClose}>
      <ModalHeader title={`Anotações — ${row.nome}`} onClose={onClose} />
      <div style={{ padding: "0 4px 16px", fontFamily: FONT.body }}>
        <div
          style={{
            marginBottom: 20,
            padding: "14px 16px",
            borderRadius: 12,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
          }}
        >
          <div style={{ ...labelStyle, fontSize: 12, color: t.text, marginBottom: 10 }}>Registrar anotações</div>
          {canEditarOk ? (
            <>
              <label htmlFor="staff-anotacao-nova" style={labelStyle}>
                Observações sobre este prestador
              </label>
              <textarea
                id="staff-anotacao-nova"
                value={textoNovo}
                onChange={(e) => setTextoNovo(e.target.value)}
                style={inputStyle}
                rows={5}
                placeholder="Escreva aqui anotações ou observações internas…"
                aria-label="Texto da nova anotação"
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button
                  type="button"
                  disabled={salvando || !textoNovo.trim()}
                  onClick={() => void salvar()}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "none",
                    color: "#fff",
                    fontWeight: 700,
                    fontFamily: FONT.body,
                    fontSize: 13,
                    cursor: salvando || !textoNovo.trim() ? "not-allowed" : "pointer",
                    opacity: salvando || !textoNovo.trim() ? 0.65 : 1,
                    background: brand.useBrand
                      ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
                      : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {salvando ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
                  Salvar anotação
                </button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
              Apenas utilizadores com permissão de edição em Gestão de Staff podem registrar novas anotações.
            </p>
          )}
        </div>

        <div style={{ ...labelStyle, fontSize: 12, color: t.text, marginBottom: 10 }}>Anotações anteriores</div>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: t.textMuted, lineHeight: 1.45 }}>
          Estas entradas são só desta página e não aparecem no histórico geral de RH nem na Gestão de Prestadores.
        </p>
        {err ? (
          <div role="alert" style={{ color: "#e84025", fontSize: 12, marginBottom: 12 }}>
            {err}
          </div>
        ) : null}
        {loading ? (
          <div style={{ color: t.textMuted, fontSize: 13 }}>
            <Loader2 size={16} className="app-lucide-spin" aria-hidden style={{ marginRight: 8, verticalAlign: "middle" }} />
            Carregando anotações…
          </div>
        ) : lista.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>Ainda não há anotações registradas.</div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "min(48dvh, 360px)", overflowY: "auto" }}>
            {lista.map((a) => (
              <li
                key={a.id}
                style={{
                  marginBottom: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.cardBg,
                }}
              >
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: t.text }}>Data/Hora:</span> {fmtDataHora(a.created_at)}
                </div>
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, color: t.text }}>Usuário que registrou:</span> {nomeAutor(a)}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: t.text,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "break-word",
                    wordBreak: "break-word",
                  }}
                >
                  {a.texto}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

export default function RhGestaoStaffPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_staff");

  const [times, setTimes] = useState<StaffTimeRow[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(true);
  const [erroTimes, setErroTimes] = useState<string | null>(null);

  const [operadorasNome, setOperadorasNome] = useState<Record<string, string>>({});
  const [prestadores, setPrestadores] = useState<RhFuncionario[]>([]);
  const [loadingPrestadores, setLoadingPrestadores] = useState(true);

  const [todosTimes, setTodosTimes] = useState(true);
  const [idxTime, setIdxTime] = useState(0);
  const [buscaNomeNickname, setBuscaNomeNickname] = useState("");

  const [modalVer, setModalVer] = useState<RhFuncionario | null>(null);
  const [modalEditar, setModalEditar] = useState<RhFuncionario | null>(null);
  const [modalAnotacoes, setModalAnotacoes] = useState<RhFuncionario | null>(null);
  const [opTurnosPorSlug, setOpTurnosPorSlug] = useState<Record<string, OpTurnosStaffPick | null>>({});

  const [sortCol, setSortCol] = useState<StaffTabelaSortCol>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const carregarTimes = useCallback(async () => {
    setLoadingTimes(true);
    setErroTimes(null);
    const { data, error } = await supabase.rpc("rh_staff_times_filtrados");
    if (error) {
      setErroTimes("Não foi possível carregar os times. Aplique a migration e verifique a permissão rh_staff.");
      setTimes([]);
    } else {
      setTimes((data ?? []) as StaffTimeRow[]);
    }
    setLoadingTimes(false);
  }, []);

  const carregarOperadoras = useCallback(async () => {
    const { data } = await supabase.from("operadoras").select("slug, nome").eq("ativo", true);
    const m: Record<string, string> = {};
    (data ?? []).forEach((r: { slug: string; nome: string }) => {
      m[r.slug] = r.nome;
    });
    setOperadorasNome(m);
  }, []);

  const carregarPrestadores = useCallback(async (timeIds: string[]) => {
    if (timeIds.length === 0) {
      setPrestadores([]);
      setLoadingPrestadores(false);
      return;
    }
    setLoadingPrestadores(true);
    const { data, error } = await supabase
      .from("rh_funcionarios")
      .select("*")
      .in("org_time_id", timeIds)
      .in("status", ["ativo", "indisponivel"])
      .order("nome", { ascending: true });
    if (error) setPrestadores([]);
    else setPrestadores((data ?? []) as RhFuncionario[]);
    setLoadingPrestadores(false);
  }, []);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void carregarTimes();
    void carregarOperadoras();
  }, [perm.loading, perm.canView, carregarTimes, carregarOperadoras]);

  const timeIds = useMemo(() => times.map((x) => x.id), [times]);
  const timeIdsKey = useMemo(() => [...timeIds].sort().join(","), [timeIds]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    if (timeIds.length === 0) {
      setPrestadores([]);
      setLoadingPrestadores(false);
      return;
    }
    void carregarPrestadores(timeIds);
  }, [perm.loading, perm.canView, timeIdsKey, carregarPrestadores, timeIds]);

  useEffect(() => {
    if (times.length === 0) return;
    if (idxTime >= times.length) setIdxTime(0);
  }, [times.length, idxTime]);

  const linhasTabela = useMemo(() => {
    if (times.length === 0) return [];
    const permitidos = new Set(timeIds);
    let rows = prestadores.filter((p) => p.org_time_id && permitidos.has(p.org_time_id));
    if (!todosTimes && times[idxTime]) {
      const tid = times[idxTime]!.id;
      rows = rows.filter((p) => p.org_time_id === tid);
    }
    const q = buscaNomeNickname.trim().toLowerCase();
    if (q) {
      rows = rows.filter((p) => {
        const nome = (p.nome ?? "").toLowerCase();
        const nick = (p.staff_nickname ?? "").trim().toLowerCase();
        return nome.includes(q) || nick.includes(q);
      });
    }
    return rows;
  }, [prestadores, times, todosTimes, idxTime, timeIds, buscaNomeNickname]);

  const nomePorTimeId = useMemo(() => {
    const m = new Map<string, string>();
    times.forEach((x) => m.set(x.id, x.nome));
    return m;
  }, [times]);

  /** Vista time a time: tabela sem coluna Operadora e com Horário do Turno (times de serviço). */
  const layoutTabelaSemOperadoraComHorario = useMemo(() => {
    if (todosTimes || !times[idxTime]) return false;
    return staffUiTimeSemOperadoraHorarioModaisRestritos(times[idxTime]!.nome);
  }, [todosTimes, times, idxTime]);

  const slugsParaFetchHorarioTabela = useMemo(() => {
    if (!layoutTabelaSemOperadoraComHorario) return [] as string[];
    const set = new Set<string>();
    for (const r of linhasTabela) {
      const slug = r.staff_operadora_slug?.trim();
      if (slug) set.add(slug);
    }
    return [...set].sort();
  }, [layoutTabelaSemOperadoraComHorario, linhasTabela]);

  useEffect(() => {
    if (!layoutTabelaSemOperadoraComHorario || slugsParaFetchHorarioTabela.length === 0) {
      setOpTurnosPorSlug({});
      return;
    }
    let cancel = false;
    void supabase
      .from("operadoras")
      .select("slug, turno_manha_inicio, turno_tarde_inicio, turno_noite_inicio")
      .in("slug", slugsParaFetchHorarioTabela)
      .then(({ data, error }) => {
        if (cancel) return;
        if (error) {
          setOpTurnosPorSlug({});
          return;
        }
        const m: Record<string, OpTurnosStaffPick | null> = {};
        (data ?? []).forEach((r: OpTurnosStaffPick & { slug: string }) => {
          m[r.slug] = r;
        });
        setOpTurnosPorSlug(m);
      });
    return () => {
      cancel = true;
    };
  }, [layoutTabelaSemOperadoraComHorario, slugsParaFetchHorarioTabela]);

  useEffect(() => {
    setSortCol((c) => {
      if (layoutTabelaSemOperadoraComHorario) return c === "operadora" ? "nome" : c;
      return c === "horario_turno" ? "nome" : c;
    });
  }, [layoutTabelaSemOperadoraComHorario]);

  const handleSortStaff = useCallback((col: StaffTabelaSortCol) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return col;
    });
  }, []);

  const linhasTabelaOrdenadas = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const nomeTime = (r: RhFuncionario) =>
      (r.org_time_id ? nomePorTimeId.get(r.org_time_id) ?? "" : "").trim().toLowerCase();
    const turnoStr = (r: RhFuncionario) =>
      (turnoRhCoerenteComEscala(r.escala, r.staff_turno) ?? "").trim().toLowerCase();
    const opSlug = (r: RhFuncionario) => (r.staff_operadora_slug ?? "").trim().toLowerCase();
    return [...linhasTabela].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "nome":
          cmp = (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR");
          break;
        case "nickname":
          cmp = (a.staff_nickname ?? "").localeCompare(b.staff_nickname ?? "", "pt-BR");
          break;
        case "time":
          cmp = nomeTime(a).localeCompare(nomeTime(b), "pt-BR");
          break;
        case "funcao":
          cmp = (a.cargo ?? "").localeCompare(b.cargo ?? "", "pt-BR");
          break;
        case "escala":
          cmp = (a.escala ?? "").localeCompare(b.escala ?? "", "pt-BR");
          break;
        case "turno":
          cmp = turnoStr(a).localeCompare(turnoStr(b), "pt-BR");
          break;
        case "horario_turno":
          cmp = textoHorarioTurnoStaffEmTabela(a, opTurnosPorSlug).localeCompare(
            textoHorarioTurnoStaffEmTabela(b, opTurnosPorSlug),
            "pt-BR",
          );
          break;
        case "operadora":
          cmp = opSlug(a).localeCompare(opSlug(b), "pt-BR");
          break;
        case "status":
          cmp = a.status.localeCompare(b.status, "pt-BR");
          break;
        case "id_op":
          cmp = (a.staff_id_operacional ?? "").localeCompare(b.staff_id_operacional ?? "", "pt-BR");
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
  }, [linhasTabela, sortCol, sortDir, nomePorTimeId, opTurnosPorSlug]);

  const timeLabelCentro = useMemo(() => {
    if (times.length === 0) return "—";
    const row = times[idxTime];
    if (!row) return "—";
    return row.nome;
  }, [times, idxTime]);

  const podeTimeAnterior = !todosTimes && times.length > 0 && idxTime > 0;
  const podeTimeProximo = !todosTimes && times.length > 0 && idxTime < times.length - 1;

  const btnNavStyle: CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  const btnIconTabela: CSSProperties = {
    padding: "6px 10px",
    borderRadius: 8,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: FONT.body,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
        <Loader2 size={24} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
      <PageHeader
        icon={<Users size={14} aria-hidden />}
        title="Gestão de Staff"
        subtitle="Prestadores dos times de Game Floor e Operation Management."
      />

      {erroTimes && (
        <div
          role="alert"
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            color: "#e84025",
            border: "1px solid rgba(232,64,37,0.35)",
            background: "rgba(232,64,37,0.08)",
          }}
        >
          {erroTimes}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${t.cardBorder}`,
            background: brand.blockBg,
            padding: "12px 20px",
            boxShadow: cardShadow,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setIdxTime((i) => Math.max(0, i - 1))}
              disabled={!podeTimeAnterior}
              aria-label="Time anterior"
              style={{
                ...btnNavStyle,
                opacity: podeTimeAnterior ? 1 : 0.35,
                cursor: podeTimeAnterior ? "pointer" : "not-allowed",
              }}
            >
              <ChevronLeft size={14} aria-hidden />
            </button>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT_TITLE,
                minWidth: "clamp(140px, 36vw, 260px)",
                textAlign: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={!todosTimes && times[idxTime] ? `${times[idxTime]!.gerencia_nome} — ${times[idxTime]!.nome}` : undefined}
            >
              {todosTimes ? "Todos os times" : timeLabelCentro}
            </span>
            <button
              type="button"
              onClick={() => setIdxTime((i) => Math.min(times.length - 1, i + 1))}
              disabled={!podeTimeProximo}
              aria-label="Próximo time"
              style={{
                ...btnNavStyle,
                opacity: podeTimeProximo ? 1 : 0.35,
                cursor: podeTimeProximo ? "pointer" : "not-allowed",
              }}
            >
              <ChevronRight size={14} aria-hidden />
            </button>

            <button
              type="button"
              aria-label={todosTimes ? "Filtrar por um time" : "Ver todos os times"}
              aria-pressed={todosTimes}
              onClick={() => {
                setTodosTimes((v) => !v);
                setIdxTime(0);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                minHeight: 44,
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                border: todosTimes ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
                background: todosTimes
                  ? brand.useBrand
                    ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                    : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                  : "transparent",
                color: todosTimes ? brand.accent : t.textMuted,
                fontWeight: todosTimes ? 700 : 400,
              }}
            >
              Todos os Times
            </button>

            {loadingTimes ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textMuted }}>
                <Loader2 size={14} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                Carregando…
              </span>
            ) : null}
          </div>

          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: `1px solid ${t.cardBorder}`,
            }}
          >
            <label
              htmlFor="staff-busca-nome-nick"
              style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 8, fontFamily: FONT.body }}
            >
              Pesquisar prestador
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Search size={16} aria-hidden style={{ flexShrink: 0, color: t.textMuted }} />
              <input
                id="staff-busca-nome-nick"
                type="search"
                value={buscaNomeNickname}
                onChange={(e) => setBuscaNomeNickname(e.target.value)}
                placeholder="Nome ou nickname"
                autoComplete="off"
                aria-label="Pesquisar por nome ou nickname"
                style={{
                  flex: 1,
                  minWidth: 0,
                  maxWidth: 420,
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {loadingPrestadores || loadingTimes ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 10 }}>
          <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
          <span style={{ color: t.textMuted, fontSize: 13 }}>Carregando prestadores…</span>
        </div>
      ) : times.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Nenhum time encontrado para as gerências Game Floor ou Operation Management. Ajuste os nomes no organograma ou
          contacte o RH.
        </div>
      ) : (
        <div className="app-table-wrap">
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              borderRadius: 14,
              overflow: "hidden",
              border: `1px solid ${t.cardBorder}`,
            }}
          >
            <caption style={{ display: "none" }}>Staff por time</caption>
            <thead>
              <tr>
                <SortTableTh
                  label="Nome"
                  col="nome"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortStaff}
                  thStyle={getThStyle(t)}
                />
                <SortTableTh
                  label="Nickname"
                  col="nickname"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortStaff}
                  thStyle={getThStyle(t)}
                />
                <SortTableTh
                  label="Time"
                  col="time"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortStaff}
                  thStyle={getThStyle(t)}
                />
                <SortTableTh
                  label="Função"
                  col="funcao"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortStaff}
                  thStyle={getThStyle(t)}
                />
                <SortTableTh
                  label="Escala"
                  col="escala"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortStaff}
                  thStyle={getThStyle(t)}
                />
                <SortTableTh
                  label="Turno"
                  col="turno"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortStaff}
                  thStyle={getThStyle(t)}
                />
                {layoutTabelaSemOperadoraComHorario ? (
                  <SortTableTh
                    label="Horário do Turno"
                    col="horario_turno"
                    sortCol={sortCol}
                    sortDir={sortDir}
                    onSort={handleSortStaff}
                    thStyle={getThStyle(t)}
                  />
                ) : (
                  <SortTableTh
                    label="Operadora"
                    col="operadora"
                    sortCol={sortCol}
                    sortDir={sortDir}
                    onSort={handleSortStaff}
                    thStyle={getThStyle(t)}
                  />
                )}
                <SortTableTh
                  label="Status"
                  col="status"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortStaff}
                  thStyle={getThStyle(t)}
                />
                <SortTableTh
                  label="ID operacional"
                  col="id_op"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSortStaff}
                  thStyle={getThStyle(t)}
                />
                <th scope="col" style={{ ...getThStyle(t), textAlign: "right" }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {linhasTabela.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ ...getTdStyle(t), textAlign: "center", padding: "32px 16px", color: t.textMuted }}>
                    Nenhum prestador neste filtro.
                  </td>
                </tr>
              ) : (
                linhasTabelaOrdenadas.map((row, i) => {
                  const opSlug = row.staff_operadora_slug?.trim();
                  const opNome = opSlug ? operadorasNome[opSlug] ?? opSlug : "—";
                  const nomeTime =
                    row.org_time_id && nomePorTimeId.has(row.org_time_id)
                      ? nomePorTimeId.get(row.org_time_id) ?? "—"
                      : "—";
                  return (
                    <tr key={row.id} style={{ background: zebraStripe(i) }}>
                      <td style={getTdStyle(t)} title={row.nome}>
                        {row.nome}
                      </td>
                      <td style={getTdStyle(t)}>{row.staff_nickname?.trim() || "—"}</td>
                      <td style={getTdStyle(t)} title={nomeTime}>
                        {nomeTime}
                      </td>
                      <td style={getTdStyle(t)}>{row.cargo?.trim() || "—"}</td>
                      <td style={getTdStyle(t)} title="Gestão de Prestadores (somente leitura)">
                        {row.escala?.trim() || "—"}
                      </td>
                      <td
                        style={getTdStyle(t)}
                        title="Mesmo campo que na Gestão de Prestadores (Dados da contratação). Pode alterar em Editar."
                      >
                        {turnoRhCoerenteComEscala(row.escala, row.staff_turno) || "—"}
                      </td>
                      {layoutTabelaSemOperadoraComHorario ? (
                        <td style={getTdStyle(t)} title="Horário do turno (Gestão de Staff)">
                          {textoHorarioTurnoStaffEmTabela(row, opTurnosPorSlug)}
                        </td>
                      ) : (
                        <td style={getTdStyle(t)}>{opNome}</td>
                      )}
                      <td style={getTdStyle(t)}>{labelStatusPrestador(row.status)}</td>
                      <td style={getTdStyle(t)} title={row.staff_id_operacional?.trim() || undefined}>
                        {row.staff_id_operacional?.trim() || "—"}
                      </td>
                      <td style={{ ...getTdStyle(t), textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => setModalVer(row)}
                            style={btnIconTabela}
                            aria-label={`Visualizar ${row.nome}`}
                          >
                            <Eye size={14} aria-hidden />
                          </button>
                          {perm.canEditarOk ? (
                            <button type="button" onClick={() => setModalEditar(row)} style={btnIconTabela} aria-label={`Editar ${row.nome}`}>
                              <Pencil size={14} aria-hidden />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setModalAnotacoes(row)}
                            style={btnIconTabela}
                            aria-label={`Anotações de ${row.nome}`}
                          >
                            <StickyNote size={14} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalVer ? (
        <ModalStaffVer
          row={modalVer}
          nomeTimeOrganograma={modalVer.org_time_id ? nomePorTimeId.get(modalVer.org_time_id) ?? "" : ""}
          operadorasNome={operadorasNome}
          dadosFuncaoOcultarOperadora={staffUiTimeSemOperadoraHorarioModaisRestritos(
            modalVer.org_time_id ? nomePorTimeId.get(modalVer.org_time_id) ?? "" : "",
          )}
          dadosFuncaoOcultarBioFotos={
            staffUiTimeSemOperadoraHorarioModaisRestritos(
              modalVer.org_time_id ? nomePorTimeId.get(modalVer.org_time_id) ?? "" : "",
            ) ||
            staffUiTimeShufflerOcultarBioFotosVer(modalVer.org_time_id ? nomePorTimeId.get(modalVer.org_time_id) ?? "" : "")
          }
          onClose={() => setModalVer(null)}
          t={t}
          brand={brand}
        />
      ) : null}

      {modalEditar ? (
        <ModalStaffEditar
          row={modalEditar}
          nomeTimeOrganograma={modalEditar.org_time_id ? nomePorTimeId.get(modalEditar.org_time_id) ?? "" : ""}
          operadorasNome={operadorasNome}
          operadoraSlugs={Object.keys(operadorasNome).sort((a, b) =>
            (operadorasNome[a] ?? a).localeCompare(operadorasNome[b] ?? b, "pt-BR"),
          )}
          userEmail={user?.email ?? null}
          ocultarCampoOperadora={staffUiTimeSemOperadoraHorarioModaisRestritos(
            modalEditar.org_time_id ? nomePorTimeId.get(modalEditar.org_time_id) ?? "" : "",
          )}
          onClose={() => setModalEditar(null)}
          onSalvo={(atualizado) => {
            setPrestadores((lista) => lista.map((p) => (p.id === atualizado.id ? atualizado : p)));
            setModalEditar(null);
            setModalVer(null);
          }}
          t={t}
          brand={brand}
        />
      ) : null}

      {modalAnotacoes ? (
        <ModalStaffAnotacoes
          row={modalAnotacoes}
          onClose={() => setModalAnotacoes(null)}
          t={t}
          brand={brand}
          canEditarOk={perm.canEditarOk}
        />
      ) : null}
    </div>
  );
}

function ModalStaffVer({
  row,
  nomeTimeOrganograma,
  operadorasNome,
  dadosFuncaoOcultarOperadora = false,
  dadosFuncaoOcultarBioFotos = false,
  onClose,
  t,
  brand,
}: {
  row: RhFuncionario;
  /** Nome do time no organograma (rh_org_times), mesma regra que na tabela. */
  nomeTimeOrganograma: string;
  operadorasNome: Record<string, string>;
  /** Times Service Manager, Customer Service, Shift Leader, Performance Coach. */
  dadosFuncaoOcultarOperadora?: boolean;
  /** Inclui Shuffler (só bio/fotos) ou o grupo acima (operadora + bio + fotos). */
  dadosFuncaoOcultarBioFotos?: boolean;
  onClose: () => void;
  t: ReturnType<typeof useApp>["theme"];
  brand: ReturnType<typeof useDashboardBrand>;
}) {
  const staffEhGamePresenter = useMemo(() => isGamePresenterTimeNome(nomeTimeOrganograma), [nomeTimeOrganograma]);
  const [aba, setAba] = useState<VerAba>("pessoal");
  const [hist, setHist] = useState<RhFuncionarioHistorico[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [nomesAutor, setNomesAutor] = useState<Record<string, string>>({});

  useEffect(() => {
    if (aba !== "historico") return;
    setHistLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from("rh_funcionario_historico")
        .select("*")
        .eq("rh_funcionario_id", row.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        setHist([]);
        setHistLoading(false);
        return;
      }
      const items = (data ?? []) as RhFuncionarioHistorico[];
      setHist(items);
      const ids = [...new Set(items.map((h) => h.created_by).filter(Boolean))] as string[];
      if (ids.length === 0) {
        setNomesAutor({});
        setHistLoading(false);
        return;
      }
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
      const m: Record<string, string> = {};
      (profs ?? []).forEach((p: { id: string; name: string | null }) => {
        m[p.id] = (p.name ?? "").trim() || p.id.slice(0, 8);
      });
      setNomesAutor(m);
      setHistLoading(false);
    })();
  }, [aba, row.id]);

  useEffect(() => {
    if (!staffEhGamePresenter && aba === "skills") setAba("funcao");
  }, [staffEhGamePresenter, aba]);

  const skills = useMemo(() => normalizarSkills(row.staff_skills as Record<string, unknown>), [row.staff_skills]);
  const opSlug = row.staff_operadora_slug?.trim();
  const opNome = opSlug ? operadorasNome[opSlug] ?? opSlug : "—";
  const turnoEfVer = turnoRhCoerenteComEscala(row.escala, row.staff_turno);
  const [opTurnosVer, setOpTurnosVer] = useState<Pick<
    Operadora,
    "turno_manha_inicio" | "turno_tarde_inicio" | "turno_noite_inicio"
  > | null>(null);

  useEffect(() => {
    if (!opSlug || !escalaComHorarioTurnoSomenteOperadora(row.escala)) {
      setOpTurnosVer(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from("operadoras")
      .select("turno_manha_inicio, turno_tarde_inicio, turno_noite_inicio")
      .eq("slug", opSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setOpTurnosVer((data as Operadora) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [opSlug, row.escala]);

  const tabBtn = (key: VerAba, label: string) => {
    const ativo = aba === key;
    return (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={ativo}
        onClick={() => setAba(key)}
        style={{
          padding: "8px 14px",
          borderRadius: 10,
          fontWeight: 700,
          fontFamily: FONT.body,
          fontSize: 12,
          cursor: "pointer",
          border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
          background: ativo
            ? brand.useBrand
              ? "color-mix(in srgb, var(--brand-accent) 14%, transparent)"
              : "rgba(124,58,237,0.14)"
            : (t.inputBg ?? "transparent"),
          color: ativo ? brand.accent : t.textMuted,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <ModalBase onClose={onClose} maxWidth={600}>
      <ModalHeader title={`Prestador — ${row.nome}`} onClose={onClose} />
      <div role="tablist" aria-label="Seções do prestador" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {tabBtn("pessoal", "Dados pessoais")}
        {tabBtn("funcao", "Dados de função")}
        {staffEhGamePresenter ? tabBtn("skills", "Dados de skills") : null}
        {tabBtn("historico", "Histórico")}
      </div>

      {aba === "pessoal" && (
        <div role="tabpanel">
          <CampoLeitura k="Nome" v={row.nome} t={t} />
          <CampoLeitura k="Status" v={labelStatusPrestador(row.status)} t={t} />
          <CampoLeitura k="Telefone" v={row.telefone} t={t} />
          <CampoLeitura k="E-mail" v={row.email} t={t} />
          <CampoLeitura k="Gênero" v={DEALER_GENERO_LABEL[readStaffDealerGeneroForUi(row)]} t={t} />
          <CampoLeitura k="Contato de emergência — nome" v={row.emerg_nome} t={t} />
          <CampoLeitura k="Contato de emergência — parentesco" v={row.emerg_parentesco} t={t} />
          <CampoLeitura k="Contato de emergência — telefone" v={row.emerg_telefone} t={t} />
        </div>
      )}

      {aba === "funcao" && (
        <div role="tabpanel">
          <CampoLeitura k="Nickname" v={row.staff_nickname ?? ""} t={t} />
          <CampoLeitura k="Função" v={row.cargo} t={t} />
          <CampoLeitura k="Escala" v={row.escala} t={t} />
          <CampoLeitura k="Turno" v={turnoEfVer || "—"} t={t} />
          {escalaUsaHorarioTurnoEditavel(row.escala, turnoEfVer) ? (
            <CampoLeitura k="Horário do Turno" v={labelHorarioTurnoStaffPorValor(row.staff_horario_turno)} t={t} />
          ) : escalaComHorarioTurnoSomenteOperadora(row.escala) ? (
            <CampoLeitura k="Horário do Turno" v={textoHorarioTurnoSomenteOperadora(row.escala, turnoEfVer, opTurnosVer)} t={t} />
          ) : (
            <CampoLeitura k="Horário do Turno" v="—" t={t} />
          )}
          {!dadosFuncaoOcultarOperadora ? <CampoLeitura k="Operadora" v={opNome} t={t} /> : null}
          <CampoLeitura k="Barcode" v={row.staff_barcode ?? ""} t={t} />
          <CampoLeitura k="ID operacional" v={row.staff_id_operacional ?? ""} t={t} />
          {!dadosFuncaoOcultarBioFotos ? (
            <>
              <CampoLeitura k="Bio do Dealer" v={readStaffDealerBioForUi(row) || "—"} t={t} />
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 8, fontFamily: FONT.body }}>Fotos</div>
                {(() => {
                  const urls = readStaffDealerFotosForUi(row);
                  if (urls.length === 0) {
                    return <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>—</div>;
                  }
                  return (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {urls.map((url) => (
                        <div
                          key={url}
                          style={{
                            width: 88,
                            height: 88,
                            borderRadius: 10,
                            overflow: "hidden",
                            border: `1px solid ${t.cardBorder}`,
                            flexShrink: 0,
                          }}
                        >
                          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </>
          ) : null}
        </div>
      )}

      {aba === "skills" && (
        <div role="tabpanel">
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12, fontFamily: FONT.body }}>
            Status de conhecimento por jogo.
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {STAFF_SKILL_KEYS.map(({ key, label }) => (
              <li
                key={key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: `1px solid ${t.cardBorder}`,
                  fontFamily: FONT.body,
                  fontSize: 13,
                  color: t.text,
                }}
              >
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span style={{ color: t.textMuted }}>{SKILL_STATUS_OPTS.find((o) => o.value === skills[key])?.label ?? "Inativo"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {aba === "historico" && (
        <div role="tabpanel" style={{ minWidth: 0, maxWidth: "100%" }}>
          {histLoading ? (
            <div style={{ color: t.textMuted, fontSize: 13 }}>
              <Loader2 size={16} className="app-lucide-spin" aria-hidden style={{ marginRight: 8, verticalAlign: "middle" }} />
              Carregando histórico…
            </div>
          ) : hist.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>Nenhum registro no histórico.</div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                maxHeight: "50dvh",
                overflowY: "auto",
                minWidth: 0,
              }}
            >
              {hist.map((h) => {
                const det = h.detalhes ?? {};
                const labelUser = det.usuario_label != null ? String(det.usuario_label).trim() : "";
                const autor =
                  labelUser ||
                  (h.created_by ? nomesAutor[h.created_by] ?? h.created_by.slice(0, 8) : "—");
                const titulo = h.tipo === "staff_gestao_edicao" ? "Alteração (Gestão de Staff)" : h.tipo;
                return (
                  <li
                    key={h.id}
                    style={{
                      marginBottom: 12,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg ?? "color-mix(in srgb, var(--brand-secondary, #4a2082) 6%, transparent)",
                      minWidth: 0,
                      maxWidth: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ fontWeight: 800, color: t.text, fontSize: 13, marginBottom: 6 }}>{titulo}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>
                      {fmtDataHora(h.created_at)} · {autor}
                    </div>
                    {"alteracoes" in det && Array.isArray(det.alteracoes) ? (
                      <ul
                        style={{
                          margin: 0,
                          paddingInlineStart: 18,
                          color: t.text,
                          fontSize: 13,
                          minWidth: 0,
                          listStylePosition: "outside",
                        }}
                      >
                        {(det.alteracoes as { campo: string; antes: string; depois: string }[]).map((alt, j) => (
                          <li key={j} style={{ marginBottom: 10, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4, fontFamily: FONT.body }}>
                              {labelCampoHistorico(alt.campo)}:
                            </div>
                            <div
                              style={{
                                fontFamily: FONT.body,
                                lineHeight: 1.45,
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              <span style={{ color: t.textMuted }}>{alt.antes}</span>
                              {" → "}
                              <span>{alt.depois}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontSize: 12, color: t.textMuted }}>Sem detalhes estruturados desta entrada.</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </ModalBase>
  );
}

function ModalStaffEditar({
  row,
  nomeTimeOrganograma,
  operadorasNome,
  operadoraSlugs,
  userEmail,
  ocultarCampoOperadora = false,
  onClose,
  onSalvo,
  t,
  brand,
}: {
  row: RhFuncionario;
  nomeTimeOrganograma: string;
  operadorasNome: Record<string, string>;
  operadoraSlugs: string[];
  userEmail: string | null;
  ocultarCampoOperadora?: boolean;
  onClose: () => void;
  onSalvo: (r: RhFuncionario) => void;
  t: ReturnType<typeof useApp>["theme"];
  brand: ReturnType<typeof useDashboardBrand>;
}) {
  const staffEhGamePresenter = useMemo(() => isGamePresenterTimeNome(nomeTimeOrganograma), [nomeTimeOrganograma]);
  const [aba, setAba] = useState<EditarAba>("funcao");
  const [nick, setNick] = useState(row.staff_nickname ?? "");
  const [turno, setTurno] = useState(row.staff_turno ?? "");
  const [opSlug, setOpSlug] = useState(row.staff_operadora_slug ?? "");
  const [barcode, setBarcode] = useState(row.staff_barcode ?? "");
  const [idOperacional, setIdOperacional] = useState(row.staff_id_operacional ?? "");
  const [horarioTurno, setHorarioTurno] = useState("");
  const [opTurnosEdit, setOpTurnosEdit] = useState<Pick<
    Operadora,
    "turno_manha_inicio" | "turno_tarde_inicio" | "turno_noite_inicio"
  > | null>(null);
  const [skills, setSkills] = useState<Record<StaffSkillKey, StaffSkillStatus>>(() => normalizarSkills(row.staff_skills as Record<string, unknown>));
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [dealerGenero, setDealerGenero] = useState<DealerGenero>(() => readStaffDealerGeneroForUi(row));
  const [dealerBio, setDealerBio] = useState(() => readStaffDealerBioForUi(row));
  const [dealerFotos, setDealerFotos] = useState<string[]>(() => readStaffDealerFotosForUi(row));
  const [dealerUploading, setDealerUploading] = useState(false);

  useEffect(() => {
    setNick(row.staff_nickname ?? "");
    setTurno(turnoRhCoerenteComEscala(row.escala, row.staff_turno));
    setOpSlug(row.staff_operadora_slug ?? "");
    setBarcode(row.staff_barcode ?? "");
    setIdOperacional(row.staff_id_operacional ?? "");
    {
      const te = turnoRhCoerenteComEscala(row.escala, row.staff_turno);
      const hRaw = (row.staff_horario_turno ?? "").trim();
      setHorarioTurno(hRaw && horarioTurnoStaffValorPermitido(row.escala, te, hRaw) ? hRaw : "");
    }
    setSkills(normalizarSkills(row.staff_skills as Record<string, unknown>));
    setAba("funcao");
    setDealerGenero(readStaffDealerGeneroForUi(row));
    setDealerBio(readStaffDealerBioForUi(row));
    setDealerFotos(readStaffDealerFotosForUi(row));
    setErr("");
  }, [
    row.id,
    row.escala,
    row.staff_nickname,
    row.staff_turno,
    row.staff_operadora_slug,
    row.staff_barcode,
    row.staff_id_operacional,
    row.staff_horario_turno,
    row.staff_skills,
    row.staff_dealer_genero,
    row.staff_dealer_bio,
    row.staff_dealer_fotos,
    row,
  ]);

  useEffect(() => {
    if (aba !== "dealer") return;
    setDealerGenero(readStaffDealerGeneroForUi(row));
    setDealerBio(readStaffDealerBioForUi(row));
    setDealerFotos(readStaffDealerFotosForUi(row));
  }, [aba, row.id, row.staff_dealer_genero, row.staff_dealer_bio, row.staff_dealer_fotos, row]);

  useEffect(() => {
    if (!staffEhGamePresenter && (aba === "skills" || aba === "dealer")) setAba("funcao");
  }, [staffEhGamePresenter, aba]);

  useEffect(() => {
    const slug = opSlug.trim();
    if (!slug || !escalaComHorarioTurnoSomenteOperadora(row.escala)) {
      setOpTurnosEdit(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from("operadoras")
      .select("turno_manha_inicio, turno_tarde_inicio, turno_noite_inicio")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setOpTurnosEdit((data as Operadora) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [opSlug, row.escala]);

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: t.textMuted,
    marginBottom: 6,
    fontFamily: FONT.body,
  };
  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 13,
    boxSizing: "border-box",
  };

  const handleDealerFotosUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setDealerUploading(true);
    setErr("");
    try {
      const novas: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${row.id}-${crypto.randomUUID()}.${ext}`;
        const { data, error } = await supabase.storage.from("dealer-photos").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("dealer-photos").getPublicUrl(data.path);
        novas.push(urlData.publicUrl);
      }
      setDealerFotos((prev) => [...prev, ...novas]);
    } catch (uploadErr) {
      setErr(
        uploadErr instanceof Error
          ? uploadErr.message
          : "Erro ao enviar foto. Verifique se o bucket dealer-photos existe no Storage.",
      );
    } finally {
      setDealerUploading(false);
      e.target.value = "";
    }
  };

  const salvar = async () => {
    setErr("");
    if (aba === "dealer") {
      setSaving(true);
      try {
        const { data: updatedRh, error } = await supabase
          .from("rh_funcionarios")
          .update({
            staff_dealer_genero: dealerGenero,
            staff_dealer_bio: dealerBio.trim() || null,
            staff_dealer_fotos: dealerFotos,
          })
          .eq("id", row.id)
          .select("*")
          .single();
        if (error) throw error;
        const merged = (updatedRh ?? row) as RhFuncionario;
        await syncGamePresenterDealerFromRhFuncionario(merged);
        onSalvo(merged);
      } catch (upErr) {
        setErr(upErr instanceof Error ? upErr.message : "Não foi possível salvar os dados do dealer.");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    const allowedTurnos = [...opcoesTurnoPorEscalaRh(row.escala ?? "")];
    const turnoStr = turno.trim();
    let turnoFinal: string | null = null;
    if (turnoStr) {
      if (!allowedTurnos.includes(turnoStr)) {
        setErr("Turno inválido para a escala deste prestador.");
        setSaving(false);
        return;
      }
      turnoFinal = turnoStr;
    }
    const precisaHorario = escalaUsaHorarioTurnoEditavel(row.escala, turnoFinal ?? "");
    const horarioFinal = precisaHorario ? (horarioTurno.trim() || null) : null;
    if (precisaHorario && turnoFinal && !horarioFinal) {
      setErr("Selecione o horário do turno.");
      setSaving(false);
      return;
    }
    if (
      precisaHorario &&
      horarioFinal &&
      !horarioTurnoStaffValorPermitido(row.escala, turnoFinal ?? "", horarioFinal)
    ) {
      setErr("Horário do turno inválido para esta escala.");
      setSaving(false);
      return;
    }

    const antes = {
      nick: (row.staff_nickname ?? "").trim(),
      turno: (row.staff_turno ?? "").trim(),
      op: (row.staff_operadora_slug ?? "").trim(),
      barcode: (row.staff_barcode ?? "").trim(),
      idOp: (row.staff_id_operacional ?? "").trim(),
      horario: (row.staff_horario_turno ?? "").trim(),
      skills: stringifySkills(normalizarSkills(row.staff_skills as Record<string, unknown>)),
    };
    const depois = {
      nick: nick.trim(),
      turno: (turnoFinal ?? "").trim(),
      op: opSlug.trim(),
      barcode: barcode.trim(),
      idOp: idOperacional.trim(),
      horario: (horarioFinal ?? "").trim(),
      skills: stringifySkills(skills),
    };
    const alteracoes: { campo: string; antes: string; depois: string }[] = [];
    if (antes.nick !== depois.nick) alteracoes.push({ campo: "Nickname", antes: antes.nick || "—", depois: depois.nick || "—" });
    if (antes.turno !== depois.turno) alteracoes.push({ campo: "Turno", antes: antes.turno || "—", depois: depois.turno || "—" });
    if (antes.horario !== depois.horario) {
      alteracoes.push({
        campo: "Horário do Turno",
        antes: labelHorarioTurnoStaffPorValor(antes.horario || undefined),
        depois: labelHorarioTurnoStaffPorValor(depois.horario || undefined),
      });
    }
    if (antes.op !== depois.op) alteracoes.push({ campo: "Operadora", antes: antes.op || "—", depois: depois.op || "—" });
    if (antes.barcode !== depois.barcode) alteracoes.push({ campo: "Barcode", antes: antes.barcode || "—", depois: depois.barcode || "—" });
    if (antes.idOp !== depois.idOp) alteracoes.push({ campo: "ID operacional", antes: antes.idOp || "—", depois: depois.idOp || "—" });
    if (antes.skills !== depois.skills) alteracoes.push({ campo: "Skills", antes: antes.skills, depois: depois.skills });

    const patch = {
      staff_nickname: depois.nick || null,
      staff_turno: turnoFinal,
      staff_horario_turno: precisaHorario ? horarioFinal : null,
      staff_operadora_slug: depois.op || null,
      staff_barcode: depois.barcode || null,
      staff_id_operacional: depois.idOp || null,
      staff_skills: skillsParaJson(skills),
    };

    const { data: updated, error } = await supabase.from("rh_funcionarios").update(patch).eq("id", row.id).select("*").single();
    if (error) {
      setErr("Não foi possível salvar. Tente novamente.");
      setSaving(false);
      return;
    }
    if (alteracoes.length > 0) {
      await supabase.from("rh_funcionario_historico").insert({
        rh_funcionario_id: row.id,
        tipo: "staff_gestao_edicao",
        detalhes: {
          alteracoes,
          usuario_label: userEmail ?? "—",
        },
        anexos: [],
      });
    }
    const atualizado = updated as RhFuncionario;
    await syncGamePresenterDealerFromRhFuncionario(atualizado);
    onSalvo(atualizado);
    setSaving(false);
  };

  const tabBtn = (key: EditarAba, label: string) => {
    const ativo = aba === key;
    return (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={ativo}
        onClick={() => setAba(key)}
        style={{
          padding: "8px 14px",
          borderRadius: 10,
          fontWeight: 700,
          fontFamily: FONT.body,
          fontSize: 12,
          cursor: "pointer",
          border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
          background: ativo
            ? brand.useBrand
              ? "color-mix(in srgb, var(--brand-accent) 14%, transparent)"
              : "rgba(124,58,237,0.14)"
            : (t.inputBg ?? "transparent"),
          color: ativo ? brand.accent : t.textMuted,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <ModalBase onClose={onClose} maxWidth={600}>
      <ModalHeader title={`Editar — ${row.nome}`} onClose={onClose} />
      <div role="tablist" aria-label="Seções editáveis" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {tabBtn("funcao", "Dados de função")}
        {staffEhGamePresenter ? tabBtn("skills", "Dados de skills") : null}
        {staffEhGamePresenter ? tabBtn("dealer", "Gestão de dealer") : null}
      </div>

      {aba === "funcao" && (
        <div role="tabpanel">
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="staff-nick">
              Nickname
            </label>
            <input id="staff-nick" type="text" value={nick} onChange={(e) => setNick(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <span style={labelStyle}>Função (somente leitura)</span>
            <input type="text" readOnly value={row.cargo} style={{ ...inputStyle, opacity: 0.85 }} aria-readonly />
          </div>
          <div style={{ marginBottom: 14 }}>
            <span style={labelStyle}>Escala (somente leitura)</span>
            <input type="text" readOnly value={row.escala?.trim() || "—"} style={{ ...inputStyle, opacity: 0.85 }} aria-readonly />
          </div>
          {!ocultarCampoOperadora ? (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="staff-op">
                Operadora
              </label>
              <select id="staff-op" value={opSlug} onChange={(e) => setOpSlug(e.target.value)} style={inputStyle} aria-label="Operadora">
                <option value="">—</option>
                {operadoraSlugs.map((slug) => (
                  <option key={slug} value={slug}>
                    {operadorasNome[slug] ?? slug}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div style={{ marginBottom: 14 }}>
            <span style={labelStyle}>Turno</span>
            <select
              id="staff-turno"
              value={turno}
              onChange={(e) => {
                const v = e.target.value;
                setTurno(v);
                const opts = opcoesHorarioTurnoStaff(row.escala, v);
                setHorarioTurno((h) => (opts.some((o) => o.value === h) ? h : ""));
              }}
              style={inputStyle}
              aria-label="Turno (mesmo cadastro que na Gestão de Prestadores)"
            >
              <option value="">—</option>
              {opcoesTurnoPorEscalaRh(row.escala ?? "").map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
          {escalaUsaHorarioTurnoEditavel(row.escala, turno) ? (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="staff-horario-turno">
                Horário do Turno
              </label>
              <select
                id="staff-horario-turno"
                value={horarioTurno}
                onChange={(e) => setHorarioTurno(e.target.value)}
                style={inputStyle}
                aria-label="Horário do turno conforme a escala"
              >
                <option value="">— Selecione —</option>
                {opcoesHorarioTurnoStaff(row.escala, turno).map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
          ) : escalaComHorarioTurnoSomenteOperadora(row.escala) ? (
            <div style={{ marginBottom: 14 }}>
              <span style={labelStyle}>Horário do Turno (somente leitura)</span>
              <div
                style={{
                  ...inputStyle,
                  opacity: 0.92,
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                }}
                aria-readonly
              >
                {textoHorarioTurnoSomenteOperadora(row.escala, turno, opTurnosEdit)}
              </div>
            </div>
          ) : null}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="staff-id-op">
              ID operacional
            </label>
            <input
              id="staff-id-op"
              type="text"
              value={idOperacional}
              onChange={(e) => setIdOperacional(e.target.value)}
              style={inputStyle}
              aria-describedby="staff-id-op-hint"
            />
            <div id="staff-id-op-hint" style={{ fontSize: 11, color: t.textMuted, marginTop: 6, fontFamily: FONT.body }}>
              Código ou número usado na operação
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="staff-barcode">
              Barcode
            </label>
            <input id="staff-barcode" type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} style={inputStyle} />
          </div>
        </div>
      )}

      {aba === "skills" && (
        <div role="tabpanel">
          {STAFF_SKILL_KEYS.map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor={`skill-${key}`}>
                {label}
              </label>
              <select
                id={`skill-${key}`}
                value={skills[key]}
                onChange={(e) => setSkills((s) => ({ ...s, [key]: e.target.value as StaffSkillStatus }))}
                style={inputStyle}
                aria-label={`Status ${label}`}
              >
                {SKILL_STATUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {aba === "dealer" && (
        <div role="tabpanel">
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="staff-dealer-genero">
              Gênero
            </label>
            <select
              id="staff-dealer-genero"
              value={dealerGenero}
              onChange={(e) => setDealerGenero(e.target.value as DealerGenero)}
              style={inputStyle}
              aria-label="Gênero do dealer"
            >
              {(Object.keys(DEALER_GENERO_LABEL) as DealerGenero[]).map((g) => (
                <option key={g} value={g}>
                  {DEALER_GENERO_LABEL[g]}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="staff-dealer-bio">
              Bio do Dealer
            </label>
            <textarea
              id="staff-dealer-bio"
              value={dealerBio}
              onChange={(e) => setDealerBio(e.target.value)}
              placeholder="Descrição, carisma, estilo de jogo…"
              rows={4}
              style={{ ...inputStyle, resize: "vertical", minHeight: 96 }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <span style={labelStyle}>Fotos</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10, marginTop: 6 }}>
              {dealerFotos.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  style={{
                    position: "relative",
                    width: 80,
                    height: 80,
                    borderRadius: 10,
                    overflow: "hidden",
                    border: `1px solid ${t.cardBorder}`,
                  }}
                >
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    aria-label="Remover foto"
                    onClick={() => setDealerFotos((prev) => prev.filter((_, i) => i !== idx))}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: BRAND.vermelho,
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trash2 size={12} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 10,
                border: `1px dashed ${t.cardBorder}`,
                cursor: dealerUploading ? "wait" : "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                color: t.textMuted,
              }}
            >
              {dealerUploading ? <Loader2 size={14} className="app-lucide-spin" aria-hidden /> : <Upload size={16} aria-hidden />}
              {dealerUploading ? "Enviando…" : "Adicionar fotos"}
              <input type="file" accept="image/*" multiple hidden onChange={(ev) => void handleDealerFotosUpload(ev)} disabled={dealerUploading} />
            </label>
          </div>
        </div>
      )}

      {err ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 12, marginBottom: 12, fontFamily: FONT.body }}>
          {err}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={saving}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.75 : 1,
            background: brand.useBrand
              ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
              : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))",
          }}
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </ModalBase>
  );
}
