import type { RhFigurinoPeca } from "../pages/estudio/Figurinos/types";

/** Etiqueta ~10×5 cm (mm), geração 100% no cliente. jspdf só carrega no download. */
export async function baixarEtiquetaFigurinoPdf(peca: RhFigurinoPeca, estudiosTexto: string): Promise<void> {
  const [{ jsPDF }, JsBarcodeMod] = await Promise.all([import("jspdf"), import("jsbarcode")]);
  const JsBarcode = JsBarcodeMod.default;
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, peca.barcode, {
    format: "CODE128",
    width: 2,
    height: 56,
    displayValue: true,
    fontSize: 12,
    margin: 6,
  });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({ unit: "mm", format: [100, 50], orientation: "landscape" });
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${peca.category} · ${peca.size}`.slice(0, 48), 4, 8);
  pdf.setFontSize(9);
  pdf.text(estudiosTexto.slice(0, 56), 4, 14);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(peca.code, 4, 21);
  pdf.setFont("helvetica", "normal");
  pdf.addImage(imgData, "PNG", 4, 24, 92, 22);
  pdf.save(`etiqueta-${peca.code}.pdf`);
}
