import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../../../context/AppContext";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { getHomeKpiPeriodo } from "../../../../lib/homeInvestidorMtd";
import { jogoComparativoKeysFromCadastroMesa } from "../../../dashboards/OverviewSpin/overviewSpinLogic";
import type { GameIdentityKey } from "../../../../lib/gameIdentityColors";
import { GAME_IDENTITY_HEX } from "../../../../lib/gameIdentityColors";
import {
  ultimaExecucaoValida,
  type LobbyExecucaoRow,
} from "../../../../lib/lobbyMonitorHelpers";
import { inicioDiaBrasilUtcIso, subDiasIso, hojeIsoBrasil } from "../../../../lib/dateBrasil";

export type HomeTopMesaItem = {
  key: string;
  nomeMesa: string;
  nomeEstudio: string;
  canal: "dedicado" | "network";
  gameKey: GameIdentityKey;
  gameHex: string;
  ggr: number;
  turnover: number;
  apostas: number;
  posicao: number | null;
};

type PorTabelaAgg = {
  mesa: string;
  ggr: number;
  turnover: number;
  apostas: number;
  canal: "dedicado" | "network";
};

function gameKeyFromTipoOuNome(tipoJogo: string, nomeMesa: string): GameIdentityKey {
  const keys = jogoComparativoKeysFromCadastroMesa(tipoJogo, nomeMesa);
  if (keys.includes("blackjack")) return "blackjack";
  if (keys.includes("roleta")) return "roleta";
  if (keys.includes("baccarat")) return "baccarat";
  if (keys.includes("futebol_brasileiro")) return "futebol_brasileiro";
  const n = nomeMesa.toLowerCase();
  if (n.includes("blackjack")) return "blackjack";
  if (n.includes("roleta") || n.includes("roulette")) return "roleta";
  if (n.includes("baccarat")) return "baccarat";
  if (n.includes("futebol")) return "futebol_brasileiro";
  return "blackjack";
}

function normMesa(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function agregarPorTabela(
  table: "relatorio_por_tabela" | "relatorio_network_por_tabela",
  canal: "dedicado" | "network",
  slugs: string[],
  inicio: string,
  fim: string,
): Promise<PorTabelaAgg[]> {
  const rows = await fetchAllPages<{
    mesa: string;
    ggr: number | null;
    turnover: number | null;
    apostas: number | null;
  }>(async (from, to) =>
    supabase
      .from(table)
      .select("mesa, ggr, turnover, apostas")
      .gte("dia", inicio)
      .lte("dia", fim)
      .in("operadora_slug", slugs)
      .order("dia", { ascending: true })
      .range(from, to),
  );

  const map = new Map<string, PorTabelaAgg>();
  for (const r of rows) {
    const mesa = String(r.mesa ?? "").trim();
    if (!mesa) continue;
    const k = `${canal}::${normMesa(mesa)}`;
    const cur = map.get(k) ?? { mesa, ggr: 0, turnover: 0, apostas: 0, canal };
    cur.ggr += Number(r.ggr) || 0;
    cur.turnover += Number(r.turnover) || 0;
    cur.apostas += Number(r.apostas) || 0;
    map.set(k, cur);
  }
  return [...map.values()];
}

async function carregarPosicoesPorNomeMesa(
  operadoraSlug: string,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  try {
    const hoje = hojeIsoBrasil();
    const ontem = subDiasIso(hoje, 1);
    const inicio = inicioDiaBrasilUtcIso(ontem);
    const execRows = await fetchAllPages<LobbyExecucaoRow>(async (from, to) =>
      supabase
        .from("lobby_monitor_execucao")
        .select(
          "id, operadora_slug, executado_em, status, pior_mesa_nome, pior_mesa_identificacao, pior_mesa_posicao, jogos_a_frente_pior_mesa",
        )
        .eq("operadora_slug", operadoraSlug)
        .gte("executado_em", inicio)
        .order("executado_em", { ascending: false })
        .range(from, to),
    );
    const ultima = ultimaExecucaoValida(execRows);
    if (!ultima) return out;

    const posRows = await fetchAllPages<{
      execucao_id: string;
      mesa_identificacao: string;
      nome_mesa: string | null;
      posicao: number | null;
    }>(async (from, to) =>
      supabase
        .from("lobby_monitor_posicao")
        .select("execucao_id, mesa_identificacao, nome_mesa, posicao")
        .eq("execucao_id", ultima.id)
        .order("posicao", { ascending: true })
        .range(from, to),
    );
    for (const p of posRows) {
      const nome = (p.nome_mesa ?? "").trim();
      if (nome && p.posicao != null) out.set(normMesa(nome), p.posicao);
    }
  } catch (err) {
    console.error("[HomeOperador] Top mesas posicionamento:", err);
  }
  return out;
}

export function useHomeTopMesasOperadora() {
  const { escoposVisiveis } = useApp();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [items, setItems] = useState<HomeTopMesaItem[]>([]);

  const operadoraSlugs = useMemo(
    () => escoposVisiveis.operadorasVisiveis ?? [],
    [escoposVisiveis.operadorasVisiveis],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setErro(false);

      if (operadoraSlugs.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      try {
        const periodo = getHomeKpiPeriodo();
        const [ded, net, mesasCad, estudiosCad] = await Promise.all([
          agregarPorTabela(
            "relatorio_por_tabela",
            "dedicado",
            operadoraSlugs,
            periodo.inicio,
            periodo.fim,
          ),
          agregarPorTabela(
            "relatorio_network_por_tabela",
            "network",
            operadoraSlugs,
            periodo.inicio,
            periodo.fim,
          ),
          fetchAllPages<{
            mesa_identificacao: string;
            nome_mesa: string | null;
            tipo_jogo: string | null;
            estudio_slug: string | null;
            operadora_slug: string | null;
          }>(async (from, to) =>
            supabase
              .from("mesas_spin_cadastro")
              .select("mesa_identificacao, nome_mesa, tipo_jogo, estudio_slug, operadora_slug")
              .range(from, to),
          ),
          fetchAllPages<{ slug: string; nome: string | null; tipo: string | null }>(async (from, to) =>
            supabase.from("estudios_spin").select("slug, nome, tipo").range(from, to),
          ),
        ]);

        if (cancelled) return;

        const estudioNome = new Map<string, string>();
        const estudioTipo = new Map<string, "dedicado" | "network">();
        for (const e of estudiosCad) {
          const slug = String(e.slug ?? "").trim();
          if (!slug) continue;
          if (e.nome) estudioNome.set(slug, String(e.nome).trim());
          if (e.tipo === "dedicado" || e.tipo === "network") estudioTipo.set(slug, e.tipo);
        }

        type CadMeta = {
          tipoJogo: string;
          nomeEstudio: string;
          canal: "dedicado" | "network" | null;
        };
        const metaPorNome = new Map<string, CadMeta>();
        for (const m of mesasCad) {
          const nome = String(m.nome_mesa ?? "").trim();
          if (!nome) continue;
          const estSlug = String(m.estudio_slug ?? "").trim();
          const canalCad = estSlug ? (estudioTipo.get(estSlug) ?? null) : null;
          metaPorNome.set(normMesa(nome), {
            tipoJogo: String(m.tipo_jogo ?? ""),
            nomeEstudio: estSlug ? (estudioNome.get(estSlug) ?? "") : "",
            canal: canalCad,
          });
        }

        const combined = [...ded, ...net].sort((a, b) => b.ggr - a.ggr).slice(0, 3);

        let posMap = new Map<string, number>();
        try {
          if (operadoraSlugs.length === 1) {
            posMap = await carregarPosicoesPorNomeMesa(operadoraSlugs[0]);
          }
        } catch {
          /* Top 3 ainda com GGR */
        }

        const top: HomeTopMesaItem[] = combined.map((row) => {
          const meta = metaPorNome.get(normMesa(row.mesa));
          const gameKey = gameKeyFromTipoOuNome(meta?.tipoJogo ?? "", row.mesa);
          const canal =
            meta?.canal === "dedicado" || meta?.canal === "network" ? meta.canal : row.canal;
          return {
            key: `${row.canal}-${row.mesa}`,
            nomeMesa: row.mesa,
            nomeEstudio: meta?.nomeEstudio?.trim() || "—",
            canal,
            gameKey,
            gameHex: GAME_IDENTITY_HEX[gameKey],
            ggr: row.ggr,
            turnover: row.turnover,
            apostas: row.apostas,
            posicao: posMap.get(normMesa(row.mesa)) ?? null,
          };
        });

        if (!cancelled) setItems(top);
      } catch (e) {
        console.error("[HomeOperador] Top mesas:", e);
        if (!cancelled) {
          setErro(true);
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [operadoraSlugs]);

  return { loading, erro, items, semOperadora: operadoraSlugs.length === 0 };
}
