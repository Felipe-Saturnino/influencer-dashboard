import { BookOpen, CheckCircle2, ClipboardList, MessageSquare } from "lucide-react";
import { useHomeEstudioCienciasPendentes } from "../hooks/useHomeEstudioCienciasPendentes";
import { useHomeEstudioHubFeedbacksKpis } from "../hooks/useHomeEstudioHubFeedbacksKpis";
import { KpisEstudioStaffHomeShell } from "./KpisEstudioStaffHomeShell";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function KpisEstudioPerformanceCoachHome({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  const ciencias = useHomeEstudioCienciasPendentes();
  const hub = useHomeEstudioHubFeedbacksKpis();

  const loading = ciencias.loading || hub.loading;
  const c = ciencias.counts;
  const h = hub.kpis;

  return (
    <KpisEstudioStaffHomeShell
      sectionIdPrefix={sectionIdPrefix}
      mesSubtitle={`${h.mesLabel} · Performance Hub`}
      loading={loading}
      erro={hub.erro}
      slots={[
        {
          label: "Feedbacks pendentes",
          value: fmt(h.feedbacksPendentes),
          icon: <MessageSquare size={16} aria-hidden />,
          accentVar: "--brand-accent",
        },
        {
          label: "Aguardando",
          value: fmt(h.aguardando),
          icon: <ClipboardList size={16} aria-hidden />,
        },
        {
          label: "Publicadas (mês)",
          value: fmt(h.publicadasMes),
          icon: <CheckCircle2 size={16} aria-hidden />,
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
        { key: "academy_performance_hub", label: "Performance Hub" },
        { key: "academy_portal", label: "Portal da Academy" },
        { key: "rh_portal", label: "Portal de RH" },
      ]}
    />
  );
}
