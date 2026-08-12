import { useEffect, useState } from "react";
import { useApp } from "../../../../context/AppContext";
import { usePermission } from "../../../../hooks/usePermission";
import { getPeriodoHistoricoCompetencias } from "../../../../lib/dashboardHelpers";
import {
  autorIdPostagem,
  carregarMetaAutoresPortalRh,
} from "../../../../lib/portalRhAutorMeta";
import {
  documentoVisivelPorPermissaoPortalRh,
  setoresAplicavelDoUsuario,
} from "../../../../lib/portalRhDocumentoNormativo";
import { buscarRhFuncionarioAtivoPorEmailLogin } from "../../../../lib/rhFuncionarioLoginMatch";
import { carregarOpcoesTimesOrganograma } from "../../../../lib/rhOrganogramaFetch";
import { flattenVinculosDeGrupos } from "../../../../lib/rhOrganogramaTree";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { supabase } from "../../../../lib/supabase";

export type HomePortalRhKind = "comunicado" | "politica" | "rh_talk";

export type HomePortalRhItem = {
  kind: HomePortalRhKind;
  /** Prefixo estável para «Li e Ocultar» (ex.: `portal-rh-com-{uuid}`). */
  id: string;
  titulo: string;
  published_at: string | null;
  autorNome: string;
};

type PostagemRow = {
  id: string;
  titulo: string;
  status: string | null;
  published_at: string | null;
  created_by: string | null;
  published_by: string | null;
};

type DocRow = PostagemRow & {
  aplicavel_a?: string[] | null;
};

type DraftItem = Omit<HomePortalRhItem, "autorNome"> & { autorId: string | null };

function isPublicado(status: string | null | undefined): boolean {
  return !status || status === "publicado";
}

function tsItem(item: { published_at: string | null }): number {
  if (!item.published_at) return 0;
  const t = Date.parse(item.published_at);
  return Number.isFinite(t) ? t : 0;
}

export function useHomePortalRhFeed() {
  const { user } = useApp();
  const perm = usePermission("rh_portal");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [lista, setLista] = useState<HomePortalRhItem[]>([]);

  useEffect(() => {
    if (perm.loading) return;
    if (perm.canView === "nao" || !user?.id) {
      setLoading(false);
      setErro(false);
      setLista([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setErro(false);
      try {
        const { inicio: histInicio } = getPeriodoHistoricoCompetencias();
        const comCols = "id, titulo, status, published_at, created_by, published_by, is_pinned";
        const docCols =
          "id, titulo, status, published_at, created_by, published_by, aplicavel_a";
        const talkCols = "id, titulo, status, published_at, created_by, published_by";

        const [comData, docData, talkData, funcionario, org] = await Promise.all([
          fetchAllPages<PostagemRow & { is_pinned?: boolean | null }>(async (from, to) => {
            const { data, error } = await supabase
              .from("rh_portal_comunicado")
              .select(comCols)
              .eq("status", "publicado")
              .or(`is_pinned.eq.true,published_at.gte.${histInicio}`)
              .order("published_at", { ascending: false })
              .order("id", { ascending: true })
              .range(from, to);
            return { data: (data ?? []) as (PostagemRow & { is_pinned?: boolean | null })[], error };
          }),
          fetchAllPages<DocRow>(async (from, to) => {
            const { data, error } = await supabase
              .from("rh_portal_documento")
              .select(docCols)
              .eq("status", "publicado")
              .gte("published_at", histInicio)
              .order("published_at", { ascending: false })
              .order("id", { ascending: true })
              .range(from, to);
            return { data: (data ?? []) as DocRow[], error };
          }),
          fetchAllPages<PostagemRow>(async (from, to) => {
            const { data, error } = await supabase
              .from("rh_portal_rh_talk")
              .select(talkCols)
              .eq("status", "publicado")
              .gte("published_at", histInicio)
              .order("published_at", { ascending: false })
              .order("id", { ascending: true })
              .range(from, to);
            return { data: (data ?? []) as PostagemRow[], error };
          }),
          user.email?.trim()
            ? buscarRhFuncionarioAtivoPorEmailLogin(user.email)
            : Promise.resolve(null),
          carregarOpcoesTimesOrganograma(),
        ]);

        if (cancelled) return;

        const setores = funcionario
          ? setoresAplicavelDoUsuario(funcionario, flattenVinculosDeGrupos(org.grupos))
          : [];

        const drafts: DraftItem[] = [];

        for (const row of comData) {
          if (!isPublicado(row.status)) continue;
          drafts.push({
            kind: "comunicado",
            id: `portal-rh-com-${row.id}`,
            titulo: row.titulo?.trim() || "Comunicado",
            published_at: row.published_at,
            autorId: autorIdPostagem(row),
          });
        }

        for (const row of docData) {
          if (!isPublicado(row.status)) continue;
          if (
            !documentoVisivelPorPermissaoPortalRh(
              row,
              perm.canView,
              perm.canEditar,
              setores,
            )
          ) {
            continue;
          }
          drafts.push({
            kind: "politica",
            id: `portal-rh-doc-${row.id}`,
            titulo: row.titulo?.trim() || "Política",
            published_at: row.published_at,
            autorId: autorIdPostagem(row),
          });
        }

        for (const row of talkData) {
          if (!isPublicado(row.status)) continue;
          drafts.push({
            kind: "rh_talk",
            id: `portal-rh-talk-${row.id}`,
            titulo: row.titulo?.trim() || "RH Talk",
            published_at: row.published_at,
            autorId: autorIdPostagem(row),
          });
        }

        const autorIds = drafts.map((d) => d.autorId).filter((id): id is string => !!id);
        const meta = await carregarMetaAutoresPortalRh(autorIds);
        if (cancelled) return;

        const listaFinal: HomePortalRhItem[] = drafts
          .map((d) => ({
            kind: d.kind,
            id: d.id,
            titulo: d.titulo,
            published_at: d.published_at,
            autorNome: (d.autorId && meta[d.autorId]?.nome) || "Equipe",
          }))
          .sort((a, b) => tsItem(b) - tsItem(a));

        setLista(listaFinal);
      } catch (e) {
        console.error("[Home] Portal RH feed:", e);
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
  }, [perm.loading, perm.canView, perm.canEditar, user?.id, user?.email]);

  return {
    loading: loading || perm.loading,
    erro,
    lista,
    podeVer: perm.canView !== "nao",
  };
}
