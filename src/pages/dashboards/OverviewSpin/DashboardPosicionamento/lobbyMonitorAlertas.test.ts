import { describe, expect, it } from "vitest";
import {
  gerarAlertasAlteracoesJanela,
  type LobbyExecucaoRow,
  type LobbyPosicaoRow,
} from "../../../../lib/lobbyMonitorHelpers";

function exec(id: string, isoUtc: string): LobbyExecucaoRow {
  return {
    id,
    operadora_slug: "blaze",
    executado_em: isoUtc,
    status: "ok",
  };
}

function pos(
  execucaoId: string,
  mesa: string,
  posicao: number,
  estudio = "Blaze",
): LobbyPosicaoRow {
  return {
    execucao_id: execucaoId,
    mesa_identificacao: mesa,
    nome_mesa: mesa,
    nome_estudio: estudio,
    tipo_jogo: "blackjack",
    posicao,
    qtd_concorrentes_a_frente: 0,
    concorrentes_a_frente: [],
  };
}

describe("gerarAlertasAlteracoesJanela", () => {
  it("emite mudança entre dias e ignora polls iguais no mesmo dia", () => {
    const execucoes = [
      exec("e1", "2026-08-04T14:00:00.000Z"),
      exec("e2", "2026-08-04T18:00:00.000Z"), // mesmo dia, posição muda no poll — só última conta
      exec("e3", "2026-08-05T15:00:00.000Z"),
    ];
    const posByExec = new Map<string, LobbyPosicaoRow[]>([
      ["e1", [pos("e1", "bj1", 10)]],
      ["e2", [pos("e2", "bj1", 8)]],
      ["e3", [pos("e3", "bj1", 2)]],
    ]);

    const alertas = gerarAlertasAlteracoesJanela(
      execucoes,
      posByExec,
      "2026-08-04",
      "2026-08-05",
    );

    expect(alertas).toHaveLength(1);
    expect(alertas[0].tipo).toBe("positivo");
    expect(alertas[0].texto).toContain("P8 → P2");
    expect(alertas[0].texto).toContain("05/08");
  });

  it("marca piora como atenção", () => {
    const execucoes = [
      exec("e1", "2026-08-01T12:00:00.000Z"),
      exec("e2", "2026-08-02T12:00:00.000Z"),
    ];
    const posByExec = new Map<string, LobbyPosicaoRow[]>([
      ["e1", [pos("e1", "rl1", 3, "Sports Club")]],
      ["e2", [pos("e2", "rl1", 40, "Sports Club")]],
    ]);

    const alertas = gerarAlertasAlteracoesJanela(
      execucoes,
      posByExec,
      "2026-08-01",
      "2026-08-02",
    );

    expect(alertas).toHaveLength(1);
    expect(alertas[0].tipo).toBe("atencao");
    expect(alertas[0].texto).toContain("P3 → P40");
  });
});
