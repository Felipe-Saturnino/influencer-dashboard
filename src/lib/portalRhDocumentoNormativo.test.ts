import { describe, expect, it } from "vitest";
import type { RhOrgPrestadorVinculoOpcao } from "../types/rhOrganograma";
import {
  PORTAL_RH_APLICAVEL_TODOS,
  documentoVisivelPorPermissaoPortalRh,
  podeGerenciarPostagensPortalRh,
  setoresAplicavelDoUsuario,
} from "./portalRhDocumentoNormativo";

const vinculoTime: RhOrgPrestadorVinculoOpcao = {
  nivel: "time",
  diretoriaId: "dir-operacoes",
  gerenciaId: "ger-estudio",
  timeId: "time-table-games",
  diretoriaNome: "Operações",
  gerenciaNome: "Estúdio",
  timeNome: "Table Games",
  setorNome: "Table Games",
  label: "Operações › Estúdio › Table Games",
  gestorNome: "Gestor",
};

describe("permissões do Portal de RH", () => {
  it("libera gerenciamento somente para Editar = Sim", () => {
    expect(podeGerenciarPostagensPortalRh("sim")).toBe(true);
    expect(podeGerenciarPostagensPortalRh("proprios")).toBe(false);
    expect(podeGerenciarPostagensPortalRh("nao")).toBe(false);
    expect(podeGerenciarPostagensPortalRh(null)).toBe(false);
  });

  it("resolve time, gerência e diretoria do prestador", () => {
    expect(
      setoresAplicavelDoUsuario(
        { org_time_id: vinculoTime.timeId, org_gerencia_id: null, org_diretoria_id: null },
        [vinculoTime],
      ),
    ).toEqual(["Table Games", "Estúdio", "Operações"]);
  });

  it("Ver = Sim visualiza todas as políticas publicadas", () => {
    expect(documentoVisivelPorPermissaoPortalRh({ aplicavel_a: ["Outro time"] }, "sim", "nao", [])).toBe(true);
  });

  it("Ver = Próprios visualiza Todos os prestadores e sua hierarquia", () => {
    const setores = ["Table Games", "Estúdio", "Operações"];
    expect(
      documentoVisivelPorPermissaoPortalRh(
        { aplicavel_a: [PORTAL_RH_APLICAVEL_TODOS] },
        "proprios",
        "nao",
        setores,
      ),
    ).toBe(true);
    expect(documentoVisivelPorPermissaoPortalRh({ aplicavel_a: ["Table Games"] }, "proprios", "nao", setores)).toBe(true);
    expect(documentoVisivelPorPermissaoPortalRh({ aplicavel_a: ["Estúdio"] }, "proprios", "nao", setores)).toBe(true);
    expect(documentoVisivelPorPermissaoPortalRh({ aplicavel_a: ["Operações"] }, "proprios", "nao", setores)).toBe(true);
    expect(documentoVisivelPorPermissaoPortalRh({ aplicavel_a: ["Marketing"] }, "proprios", "nao", setores)).toBe(false);
  });

  it("Editar = Sim remove o filtro de aplicabilidade", () => {
    expect(
      documentoVisivelPorPermissaoPortalRh({ aplicavel_a: ["Marketing"] }, "proprios", "sim", ["Operações"]),
    ).toBe(true);
  });
});
