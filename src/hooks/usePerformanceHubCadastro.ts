import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { fetchAllPages } from "../lib/supabasePaginate";
import { buildOperadoraParaEstudioMap } from "../pages/rh/GestaoStaff/gestaoStaffEstudioHelpers";
import { fetchEstudiosSpinRows, fetchMesasSpinCadastroRows } from "../pages/plataforma/GestaoMesas/gestaoMesasFetch";
import type { RhFuncionario } from "../types/rhFuncionario";
import type {
  PerformanceHubDadosPrefill,
  PerformanceHubEstudioCadastro,
  PerformanceHubMesaCadastro,
  RhFuncionarioPerformanceHubCadastro,
} from "../lib/academyPerformanceHubCadastroPrefill";
import type { PerformanceHubStaffOption, PerformanceHubTimeSlug } from "../lib/academyPerformanceHubTypes";
import type { PerformanceHubStaffAgendaFonte } from "../lib/academyPerformanceHubAgenda";
import { mapStaffRhParaAgendaFonte } from "../lib/academyPerformanceHubAgenda";
import {
  mapRhFuncionarioParaPerformanceHubDados,
  mapTurnoRhParaPerformanceHub,
} from "../lib/academyPerformanceHubCadastroPrefill";
import {
  agruparTimeIdsPorSlugPerformanceHub,
  slugTimePerformanceHubDeId,
  type PerformanceHubOrgTimeRow,
} from "../lib/academyPerformanceHubStaffTimes";

type StaffTimeRow = PerformanceHubOrgTimeRow;

function normalizarNomeStaff(nome: string): string {
  return nome.trim().toLowerCase();
}

function turnoLabelStaff(row: Pick<RhFuncionario, "escala" | "staff_turno">): string {
  return mapTurnoRhParaPerformanceHub(row) ?? "—";
}

export function usePerformanceHubCadastro() {
  const [loading, setLoading] = useState(true);
  const [estudios, setEstudios] = useState<PerformanceHubEstudioCadastro[]>([]);
  const [mesas, setMesas] = useState<PerformanceHubMesaCadastro[]>([]);
  const [staffPorTime, setStaffPorTime] = useState<Record<PerformanceHubTimeSlug, PerformanceHubStaffOption[]>>({
    game_presenter: [],
    shuffler: [],
  });
  const [prefillPorStaffId, setPrefillPorStaffId] = useState<Record<string, PerformanceHubDadosPrefill>>({});
  const [prefillPorNome, setPrefillPorNome] = useState<Record<string, PerformanceHubDadosPrefill>>({});
  const [staffIdPorNome, setStaffIdPorNome] = useState<Record<string, string>>({});
  const [staffAgendaPorTime, setStaffAgendaPorTime] = useState<
    Record<PerformanceHubTimeSlug, PerformanceHubStaffAgendaFonte[]>
  >({
    game_presenter: [],
    shuffler: [],
  });

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setLoading(true);

      const [timesRes, timesOrgRes, estudiosRows, mesasRows] = await Promise.all([
        supabase.rpc("rh_staff_times_filtrados"),
        supabase.from("rh_org_times").select("id, nome").eq("status", "ativo"),
        fetchEstudiosSpinRows(),
        fetchMesasSpinCadastroRows(),
      ]);

      if (cancelado) return;

      const junctionFlat: { operadora_slug: string; estudio_slug: string; tipo: string }[] = [];
      const estudiosAtivos: PerformanceHubEstudioCadastro[] = estudiosRows.map((e) => {
        const joins = e.estudios_spin_operadoras;
        const list = joins == null ? [] : Array.isArray(joins) ? joins : [joins];
        for (const j of list) {
          junctionFlat.push({
            operadora_slug: j.operadora_slug,
            estudio_slug: e.slug,
            tipo: e.tipo,
          });
        }
        return { slug: e.slug, nome: e.nome };
      });

      const opParaEstudio = buildOperadoraParaEstudioMap(junctionFlat);
      const mesasCatalogo: PerformanceHubMesaCadastro[] = mesasRows.map((m) => ({
        estudio_slug: m.estudio_slug,
        operadora_slug: m.operadora_slug ?? null,
        tipo_jogo: m.tipo_jogo ?? "",
        nome_mesa: m.nome_mesa ?? "",
        mesa_identificacao: m.mesa_identificacao ?? "",
      }));

      if (timesRes.error) {
        console.error("Performance Hub: falha ao carregar times (RPC)", timesRes.error);
      }
      if (timesOrgRes.error) {
        console.error("Performance Hub: falha ao carregar times (organograma)", timesOrgRes.error);
      }

      const timesPorId = new Map<string, StaffTimeRow>();
      for (const row of [...((timesRes.data ?? []) as StaffTimeRow[]), ...((timesOrgRes.data ?? []) as StaffTimeRow[])]) {
        const id = row.id?.trim();
        if (!id) continue;
        timesPorId.set(id, { id, nome: row.nome ?? "" });
      }
      const idsPorSlug = agruparTimeIdsPorSlugPerformanceHub([...timesPorId.values()]);
      const timeIds = [...idsPorSlug.game_presenter, ...idsPorSlug.shuffler];
      let funcionarios: RhFuncionarioPerformanceHubCadastro[] = [];

      if (timeIds.length > 0) {
        try {
          funcionarios = await fetchAllPages<RhFuncionarioPerformanceHubCadastro>(async (from, to) => {
            const { data, error } = await supabase
              .from("rh_funcionarios")
              .select(
                "id, nome, status, escala, staff_turno, staff_estudio_slug, staff_estudio_slugs, staff_operadora_slug, staff_skills, org_time_id, staff_live_no_estudio, data_inicio",
              )
              .in("org_time_id", timeIds)
              .in("status", ["ativo", "indisponivel"])
              .order("nome", { ascending: true })
              .range(from, to);
            return { data: (data ?? null) as RhFuncionarioPerformanceHubCadastro[] | null, error };
          });
        } catch (error) {
          console.error("Performance Hub: falha ao carregar prestadores", error);
        }
      }

      if (cancelado) return;

      const nextStaff: Record<PerformanceHubTimeSlug, PerformanceHubStaffOption[]> = {
        game_presenter: [],
        shuffler: [],
      };
      const nextStaffAgenda: Record<PerformanceHubTimeSlug, PerformanceHubStaffAgendaFonte[]> = {
        game_presenter: [],
        shuffler: [],
      };
      const nextPrefillId: Record<string, PerformanceHubDadosPrefill> = {};
      const nextPrefillNome: Record<string, PerformanceHubDadosPrefill> = {};
      const nextStaffIdNome: Record<string, string> = {};

      for (const row of funcionarios) {
        const timeSlug = slugTimePerformanceHubDeId(row.org_time_id, idsPorSlug);
        if (!timeSlug) continue;

        const turno = turnoLabelStaff(row);
        nextStaff[timeSlug].push({
          value: row.id,
          label: row.nome,
          turno,
        });
        nextStaffAgenda[timeSlug].push(
          mapStaffRhParaAgendaFonte({ ...row, turno }, timeSlug),
        );

        const prefill = mapRhFuncionarioParaPerformanceHubDados(row, opParaEstudio, mesasCatalogo);
        nextPrefillId[row.id] = prefill;
        nextPrefillNome[normalizarNomeStaff(row.nome)] = prefill;
        nextStaffIdNome[normalizarNomeStaff(row.nome)] = row.id;
      }

      for (const slug of Object.keys(nextStaff) as PerformanceHubTimeSlug[]) {
        nextStaff[slug].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
        nextStaffAgenda[slug].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      }

      setEstudios(estudiosAtivos);
      setMesas(mesasCatalogo);
      setStaffPorTime(nextStaff);
      setStaffAgendaPorTime(nextStaffAgenda);
      setPrefillPorStaffId(nextPrefillId);
      setPrefillPorNome(nextPrefillNome);
      setStaffIdPorNome(nextStaffIdNome);
      setLoading(false);
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  const getPrefill = useCallback(
    (staffId?: string | null, nome?: string | null): PerformanceHubDadosPrefill | null => {
      if (staffId && prefillPorStaffId[staffId]) return prefillPorStaffId[staffId]!;
      if (nome) {
        const key = normalizarNomeStaff(nome);
        return prefillPorNome[key] ?? null;
      }
      return null;
    },
    [prefillPorNome, prefillPorStaffId],
  );

  const resolveStaffId = useCallback(
    (nome: string): string | undefined => staffIdPorNome[normalizarNomeStaff(nome)],
    [staffIdPorNome],
  );

  const staffOptionsPorTime = useCallback(
    (time: PerformanceHubTimeSlug) => staffPorTime[time] ?? [],
    [staffPorTime],
  );

  const staffAgendaPorTimeFn = useCallback(
    (time: PerformanceHubTimeSlug) => staffAgendaPorTime[time] ?? [],
    [staffAgendaPorTime],
  );

  return useMemo(
    () => ({
      loading,
      estudios,
      mesas,
      staffPorTime,
      staffAgendaPorTime,
      getPrefill,
      resolveStaffId,
      staffOptionsPorTime,
      staffAgendaPorTimeFn,
    }),
    [
      estudios,
      getPrefill,
      loading,
      mesas,
      resolveStaffId,
      staffAgendaPorTime,
      staffAgendaPorTimeFn,
      staffOptionsPorTime,
      staffPorTime,
    ],
  );
}
