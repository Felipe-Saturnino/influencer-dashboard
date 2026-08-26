/** Impressão de IDs do staff (Gestão de Staff) — cartões 5×3,6 cm com GS1-128 numa folha A4. */

import {
  STAFF_ID_BARCODE_H_MM,
  STAFF_ID_BARCODE_W_MM,
  STAFF_ID_CARD_H_MM,
  STAFF_ID_CARD_W_MM,
  staffBarcodeParaGs128Payload,
} from "./staffBarcodeGs128";

export type StaffIdEtiquetaPdf = {
  barcode: string;
  nickname: string;
};

const CELL_W_MM = STAFF_ID_CARD_W_MM;
const CELL_H_MM = STAFF_ID_CARD_H_MM;

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const COLS = 4;
const ROWS = 7;
export const STAFF_ID_LABELS_PER_PAGE = COLS * ROWS;
const GAP_X_MM = 2;
const GAP_Y_MM = 3;

function barcodePngDataUrl(
  value: string,
  JsBarcode: (el: HTMLCanvasElement, text: string, opts: object) => void,
): string {
  const payload = staffBarcodeParaGs128Payload(value);
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, payload, {
    format: "CODE128",
    width: 2,
    height: 80,
    displayValue: false,
    margin: 4,
    background: "#ffffff",
    lineColor: "#000000",
  });
  return canvas.toDataURL("image/png");
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
  imgDataUrl: string,
): void {
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.2);
  pdf.setLineDashPattern([1.2, 1.2], 0);
  pdf.rect(cellX, cellY, CELL_W_MM, CELL_H_MM);
  pdf.setLineDashPattern([], 0);

  const imgX = cellX + (CELL_W_MM - STAFF_ID_BARCODE_W_MM) / 2;
  const imgY = cellY + 3;
  pdf.addImage(imgDataUrl, "PNG", imgX, imgY, STAFF_ID_BARCODE_W_MM, STAFF_ID_BARCODE_H_MM);

  const centerX = cellX + CELL_W_MM / 2;
  const textMaxW = CELL_W_MM - 6;

  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  const numY = imgY + STAFF_ID_BARCODE_H_MM + 2.5;
  pdf.text(barcode, centerX, numY, { align: "center", maxWidth: textMaxW });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  const nickY = numY + 4;
  const nick = nickname.length > 22 ? `${nickname.slice(0, 20)}…` : nickname;
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
    if (i > 0 && i % STAFF_ID_LABELS_PER_PAGE === 0) {
      pdf.addPage("a4", "portrait");
    }
    const slot = i % STAFF_ID_LABELS_PER_PAGE;
    const col = slot % COLS;
    const row = Math.floor(slot / COLS);
    const cellX = originX + col * (CELL_W_MM + GAP_X_MM);
    const cellY = originY + row * (CELL_H_MM + GAP_Y_MM);

    const { barcode, nickname } = validos[i]!;
    const imgDataUrl = barcodePngDataUrl(barcode, JsBarcode);
    desenharEtiqueta(pdf, cellX, cellY, barcode, nickname, imgDataUrl);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  pdf.save(`imprimir-ids-gp-${stamp}.pdf`);
}
