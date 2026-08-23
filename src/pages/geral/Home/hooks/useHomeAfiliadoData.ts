import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { PLAYBOOK_ITENS_OBRIGATORIOS } from "../../../../constants/playbookGuia";

export type HomeAfiliadoPerfilRow = {
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

export function useHomeAfiliadoData(userId: string | undefined) {
  const [ready, setReady] = useState(false);
  const [perfilRow, setPerfilRow] = useState<HomeAfiliadoPerfilRow | null>(null);
  const [playbookPendente, setPlaybookPendente] = useState(false);

  useEffect(() => {
    if (!userId) {
      setReady(true);
      setPerfilRow(null);
      setPlaybookPendente(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setReady(false);
      const [perfilRes, confRes] = await Promise.all([
        supabase
          .from("influencer_perfil")
          .select(
            "nome_artistico, nome_completo, telefone, cpf, cache_hora, chave_pix, banco, agencia, conta, status",
          )
          .eq("id", userId)
          .maybeSingle(),
        supabase.from("guia_confirmacoes").select("item_key").eq("influencer_id", userId),
      ]);

      if (cancelled) return;

      setPerfilRow((perfilRes.data as HomeAfiliadoPerfilRow) ?? null);
      const keysOk = new Set((confRes.data ?? []).map((r: { item_key: string }) => r.item_key));
      setPlaybookPendente(PLAYBOOK_ITENS_OBRIGATORIOS.some((k) => !keysOk.has(k)));
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { ready, perfilRow, playbookPendente };
}
