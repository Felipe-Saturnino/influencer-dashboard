import { describe, expect, it } from "vitest";
import {
  enriquecerStatusIntegracaoLobby,
  mesclarSyncLogsPorExecucao,
  pipelineSucessoNoDia,
  syncLogOkNoDia,
} from "@/pages/plataforma/StatusTecnico/statusTecnicoHelpers";

describe("mesclarSyncLogsPorExecucao", () => {
  it("deduplica por id e ordena por executado_em desc", () => {
    const merged = mesclarSyncLogsPorExecucao(
      [
        { id: "a", executado_em: "2026-07-15T09:00:00.000Z" },
        { id: "b", executado_em: "2026-07-15T10:00:00.000Z" },
      ],
      [{ id: "a", executado_em: "2026-07-15T09:00:00.000Z" }, { id: "c", executado_em: "2026-07-14T08:00:00.000Z" }],
    );
    expect(merged.map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
});

describe("syncLogOkNoDia", () => {
  it("true quando há log ok no dia civil SP", () => {
    const logs = [
      { status: "falha", executado_em: "2026-06-02T10:00:00.000Z" },
      { status: "ok", executado_em: "2026-06-02T08:00:00.000Z" },
    ];
    expect(syncLogOkNoDia(logs, "2026-06-02")).toBe(true);
  });

  it("false sem ok no dia", () => {
    expect(syncLogOkNoDia([{ status: "falha", executado_em: "2026-06-02T08:00:00.000Z" }], "2026-06-02")).toBe(
      false,
    );
  });
});

describe("pipelineSucessoNoDia", () => {
  it("aceita run_date ou created_at no dia", () => {
    expect(
      pipelineSucessoNoDia([{ status: "success", run_date: "2026-05-20" }], "2026-05-20"),
    ).toBe(true);
    expect(
      pipelineSucessoNoDia(
        [{ status: "success", created_at: "2026-05-20T15:00:00.000Z" }],
        "2026-05-20",
      ),
    ).toBe(true);
  });

  it("false para status diferente de success", () => {
    expect(pipelineSucessoNoDia([{ status: "failed", run_date: "2026-05-20" }], "2026-05-20")).toBe(false);
  });
});

describe("enriquecerStatusIntegracaoLobby", () => {
  it("usa lobby_monitor_execucao quando sync_logs está ausente", () => {
    const execucoes = [
      {
        operadora_slug: "jonbet",
        executado_em: "2026-08-24T16:13:00.000Z",
        status: "ok",
        mesas_encontradas: 4,
      },
    ];
    const r = enriquecerStatusIntegracaoLobby("lobby_jonbet", [], execucoes, "2026-08-24");
    expect(r.status).toBe("ok");
    expect(r.ultimoSync).toBe("2026-08-24T16:13:00.000Z");
    expect(r.registrosHoje).toBe(4);
  });

  it("prioriza sync_logs ok e enriquece timestamp com execução mais recente", () => {
    const logs = [
      {
        status: "ok",
        executado_em: "2026-08-24T14:00:00.000Z",
        registros_inseridos: 4,
        registros_atualizados: 0,
        erros_count: 0,
      },
    ];
    const execucoes = [
      {
        operadora_slug: "jonbet",
        executado_em: "2026-08-24T16:13:00.000Z",
        status: "ok",
        mesas_encontradas: 4,
      },
    ];
    const r = enriquecerStatusIntegracaoLobby("lobby_jonbet", logs, execucoes, "2026-08-24");
    expect(r.status).toBe("ok");
    expect(r.ultimoSync).toBe("2026-08-24T16:13:00.000Z");
  });

  it("marca parcial como warning", () => {
    const execucoes = [
      {
        operadora_slug: "jonbet",
        executado_em: "2026-08-24T16:13:00.000Z",
        status: "parcial",
        mesas_encontradas: 2,
      },
    ];
    const r = enriquecerStatusIntegracaoLobby("lobby_jonbet", [], execucoes, "2026-08-24");
    expect(r.status).toBe("warning");
  });
});
