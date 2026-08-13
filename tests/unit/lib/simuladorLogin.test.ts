import { describe, expect, it } from "vitest";
import {
  mensagemVazioUsuariosSimulacao,
  montarLabelSimulacao,
  MSG_NENHUM_USUARIO_ATIVO_AREA,
  MSG_NENHUM_USUARIO_ATIVO_OPERADORA,
  MSG_NENHUM_USUARIO_ATIVO_PERFIL,
  recortarEscoposSimulacao,
  validarInputSimulacao,
} from "../../../src/lib/simuladorLogin";
import type { EscoposVisiveis } from "../../../src/context/AppContext";

describe("simuladorLogin", () => {
  it("validarInputSimulacao exige usuário ativo", () => {
    expect(validarInputSimulacao({ role: "influencer", userId: "" })).toBe("Selecione um usuário ativo.");
    expect(validarInputSimulacao({ role: "influencer", userId: "u-1" })).toBeNull();
  });

  it("validarInputSimulacao exige operadora e área nos perfis correspondentes", () => {
    expect(validarInputSimulacao({ role: "operador", userId: "u-1" })).toBe("Selecione uma operadora.");
    expect(validarInputSimulacao({ role: "operador", userId: "u-1", operadoraSlug: "blaze" })).toBeNull();
    expect(validarInputSimulacao({ role: "prestador", userId: "u-1" })).toBe("Selecione uma área de prestador.");
    expect(
      validarInputSimulacao({ role: "prestador", userId: "u-1", prestadorTipoSlug: "estudio" }),
    ).toBeNull();
  });

  it("montarLabelSimulacao inclui usuário e recorte de operadora/área", () => {
    expect(montarLabelSimulacao({ role: "influencer", userId: "u-1" }, { userName: "Maria Silva" })).toBe(
      "Influenciador — Maria Silva",
    );
    expect(
      montarLabelSimulacao(
        { role: "operador", userId: "u-1", operadoraSlug: "blaze" },
        { operadoraNome: "Blaze", userName: "João" },
      ),
    ).toBe("Operador — Blaze — João");
    expect(
      montarLabelSimulacao(
        { role: "prestador", userId: "u-1", prestadorTipoSlug: "estudio" },
        { userName: "Ana" },
      ),
    ).toBe("Prestadores — Estúdio — Ana");
  });

  it("mensagemVazioUsuariosSimulacao distingue perfil, operadora e área", () => {
    expect(mensagemVazioUsuariosSimulacao({})).toBe(MSG_NENHUM_USUARIO_ATIVO_PERFIL);
    expect(mensagemVazioUsuariosSimulacao({ operadoraSlug: "blaze" })).toBe(MSG_NENHUM_USUARIO_ATIVO_OPERADORA);
    expect(mensagemVazioUsuariosSimulacao({ prestadorTipoSlug: "estudio" })).toBe(MSG_NENHUM_USUARIO_ATIVO_AREA);
  });

  it("recortarEscoposSimulacao limita operadora e área escolhidas", () => {
    const base: EscoposVisiveis = {
      influencersVisiveis: [],
      operadorasVisiveis: ["blaze", "cda"],
      semRestricaoEscopo: false,
      vêTodosInfluencers: true,
      prestadorTiposVisiveis: ["estudio", "escritorio"],
    };
    expect(
      recortarEscoposSimulacao(base, { role: "operador", operadoraSlug: "blaze" }).operadorasVisiveis,
    ).toEqual(["blaze"]);
    expect(
      recortarEscoposSimulacao(base, { role: "prestador", prestadorTipoSlug: "estudio" }).prestadorTiposVisiveis,
    ).toEqual(["estudio"]);
  });
});
