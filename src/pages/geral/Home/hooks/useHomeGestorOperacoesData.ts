import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { diasUteisRestantesAteFimMes } from "../../../../lib/homeDiasUteis";
import { MESES_PT } from "../../../../lib/dashboardConstants";

const AREAS_OPERACIONAIS = [
  { key: "game_presenter", label: "Game Presenter" },
  { key: "shuffler", label: "Shuffler" },
  { key: "shift_leader", label: "Shift Leader" },
  { key: "service_manager", label: "Service Manager" },
] as const;

export type HomeGestorOperacoesAlerta = {
  ativo: boolean;
  diasUteis: number;
  mesLabel: string;
  areasLabel: string;
};

export function useHomeGestorOperacoesData() {
  const [ready, setReady] = useState(false);
  const [alerta, setAlerta] = useState<HomeGestorOperacoesAlerta>({
    ativo: false,
    diasUteis: 0,
    mesLabel: "",
    areasLabel: "",
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setReady(false);
      try {
        const now = new Date();
        const diasUteis = diasUteisRestantesAteFimMes(now);
        const mesLabel = `${MESES_PT[now.getMonth()]} ${now.getFullYear()}`;
        if (diasUteis > 5 || diasUteis <= 0) {
          if (!cancelled) {
            setAlerta({ ativo: false, diasUteis, mesLabel, areasLabel: "" });
          }
          return;
        }

        const refMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const { data, error } = await supabase.rpc("rh_gestao_escala_grade_meta_listar", {
          p_ref_mes: refMes,
        });
        if (cancelled) return;
        if (error) {
          console.error("[HomeGestorOperacoes] meta escala:", error);
          setAlerta({ ativo: false, diasUteis, mesLabel, areasLabel: "" });
          return;
        }

        const meta = new Map<string, string>();
        for (const row of (data ?? []) as { area_key?: string; status?: string }[]) {
          const ak = (row.area_key ?? "").trim();
          if (ak) meta.set(ak, (row.status ?? "").trim().toLowerCase());
        }

        const pendentes = AREAS_OPERACIONAIS.filter((a) => meta.get(a.key) !== "aprovada");
        setAlerta({
          ativo: pendentes.length > 0,
          diasUteis,
          mesLabel,
          areasLabel: pendentes.map((p) => p.label).join(", "),
        });
      } catch (e) {
        console.error("[HomeGestorOperacoes] carga:", e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, alerta };
}
