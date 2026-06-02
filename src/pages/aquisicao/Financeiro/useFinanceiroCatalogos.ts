import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { ROLES_PARIDADE_INFLUENCER } from "../../../lib/staffRoles";

export interface FinanceiroCatalogos {
  influencerList: { id: string; name: string }[];
  operadorasList: { slug: string; nome: string }[];
  operadoraInfMap: Record<string, string[]>;
}

export function useFinanceiroCatalogos() {
  const [influencerList, setInfluencerList] = useState<FinanceiroCatalogos["influencerList"]>([]);
  const [operadorasList, setOperadorasList] = useState<FinanceiroCatalogos["operadorasList"]>([]);
  const [operadoraInfMap, setOperadoraInfMap] = useState<FinanceiroCatalogos["operadoraInfMap"]>({});
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  const recarregarCatalogos = useCallback(async () => {
    setLoadingCatalogos(true);
    const [profRes, opRes, mapRes] = await Promise.all([
      supabase.from("profiles").select("id, name").in("role", [...ROLES_PARIDADE_INFLUENCER]),
      supabase.from("operadoras").select("slug, nome").eq("ativo", true).order("nome"),
      supabase.from("influencer_operadoras").select("influencer_id, operadora_slug"),
    ]);

    if (profRes.data) {
      setInfluencerList(profRes.data as FinanceiroCatalogos["influencerList"]);
    }
    if (opRes.data) {
      setOperadorasList(opRes.data);
    }
    if (mapRes.data) {
      const map: Record<string, string[]> = {};
      mapRes.data.forEach((row: { influencer_id: string; operadora_slug: string }) => {
        if (!map[row.operadora_slug]) map[row.operadora_slug] = [];
        map[row.operadora_slug].push(row.influencer_id);
      });
      setOperadoraInfMap(map);
    }
    setLoadingCatalogos(false);
  }, []);

  useEffect(() => {
    void recarregarCatalogos();
  }, [recarregarCatalogos]);

  return {
    influencerList,
    operadorasList,
    operadoraInfMap,
    loadingCatalogos,
    recarregarCatalogos,
  };
}
