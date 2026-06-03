import { describe, expect, it } from "vitest";
import {
  hasSectionTitleSub,
  normalizeSectionTitleSub,
  SECTION_TITLE_SUB_SEPARATOR,
} from "@/lib/sectionTitleSub";

describe("hasSectionTitleSub", () => {
  it("rejeita vazio e aceita texto", () => {
    expect(hasSectionTitleSub(undefined)).toBe(false);
    expect(hasSectionTitleSub("")).toBe(false);
    expect(hasSectionTitleSub("  ")).toBe(false);
    expect(hasSectionTitleSub("últimos 14 dias")).toBe(true);
  });
});

describe("normalizeSectionTitleSub", () => {
  it("remove separadores duplicados no início", () => {
    expect(normalizeSectionTitleSub(`— últimos 14 dias`)).toBe("últimos 14 dias");
    expect(normalizeSectionTitleSub(`· — foo`)).toBe("foo");
  });

  it("usa travessão canónico na constante", () => {
    expect(SECTION_TITLE_SUB_SEPARATOR).toBe("—");
  });
});
