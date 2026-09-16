import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { ROLES_PARIDADE_INFLUENCER } from "../../../lib/staffRoles";
import { PROFILE_INFLUENCER_COLS, type FinanceiroProfileRow } from "./financeiroTypes";

export interface FinanceiroCatalogos {
  influencerList: { id: string; name: string }[];
  operadorasList: { slug: string; nome: string }[];
  operadoraInfMap: Record<string, string[]>;
  /** E-mail por influencer — evita uma segunda lista de profiles na carga do mês. */
  influencerEmailMap: Record<string, string>;
}

export function useFinanceiroCatalogos() {
  const [influencerList, setInfluencerList] = useState<FinanceiroCatalogos["influencerList"]>([]);
  const [operadorasList, setOperadorasList] = useState<FinanceiroCatalogos["operadorasList"]>([]);
  const [operadoraInfMap, setOperadoraInfMap] = useState<FinanceiroCatalogos["operadoraInfMap"]>({});
  const [influencerEmailMap, setInfluencerEmailMap] = useState<FinanceiroCatalogos["influencerEmailMap"]>({});
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  const recarregarCatalogos = useCallback(async () => {
    setLoadingCatalogos(true);
    try {
      const [profs, ops, vinculos] = await Promise.all([
        fetchAllPages<FinanceiroProfileRow>(async (from, to) =>
          await supabase
            .from("profiles")
            .select(PROFILE_INFLUENCER_COLS)
            .in("role", [...ROLES_PARIDADE_INFLUENCER])
            .range(from, to),
        ),
        fetchAllPages<{ slug: string; nome: string }>(async (from, to) =>
          await supabase
            .from("operadoras")
            .select("slug, nome")
            .eq("ativo", true)
            .order("nome")
            .range(from, to),
        ),
        fetchAllPages<{ influencer_id: string; operadora_slug: string }>(async (from, to) =>
          await supabase
            .from("influencer_operadoras")
            .select("influencer_id, operadora_slug")
            .range(from, to),
        ),
      ]);

      setInfluencerList(profs.map((p) => ({ id: p.id, name: p.name ?? p.id })));
      const emails: Record<string, string> = {};
      profs.forEach((p) => {
        emails[p.id] = p.email ?? "";
      });
      setInfluencerEmailMap(emails);
      setOperadorasList(ops);
      const map: Record<string, string[]> = {};
      vinculos.forEach((row) => {
        if (!map[row.operadora_slug]) map[row.operadora_slug] = [];
        map[row.operadora_slug].push(row.influencer_id);
      });
      setOperadoraInfMap(map);
    } catch (e) {
      console.error("[Financeiro] Erro ao carregar catálogos:", e);
    } finally {
      setLoadingCatalogos(false);
    }
  }, []);

  useEffect(() => {
    void recarregarCatalogos();
  }, [recarregarCatalogos]);

  return {
    influencerList,
    operadorasList,
    operadoraInfMap,
    influencerEmailMap,
    loadingCatalogos,
    recarregarCatalogos,
  };
}
