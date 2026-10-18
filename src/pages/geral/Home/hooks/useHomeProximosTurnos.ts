import { useEffect, useState } from "react";
import { useIdentidadeEfetiva } from "../../../../hooks/useIdentidadeEfetiva";
import { hojeIsoBrasil } from "../../../../lib/dateBrasil";
import { MESES_PT } from "../../../../lib/dashboardConstants";
import {
  diaIsoChaveGrade,
  refMesPrimeiroDiaISO,
  situacaoGestaoEscalaParaDia,
  turnoExibicaoDeValorCelulaEscala,
} from "../../../../lib/overviewPrestadorCalendarioHelpers";
import { situacaoEhCompraMarketplace } from "../../../../lib/overviewPrestadorMovimentacoes";
import { situacaoPresencaComoEscalado } from "../../../../lib/rhCalendarioPresencaGestao";
import { buscarRhFuncionarioAtivoPorEmailLoginCached } from "../../../../lib/rhFuncionarioLoginMatch";
import { carregarRhCalendarioGradeMes } from "../../../../lib/rhCalendarioGradeMes";
import { supabase } from "../../../../lib/supabase";

export type HomeProximoTurno = {
  diaIso: string;
  turnoLabel: string;
  horarioLabel: string;
  estudioLabel: string;
  areaLabel: string;
  viaMarketplace: boolean;
};

export type HomeProximosTurnosState = {
  loading: boolean;
  turnos: HomeProximoTurno[];
};

const MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function fmtDiaMesTurnoHome(diaIso: string): { dia: string; mesCurto: string; dataCurta: string } {
  const [, m, d] = diaIso.split("-").map(Number);
  const mesIdx = (m ?? 1) - 1;
  return {
    dia: pad2(d ?? 1),
    mesCurto: MESES_CURTO[mesIdx] ?? "",
    dataCurta: `${pad2(d ?? 1)}/${pad2(m ?? 1)}`,
  };
}

export function labelTurnoHome(turno: string): string {
  const t = turno.trim();
  if (!t) return "Turno";
  if (t === "Manhã" || t === "Tarde" || t === "Noite" || t === "Comercial") return `Turno ${t}`;
  return t.startsWith("Turno ") ? t : `Turno ${t}`;
}

/**
 * Até 3 próximos turnos próprios (hoje em diante) a partir da grade do Calendário.
 */
export function useHomeProximosTurnos(): HomeProximosTurnosState {
  const { email: emailEfetivo } = useIdentidadeEfetiva();
  const [loading, setLoading] = useState(true);
  const [turnos, setTurnos] = useState<HomeProximoTurno[]>([]);

  useEffect(() => {
    const email = emailEfetivo?.trim();
    if (!email) {
      setLoading(false);
      setTurnos([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const prestador = await buscarRhFuncionarioAtivoPorEmailLoginCached(email);
        if (cancelled) return;
        if (!prestador?.id) {
          setTurnos([]);
          return;
        }

        const hoje = hojeIsoBrasil();
        const agora = new Date();
        const refAtual = refMesPrimeiroDiaISO(agora);
        const prox = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
        const refProx = refMesPrimeiroDiaISO(prox);

        const ids = [prestador.id];
        const [gradeAtualRes, gradeProxRes, timeRow, estudioRows] = await Promise.all([
          carregarRhCalendarioGradeMes(refAtual, ids),
          carregarRhCalendarioGradeMes(refProx, ids),
          prestador.org_time_id
            ? supabase
                .from("rh_org_times")
                .select("nome")
                .eq("id", prestador.org_time_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from("estudios_spin").select("slug, nome").eq("ativo", true),
        ]);
        if (cancelled) return;

        const areaLabel = String((timeRow.data as { nome?: string } | null)?.nome ?? "").trim() || "Estúdio";
        const nomePorSlug = new Map<string, string>();
        for (const raw of estudioRows.data ?? []) {
          const r = raw as { slug: string; nome: string };
          nomePorSlug.set(r.slug, r.nome);
        }
        const slugs = (prestador.staff_estudio_slugs ?? []).map((s) => s.trim()).filter(Boolean);
        let estudioLabel = "Escala";
        if (slugs.includes("todos") || slugs.length === 0) {
          estudioLabel = "Todos Estúdios";
        } else if (slugs.length === 1) {
          estudioLabel = nomePorSlug.get(slugs[0]!) ?? slugs[0]!;
        } else {
          estudioLabel = slugs.map((s) => nomePorSlug.get(s) ?? s).join(", ");
        }

        const grade = [...(gradeAtualRes.rows ?? []), ...(gradeProxRes.rows ?? [])];
        const candidatos: HomeProximoTurno[] = [];
        const visto = new Set<string>();

        for (const r of grade) {
          const iso = diaIsoChaveGrade(r);
          if (!iso || iso < hoje) continue;
          const situacao = situacaoGestaoEscalaParaDia(r.valor);
          if (!situacaoPresencaComoEscalado(situacao) && situacao !== "Troca") continue;
          const turnoNome = turnoExibicaoDeValorCelulaEscala(r.valor ?? "");
          if (!turnoNome) continue;
          const key = `${iso}|${turnoNome}`;
          if (visto.has(key)) continue;
          visto.add(key);

          candidatos.push({
            diaIso: iso,
            turnoLabel: labelTurnoHome(turnoNome),
            horarioLabel: "—",
            estudioLabel,
            areaLabel,
            viaMarketplace: situacaoEhCompraMarketplace(situacao),
          });
        }

        candidatos.sort((a, b) => a.diaIso.localeCompare(b.diaIso) || a.turnoLabel.localeCompare(b.turnoLabel));
        setTurnos(candidatos.slice(0, 3));
      } catch (e) {
        console.error("[Home] próximos turnos:", e);
        if (!cancelled) setTurnos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [emailEfetivo]);

  return { loading, turnos };
}

/** Ex.: «15 Set» a partir de diaIso — útil no destaque. */
export function partesDataTurnoDestaque(diaIso: string): { diaNum: string; mesCurto: string } {
  const { dia, mesCurto } = fmtDiaMesTurnoHome(diaIso);
  return { diaNum: String(Number(dia)), mesCurto };
}

export function mesCivilLabelCurto(ref: Date = new Date()): string {
  return `${MESES_PT[ref.getMonth()]} ${ref.getFullYear()}`;
}
