import { BookOpen, CalendarRange, Clock, ShoppingCart } from "lucide-react";
import { useHomeEstudioCienciasPendentes } from "../hooks/useHomeEstudioCienciasPendentes";
import { useHomeEstudioOfertasAtivas } from "../hooks/useHomeEstudioOfertasAtivas";
import { useHomeEstudioTurnosHorasKpis } from "../hooks/useHomeEstudioTurnosHorasKpis";
import { KpisEstudioStaffHomeShell } from "./KpisEstudioStaffHomeShell";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function KpisEstudioGpShufflerHome({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  const turnos = useHomeEstudioTurnosHorasKpis();
  const ciencias = useHomeEstudioCienciasPendentes();
  const ofertas = useHomeEstudioOfertasAtivas();

  const loading = turnos.loading || ciencias.loading || ofertas.loading;
  const mesLabel = turnos.kpis?.mesLabel ?? "";
  const t = turnos.kpis;
  const c = ciencias.counts;
  const o = ofertas.ofertas;

  return (
    <KpisEstudioStaffHomeShell
      sectionIdPrefix={sectionIdPrefix}
      mesSubtitle={`${mesLabel} · seus turnos`}
      loading={loading}
      erro={turnos.erro}
      slots={[
        {
          label: "Turnos no mês",
          value: fmt(t?.turnosEscalados ?? 0),
          icon: <CalendarRange size={16} aria-hidden />,
          accentVar: "--brand-secondary",
          subValue: { value: "Escalados", label: `· ${fmt(t?.turnosRealizados ?? 0)} realizados` },
        },
        {
          label: "Horas no mês",
          value: t?.horasEscaladasLabel ?? "0:00",
          icon: <Clock size={16} aria-hidden />,
          subValue: { value: "Escaladas", label: `· ${t?.horasRealizadasLabel ?? "0:00"} realizadas` },
        },
        {
          label: "Ofertas ativas",
          value: fmt(o.total),
          icon: <ShoppingCart size={16} aria-hidden />,
          accentVar: "--brand-accent",
          subValue: { value: fmt(o.emAnalise), label: "em análise" },
        },
        {
          label: "Ciências pendentes",
          value: fmt(c.total),
          icon: <BookOpen size={16} aria-hidden />,
          subValue: {
            value: `${fmt(c.manuais)} Manuais`,
            label: `e ${fmt(c.politicas)} Políticas`,
          },
        },
      ]}
      footerLinks={[
        { key: "rh_calendario", label: "Calendário" },
        { key: "escala_marketplace_turnos", label: "Marketplace" },
        { key: "academy_portal", label: "Portal da Academy" },
        { key: "rh_portal", label: "Portal de RH" },
      ]}
    />
  );
}
