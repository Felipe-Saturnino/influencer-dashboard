import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import {
  getOntemIsoLocal,
  getPeriodoComparativoMesCompleto,
  getPeriodoHistoricoCompetencias,
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

function fimPeriodoD1(fim: string): string {
  const ontem = getOntemIsoLocal();
  return fim > ontem ? ontem : fim;
}

async function carregarMapaRelatorSm(funcionarioIds: string[]): Promise<{
  profileIdPorFuncionario: Map<string, string>;
  funcionarioIdPorProfile: Map<string, string>;
  nomePorFuncionario: Map<string, string>;
  funcionarioIdPorNome: Map<string, string>;
}> {
  const profileIdPorFuncionario = new Map<string, string>();
  const funcionarioIdPorProfile = new Map<string, string>();
  const nomePorFuncionario = new Map<string, string>();
  const funcionarioIdPorNome = new Map<string, string>();
  const ids = [...new Set(funcionarioIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { profileIdPorFuncionario, funcionarioIdPorProfile, nomePorFuncionario, funcionarioIdPorNome };
  }

  const { data: funcs, error } = await supabase
    .from("rh_funcionarios")
    .select("id, nome, email, email_spin")
    .in("id", ids);
  if (error) {
    console.error("[Overview OCR] funcionarios:", error);
    return { profileIdPorFuncionario, funcionarioIdPorProfile, nomePorFuncionario, funcionarioIdPorNome };
  }

  const emails = new Set<string>();
  for (const raw of funcs ?? []) {
    const row = raw as { id: string; nome: string; email: string | null; email_spin: string | null };
    const fid = String(row.id);
    const nome = (row.nome ?? "").trim();
    if (nome) {
      nomePorFuncionario.set(fid, nome);
      funcionarioIdPorNome.set(nome.toLowerCase(), fid);
    }
    const e1 = (row.email ?? "").trim().toLowerCase();
    const e2 = (row.email_spin ?? "").trim().toLowerCase();
    if (e1) emails.add(e1);
    if (e2) emails.add(e2);
  }

  if (emails.size === 0) {
    return { profileIdPorFuncionario, funcionarioIdPorProfile, nomePorFuncionario, funcionarioIdPorNome };
  }

  const { data: profiles, error: errP } = await supabase
    .from("profiles")
    .select("id, email")
    .in("email", [...emails]);
  if (errP) {
    console.error("[Overview OCR] profiles:", errP);
    return { profileIdPorFuncionario, funcionarioIdPorProfile, nomePorFuncionario, funcionarioIdPorNome };
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

  return { profileIdPorFuncionario, funcionarioIdPorProfile, nomePorFuncionario, funcionarioIdPorNome };
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
  const [profileIdPorFuncionario, setProfileIdPorFuncionario] = useState(() => new Map<string, string>());
  const [funcionarioIdPorProfile, setFuncionarioIdPorProfile] = useState(() => new Map<string, string>());
  const [nomePorFuncionario, setNomePorFuncionario] = useState(() => new Map<string, string>());
  const [funcionarioIdPorNome, setFuncionarioIdPorNome] = useState(() => new Map<string, string>());
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
        const nomes: Record<string, string> = {};
        for (const e of estudios.data ?? []) {
          const slug = String((e as { slug: string }).slug ?? "").trim();
          if (slug) nomes[slug] = String((e as { nome: string }).nome ?? slug);
        }
        setEstudiosNome(nomes);

        const fetchPar = async (ini: string, fim: string) => {
          const fimD1 = fimPeriodoD1(fim);
          if (fimD1 < ini) {
            return { sinais: [] as SmSinalRow[], tickets: [] as EstudioIncidenteRow[] };
          }
          const [sinaisAll, ticketsAll] = await Promise.all([
            fetchSmSinaisPeriodoOcr({ dataIni: ini, dataFim: fimD1 }),
            fetchEstudioIncidentesPorDataRodada({ dataIni: ini, dataFim: fimD1 }),
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
    () => filtrarSinaisPorResolvers(sinaisAtual, funcionarioIds),
    [sinaisAtual, funcionarioIds],
  );
  const sinaisEscopoAnt = useMemo(
    () => filtrarSinaisPorResolvers(sinaisAnt, funcionarioIds),
    [sinaisAnt, funcionarioIds],
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
    () => agregarSmOcrPorJogo(sinaisEscopo, ticketsEscopo),
    [sinaisEscopo, ticketsEscopo],
  );
  const porEstudio = useMemo(
    () => agregarSmOcrPorEstudio(sinaisEscopo, ticketsEscopo, estudiosNome),
    [sinaisEscopo, ticketsEscopo, estudiosNome],
  );
  const porPrestador = useMemo(
    () =>
      agregarSmOcrPorPrestador(
        sinaisEscopo,
        ticketsEscopo,
        prestadores,
        funcionarioIdPorProfile,
        funcionarioIdPorNome,
      ),
    [sinaisEscopo, ticketsEscopo, prestadores, funcionarioIdPorProfile, funcionarioIdPorNome],
  );
  const porDia = useMemo(
    () => agregarSmOcrPorDia(sinaisEscopo, ticketsEscopo),
    [sinaisEscopo, ticketsEscopo],
  );

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
