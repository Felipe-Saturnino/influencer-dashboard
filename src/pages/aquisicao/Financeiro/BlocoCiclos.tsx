import { useCallback, useEffect, useMemo, useState } from "react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { usePermission } from "../../../hooks/usePermission"
import { useMediaQuery } from "../../../hooks/useMediaQuery"
import { FONT } from "../../../constants/theme"
import { FONT_TITLE } from "../../../lib/dashboardConstants"
import { fmtBRL, fmtHorasTotal } from "../../../lib/dashboardHelpers"
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles"
import { useDataTableBlock } from "../../../hooks/useDataTableBlock"
import { supabase } from "../../../lib/supabase"
import { enviarPagamentoEmailCiclo } from "../../../lib/financeiroEnviarPagamentoEmail"
import type { CicloPagamento, PagamentoStatus } from "../../../types"
import { SectionTitle, SortTableTh, type SortDir } from "../../../components/dashboard"
import { compareInfluencerPerfilStatus, compareLocaleTexto, compareNumber, comparePagamentoStatus } from "../../../lib/classificacaoSort"
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles"
import { Banknote, Clock, Loader2 } from "lucide-react"
import { STATUS_INFLUENCER, STATUS_PAG } from "./financeiroConstants"
import { cicloAberto, fmtCicloDatas, podeVerPagamentosAgenteFinanceiro } from "./financeiroCiclos"
import { type FinanceiroAgenteDbRow, type FinanceiroLiveRow, type FinanceiroLiveResultadoRow, type FinanceiroPagamentoDbRow, type FinanceiroPerfilCacheRow, type FinanceiroPerfilRow, type FinanceiroProfileRow, type PagamentoRow } from "./financeiroTypes"
import type { BlocoFiltros } from "./financeiroFiltros"
import { Badge, BtnAcao, BtnPrimary, SelectInput } from "./financeiroUi"
import { ModalAgente } from "./ModalAgente"
import { ModalAnalisar } from "./ModalAnalisar"
import { ModalPagar } from "./ModalPagar"

export function BlocoCiclos({ ciclos, onRecarregar, filtros }: {
  ciclos: CicloPagamento[];
  onRecarregar: () => void;
  filtros: BlocoFiltros;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const narrowMobile = useMediaQuery("(max-width: 479px)");
  const perm = usePermission("financeiro");
  const { podeVerInfluencer, podeVerOperadora: _podeVerOperadora, filterInfluencers, filterOperadora, filtroOp, operadoraInfMap: _operadoraInfMap, operadorasList } = filtros;

  const cicloAtualAberto = ciclos.find(c => !c.fechado_em && cicloAberto(c));
  const [cicloId, setCicloId] = useState<string>(cicloAtualAberto?.id ?? ciclos[0]?.id ?? "");
  const [rows, setRows] = useState<PagamentoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAnalisar, setModalAnalisar] = useState<PagamentoRow | null>(null);
  const [modalPagar, setModalPagar] = useState<PagamentoRow | null>(null);
  const [modalAgente, setModalAgente] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [enviarPagamentoLoading, setEnviarPagamentoLoading] = useState(false);
  const [enviarPagamentoError, setEnviarPagamentoError] = useState("");
  type CicloSortCol =
    | "influencer"
    | "classificacao"
    | "operadora"
    | "lives"
    | "horas"
    | "cache"
    | "total"
    | "status";
  const [sortCiclo, setSortCiclo] = useState<{ col: CicloSortCol; dir: SortDir }>({ col: "classificacao", dir: "asc" });

  const ciclo = ciclos.find(c => c.id === cicloId) ?? ciclos[0] ?? null;
  const isAberto = ciclo ? cicloAberto(ciclo) : false;
  const temAguardandoPagamento = useMemo(
    () => rows.some(r => r.status === "a_pagar"),
    [rows],
  );

  // Padrão: ciclo atual (aberto). Só altera se a seleção for inválida (ciclo removido da lista)
  useEffect(() => {
    const sel = ciclos.find(c => c.id === cicloId);
    const aberto = ciclos.find(c => !c.fechado_em && cicloAberto(c));
    if (!sel) setCicloId(aberto?.id ?? ciclos[0]?.id ?? "");
  }, [ciclos, cicloId]);

  const OPERADORA_PADRAO = "casa_apostas";

  const gerarPagamentosDoCiclo = useCallback(async (c: CicloPagamento) => {
    const { data: lives } = await supabase
      .from("lives")
      .select("id, influencer_id, operadora_slug")
      .eq("status", "realizada")
      .gte("data", c.data_inicio)
      .lte("data", c.data_fim);

    const livesFiltradas = (lives ?? []) as FinanceiroLiveRow[];
    const livesOk = livesFiltradas.filter((l) => podeVerInfluencer(l.influencer_id));
    const liveIds = livesOk.map((l) => l.id);
    let resultados: FinanceiroLiveResultadoRow[] = [];
    if (liveIds.length > 0) {
      const { data: resData } = await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min").in("live_id", liveIds);
      resultados = (resData ?? []) as FinanceiroLiveResultadoRow[];
    }

    const horasPorPar: Record<string, number> = {};
    const key = (inf: string, op: string) => `${inf}::${op}`;
    for (const live of livesOk) {
      const res = resultados.find((r) => String(r.live_id) === String(live.id));
      if (res) {
        const opSlug = live.operadora_slug?.trim() || OPERADORA_PADRAO;
        const k = key(live.influencer_id, opSlug);
        const horas = (res.duracao_horas ?? 0) + (res.duracao_min ?? 0) / 60;
        horasPorPar[k] = (horasPorPar[k] ?? 0) + horas;
      }
    }

    for (const [parKey, horas] of Object.entries(horasPorPar)) {
      const [influencer_id, operadora_slug] = parKey.split("::");
      const { data: perfil } = await supabase.from("influencer_perfil").select("cache_hora").eq("id", influencer_id).single();
      const cache_hora = perfil?.cache_hora ?? 0;
      const total = Math.round(horas * cache_hora * 100) / 100;
      await supabase.from("pagamentos").upsert({
        ciclo_id: c.id, influencer_id, operadora_slug,
        horas_realizadas: Math.round(horas * 100) / 100,
        cache_hora, total, status: "em_analise",
      }, { onConflict: "ciclo_id,influencer_id,operadora_slug" });
    }
  }, [podeVerInfluencer]);

  const fecharCiclo = useCallback(async (c: CicloPagamento) => {
    await gerarPagamentosDoCiclo(c);
    await supabase.from("ciclos_pagamento").update({ fechado_em: new Date().toISOString() }).eq("id", c.id);
    onRecarregar();
  }, [gerarPagamentosDoCiclo, onRecarregar]);

  const carregarPreview = useCallback(async (c: CicloPagamento) => {
    const { data: lives } = await supabase
      .from("lives")
      .select("id, influencer_id, operadora_slug")
      .eq("status", "realizada")
      .gte("data", c.data_inicio)
      .lte("data", c.data_fim);

    const livesFiltradas = ((lives ?? []) as FinanceiroLiveRow[]).filter((l) => podeVerInfluencer(l.influencer_id));
    if (livesFiltradas.length === 0) { setRows([]); return; }

    const liveIds = livesFiltradas.map((l) => l.id);
    let resultados: FinanceiroLiveResultadoRow[] = [];
    if (liveIds.length > 0) {
      const { data: resData } = await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min").in("live_id", liveIds);
      resultados = (resData ?? []) as FinanceiroLiveResultadoRow[];
    }

    const horasPorPar: Record<string, { horas: number; qtd: number }> = {};
    const key = (inf: string, op: string) => `${inf}::${op}`;
    for (const live of livesFiltradas) {
      const res = resultados.find((r) => String(r.live_id) === String(live.id));
      if (res) {
        const opSlug = live.operadora_slug?.trim() || OPERADORA_PADRAO;
        const k = key(live.influencer_id, opSlug);
        if (!horasPorPar[k]) horasPorPar[k] = { horas: 0, qtd: 0 };
        const horas = (res.duracao_horas ?? 0) + (res.duracao_min ?? 0) / 60;
        horasPorPar[k].horas += horas;
        horasPorPar[k].qtd += 1;
      }
    }

    let parKeys = Object.keys(horasPorPar);
    if (filterInfluencers.length > 0) parKeys = parKeys.filter((k) => filterInfluencers.includes(k.split("::")[0]));
    if (filtroOp?.length) {
      parKeys = parKeys.filter((k) => filtroOp.some(op => k.endsWith(`::${op}`)));
    } else if (filterOperadora && filterOperadora !== "todas") {
      parKeys = parKeys.filter((k) => k.endsWith(`::${filterOperadora}`));
    }
    const ids = [...new Set(parKeys.map((k) => k.split("::")[0]))];
    const [{ data: profiles }, { data: perfis }] = await Promise.all([
      supabase.from("profiles").select("id, name").in("id", ids),
      supabase.from("influencer_perfil").select("id, cache_hora, nome_artistico, status").in("id", ids),
    ]);

    const nameMap: Record<string, string> = {};
    for (const p of (profiles ?? []) as FinanceiroProfileRow[]) {
      nameMap[p.id] = p.name ?? p.id;
    }

    const perfilMap: Record<string, { cache: number; artistico: string; status: string | null }> = {};
    for (const p of (perfis ?? []) as FinanceiroPerfilCacheRow[]) {
      perfilMap[p.id] = {
        cache: p.cache_hora ?? 0,
        artistico: p.nome_artistico ?? nameMap[p.id] ?? p.id,
        status: p.status ?? null,
      };
    }

    const result: PagamentoRow[] = parKeys.map(parKey => {
      const [id, opSlug] = parKey.split("::");
      const { horas, qtd } = horasPorPar[parKey];
      const h = Math.round(horas * 100) / 100;
      const cache = perfilMap[id]?.cache ?? 0;
      return {
        id: `preview_${parKey}`,
        influencer_id: id,
        influencer_name: perfilMap[id]?.artistico ?? nameMap[id] ?? id,
        operadora_slug: opSlug,
        horas_realizadas: h,
        cache_hora: cache,
        total: Math.round(h * cache * 100) / 100,
        status: "em_analise" as PagamentoStatus,
        pago_em: null,
        qtd_lives: qtd,
        statusInfluencer: perfilMap[id]?.status ?? null,
      };
    });

    result.sort((a, b) => b.total - a.total);
    setRows(result);
  }, [filterInfluencers, filterOperadora, filtroOp, podeVerInfluencer]);

  const carregarPagamentos = useCallback(async (c: CicloPagamento) => {
    const incluirLinhasAgente = podeVerPagamentosAgenteFinanceiro(user?.role);
    const [{ data: pags }, { data: agentes }, { data: livesCiclo }] = await Promise.all([
      supabase.from("pagamentos")
        .select("*")
        .eq("ciclo_id", c.id)
        .order("total", { ascending: false }),
      incluirLinhasAgente
        ? supabase.from("pagamentos_agentes")
            .select("*")
            .eq("ciclo_id", c.id)
            .order("criado_em", { ascending: true })
        : Promise.resolve({ data: [] as FinanceiroAgenteDbRow[] }),
      supabase.from("lives")
        .select("id, influencer_id, operadora_slug")
        .eq("status", "realizada")
        .gte("data", c.data_inicio)
        .lte("data", c.data_fim),
    ]);

    // Sincroniza lives validadas após o fechamento: cria pagamentos faltantes (em_analise) sem alterar os existentes
    const pagsList = (pags ?? []) as FinanceiroPagamentoDbRow[];
    const existentesKeys = new Set(pagsList.map((p) => `${p.influencer_id}::${p.operadora_slug}`));
    const livesCicloList = (livesCiclo ?? []) as FinanceiroLiveRow[];
    const livesSemPagamento = livesCicloList.filter((l) => {
      if (!podeVerInfluencer(l.influencer_id)) return false;
      const opSlug = l.operadora_slug?.trim() || OPERADORA_PADRAO;
      return !existentesKeys.has(`${l.influencer_id}::${opSlug}`);
    });
    let pagsFinais: FinanceiroPagamentoDbRow[] = pagsList;
    if (livesSemPagamento.length > 0) {
      const liveIdsSync = livesSemPagamento.map((l) => l.id);
      const { data: resSync } = await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min").in("live_id", liveIdsSync);
      const horasPorPar: Record<string, number> = {};
      const keySync = (inf: string, op: string) => `${inf}::${op}`;
      const resSyncList = (resSync ?? []) as FinanceiroLiveResultadoRow[];
      for (const live of livesSemPagamento) {
        const res = resSyncList.find((r) => String(r.live_id) === String(live.id));
        if (res) {
          const opSlug = live.operadora_slug?.trim() || OPERADORA_PADRAO;
          const k = keySync(live.influencer_id, opSlug);
          const horas = (res.duracao_horas ?? 0) + (res.duracao_min ?? 0) / 60;
          horasPorPar[k] = (horasPorPar[k] ?? 0) + horas;
        }
      }
      for (const [parKey, horas] of Object.entries(horasPorPar)) {
        const [influencer_id, operadora_slug] = parKey.split("::");
        const { data: perfil } = await supabase.from("influencer_perfil").select("cache_hora").eq("id", influencer_id).single();
        const cache_hora = perfil?.cache_hora ?? 0;
        const total = Math.round(horas * cache_hora * 100) / 100;
        await supabase.from("pagamentos").upsert({
          ciclo_id: c.id, influencer_id, operadora_slug,
          horas_realizadas: Math.round(horas * 100) / 100,
          cache_hora, total, status: "em_analise",
        }, { onConflict: "ciclo_id,influencer_id,operadora_slug" });
      }
      if (Object.keys(horasPorPar).length > 0) {
        const { data: pagsAtual } = await supabase.from("pagamentos").select("*").eq("ciclo_id", c.id).order("total", { ascending: false });
        pagsFinais = (pagsAtual ?? pagsFinais) as FinanceiroPagamentoDbRow[];
      }
    }

    const liveIds = livesCicloList.map((l) => l.id);
    let resultados: { live_id: string | number }[] = [];
    if (liveIds.length > 0) {
      const { data: resData } = await supabase.from("live_resultados").select("live_id").in("live_id", liveIds);
      resultados = (resData ?? []) as { live_id: string | number }[];
    }
    const qtdPorPar: Record<string, number> = {};
    const key = (inf: string, op: string) => `${inf}::${op}`;
    for (const l of livesCicloList) {
      if (!podeVerInfluencer(l.influencer_id)) continue;
      const opSlug = l.operadora_slug?.trim() || OPERADORA_PADRAO;
      const temRes = resultados.some((r) => String(r.live_id) === String(l.id));
      if (temRes) {
        const k = key(l.influencer_id, opSlug);
        qtdPorPar[k] = (qtdPorPar[k] ?? 0) + 1;
      }
    }

    // Busca nomes separadamente para evitar falha silenciosa de FK
    const influencerIds = [...new Set(pagsFinais.map((p) => p.influencer_id))];
    const nomeMap: Record<string, string> = {};
    const statusPorId: Record<string, string | null> = {};
    if (influencerIds.length > 0) {
      const [{ data: perfis }, { data: profiles }] = await Promise.all([
        supabase.from("influencer_perfil").select("id, nome_artistico, status").in("id", influencerIds),
        supabase.from("profiles").select("id, name").in("id", influencerIds),
      ]);
      for (const p of (profiles ?? []) as FinanceiroProfileRow[]) {
        nomeMap[p.id] = p.name ?? p.id;
      }
      for (const p of (perfis ?? []) as FinanceiroPerfilRow[]) {
        if (p.nome_artistico) nomeMap[p.id] = p.nome_artistico;
        statusPorId[p.id] = p.status ?? null;
      }
    }

    let pagsFiltrados = pagsFinais.filter((p) => podeVerInfluencer(p.influencer_id));
    if (filterInfluencers.length > 0) pagsFiltrados = pagsFiltrados.filter((p) => filterInfluencers.includes(p.influencer_id));
    if (filtroOp?.length) {
      pagsFiltrados = pagsFiltrados.filter((p) => p.operadora_slug && filtroOp.includes(p.operadora_slug));
    } else if (filterOperadora && filterOperadora !== "todas") {
      pagsFiltrados = pagsFiltrados.filter((p) => p.operadora_slug === filterOperadora);
    }

    const linhasInf: PagamentoRow[] = pagsFiltrados.map((p) => {
      const parKey = key(p.influencer_id, p.operadora_slug ?? "");
      return {
        id: p.id,
        influencer_id: p.influencer_id,
        influencer_name: nomeMap[p.influencer_id] ?? p.influencer_id,
        operadora_slug: p.operadora_slug ?? undefined,
        horas_realizadas: p.horas_realizadas,
        cache_hora: p.cache_hora ?? 0,
        total: p.total,
        status: p.status as PagamentoStatus,
        pago_em: p.pago_em ?? null,
        qtd_lives: qtdPorPar[parKey] ?? 0,
        statusInfluencer: statusPorId[p.influencer_id] ?? null,
      };
    });

    let agentesFiltrados: FinanceiroAgenteDbRow[] = incluirLinhasAgente ? ((agentes ?? []) as FinanceiroAgenteDbRow[]) : [];
    if (filtroOp?.length) {
      agentesFiltrados = agentesFiltrados.filter((a) => a.operadora_slug && filtroOp.includes(a.operadora_slug));
    } else if (filterOperadora && filterOperadora !== "todas") {
      agentesFiltrados = agentesFiltrados.filter((a) => a.operadora_slug === filterOperadora);
    }
    const linhasAg: PagamentoRow[] = agentesFiltrados.map((a) => ({
      id: a.id!,
      influencer_id: "agente",
      influencer_name: "Agentes",
      horas_realizadas: 0,
      cache_hora: 0,
      total: a.total,
      status: a.status as PagamentoStatus,
      pago_em: a.pago_em ?? null,
      is_agente: true,
      descricao: a.descricao ?? undefined,
      qtd_lives: 0,
    }));

    setRows([...linhasInf, ...linhasAg]);
  }, [podeVerInfluencer, filterInfluencers, filterOperadora, filtroOp, user?.role]);

  const carregarDados = useCallback(async (c: CicloPagamento) => {
    setLoading(true);
    if (cicloAberto(c)) {
      await carregarPreview(c);
    } else {
      await carregarPagamentos(c);
    }
    setLoading(false);
  }, [carregarPreview, carregarPagamentos]);

  useEffect(() => {
    if (ciclos.length === 0) return;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const paraFechar = ciclos.find(cic => !cic.fechado_em && hoje > new Date((cic.data_fim || "") + "T00:00:00"));
    if (paraFechar) void fecharCiclo(paraFechar);
  }, [ciclos, fecharCiclo]);

  useEffect(() => {
    if (ciclo) void carregarDados(ciclo);
  }, [ciclo, carregarDados, refreshTrigger]);

  const MSG_ERRO_APROVAR = "Não foi possível aprovar o pagamento. Se o problema persistir, entre em contato com o suporte.";
  const MSG_ERRO_PAGAR = "Não foi possível registrar o pagamento. Se o problema persistir, entre em contato com o suporte.";

  async function handleAprovar(id: string, novoTotal: number, isAgente: boolean) {
    if (String(id).startsWith("preview_")) {
      throw new Error("Ciclo ainda aberto — os pagamentos serão gerados ao fechar o período. Não é possível aprovar a prévia.");
    }
    const tb = isAgente ? "pagamentos_agentes" : "pagamentos";

    let ok = false;
    const { data: rpcData, error: rpcError } = await supabase.rpc("aprovar_pagamento", {
      p_id: id,
      p_total: novoTotal,
      p_is_agente: isAgente ?? false,
    });
    if (rpcError) {
      console.error("aprovar_pagamento RPC:", rpcError);
      throw new Error(MSG_ERRO_APROVAR);
    }
    if (rpcData && typeof rpcData === "object") {
      const res = rpcData as { ok?: boolean; error?: string };
      if (res.ok === true) ok = true;
      else if (res.ok === false) {
        console.error("aprovar_pagamento response:", res);
        throw new Error(MSG_ERRO_APROVAR);
      }
    }

    if (!ok) {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("aprovar-pagamento", {
        body: { action: "aprovar", id, total: novoTotal, isAgente: isAgente ?? false },
      });
      if (!fnError && fnData && typeof fnData === "object" && (fnData as { ok?: boolean }).ok === true) {
        ok = true;
      } else if (fnData && typeof fnData === "object" && (fnData as { ok?: boolean }).ok === false) {
        console.error("aprovar-pagamento edge:", fnData, fnError);
        throw new Error(MSG_ERRO_APROVAR);
      }
    }

    if (!ok) {
      const { data, error } = await supabase.from(tb).update({ status: "a_pagar", total: novoTotal }).eq("id", id).select("id");
      if (error) {
        console.error("aprovar pagamento fallback:", error);
        throw new Error(MSG_ERRO_APROVAR);
      }
      if (!data || data.length === 0) {
        console.error("aprovar pagamento: nenhuma linha atualizada", { id, tb });
        throw new Error(MSG_ERRO_APROVAR);
      }
    }

    setModalAnalisar(null);
    setRefreshTrigger((prev) => prev + 1);
  }

  async function handlePagar(id: string, isAgente: boolean) {
    if (String(id).startsWith("preview_")) {
      throw new Error("Ciclo ainda aberto — os pagamentos serão gerados ao fechar o período.");
    }
    const tb = isAgente ? "pagamentos_agentes" : "pagamentos";

    let ok = false;
    const { data: rpcData, error: rpcError } = await supabase.rpc("registrar_pagamento", {
      p_id: id,
      p_is_agente: isAgente ?? false,
    });
    if (rpcError) {
      console.error("registrar_pagamento RPC:", rpcError);
      throw new Error(MSG_ERRO_PAGAR);
    }
    if (rpcData && typeof rpcData === "object") {
      const res = rpcData as { ok?: boolean; error?: string };
      if (res.ok === true) ok = true;
      else if (res.ok === false) {
        console.error("registrar_pagamento response:", res);
        throw new Error(MSG_ERRO_PAGAR);
      }
    }

    if (!ok) {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("aprovar-pagamento", {
        body: { action: "registrar", id, isAgente: isAgente ?? false },
      });
      if (!fnError && fnData && typeof fnData === "object" && (fnData as { ok?: boolean }).ok === true) {
        ok = true;
      } else if (fnData && typeof fnData === "object" && (fnData as { ok?: boolean }).ok === false) {
        console.error("registrar-pagamento edge:", fnData, fnError);
        throw new Error(MSG_ERRO_PAGAR);
      }
    }

    if (!ok) {
      const { data, error } = await supabase.from(tb).update({ status: "pago", pago_em: new Date().toISOString() }).eq("id", id).select("id");
      if (error) {
        console.error("registrar pagamento fallback:", error);
        throw new Error(MSG_ERRO_PAGAR);
      }
      if (!data || data.length === 0) {
        console.error("registrar pagamento: nenhuma linha atualizada", { id, tb });
        throw new Error(MSG_ERRO_PAGAR);
      }
    }

    setModalPagar(null);
    setRefreshTrigger((prev) => prev + 1);
  }

  async function handleRetornar(id: string, isAgente: boolean) {
    if (String(id).startsWith("preview_")) {
      throw new Error("Ciclo ainda aberto.");
    }
    const tb = isAgente ? "pagamentos_agentes" : "pagamentos";
    const { error } = await supabase.from(tb).update({ status: "em_analise", pago_em: null }).eq("id", id).select("id");
    if (error) {
      console.error("retornar pagamento:", error);
      throw new Error(MSG_ERRO_APROVAR);
    }
    setModalPagar(null);
    setRefreshTrigger((prev) => prev + 1);
  }

  const rowsOrdenados = useMemo(() => {
    const arr = [...rows];
    const { col, dir } = sortCiclo;
    const nomeOp = (r: PagamentoRow) =>
      r.is_agente
        ? "\u0000"
        : (operadorasList.find((o) => o.slug === r.operadora_slug)?.nome ?? r.operadora_slug ?? "").toLowerCase();
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "influencer":
          c = compareLocaleTexto(a.influencer_name, b.influencer_name, dir);
          break;
        case "classificacao":
          c = compareInfluencerPerfilStatus(a, b, dir);
          break;
        case "operadora":
          c = compareLocaleTexto(nomeOp(a), nomeOp(b), dir);
          break;
        case "lives":
          c = compareNumber(a.qtd_lives ?? 0, b.qtd_lives ?? 0, dir);
          break;
        case "horas":
          c = compareNumber(a.horas_realizadas, b.horas_realizadas, dir);
          break;
        case "cache":
          c = compareNumber(a.cache_hora, b.cache_hora, dir);
          break;
        case "total":
          c = compareNumber(a.total, b.total, dir);
          break;
        case "status":
          c = comparePagamentoStatus(a.status, b.status, dir);
          break;
        default:
          c = 0;
      }
      if (c !== 0) return c;
      return compareLocaleTexto(a.influencer_name, b.influencer_name, "asc");
    });
    return arr;
  }, [rows, sortCiclo, operadorasList]);

  const kpi = useMemo(() => ({
    em: rows.filter(r => r.status === "em_analise").length,
    ap: rows.filter(r => r.status === "a_pagar").length,
    pg: rows.filter(r => r.status === "pago").length,
    total: rows.reduce((a, r) => a + r.total, 0),
  }), [rows]);

  async function handleEnviarPagamentoEmail() {
    if (!ciclo || isAberto || !temAguardandoPagamento) return;
    setEnviarPagamentoError("");
    setEnviarPagamentoLoading(true);
    try {
      const res = await enviarPagamentoEmailCiclo(supabase, ciclo.id);
      if (!res.ok) {
        setEnviarPagamentoError(res.error ?? "Não foi possível enviar a notificação.");
        return;
      }
    } catch (e) {
      setEnviarPagamentoError(e instanceof Error ? e.message : "Erro ao enviar notificação de pagamento.");
    } finally {
      setEnviarPagamentoLoading(false);
    }
  }

  const opcioesCiclo = ciclos.map(c => ({
    value: c.id,
    label: `${fmtCicloDatas(c.data_inicio, c.data_fim)}${cicloAberto(c) ? " (atual)" : ""}`,
  }));

  const pageBox = getPageContentBoxStyle(brand, t);

  return (
    <div style={pageBox}>

      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <SectionTitle compact>Ciclo de pagamento</SectionTitle>

          {ciclo && (
            <span style={{
              fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "20px",
              background: isAberto ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.12)",
              color: isAberto ? "#f59e0b" : "#22c55e",
              border: `1px solid ${isAberto ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.35)"}`,
            }}>
              {isAberto ? "Atual" : "Fechado"}
            </span>
          )}

          <SelectInput
            aria-label="Selecionar ciclo de pagamento"
            value={cicloId}
            onChange={v => setCicloId(v)}
            options={opcioesCiclo}
            style={{ maxWidth: "100%" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          {enviarPagamentoError ? (
            <div
              role="alert"
              aria-live="polite"
              style={{ maxWidth: 420, fontSize: 12, color: "#e84025", fontFamily: FONT.body, textAlign: "right" }}
            >
              {enviarPagamentoError}
            </div>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {ciclo && !isAberto && temAguardandoPagamento && perm.canEditarOk && (
              <BtnPrimary
                onClick={() => void handleEnviarPagamentoEmail()}
                disabled={enviarPagamentoLoading}
                title="Notificar por e-mail (automação em configuração)"
              >
                {enviarPagamentoLoading ? "Enviando..." : "Enviar pagamento"}
              </BtnPrimary>
            )}
            {ciclo && perm.canEditarOk && podeVerPagamentosAgenteFinanceiro(user?.role) && (
              <BtnPrimary onClick={() => setModalAgente(true)}>
                Pagamento de agente
              </BtnPrimary>
            )}
          </div>
        </div>
      </div>

      {/* KPIs do ciclo (apenas fechado) */}
      {!isAberto && rows.length > 0 && (
        <div className="app-grid-kpi-4" style={{ gap: "10px", marginBottom: "20px" }}>
          {[
            { value: kpi.em,             label: "Em análise",   color: "#f59e0b" },
            { value: kpi.ap,             label: "A pagar",      color: "#a78bfa" },
            { value: kpi.pg,             label: "Pago",         color: "#22c55e" },
            { value: fmtBRL(kpi.total), label: "Total do ciclo", color: "var(--brand-primary, #7c3aed)" },
          ].map((item, i) => (
            <div key={i} style={{ background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.cardBorder}`, borderRadius: "10px", padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontFamily: FONT_TITLE, fontSize: "20px", fontWeight: 900, color: item.color, marginBottom: "3px" }}>{item.value}</div>
              <div style={{ fontSize: "10px", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: FONT.body }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Badge preview */}
      {isAberto && rows.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", marginBottom: "16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "12px", color: "#f59e0b", fontFamily: FONT.body }}>
          Prévia em tempo real — ciclo aberto. Os pagamentos serão gerados ao encerrar o período.
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "48px", color: t.textMuted, fontFamily: FONT.body }}>
          <Loader2 size={18} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
          Carregando…
        </div>
      ) : (
        <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle()}>
              <caption style={{ display: "none" }}>
                Pagamentos do ciclo selecionado
              </caption>
            <thead>
              <tr>
                <SortTableTh<CicloSortCol>
                  label="Influencer"
                  col="influencer"
                  sortCol={sortCiclo.col}
                  sortDir={sortCiclo.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={(c) =>
                    setSortCiclo((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<CicloSortCol>
                  label="Perfil"
                  col="classificacao"
                  sortCol={sortCiclo.col}
                  sortDir={sortCiclo.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={(c) =>
                    setSortCiclo((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                {filterOperadora === "todas" && (
                  <SortTableTh<CicloSortCol>
                    label="Operadora"
                    col="operadora"
                    sortCol={sortCiclo.col}
                    sortDir={sortCiclo.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) =>
                      setSortCiclo((s) => ({
                        col: c,
                        dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                )}
                <SortTableTh<CicloSortCol>
                  label="Lives"
                  col="lives"
                  sortCol={sortCiclo.col}
                  sortDir={sortCiclo.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={(c) =>
                    setSortCiclo((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<CicloSortCol>
                  label="Horas realizadas"
                  col="horas"
                  sortCol={sortCiclo.col}
                  sortDir={sortCiclo.dir}
                  thStyle={{ ...dataTable.thHeader, ...(isAberto && narrowMobile ? { display: "none" } : {}) }}
                  align="center"
                  onSort={(c) =>
                    setSortCiclo((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                {isAberto ? (
                  <>
                    <SortTableTh<CicloSortCol>
                      label="Cachê/hora"
                      col="cache"
                      sortCol={sortCiclo.col}
                      sortDir={sortCiclo.dir}
                      thStyle={{ ...dataTable.thHeader, ...(narrowMobile ? { display: "none" } : {}) }}
                      align="center"
                      onSort={(c) =>
                        setSortCiclo((s) => ({
                          col: c,
                          dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                        }))
                      }
                    />
                    <SortTableTh<CicloSortCol>
                      label="Estimativa"
                      col="total"
                      sortCol={sortCiclo.col}
                      sortDir={sortCiclo.dir}
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={(c) =>
                        setSortCiclo((s) => ({
                          col: c,
                          dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                        }))
                      }
                    />
                  </>
                ) : (
                  <>
                    <SortTableTh<CicloSortCol>
                      label="Total"
                      col="total"
                      sortCol={sortCiclo.col}
                      sortDir={sortCiclo.dir}
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={(c) =>
                        setSortCiclo((s) => ({
                          col: c,
                          dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                        }))
                      }
                    />
                    <SortTableTh<CicloSortCol>
                      label="Pagamento"
                      col="status"
                      sortCol={sortCiclo.col}
                      sortDir={sortCiclo.dir}
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={(c) =>
                        setSortCiclo((s) => ({
                          col: c,
                          dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                        }))
                      }
                    />
                    <th scope="col" style={{ ...dataTable.thHeader, cursor: "default", userSelect: "none" }}>Ação</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={(isAberto ? 6 : 7) + (filterOperadora === "todas" ? 1 : 0)} style={{ ...dataTable.tdCenter, textAlign: "center", color: t.textMuted, padding: "48px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                      {isAberto ? "Nenhuma live realizada neste ciclo ainda." : "Nenhum pagamento neste ciclo."}
                      <span style={{ fontSize: "12px", maxWidth: 480, display: "block", marginTop: 8 }}>
                        <strong>Confira:</strong> (1) Selecione no dropdown acima o ciclo que contém as datas das suas lives — ex.: lives em 26–28/01 ficam no ciclo 22/01–28/01 (qui–qua). (2) A live foi validada em <strong>Lives → Resultados</strong> com status realizada, operadora e duração? (3) O influencer tem cachê/hora em Lives → Influencers? (4) O filtro de operadora está em &quot;Todas&quot;?
                      </span>
                    </div>
                  </td>
                </tr>
              ) : rowsOrdenados.map((row, i) => {
                const sk = (row.statusInfluencer ?? "ativo").toLowerCase();
                const slInf = STATUS_INFLUENCER[sk] ?? { label: row.statusInfluencer ?? "Ativo", color: "#94a3b8" };
                const zebraBg = dataTable.zebraRow(i);
                return (
                <tr
                  key={row.id}
                  style={{ borderBottom: i < rowsOrdenados.length - 1 ? `1px solid ${t.cardBorder}` : "none", background: zebraBg }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = zebraBg;
                  }}
                >
                  <td
                    style={dataTable.tdCenter}
                    title={row.influencer_name}
                  >
                    <div style={{ fontWeight: 600 }}>{row.influencer_name}</div>
                    {row.is_agente && row.descricao ? (
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{row.descricao}</div>
                    ) : null}
                  </td>

                  <td style={dataTable.tdCenter}>
                    {row.is_agente ? (
                      <span style={{ color: t.textMuted, fontSize: 12 }}>—</span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: "20px",
                          background: `${slInf.color}22`,
                          color: slInf.color,
                          border: `1px solid ${slInf.color}44`,
                        }}
                      >
                        {slInf.label}
                      </span>
                    )}
                  </td>

                  {filterOperadora === "todas" && (
                    <td style={{ ...dataTable.tdCenter, color: t.textMuted, fontSize: "12px" }}>
                      {row.is_agente ? "—" : (operadorasList.find(o => o.slug === row.operadora_slug)?.nome ?? row.operadora_slug ?? "—")}
                    </td>
                  )}

                  {isAberto ? (
                    <>
                      <td style={{ ...dataTable.tdCenter, color: t.textMuted }}>{row.qtd_lives ?? 0} live{(row.qtd_lives ?? 0) !== 1 ? "s" : ""}</td>
                      <td style={{ ...dataTable.tdCenter, ...(narrowMobile ? { display: "none" } : {}) }}>{fmtHorasTotal(row.horas_realizadas)}</td>
                      <td style={{ ...dataTable.tdCenter, color: t.textMuted, ...(narrowMobile ? { display: "none" } : {}) }}>
                        {row.cache_hora > 0
                          ? fmtBRL(row.cache_hora)
                          : <span style={{ color: "#e84025", fontSize: "11px" }}>Não cadastrado</span>}
                      </td>
                      <td style={{ ...dataTable.tdCenter, fontWeight: 700, color: row.cache_hora > 0 ? "var(--brand-primary, #7c3aed)" : t.textMuted }}>
                        {row.cache_hora > 0 ? fmtBRL(row.total) : "—"}
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ ...dataTable.tdCenter, color: t.textMuted }}>{row.is_agente ? "—" : `${row.qtd_lives ?? 0} live${(row.qtd_lives ?? 0) !== 1 ? "s" : ""}`}</td>
                      <td style={dataTable.tdCenter}>{row.is_agente ? "—" : fmtHorasTotal(row.horas_realizadas)}</td>
                      <td style={{ ...dataTable.tdCenter, fontWeight: 700 }}>{fmtBRL(row.total)}</td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <Badge status={row.status} config={STATUS_PAG} />
                        </div>
                      </td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                        {row.status === "em_analise" && perm.canEditarOk && (perm.canEditar !== "proprios" || row.is_agente || (row.influencer_id && podeVerInfluencer(row.influencer_id))) && (
                          <BtnAcao onClick={() => setModalAnalisar(row)} color="#f59e0b">
                            <Clock size={12} aria-hidden />
                            Analisar
                          </BtnAcao>
                        )}
                        {row.status === "a_pagar" && perm.canEditarOk && (perm.canEditar !== "proprios" || row.is_agente || (row.influencer_id && podeVerInfluencer(row.influencer_id))) && (
                          <BtnAcao onClick={() => setModalPagar(row)} color="#22c55e">
                            <Banknote size={12} aria-hidden />
                            Pagar
                          </BtnAcao>
                        )}
                        {row.status === "pago" && (
                          <span style={{ fontSize: "11px", color: t.textMuted }}>
                            {row.pago_em ? new Date(row.pago_em).toLocaleDateString("pt-BR") : "—"}
                          </span>
                        )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
                );
              })}
            </tbody>

            {rowsOrdenados.length > 0 && (
              <tfoot>
                <tr style={{ background: dataTable.totalRowBgStrong, borderTop: `2px solid ${t.cardBorder}` }}>
                  <td style={{ ...dataTable.tdTotal, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: t.textMuted }}>
                    {isAberto ? "ESTIMATIVA TOTAL" : "TOTAL"}
                  </td>
                  <td style={dataTable.tdTotal} />
                  {filterOperadora === "todas" && <td style={dataTable.tdTotal} />}
                  {isAberto ? (
                    <>
                      <td style={dataTable.tdTotal} />
                      <td style={{ ...dataTable.tdTotal, ...(narrowMobile ? { display: "none" } : {}) }}>{fmtHorasTotal(rowsOrdenados.reduce((a, r) => a + r.horas_realizadas, 0))}</td>
                      <td style={{ ...dataTable.tdTotal, ...(narrowMobile ? { display: "none" } : {}) }} />
                      <td style={{ ...dataTable.tdTotal, fontSize: "15px", color: "var(--brand-primary, #7c3aed)" }}>{fmtBRL(rowsOrdenados.reduce((a, r) => a + r.total, 0))}</td>
                    </>
                  ) : (
                    <>
                      <td style={dataTable.tdTotal} />
                      <td style={dataTable.tdTotal}>{fmtHorasTotal(rowsOrdenados.filter(r => !r.is_agente).reduce((a, r) => a + r.horas_realizadas, 0))}</td>
                      <td style={{ ...dataTable.tdTotal, fontSize: "15px", color: "var(--brand-primary, #7c3aed)" }}>{fmtBRL(rowsOrdenados.reduce((a, r) => a + r.total, 0))}</td>
                      <td colSpan={2} style={dataTable.tdTotal} />
                    </>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Modais */}
      {modalAnalisar && ciclo && (
        <ModalAnalisar row={modalAnalisar} ciclo={ciclo} onClose={() => setModalAnalisar(null)} onConfirm={handleAprovar} />
      )}
      {modalPagar && (
        <ModalPagar row={modalPagar} onClose={() => setModalPagar(null)} onConfirm={handlePagar} onRetornar={handleRetornar} />
      )}
      {modalAgente && ciclo && podeVerPagamentosAgenteFinanceiro(user?.role) && (
        <ModalAgente
          cicloId={ciclo.id}
          filterOperadora={filterOperadora}
          operadorasList={operadorasList}
          podeVerOperadora={filtros.podeVerOperadora}
          onClose={() => setModalAgente(false)}
          onSalvo={async () => { setModalAgente(false); if (ciclo) await carregarDados(ciclo); }}
        />
      )}
    </div>
  );
}

// ── BLOCO 3: CONSOLIDADO ───────────────────────────────────────────────────────