/**
 * Fase 1 Gestão de Prestadores: helpers, constantes, modal header
 * Run: node scripts/split-gestao-prestador-phase1.mjs
 */
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/pages/rh/GestaoPrestador");
const src = fs.readFileSync(path.join(dir, "index.tsx"), "utf8");
const lines = src.split(/\r?\n/);

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

let helpers = slice(103, 817);
helpers = helpers
  .replace(/^const /gm, "export const ")
  .replace(/^type /gm, "export type ")
  .replace(/^function /gm, "export function ");

const helpersHeader = `import type { CSSProperties } from "react";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import type {
  RhAreaAtuacao,
  RhFuncionario,
  RhFuncionarioHistorico,
  RhFuncionarioTipoContrato,
  RhHistoricoAcaoTipo,
  RhTipoTerminoPrestacao,
} from "../../../types/rhFuncionario";
import type { RhOrgOrganogramaGrupoPrestador, RhOrgPrestadorVinculoOpcao } from "../../../types/rhOrganograma";
import {
  centavosDeStringMoeda,
  formatarAgencia,
  formatarCepDigitos,
  formatarCnpjDigitos,
  formatarCpfDigitos,
  formatarMoedaDigitos,
  formatarRgInput,
  formatarTelefoneBr,
  somenteDigitos,
  validarCnpjDigitos,
  validarCpfDigitos,
  validarEmail,
} from "../../../lib/rhFuncionarioValidators";
import { montarContatoEmergenciaLinha } from "../../../lib/rhFuncionarioEndereco";
import { opcoesTurnoPorEscalaRh } from "../../../lib/rhEscalaTurnos";
import { encontrarVinculoParaFuncionarioRow } from "../../../lib/rhOrganogramaTree";
import { nomeLiderPrimeiroUltimoParaTabela } from "../../../lib/rhOrganogramaLiderImediato";
import { primeiroUltimoNome } from "../../../lib/rhGamePresenterDealerSync";

`;

fs.writeFileSync(path.join(dir, "gestaoPrestadorHelpers.ts"), helpersHeader + helpers + "\n");

let modalHeader = slice(818, 932).replace(/^function RhFuncModalHeaderDetalhes/, "export function RhFuncModalHeaderDetalhes");

const modalHeaderFile = `import { Eye, EyeOff, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { FONT } from "../../../constants/theme";
import { useDialogTitleId } from "../../../components/OperacoesModal";
import type { RhFuncionario } from "../../../types/rhFuncionario";

${modalHeader}
`;

fs.writeFileSync(path.join(dir, "RhFuncModalHeaderDetalhes.tsx"), modalHeaderFile);

const componentBlock = slice(934, lines.length);

const indexImports = slice(1, 102).trim();

const indexNew = `${indexImports}
import {
  ABAS_PAGINA_RH_FUNC,
  CNPJ_CONTEXTO_NAO_PJ,
  ESCALAS_PERMITIDAS,
  FILTRO_TIPO_ACAO_HIST_PRESTADOR_OPTS,
  NIVEIS,
  PRESTADOR_STATUS_FILTRO_EXTRA,
  TIPOS_CONTRATO,
  UFS_BR,
  blurSensivel,
  buildRhFuncionarioPayloadFromState,
  ctaGradient,
  diffContratacaoSlices,
  estadoVazioForm,
  formDeFuncionario,
  historicoPrestadorPassaFiltroTipo,
  labelAreaAtuacao,
  labelSliceOrganograma,
  labelStatusPrestador,
  corStatusPrestador,
  mensagemErroSupabaseRhFuncionarioSalvar,
  prestadorCadastroIncompleto,
  remuneracaoHoraCentavosDeRow,
  sliceContratacaoDeForm,
  sliceContratacaoDeRow,
  textoDataFuncaoColunaTabela,
  textoRemuneracaoColunaTabela,
  valorRemuneracaoOrdenacao,
  areaAtuacaoTabela,
  escalaEhPermitida,
  valorSelectEscala,
  tiposAcaoDisponiveis,
  abaDoCampoRhModal,
  type AbaFuncModal,
  type AbaPaginaRhFunc,
  type FormState,
  type FiltroStatusPrestador,
  type FiltroTipoAcaoHistoricoPrestador,
  type PrestadoresSortCol,
  type SliceContratacao,
} from "./gestaoPrestadorHelpers";
import { RhFuncModalHeaderDetalhes } from "./RhFuncModalHeaderDetalhes";

${componentBlock}
`;

fs.writeFileSync(path.join(dir, "index.tsx"), indexNew);

console.log("Gestao Prestador phase 1: gestaoPrestadorHelpers.ts, RhFuncModalHeaderDetalhes.tsx, index.tsx");
