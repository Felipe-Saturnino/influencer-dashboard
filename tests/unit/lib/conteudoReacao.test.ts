import { describe, expect, it } from "vitest";
import {
  agregarReacoesConteudo,
  aplicarToggleReacao,
  chaveReacaoConteudo,
  resumoReacaoVazio,
  uuidAposPrefixoHome,
  PREFIXO_HOME_RH_COMUNICADO,
} from "../../../src/lib/conteudoReacao";

describe("agregarReacoesConteudo", () => {
  const rows = [
    { origem: "informativo", content_id: "p1", user_id: "u1", emoji: "clap" },
    { origem: "informativo", content_id: "p1", user_id: "u2", emoji: "up" },
    { origem: "informativo", content_id: "p1", user_id: "u3", emoji: "clap" },
    { origem: "rh_comunicado", content_id: "p2", user_id: "u1", emoji: "heart" },
  ];

  it("soma contagens e marca a reação da identidade visível", () => {
    const map = agregarReacoesConteudo(rows, "u1");
    const info = map.get(chaveReacaoConteudo("informativo", "p1"));
    expect(info?.counts.clap).toBe(2);
    expect(info?.counts.up).toBe(1);
    expect(info?.minha).toBe("clap");
    expect(map.get(chaveReacaoConteudo("rh_comunicado", "p2"))?.minha).toBe("heart");
  });

  it("ignora origem e emoji fora do catálogo", () => {
    const map = agregarReacoesConteudo(
      [{ origem: "manual", content_id: "x", user_id: "u1", emoji: "up" }],
      "u1",
    );
    expect(map.size).toBe(0);
  });
});

describe("aplicarToggleReacao", () => {
  it("marca, troca e remove o único emoji da pessoa", () => {
    const vazio = resumoReacaoVazio();
    const marcado = aplicarToggleReacao(vazio, "clap");
    expect(marcado.minha).toBe("clap");
    expect(marcado.counts.clap).toBe(1);

    const trocado = aplicarToggleReacao(marcado, "heart");
    expect(trocado.minha).toBe("heart");
    expect(trocado.counts.clap).toBe(0);
    expect(trocado.counts.heart).toBe(1);

    const removido = aplicarToggleReacao(trocado, "heart");
    expect(removido.minha).toBeNull();
    expect(removido.counts.heart).toBe(0);
  });
});

describe("uuidAposPrefixoHome", () => {
  it("extrai o id da postagem no card da Home", () => {
    expect(uuidAposPrefixoHome("portal-rh-com-abc-1", PREFIXO_HOME_RH_COMUNICADO)).toBe("abc-1");
    expect(uuidAposPrefixoHome("outro", PREFIXO_HOME_RH_COMUNICADO)).toBeNull();
  });
});
