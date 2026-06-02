import { describe, expect, it } from "vitest";
import {
  pipelineSucessoNoDia,
  syncLogOkNoDia,
} from "@/pages/plataforma/StatusTecnico/statusTecnicoHelpers";

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
