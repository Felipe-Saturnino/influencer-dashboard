import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { getThStyle, getTdStyle, TOTAL_ROW_BG } from "../../../lib/tableStyles";
import { PageHeader } from "../../../components/PageHeader";
import {
  escalaPrestadorTemTurnosOperacionais,
  staffTurnoCoerenteComEscala,
  TURNO_ESCALA_5x2,
  turnoOperacionalParaSiglaGrade,
  turnoRhCoerenteComEscala,
} from "../../../lib/rhEscalaTurnos";
import { feriadoLabelSaoPauloCapital } from "../../../lib/feriadosSaoPauloCapital";
import { gerarCelulasSugestaoCustomerService } from "../../../lib/gestaoEscalaSugestaoCustomerService";

type DiaMes = {
  dia: number;
  dowShort: string;
  isWeekend: boolean;
  /** Feriado nacional/municipal usual em São Paulo (capital) — mesma identificação visual do fim de semana. */
  isFeriadoSP: boolean;
  feriadoNome: string | null;
  iso: string;
};

/** Sábado, domingo ou feriado em SP (capital) para cor de cabeçalho / células. */
function diaComDestaqueCalendario(dia: DiaMes): boolean {
  return dia.isWeekend || dia.isFeriadoSP;
}

type LinhaColaborador = {
  id: string;
  nome: string;
  /** Nome completo do cadastro (Gestão de Prestadores) — título/aria-label. */
  nomeCompletoCadastro: string;
  nickname: string;
  /** Padrão 4x2/3x3 etc. (Gestão de Prestadores) — define opções na grade de geração. */
  escalaCadastro: string;
  /** Sigla do turno na Staff (MRN/AFT/NGT) para a grade; vazio se sem turno aplicável. */
  siglaTurnoStaff: string;
  /** Turno na Gestão de Staff (Manhã, Tarde ou Noite) — coluna fixa da tabela. */
  turnoStaffNome: string;
};

/** Estado da geração de escala por área (time). */
type EscalaGerarEstadoFiltro = {
  celulas: Record<string, string>;
  aprovado: boolean;
  baseline: Record<string, string> | null;
  /** Grade sanitizada igual à última carga/salvamento no Supabase (para exibir «Salvar» só se houver diferença). */
  celulasSincronizadasComDb?: Record<string, string> | null;
  /** Após «Sugestão de Escala» (regras completas + sequência) — mostra Nova Escala / Salvar / Aprovar. */
  posSugestao?: boolean;
  /** Legado (localStorage): tratar como `posSugestao`. */
  posSugestaoCs?: boolean;
};

function posSugestaoAtiva(est: EscalaGerarEstadoFiltro | undefined): boolean {
  return Boolean(est?.posSugestao ?? est?.posSugestaoCs);
}

function chaveStorageEscalaMes(ano: number, mes0: number): string {
  return `rh_gestao_escala_v1_${ano}-${String(mes0 + 1).padStart(2, "0")}`;
}

function carregarEscalaMesGravada(ano: number, mes0: number): Record<string, EscalaGerarEstadoFiltro> {
  try {
    const r = localStorage.getItem(chaveStorageEscalaMes(ano, mes0));
    if (!r) return {};
    const p = JSON.parse(r) as Record<string, EscalaGerarEstadoFiltro>;
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

function gravarEscalaMes(ano: number, mes0: number, est: Record<string, EscalaGerarEstadoFiltro>): void {
  try {
    localStorage.setItem(chaveStorageEscalaMes(ano, mes0), JSON.stringify(est));
  } catch {
    /* quota / privado */
  }
}

/** Primeiro dia do mês (YYYY-MM-DD) para RPC `date`. */
function refMesISO(ano: number, mes0: number): string {
  return `${ano}-${String(mes0 + 1).padStart(2, "0")}-01`;
}

type RpcGradeCarregarRow = {
  funcionario_id: string;
  dia_iso: string;
  valor: string | null;
};

type RpcGradeSalvarResult = {
  ok?: boolean;
  error?: string;
};

function chaveCelulaGerar(rowId: string, iso: string): string {
  return `${rowId}|${iso}`;
}

function celulasIguais(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a[k] ?? "").trim() !== (b[k] ?? "").trim()) return false;
  }
  return true;
}

type RpcPrestadorEscala = {
  id: string;
  nome: string;
  cargo: string | null;
  escala: string;
  staff_turno?: string | null;
  email: string;
  org_time_id: string | null;
  nome_time: string;
  staff_nickname: string | null;
};

type AreaEscalaKey =
  | "game_presenter"
  | "shift_leader"
  | "shuffler"
  | "customer_service"
  | "service_manager";

/** Ordem dos botões de área abaixo do carrossel do mês. */
const AREA_ESCALA_ORDEM_BOTOES: readonly AreaEscalaKey[] = [
  "customer_service",
  "service_manager",
  "shift_leader",
  "game_presenter",
  "shuffler",
];

const DEFAULT_AREA_ESCALA: AreaEscalaKey = "customer_service";

function normalizarNomeTimeRh(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function nomeTimePassaNaArea(nomeTimeRaw: string | null | undefined, area: AreaEscalaKey): boolean {
  const nt = normalizarNomeTimeRh(nomeTimeRaw);
  if (!nt) return false;
  switch (area) {
    case "game_presenter":
      return nt.includes("game presenter");
    case "shift_leader":
      return nt.includes("shift leader");
    case "shuffler":
      return nt.includes("shuffler");
    case "customer_service":
      return nt.includes("customer service");
    case "service_manager":
      return nt.includes("service manager");
    default:
      return false;
  }
}

function labelAreaEscala(area: AreaEscalaKey): string {
  const m: Record<AreaEscalaKey, string> = {
    game_presenter: "Game Presenter",
    shift_leader: "Shift Leader",
    shuffler: "Shuffler",
    customer_service: "Customer Service",
    service_manager: "Service Manager",
  };
  return m[area];
}

function filtrarPorArea(rows: RpcPrestadorEscala[], area: AreaEscalaKey): RpcPrestadorEscala[] {
  return rows.filter((p) => nomeTimePassaNaArea(p.nome_time, area));
}

function contarCelulasComSigla(
  linhas: LinhaColaborador[],
  dias: DiaMes[],
  celulas: Record<string, string> | undefined,
  sigla: "MRN" | "AFT" | "NGT",
): number[] {
  return dias.map((dia) =>
    linhas.reduce((acc, row) => {
      const k = chaveCelulaGerar(row.id, dia.iso);
      const v = (celulas?.[k] ?? "").trim();
      return acc + (v === sigla ? 1 : 0);
    }, 0),
  );
}

/** Consolidado Customer Service: pessoas com turno «Horário Comercial» (5x2) em célula «Comercial». */
function contarHorarioComercialPorDia(
  linhas: LinhaColaborador[],
  dias: DiaMes[],
  celulas: Record<string, string> | undefined,
): number[] {
  return dias.map((dia) =>
    linhas.reduce((acc, row) => {
      if (row.turnoStaffNome !== TURNO_ESCALA_5x2) return acc;
      const k = chaveCelulaGerar(row.id, dia.iso);
      const v = (celulas?.[k] ?? "").trim();
      if (v === "Comercial") return acc + 1;
      return acc;
    }, 0),
  );
}

/** Valor interno gravado na célula para «dia de trabalho» (exibição: «Escalado»). */
function valorTurnoTrabalhoInternoParaLinha(siglaTurnoStaff: string, turnoStaffNome: string): string {
  if (turnoStaffNome.trim() === TURNO_ESCALA_5x2) return "Comercial";
  const sigla = siglaTurnoStaff.trim();
  if (sigla === "MRN" || sigla === "AFT" || sigla === "NGT") return sigla;
  return "";
}

function opcoesSelectCelulaGerar(row: LinhaColaborador): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [
    { value: "", label: "—" },
    { value: "Folga", label: "Folga" },
  ];
  const work = valorTurnoTrabalhoInternoParaLinha(row.siglaTurnoStaff, row.turnoStaffNome);
  if (work) {
    out.push({ value: work, label: "Escalado" });
  }
  out.push(
    { value: "Compra", label: "Compra" },
    { value: "Venda", label: "Venda" },
    { value: "Troca", label: "Troca" },
  );
  return out;
}

/**
 * Garante valor coerente: Folga; Compra/Venda/Troca; sigla/Comercial de trabalho da linha; vazio.
 * Aceita legado Manhã/Tarde/Noite se coincidir com a sigla permitida.
 */
function sanitizarValorCelulaGerar(siglaTurnoStaff: string, valorArmazenado: string, turnoStaffNome: string): string {
  const v = (valorArmazenado ?? "").trim();
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  if (v === "F" || v.toLowerCase() === "folga") return "Folga";
  const work = valorTurnoTrabalhoInternoParaLinha(siglaTurnoStaff, turnoStaffNome);
  const permit = new Set<string>(["", "Folga", "Compra", "Venda", "Troca"]);
  if (work) permit.add(work);
  if (permit.has(v)) return v;
  const comoSigla = turnoOperacionalParaSiglaGrade(v);
  if (comoSigla && permit.has(comoSigla)) return comoSigla;
  if (v === "T") {
    const mrn = turnoOperacionalParaSiglaGrade("Manhã");
    if (mrn && permit.has(mrn)) return mrn;
  }
  return "";
}

/** Snapshot completo (todas as chaves linha×dia) para comparar com a base. */
function buildCelulasSnapshotGrade(
  linhasF: LinhaColaborador[],
  dias: DiaMes[],
  celulas: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of linhasF) {
    for (const d of dias) {
      const k = chaveCelulaGerar(row.id, d.iso);
      out[k] = sanitizarValorCelulaGerar(row.siglaTurnoStaff, celulas[k] ?? "", row.turnoStaffNome);
    }
  }
  return out;
}

/** Texto exibido na célula (grade ou somente leitura). */
function labelExibicaoCelulaEscala(
  siglaTurnoStaff: string,
  valorArmazenado: string | undefined,
  turnoStaffNome: string,
): string {
  const v = sanitizarValorCelulaGerar(siglaTurnoStaff, valorArmazenado ?? "", turnoStaffNome);
  if (!v) return "—";
  if (v === "Folga") return "Folga";
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  return "Escalado";
}

const DOW_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

/** Larguras fixas das 4 colunas fixas (sticky) — soma usada em `left`. */
const STICKY_W_NOME = 180;
const STICKY_W_NICK = 130;
const STICKY_W_ESCALA = 72;
const STICKY_W_TURNO_STAFF = 112;
const STICKY_LEFT_NICK = STICKY_W_NOME;
const STICKY_LEFT_ESCALA = STICKY_W_NOME + STICKY_W_NICK;
const STICKY_LEFT_TURNO_STAFF = STICKY_W_NOME + STICKY_W_NICK + STICKY_W_ESCALA;

/** Colunas fixas quando a coluna Nome está oculta (área Customer Service). */
const STICKY_LEFT_NICK_SEM_NOME = 0;
const STICKY_LEFT_ESCALA_SEM_NOME = STICKY_W_NICK;
const STICKY_LEFT_TURNO_SEM_NOME = STICKY_W_NICK + STICKY_W_ESCALA;

/** Navegação e escala consideram a partir de janeiro de 2026. */
const ESCALA_ANO_MIN = 2026;
const ESCALA_MES0_MIN = 0;

function mesReferenciaInicial(): { ano: number; mes: number } {
  const d = new Date();
  const ref = new Date(d.getFullYear(), d.getMonth(), 1);
  const min = new Date(ESCALA_ANO_MIN, ESCALA_MES0_MIN, 1);
  if (ref < min) return { ano: ESCALA_ANO_MIN, mes: ESCALA_MES0_MIN };
  return { ano: d.getFullYear(), mes: d.getMonth() };
}

function diasDoMes(ano: number, mes0: number): DiaMes[] {
  const ultimo = new Date(ano, mes0 + 1, 0).getDate();
  const out: DiaMes[] = [];
  for (let day = 1; day <= ultimo; day++) {
    const dt = new Date(ano, mes0, day);
    const dow = dt.getDay();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const iso = `${y}-${m}-${dd}`;
    const feriadoNome = feriadoLabelSaoPauloCapital(iso) ?? null;
    out.push({
      dia: day,
      dowShort: DOW_SHORT[dow] ?? "",
      isWeekend: dow === 0 || dow === 6,
      isFeriadoSP: feriadoNome !== null,
      feriadoNome,
      iso,
    });
  }
  return out;
}

/** Formato: "Janeiro 2026" (nome do mês em pt-BR + ano). */
function labelMesAno(ano: number, mes0: number): string {
  const nomeMes = new Date(ano, mes0, 1).toLocaleDateString("pt-BR", { month: "long" });
  const capitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
  return `${capitalizado} ${ano}`;
}

/** Nome cadastrado na Gestão de Prestadores: apenas primeiro e último token (ex.: "Ana Paula Costa" → "Ana Costa"). */
function primeiroEUltimoNomePrestador(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  if (partes.length === 1) return partes[0]!;
  return `${partes[0]!} ${partes[partes.length - 1]!}`;
}

function mapLinhaPrestador(r: RpcPrestadorEscala): LinhaColaborador {
  const nick = (r.staff_nickname ?? "").trim();
  const esc = (r.escala ?? "").trim();
  const coOp = staffTurnoCoerenteComEscala(r.escala, r.staff_turno);
  const turnoRh = turnoRhCoerenteComEscala(r.escala, r.staff_turno);
  const siglaTurnoStaff = escalaPrestadorTemTurnosOperacionais(r.escala) ? turnoOperacionalParaSiglaGrade(coOp) : "";
  const turnoStaffNome = escalaPrestadorTemTurnosOperacionais(r.escala) ? coOp : turnoRh;
  const nomeCadastro = (r.nome ?? "").trim();
  return {
    id: r.id,
    nome: nomeCadastro ? primeiroEUltimoNomePrestador(nomeCadastro) : "—",
    nomeCompletoCadastro: nomeCadastro || "—",
    nickname: nick || "—",
    escalaCadastro: esc || "—",
    siglaTurnoStaff,
    turnoStaffNome,
  };
}

export default function RhGestaoEscalaPage() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_gestao_escala");

  const hoje = useMemo(() => new Date(), []);
  const inicial = useMemo(() => mesReferenciaInicial(), []);
  const [ano, setAno] = useState(inicial.ano);
  const [mes, setMes] = useState(inicial.mes);

  const [prestadoresRaw, setPrestadoresRaw] = useState<RpcPrestadorEscala[]>([]);
  const [loadingPrestadores, setLoadingPrestadores] = useState(true);
  const [erroPrestadores, setErroPrestadores] = useState<string | null>(null);
  const [erroSalvarGrade, setErroSalvarGrade] = useState<string | null>(null);
  const [salvandoGrade, setSalvandoGrade] = useState(false);
  /** Área (time) para consolidado e grade de geração. */
  const [filtroArea, setFiltroArea] = useState<AreaEscalaKey>(DEFAULT_AREA_ESCALA);
  /** Por área: células do mês e baseline após aprovação. */
  const [gerarPorFiltro, setGerarPorFiltro] = useState<Record<string, EscalaGerarEstadoFiltro>>({});

  const carregarPrestadores = useCallback(async () => {
    setLoadingPrestadores(true);
    setErroPrestadores(null);
    const { data, error } = await supabase.rpc("rh_escala_prestadores_times");
    if (error) {
      setErroPrestadores(
        "Não foi possível carregar o staff para a gestão de escala. Verifique permissões e se as migrations foram aplicadas.",
      );
      setPrestadoresRaw([]);
    } else {
      setPrestadoresRaw((data ?? []) as RpcPrestadorEscala[]);
    }
    setLoadingPrestadores(false);
  }, []);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void carregarPrestadores();
  }, [perm.loading, perm.canView, carregarPrestadores]);

  const dias = useMemo(() => diasDoMes(ano, mes), [ano, mes]);
  const tituloMes = useMemo(() => labelMesAno(ano, mes), [ano, mes]);

  const podeMesAnterior = useMemo(() => {
    const ref = new Date(ano, mes, 1);
    const min = new Date(ESCALA_ANO_MIN, ESCALA_MES0_MIN, 1);
    return ref > min;
  }, [ano, mes]);

  const podeMesSeguinte = useMemo(() => {
    const ref = new Date(ano, mes, 1);
    const max = new Date(hoje.getFullYear() + 2, 11, 1);
    return ref < max;
  }, [ano, mes, hoje]);

  const mesAnterior = useCallback(() => {
    if (!podeMesAnterior) return;
    if (mes === 0) {
      setMes(11);
      setAno((y) => y - 1);
    } else {
      setMes((m) => m - 1);
    }
  }, [mes, podeMesAnterior]);

  const mesSeguinte = useCallback(() => {
    if (!podeMesSeguinte) return;
    if (mes === 11) {
      setMes(0);
      setAno((y) => y + 1);
    } else {
      setMes((m) => m + 1);
    }
  }, [mes, podeMesSeguinte]);

  const podeEditarGrade = perm.canCriarOk;
  const mostrarFiltroArea = perm.canView === "sim" || perm.canView === "proprios";

  const mesHydratingRef = useRef(false);

  /** Novo mês: carrega rascunhos gravados no navegador para aquele mês. */
  useEffect(() => {
    setErroSalvarGrade(null);
    mesHydratingRef.current = true;
    setGerarPorFiltro(carregarEscalaMesGravada(ano, mes));
  }, [ano, mes]);

  useEffect(() => {
    if (mesHydratingRef.current) {
      mesHydratingRef.current = false;
      return;
    }
    gravarEscalaMes(ano, mes, gerarPorFiltro);
  }, [gerarPorFiltro, ano, mes]);

  /** Mescla na grade de cada área os valores persistidos na base (sobrescreve chaves existentes). */
  useEffect(() => {
    if (perm.loading || perm.canView === "nao" || loadingPrestadores) return;
    let cancelled = false;
    const ref = refMesISO(ano, mes);
    void (async () => {
      const areas = [...AREA_ESCALA_ORDEM_BOTOES] as AreaEscalaKey[];
      const results = await Promise.all(
        areas.map(async (areaKey) => {
          const { data, error } = await supabase.rpc("rh_gestao_escala_grade_carregar", {
            p_ref_mes: ref,
            p_area_key: areaKey,
          });
          return { areaKey, data, error };
        }),
      );
      if (cancelled) return;
      const fromDbPorArea: Partial<Record<AreaEscalaKey, Record<string, string>>> = {};
      for (const { areaKey, data, error } of results) {
        if (error) continue;
        const rows = (data ?? []) as RpcGradeCarregarRow[];
        const fromDb: Record<string, string> = {};
        for (const row of rows) {
          const isoRaw = row.dia_iso;
          const iso = typeof isoRaw === "string" ? isoRaw.slice(0, 10) : String(isoRaw).slice(0, 10);
          fromDb[chaveCelulaGerar(row.funcionario_id, iso)] = (row.valor ?? "").trim();
        }
        fromDbPorArea[areaKey] = fromDb;
      }
      if (Object.keys(fromDbPorArea).length === 0) return;
      setGerarPorFiltro((prev) => {
        const next = { ...prev };
        for (const ak of Object.keys(fromDbPorArea) as AreaEscalaKey[]) {
          const fromDb = fromDbPorArea[ak];
          if (!fromDb) continue;
          const cur = next[ak];
          const merged = { ...(cur?.celulas ?? {}), ...fromDb };
          const linhasF = filtrarPorArea(prestadoresRaw, ak).map(mapLinhaPrestador);
          const snap = buildCelulasSnapshotGrade(linhasF, dias, merged);
          next[ak] = {
            celulas: merged,
            aprovado: cur?.aprovado ?? false,
            baseline: cur?.baseline ?? null,
            posSugestao: cur?.posSugestao ?? cur?.posSugestaoCs ?? false,
            celulasSincronizadasComDb: snap,
          };
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [ano, mes, dias, perm.loading, perm.canView, loadingPrestadores, prestadoresRaw]);

  const salvarGradeEscalaDb = useCallback(
    async (areaKey: AreaEscalaKey) => {
      setErroSalvarGrade(null);
      const est = gerarPorFiltro[areaKey];
      const celulas = est?.celulas ?? {};
      if (Object.keys(celulas).length === 0) {
        setErroSalvarGrade("Não há células para salvar.");
        return;
      }
      setSalvandoGrade(true);
      try {
        const ref = refMesISO(ano, mes);
        const { data, error } = await supabase.rpc("rh_gestao_escala_grade_salvar", {
          p_ref_mes: ref,
          p_area_key: areaKey,
          p_celulas: celulas,
        });
        if (error) throw error;
        const payload = data as RpcGradeSalvarResult | null;
        if (!payload?.ok) {
          const code = payload?.error ?? "";
          setErroSalvarGrade(
            code === "forbidden"
              ? "Sem permissão para salvar a grade."
              : code === "prestador_fora_area"
                ? `Um ou mais colaboradores não pertencem ao time ${labelAreaEscala(areaKey)}.`
                : code
                  ? `Não foi possível salvar: ${code}.`
                  : "Não foi possível salvar a grade.",
          );
          return;
        }
        setGerarPorFiltro((prev) => {
          const est = prev[areaKey];
          if (!est) return prev;
          const linhasF = filtrarPorArea(prestadoresRaw, areaKey).map(mapLinhaPrestador);
          const snap = buildCelulasSnapshotGrade(linhasF, dias, est.celulas);
          const next = { ...prev, [areaKey]: { ...est, celulasSincronizadasComDb: snap } };
          gravarEscalaMes(ano, mes, next);
          return next;
        });
      } catch (e) {
        setErroSalvarGrade(
          e instanceof Error ? e.message : "Erro ao salvar na base de dados. Verifique se a migration foi aplicada.",
        );
      } finally {
        setSalvandoGrade(false);
      }
    },
    [ano, mes, dias, gerarPorFiltro, prestadoresRaw],
  );

  const linhas = useMemo(() => {
    return filtrarPorArea(prestadoresRaw, filtroArea).map(mapLinhaPrestador);
  }, [prestadoresRaw, filtroArea]);

  const linhasPorFiltroGerar = useCallback(
    (areaKey: AreaEscalaKey) => filtrarPorArea(prestadoresRaw, areaKey).map(mapLinhaPrestador),
    [prestadoresRaw],
  );

  /**
   * Sugestão com regras de escala (3×3, 4×2, 5×1, 5×2 comercial) e continuidade com o mês anterior gravado na base.
   */
  const aplicarSugestaoEscalaArea = useCallback(
    async (areaKey: AreaEscalaKey) => {
      const linhasF = linhasPorFiltroGerar(areaKey);
      const diasLite = dias.map((d) => ({
        iso: d.iso,
        isWeekend: d.isWeekend,
        isFeriadoSP: d.isFeriadoSP,
      }));
      setErroSalvarGrade(null);

      let celulasMesAnterior: Record<string, string> | undefined;
      const mes0Prev = mes === 0 ? 11 : mes - 1;
      const anoPrev = mes === 0 ? ano - 1 : ano;
      const refPrev = refMesISO(anoPrev, mes0Prev);
      const refMin = refMesISO(ESCALA_ANO_MIN, ESCALA_MES0_MIN);
      if (refPrev >= refMin) {
        const { data, error } = await supabase.rpc("rh_gestao_escala_grade_carregar", {
          p_ref_mes: refPrev,
          p_area_key: areaKey,
        });
        if (!error && data && (data as RpcGradeCarregarRow[]).length > 0) {
          const m: Record<string, string> = {};
          for (const row of data as RpcGradeCarregarRow[]) {
            const isoRaw = row.dia_iso;
            const iso = typeof isoRaw === "string" ? isoRaw.slice(0, 10) : String(isoRaw).slice(0, 10);
            m[chaveCelulaGerar(row.funcionario_id, iso)] = (row.valor ?? "").trim();
          }
          celulasMesAnterior = m;
        }
      }

      const celulas = gerarCelulasSugestaoCustomerService(linhasF, diasLite, { celulasMesAnterior });
      setGerarPorFiltro((prev) => ({
        ...prev,
        [areaKey]: {
          celulas,
          aprovado: false,
          baseline: null,
          celulasSincronizadasComDb: null,
          posSugestao: true,
        },
      }));
    },
    [ano, mes, dias, linhasPorFiltroGerar],
  );

  const aprovarEscalaGerar = useCallback(
    (areaKey: AreaEscalaKey) => {
      const linhasF = linhasPorFiltroGerar(areaKey);
      setGerarPorFiltro((prev) => {
        const cur = prev[areaKey];
        if (!cur) return prev;
        const merged: Record<string, string> = { ...cur.celulas };
        for (const row of linhasF) {
          for (const d of dias) {
            const k = chaveCelulaGerar(row.id, d.iso);
            merged[k] = sanitizarValorCelulaGerar(row.siglaTurnoStaff, cur.celulas[k] ?? "", row.turnoStaffNome);
          }
        }
        const baseline = { ...merged };
        return {
          ...prev,
          [areaKey]: { ...cur, celulas: merged, aprovado: true, baseline },
        };
      });
    },
    [dias, linhasPorFiltroGerar],
  );

  const atualizarCelulaGerar = useCallback(
    (areaKey: AreaEscalaKey, rowId: string, iso: string, siglaTurnoStaff: string, turnoStaffNome: string, valor: string) => {
      const k = chaveCelulaGerar(rowId, iso);
      const ok = sanitizarValorCelulaGerar(siglaTurnoStaff, valor, turnoStaffNome);
      setGerarPorFiltro((prev) => {
        const cur = prev[areaKey] ?? { celulas: {}, aprovado: false, baseline: null };
        if (cur.aprovado) return prev;
        return {
          ...prev,
          [areaKey]: {
            ...cur,
            celulas: { ...cur.celulas, [k]: ok },
          },
        };
      });
    },
    [],
  );

  const acaoBotaoGerar = useCallback(
    (areaKey: AreaEscalaKey): "sugestao" | "aprovar" | null => {
      const estado = gerarPorFiltro[areaKey];
      if (posSugestaoAtiva(estado)) return null;
      const linhasF = linhasPorFiltroGerar(areaKey);
      if (linhasF.length === 0) return null;
      const celulas = estado?.celulas ?? {};
      const allFilled = linhasF.every((row) =>
        dias.every((d) => {
          const k = chaveCelulaGerar(row.id, d.iso);
          return sanitizarValorCelulaGerar(row.siglaTurnoStaff, celulas[k] ?? "", row.turnoStaffNome).trim() !== "";
        }),
      );
      if (estado?.aprovado && estado.baseline) {
        const celSan: Record<string, string> = {};
        for (const row of linhasF) {
          for (const d of dias) {
            const k = chaveCelulaGerar(row.id, d.iso);
            celSan[k] = sanitizarValorCelulaGerar(row.siglaTurnoStaff, celulas[k] ?? "", row.turnoStaffNome);
          }
        }
        if (celulasIguais(celSan, estado.baseline)) return null;
      }
      if (allFilled) return "aprovar";
      return "sugestao";
    },
    [gerarPorFiltro, linhasPorFiltroGerar, dias],
  );

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

  const thBase = getThStyle(t);

  /** Cabeçalhos fixos à esquerda ficam acima das colunas de dia ao rolar horizontalmente. */
  const Z_STICKY_HEAD = 30;
  /** Corpo: colunas fixas com z maior que as de dia; ordem Nome > Nick > Escala > Turno (staff). */
  const Z_BODY_NOME = 31;
  const Z_BODY_NICK = 30;
  const Z_BODY_ESCALA = 29;
  const Z_BODY_TURNO_STAFF = 28;
  const Z_DIA = 0;

  const thSticky = (left: number, extra?: CSSProperties): CSSProperties => ({
    ...thBase,
    position: "sticky",
    left,
    zIndex: Z_STICKY_HEAD,
    boxSizing: "border-box",
    background: brand.blockBg,
    ...extra,
  });

  const thDia = (dia: DiaMes): CSSProperties => ({
    ...getThStyle(t, {
      textAlign: "center",
      minWidth: 72,
      maxWidth: 88,
      whiteSpace: "normal",
      lineHeight: 1.25,
      fontSize: 9,
      letterSpacing: 0,
      zIndex: Z_DIA,
      position: "relative",
      background: diaComDestaqueCalendario(dia)
        ? t.isDark
          ? "rgba(245,158,11,0.12)"
          : "rgba(245,158,11,0.14)"
        : getThStyle(t).background,
      color: diaComDestaqueCalendario(dia) ? "#f59e0b" : undefined,
    }),
  });

  const fundoColunaDia = (dia: DiaMes, rowBg: string): string => {
    if (!diaComDestaqueCalendario(dia)) return rowBg;
    return t.isDark
      ? `color-mix(in srgb, rgba(245,158,11,0.22) 32%, ${rowBg})`
      : `color-mix(in srgb, rgba(245,158,11,0.24) 34%, ${rowBg})`;
  };

  const sombraColFixa = t.isDark ? "4px 0 10px rgba(0,0,0,0.35)" : "4px 0 10px rgba(0,0,0,0.08)";

  const tdDia: CSSProperties = {
    ...getTdStyle(t, {
      textAlign: "center",
      minWidth: 72,
      maxWidth: 88,
      fontSize: 12,
      color: t.textMuted,
      zIndex: Z_DIA,
      position: "relative",
    }),
  };

  const tdSticky = (left: number, rowBg: string, zBody: number, extra?: CSSProperties): CSSProperties => ({
    ...getTdStyle(t, {
      ...extra,
      background: rowBg,
      boxSizing: "border-box",
    }),
    position: "sticky",
    left,
    zIndex: zBody,
    transform: "translateZ(0)",
  });

  /** Fundo opaco por linha (zebra global usa color-mix transparente e deixa vazar as células de dia por baixo). */
  const zebraBgLinha = (i: number) => {
    const base = brand.blockBg ?? t.cardBg ?? t.bg ?? "#fff";
    if (i % 2 === 0) return base;
    return t.isDark
      ? "color-mix(in srgb, var(--brand-secondary, #4a2082) 16%, #141118)"
      : "color-mix(in srgb, var(--brand-secondary, #4a2082) 10%, #f2effa)";
  };

  const estGradeFiltro = gerarPorFiltro[filtroArea];
  const celulasGerarAtivas = estGradeFiltro?.celulas;
  const podeEditarCelulasDia = Boolean(podeEditarGrade && !estGradeFiltro?.aprovado);

  const resumoTurnoDias = useMemo(() => {
    if (!mostrarFiltroArea) return null;
    const linhasF = filtrarPorArea(prestadoresRaw, filtroArea).map(mapLinhaPrestador);
    const celulas = gerarPorFiltro[filtroArea]?.celulas;
    const manha = contarCelulasComSigla(linhasF, dias, celulas, "MRN");
    const tarde = contarCelulasComSigla(linhasF, dias, celulas, "AFT");
    const noite = contarCelulasComSigla(linhasF, dias, celulas, "NGT");
    const customerService = filtroArea === "customer_service";
    const horarioComercial = customerService ? contarHorarioComercialPorDia(linhasF, dias, celulas) : null;
    const total = dias.map((_, i) => {
      if (customerService) {
        return (manha[i] ?? 0) + (noite[i] ?? 0) + (horarioComercial?.[i] ?? 0);
      }
      return (manha[i] ?? 0) + (tarde[i] ?? 0) + (noite[i] ?? 0);
    });
    return { manha, tarde, noite, horarioComercial, total, customerService };
  }, [mostrarFiltroArea, filtroArea, prestadoresRaw, dias, gerarPorFiltro]);

  const mostrarSalvarAlteracoes = useMemo(() => {
    const est = gerarPorFiltro[filtroArea];
    if (!mostrarFiltroArea || !posSugestaoAtiva(est)) return false;
    const linhasF = filtrarPorArea(prestadoresRaw, filtroArea).map(mapLinhaPrestador);
    if (linhasF.length === 0) return false;
    const atual = buildCelulasSnapshotGrade(linhasF, dias, est?.celulas ?? {});
    const temAlguma = Object.values(atual).some((v) => v.trim() !== "");
    if (!temAlguma) return false;
    const snapDb = est?.celulasSincronizadasComDb ?? null;
    if (snapDb === null) return true;
    return !celulasIguais(atual, snapDb);
  }, [mostrarFiltroArea, filtroArea, prestadoresRaw, dias, gerarPorFiltro]);

  const msgTabelaVazia = "Sem dados para o período selecionado.";

  const selectCelulaGerarStyle: CSSProperties = {
    width: "100%",
    maxWidth: 84,
    margin: "0 auto",
    display: "block",
    boxSizing: "border-box",
    textAlign: "center",
    padding: "4px 2px",
    borderRadius: 6,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg ?? "transparent",
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 10,
    cursor: "pointer",
  };

  const acaoGerarNoFiltroSelecionado = podeEditarGrade ? acaoBotaoGerar(filtroArea) : null;
  const areaCustomerService = filtroArea === "customer_service";

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
        icon={<CalendarRange size={14} aria-hidden />}
        title="Gestão de Escala"
        subtitle="Gere a escala por área (time), colaborador e dia do mês."
      />

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${t.cardBorder}`,
            background: brand.blockBg,
            padding: "12px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 0,
            }}
          >
            <button
              type="button"
              onClick={mesAnterior}
              disabled={!podeMesAnterior}
              aria-label="Mês anterior"
              style={{
                ...btnNavStyle,
                opacity: podeMesAnterior ? 1 : 0.35,
                cursor: podeMesAnterior ? "pointer" : "not-allowed",
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
                minWidth: 200,
                textAlign: "center",
              }}
            >
              {tituloMes}
            </span>
            <button
              type="button"
              onClick={mesSeguinte}
              disabled={!podeMesSeguinte}
              aria-label="Próximo mês"
              style={{
                ...btnNavStyle,
                opacity: podeMesSeguinte ? 1 : 0.35,
                cursor: podeMesSeguinte ? "pointer" : "not-allowed",
              }}
            >
              <ChevronRight size={14} aria-hidden />
            </button>
            {mostrarFiltroArea && podeEditarGrade ? (
              <>
                {posSugestaoAtiva(gerarPorFiltro[filtroArea]) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setGerarPorFiltro((prev) => ({
                          ...prev,
                          [filtroArea]: {
                            celulas: {},
                            aprovado: false,
                            baseline: null,
                            celulasSincronizadasComDb: null,
                            posSugestao: false,
                            posSugestaoCs: false,
                          },
                        }));
                      }}
                      aria-label="Iniciar nova escala em rascunho"
                      style={{
                        padding: "10px 16px",
                        borderRadius: 10,
                        border: `1px solid ${t.cardBorder}`,
                        background: t.inputBg ?? t.cardBg ?? "transparent",
                        color: t.text,
                        fontFamily: FONT.body,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Nova Escala
                    </button>
                    {mostrarSalvarAlteracoes ? (
                      <button
                        type="button"
                        disabled={salvandoGrade}
                        onClick={() => void salvarGradeEscalaDb(filtroArea)}
                        aria-label="Salvar alterações da escala na base de dados"
                        style={{
                          padding: "10px 16px",
                          borderRadius: 10,
                          border: `1px solid ${brand.accent}`,
                          background: brand.useBrand
                            ? "color-mix(in srgb, var(--brand-action, #7c3aed) 18%, transparent)"
                            : "rgba(124,58,237,0.12)",
                          color: brand.accent,
                          fontFamily: FONT.body,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: salvandoGrade ? "wait" : "pointer",
                          whiteSpace: "nowrap",
                          opacity: salvandoGrade ? 0.65 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {salvandoGrade ? <Loader2 size={16} className="app-lucide-spin" aria-hidden /> : null}
                        Salvar Alterações
                      </button>
                    ) : null}
                    {!gerarPorFiltro[filtroArea]?.aprovado ? (
                      <button
                        type="button"
                        onClick={() => aprovarEscalaGerar(filtroArea)}
                        aria-label="Aprovar escala e bloquear edição manual da grade"
                        style={{
                          padding: "10px 16px",
                          borderRadius: 10,
                          border: `1px solid ${brand.accent}`,
                          background: brand.useBrand
                            ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 22%, transparent)"
                            : "rgba(30,54,248,0.12)",
                          color: brand.accent,
                          fontFamily: FONT.body,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Aprovar Escala
                      </button>
                    ) : null}
                  </>
                ) : acaoGerarNoFiltroSelecionado === "sugestao" ? (
                  <button
                    type="button"
                    onClick={() =>
                      void aplicarSugestaoEscalaArea(filtroArea)
                    }
                    aria-label="Gerar sugestão de escala para a área selecionada"
                    style={{
                      padding: "10px 16px",
                      borderRadius: 10,
                      border: `1px solid ${brand.accent}`,
                      background: brand.useBrand
                        ? "color-mix(in srgb, var(--brand-action, #7c3aed) 18%, transparent)"
                        : "rgba(124,58,237,0.12)",
                      color: brand.accent,
                      fontFamily: FONT.body,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Sugestão de Escala
                  </button>
                ) : acaoGerarNoFiltroSelecionado === "aprovar" ? (
                  <button
                    type="button"
                    onClick={() => aprovarEscalaGerar(filtroArea)}
                    aria-label="Aprovar escala da área selecionada"
                    style={{
                      padding: "10px 16px",
                      borderRadius: 10,
                      border: `1px solid ${brand.accent}`,
                      background: brand.useBrand
                        ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 22%, transparent)"
                        : "rgba(30,54,248,0.12)",
                      color: brand.accent,
                      fontFamily: FONT.body,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Aprovar Escala
                  </button>
                ) : null}
              </>
            ) : null}
          </div>

          {mostrarFiltroArea ? (
            <>
              <div
                role="group"
                aria-label="Área (time)"
                style={{
                  marginTop: 14,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {AREA_ESCALA_ORDEM_BOTOES.map((key) => {
                  const ativo = filtroArea === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => setFiltroArea(key)}
                      style={{
                        padding: "10px 14px",
                        minHeight: 44,
                        borderRadius: 10,
                        fontWeight: 700,
                        fontFamily: FONT.body,
                        fontSize: 12,
                        cursor: "pointer",
                        border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                        background: ativo
                          ? brand.useBrand
                            ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                            : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                          : (t.inputBg ?? t.cardBg ?? "transparent"),
                        color: ativo ? brand.accent : t.textMuted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {labelAreaEscala(key)}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {erroPrestadores && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: FONT.body,
            color: "#e84025",
            border: "1px solid rgba(232,64,37,0.35)",
            background: "rgba(232,64,37,0.08)",
          }}
        >
          {erroPrestadores}
        </div>
      )}

      {erroSalvarGrade && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: FONT.body,
            color: "#e84025",
            border: "1px solid rgba(232,64,37,0.35)",
            background: "rgba(232,64,37,0.08)",
          }}
        >
          {erroSalvarGrade}
        </div>
      )}

      <div role="region" aria-label="Gestão de escala por colaborador e dia">
        {loadingPrestadores ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 10 }}>
            <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            <span style={{ color: t.textMuted, fontSize: 13 }}>Carregando gestão de escala…</span>
          </div>
        ) : (
          <>
            {resumoTurnoDias && mostrarFiltroArea ? (
              <div className="app-table-wrap" style={{ marginBottom: 16 }}>
                <table
                  style={{
                    width: "100%",
                    minWidth: 168 + dias.length * 44,
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    borderRadius: 14,
                    border: `1px solid ${t.cardBorder}`,
                  }}
                >
                  <caption style={{ display: "none" }}>
                    {resumoTurnoDias.customerService
                      ? "Totais por turno (Manhã, Noite, Comercial) e TOTAL por dia — Customer Service."
                      : "Totais de pessoas por turno do dia e por data, linha TOTAL somando os três turnos, conforme área selecionada."}
                  </caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        style={{
                          ...getThStyle(t),
                          textAlign: "left",
                          minWidth: 168,
                          maxWidth: 200,
                          verticalAlign: "middle",
                        }}
                      >
                        Turno
                      </th>
                      {dias.map((dia) => (
                        <th
                          key={`resumo-h-${dia.iso}`}
                          scope="col"
                          style={thDia(dia)}
                          title={dia.feriadoNome ? `${dia.iso} · ${dia.feriadoNome}` : dia.iso}
                        >
                          <div style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{dia.dia}</div>
                          <div style={{ fontWeight: 600, textTransform: "lowercase", opacity: 0.95 }}>{dia.dowShort}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row" style={{ ...getThStyle(t), textAlign: "left", fontWeight: 700 }}>
                        Turno da Manhã
                      </th>
                      {resumoTurnoDias.manha.map((n, idx) => {
                        const d = dias[idx]!;
                        return (
                          <td
                            key={`resumo-m-${d.iso}`}
                            style={getTdStyle(t, {
                              textAlign: "center",
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: 700,
                              ...(diaComDestaqueCalendario(d)
                                ? {
                                    background: t.isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.12)",
                                    color: "#f59e0b",
                                  }
                                : {}),
                            })}
                          >
                            {n}
                          </td>
                        );
                      })}
                    </tr>
                    {!resumoTurnoDias.customerService ? (
                      <tr>
                        <th scope="row" style={{ ...getThStyle(t), textAlign: "left", fontWeight: 700 }}>
                          Turno da Tarde
                        </th>
                        {resumoTurnoDias.tarde.map((n, idx) => {
                          const d = dias[idx]!;
                          return (
                            <td
                              key={`resumo-t-${d.iso}`}
                              style={getTdStyle(t, {
                                textAlign: "center",
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: 700,
                                ...(diaComDestaqueCalendario(d)
                                  ? {
                                      background: t.isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.12)",
                                      color: "#f59e0b",
                                    }
                                  : {}),
                              })}
                            >
                              {n}
                            </td>
                          );
                        })}
                      </tr>
                    ) : null}
                    <tr>
                      <th scope="row" style={{ ...getThStyle(t), textAlign: "left", fontWeight: 700 }}>
                        Turno da Noite
                      </th>
                      {resumoTurnoDias.noite.map((n, idx) => {
                        const d = dias[idx]!;
                        return (
                          <td
                            key={`resumo-n-${d.iso}`}
                            style={getTdStyle(t, {
                              textAlign: "center",
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: 700,
                              ...(diaComDestaqueCalendario(d)
                                ? {
                                    background: t.isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.12)",
                                    color: "#f59e0b",
                                  }
                                : {}),
                            })}
                          >
                            {n}
                          </td>
                        );
                      })}
                    </tr>
                    {resumoTurnoDias.customerService && resumoTurnoDias.horarioComercial ? (
                      <tr>
                        <th scope="row" style={{ ...getThStyle(t), textAlign: "left", fontWeight: 700 }}>
                          Comercial
                        </th>
                        {resumoTurnoDias.horarioComercial.map((n, idx) => {
                          const d = dias[idx]!;
                          return (
                            <td
                              key={`resumo-hc-${d.iso}`}
                              style={getTdStyle(t, {
                                textAlign: "center",
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: 700,
                                ...(diaComDestaqueCalendario(d)
                                  ? {
                                      background: t.isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.12)",
                                      color: "#f59e0b",
                                    }
                                  : {}),
                              })}
                            >
                              {n}
                            </td>
                          );
                        })}
                      </tr>
                    ) : null}
                    <tr>
                      <th
                        scope="row"
                        style={{
                          ...getThStyle(t),
                          textAlign: "left",
                          fontWeight: 800,
                          borderTop: `2px solid ${t.cardBorder}`,
                          background: TOTAL_ROW_BG,
                        }}
                      >
                        TOTAL
                      </th>
                      {resumoTurnoDias.total.map((n, idx) => {
                        const d = dias[idx]!;
                        return (
                          <td
                            key={`resumo-tot-${d.iso}`}
                            style={getTdStyle(t, {
                              textAlign: "center",
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: 800,
                              borderTop: `2px solid ${t.cardBorder}`,
                              background: diaComDestaqueCalendario(d)
                                ? t.isDark
                                  ? "rgba(245,158,11,0.14)"
                                  : "rgba(245,158,11,0.16)"
                                : TOTAL_ROW_BG,
                              color: diaComDestaqueCalendario(d) ? "#f59e0b" : t.text,
                            })}
                          >
                            {n}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
            <div className="app-table-wrap">
            <table
              style={{
                width: "100%",
                minWidth:
                  (areaCustomerService ? 0 : STICKY_W_NOME) +
                  STICKY_W_NICK +
                  STICKY_W_ESCALA +
                  STICKY_W_TURNO_STAFF +
                  dias.length * 80,
                borderCollapse: "separate",
                borderSpacing: 0,
                borderRadius: 14,
                border: `1px solid ${t.cardBorder}`,
              }}
            >
              <caption style={{ display: "none" }}>
                {areaCustomerService
                  ? "Escala mensal por nickname, escala, turno e dia — Customer Service."
                  : "Escala mensal com colunas por dia"}
              </caption>
              <thead>
                <tr>
                  {!areaCustomerService ? (
                    <th
                      scope="col"
                      style={thSticky(0, {
                        minWidth: STICKY_W_NOME,
                        maxWidth: STICKY_W_NOME,
                        width: STICKY_W_NOME,
                        verticalAlign: "middle",
                      })}
                    >
                      Nome
                    </th>
                  ) : null}
                  <th
                    scope="col"
                    style={thSticky(areaCustomerService ? STICKY_LEFT_NICK_SEM_NOME : STICKY_LEFT_NICK, {
                      minWidth: STICKY_W_NICK,
                      maxWidth: STICKY_W_NICK,
                      width: STICKY_W_NICK,
                      verticalAlign: "middle",
                    })}
                  >
                    Nickname
                  </th>
                  <th
                    scope="col"
                    style={thSticky(areaCustomerService ? STICKY_LEFT_ESCALA_SEM_NOME : STICKY_LEFT_ESCALA, {
                      minWidth: STICKY_W_ESCALA,
                      maxWidth: STICKY_W_ESCALA,
                      width: STICKY_W_ESCALA,
                      verticalAlign: "middle",
                    })}
                  >
                    Escala
                  </th>
                  <th
                    scope="col"
                    style={thSticky(areaCustomerService ? STICKY_LEFT_TURNO_SEM_NOME : STICKY_LEFT_TURNO_STAFF, {
                      minWidth: STICKY_W_TURNO_STAFF,
                      maxWidth: STICKY_W_TURNO_STAFF,
                      width: STICKY_W_TURNO_STAFF,
                      verticalAlign: "middle",
                      borderRight: `1px solid ${t.cardBorder}`,
                      boxShadow: sombraColFixa,
                    })}
                    title="Referência do cadastro na Gestão de Staff (perfil de turno / contrato)."
                  >
                    Turno
                  </th>
                  {dias.map((dia) => (
                    <th
                      key={dia.iso}
                      scope="col"
                      style={thDia(dia)}
                      title={dia.feriadoNome ? `${dia.iso} · ${dia.feriadoNome}` : dia.iso}
                    >
                      <div style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{dia.dia}</div>
                      <div style={{ fontWeight: 600, textTransform: "lowercase", opacity: 0.95 }}>{dia.dowShort}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={(areaCustomerService ? 3 : 4) + dias.length}
                      style={{
                        ...getTdStyle(t),
                        textAlign: "center",
                        padding: "36px 16px",
                        color: t.textMuted,
                      }}
                    >
                      {msgTabelaVazia}
                    </td>
                  </tr>
                ) : (
                  linhas.map((row, i) => {
                    const bg = zebraBgLinha(i);
                    return (
                      <tr key={row.id} style={{ isolation: "isolate" }}>
                        {!areaCustomerService ? (
                          <td
                            style={tdSticky(0, bg, Z_BODY_NOME, {
                              maxWidth: STICKY_W_NOME,
                              width: STICKY_W_NOME,
                              minWidth: STICKY_W_NOME,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            })}
                            title={row.nomeCompletoCadastro}
                          >
                            {row.nome}
                          </td>
                        ) : null}
                        <td
                          style={tdSticky(
                            areaCustomerService ? STICKY_LEFT_NICK_SEM_NOME : STICKY_LEFT_NICK,
                            bg,
                            areaCustomerService ? Z_BODY_NOME : Z_BODY_NICK,
                            {
                              minWidth: STICKY_W_NICK,
                              width: STICKY_W_NICK,
                              maxWidth: STICKY_W_NICK,
                            },
                          )}
                          title={areaCustomerService ? row.nomeCompletoCadastro : undefined}
                        >
                          {row.nickname}
                        </td>
                        <td
                          style={tdSticky(
                            areaCustomerService ? STICKY_LEFT_ESCALA_SEM_NOME : STICKY_LEFT_ESCALA,
                            bg,
                            areaCustomerService ? Z_BODY_NICK : Z_BODY_ESCALA,
                            {
                              minWidth: STICKY_W_ESCALA,
                              width: STICKY_W_ESCALA,
                              maxWidth: STICKY_W_ESCALA,
                            },
                          )}
                          title={row.escalaCadastro}
                        >
                          {row.escalaCadastro}
                        </td>
                        <td
                          style={tdSticky(
                            areaCustomerService ? STICKY_LEFT_TURNO_SEM_NOME : STICKY_LEFT_TURNO_STAFF,
                            bg,
                            areaCustomerService ? Z_BODY_ESCALA : Z_BODY_TURNO_STAFF,
                            {
                              minWidth: STICKY_W_TURNO_STAFF,
                              width: STICKY_W_TURNO_STAFF,
                              maxWidth: STICKY_W_TURNO_STAFF,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              borderRight: `1px solid ${t.cardBorder}`,
                              boxShadow: sombraColFixa,
                            },
                          )}
                          title={row.turnoStaffNome || "Sem turno configurado na Staff para esta escala."}
                        >
                          {areaCustomerService && row.turnoStaffNome === TURNO_ESCALA_5x2
                            ? row.escalaCadastro !== "—"
                              ? row.escalaCadastro
                              : "Contrato"
                            : row.turnoStaffNome || "—"}
                        </td>
                        {dias.map((dia) => {
                          const ck = chaveCelulaGerar(row.id, dia.iso);
                          const bruto = celulasGerarAtivas?.[ck] ?? "";
                          const val = sanitizarValorCelulaGerar(row.siglaTurnoStaff, bruto, row.turnoStaffNome);
                          const opts = opcoesSelectCelulaGerar(row);
                          const textoCelula = labelExibicaoCelulaEscala(
                            row.siglaTurnoStaff,
                            celulasGerarAtivas?.[ck],
                            row.turnoStaffNome,
                          );
                          return (
                            <td
                              key={`${row.id}-${dia.iso}`}
                              style={{
                                ...tdDia,
                                background: fundoColunaDia(dia, bg),
                                ...(podeEditarCelulasDia ? { minWidth: 76, maxWidth: 86 } : {}),
                              }}
                            >
                              {podeEditarCelulasDia ? (
                                <select
                                  aria-label={`Escala do dia ${dia.dia} para ${row.nomeCompletoCadastro}`}
                                  value={val}
                                  onChange={(e) =>
                                    atualizarCelulaGerar(
                                      filtroArea,
                                      row.id,
                                      dia.iso,
                                      row.siglaTurnoStaff,
                                      row.turnoStaffNome,
                                      e.target.value,
                                    )
                                  }
                                  style={selectCelulaGerarStyle}
                                >
                                  {opts.map((o) => (
                                    <option key={o.value === "" ? "__empty" : o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: t.text,
                                    lineHeight: 1.2,
                                    padding: "2px 0",
                                  }}
                                >
                                  {textoCelula}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
