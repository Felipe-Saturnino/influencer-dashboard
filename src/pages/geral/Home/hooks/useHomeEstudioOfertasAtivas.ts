import { useEffect, useState } from "react";
import { useIdentidadeEfetiva } from "../../../../hooks/useIdentidadeEfetiva";
import { refMesPrimeiroDiaISO } from "../../../../lib/overviewPrestadorCalendarioHelpers";
import { carregarOfertasMarketplace } from "../../../../lib/escalaMarketplace";
import { buscarRhFuncionarioAtivoPorEmailLoginCached } from "../../../../lib/rhFuncionarioLoginMatch";

export type HomeEstudioOfertasAtivas = {
  total: number;
  emAnalise: number;
};

/** Ofertas ativas próprias no mês: Abertas + Em análise. */
export function useHomeEstudioOfertasAtivas(): {
  loading: boolean;
  ofertas: HomeEstudioOfertasAtivas;
} {
  const { email: emailEfetivo } = useIdentidadeEfetiva();
  const [loading, setLoading] = useState(true);
  const [ofertas, setOfertas] = useState<HomeEstudioOfertasAtivas>({ total: 0, emAnalise: 0 });

  useEffect(() => {
    const email = emailEfetivo?.trim();
    if (!email) {
      setLoading(false);
      setOfertas({ total: 0, emAnalise: 0 });
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const prestador = await buscarRhFuncionarioAtivoPorEmailLoginCached(email);
        if (cancelled) return;
        const fid = prestador?.id?.trim() ?? "";
        if (!fid) {
          setOfertas({ total: 0, emAnalise: 0 });
          return;
        }

        const refMes = refMesPrimeiroDiaISO(new Date());
        const { rows: linhas, error } = await carregarOfertasMarketplace(refMes);
        if (cancelled) return;
        if (error) {
          setOfertas({ total: 0, emAnalise: 0 });
          return;
        }

        let total = 0;
        let emAnalise = 0;
        for (const row of linhas) {
          const souParte =
            row.souOfertante === true ||
            row.souInteressado === true ||
            row.solicitanteStaffId === fid ||
            row.interessadoStaffId === fid;
          if (!souParte) continue;
          if (row.status === "aberto" || row.status === "interessado") {
            total += 1;
          } else if (row.status === "em_analise") {
            total += 1;
            emAnalise += 1;
          }
        }
        setOfertas({ total, emAnalise });
      } catch (e) {
        console.error("[Home] ofertas ativas:", e);
        if (!cancelled) setOfertas({ total: 0, emAnalise: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [emailEfetivo]);

  return { loading, ofertas };
}
