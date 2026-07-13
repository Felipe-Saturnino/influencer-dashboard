import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import {
  buscarMeuColaboradorGaleria,
  fotoEventoEmbed,
  type MarketingFotoComEvento,
} from "../../../../lib/marketingGaleriaFotos";
import { getHomeStaffFeedNovidadeDesdeIso } from "../../../../lib/homePrestadorGaleriaNovidades";

export type HomeBlogueiroGaleriaGerais = {
  kind: "galeria_gerais";
  id: string;
  eventoId: string;
  eventoNome: string;
  created_at: string;
  autorNome: string;
};

export type HomeBlogueiroGaleriaMinhas = {
  kind: "galeria_minhas";
  id: string;
  created_at: string;
  autorNome: string;
};

export type HomeBlogueiroSpinMencao = {
  kind: "spin_na_rede";
  id: string;
  titulo: string;
  published_at: string | null;
};

export type HomeBlogueiroSpinItem =
  | HomeBlogueiroGaleriaGerais
  | HomeBlogueiroGaleriaMinhas
  | HomeBlogueiroSpinMencao;

function tsItem(item: HomeBlogueiroSpinItem): number {
  const iso = item.kind === "spin_na_rede" ? item.published_at : item.created_at;
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

async function resolverNomesUploaders(ids: string[]): Promise<Record<string, string>> {
  const nomes: Record<string, string> = {};
  if (ids.length === 0) return nomes;
  const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
  for (const p of profs ?? []) {
    const pr = p as { id: string; name: string | null };
    nomes[pr.id] = pr.name?.trim() ?? "";
  }
  return nomes;
}

async function buscarGaleriaCards(desdeIso: string): Promise<(HomeBlogueiroGaleriaGerais | HomeBlogueiroGaleriaMinhas)[]> {
  const cards: (HomeBlogueiroGaleriaGerais | HomeBlogueiroGaleriaMinhas)[] = [];

  const { data: geraisRows, error: errGerais } = await supabase
    .from("marketing_fotos")
    .select("id, created_at, uploaded_by, evento_id, tipo, marketing_eventos(id, nome, ativo)")
    .eq("tipo", "geral")
    .gte("created_at", desdeIso)
    .order("created_at", { ascending: false });

  if (!errGerais && geraisRows?.length) {
    const porEvento = new Map<string, MarketingFotoComEvento>();
    for (const row of geraisRows as MarketingFotoComEvento[]) {
      const ev = fotoEventoEmbed(row);
      if (!ev?.ativo || !row.evento_id) continue;
      if (!porEvento.has(row.evento_id)) porEvento.set(row.evento_id, row);
    }
    const uploaderIds = [...porEvento.values()]
      .map((r) => r.uploaded_by)
      .filter(Boolean) as string[];
    const nomes = await resolverNomesUploaders(uploaderIds);

    for (const row of porEvento.values()) {
      const ev = fotoEventoEmbed(row);
      if (!ev?.nome || !row.evento_id) continue;
      cards.push({
        kind: "galeria_gerais",
        id: `galeria-gerais-${row.evento_id}`,
        eventoId: row.evento_id,
        eventoNome: ev.nome,
        created_at: row.created_at,
        autorNome: nomes[row.uploaded_by ?? ""] ?? "",
      });
    }
  }

  const meu = await buscarMeuColaboradorGaleria();
  if (meu) {
    const { data: minhasRows, error: errMinhas } = await supabase
      .from("marketing_fotos")
      .select("id, created_at, uploaded_by")
      .eq("tipo", "prestador")
      .eq("rh_funcionario_id", meu.id)
      .gte("created_at", desdeIso)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!errMinhas && minhasRows?.length) {
      const row = minhasRows[0] as { id: string; created_at: string; uploaded_by: string | null };
      const nomes = await resolverNomesUploaders(row.uploaded_by ? [row.uploaded_by] : []);
      cards.push({
        kind: "galeria_minhas",
        id: `galeria-minhas-${row.id}`,
        created_at: row.created_at,
        autorNome: nomes[row.uploaded_by ?? ""] ?? "",
      });
    }
  }

  return cards;
}

async function buscarSpinCards(desdeIso: string): Promise<HomeBlogueiroSpinMencao[]> {
  const { data, error } = await supabase
    .from("spin_na_rede_mencao")
    .select("id, titulo, published_at")
    .eq("passou_filtro", true)
    .gte("published_at", desdeIso)
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("[Home Blogueiro Spin] spin_na_rede:", error.message);
    throw error;
  }

  return ((data ?? []) as { id: string; titulo: string; published_at: string | null }[]).map((row) => ({
    kind: "spin_na_rede" as const,
    id: `spin-${row.id}`,
    titulo: row.titulo?.trim() || "Reportagem",
    published_at: row.published_at,
  }));
}

export function useHomeBlogueiroSpinFeed() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [lista, setLista] = useState<HomeBlogueiroSpinItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setErro(false);
      try {
        const desdeIso = getHomeStaffFeedNovidadeDesdeIso();
        const [galeria, spin] = await Promise.all([buscarGaleriaCards(desdeIso), buscarSpinCards(desdeIso)]);
        if (cancelled) return;
        setLista([...galeria, ...spin].sort((a, b) => tsItem(b) - tsItem(a)));
      } catch (e) {
        console.error("[Home Blogueiro Spin]:", e);
        if (!cancelled) {
          setErro(true);
          setLista([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, erro, lista };
}
