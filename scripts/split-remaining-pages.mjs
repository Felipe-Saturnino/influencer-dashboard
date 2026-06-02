import fs from "fs";
import path from "path";

function sliceLines(file, start, end) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  return lines.slice(start - 1, end).join("\n");
}

function write(p, content) {
  fs.writeFileSync(p, content);
}

// ─── Influencers ───────────────────────────────────────────────────────────
{
  const dir = path.join(process.cwd(), "src/pages/lives/Influencers");
  const idx = path.join(dir, "index.tsx");
  const sub = sliceLines(idx, 55, 258).replace(/^function /gm, "export function ");
  write(
    path.join(dir, "influencerUiComponents.tsx"),
    `import { useState, type ReactNode } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BRAND, FONT } from "../../../constants/theme";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import type { InfluencerModalTab, InfluencerPerfilStatus } from "./influencerTypes";

${sub}
`,
  );

  const types = sliceLines(idx, 1, 54);
  const typesOnly = types
    .split("\n")
    .filter((l) => l.startsWith("interface ") || l.startsWith("type ") || l.startsWith("const STATUS"))
    .join("\n")
    .replace(/^interface /gm, "export interface ")
    .replace(/^type /gm, "export type ")
    .replace(/^const STATUS/gm, "export const STATUS");

  write(path.join(dir, "influencerTypes.ts"), typesOnly + "\n");

  const modalImports = `import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BRAND, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { PlatLogo } from "../../../components/PlatLogo";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { InfluencerModalTabs } from "./influencerUiComponents";
import type { InfluencerRow } from "./influencerTypes";

`;

  write(
    path.join(dir, "ModalVisualizar.tsx"),
    modalImports + sliceLines(idx, 835, 1026).replace(/^function ModalVisualizar/, "export function ModalVisualizar"),
  );
  write(
    path.join(dir, "ModalPerfil.tsx"),
    modalImports +
      sliceLines(idx, 1027, fs.readFileSync(idx, "utf8").split(/\r?\n/).length).replace(
        /^function ModalPerfil/,
        "export function ModalPerfil",
      ),
  );

  const header = sliceLines(idx, 1, 54);
  const main = sliceLines(idx, 260, 834);
  const newIndex = `${header}
import { InfluencerModalTabs, SensitiveField, StatusBadge } from "./influencerUiComponents";
import { ModalVisualizar } from "./ModalVisualizar";
import { ModalPerfil } from "./ModalPerfil";

${main}`;
  write(idx, newIndex);
  console.log("Influencers done");
}

// ─── SocialMediaDashboard ──────────────────────────────────────────────────
{
  const dir = path.join(process.cwd(), "src/pages/dashboards/SocialMediaDashboard");
  const idx = path.join(dir, "index.tsx");
  const total = fs.readFileSync(idx, "utf8").split(/\r?\n/).length;
  const block = sliceLines(idx, 148, 569).replace(/^function /gm, "export function ");
  write(
    path.join(dir, "socialMediaBlocks.tsx"),
    sliceLines(idx, 1, 147) +
      `\n${block}`,
  );
  const main = sliceLines(idx, 570, total);
  write(
    idx,
    sliceLines(idx, 1, 147) +
      `\nimport {
  FunilSocialTresNiveis,
  PostCarouselThumb,
  SocialKpiCard,
  fmtComparativoMoM,
  fmtPeriodoSerieCell,
  fmtPostPublicacao,
  ggrCampanha,
  ordenarPostsRecentes,
  pctCamp,
  postStatPill,
  sumCampanhasPerf,
  totaisFromKpiRows,
} from "./socialMediaBlocks";

${main}`,
  );
  console.log("SocialMedia done");
}

// ─── GestaoOperadoras ────────────────────────────────────────────────────────
{
  const dir = path.join(process.cwd(), "src/pages/plataforma/GestaoOperadoras");
  const idx = path.join(dir, "index.tsx");
  const total = fs.readFileSync(idx, "utf8").split(/\r?\n/).length;
  write(
    path.join(dir, "gestaoOperadorasUi.ts"),
    sliceLines(idx, 44, 47).replace(/^function /, "export function "),
  );
  const modalBlock = sliceLines(idx, 451, total);
  write(
    path.join(dir, "ModalOperadora.tsx"),
    sliceLines(idx, 1, 43) +
      `\nimport { tableRowHoverBg } from "./gestaoOperadorasUi";\n` +
      modalBlock.replace(/^function ModalOperadora/, "export function ModalOperadora").replace(/^function timeDbToInput/, "export function timeDbToInput").replace(/^function normHex6/, "export function normHex6"),
  );
  write(
    idx,
    sliceLines(idx, 1, 43) +
      `\nimport { tableRowHoverBg } from "./gestaoOperadorasUi";\nimport { ModalOperadora } from "./ModalOperadora";\n\n` +
      sliceLines(idx, 49, 450),
  );
  console.log("GestaoOperadoras done");
}

// ─── GestaoMesas ───────────────────────────────────────────────────────────
{
  const dir = path.join(process.cwd(), "src/pages/plataforma/GestaoMesas");
  const idx = path.join(dir, "index.tsx");
  const total = fs.readFileSync(idx, "utf8").split(/\r?\n/).length;
  write(
    path.join(dir, "gestaoMesasUi.ts"),
    sliceLines(idx, 53, 76).replace(/^function /gm, "export function "),
  );
  write(
    path.join(dir, "ModalMesa.tsx"),
    sliceLines(idx, 1, 52) +
      `\nimport { nomeOperadoraJoin, tableRowHoverBg, tipoJogoInitial } from "./gestaoMesasUi";\n` +
      sliceLines(idx, 619, total)
        .replace(/^function tipoJogoInitial/, "export function tipoJogoInitial")
        .replace(/^function ModalMesa/, "export function ModalMesa"),
  );
  write(
    idx,
    sliceLines(idx, 1, 52) +
      `\nimport { nomeOperadoraJoin, tableRowHoverBg } from "./gestaoMesasUi";\nimport { ModalMesa } from "./ModalMesa";\n\n` +
      sliceLines(idx, 78, 618),
  );
  console.log("GestaoMesas done");
}
