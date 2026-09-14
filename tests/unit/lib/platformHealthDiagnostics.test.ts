import { describe, expect, it } from "vitest";
import {
  buildPlatformHealthTechLogs,
  classificarHttpSmoke,
  countDiagnosticSummary,
  githubRepoPath,
  hasDestinatariosList,
  isValidResendFromAddress,
  labelTipoTechLog,
  primeiraUrlDeLista,
  readPlatformHealthSecrets,
  techLogsParaGravar,
  TIPO_DIAGNOSTICO_RESUMO,
} from "../../../src/lib/platformHealthDiagnostics";
import type { PlatformHealthSnapshot } from "../../../src/lib/platformHealthDiagnostics";

const secretsOk = (): PlatformHealthSnapshot["secrets"] => ({
  cdaConfigurado: true,
  cdaAfiliadosConfigurado: true,
  githubSocialConfigurado: true,
  resendApiKeyConfigurado: true,
  resendFromSistemaConfigurado: true,
  resendFromRelatoriosConfigurado: true,
  senhaPadraoValida: true,
  destinatariosRelatorioConfigurado: true,
  destinatariosAgendaConfigurado: true,
});

const baseSnapshot = (): PlatformHealthSnapshot => ({
  hojeIso: "2026-06-02",
  passouHorarioCda: true,
  passouHorarioSocial: true,
  secrets: secretsOk(),
  integracoes: [
    {
      slug: "casa_apostas",
      nome: "Casa de Apostas (CDA)",
      integracaoSlugFk: "casa_apostas",
      ultimoStatus: "ok",
      ultimoEm: "2026-06-02T08:00:00.000Z",
      okHoje: true,
      teveHistorico: true,
      erros24h: 0,
    },
  ],
});

describe("readPlatformHealthSecrets", () => {
  it("detecta secrets de e-mail transacional e cron", () => {
    const s = readPlatformHealthSecrets((key) => {
      const map: Record<string, string> = {
        RESEND_API_KEY: "re_xxx",
        RESEND_FROM_SISTEMA: "Spin <sistema@test.com>",
        RESEND_FROM_RELATORIOS: "Spin <relatorios@test.com>",
        SENHA_PADRAO: "Senha1234",
        RELATORIO_DIRETORIA_DESTINATARIOS: "a@test.com,b@test.com",
        EMAIL_AGENDA_DESTINATARIOS: "c@test.com",
      };
      return map[key];
    });
    expect(s.resendApiKeyConfigurado).toBe(true);
    expect(s.resendFromSistemaConfigurado).toBe(true);
    expect(s.senhaPadraoValida).toBe(true);
    expect(s.destinatariosAgendaConfigurado).toBe(true);
  });

  it("aceita RESEND_FROM legado para crons", () => {
    const s = readPlatformHealthSecrets((key) =>
      key === "RESEND_FROM" ? "Spin <rel@test.com>" : undefined,
    );
    expect(s.resendFromRelatoriosConfigurado).toBe(true);
  });
});

describe("helpers de e-mail", () => {
  it("valida endereço from", () => {
    expect(isValidResendFromAddress("Nome <a@b.com>")).toBe(true);
    expect(isValidResendFromAddress("invalido")).toBe(false);
  });

  it("valida lista de destinatários", () => {
    expect(hasDestinatariosList("a@b.com; c@d.com")).toBe(true);
    expect(hasDestinatariosList("")).toBe(false);
  });
});

describe("buildPlatformHealthTechLogs", () => {
  it("inclui resumo e entradas por integração", () => {
    const rows = buildPlatformHealthTechLogs(baseSnapshot());
    expect(rows[0].tipo).toBe(TIPO_DIAGNOSTICO_RESUMO);
    expect(rows.some((r) => r.integracao_slug === "casa_apostas")).toBe(true);
  });

  it("inclui probes de secrets de e-mail quando Resend configurado", () => {
    const rows = buildPlatformHealthTechLogs(baseSnapshot());
    expect(rows.some((r) => r.descricao.includes("RESEND_FROM_SISTEMA"))).toBe(true);
    expect(rows.some((r) => r.descricao.includes("SENHA_PADRAO"))).toBe(true);
    expect(rows.some((r) => r.descricao.includes("RELATORIO_DIRETORIA_DESTINATARIOS"))).toBe(true);
  });

  it("marca falha quando último sync falhou", () => {
    const rows = buildPlatformHealthTechLogs({
      ...baseSnapshot(),
      integracoes: [
        {
          slug: "casa_apostas",
          nome: "CDA",
          integracaoSlugFk: "casa_apostas",
          ultimoStatus: "falha",
          ultimoEm: "2026-06-02T08:00:00.000Z",
          okHoje: false,
          teveHistorico: true,
          erros24h: 1,
        },
      ],
    });
    const counts = countDiagnosticSummary(rows);
    expect(counts.erro).toBeGreaterThan(0);
    expect(rows.some((r) => r.descricao.includes("falha"))).toBe(true);
  });

  it("detecta secret CDA ausente", () => {
    const rows = buildPlatformHealthTechLogs({
      ...baseSnapshot(),
      secrets: { ...secretsOk(), cdaConfigurado: false },
    });
    expect(rows.some((r) => r.descricao.includes("CDA") && r.descricao.includes("Credencial"))).toBe(true);
  });

  it("detecta RESEND_API_KEY ausente", () => {
    const rows = buildPlatformHealthTechLogs({
      ...baseSnapshot(),
      secrets: { ...secretsOk(), resendApiKeyConfigurado: false },
    });
    expect(rows.some((r) => r.descricao.includes("RESEND_API_KEY"))).toBe(true);
    expect(rows.some((r) => r.descricao.includes("SENHA_PADRAO"))).toBe(false);
  });

  it("detecta SENHA_PADRAO inválida", () => {
    const rows = buildPlatformHealthTechLogs({
      ...baseSnapshot(),
      secrets: { ...secretsOk(), senhaPadraoValida: false },
    });
    expect(rows.some((r) => r.descricao.includes("SENHA_PADRAO"))).toBe(true);
  });

  it("grava só resumo e problemas (OKs ficam no contador)", () => {
    const all = buildPlatformHealthTechLogs(baseSnapshot());
    const gravar = techLogsParaGravar(all);
    expect(gravar[0]?.tipo).toBe(TIPO_DIAGNOSTICO_RESUMO);
    expect(gravar.every((r) => r.tipo !== "diagnostico_ok")).toBe(true);
    expect(gravar).toHaveLength(1);
  });

  it("marca taxa de erro alta como falha", () => {
    const rows = buildPlatformHealthTechLogs({
      ...baseSnapshot(),
      integracoes: [
        {
          slug: "casa_apostas",
          nome: "CDA",
          integracaoSlugFk: "casa_apostas",
          ultimoStatus: "ok",
          ultimoEm: "2026-06-02T08:00:00.000Z",
          okHoje: true,
          teveHistorico: true,
          erros24h: 0,
          taxaErroPct: 12.5,
          jobKind: "cda",
        },
      ],
    });
    const counts = countDiagnosticSummary(rows);
    expect(counts.erro).toBeGreaterThan(0);
    expect(rows.some((r) => r.descricao.includes("Taxa de erro alta"))).toBe(true);
  });

  it("inclui probes extras no resumo", () => {
    const rows = buildPlatformHealthTechLogs({
      ...baseSnapshot(),
      extras: [
        {
          nome: "Resend — API",
          severidade: "erro",
          descricao: "HTTP 401 — credencial recusada ou acesso negado.",
          integracaoSlugFk: null,
        },
      ],
    });
    expect(rows.some((r) => r.descricao.includes("Resend — API"))).toBe(true);
    expect(techLogsParaGravar(rows).length).toBeGreaterThan(1);
  });
});

describe("helpers de smoke", () => {
  it("classifica HTTP de ping", () => {
    expect(classificarHttpSmoke(200, false).severidade).toBe("ok");
    expect(classificarHttpSmoke(401, false).severidade).toBe("erro");
    expect(classificarHttpSmoke(404, false).severidade).toBe("erro");
    expect(classificarHttpSmoke(503, false).severidade).toBe("aviso");
    expect(classificarHttpSmoke(0, true).severidade).toBe("aviso");
  });

  it("extrai path do repositório GitHub", () => {
    expect(githubRepoPath("acme/app")).toBe("acme/app");
    expect(githubRepoPath("https://github.com/acme/app.git")).toBe("acme/app");
    expect(githubRepoPath("")).toBeNull();
  });

  it("lê a primeira URL de uma lista de feeds", () => {
    expect(primeiraUrlDeLista("https://a.com/rss, https://b.com/rss")).toBe("https://a.com/rss");
    expect(primeiraUrlDeLista("")).toBeNull();
  });
});

describe("labelTipoTechLog", () => {
  it("traduz tipos de diagnóstico", () => {
    expect(labelTipoTechLog("diagnostico_plataforma")).toBe("Diagnóstico (resumo)");
  });
});
