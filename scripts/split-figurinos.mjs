import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/pages/estudio/Figurinos");
const lines = fs.readFileSync(path.join(dir, "index.tsx"), "utf8").split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join("\n");

const helpers = slice(72, 155).replace(/^function /gm, "export function ");
const blocoResumo = slice(156, 189).replace(/^function BlocoResumo/, "export function BlocoResumo");

fs.writeFileSync(path.join(dir, "figurinosPageHelpers.ts"), helpers + "\n");

const blocoResumoImports = `import type { ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import type { RhFigurinoEmprestimo, RhFigurinoPeca } from "./types";
import { labelEmprestadoParaTabela } from "./figurinosPageHelpers";

`;

fs.writeFileSync(path.join(dir, "BlocoResumoPecaBasico.tsx"), blocoResumoImports + blocoResumo);

const modalNames = [
  ["ModalCadastroPeca.tsx", 1262, 1555, "ModalCadastroPeca"],
  ["ModalSucessoCadastro.tsx", 1556, 1635, "ModalSucessoCadastro"],
  ["ModalScanner.tsx", 1636, 1695, "ModalScanner"],
  ["ModalRetirada.tsx", 1696, 2012, "ModalRetirada"],
  ["ModalDevolucao.tsx", 2013, 2253, "ModalDevolucao"],
  ["ModalManutencaoPeca.tsx", 2254, 2416, "ModalManutencaoPeca"],
  ["ModalDescartarPeca.tsx", 2417, 2557, "ModalDescartarPeca"],
  ["ModalDetalhe.tsx", 2558, lines.length, "ModalDetalhe"],
];

const modalHeader = `import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2, ScanLine, XCircle } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { Operadora } from "../../../types";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import type {
  RhFigurinoCondition,
  RhFigurinoEmprestimo,
  RhFigurinoPeca,
  RhFigurinoStatusHist,
  RhWithdrawalType,
} from "./types";
import {
  CATEGORIAS,
  TAMANHOS,
  TIPOS_MANUTENCAO,
  labelCondicaoPeca,
  labelStatusHistorico,
  labelStatusPeca,
  labelTipoRetirada,
  type RhFigurinoTipoManutencao,
} from "./figurinosConstants";
import {
  actorLabel,
  ctaButtonContent,
  emprestimoFigurinoEhDoProprioLogin,
  fmtDataHora,
  fmtDataSóDia,
  labelEmprestadoParaTabela,
  labelOperadorasPeca,
  normNomeParaFiltroPrestadorFig,
  pecaSlugsOperadoras,
} from "./figurinosPageHelpers";
import { BarcodeBlock } from "./BarcodeBlock";

`;

for (const [file, start, end, name] of modalNames) {
  let body = slice(start, end).replace(new RegExp(`^function ${name}`), `export function ${name}`);
  fs.writeFileSync(path.join(dir, file), modalHeader + body);
}

let main = slice(191, 1261);
main = main.replace("export default function FigurinosPage", "export default function FigurinosPage");
main = main.replace(/from "\.\/ScannerPanel"/, 'from "./ScannerPanel"');
// Add lazy scanner + modal imports at top of main file - we'll patch index separately

const indexHeader = slice(1, 70) + `
import { BlocoResumoPecaBasico } from "./BlocoResumoPecaBasico";
import {
  actorLabel,
  ctaButtonContent,
  emprestimoFigurinoEhDoProprioLogin,
  fmtDataHora,
  fmtDataSóDia,
  labelCondicaoPeca,
  labelEmprestadoParaTabela,
  labelOperadorasPeca,
  normNomeParaFiltroPrestadorFig,
  pecaSlugsOperadoras,
  tableRowHoverBg,
} from "./figurinosPageHelpers";
import { ModalCadastroPeca } from "./ModalCadastroPeca";
import { ModalDescartarPeca } from "./ModalDescartarPeca";
import { ModalDetalhe } from "./ModalDetalhe";
import { ModalDevolucao } from "./ModalDevolucao";
import { ModalManutencaoPeca } from "./ModalManutencaoPeca";
import { ModalRetirada } from "./ModalRetirada";
import { ModalScanner } from "./ModalScanner";
import { ModalSucessoCadastro } from "./ModalSucessoCadastro";

`;

// Remove duplicate helper functions from header (lines 72-155) and BlocoResumo from index
const indexTop = slice(1, 71);
const indexNew = indexTop + `
import { BlocoResumoPecaBasico } from "./BlocoResumoPecaBasico";
import {
  actorLabel,
  ctaButtonContent,
  emprestimoFigurinoEhDoProprioLogin,
  fmtDataHora,
  fmtDataSóDia,
  labelCondicaoPeca,
  labelEmprestadoParaTabela,
  labelOperadorasPeca,
  normNomeParaFiltroPrestadorFig,
  pecaSlugsOperadoras,
  tableRowHoverBg,
} from "./figurinosPageHelpers";
import { ModalCadastroPeca } from "./ModalCadastroPeca";
import { ModalDescartarPeca } from "./ModalDescartarPeca";
import { ModalDetalhe } from "./ModalDetalhe";
import { ModalDevolucao } from "./ModalDevolucao";
import { ModalManutencaoPeca } from "./ModalManutencaoPeca";
import { ModalRetirada } from "./ModalRetirada";
import { ModalScanner } from "./ModalScanner";
import { ModalSucessoCadastro } from "./ModalSucessoCadastro";

` + main;

fs.writeFileSync(path.join(dir, "index.tsx"), indexNew);

// Lazy load ScannerPanel in ModalScanner
const scannerPath = path.join(dir, "ModalScanner.tsx");
let scannerModal = fs.readFileSync(scannerPath, "utf8");
if (!scannerModal.includes("lazy")) {
  scannerModal = scannerModal.replace(
    'import { BarcodeBlock } from "./BarcodeBlock";',
    `import { lazy, Suspense } from "react";
import { BarcodeBlock } from "./BarcodeBlock";

const ScannerPanelLazy = lazy(() => import("./ScannerPanel").then((m) => ({ default: m.ScannerPanel })));`,
  );
}
fs.writeFileSync(scannerPath, scannerModal);

console.log("Figurinos split done — run build to fix imports");
