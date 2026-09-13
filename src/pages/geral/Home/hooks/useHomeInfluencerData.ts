import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { PLAYBOOK_ITENS_OBRIGATORIOS } from "../../../../constants/playbookGuia";
import type { Live, LiveResultado } from "../../../../types";

const LIVE_HOME_COLS = "id, data, horario, plataforma, titulo, observacao, status";
const LIVE_RESULTADO_HOME_COLS = "live_id, duracao_horas, duracao_min, media_views, max_views";

export type HomeInfluencerPerfilRow = {
  nome_artistico?: string | null;
  nome_completo?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  cache_hora?: number | null;
  chave_pix?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  status?: string | null;
};

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

export function useHomeInfluencerData(userId: string | undefined) {
  const [ready, setReady] = useState(false);
  const [perfilRow, setPerfilRow] = useState<HomeInfluencerPerfilRow | null>(null);
  const [playbookPendente, setPlaybookPendente] = useState(false);
  const [livesFuturas, setLivesFuturas] = useState<Live[]>([]);
  const [livesRealizadasRecentes, setLivesRealizadasRecentes] = useState<Live[]>([]);
  const [resultadosPorLive, setResultadosPorLive] = useState<Record<string, LiveResultado>>({});

  useEffect(() => {
    if (!userId) {
      setReady(true);
      setPerfilRow(null);
      setPlaybookPendente(false);
      setLivesFuturas([]);
      setLivesRealizadasRecentes([]);
      setResultadosPorLive({});
      return;
    }

    let cancelled = false;

    void (async () => {
      setReady(false);
      const hojeIso = dataLocalIso(new Date());
      const [perfilRes, confRes, agRes, realRes] = await Promise.all([
        supabase
          .from("influencer_perfil")
          .select(
            "nome_artistico, nome_completo, telefone, cpf, cache_hora, chave_pix, banco, agencia, conta, status",
          )
          .eq("id", userId)
          .maybeSingle(),
        supabase.from("guia_confirmacoes").select("item_key").eq("influencer_id", userId),
        supabase
          .from("lives")
          .select(LIVE_HOME_COLS)
          .eq("influencer_id", userId)
          .eq("status", "agendada")
          .gte("data", hojeIso)
          .order("data", { ascending: true })
          .order("horario", { ascending: true }),
        supabase
          .from("lives")
          .select(LIVE_HOME_COLS)
          .eq("influencer_id", userId)
          .eq("status", "realizada")
          .order("data", { ascending: false })
          .order("horario", { ascending: false })
          .limit(4),
      ]);

      if (cancelled) return;

      setPerfilRow((perfilRes.data as HomeInfluencerPerfilRow) ?? null);
      const keysOk = new Set((confRes.data ?? []).map((r: { item_key: string }) => r.item_key));
      setPlaybookPendente(PLAYBOOK_ITENS_OBRIGATORIOS.some((k) => !keysOk.has(k)));

      const now = new Date();
      const agendadas = (agRes.data ?? []) as Live[];
      setLivesFuturas(
        agendadas.filter((l) => parseLiveLocal(l.data, l.horario).getTime() > now.getTime()),
      );

      const realizadas = (realRes.data ?? []) as Live[];
      setLivesRealizadasRecentes(realizadas);

      const ids = realizadas.map((l) => l.id);
      const map: Record<string, LiveResultado> = {};
      if (ids.length > 0) {
        const { data: resRows } = await supabase
          .from("live_resultados")
          .select(LIVE_RESULTADO_HOME_COLS)
          .in("live_id", ids);
        if (resRows) {
          (resRows as LiveResultado[]).forEach((r) => {
            map[r.live_id] = r;
          });
        }
      }
      if (!cancelled) setResultadosPorLive(map);
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    ready,
    perfilRow,
    playbookPendente,
    livesFuturas,
    livesRealizadasRecentes,
    resultadosPorLive,
  };
}

export function fmtDataHoraLiveHome(data: string, horario: string): string {
  const dt = parseLiveLocal(data, horario);
  return dt.toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDuracaoLiveHome(r: LiveResultado | undefined): string {
  if (!r) return "—";
  const h = r.duracao_horas ?? 0;
  const m = r.duracao_min ?? 0;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  if (m) return `${m}min`;
  return "—";
}
