import { describe, expect, it } from "vitest";
import type { RhOrgPrestadorVinculoOpcao } from "../types/rhOrganograma";
import {
  PORTAL_RH_APLICAVEL_TODOS,
  codigoDocumentoJaEmUso,
  documentoExigeCienciaDoUsuario,
  documentoVisivelPorPermissaoPortalRh,
  FORM_POLITICA_NORMATIVA_VAZIO,
  opcoesOrganogramaAplicavel,
  podeGerenciarPostagensPortalRh,
  proximoCodigoSugerido,
  setoresAplicavelDoUsuario,
  validarPublicarDocumentoNormativo,
} from "./portalRhDocumentoNormativo";
import type { RhOrgOrganogramaGrupoPrestador } from "../types/rhOrganograma";

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

  it("ciência exige aceite para quem vê o documento com Exige ciência = Sim", () => {
    const docNormativo = {
      requires_acknowledgment: true,
      codigo: "POL-RH-001",
      tipo_documento: "politica_rh" as const,
    };
    expect(documentoExigeCienciaDoUsuario(docNormativo, "gestor_rh")).toBe(true);
    expect(documentoExigeCienciaDoUsuario(docNormativo, "prestador")).toBe(true);
    expect(documentoExigeCienciaDoUsuario({ ...docNormativo, requires_acknowledgment: false }, "gestor_rh")).toBe(false);
    expect(documentoExigeCienciaDoUsuario(docNormativo, "influencer")).toBe(false);
  });

  it("opções Aplicável a não repetem o mesmo setorNome", () => {
    const grupos: RhOrgOrganogramaGrupoPrestador[] = [
      {
        key: "g1",
        label: "Studio Operations › Treinamento",
        vinculos: [
          {
            nivel: "gerencia",
            diretoriaId: "dir-1",
            gerenciaId: "ger-1",
            timeId: null,
            diretoriaNome: "Studio Operations",
            gerenciaNome: "Treinamento",
            timeNome: "",
            setorNome: "Treinamento",
            label: "Studio Operations › Treinamento — Gerência",
            gestorNome: "Gestor",
          },
          {
            nivel: "time",
            diretoriaId: "dir-1",
            gerenciaId: "ger-1",
            timeId: "time-1",
            diretoriaNome: "Studio Operations",
            gerenciaNome: "Treinamento",
            timeNome: "Performance Coach",
            setorNome: "Performance Coach",
            label: "Studio Operations › Treinamento › Performance Coach",
            gestorNome: "Gestor",
          },
          {
            nivel: "gerencia",
            diretoriaId: "dir-1",
            gerenciaId: "ger-1",
            timeId: null,
            diretoriaNome: "Studio Operations",
            gerenciaNome: "Treinamento",
            timeNome: "",
            setorNome: "Treinamento",
            label: "Studio Operations › Treinamento — Gerência",
            gestorNome: "Gestor",
          },
          {
            nivel: "gerencia",
            diretoriaId: "dir-1",
            gerenciaId: "ger-1",
            timeId: null,
            diretoriaNome: "Studio Operations",
            gerenciaNome: "Treinamento",
            timeNome: "",
            setorNome: "Treinamento",
            label: "Studio Operations › Treinamento — Gerência",
            gestorNome: "Gestor",
          },
        ],
      },
    ];
    const opcoes = opcoesOrganogramaAplicavel(grupos);
    expect(opcoes.map((o) => o.id).sort()).toEqual(["Performance Coach", "Treinamento"]);
    expect(opcoes.filter((o) => o.id === "Treinamento")).toHaveLength(1);
    expect(opcoes.filter((o) => o.label.includes("Treinamento — Gerência"))).toHaveLength(1);
  });
});

describe("código do documento normativo", () => {
  it("sugere o próximo sequencial por prefixo do tipo", () => {
    expect(proximoCodigoSugerido("politica_rh", [])).toBe("POL-RH-000");
    expect(proximoCodigoSugerido("politica_rh", ["POL-RH-001", "POL-RH-003"])).toBe("POL-RH-004");
    expect(proximoCodigoSugerido("procedimento", ["PROC-OPS-001"])).toBe("PROC-OPS-002");
  });

  it("detecta código já em uso sem diferenciar maiúsculas", () => {
    expect(codigoDocumentoJaEmUso("pol-rh-001", ["POL-RH-001", "PROC-OPS-001"])).toBe(true);
    expect(codigoDocumentoJaEmUso("POL-RH-002", ["POL-RH-001"])).toBe(false);
  });

  it("bloqueia publicar com código duplicado", () => {
    const base = {
      ...FORM_POLITICA_NORMATIVA_VAZIO,
      tipoDocumento: "politica_rh" as const,
      codigo: "POL-RH-001",
      versao: "1.0",
      titulo: "Política de teste",
      areaResponsavel: "RH",
      classificacao: "uso_interno" as const,
      aplicavelA: [PORTAL_RH_APLICAVEL_TODOS],
      resumo: "Objetivo da política de teste.",
      pdfPath: "pdfs/x.pdf",
      pdfNome: "x.pdf",
      exigeCiencia: "nao",
      requerAprovacao: "nao",
    };
    const errs = validarPublicarDocumentoNormativo(base, { codigosExistentes: ["POL-RH-001"] });
    expect(errs.codigo).toBe("Este código já está em uso por outro documento.");
  });
});
