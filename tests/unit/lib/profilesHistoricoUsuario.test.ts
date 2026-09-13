import { describe, expect, it } from "vitest";
import {
  labelRealizadoPorAtivacao,
  labelRealizadoPorDesativacao,
  labelRealizadoPorResetSenha,
  textoCardAlteracao,
  tituloAlteracaoHistorico,
} from "@/lib/profilesHistoricoUsuario";

describe("profilesHistoricoUsuario labels", () => {
  it("ativação: labels especiais e nome manual", () => {
    expect(labelRealizadoPorAtivacao("ativacao_influencer_afiliado", "Ana")).toBe(
      "Ativação de Influencer/Afiliado",
    );
    expect(labelRealizadoPorAtivacao("contrato_ativado", "Ana")).toBe("Contrato Ativado");
    expect(labelRealizadoPorAtivacao("manual", "Ana Silva")).toBe("Ana Silva");
    expect(labelRealizadoPorAtivacao("manual", null)).toBe("—");
  });

  it("desativação: automações, destrato e manual", () => {
    expect(labelRealizadoPorDesativacao("automacao_inatividade", null)).toBe(
      "Automação de Inatividade",
    );
    expect(labelRealizadoPorDesativacao("automacao_convite", null)).toBe("Automação de Convite");
    expect(labelRealizadoPorDesativacao("destrato", "RH")).toBe("Destrato");
    expect(labelRealizadoPorDesativacao("manual", "João")).toBe("João");
  });

  it("reset: usuário vs admin", () => {
    expect(labelRealizadoPorResetSenha("usuario", null)).toBe("Realizado pelo Usuário");
    expect(labelRealizadoPorResetSenha("manual", "Admin")).toBe("Admin");
  });

  it("cards de alteração", () => {
    expect(tituloAlteracaoHistorico("alteracao_nome")).toBe("Nome");
    expect(
      textoCardAlteracao({
        id: "1",
        profile_id: "p",
        tipo: "alteracao_perfil",
        origem: "manual",
        realizado_por: null,
        resumo: "Perfil: a → b",
        valor_anterior: "a",
        valor_novo: "b",
        created_at: "2026-01-01",
      }),
    ).toBe("Perfil: a → b");
  });
});
