import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { fetchInBatched } from "../../../../lib/supabasePaginate";
import { isPerfilIncompleto } from "../../../../lib/influencerPerfilCompleto";
import {
  buscarHorasRealizadasCiclo,
  horasPendentesCota,
} from "../../../../lib/influencerHorasCota";
import type { Live, Plataforma } from "../../../../types";
import type { HomeInfluencerPerfilRow } from "./useHomeInfluencerData";

const LIVE_HOME_COLS =
  "id, influencer_id, data, horario, plataforma, titulo, observacao, status, created_by";
const CHUNK = 80;

function dataLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLiveLocal(data: string, horario: string): Date {
  const [y, mo, d] = data.split("-").map((x) => parseInt(x, 10));
  const parts = (horario || "00:00").split(":");
  const hh = parseInt(parts[0] ?? "0", 10) || 0;
  const mm = parseInt(parts[1] ?? "0", 10) || 0;
  const ss = parseInt(parts[2] ?? "0", 10) || 0;
  return new Date(y, mo - 1, d, hh, mm, ss);
}

export type HomeAgenciaLiveFutura = Live & { influencer_name: string };

export type UseHomeAgenciaDataResult = {
  ready: boolean;
  cadastrosIncompletosCount: number;
  cadastrosIncompletosNomes: string[];
  horasPendentesCount: number;
  horasPendentesTotal: number;
  horasPendentesNomes: string[];
  livesFuturas: HomeAgenciaLiveFutura[];
};

/**
 * Dados de portfólio da Home Agência — cadastros incompletos, horas pendentes
 * sem live futura, e próximas lives do escopo.
 */
export function useHomeAgenciaData(influencerIds: string[]): UseHomeAgenciaDataResult {
  const idsKey = influencerIds.slice().sort().join("|");
  const [ready, setReady] = useState(false);
  const [cadastrosIncompletosCount, setCadastrosIncompletosCount] = useState(0);
  const [cadastrosIncompletosNomes, setCadastrosIncompletosNomes] = useState<string[]>([]);
  const [horasPendentesCount, setHorasPendentesCount] = useState(0);
  const [horasPendentesTotal, setHorasPendentesTotal] = useState(0);
  const [horasPendentesNomes, setHorasPendentesNomes] = useState<string[]>([]);
  const [livesFuturas, setLivesFuturas] = useState<HomeAgenciaLiveFutura[]>([]);

  useEffect(() => {
    const ids = idsKey ? idsKey.split("|").filter(Boolean) : [];
    if (ids.length === 0) {
      setReady(true);
      setCadastrosIncompletosCount(0);
      setCadastrosIncompletosNomes([]);
      setHorasPendentesCount(0);
      setHorasPendentesTotal(0);
      setHorasPendentesNomes([]);
      setLivesFuturas([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      setReady(false);
      const hojeIso = dataLocalIso(new Date());
      const now = new Date();

      try {
        const [perfis, livesAg] = await Promise.all([
          fetchInBatched(ids, CHUNK, async (chunk) => {
            const { data, error } = await supabase
              .from("influencer_perfil")
              .select(
                "id, nome_artistico, nome_completo, telefone, cpf, cache_hora, chave_pix, banco, agencia, conta, status, horas_acordadas, horas_ciclo_iniciado_em",
              )
              .in("id", chunk);
            if (error) throw error;
            return (data ?? []) as (HomeInfluencerPerfilRow & { id: string })[];
          }),
          fetchInBatched(ids, CHUNK, async (chunk) => {
            const { data, error } = await supabase
              .from("lives")
              .select(LIVE_HOME_COLS)
              .in("influencer_id", chunk)
              .eq("status", "agendada")
              .gte("data", hojeIso)
              .order("data", { ascending: true })
              .order("horario", { ascending: true });
            if (error) throw error;
            return (data ?? []) as Live[];
          }),
        ]);

        if (cancelled) return;

        const nomePorId = new Map<string, string>();
        let incompletos = 0;
        const nomesIncompletos: string[] = [];
        const comCota: { id: string; acordadas: number; ciclo: string; artistico: string }[] = [];

        for (const p of perfis) {
          const artistico = (p.nome_artistico ?? "").trim();
          const nome =
            artistico || p.nome_completo?.trim() || "Influencer";
          nomePorId.set(p.id, nome);
          const status = (p.status ?? "ativo").toLowerCase();
          if (status === "ativo" && isPerfilIncompleto(p, nome)) {
            incompletos += 1;
            if (artistico) nomesIncompletos.push(artistico);
          }
          const acordadas = p.horas_acordadas;
          const ciclo = p.horas_ciclo_iniciado_em;
          if (status === "ativo" && acordadas != null && acordadas > 0 && ciclo) {
            comCota.push({ id: p.id, acordadas, ciclo, artistico });
          }
        }

        const agendadasFuturas = livesAg.filter(
          (l) => parseLiveLocal(l.data, l.horario).getTime() > now.getTime(),
        );
        const idsComLiveFutura = new Set(agendadasFuturas.map((l) => l.influencer_id));

        let countHoras = 0;
        let totalHoras = 0;
        const nomesHoras: string[] = [];
        const horasResults = await Promise.all(
          comCota.map(async (c) => {
            try {
              const realizadas = await buscarHorasRealizadasCiclo(c.id, c.ciclo);
              const pend = horasPendentesCota(c.acordadas, realizadas);
              return { id: c.id, pend, artistico: c.artistico };
            } catch (err) {
              console.error("useHomeAgenciaData horas:", err);
              return { id: c.id, pend: null as number | null, artistico: c.artistico };
            }
          }),
        );
        for (const h of horasResults) {
          if (h.pend != null && h.pend > 0 && !idsComLiveFutura.has(h.id)) {
            countHoras += 1;
            totalHoras += h.pend;
            if (h.artistico) nomesHoras.push(h.artistico);
          }
        }

        const sortNomes = (xs: string[]) =>
          [...xs]
            .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }))
            .slice(0, 5);

        const livesOrdenadas = [...agendadasFuturas]
          .sort((a, b) => {
            const ta = parseLiveLocal(a.data, a.horario).getTime();
            const tb = parseLiveLocal(b.data, b.horario).getTime();
            return ta - tb;
          })
          .slice(0, 6)
          .map((l) => ({
            ...l,
            plataforma: l.plataforma as Plataforma,
            influencer_name: nomePorId.get(l.influencer_id) ?? "Influencer",
          }));

        if (!cancelled) {
          setCadastrosIncompletosCount(incompletos);
          setCadastrosIncompletosNomes(sortNomes(nomesIncompletos));
          setHorasPendentesCount(countHoras);
          setHorasPendentesTotal(totalHoras);
          setHorasPendentesNomes(sortNomes(nomesHoras));
          setLivesFuturas(livesOrdenadas);
          setReady(true);
        }
      } catch (e) {
        console.error("useHomeAgenciaData:", e);
        if (!cancelled) {
          setCadastrosIncompletosCount(0);
          setCadastrosIncompletosNomes([]);
          setHorasPendentesCount(0);
          setHorasPendentesTotal(0);
          setHorasPendentesNomes([]);
          setLivesFuturas([]);
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return {
    ready,
    cadastrosIncompletosCount,
    cadastrosIncompletosNomes,
    horasPendentesCount,
    horasPendentesTotal,
    horasPendentesNomes,
    livesFuturas,
  };
}
