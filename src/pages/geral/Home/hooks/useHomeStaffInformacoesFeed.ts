import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import type { Role } from "../../../../types";
import {
  buscarMeuColaboradorGaleria,
  fotoEventoEmbed,
  type MarketingFotoComEvento,
} from "../../../../lib/marketingGaleriaFotos";
import { getHomePrestadorGaleriaNovidadeDesdeIso } from "../../../../lib/homePrestadorGaleriaNovidades";
import { useHomeInformativos, type HomeInformativoItem } from "./useHomeInformativos";

export type HomeGaleriaNovidadeGerais = {
  kind: "galeria_gerais";
  id: string;
  eventoNome: string;
  created_at: string;
  autorNome: string;
};

export type HomeGaleriaNovidadeMinhas = {
  kind: "galeria_minhas";
  id: string;
  created_at: string;
  autorNome: string;
};

export type HomeInformacaoInformativo = HomeInformativoItem & { kind: "informativo" };

export type HomeStaffInformacaoItem =
  | HomeInformacaoInformativo
  | HomeGaleriaNovidadeGerais
  | HomeGaleriaNovidadeMinhas;

function tsItem(item: HomeStaffInformacaoItem): number {
  const iso = item.kind === "informativo" ? item.published_at : item.created_at;
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

async function buscarNovidadesGaleria(): Promise<(HomeGaleriaNovidadeGerais | HomeGaleriaNovidadeMinhas)[]> {
  const desdeIso = getHomePrestadorGaleriaNovidadeDesdeIso();
  const cards: (HomeGaleriaNovidadeGerais | HomeGaleriaNovidadeMinhas)[] = [];

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
      if (!ev?.nome) continue;
      cards.push({
        kind: "galeria_gerais",
        id: `galeria-gerais-${row.evento_id}`,
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

export function useHomeStaffInformacoesFeed(
  perfil: Role,
  { includeGaleriaNovidades = true }: { includeGaleriaNovidades?: boolean } = {},
) {
  const informativos = useHomeInformativos(perfil);
  const [galeriaLoading, setGaleriaLoading] = useState(includeGaleriaNovidades);
  const [galeriaErro, setGaleriaErro] = useState(false);
  const [galeriaCards, setGaleriaCards] = useState<(HomeGaleriaNovidadeGerais | HomeGaleriaNovidadeMinhas)[]>([]);

  useEffect(() => {
    if (!includeGaleriaNovidades) {
      setGaleriaLoading(false);
      setGaleriaErro(false);
      setGaleriaCards([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      setGaleriaLoading(true);
      setGaleriaErro(false);
      try {
        const cards = await buscarNovidadesGaleria();
        if (!cancelled) setGaleriaCards(cards);
      } catch (e) {
        console.error(`[Home ${perfil}] galeria novidades:`, e);
        if (!cancelled) {
          setGaleriaErro(true);
          setGaleriaCards([]);
        }
      } finally {
        if (!cancelled) setGaleriaLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [perfil, includeGaleriaNovidades]);

  const loading = informativos.loading || galeriaLoading;
  const erro = informativos.erro || galeriaErro;

  const lista: HomeStaffInformacaoItem[] = [
    ...informativos.lista.map((item) => ({ ...item, kind: "informativo" as const })),
    ...galeriaCards,
  ].sort((a, b) => tsItem(b) - tsItem(a));

  return { loading, erro, lista };
}
