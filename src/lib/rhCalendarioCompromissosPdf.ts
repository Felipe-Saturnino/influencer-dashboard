export type RhCalendarioPdfItem = {
  categoria: string;
  texto: string;
  detalhe?: string;
};

export type RhCalendarioPdfDia = {
  diaIso: string;
  itens: RhCalendarioPdfItem[];
};

export type RhCalendarioCompromissosPdfInput = {
  nomePessoa: string;
  mesLabel: string;
  dias: RhCalendarioPdfDia[];
};

const DAYS_LONG_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

/** Rótulo de dia no PDF — ex.: «Quarta-feira, 15/07/2026». */
export function labelDiaCalendarioPdf(diaIso: string): string {
  const [ys, ms, ds] = diaIso.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!y || !m || !d) return diaIso;
  const date = new Date(y, m - 1, d);
  const dow = DAYS_LONG_PT[date.getDay()] ?? "";
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${dow}, ${dd}/${mm}/${y}`;
}

function slugArquivoCalendario(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return base.slice(0, 40) || "calendario";
}

function refMesArquivo(dias: RhCalendarioPdfDia[], mesLabel: string): string {
  const first = dias[0]?.diaIso?.slice(0, 7);
  if (first && /^\d{4}-\d{2}$/.test(first)) return first;
  return mesLabel.replace(/\s+/g, "-").toLowerCase();
}

/**
 * Gera e baixa o PDF do calendário pessoal (mês).
 * jspdf só carrega no download (chunk vendor-jspdf).
 */
export async function baixarCalendarioCompromissosPdf(
  input: RhCalendarioCompromissosPdfInput,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const marginX = 16;
  const marginBottom = 16;
  const maxW = pageW - marginX * 2;
  let y = 18;

  const ensureSpace = (need: number) => {
    if (y + need <= pageH - marginBottom) return;
    pdf.addPage();
    y = 18;
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Calendário", marginX, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(60, 60, 60);
  const nomeLinhas = pdf.splitTextToSize(input.nomePessoa.trim() || "—", maxW);
  pdf.text(nomeLinhas, marginX, y);
  y += nomeLinhas.length * 5 + 2;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text(input.mesLabel, marginX, y);
  y += 10;

  if (input.dias.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text("Sem compromissos no mês selecionado.", marginX, y);
  } else {
    for (const dia of input.dias) {
      ensureSpace(14);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(30, 54, 248);
      pdf.text(labelDiaCalendarioPdf(dia.diaIso), marginX, y);
      y += 5.5;

      for (const item of dia.itens) {
        const linha = item.detalhe
          ? `${item.categoria}: ${item.texto} — ${item.detalhe}`
          : `${item.categoria}: ${item.texto}`;
        const wrapped = pdf.splitTextToSize(`• ${linha}`, maxW - 2);
        ensureSpace(wrapped.length * 4.5 + 2);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(40, 40, 40);
        pdf.text(wrapped, marginX + 2, y);
        y += wrapped.length * 4.5 + 1.5;
      }
      y += 2.5;
    }
  }

  const slug = slugArquivoCalendario(input.nomePessoa);
  const ref = refMesArquivo(input.dias, input.mesLabel);
  pdf.save(`calendario-${slug}-${ref}.pdf`);
}
