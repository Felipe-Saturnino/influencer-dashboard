import { useEffect, useState } from "react";
import { useIdentidadeEfetiva } from "../../../../hooks/useIdentidadeEfetiva";
import { getPeriodoComparativoMesCompleto } from "../../../../lib/dashboardHelpers";
import { hojeIsoBrasil } from "../../../../lib/dateBrasil";
import { fmtVariacaoPctVsAnterior } from "../../../../lib/homeKpisMesasComparativo";
import { fetchEstudioIncidentesPorRelatores } from "../../../../lib/estudioIncidentesFetch";
import { fetchSmSinaisPeriodoOcr } from "../../../../lib/smSinaisFetch";
import { calcularKpisSinais, fmtDuracaoMs } from "../../../../lib/smSinaisHelpers";
import { filtrarTicketsPorRelatoresSm } from "../../../../lib/overviewPrestadorSmOcr";
import { buscarRhFuncionarioAtivoPorEmailLoginCached } from "../../../../lib/rhFuncionarioLoginMatch";
import { supabase } from "../../../../lib/supabase";
import { labelMesCivilAtual } from "./useHomePresencaAcoesNecessarias";
import type { HomeKpiComparativoMensal } from "../shared/HomeKpiCard";

export type HomeEstudioSmOcrKpis = {
  mesLabel: string;
  sinais: number;
  sinaisMom: HomeKpiComparativoMensal | null;
  tmaTotalLabel: string;
  tmaMom: HomeKpiComparativoMensal | null;
  tickets: number;
  ticketsMom: HomeKpiComparativoMensal | null;
};

function comparativoNum(
  atual: number,
  anterior: number,
  fmt: (n: number) => string,
  inverso?: boolean,
): HomeKpiComparativoMensal | null {
  const varPct = fmtVariacaoPctVsAnterior(atual, anterior);
  if (!varPct) return null;
  return {
    anteriorFmt: fmt(anterior),
    pctLabel: varPct.pctLabel,
    up: inverso ? !varPct.up : varPct.up,
  };
}

async function resolverProfileId(funcionarioId: string, email: string | null): Promise<string | null> {
  const emails = new Set<string>();
  if (email?.trim()) emails.add(email.trim().toLowerCase());
  const { data: func } = await supabase
    .from("rh_funcionarios")
    .select("email, email_spin")
    .eq("id", funcionarioId)
    .maybeSingle();
  const e1 = (func as { email?: string | null } | null)?.email?.trim().toLowerCase();
  const e2 = (func as { email_spin?: string | null } | null)?.email_spin?.trim().toLowerCase();
  if (e1) emails.add(e1);
  if (e2) emails.add(e2);
  if (emails.size === 0) return null;
  const { data: profiles } = await supabase.from("profiles").select("id, email").in("email", [...emails]);
  const first = (profiles ?? [])[0] as { id: string } | undefined;
  return first?.id ?? null;
}

export function useHomeEstudioSmOcrKpis(): {
  loading: boolean;
  erro: boolean;
  kpis: HomeEstudioSmOcrKpis | null;
} {
  const { email: emailEfetivo } = useIdentidadeEfetiva();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [kpis, setKpis] = useState<HomeEstudioSmOcrKpis | null>(null);

  useEffect(() => {
    const email = emailEfetivo?.trim();
    if (!email) {
      setLoading(false);
      setKpis(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErro(false);
      try {
        const prestador = await buscarRhFuncionarioAtivoPorEmailLoginCached(email);
        if (cancelled) return;
        if (!prestador?.id) {
          setKpis({
            mesLabel: labelMesCivilAtual(),
            sinais: 0,
            sinaisMom: null,
            tmaTotalLabel: "—",
            tmaMom: null,
            tickets: 0,
            ticketsMom: null,
          });
          return;
        }

        const agora = new Date();
        const ano = agora.getFullYear();
        const mes0 = agora.getMonth();
        const { atual, anterior } = getPeriodoComparativoMesCompleto(ano, mes0);
        const hoje = hojeIsoBrasil();
        const fimAtual = atual.fim > hoje ? hoje : atual.fim;
        const tos = (prestador.staff_id_tos ?? "").trim();
        const profileId = await resolverProfileId(prestador.id, email);

        const [sinaisAtual, sinaisAnt, incidentes] = await Promise.all([
          fetchSmSinaisPeriodoOcr({
            dataIni: atual.inicio,
            dataFim: fimAtual,
            funcionarioIds: [prestador.id],
            resolverTosIds: tos ? [tos] : [],
          }),
          fetchSmSinaisPeriodoOcr({
            dataIni: anterior.inicio,
            dataFim: anterior.fim,
            funcionarioIds: [prestador.id],
            resolverTosIds: tos ? [tos] : [],
          }),
          profileId
            ? fetchEstudioIncidentesPorRelatores({
                dataIni: anterior.inicio,
                dataFim: fimAtual,
                relatorUserIds: [profileId],
                relatorNomes: [(prestador.nome ?? "").trim()].filter(Boolean),
              })
            : Promise.resolve([]),
        ]);
        if (cancelled) return;

        const kAtual = calcularKpisSinais(sinaisAtual);
        const kAnt = calcularKpisSinais(sinaisAnt);
        const profileMap = new Map<string, string>();
        if (profileId) profileMap.set(prestador.id, profileId);
        const nomeMap = new Map<string, string>();
        if ((prestador.nome ?? "").trim()) nomeMap.set(prestador.id, (prestador.nome ?? "").trim());

        const ticketsFiltrados = filtrarTicketsPorRelatoresSm(
          incidentes,
          [prestador.id],
          profileMap,
          nomeMap,
        );
        const ticketsAtual = ticketsFiltrados.filter((t) => {
          const d = (t.created_at ?? "").slice(0, 10);
          return d >= atual.inicio && d <= fimAtual;
        }).length;
        const ticketsAnt = ticketsFiltrados.filter((t) => {
          const d = (t.created_at ?? "").slice(0, 10);
          return d >= anterior.inicio && d <= anterior.fim;
        }).length;

        const tmaAtual = kAtual.tmaTotalMs ?? 0;
        const tmaAnt = kAnt.tmaTotalMs ?? 0;

        setKpis({
          mesLabel: labelMesCivilAtual(agora),
          sinais: kAtual.total,
          sinaisMom: comparativoNum(kAtual.total, kAnt.total, (n) => n.toLocaleString("pt-BR")),
          tmaTotalLabel: fmtDuracaoMs(kAtual.tmaTotalMs),
          tmaMom: comparativoNum(tmaAtual, tmaAnt, (n) => fmtDuracaoMs(n), true),
          tickets: ticketsAtual,
          ticketsMom: comparativoNum(ticketsAtual, ticketsAnt, (n) => n.toLocaleString("pt-BR")),
        });
      } catch (e) {
        console.error("[Home] SM OCR KPIs:", e);
        if (!cancelled) {
          setErro(true);
          setKpis({
            mesLabel: labelMesCivilAtual(),
            sinais: 0,
            sinaisMom: null,
            tmaTotalLabel: "—",
            tmaMom: null,
            tickets: 0,
            ticketsMom: null,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [emailEfetivo]);

  return { loading, erro, kpis };
}
