import { describe, it, expect } from "vitest";
import {
  ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_FORMATO,
  arquivoVideoPerformanceHubPermitido,
  extensaoVideoPerformanceHubPath,
  mimeTypeVideoPerformanceHubPath,
  videoPerformanceHubFormatoSuportadoIos,
} from "@/lib/academyPerformanceHubVideoFiles";

describe("arquivoVideoPerformanceHubPermitido", () => {
  it("aceita MP4", () => {
    const file = new File(["x"], "avaliacao.mp4", { type: "video/mp4" });
    expect(arquivoVideoPerformanceHubPermitido(file)).toEqual({ ok: true });
  });

  it("aceita MOV", () => {
    const file = new File(["x"], "avaliacao.mov", { type: "video/quicktime" });
    expect(arquivoVideoPerformanceHubPermitido(file)).toEqual({ ok: true });
  });

  it("rejeita WebM", () => {
    const file = new File(["x"], "avaliacao.webm", { type: "video/webm" });
    expect(arquivoVideoPerformanceHubPermitido(file)).toEqual({
      ok: false,
      erro: ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_FORMATO,
    });
  });

  it("rejeita MKV", () => {
    const file = new File(["x"], "avaliacao.mkv", { type: "video/x-matroska" });
    expect(arquivoVideoPerformanceHubPermitido(file)).toEqual({
      ok: false,
      erro: ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_FORMATO,
    });
  });
});

describe("extensaoVideoPerformanceHubPath", () => {
  it("extrai extensão do path Storage", () => {
    expect(extensaoVideoPerformanceHubPath("videos/abc-123/uuid.mp4")).toBe("mp4");
    expect(extensaoVideoPerformanceHubPath("videos/x/file.webm")).toBe("webm");
  });
});

describe("videoPerformanceHubFormatoSuportadoIos", () => {
  it("rejeita webm no iOS", () => {
    expect(videoPerformanceHubFormatoSuportadoIos("videos/a/b.webm")).toBe(false);
    expect(videoPerformanceHubFormatoSuportadoIos("videos/a/b.mp4")).toBe(true);
  });
});

describe("mimeTypeVideoPerformanceHubPath", () => {
  it("mapeia extensão para MIME", () => {
    expect(mimeTypeVideoPerformanceHubPath("videos/a/b.mov")).toBe("video/quicktime");
    expect(mimeTypeVideoPerformanceHubPath("videos/a/b.unknown")).toBe("video/mp4");
  });
});
