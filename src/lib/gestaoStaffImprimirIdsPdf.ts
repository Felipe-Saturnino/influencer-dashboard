/** Impressão de IDs do staff (Gestão de Staff) — várias etiquetas 8×6 cm numa folha A4. */

export type StaffIdEtiquetaPdf = {
  barcode: string;
  nickname: string;
};

/** Tamanho físico de cada etiqueta (para corte). */
const CELL_W_MM = 80;
const CELL_H_MM = 60;

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const COLS = 2;
const ROWS = 4;
const PER_PAGE = COLS * ROWS;
const GAP_X_MM = 6;
const GAP_Y_MM = 6;

function barcodePngDataUrl(
  value: string,
  JsBarcode: (el: HTMLCanvasElement, text: string, opts: object) => void,
): { dataUrl: string; aspect: number } {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value, {
    format: "CODE128",
    width: 3,
    height: 120,
    displayValue: false,
    margin: 8,
    background: "#ffffff",
    lineColor: "#000000",
  });
  const w = canvas.width || 1;
  const h = canvas.height || 1;
  return { dataUrl: canvas.toDataURL("image/png"), aspect: w / h };
}

function desenharEtiqueta(
  pdf: {
    setDrawColor: (r: number, g: number, b: number) => void;
    setLineWidth: (w: number) => void;
    setLineDashPattern: (pattern: number[], phase: number) => void;
    rect: (x: number, y: number, w: number, h: number) => void;
    addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void;
    setTextColor: (r: number, g: number, b: number) => void;
    setFont: (name: string, style: string) => void;
    setFontSize: (size: number) => void;
    text: (
      text: string,
      x: number,
      y: number,
      opts?: { align?: "left" | "center" | "right"; maxWidth?: number },
    ) => void;
  },
  cellX: number,
  cellY: number,
  barcode: string,
  nickname: string,
  img: { dataUrl: string; aspect: number },
): void {
  // Guia de corte (tracejado leve).
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.2);
  pdf.setLineDashPattern([1.2, 1.2], 0);
  pdf.rect(cellX, cellY, CELL_W_MM, CELL_H_MM);
  pdf.setLineDashPattern([], 0);

  const maxImgW = CELL_W_MM - 12;
  const maxImgH = 26;
  let imgH = maxImgH;
  let imgW = imgH * img.aspect;
  if (imgW > maxImgW) {
    imgW = maxImgW;
    imgH = imgW / img.aspect;
  }
  const imgX = cellX + (CELL_W_MM - imgW) / 2;
  const imgY = cellY + 7;
  pdf.addImage(img.dataUrl, "PNG", imgX, imgY, imgW, imgH);

  const centerX = cellX + CELL_W_MM / 2;
  const textMaxW = CELL_W_MM - 10;

  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  const numY = imgY + imgH + 6;
  pdf.text(barcode, centerX, numY, { align: "center", maxWidth: textMaxW });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const nickY = numY + 7;
  const nick = nickname.length > 36 ? `${nickname.slice(0, 34)}…` : nickname;
  pdf.text(nick, centerX, nickY, { align: "center", maxWidth: textMaxW });
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

  const gridW = COLS * CELL_W_MM + (COLS - 1) * GAP_X_MM;
  const gridH = ROWS * CELL_H_MM + (ROWS - 1) * GAP_Y_MM;
  const originX = (PAGE_W_MM - gridW) / 2;
  const originY = (PAGE_H_MM - gridH) / 2;

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  for (let i = 0; i < validos.length; i++) {
    if (i > 0 && i % PER_PAGE === 0) {
      pdf.addPage("a4", "portrait");
    }
    const slot = i % PER_PAGE;
    const col = slot % COLS;
    const row = Math.floor(slot / COLS);
    const cellX = originX + col * (CELL_W_MM + GAP_X_MM);
    const cellY = originY + row * (CELL_H_MM + GAP_Y_MM);

    const { barcode, nickname } = validos[i]!;
    const img = barcodePngDataUrl(barcode, JsBarcode);
    desenharEtiqueta(pdf, cellX, cellY, barcode, nickname, img);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  pdf.save(`imprimir-ids-gp-${stamp}.pdf`);
}
