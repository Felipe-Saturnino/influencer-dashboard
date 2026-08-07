import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import {
  getHojeIsoLocal,
  getPeriodoComparativoMesCompleto,
  getPeriodoHistoricoCompetencias,
  preencherDetalhamentoDiarioZerado,
} from "../../../lib/dashboardHelpers";
import { fetchEstudioIncidentesPorDataRodada } from "../../../lib/estudioIncidentesFetch";
import type { EstudioIncidenteRow } from "../../../lib/estudioIncidentesTypes";
import { fetchSmSinaisPeriodoOcr } from "../../../lib/smSinaisFetch";
import type { SmSinalRow } from "../../../lib/smSinaisTypes";
import { calcularKpisSinais, kpiMsParaComparativo } from "../../../lib/smSinaisHelpers";
import {
  agregarSmOcrPorDia,
  agregarSmOcrPorEstudio,
  agregarSmOcrPorJogo,
  agregarSmOcrPorPrestador,
  filtrarSinaisPorResolvers,
  filtrarTicketsPorRelatoresSm,
  type SmOcrMetricas,
} from "../../../lib/overviewPrestadorSmOcr";
import type { MesCarrosselEscalaEntry } from "../../../lib/escalaMesCarrosselOverviewStyle";

/** Fecha o período no dia civil de hoje (paridade com Incidentes → Sinais). Não usa D-1 do GP. */
function fimPeriodoAteHoje(fim: string): string {
  const hoje = getHojeIsoLocal();
  return fim > hoje ? hoje : fim;
}

async function carregarMapaRelatorSm(funcionarioIds: string[]): Promise<{
  profileIdPorFuncionario: Map<string, string>;
  funcionarioIdPorProfile: Map<string, string>;
  nomePorFuncionario: Map<string, string>;
  funcionarioIdPorNome: Map<string, string>;
  staffIdTosPorFuncionario: Map<string, string>;
  funcionarioIdPorTos: Map<string, string>;
}> {
  const profileIdPorFuncionario = new Map<string, string>();
  const funcionarioIdPorProfile = new Map<string, string>();
  const nomePorFuncionario = new Map<string, string>();
  const funcionarioIdPorNome = new Map<string, string>();
  const staffIdTosPorFuncionario = new Map<string, string>();
  const funcionarioIdPorTos = new Map<string, string>();
  const ids = [...new Set(funcionarioIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return {
      profileIdPorFuncionario,
      funcionarioIdPorProfile,
      nomePorFuncionario,
      funcionarioIdPorNome,
      staffIdTosPorFuncionario,
      funcionarioIdPorTos,
    };
  }

  const { data: funcs, error } = await supabase
    .from("rh_funcionarios")
    .select("id, nome, email, email_spin, staff_id_tos")
    .in("id", ids);
  if (error) {
    console.error("[Overview OCR] funcionarios:", error);
    return {
      profileIdPorFuncionario,
      funcionarioIdPorProfile,
      nomePorFuncionario,
      funcionarioIdPorNome,
      staffIdTosPorFuncionario,
      funcionarioIdPorTos,
    };
  }

  const emails = new Set<string>();
  for (const raw of funcs ?? []) {
    const row = raw as {
      id: string;
      nome: string;
      email: string | null;
      email_spin: string | null;
      staff_id_tos: string | null;
    };
    const fid = String(row.id);
    const nome = (row.nome ?? "").trim();
    if (nome) {
      nomePorFuncionario.set(fid, nome);
      funcionarioIdPorNome.set(nome.toLowerCase(), fid);
    }
    const tos = (row.staff_id_tos ?? "").trim().toLowerCase();
    if (tos) {
      staffIdTosPorFuncionario.set(fid, tos);
      funcionarioIdPorTos.set(tos, fid);
    }
    const e1 = (row.email ?? "").trim().toLowerCase();
    const e2 = (row.email_spin ?? "").trim().toLowerCase();
    if (e1) emails.add(e1);
    if (e2) emails.add(e2);
  }

  if (emails.size === 0) {
    return {
      profileIdPorFuncionario,
      funcionarioIdPorProfile,
      nomePorFuncionario,
      funcionarioIdPorNome,
      staffIdTosPorFuncionario,
      funcionarioIdPorTos,
    };
  }

  const { data: profiles, error: errP } = await supabase
    .from("profiles")
    .select("id, email")
    .in("email", [...emails]);
  if (errP) {
    console.error("[Overview OCR] profiles:", errP);
    return {
      profileIdPorFuncionario,
      funcionarioIdPorProfile,
      nomePorFuncionario,
      funcionarioIdPorNome,
      staffIdTosPorFuncionario,
      funcionarioIdPorTos,
    };
  }

  const profileByEmail = new Map<string, string>();
  for (const p of profiles ?? []) {
    const em = String((p as { email: string }).email ?? "")
      .trim()
      .toLowerCase();
    const pid = String((p as { id: string }).id ?? "");
    if (em && pid) profileByEmail.set(em, pid);
  }

  for (const raw of funcs ?? []) {
    const row = raw as { id: string; email: string | null; email_spin: string | null };
    const fid = String(row.id);
    const e1 = (row.email ?? "").trim().toLowerCase();
    const e2 = (row.email_spin ?? "").trim().toLowerCase();
    const pid = (e1 && profileByEmail.get(e1)) || (e2 && profileByEmail.get(e2)) || null;
    if (pid) {
      profileIdPorFuncionario.set(fid, pid);
      funcionarioIdPorProfile.set(pid, fid);
    }
  }

  return {
    profileIdPorFuncionario,
    funcionarioIdPorProfile,
    nomePorFuncionario,
    funcionarioIdPorNome,
    staffIdTosPorFuncionario,
    funcionarioIdPorTos,
  };
}

async function carregarCatalogoMesas(opts: {
  mesaIds: string[];
  tableIds: string[];
}): Promise<{
  nomesPorId: Record<string, string>;
  tipoJogoPorMesaId: Record<string, string>;
  tipoJogoPorTableId: Record<string, string>;
}> {
  const nomesPorId: Record<string, string> = {};
  const tipoJogoPorMesaId: Record<string, string> = {};
  const tipoJogoPorTableId: Record<string, string> = {};
  const ids = [...new Set(opts.mesaIds.map((x) => x.trim()).filter(Boolean))];
  const tableIds = [...new Set(opts.tableIds.map((x) => x.trim()).filter(Boolean))];

  const ingest = (rows: unknown[]) => {
    for (const raw of rows) {
      const row = raw as {
        id: string;
        nome_mesa: string | null;
        numero_mesa: string | null;
        tipo_jogo: string | null;
        mesa_identificacao: string | null;
      };
      const id = String(row.id);
      const nome = (row.nome_mesa ?? "").trim();
      const num = (row.numero_mesa ?? "").trim();
      const tipo = (row.tipo_jogo ?? "").trim();
      const ident = (row.mesa_identificacao ?? "").trim().toLowerCase();
      nomesPorId[id] = nome || (num ? `Mesa ${num}` : id);
      if (tipo) {
        tipoJogoPorMesaId[id] = tipo;
        if (ident) tipoJogoPorTableId[ident] = tipo;
      }
    }
  };

  const CHUNK = 150;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("mesas_spin_cadastro")
      .select("id, nome_mesa, numero_mesa, tipo_jogo, mesa_identificacao")
      .in("id", slice);
    if (error) {
      console.error("[Overview OCR] mesas por id:", error);
      continue;
    }
    ingest(data ?? []);
  }

  // table_id do Grafana costuma = mesa_identificacao; busca o que ainda falta
  const faltam = tableIds.filter((t) => !tipoJogoPorTableId[t.toLowerCase()]);
  for (let i = 0; i < faltam.length; i += CHUNK) {
    const slice = faltam.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("mesas_spin_cadastro")
      .select("id, nome_mesa, numero_mesa, tipo_jogo, mesa_identificacao")
      .in("mesa_identificacao", slice);
    if (error) {
      console.error("[Overview OCR] mesas por table_id:", error);
      continue;
    }
    ingest(data ?? []);
  }

  return { nomesPorId, tipoJogoPorMesaId, tipoJogoPorTableId };
}

export function useOverviewPrestadorSmOcr(opts: {
  enabled: boolean;
  funcionarioIds: string[];
  prestadores: { id: string; nome: string }[];
  mesSelecionado: MesCarrosselEscalaEntry | undefined;
  historico: boolean;
}) {
  const { enabled, funcionarioIds, prestadores, mesSelecionado, historico } = opts;
  const [sinaisAtual, setSinaisAtual] = useState<SmSinalRow[]>([]);
  const [sinaisAnt, setSinaisAnt] = useState<SmSinalRow[]>([]);
  const [ticketsAtual, setTicketsAtual] = useState<EstudioIncidenteRow[]>([]);
  const [ticketsAnt, setTicketsAnt] = useState<EstudioIncidenteRow[]>([]);
  const [estudiosNome, setEstudiosNome] = useState<Record<string, string>>({});
  const [mesaNomes, setMesaNomes] = useState<Record<string, string>>({});
  const [tipoJogoPorMesaId, setTipoJogoPorMesaId] = useState<Record<string, string>>({});
  const [tipoJogoPorTableId, setTipoJogoPorTableId] = useState<Record<string, string>>({});
  const [profileIdPorFuncionario, setProfileIdPorFuncionario] = useState(() => new Map<string, string>());
  const [funcionarioIdPorProfile, setFuncionarioIdPorProfile] = useState(() => new Map<string, string>());
  const [nomePorFuncionario, setNomePorFuncionario] = useState(() => new Map<string, string>());
  const [funcionarioIdPorNome, setFuncionarioIdPorNome] = useState(() => new Map<string, string>());
  const [staffIdTosPorFuncionario, setStaffIdTosPorFuncionario] = useState(() => new Map<string, string>());
  const [funcionarioIdPorTos, setFuncionarioIdPorTos] = useState(() => new Map<string, string>());
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const idsKey = funcionarioIds.slice().sort().join("|");

  useEffect(() => {
    if (!enabled || funcionarioIds.length === 0 || (!historico && !mesSelecionado)) {
      setSinaisAtual([]);
      setSinaisAnt([]);
      setTicketsAtual([]);
      setTicketsAnt([]);
      setLoading(false);
      setErro(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErro(null);

    void (async () => {
      try {
        const [mapa, estudios] = await Promise.all([
          carregarMapaRelatorSm(funcionarioIds),
          supabase.from("estudios_spin").select("slug, nome").eq("ativo", true),
        ]);
        if (cancelled) return;
        setProfileIdPorFuncionario(mapa.profileIdPorFuncionario);
        setFuncionarioIdPorProfile(mapa.funcionarioIdPorProfile);
        setNomePorFuncionario(mapa.nomePorFuncionario);
        setFuncionarioIdPorNome(mapa.funcionarioIdPorNome);
        setStaffIdTosPorFuncionario(mapa.staffIdTosPorFuncionario);
        setFuncionarioIdPorTos(mapa.funcionarioIdPorTos);
        const nomes: Record<string, string> = {};
        for (const e of estudios.data ?? []) {
          const slug = String((e as { slug: string }).slug ?? "").trim();
          if (slug) nomes[slug] = String((e as { nome: string }).nome ?? slug);
        }
        setEstudiosNome(nomes);

        const fetchPar = async (ini: string, fim: string) => {
          const fimCap = fimPeriodoAteHoje(fim);
          if (fimCap < ini) {
            return { sinais: [] as SmSinalRow[], tickets: [] as EstudioIncidenteRow[] };
          }
          const [sinaisAll, ticketsAll] = await Promise.all([
            fetchSmSinaisPeriodoOcr({ dataIni: ini, dataFim: fimCap }),
            fetchEstudioIncidentesPorDataRodada({ dataIni: ini, dataFim: fimCap }),
          ]);
          return { sinais: sinaisAll, tickets: ticketsAll };
        };

        if (historico) {
          const { inicio, fim } = getPeriodoHistoricoCompetencias();
          const { sinais, tickets } = await fetchPar(inicio, fim);
          if (cancelled) return;
          setSinaisAtual(sinais);
          setSinaisAnt([]);
          setTicketsAtual(tickets);
          setTicketsAnt([]);
          const cat = await carregarCatalogoMesas({
            mesaIds: [
              ...sinais.map((s) => s.mesa_id ?? ""),
              ...tickets.map((t) => t.mesa_id ?? ""),
            ],
            tableIds: sinais.map((s) => s.table_id ?? ""),
          });
          setMesaNomes(cat.nomesPorId);
          setTipoJogoPorMesaId(cat.tipoJogoPorMesaId);
          setTipoJogoPorTableId(cat.tipoJogoPorTableId);
        } else if (mesSelecionado) {
          const mom = getPeriodoComparativoMesCompleto(mesSelecionado.ano, mesSelecionado.mes);
          const [atual, ant] = await Promise.all([
            fetchPar(mom.atual.inicio, mom.atual.fim),
            fetchPar(mom.anterior.inicio, mom.anterior.fim),
          ]);
          if (cancelled) return;
          setSinaisAtual(atual.sinais);
          setSinaisAnt(ant.sinais);
          setTicketsAtual(atual.tickets);
          setTicketsAnt(ant.tickets);
          const cat = await carregarCatalogoMesas({
            mesaIds: [
              ...atual.sinais.map((s) => s.mesa_id ?? ""),
              ...atual.tickets.map((t) => t.mesa_id ?? ""),
              ...ant.sinais.map((s) => s.mesa_id ?? ""),
              ...ant.tickets.map((t) => t.mesa_id ?? ""),
            ],
            tableIds: [
              ...atual.sinais.map((s) => s.table_id ?? ""),
              ...ant.sinais.map((s) => s.table_id ?? ""),
            ],
          });
          setMesaNomes(cat.nomesPorId);
          setTipoJogoPorMesaId(cat.tipoJogoPorMesaId);
          setTipoJogoPorTableId(cat.tipoJogoPorTableId);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setSinaisAtual([]);
          setSinaisAnt([]);
          setTicketsAtual([]);
          setTicketsAnt([]);
          setErro(
            "Não foi possível carregar os KPIs de OCR. Se o problema persistir, entre em contato com o suporte.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey
  }, [enabled, idsKey, mesSelecionado, historico]);

  const sinaisEscopo = useMemo(
    () => filtrarSinaisPorResolvers(sinaisAtual, funcionarioIds, staffIdTosPorFuncionario),
    [sinaisAtual, funcionarioIds, staffIdTosPorFuncionario],
  );
  const sinaisEscopoAnt = useMemo(
    () => filtrarSinaisPorResolvers(sinaisAnt, funcionarioIds, staffIdTosPorFuncionario),
    [sinaisAnt, funcionarioIds, staffIdTosPorFuncionario],
  );

  const ticketsEscopo = useMemo(
    () =>
      filtrarTicketsPorRelatoresSm(
        ticketsAtual,
        funcionarioIds,
        profileIdPorFuncionario,
        nomePorFuncionario,
      ),
    [ticketsAtual, funcionarioIds, profileIdPorFuncionario, nomePorFuncionario],
  );
  const ticketsEscopoAnt = useMemo(
    () =>
      filtrarTicketsPorRelatoresSm(
        ticketsAnt,
        funcionarioIds,
        profileIdPorFuncionario,
        nomePorFuncionario,
      ),
    [ticketsAnt, funcionarioIds, profileIdPorFuncionario, nomePorFuncionario],
  );

  const kpisAtual: SmOcrMetricas = useMemo(() => {
    const k = calcularKpisSinais(sinaisEscopo);
    return { ...k, tickets: ticketsEscopo.length };
  }, [sinaisEscopo, ticketsEscopo]);

  const kpisAnterior: SmOcrMetricas = useMemo(() => {
    const k = calcularKpisSinais(sinaisEscopoAnt);
    return { ...k, tickets: ticketsEscopoAnt.length };
  }, [sinaisEscopoAnt, ticketsEscopoAnt]);

  const porJogo = useMemo(
    () => agregarSmOcrPorJogo(sinaisEscopo, ticketsEscopo, tipoJogoPorMesaId, tipoJogoPorTableId),
    [sinaisEscopo, ticketsEscopo, tipoJogoPorMesaId, tipoJogoPorTableId],
  );
  const porEstudio = useMemo(
    () => agregarSmOcrPorEstudio(sinaisEscopo, ticketsEscopo, estudiosNome, mesaNomes),
    [sinaisEscopo, ticketsEscopo, estudiosNome, mesaNomes],
  );
  const porPrestador = useMemo(
    () =>
      agregarSmOcrPorPrestador(
        sinaisEscopo,
        ticketsEscopo,
        prestadores,
        funcionarioIdPorProfile,
        funcionarioIdPorNome,
        funcionarioIdPorTos,
      ),
    [
      sinaisEscopo,
      ticketsEscopo,
      prestadores,
      funcionarioIdPorProfile,
      funcionarioIdPorNome,
      funcionarioIdPorTos,
    ],
  );
  const periodoGradeDiaria = useMemo(() => {
    if (historico) {
      const { inicio, fim } = getPeriodoHistoricoCompetencias();
      return { inicio, fim: fimPeriodoAteHoje(fim) };
    }
    if (!mesSelecionado) return null;
    const mom = getPeriodoComparativoMesCompleto(mesSelecionado.ano, mesSelecionado.mes);
    return { inicio: mom.atual.inicio, fim: fimPeriodoAteHoje(mom.atual.fim) };
  }, [historico, mesSelecionado]);

  const porDia = useMemo(() => {
    const base = agregarSmOcrPorDia(sinaisEscopo, ticketsEscopo);
    if (!periodoGradeDiaria) return base;
    return preencherDetalhamentoDiarioZerado({
      rows: base,
      getDia: (r) => r.dia,
      inicio: periodoGradeDiaria.inicio,
      fim: periodoGradeDiaria.fim,
      fimMax: getHojeIsoLocal(),
      criarVazio: (dia) => ({
        dia,
        total: 0,
        tmaTotalMs: null,
        tmaAtendimentoMs: null,
        tmaResolucaoMs: null,
        tickets: 0,
      }),
    });
  }, [sinaisEscopo, ticketsEscopo, periodoGradeDiaria]);

  return {
    loading,
    erro,
    kpisAtual,
    kpisAnterior,
    porJogo,
    porEstudio,
    porPrestador,
    porDia,
    kpiMsParaComparativo,
  };
}
