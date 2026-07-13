import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import type { Role } from "../../../../types";

export type HomeInformativoItem = {
  id: string;
  assunto: string;
  descricao: string;
  published_at: string | null;
  autorNome: string;
};

export type UseHomeInformativosOptions = {
  /** Se definido, só informativos com `published_at` >= este ISO (ex.: janela de 10 dias na Home staff). */
  publicadoDesdeIso?: string;
};

export function useHomeInformativos(perfil: Role, options: UseHomeInformativosOptions = {}) {
  const { publicadoDesdeIso } = options;
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [lista, setLista] = useState<HomeInformativoItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setErro(false);
      try {
        let query = supabase
          .from("conteudo_informativo")
          .select(
            "id, assunto, descricao, published_at, created_by, published_by, perfis, operador_escopo, status",
          )
          .eq("status", "publicado")
          .contains("perfis", [perfil])
          .order("published_at", { ascending: false });

        if (publicadoDesdeIso) {
          query = query.gte("published_at", publicadoDesdeIso);
        }

        const { data, error } = await query;

        if (cancelled) return;
        if (error) {
          console.error("[Home] informativos:", error.message);
          setErro(true);
          setLista([]);
          setLoading(false);
          return;
        }

        const rows = (data ?? []) as {
          id: string;
          assunto: string;
          descricao: string;
          published_at: string | null;
          created_by: string | null;
          published_by: string | null;
        }[];

        const userIds = new Set<string>();
        for (const r of rows) {
          const uid = r.created_by ?? r.published_by;
          if (uid) userIds.add(uid);
        }

        const nomes: Record<string, string> = {};
        if (userIds.size > 0) {
          const { data: profs } = await supabase.from("profiles").select("id, name").in("id", [...userIds]);
          for (const p of profs ?? []) {
            const pr = p as { id: string; name: string | null };
            nomes[pr.id] = pr.name?.trim() ?? "";
          }
        }

        if (cancelled) return;

        setLista(
          rows.map((r) => ({
            id: r.id,
            assunto: r.assunto,
            descricao: r.descricao,
            published_at: r.published_at,
            autorNome: nomes[r.created_by ?? r.published_by ?? ""] ?? "",
          })),
        );
      } catch (e) {
        console.error("[Home] informativos:", e);
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
  }, [perfil, publicadoDesdeIso]);

  return { loading, erro, lista };
}
