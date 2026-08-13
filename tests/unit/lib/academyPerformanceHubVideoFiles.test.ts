import { describe, expect, it } from "vitest";
import {
  ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_REDE,
  ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_TAMANHO,
  ACADEMY_PERFORMANCE_HUB_VIDEO_MAX_BYTES,
  endpointResumableVideoPerformanceHub,
  endpointResumableVideoPerformanceHubApi,
  mensagemErroUploadVideo,
} from "../../../src/lib/academyPerformanceHubVideoFiles";

describe("academyPerformanceHubVideoFiles", () => {
  it("300.000 KB (~293 MB) fica abaixo do limite de 500 MB", () => {
    const trezentosMilKbEmBytes = 300_000 * 1024;
    expect(trezentosMilKbEmBytes).toBeLessThan(ACADEMY_PERFORMANCE_HUB_VIDEO_MAX_BYTES);
    expect(ACADEMY_PERFORMANCE_HUB_VIDEO_MAX_BYTES).toBe(524288000);
  });

  it("aponta TUS para o host de Storage do projeto", () => {
    expect(endpointResumableVideoPerformanceHub("https://abc.supabase.co")).toBe(
      "https://abc.storage.supabase.co/storage/v1/upload/resumable",
    );
    expect(endpointResumableVideoPerformanceHubApi("https://abc.supabase.co")).toBe(
      "https://abc.supabase.co/storage/v1/upload/resumable",
    );
  });

  it("não trata 413 de gateway como limite de 500 MB", () => {
    expect(mensagemErroUploadVideo({ message: "Payload Too Large", statusCode: 413 })).toBe(
      ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_REDE,
    );
    expect(mensagemErroUploadVideo({ message: "Maximum size exceeded", statusCode: "413" })).toBe(
      ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_REDE,
    );
    expect(
      mensagemErroUploadVideo({ message: "The object exceeded the maximum allowed size" }),
    ).toBe(ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_TAMANHO);
  });

  it("mapeia conflito TUS e rede sem citar o teto de tamanho", () => {
    expect(mensagemErroUploadVideo({ message: "Upload already exists", statusCode: 409 })).toBe(
      ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_REDE,
    );
    expect(mensagemErroUploadVideo({ message: "Failed to fetch" })).toBe(
      ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_REDE,
    );
  });
});
