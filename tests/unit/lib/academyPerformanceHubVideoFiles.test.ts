import { describe, expect, it } from "vitest";
import {
  ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_REDE,
  ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_TAMANHO,
  ACADEMY_PERFORMANCE_HUB_VIDEO_MAX_BYTES,
  detalheErroUploadVideo,
  endpointResumableVideoPerformanceHub,
  endpointResumableVideoPerformanceHubApi,
  mensagemErroUploadVideo,
  statusCodigoNaMensagemTus,
  tokenJwtCompactValido,
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

  it("extrai status do texto típico do tus-js-client", () => {
    expect(statusCodigoNaMensagemTus("response code: 400, response text: {}")).toBe(400);
    expect(statusCodigoNaMensagemTus("response code: n/a, response text: n/a")).toBe(0);
    const tus400 =
      "tus: unexpected response while creating upload, originated from request (method: POST, url: https://abc.storage.supabase.co/storage/v1/upload/resumable, response code: 400, response text: {\"statusCode\":\"400\",\"error\":\"InvalidRequest\"}, request id: n/a)";
    expect(mensagemErroUploadVideo({ message: tus400 })).toBe(ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_REDE);
    const tusNa =
      "tus: unexpected response while creating upload, originated from request (method: POST, url: https://abc.storage.supabase.co/storage/v1/upload/resumable, response code: n/a, response text: n/a, request id: n/a)";
    expect(mensagemErroUploadVideo({ message: tusNa })).toBe(ACADEMY_PERFORMANCE_HUB_VIDEO_ERRO_REDE);
    expect(detalheErroUploadVideo({ message: tus400 }).status).toBe(400);
  });

  it("trata Invalid Compact JWS como sessão, não como permissão", () => {
    expect(
      mensagemErroUploadVideo({
        message: '{"statusCode":"403","code":"AccessDenied","error":"Unauthorized","message":"Invalid Compact JWS"}',
        statusCode: 403,
      }),
    ).toBe("Sua sessão expirou. Faça login novamente e tente enviar o vídeo.");
    expect(tokenJwtCompactValido("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.ok")).toBe(true);
    expect(tokenJwtCompactValido("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.ok")).toBe(true);
    expect(tokenJwtCompactValido("Bearer eyJ.ok, Bearer eyJ.ok")).toBe(false);
    expect(tokenJwtCompactValido("sb_publishable_not_a_jwt")).toBe(false);
  });
});
