import { describe, expect, it } from "vitest";
import {
  DIAS_CONVITE_SEM_ACESSO_DESATIVAR,
  DIAS_SEM_LOGIN_DESATIVAR,
  deveDesativarPorInatividade,
} from "@/lib/profilesInatividade";

describe("deveDesativarPorInatividade", () => {
  const agora = new Date("2026-09-13T12:00:00.000Z");

  it("não desativa perfil já inativo", () => {
    expect(
      deveDesativarPorInatividade({
        ativo: false,
        lastSignInAt: null,
        acessoReferenciaEm: "2026-01-01T00:00:00.000Z",
        agora,
      }),
    ).toBe(false);
  });

  it("convite sem acesso: desativa após 30 dias na âncora", () => {
    expect(
      deveDesativarPorInatividade({
        ativo: true,
        lastSignInAt: null,
        acessoReferenciaEm: "2026-08-14T12:00:00.000Z",
        agora,
      }),
    ).toBe(true);
    expect(
      deveDesativarPorInatividade({
        ativo: true,
        lastSignInAt: null,
        acessoReferenciaEm: "2026-08-15T12:00:00.001Z",
        agora,
      }),
    ).toBe(false);
  });

  it("com login: desativa após 60 dias do último acesso (ou âncora, o mais recente)", () => {
    expect(
      deveDesativarPorInatividade({
        ativo: true,
        lastSignInAt: "2026-07-15T12:00:00.000Z",
        acessoReferenciaEm: "2026-01-01T00:00:00.000Z",
        agora,
      }),
    ).toBe(true);
    expect(
      deveDesativarPorInatividade({
        ativo: true,
        lastSignInAt: "2026-07-16T12:00:00.000Z",
        acessoReferenciaEm: "2026-01-01T00:00:00.000Z",
        agora,
      }),
    ).toBe(false);
  });

  it("reativação recente (âncora) reinicia o relógio mesmo com last_sign_in antigo", () => {
    expect(
      deveDesativarPorInatividade({
        ativo: true,
        lastSignInAt: "2026-01-01T00:00:00.000Z",
        acessoReferenciaEm: "2026-09-10T12:00:00.000Z",
        agora,
      }),
    ).toBe(false);
  });

  it("constantes canónicas", () => {
    expect(DIAS_SEM_LOGIN_DESATIVAR).toBe(60);
    expect(DIAS_CONVITE_SEM_ACESSO_DESATIVAR).toBe(30);
  });
});
