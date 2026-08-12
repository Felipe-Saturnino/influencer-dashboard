/** Etiqueta de ID do Game Presenter — 8×6 cm (mm). jspdf / jsbarcode só no download. */

export type StaffIdEtiquetaPdf = {
  barcode: string;
  nickname: string;
};

const ETQ_W_MM = 80;
const ETQ_H_MM = 60;

/** Canvas largo (~300 dpi em 8 cm) para impressão nítida. */
function barcodePngDataUrl(value: string, JsBarcode: (el: HTMLCanvasElement, text: string, opts: object) => void): string {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value, {
    format: "CODE128",
    width: 4,
    height: 140,
    displayValue: false,
    margin: 12,
    background: "#ffffff",
    lineColor: "#000000",
  });
  return canvas.toDataURL("image/png");
}

export async function baixarImprimirIdsStaffPdf(itens: StaffIdEtiquetaPdf[]): Promise<void> {
  const validos = itens
    .map((x) => ({
      barcode: x.barcode.trim(),
      nickname: x.nickname.trim() || "—",
    }))
    .filter((x) => x.barcode.length > 0);
  if (validos.length === 0) {
    throw new Error("sem_barcode");
  }

  const [{ jsPDF }, JsBarcodeMod] = await Promise.all([import("jspdf"), import("jsbarcode")]);
  const JsBarcode = JsBarcodeMod.default as (el: HTMLCanvasElement, text: string, opts: object) => void;

  const pdf = new jsPDF({ unit: "mm", format: [ETQ_W_MM, ETQ_H_MM], orientation: "portrait" });

  for (let i = 0; i < validos.length; i++) {
    if (i > 0) pdf.addPage([ETQ_W_MM, ETQ_H_MM], "portrait");
    const { barcode, nickname } = validos[i];
    const imgData = barcodePngDataUrl(barcode, JsBarcode);

    const marginX = 5;
    const imgW = ETQ_W_MM - marginX * 2;
    const imgH = 26;
    const imgY = 8;
    pdf.addImage(imgData, "PNG", marginX, imgY, imgW, imgH);

    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    const numY = imgY + imgH + 8;
    pdf.text(barcode, ETQ_W_MM / 2, numY, { align: "center", maxWidth: imgW });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    const nickY = numY + 8;
    const nick = nickname.length > 42 ? `${nickname.slice(0, 40)}…` : nickname;
    pdf.text(nick, ETQ_W_MM / 2, nickY, { align: "center", maxWidth: imgW });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  pdf.save(`imprimir-ids-gp-${stamp}.pdf`);
}
