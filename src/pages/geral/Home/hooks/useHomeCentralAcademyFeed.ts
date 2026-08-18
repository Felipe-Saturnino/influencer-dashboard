import { useEffect, useState } from "react";
import { useIdentidadeEfetiva } from "../../../../hooks/useIdentidadeEfetiva";
import { usePermission } from "../../../../hooks/usePermission";
import {
  academyManualReceiptKey,
  manualExigeCienciaDoUsuario,
  type AcademyPortalReadReceiptRow,
} from "../../../../lib/academyPortalCiencia";
import {
  autorIdPostagem,
  carregarMetaAutoresPortalAcademy,
} from "../../../../lib/academyPortalAutorMeta";
import { getHomeStaffFeedNovidadeDesdeIso } from "../../../../lib/homePrestadorGaleriaNovidades";
import { setoresAplicavelDoUsuario } from "../../../../lib/portalRhDocumentoNormativo";
import { buscarRhFuncionarioAtivoPorEmailLogin } from "../../../../lib/rhFuncionarioLoginMatch";
import { carregarOpcoesTimesOrganograma } from "../../../../lib/rhOrganogramaFetch";
import { flattenVinculosDeGrupos } from "../../../../lib/rhOrganogramaTree";
import { supabase } from "../../../../lib/supabase";

export type HomeCentralAcademyKind = "comunicado" | "dica" | "manual";

export type HomeCentralAcademyItem = {
  kind: HomeCentralAcademyKind;
  id: string;
  titulo: string;
  published_at: string | null;
  autorNome: string;
  /** Manual com ciência obrigatória ainda pendente — sem janela 10 dias / sem «Li e Ocultar». */
  cienciaPendente: boolean;
};

type PostagemRow = {
  id: string;
  titulo: string;
  status: string | null;
  published_at: string | null;
  created_by: string | null;
  published_by: string | null;
};

type ManualRow = PostagemRow & {
  requires_acknowledgment?: boolean | null;
  aplicavel_a?: string[] | null;
};

type DraftItem = Omit<HomeCentralAcademyItem, "autorNome"> & { autorId: string | null };

function isPublicado(status: string | null | undefined): boolean {
  return !status || status === "publicado";
}

function tsItem(item: { published_at: string | null }): number {
  if (!item.published_at) return 0;
  const t = Date.parse(item.published_at);
  return Number.isFinite(t) ? t : 0;
}

function dentroJanela(publishedAt: string | null, desdeIso: string): boolean {
  if (!publishedAt) return false;
  return publishedAt >= desdeIso;
}

export function useHomeCentralAcademyFeed() {
  const { email: emailEfetivo, userId: userIdEfetivo } = useIdentidadeEfetiva();
  const perm = usePermission("academy_portal");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [lista, setLista] = useState<HomeCentralAcademyItem[]>([]);

  useEffect(() => {
    if (perm.loading) return;
    if (perm.canView === "nao" || !userIdEfetivo) {
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
        const desdeIso = getHomeStaffFeedNovidadeDesdeIso();

        const [comRes, dicaRes, manualRes, recRes, funcionario, org] = await Promise.all([
          supabase
            .from("academy_portal_comunicado")
            .select("id, titulo, status, published_at, created_by, published_by")
            .eq("status", "publicado")
            .gte("published_at", desdeIso)
            .order("published_at", { ascending: false }),
          supabase
            .from("academy_portal_dica")
            .select("id, titulo, status, published_at, created_by, published_by")
            .eq("status", "publicado")
            .gte("published_at", desdeIso)
            .order("published_at", { ascending: false }),
          supabase
            .from("academy_portal_manual")
            .select(
              "id, titulo, status, published_at, created_by, published_by, requires_acknowledgment, aplicavel_a",
            )
            .eq("status", "publicado")
            .order("published_at", { ascending: false }),
          supabase
            .from("academy_portal_read_receipt")
            .select("content_id, read_at, acknowledged_at")
            .eq("user_id", userIdEfetivo),
          emailEfetivo?.trim()
            ? buscarRhFuncionarioAtivoPorEmailLogin(emailEfetivo)
            : Promise.resolve(null),
          carregarOpcoesTimesOrganograma(),
        ]);

        if (cancelled) return;

        if (comRes.error || dicaRes.error || manualRes.error) {
          console.error(
            "[Home Central Academy]:",
            comRes.error?.message ?? dicaRes.error?.message ?? manualRes.error?.message,
          );
          setErro(true);
          setLista([]);
          return;
        }

        const setores = setoresAplicavelDoUsuario(funcionario, flattenVinculosDeGrupos(org.grupos));

        const receipts = new Map<string, AcademyPortalReadReceiptRow>();
        for (const r of recRes.data ?? []) {
          const row = r as AcademyPortalReadReceiptRow;
          receipts.set(academyManualReceiptKey(row.content_id), row);
        }

        const drafts: DraftItem[] = [];

        for (const row of (comRes.data ?? []) as PostagemRow[]) {
          if (!isPublicado(row.status)) continue;
          drafts.push({
            kind: "comunicado",
            id: `academy-com-${row.id}`,
            titulo: row.titulo?.trim() || "Comunicado",
            published_at: row.published_at,
            cienciaPendente: false,
            autorId: autorIdPostagem(row),
          });
        }

        for (const row of (dicaRes.data ?? []) as PostagemRow[]) {
          if (!isPublicado(row.status)) continue;
          drafts.push({
            kind: "dica",
            id: `academy-dica-${row.id}`,
            titulo: row.titulo?.trim() || "Dica",
            published_at: row.published_at,
            cienciaPendente: false,
            autorId: autorIdPostagem(row),
          });
        }

        for (const row of (manualRes.data ?? []) as ManualRow[]) {
          if (!isPublicado(row.status)) continue;
          const exige = manualExigeCienciaDoUsuario(row, setores);
          const jaCiente = !!receipts.get(academyManualReceiptKey(row.id))?.acknowledged_at;
          const cienciaPendente = exige && !jaCiente;
          if (!cienciaPendente && !dentroJanela(row.published_at, desdeIso)) continue;
          drafts.push({
            kind: "manual",
            id: `academy-manual-${row.id}`,
            titulo: row.titulo?.trim() || "Manual",
            published_at: row.published_at,
            cienciaPendente,
            autorId: autorIdPostagem(row),
          });
        }

        const autorIds = [...new Set(drafts.map((d) => d.autorId).filter(Boolean) as string[])];
        const meta = await carregarMetaAutoresPortalAcademy(autorIds);
        if (cancelled) return;

        const listaFinal: HomeCentralAcademyItem[] = drafts
          .map(({ autorId, ...rest }) => ({
            ...rest,
            autorNome: (autorId && meta[autorId]?.nome) || "Equipe Academy",
          }))
          .sort((a, b) => {
            if (a.cienciaPendente !== b.cienciaPendente) return a.cienciaPendente ? -1 : 1;
            return tsItem(b) - tsItem(a);
          });

        setLista(listaFinal);
      } catch (e) {
        console.error("[Home Central Academy]:", e);
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
  }, [perm.loading, perm.canView, userIdEfetivo, emailEfetivo]);

  return { loading: loading || perm.loading, erro, lista, podeVer: perm.canView !== "nao" };
}
