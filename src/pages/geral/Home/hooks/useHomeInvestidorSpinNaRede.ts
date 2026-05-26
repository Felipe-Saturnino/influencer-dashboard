import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { getHomeInvestidorMtdIsoRange } from "../../../../lib/homeInvestidorMtd";

export type HomeSpinNaRedeItem = {
  id: string;
  item_url: string;
  titulo: string;
  resumo: string | null;
  published_at: string | null;
  feed_url: string | null;
  fonte_host: string | null;
  imagem_url: string | null;
};

export function useHomeInvestidorSpinNaRede() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [itens, setItens] = useState<HomeSpinNaRedeItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setErro(false);
      try {
        const { inicioIso, fimIso } = getHomeInvestidorMtdIsoRange();
        const { data, error } = await supabase
          .from("spin_na_rede_mencao")
          .select("id, item_url, titulo, resumo, published_at, feed_url, fonte_host, imagem_url")
          .eq("passou_filtro", true)
          .gte("published_at", inicioIso)
          .lte("published_at", fimIso)
          .order("published_at", { ascending: false, nullsFirst: false });

        if (cancelled) return;
        if (error) {
          console.error("[HomeInvestidor] Spin na Rede:", error.message);
          setErro(true);
          setItens([]);
        } else {
          setItens((data ?? []) as HomeSpinNaRedeItem[]);
        }
      } catch (e) {
        console.error("[HomeInvestidor] Spin na Rede:", e);
        if (!cancelled) {
          setErro(true);
          setItens([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, erro, itens };
}
