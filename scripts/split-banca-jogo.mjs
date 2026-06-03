import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/pages/aquisicao/BancaJogo");
const lines = fs.readFileSync(path.join(dir, "index.tsx"), "utf8").split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join("\n");

const types = slice(43, 80)
  .replace(/^type /gm, "export type ")
  .replace(/^interface /gm, "export interface ")
  .replace(/^const MESES/gm, "export const MESES")
  .replace(/^const STATUS/gm, "export const STATUS");

const helpers = slice(82, 160).replace(/^function /gm, "export function ");
const blocoFiltros = slice(162, 171).replace(/^interface /, "export interface ");

const modalImports = `import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { verificarElegibilidadeAgendaLive } from "../../../lib/influencerAgendaGate";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader, ModalConfirmDelete } from "../../../components/OperacoesModal";
import { Loader2 } from "lucide-react";
import type { BancaRowDb, BancaStatus, BancaStatusConta, BancaPerfilMapRow } from "./bancaJogoTypes";
import { STATUS_BANCA } from "./bancaJogoTypes";
import { fmtMoeda, formatarCPFVisivel, mascaraCPF } from "./bancaJogoHelpers";
import type { BlocoFiltros } from "./bancaJogoFiltros";

`;

const modals = [
  ["ModalBloqueioSolicitacaoCampanha.tsx", 173, 223, "ModalBloqueioSolicitacaoCampanha"],
  ["ModalSolicitar.tsx", 224, 473, "ModalSolicitar"],
  ["ModalAprovarBanca.tsx", 474, 572, "ModalAprovarBanca"],
  ["ModalConfirmLiberar.tsx", 573, 619, "ModalConfirmLiberar"],
  ["ModalAlterarStatusConta.tsx", 1134, 1259, "ModalAlterarStatusConta"],
];

for (const [file, start, end, name] of modals) {
  const body = slice(start, end).replace(new RegExp(`^function ${name}`), `export function ${name}`);
  fs.writeFileSync(path.join(dir, file), modalImports + body);
}

const blocoImports = `import { Fragment, useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE, MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { supabase } from "../../../lib/supabase";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { SectionTitle, SortTableTh, type SortDir } from "../../../components/dashboard";
import { compareAtivoBoolean, compareInfluencerPerfilStatus, compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import type { BancaRowDb, BancaStatus, BancaStatusConta } from "./bancaJogoTypes";
import { STATUS_BANCA } from "./bancaJogoTypes";
import {
  fmtMoeda,
  formatarCPFVisivel,
  mascaraCPF,
  periodoDoMes,
  rowInteressaConsolidado,
  rowNoMesSolicitacao,
  rowPassaFiltrosComunsBanca,
  rowPassaFiltrosKpiBanca,
} from "./bancaJogoHelpers";
import type { BlocoFiltros } from "./bancaJogoFiltros";
import { ModalAprovarBanca } from "./ModalAprovarBanca";
import { ModalAlterarStatusConta } from "./ModalAlterarStatusConta";
import { ModalBloqueioSolicitacaoCampanha } from "./ModalBloqueioSolicitacaoCampanha";
import { ModalConfirmLiberar } from "./ModalConfirmLiberar";
import { ModalSolicitar } from "./ModalSolicitar";

`;

fs.writeFileSync(path.join(dir, "bancaJogoTypes.ts"), types + "\n");
fs.writeFileSync(
  path.join(dir, "bancaJogoHelpers.ts"),
  `import type { BancaRowDb } from "./bancaJogoTypes";
import { MESES_NOMES } from "./bancaJogoTypes";
import type { BlocoFiltros } from "./bancaJogoFiltros";

${helpers}
`,
);
fs.writeFileSync(path.join(dir, "bancaJogoFiltros.ts"), `import type { BancaRowDb } from "./bancaJogoTypes";\n\n${blocoFiltros}\n`);

fs.writeFileSync(
  path.join(dir, "BlocoSolicitacoes.tsx"),
  blocoImports + slice(620, 1133).replace(/^function BlocoSolicitacoes/, "export function BlocoSolicitacoes"),
);
fs.writeFileSync(
  path.join(dir, "BlocoConsolidadoBanca.tsx"),
  blocoImports + slice(1260, 1717).replace(/^function BlocoConsolidadoBanca/, "export function BlocoConsolidadoBanca"),
);

const indexImports = `import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { FiltroInfluencerSelect, FiltroHistoricoButton, FiltroOperadoraSelect } from "../../../components/dashboard";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getPageFilterBoxStyle, getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles";
import { ROLES_PARIDADE_INFLUENCER, roleParidadeInfluencer } from "../../../lib/staffRoles";
import { gerarMeses, periodoDoMes } from "./bancaJogoHelpers";
import type { BlocoFiltros } from "./bancaJogoFiltros";
import { BlocoSolicitacoes } from "./BlocoSolicitacoes";
import { BlocoConsolidadoBanca } from "./BlocoConsolidadoBanca";

`;

fs.writeFileSync(path.join(dir, "index.tsx"), indexImports + slice(1718, lines.length));

console.log("BancaJogo split done");
