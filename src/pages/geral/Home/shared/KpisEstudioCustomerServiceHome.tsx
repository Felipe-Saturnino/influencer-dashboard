import { Archive, BookOpen, CircleDot, Loader } from "lucide-react";
import { useHomeEstudioCienciasPendentes } from "../hooks/useHomeEstudioCienciasPendentes";
import { useHomeEstudioCsAtendimentoKpis } from "../hooks/useHomeEstudioCsAtendimentoKpis";
import { KpisEstudioStaffHomeShell } from "./KpisEstudioStaffHomeShell";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function KpisEstudioCustomerServiceHome({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  const ciencias = useHomeEstudioCienciasPendentes();
  const cs = useHomeEstudioCsAtendimentoKpis();

  const loading = ciencias.loading || cs.loading;
  const c = ciencias.counts;
  const k = cs.kpis;

  return (
    <KpisEstudioStaffHomeShell
      sectionIdPrefix={sectionIdPrefix}
      mesSubtitle={k.mesLabel}
      loading={loading}
      erro={cs.erro}
      slots={[
        {
          label: "Abertos",
          value: fmt(k.abertos),
          icon: <CircleDot size={16} aria-hidden />,
          accentVar: "--brand-accent",
          subValue: { value: "Site + E-mail + Instagram", label: "" },
        },
        {
          label: "Em Andamento",
          value: fmt(k.emAndamento),
          icon: <Loader size={16} aria-hidden />,
          subValue: { value: "Site + E-mail + Instagram", label: "" },
        },
        {
          label: "Arquivados (mês)",
          value: fmt(k.arquivadosMes),
          icon: <Archive size={16} aria-hidden />,
          subValue: { value: "Mês civil atual", label: "" },
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
        { key: "cs_atendimento", label: "Atendimento" },
        { key: "academy_portal", label: "Portal da Academy" },
        { key: "rh_portal", label: "Portal de RH" },
      ]}
    />
  );
}
