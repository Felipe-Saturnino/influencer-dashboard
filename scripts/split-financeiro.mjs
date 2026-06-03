/**
 * One-off: split Financeiro/index.tsx into modular files.
 * Run: node scripts/split-financeiro.mjs
 */
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/pages/aquisicao/Financeiro");
const src = fs.readFileSync(path.join(dir, "index.tsx"), "utf8");
const lines = src.split(/\r?\n/);

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

const typesBlock = slice(54, 147);
const constantsBlock = slice(148, 165);
const helpersBlock = slice(167, 310)
  .replace(/^function /gm, "export function ")
  .replace(/^const ROLES/gm, "export const ROLES");
const uiBlock = slice(312, 412).replace(/^function /gm, "export function ");
const modalAnalisar = slice(416, 668).replace(/^function ModalAnalisar/, "export function ModalAnalisar");
const modalPagar = slice(672, 817).replace(/^function ModalPagar/, "export function ModalPagar");
const modalAgente = slice(821, 979).replace(/^function ModalAgente/, "export function ModalAgente");
const blocoFiltros = slice(983, 993).replace(/^interface /, "export interface ");
const blocoKpis = slice(995, 1151).replace(/^function BlocoKpis/, "export function BlocoKpis");
const blocoCiclos = slice(1155, 2100).replace(/^function BlocoCiclos/, "export function BlocoCiclos");
const blocoConsolidado = slice(2102, 2594).replace(/^function BlocoConsolidado/, "export function BlocoConsolidado");
const mainComponent = slice(2598, 2968);

fs.writeFileSync(
  path.join(dir, "financeiroTypes.ts"),
  `import type { PagamentoStatus } from "../../../types";\n\n${typesBlock}\n`,
);

fs.writeFileSync(
  path.join(dir, "financeiroConstants.ts"),
  `import type { Role } from "../../../types";\n\n${constantsBlock}\n`,
);

fs.writeFileSync(
  path.join(dir, "financeiroCiclos.ts"),
  `import type { CicloPagamento, Role } from "../../../types";
import { MESES_NOMES } from "./financeiroConstants";

${helpersBlock}
`,
);

fs.writeFileSync(
  path.join(dir, "financeiroUi.tsx"),
  `import type { CSSProperties, ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BASE_COLORS, FONT } from "../../../constants/theme";

${uiBlock}
`,
);

const modalImports = `import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AlertTriangle, Banknote, CheckCircle2, Loader2, Plus, RotateCcw } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { fmtBRL, fmtHorasTotal } from "../../../lib/dashboardHelpers";
import { supabase } from "../../../lib/supabase";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import type { CicloPagamento } from "../../../types";
import type { FinanceiroLiveComResultado, FinanceiroLiveRow, PagamentoRow } from "./financeiroTypes";

`;

fs.writeFileSync(path.join(dir, "ModalAnalisar.tsx"), modalImports + modalAnalisar);
fs.writeFileSync(path.join(dir, "ModalPagar.tsx"), modalImports + modalPagar);
fs.writeFileSync(path.join(dir, "ModalAgente.tsx"), modalImports + modalAgente);
fs.writeFileSync(path.join(dir, "financeiroFiltros.ts"), blocoFiltros);

const blocoSharedImports = `import { useCallback, useEffect, useMemo, useState, Fragment, type CSSProperties } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { fmtBRL, fmtHorasTotal } from "../../../lib/dashboardHelpers";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { supabase } from "../../../lib/supabase";
import { enviarPagamentoEmailCiclo } from "../../../lib/financeiroEnviarPagamentoEmail";
import { buscarInvestimentoPago } from "../../../lib/investimentoPago";
import type { CicloPagamento, PagamentoStatus } from "../../../types";
import { SectionTitle, SortTableTh, type SortDir } from "../../../components/dashboard";
import { compareInfluencerPerfilStatus, compareLocaleTexto, compareNumber, comparePagamentoStatus } from "../../../lib/classificacaoSort";
import { getPageContentBoxStyle, getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles";
import { AlertTriangle, Banknote, CheckCircle2, ChevronRight, Clock, Loader2, Plus, RotateCcw } from "lucide-react";
import { STATUS_INFLUENCER, STATUS_PAG } from "./financeiroConstants";
import { cicloAberto, fmtCicloDatas, periodoDoMes, podeVerPagamentosAgenteFinanceiro } from "./financeiroCiclos";
import type {
  FinanceiroAgenteDbRow,
  FinanceiroHistoricoPagRow,
  FinanceiroLiveComResultado,
  FinanceiroLiveEscopoRow,
  FinanceiroLiveResultadoRow,
  FinanceiroPagamentoCicloEscopo,
  FinanceiroPagamentoDbRow,
  FinanceiroPagamentoParcial,
  FinanceiroPerfilCacheRow,
  FinanceiroPerfilRow,
  FinanceiroProfileRow,
  PagamentoRow,
} from "./financeiroTypes";
import type { BlocoFiltros } from "./financeiroFiltros";
import { Badge, BtnAcao, BtnPrimary, SelectInput } from "./financeiroUi";
import { ModalAgente } from "./ModalAgente";
import { ModalAnalisar } from "./ModalAnalisar";
import { ModalPagar } from "./ModalPagar";

`;

fs.writeFileSync(path.join(dir, "BlocoKpis.tsx"), blocoSharedImports + blocoKpis);
fs.writeFileSync(path.join(dir, "BlocoCiclos.tsx"), blocoSharedImports + blocoCiclos);
fs.writeFileSync(path.join(dir, "BlocoConsolidado.tsx"), blocoSharedImports + blocoConsolidado);

const indexImports = `import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { supabase } from "../../../lib/supabase";
import type { CicloPagamento } from "../../../types";
import { FiltroInfluencerSelect, FiltroHistoricoButton, FiltroOperadoraSelect } from "../../../components/dashboard";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageContentBoxStyle, getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { ROLES_PARIDADE_INFLUENCER, roleParidadeInfluencer } from "../../../lib/staffRoles";
import {
  cicloAberto,
  cicloSemanalParaData,
  gerarCiclosProativos,
  mesCalendarioDeHoje,
  opcoesMesesDoCarrossel,
  periodoDoMes,
  podeVerPagamentosAgenteFinanceiro,
} from "./financeiroCiclos";
import type {
  FinanceiroAgenteCicloEscopo,
  FinanceiroLiveEscopoRow,
  FinanceiroPagamentoCicloEscopo,
} from "./financeiroTypes";
import type { BlocoFiltros } from "./financeiroFiltros";
import { BlocoKpis } from "./BlocoKpis";
import { BlocoCiclos } from "./BlocoCiclos";
import { BlocoConsolidado } from "./BlocoConsolidado";

`;

fs.writeFileSync(path.join(dir, "index.tsx"), indexImports + mainComponent);

console.log("Financeiro split complete.");
