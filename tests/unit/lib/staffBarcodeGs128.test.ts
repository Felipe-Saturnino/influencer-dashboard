import { describe, expect, it } from "vitest";
import {
  GS1_AI_SERIAL,
  GS1_FNC1,
  STAFF_ID_BARCODE_H_MM,
  STAFF_ID_BARCODE_W_MM,
  STAFF_ID_CARD_H_MM,
  STAFF_ID_CARD_W_MM,
  staffBarcodeParaGs128Payload,
} from "../../../src/lib/staffBarcodeGs128";

describe("staffBarcodeParaGs128Payload", () => {
  it("prefixa FNC1 + AI 21 para valor numérico simples", () => {
    expect(staffBarcodeParaGs128Payload("1234567890")).toBe(`${GS1_FNC1}${GS1_AI_SERIAL}1234567890`);
  });

  it("remove espaços do serial", () => {
    expect(staffBarcodeParaGs128Payload("  123 456  ")).toBe(`${GS1_FNC1}${GS1_AI_SERIAL}123456`);
  });

  it("normaliza notação GS1 com parênteses", () => {
    expect(staffBarcodeParaGs128Payload("(21)ABC123")).toBe(`${GS1_FNC1}21ABC123`);
  });

  it("retorna vazio para string em branco", () => {
    expect(staffBarcodeParaGs128Payload("   ")).toBe("");
  });
});

describe("dimensões físicas do cartão de ID", () => {
  it("cartão 5 cm × 3,6 cm", () => {
    expect(STAFF_ID_CARD_W_MM).toBe(50);
    expect(STAFF_ID_CARD_H_MM).toBe(36);
  });

  it("barcode GS1-128 1,4 cm × 1,6 cm", () => {
    expect(STAFF_ID_BARCODE_W_MM).toBe(14);
    expect(STAFF_ID_BARCODE_H_MM).toBe(16);
  });
});
