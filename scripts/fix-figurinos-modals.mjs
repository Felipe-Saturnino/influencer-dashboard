import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/pages/estudio/Figurinos");

const sharedExtra = `
import type { RhFuncionario } from "../../../types/rhFuncionario";

export type PrestadorRetiradaRow = Pick<RhFuncionario, "id" | "nome" | "setor" | "status">;
`;

const sharedPath = path.join(dir, "figurinosModalShared.tsx");
let shared = fs.readFileSync(sharedPath, "utf8");
if (!shared.includes("PrestadorRetiradaRow")) {
  shared = shared.trimEnd() + sharedExtra;
  fs.writeFileSync(sharedPath, shared);
}

for (const file of fs.readdirSync(dir).filter((f) => f.startsWith("Modal") && f.endsWith(".tsx"))) {
  let c = fs.readFileSync(path.join(dir, file), "utf8");
  c = c.replace(/\n {2}labelCondicaoPeca,/g, "");
  if (!c.includes("labelCondicaoPeca")) {
    c = c.replace(
      /( {2}pecaSlugsOperadoras,\n)(} from "\.\/figurinosPageHelpers")/,
      "$1  labelCondicaoPeca,\n$2",
    );
  }
  fs.writeFileSync(path.join(dir, file), c);
}

// ModalRetirada extras
let ret = fs.readFileSync(path.join(dir, "ModalRetirada.tsx"), "utf8");
if (!ret.includes("PrestadorRetiradaRow")) {
  ret = ret.replace(
    'import { BarcodeBlock } from "./BarcodeBlock";',
    'import type { PrestadorRetiradaRow } from "./figurinosModalShared";\nimport { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";\nimport { FILTER_SEARCH_STAFF } from "../../../lib/searchBarConstants";\nimport { BarcodeBlock } from "./BarcodeBlock";',
  );
}
ret = ret.replace(/\ntype PrestadorRetiradaRow[\s\S]*$/m, "");
fs.writeFileSync(path.join(dir, "ModalRetirada.tsx"), ret);

// ModalScanner - remove trailing type
let scan = fs.readFileSync(path.join(dir, "ModalScanner.tsx"), "utf8");
scan = scan.replace(/\ntype PrestadorRetiradaRow[\s\S]*$/m, "");
fs.writeFileSync(path.join(dir, "ModalScanner.tsx"), scan);

// ModalSucessoCadastro
let suc = fs.readFileSync(path.join(dir, "ModalSucessoCadastro.tsx"), "utf8");
if (!suc.includes("FONT_TITLE")) {
  suc = suc.replace(
    'import { FONT } from "../../../constants/theme";',
    'import { FONT } from "../../../constants/theme";\nimport { FONT_TITLE } from "../../../lib/dashboardConstants";\nimport { baixarEtiquetaFigurinoPdf } from "../../../lib/rhFigurinoEtiquetaPdf";',
  );
}
fs.writeFileSync(path.join(dir, "ModalSucessoCadastro.tsx"), suc);

// ModalManutencaoPeca - BlocoResumo
let man = fs.readFileSync(path.join(dir, "ModalManutencaoPeca.tsx"), "utf8");
if (!man.includes("BlocoResumoPecaBasico")) {
  man = man.replace(
    'import { BarcodeBlock } from "./BarcodeBlock";',
    'import { BlocoResumoPecaBasico } from "./BlocoResumoPecaBasico";\nimport { BarcodeBlock } from "./BarcodeBlock";',
  );
}
fs.writeFileSync(path.join(dir, "ModalManutencaoPeca.tsx"), man);

console.log("Fixed figurinos modals");
