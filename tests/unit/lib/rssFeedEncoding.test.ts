import { describe, expect, it } from "vitest";
import {
  decodeRssFeedBytes,
  normalizeRssCharset,
  parseCharsetFromContentType,
  resolveRssFeedCharset,
} from "@/lib/rssFeedEncoding";

describe("rssFeedEncoding", () => {
  it("lê charset ISO-8859-1 do Content-Type (UOL)", () => {
    expect(parseCharsetFromContentType("text/xml;charset=ISO-8859-1")).toBe("iso-8859-1");
    expect(normalizeRssCharset("ISO-8859-1")).toBe("iso-8859-1");
  });

  it("decodifica acentos latin-1 corretamente", () => {
    const latin1 = new Uint8Array([
      71, 114, 234, 109, 105, 111, 32, 101, 32, 66, 114, 97, 103, 97, 110, 116, 105, 110, 111,
    ]);
    expect(decodeRssFeedBytes(latin1, "utf-8")).not.toBe("Grêmio e Bragantino");
    expect(decodeRssFeedBytes(latin1, "iso-8859-1")).toBe("Grêmio e Bragantino");
  });

  it("resolve charset pelo header antes do fallback utf-8", () => {
    const bytes = new Uint8Array([65, 231, 227, 111]);
    const charset = resolveRssFeedCharset(bytes, "text/xml; charset=ISO-8859-1");
    expect(charset).toBe("iso-8859-1");
    expect(decodeRssFeedBytes(bytes, charset)).toBe("Ação");
  });
});
