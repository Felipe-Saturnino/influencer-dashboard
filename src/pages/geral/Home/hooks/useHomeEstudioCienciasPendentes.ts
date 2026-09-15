import { useEffect, useState } from "react";
import { useIdentidadeEfetiva } from "../../../../hooks/useIdentidadeEfetiva";
import { usePermission } from "../../../../hooks/usePermission";
import {
  academyManualReceiptKey,
  manualExigeCienciaDoUsuario,
  type AcademyPortalReadReceiptRow,
} from "../../../../lib/academyPortalCiencia";
import {
  documentoAplicavelAoUsuario,
  setoresAplicavelDoUsuario,
} from "../../../../lib/portalRhDocumentoNormativo";
import { buscarRhFuncionarioAtivoPorEmailLoginCached } from "../../../../lib/rhFuncionarioLoginMatch";
import { carregarOpcoesTimesOrganograma } from "../../../../lib/rhOrganogramaFetch";
import { flattenVinculosDeGrupos } from "../../../../lib/rhOrganogramaTree";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/supabasePaginate";

export type HomeEstudioCienciasPendentes = {
  manuais: number;
  politicas: number;
  total: number;
};

/**
 * Ciências pendentes próprias: Manuais Academy + Políticas/Normativas do Portal RH.
 */
export function useHomeEstudioCienciasPendentes(): {
  loading: boolean;
  counts: HomeEstudioCienciasPendentes;
} {
  const { email: emailEfetivo, userId: userIdEfetivo } = useIdentidadeEfetiva();
  const permAcademy = usePermission("academy_portal");
  const permRh = usePermission("rh_portal");
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<HomeEstudioCienciasPendentes>({
    manuais: 0,
    politicas: 0,
    total: 0,
  });

  useEffect(() => {
    if (permAcademy.loading || permRh.loading) return;
    if (!userIdEfetivo) {
      setLoading(false);
      setCounts({ manuais: 0, politicas: 0, total: 0 });
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const email = emailEfetivo?.trim() ?? "";
        const [funcionario, org] = await Promise.all([
          email ? buscarRhFuncionarioAtivoPorEmailLoginCached(email) : Promise.resolve(null),
          carregarOpcoesTimesOrganograma(),
        ]);
        if (cancelled) return;

        const setores = funcionario
          ? setoresAplicavelDoUsuario(funcionario, flattenVinculosDeGrupos(org.grupos))
          : [];

        let manuais = 0;
        let politicas = 0;

        if (permAcademy.canView !== "nao") {
          const manuaisRows = await fetchAllPages<{
            id: string;
            requires_acknowledgment: boolean | null;
            aplicavel_a: string[] | null;
            status: string | null;
          }>(async (from, to) => {
            const { data, error } = await supabase
              .from("academy_portal_manual")
              .select("id, requires_acknowledgment, aplicavel_a, status")
              .eq("status", "publicado")
              .eq("requires_acknowledgment", true)
              .range(from, to);
            return { data: data ?? null, error };
          });

          const ids = manuaisRows
            .filter((m) => manualExigeCienciaDoUsuario(m, setores))
            .map((m) => m.id);
          if (ids.length > 0) {
            const { data: receipts } = await supabase
              .from("academy_portal_read_receipt")
              .select("content_id, acknowledged_at")
              .eq("user_id", userIdEfetivo)
              .in("content_id", ids);
            const cientes = new Set(
              ((receipts ?? []) as AcademyPortalReadReceiptRow[])
                .filter((r) => r.acknowledged_at)
                .map((r) => academyManualReceiptKey(r.content_id)),
            );
            manuais = ids.filter((id) => !cientes.has(id)).length;
          }
        }

        if (permRh.canView !== "nao") {
          const docs = await fetchAllPages<{
            id: string;
            requires_acknowledgment: boolean | null;
            aplicavel_a: string[] | null;
            status: string | null;
          }>(async (from, to) => {
            const { data, error } = await supabase
              .from("rh_portal_documento")
              .select("id, requires_acknowledgment, aplicavel_a, status")
              .eq("status", "publicado")
              .eq("requires_acknowledgment", true)
              .range(from, to);
            return { data: data ?? null, error };
          });

          const ids = docs
            .filter((d) => documentoAplicavelAoUsuario(d.aplicavel_a, setores))
            .map((d) => d.id);
          if (ids.length > 0) {
            const { data: receipts } = await supabase
              .from("rh_portal_read_receipt")
              .select("content_id, acknowledged_at, content_type")
              .eq("user_id", userIdEfetivo)
              .eq("content_type", "documento")
              .in("content_id", ids);
            const cientes = new Set(
              ((receipts ?? []) as { content_id: string; acknowledged_at: string | null }[])
                .filter((r) => r.acknowledged_at)
                .map((r) => r.content_id),
            );
            politicas = ids.filter((id) => !cientes.has(id)).length;
          }
        }

        if (!cancelled) {
          setCounts({ manuais, politicas, total: manuais + politicas });
        }
      } catch (e) {
        console.error("[Home] ciências pendentes:", e);
        if (!cancelled) setCounts({ manuais: 0, politicas: 0, total: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    emailEfetivo,
    userIdEfetivo,
    permAcademy.loading,
    permAcademy.canView,
    permRh.loading,
    permRh.canView,
  ]);

  return { loading, counts };
}
