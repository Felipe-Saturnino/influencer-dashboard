/**
 * Fase 1 Overview Spin: extrai tipos/helpers (linhas 91–1314) para overviewSpinLogic.ts
 * Run: node scripts/split-overview-spin-phase1.mjs
 */
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/pages/dashboards/OverviewSpin");
const src = fs.readFileSync(path.join(dir, "index.tsx"), "utf8");
const lines = src.split(/\r?\n/);

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

let logic = slice(91, 1314);
logic = logic
  .replace(/^interface /gm, "export interface ")
  .replace(/^type /gm, "export type ")
  .replace(/^const ([A-Z_])/gm, "export const $1")
  .replace(/^function /gm, "export function ");

const logicHeader = `import type { ReactNode } from "react";
import { BRAND } from "../../../lib/dashboardConstants";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import {
  JOGOS_IDENTIDADE_LISTA,
  type GameIdentityKey,
} from "../../../lib/gameIdentityColors";
import { supabase } from "../../../lib/supabase";

`;

fs.writeFileSync(path.join(dir, "overviewSpinLogic.ts"), logicHeader + logic + "\n");

const tabsBlock = slice(29, 38);
const componentBlock = slice(1316, lines.length);

const indexHeader = `import { Fragment, useState, useEffect, useMemo, useCallback, Suspense, lazy, type ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { CAROUSEL_NAV_BTN_PX, getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { BRAND, MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { fmtBRL, getIdxMesCarrosselPadrao, getPeriodoComparativoMoM } from "../../../lib/dashboardHelpers";
import { TooltipComparativoJogo, TooltipDetalheOperadoras } from "./overviewSpinChartTooltips";
import { labelCarrosselPos } from "../../../lib/lobbyMonitorHelpers";
import {
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
} from "../../../lib/pageContentBoxStyles";
import {
  GAME_IDENTITY_HEX,
  getGameMesaTituloMix,
  getGameMesaTituloStripStyle,
  type GameIdentityKey,
} from "../../../lib/gameIdentityColors";
import {
  type DailyRow,
  type MonthlyRow,
  type PorTabelaRow,
  type UapPorJogoPlanRow,
  type KpiJogoKey,
  type KpiJogoDef,
  type LinhaDetalheTab,
  type LinhaComparativoJogoTab,
  type MesaCadastroComparativoRow,
  type DailyRawRow,
  type MonthlyRawRow,
  KPI_UAP_VS_LEGENDA,
  getMesesDisponiveis,
  slugFromRelatorioOperadora,
  mapPorTabelaV2,
  filtrarPorEscopoOperadora,
  buildSlugListForMesasQueries,
  mergeDailyRowsPorData,
  mergeDailyRowsAgregadoTodasOperadoras,
  agregaDailyRawPorOperadoraNoMes,
  agregaDailyRawPorOperadoraNoDia,
  mergeUapPorJogoRows,
  buildUapPorJogoQuery,
  aggDailyMesKpi,
  linhasMesaAgregadasPorMes,
  linhaComparativoJogoAgregadaMes,
  agregarLinhasComparativoJogo,
  pickKpiMetricaDetalhe,
  renderValorKpiComparativo,
  mergeMonthlyHistoricoRows,
  mergeMonthlyHistoricoAgregadoTodas,
  mergeMonthlyUapArpuSingleMonth,
  mergeMonthlyUapArpuAgregadoTodas,
  nomeMesaParaExibicao,
  isMesaBlackjackComparativo,
  isMesaFutebolBrasileiro,
  labelMesaCda,
  fmtPct,
  fmtDiaMesPtBr,
  JOGOS_COMPARATIVO,
} from "./overviewSpinLogic";

const DashboardPosicionamento = lazy(() => import("./DashboardPosicionamento"));

import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Hash,
  LayoutDashboard,
  Loader2,
  MapPin,
  Table2,
  TrendingUp,
  Percent,
  ChartColumnBig,
  Users,
} from "lucide-react";
import KpiCard from "../../../components/dashboard/KpiCard";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import {
  MarginBadge,
  FiltroHistoricoButton,
  FiltroOperadoraSelect,
  FiltroBarTabButton,
  SkeletonKpiCard,
  DashboardPageHeader,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { FILTRO_BAR_TAB_ICON_SIZE, handleFiltroBarTabsArrowKeyDown } from "../../../lib/filterBarStyles";
import {
  createDataTableBlockStyles,
  getDataTableStyle,
  getDataTableWrapStyle,
} from "../../../lib/dataTableStyles";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

${tabsBlock}

`;

fs.writeFileSync(path.join(dir, "index.tsx"), indexHeader + componentBlock);

console.log("Overview Spin phase 1: overviewSpinLogic.ts + index.tsx updated");
