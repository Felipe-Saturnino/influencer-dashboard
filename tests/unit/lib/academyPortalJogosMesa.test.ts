import { describe, expect, it } from "vitest";
import {
  ACADEMY_MANUAL_JOGO_TODOS,
  jogoMesaParaPersistirManual,
  normalizarJogosMesa,
} from "../../../src/lib/academyPortalJogosMesa";

describe("academyPortalJogosMesa", () => {
  it("manuais com tipo diferente de Jogos gravam Todos os Jogos", () => {
    expect(jogoMesaParaPersistirManual("Imagem", [])).toEqual([ACADEMY_MANUAL_JOGO_TODOS]);
    expect(jogoMesaParaPersistirManual("Geral", ["Blackjack"])).toEqual([ACADEMY_MANUAL_JOGO_TODOS]);
    expect(jogoMesaParaPersistirManual("Comunicação", [])).toEqual(["Todos os Jogos"]);
  });

  it("manuais do tipo Jogos usam a seleção do modal", () => {
    expect(jogoMesaParaPersistirManual("Jogos", ["Blackjack", "Roleta"])).toEqual(["Blackjack", "Roleta"]);
    expect(jogoMesaParaPersistirManual("Jogos", [])).toBeNull();
  });

  it("normalizarJogosMesa preserva Todos os Jogos", () => {
    expect(normalizarJogosMesa(["Todos os Jogos"])).toEqual(["Todos os Jogos"]);
  });
});
