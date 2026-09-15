import { BookOpen, CalendarRange, Clock, Radio, Ticket, Timer } from "lucide-react";
import { useHomeEstudioCienciasPendentes } from "../hooks/useHomeEstudioCienciasPendentes";
import { useHomeEstudioSmOcrKpis } from "../hooks/useHomeEstudioSmOcrKpis";
import { useHomeEstudioTurnosHorasKpis } from "../hooks/useHomeEstudioTurnosHorasKpis";
import { KpisEstudioStaffHomeShell } from "./KpisEstudioStaffHomeShell";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function KpisEstudioServiceManagerHome({ sectionIdPrefix }: { sectionIdPrefix: string }) {
  const turnos = useHomeEstudioTurnosHorasKpis();
  const ciencias = useHomeEstudioCienciasPendentes();
  const ocr = useHomeEstudioSmOcrKpis();

  const loading = turnos.loading || ciencias.loading || ocr.loading;
  const mesLabel = turnos.kpis?.mesLabel ?? ocr.kpis?.mesLabel ?? "";
  const t = turnos.kpis;
  const c = ciencias.counts;
  const o = ocr.kpis;

  return (
    <KpisEstudioStaffHomeShell
      sectionIdPrefix={sectionIdPrefix}
      mesSubtitle={`${mesLabel} · seus turnos + OCR`}
      loading={loading}
      erro={turnos.erro || ocr.erro}
      rowClassName="app-grid-kpi-3"
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
          label: "Ciências pendentes",
          value: fmt(c.total),
          icon: <BookOpen size={16} aria-hidden />,
          subValue: {
            value: `${fmt(c.manuais)} Manuais`,
            label: `e ${fmt(c.politicas)} Políticas`,
          },
        },
      ]}
      secondRow={[
        {
          label: "Sinais",
          value: fmt(o?.sinais ?? 0),
          icon: <Radio size={16} aria-hidden />,
          comparativoMensal: o?.sinaisMom ?? null,
        },
        {
          label: "TMA Total",
          value: o?.tmaTotalLabel ?? "—",
          icon: <Timer size={16} aria-hidden />,
          accentVar: "--brand-accent",
          comparativoMensal: o?.tmaMom ?? null,
        },
        {
          label: "Tickets",
          value: fmt(o?.tickets ?? 0),
          icon: <Ticket size={16} aria-hidden />,
          comparativoMensal: o?.ticketsMom ?? null,
        },
      ]}
      footerLinks={[
        { key: "dash_overview_prestador", label: "Overview Prestador" },
        { key: "rh_calendario", label: "Calendário" },
        { key: "escala_marketplace_turnos", label: "Marketplace" },
        { key: "escala_controle_turno", label: "Controle de Turno" },
        { key: "academy_portal", label: "Portal da Academy" },
        { key: "rh_portal", label: "Portal de RH" },
      ]}
    />
  );
}
