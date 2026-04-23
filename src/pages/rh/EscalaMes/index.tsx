import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { getThStyle, getTdStyle } from "../../../lib/tableStyles";
import { PageHeader } from "../../../components/PageHeader";
import {
  escalaPrestadorTemTurnosOperacionais,
  normalizarEscalaCadastro,
  staffTurnoCoerenteComEscala,
  turnosPermitidosPorEscalaPrestador as turnosPermitidosCadastro,
} from "../../../lib/rhEscalaTurnos";

type EscalaAba = "minha" | "gerenciar" | "gerar";

type DiaMes = {
  dia: number;
  dowShort: string;
  isWeekend: boolean;
  iso: string;
};

type LinhaColaborador = {
  id: string;
  nome: string;
  nickname: string;
  /** Padrão 4x2/3x3 etc. (Gestão de Prestadores) — define opções na aba Gerar. */
  escalaCadastro: string;
  /** Turno operacional cadastrado na Gestão de Staff (exibição). */
  turnoStaff: string;
};

/** Estado da geração de escala por valor de filtro (função). */
type EscalaGerarEstadoFiltro = {
  celulas: Record<string, string>;
  aprovado: boolean;
  baseline: Record<string, string> | null;
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

/** Valor do select para prestadores sem cargo preenchido. */
const FILTRO_FUNCAO_SEM_CARGO = "__sem__";
/** Game Presenter e Game Presenter VIP aparecem como uma única opção no filtro. */
const FILTRO_FUNCAO_GAME_PRESENTER = "__game_presenter__";

const GP_CARGO_LOWER = new Set(["game presenter", "game presenter vip"]);

function chaveOpcaoFiltroFuncao(cargoBruto: string): string {
  const lower = cargoBruto.trim().toLowerCase();
  if (GP_CARGO_LOWER.has(lower)) return FILTRO_FUNCAO_GAME_PRESENTER;
  return cargoBruto.trim();
}

function cargoPassaNoFiltro(cargo: string | null | undefined, filtro: string): boolean {
  if (filtro === "") return true;
  if (filtro === FILTRO_FUNCAO_SEM_CARGO) return !(cargo ?? "").trim();
  if (filtro === FILTRO_FUNCAO_GAME_PRESENTER) {
    const lower = (cargo ?? "").trim().toLowerCase();
    return GP_CARGO_LOWER.has(lower);
  }
  return (cargo ?? "").trim() === filtro;
}

function opcoesSelectCelulaGerar(escalaCadastroColuna: string): { value: string; label: string }[] {
  const turnos = [...turnosPermitidosCadastro(escalaCadastroColuna)];
  return [{ value: "", label: "—" }, { value: "Folga", label: "Folga" }, ...turnos.map((t) => ({ value: t, label: t }))];
}

/** Garante valor coerente com a escala (ex.: legado T/F ou Tarde em 3x3). */
function sanitizarValorCelulaGerar(escalaCadastroColuna: string, valorArmazenado: string): string {
  const v = (valorArmazenado ?? "").trim();
  const permit = new Set(opcoesSelectCelulaGerar(escalaCadastroColuna).map((o) => o.value));
  if (permit.has(v)) return v;
  if (v === "T" && permit.has("Manhã")) return "Manhã";
  if (v === "F" || v.toLowerCase() === "folga") return (permit.has("Folga") ? "Folga" : "");
  return "";
}

const DOW_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

/** Larguras fixas das 4 colunas fixas (sticky) — soma usada em `left`. */
const STICKY_W_NOME = 180;
const STICKY_W_NICK = 130;
const STICKY_W_ESCALA = 72;
const STICKY_W_TURNO_STAFF = 100;
const STICKY_LEFT_NICK = STICKY_W_NOME;
const STICKY_LEFT_ESCALA = STICKY_W_NOME + STICKY_W_NICK;
const STICKY_LEFT_TURNO_STAFF = STICKY_W_NOME + STICKY_W_NICK + STICKY_W_ESCALA;

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
    out.push({
      dia: day,
      dowShort: DOW_SHORT[dow] ?? "",
      isWeekend: dow === 0 || dow === 6,
      iso: `${y}-${m}-${dd}`,
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

function mapLinhaPrestador(r: RpcPrestadorEscala): LinhaColaborador {
  const nick = (r.staff_nickname ?? "").trim();
  const esc = (r.escala ?? "").trim();
  const co = staffTurnoCoerenteComEscala(r.escala, r.staff_turno);
  const turnoStaff = escalaPrestadorTemTurnosOperacionais(r.escala) ? co || "—" : "—";
  return {
    id: r.id,
    nome: (r.nome ?? "").trim() || "—",
    nickname: nick || "—",
    escalaCadastro: esc || "—",
    turnoStaff,
  };
}

function abaVisivel(aba: EscalaAba, canEditarOk: boolean, canCriarOk: boolean): boolean {
  if (aba === "minha" || aba === "gerenciar") return canEditarOk;
  if (aba === "gerar") return canCriarOk;
  return false;
}

function primeiraAbaDisponivel(canEditarOk: boolean, canCriarOk: boolean): EscalaAba | null {
  if (canEditarOk) return "minha";
  if (canCriarOk) return "gerar";
  return null;
}

export default function RhEscalaMesPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_escala_mes");

  const hoje = useMemo(() => new Date(), []);
  const inicial = useMemo(() => mesReferenciaInicial(), []);
  const [ano, setAno] = useState(inicial.ano);
  const [mes, setMes] = useState(inicial.mes);
  const [aba, setAba] = useState<EscalaAba>("minha");

  const [prestadoresRaw, setPrestadoresRaw] = useState<RpcPrestadorEscala[]>([]);
  const [loadingPrestadores, setLoadingPrestadores] = useState(true);
  const [erroPrestadores, setErroPrestadores] = useState<string | null>(null);
  /** Filtro por função na aba Gerenciar (permite “Todas as funções”). */
  const [filtroCargoGerenciar, setFiltroCargoGerenciar] = useState("");
  /** Função ativa na aba Gerar (tabela + destaque na lista; sem “Todas”). */
  const [filtroCargoGerar, setFiltroCargoGerar] = useState("");
  /** Por valor de filtro: células do mês e baseline após aprovação. */
  const [gerarPorFiltro, setGerarPorFiltro] = useState<Record<string, EscalaGerarEstadoFiltro>>({});

  const carregarPrestadores = useCallback(async () => {
    setLoadingPrestadores(true);
    setErroPrestadores(null);
    const { data, error } = await supabase.rpc("rh_escala_prestadores_times");
    if (error) {
      setErroPrestadores("Não foi possível carregar o staff da escala. Verifique permissões e se a migration da função foi aplicada.");
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

  useEffect(() => {
    if (perm.loading) return;
    if (abaVisivel(aba, perm.canEditarOk, perm.canCriarOk)) return;
    const first = primeiraAbaDisponivel(perm.canEditarOk, perm.canCriarOk);
    if (first) setAba(first);
  }, [perm.loading, perm.canEditarOk, perm.canCriarOk, aba]);

  const mostrarAbas = perm.canEditarOk || perm.canCriarOk;

  const mostrarFiltroFuncao =
    (aba === "gerenciar" && perm.canEditarOk) || (aba === "gerar" && perm.canCriarOk);

  const opcoesFuncao = useMemo((): { value: string; label: string }[] => {
    const map = new Map<string, string>();
    prestadoresRaw.forEach((p) => {
      const bruto = (p.cargo ?? "").trim();
      if (!bruto) return;
      const value = chaveOpcaoFiltroFuncao(bruto);
      const label = value === FILTRO_FUNCAO_GAME_PRESENTER ? "Game Presenter" : value;
      if (!map.has(value)) map.set(value, label);
    });
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [prestadoresRaw]);

  const temSemCargo = useMemo(
    () => prestadoresRaw.some((p) => !(p.cargo ?? "").trim()),
    [prestadoresRaw],
  );

  useEffect(() => {
    if (filtroCargoGerenciar === FILTRO_FUNCAO_SEM_CARGO && !temSemCargo) setFiltroCargoGerenciar("");
    else if (
      filtroCargoGerenciar !== "" &&
      filtroCargoGerenciar !== FILTRO_FUNCAO_SEM_CARGO &&
      !opcoesFuncao.some((o) => o.value === filtroCargoGerenciar)
    ) {
      setFiltroCargoGerenciar("");
    }
  }, [filtroCargoGerenciar, opcoesFuncao, temSemCargo]);

  useEffect(() => {
    if (filtroCargoGerar === FILTRO_FUNCAO_SEM_CARGO && !temSemCargo) setFiltroCargoGerar("");
    else if (
      filtroCargoGerar !== "" &&
      filtroCargoGerar !== FILTRO_FUNCAO_SEM_CARGO &&
      !opcoesFuncao.some((o) => o.value === filtroCargoGerar)
    ) {
      setFiltroCargoGerar("");
    }
  }, [filtroCargoGerar, opcoesFuncao, temSemCargo]);

  /** Novo mês: zera rascunhos/aprovações da aba Gerar e a seleção de função. */
  useEffect(() => {
    setGerarPorFiltro({});
    setFiltroCargoGerar("");
  }, [ano, mes]);

  const filtrarPorCargo = useCallback((rows: RpcPrestadorEscala[], filtro: string) => {
    if (filtro === "") return rows;
    return rows.filter((p) => cargoPassaNoFiltro(p.cargo, filtro));
  }, []);

  const linhasGerenciar = useMemo(() => {
    return filtrarPorCargo(prestadoresRaw, filtroCargoGerenciar).map(mapLinhaPrestador);
  }, [prestadoresRaw, filtroCargoGerenciar, filtrarPorCargo]);

  const linhasGerar = useMemo(() => {
    if (filtroCargoGerar === "") return [];
    return filtrarPorCargo(prestadoresRaw, filtroCargoGerar).map(mapLinhaPrestador);
  }, [prestadoresRaw, filtroCargoGerar, filtrarPorCargo]);

  const linhas: LinhaColaborador[] = useMemo(() => {
    const mapped = (rows: RpcPrestadorEscala[]) => rows.map(mapLinhaPrestador);
    if (!mostrarAbas) return mapped(prestadoresRaw);
    if (aba === "minha" && perm.canEditarOk) {
      const em = user?.email?.trim().toLowerCase();
      if (!em) return [];
      return prestadoresRaw.filter((p) => (p.email ?? "").trim().toLowerCase() === em).map(mapLinhaPrestador);
    }
    if (aba === "gerenciar" && perm.canEditarOk) return linhasGerenciar;
    if (aba === "gerar" && perm.canCriarOk) return linhasGerar;
    return [];
  }, [aba, user?.email, prestadoresRaw, perm.canEditarOk, perm.canCriarOk, mostrarAbas, linhasGerenciar, linhasGerar]);

  const linhasPorFiltroGerar = useCallback(
    (filtroKey: string) => filtrarPorCargo(prestadoresRaw, filtroKey).map(mapLinhaPrestador),
    [prestadoresRaw, filtrarPorCargo],
  );

  /** Sugestão: folga em fim de semana; dias úteis alternam entre os turnos permitidos pela escala do prestador. */
  const aplicarSugestaoGerar = useCallback(
    (filtroKey: string) => {
      const linhasF = linhasPorFiltroGerar(filtroKey);
      const next: Record<string, string> = {};
      for (const row of linhasF) {
        const turnos = [...turnosPermitidosCadastro(row.escalaCadastro)];
        let iDiaUtil = 0;
        for (const dia of dias) {
          const key = chaveCelulaGerar(row.id, dia.iso);
          if (turnos.length === 0) {
            next[key] = "";
          } else if (dia.isWeekend) {
            next[key] = "Folga";
          } else {
            next[key] = turnos[iDiaUtil % turnos.length] ?? "Manhã";
            iDiaUtil += 1;
          }
        }
      }
      setGerarPorFiltro((prev) => ({
        ...prev,
        [filtroKey]: {
          celulas: next,
          aprovado: false,
          baseline: null,
        },
      }));
      setFiltroCargoGerar(filtroKey);
    },
    [dias, linhasPorFiltroGerar],
  );

  const aprovarEscalaGerar = useCallback(
    (filtroKey: string) => {
      const linhasF = linhasPorFiltroGerar(filtroKey);
      setGerarPorFiltro((prev) => {
        const cur = prev[filtroKey];
        if (!cur) return prev;
        const merged: Record<string, string> = { ...cur.celulas };
        for (const row of linhasF) {
          for (const d of dias) {
            const k = chaveCelulaGerar(row.id, d.iso);
            merged[k] = sanitizarValorCelulaGerar(row.escalaCadastro, cur.celulas[k] ?? "");
          }
        }
        const baseline = { ...merged };
        return {
          ...prev,
          [filtroKey]: { ...cur, celulas: merged, aprovado: true, baseline },
        };
      });
    },
    [dias, linhasPorFiltroGerar],
  );

  const atualizarCelulaGerar = useCallback((filtroKey: string, rowId: string, iso: string, escalaCadastro: string, valor: string) => {
    const k = chaveCelulaGerar(rowId, iso);
    const ok = sanitizarValorCelulaGerar(escalaCadastro, valor);
    setGerarPorFiltro((prev) => {
      const cur = prev[filtroKey] ?? { celulas: {}, aprovado: false, baseline: null };
      return {
        ...prev,
        [filtroKey]: {
          ...cur,
          celulas: { ...cur.celulas, [k]: ok },
        },
      };
    });
  }, []);

  const acaoBotaoGerar = useCallback(
    (filtroKey: string): "sugestao" | "aprovar" | null => {
      if (!filtroKey) return null;
      const estado = gerarPorFiltro[filtroKey];
      const linhasF = linhasPorFiltroGerar(filtroKey);
      if (linhasF.length === 0) return null;
      const celulas = estado?.celulas ?? {};
      const allFilled = linhasF.every((row) =>
        dias.every((d) => {
          const k = chaveCelulaGerar(row.id, d.iso);
          return sanitizarValorCelulaGerar(row.escalaCadastro, celulas[k] ?? "").trim() !== "";
        }),
      );
      if (estado?.aprovado && estado.baseline) {
        const celSan: Record<string, string> = {};
        for (const row of linhasF) {
          for (const d of dias) {
            const k = chaveCelulaGerar(row.id, d.iso);
            celSan[k] = sanitizarValorCelulaGerar(row.escalaCadastro, celulas[k] ?? "");
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
      minWidth: 52,
      maxWidth: 56,
      whiteSpace: "normal",
      lineHeight: 1.25,
      fontSize: 9,
      letterSpacing: 0,
      zIndex: Z_DIA,
      position: "relative",
      background: dia.isWeekend
        ? t.isDark
          ? "rgba(245,158,11,0.12)"
          : "rgba(245,158,11,0.14)"
        : getThStyle(t).background,
      color: dia.isWeekend ? "#f59e0b" : undefined,
    }),
  });

  const sombraColFixa = t.isDark ? "4px 0 10px rgba(0,0,0,0.35)" : "4px 0 10px rgba(0,0,0,0.08)";

  const tdDia: CSSProperties = {
    ...getTdStyle(t, {
      textAlign: "center",
      minWidth: 52,
      maxWidth: 56,
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

  const celulasGerarAtivas = aba === "gerar" ? gerarPorFiltro[filtroCargoGerar]?.celulas : undefined;

  const msgTabelaVazia =
    aba === "gerar" && filtroCargoGerar === ""
      ? "Selecione uma função na lista acima."
      : "Sem dados para o período selecionado.";

  const selectCelulaGerarStyle: CSSProperties = {
    width: "100%",
    maxWidth: 76,
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

  const acaoGerarNoFiltroSelecionado =
    aba === "gerar" && filtroCargoGerar ? acaoBotaoGerar(filtroCargoGerar) : null;

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
        title="Escala do Mês"
        subtitle="Visualização da escala por colaborador e dia do mês (mesma base da Gestão de Staff)."
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
              marginBottom: mostrarAbas ? 12 : 0,
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
          </div>

          {mostrarAbas ? (
            <div
              role="tablist"
              aria-label="Modo da escala"
              style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
            >
              {perm.canEditarOk && (
                <>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={aba === "minha"}
                    id="tab-escala-minha"
                    aria-controls="panel-escala-mes"
                    onClick={() => setAba("minha")}
                    style={{
                      padding: "10px 18px",
                      minHeight: 44,
                      borderRadius: 10,
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      fontSize: 13,
                      cursor: "pointer",
                      border: `1px solid ${aba === "minha" ? brand.accent : t.cardBorder}`,
                      background:
                        aba === "minha"
                          ? brand.useBrand
                            ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                            : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                          : (t.inputBg ?? t.cardBg ?? "transparent"),
                      color: aba === "minha" ? brand.accent : t.textMuted,
                    }}
                  >
                    Minha Escala
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={aba === "gerenciar"}
                    id="tab-escala-gerenciar"
                    aria-controls="panel-escala-mes"
                    onClick={() => setAba("gerenciar")}
                    style={{
                      padding: "10px 18px",
                      minHeight: 44,
                      borderRadius: 10,
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      fontSize: 13,
                      cursor: "pointer",
                      border: `1px solid ${aba === "gerenciar" ? brand.accent : t.cardBorder}`,
                      background:
                        aba === "gerenciar"
                          ? brand.useBrand
                            ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                            : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                          : (t.inputBg ?? t.cardBg ?? "transparent"),
                      color: aba === "gerenciar" ? brand.accent : t.textMuted,
                    }}
                  >
                    Gerenciar Escala
                  </button>
                </>
              )}
              {perm.canCriarOk && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={aba === "gerar"}
                  id="tab-escala-gerar"
                  aria-controls="panel-escala-mes"
                  onClick={() => setAba("gerar")}
                  style={{
                    padding: "10px 18px",
                    minHeight: 44,
                    borderRadius: 10,
                    fontWeight: 700,
                    fontFamily: FONT.body,
                    fontSize: 13,
                    cursor: "pointer",
                    border: `1px solid ${aba === "gerar" ? brand.accent : t.cardBorder}`,
                    background:
                      aba === "gerar"
                        ? brand.useBrand
                          ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                          : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                        : (t.inputBg ?? t.cardBg ?? "transparent"),
                    color: aba === "gerar" ? brand.accent : t.textMuted,
                  }}
                >
                  Gerar Escala
                </button>
              )}
            </div>
          ) : null}

          {mostrarFiltroFuncao ? (
            <div
              style={{
                marginTop: mostrarAbas ? 14 : 10,
                paddingTop: mostrarAbas ? 14 : 0,
                borderTop: mostrarAbas ? `1px solid ${t.cardBorder}` : "none",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px 16px",
              }}
            >
              <label
                htmlFor={aba === "gerenciar" ? "escala-filtro-funcao-gerenciar" : "escala-filtro-funcao-gerar"}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Função
              </label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <select
                  id={aba === "gerenciar" ? "escala-filtro-funcao-gerenciar" : "escala-filtro-funcao-gerar"}
                  aria-label="Filtrar por função"
                  value={aba === "gerenciar" ? filtroCargoGerenciar : filtroCargoGerar}
                  onChange={(e) =>
                    aba === "gerenciar"
                      ? setFiltroCargoGerenciar(e.target.value)
                      : setFiltroCargoGerar(e.target.value)
                  }
                  style={{
                    minWidth: 260,
                    maxWidth: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg ?? t.cardBg ?? "transparent",
                    color: t.text,
                    fontFamily: FONT.body,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {aba === "gerenciar" ? (
                    <option value="">Todas as funções</option>
                  ) : (
                    <option value="" disabled>
                      Selecione uma função
                    </option>
                  )}
                  {opcoesFuncao.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  {temSemCargo ? (
                    <option value={FILTRO_FUNCAO_SEM_CARGO}>Sem função cadastrada</option>
                  ) : null}
                </select>
                {acaoGerarNoFiltroSelecionado === "sugestao" ? (
                  <button
                    type="button"
                    onClick={() => aplicarSugestaoGerar(filtroCargoGerar)}
                    aria-label="Gerar sugestão de escala para a função selecionada"
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
                    onClick={() => aprovarEscalaGerar(filtroCargoGerar)}
                    aria-label="Aprovar escala da função selecionada"
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
              </div>
            </div>
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

      <div
        role="tabpanel"
        id="panel-escala-mes"
        aria-labelledby={mostrarAbas ? `tab-escala-${aba}` : undefined}
        aria-label={mostrarAbas ? undefined : "Escala do mês por colaborador e dia"}
      >
        {loadingPrestadores ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 10 }}>
            <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            <span style={{ color: t.textMuted, fontSize: 13 }}>Carregando escala…</span>
          </div>
        ) : (
          <div className="app-table-wrap">
            <table
              style={{
                width: "100%",
                minWidth:
                  STICKY_W_NOME + STICKY_W_NICK + STICKY_W_ESCALA + STICKY_W_TURNO_STAFF + dias.length * 56,
                borderCollapse: "separate",
                borderSpacing: 0,
                borderRadius: 14,
                border: `1px solid ${t.cardBorder}`,
              }}
            >
              <caption style={{ display: "none" }}>Escala mensal com colunas por dia</caption>
              <thead>
                <tr>
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
                  <th
                    scope="col"
                    style={thSticky(STICKY_LEFT_NICK, {
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
                    style={thSticky(STICKY_LEFT_ESCALA, {
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
                    style={thSticky(STICKY_LEFT_TURNO_STAFF, {
                      minWidth: STICKY_W_TURNO_STAFF,
                      maxWidth: STICKY_W_TURNO_STAFF,
                      width: STICKY_W_TURNO_STAFF,
                      verticalAlign: "middle",
                      borderRight: `1px solid ${t.cardBorder}`,
                      boxShadow: sombraColFixa,
                    })}
                  >
                    Turno
                  </th>
                  {dias.map((dia) => (
                    <th key={dia.iso} scope="col" style={thDia(dia)} title={dia.iso}>
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
                      colSpan={4 + dias.length}
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
                    const editarCelulasGerar = aba === "gerar" && filtroCargoGerar !== "";
                    return (
                      <tr key={row.id} style={{ isolation: "isolate" }}>
                        <td
                          style={tdSticky(0, bg, Z_BODY_NOME, {
                            maxWidth: STICKY_W_NOME,
                            width: STICKY_W_NOME,
                            minWidth: STICKY_W_NOME,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          })}
                          title={row.nome}
                        >
                          {row.nome}
                        </td>
                        <td
                          style={tdSticky(STICKY_LEFT_NICK, bg, Z_BODY_NICK, {
                            minWidth: STICKY_W_NICK,
                            width: STICKY_W_NICK,
                            maxWidth: STICKY_W_NICK,
                          })}
                        >
                          {row.nickname}
                        </td>
                        <td
                          style={tdSticky(STICKY_LEFT_ESCALA, bg, Z_BODY_ESCALA, {
                            minWidth: STICKY_W_ESCALA,
                            width: STICKY_W_ESCALA,
                            maxWidth: STICKY_W_ESCALA,
                          })}
                          title={row.escalaCadastro}
                        >
                          {row.escalaCadastro}
                        </td>
                        <td
                          style={tdSticky(STICKY_LEFT_TURNO_STAFF, bg, Z_BODY_TURNO_STAFF, {
                            minWidth: STICKY_W_TURNO_STAFF,
                            width: STICKY_W_TURNO_STAFF,
                            maxWidth: STICKY_W_TURNO_STAFF,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            borderRight: `1px solid ${t.cardBorder}`,
                            boxShadow: sombraColFixa,
                          })}
                          title={row.turnoStaff}
                        >
                          {row.turnoStaff}
                        </td>
                        {dias.map((dia) => {
                          const ck = chaveCelulaGerar(row.id, dia.iso);
                          const bruto = editarCelulasGerar ? (celulasGerarAtivas?.[ck] ?? "") : "";
                          const val = editarCelulasGerar ? sanitizarValorCelulaGerar(row.escalaCadastro, bruto) : "";
                          const opts = opcoesSelectCelulaGerar(row.escalaCadastro);
                          return (
                            <td
                              key={`${row.id}-${dia.iso}`}
                              style={{
                                ...tdDia,
                                background: bg,
                                ...(editarCelulasGerar ? { minWidth: 72, maxWidth: 80 } : {}),
                              }}
                            >
                              {editarCelulasGerar ? (
                                <select
                                  aria-label={`Turno do dia ${dia.dia} para ${row.nome}`}
                                  value={val}
                                  onChange={(e) =>
                                    atualizarCelulaGerar(filtroCargoGerar, row.id, dia.iso, row.escalaCadastro, e.target.value)
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
                                "—"
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
        )}
      </div>
    </div>
  );
}
