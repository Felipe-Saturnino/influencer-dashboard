import { BookOpen, CalendarRange, Clock, MessageSquare } from "lucide-react";
import { useHomeEstudioCienciasPendentes } from "../hooks/useHomeEstudioCienciasPendentes";
import { useHomeEstudioHubFeedbacksKpis } from "../hooks/useHomeEstudioHubFeedbacksKpis";
import { useHomeEstudioTurnosHorasKpis } from "../hooks/useHomeEstudioTurnosHorasKpis";
import { KpisEstudioStaffHomeShell } from "./KpisEstudioStaffHomeShell";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function KpisEstudioShiftLeaderHome({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  const turnos = useHomeEstudioTurnosHorasKpis();
  const ciencias = useHomeEstudioCienciasPendentes();
  const hub = useHomeEstudioHubFeedbacksKpis();

  const loading = turnos.loading || ciencias.loading || hub.loading;
  const mesLabel = turnos.kpis?.mesLabel ?? "";
  const t = turnos.kpis;
  const c = ciencias.counts;

  return (
    <KpisEstudioStaffHomeShell
      sectionIdPrefix={sectionIdPrefix}
      mesSubtitle={`${mesLabel} · seus turnos`}
      loading={loading}
      erro={turnos.erro || hub.erro}
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
          label: "Feedbacks pendentes",
          value: fmt(hub.kpis.feedbacksPendentes),
          icon: <MessageSquare size={16} aria-hidden />,
          accentVar: "--brand-accent",
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
        { key: "academy_performance_hub", label: "Performance Hub" },
        { key: "escala_marketplace_turnos", label: "Marketplace" },
        { key: "escala_controle_turno", label: "Controle de Turno" },
        { key: "academy_portal", label: "Portal da Academy" },
        { key: "rh_portal", label: "Portal de RH" },
      ]}
    />
  );
}
