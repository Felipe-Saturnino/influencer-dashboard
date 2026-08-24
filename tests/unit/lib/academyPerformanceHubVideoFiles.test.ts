import { describe, it, expect } from "vitest";
import {
  ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_FORMATO,
  arquivoVideoPerformanceHubPermitido,
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
