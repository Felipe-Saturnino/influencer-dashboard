/**
 * Instala pre-commit em Node (sem Husky/bash — compatível com GitHub Desktop no Windows).
 * Corre em `npm install` via script `prepare`.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gitHooksDir = path.join(root, ".git", "hooks");
const preCommitPath = path.join(gitHooksDir, "pre-commit");

const HOOK = `#!/usr/bin/env node
/**
 * Pre-commit — lint-staged + testes (espelha parte do CI).
 * Ignorar uma vez: SKIP_SIMPLE_GIT_HOOKS=1 git commit ...
 */
import { execSync } from "node:child_process";

const opts = { stdio: "inherit", shell: true };

if (process.env.SKIP_SIMPLE_GIT_HOOKS === "1") {
  console.log("[INFO] SKIP_SIMPLE_GIT_HOOKS=1 — hook ignorado.");
  process.exit(0);
}

try {
  execSync("npm run precommit", opts);
  execSync("npm run test", opts);
} catch {
  process.exit(1);
}
`;

try {
  execSync("git config --local --unset core.hooksPath", { cwd: root, stdio: "ignore" });
} catch {
  /* já limpo */
}

if (!fs.existsSync(path.join(root, ".git"))) {
  console.log("[INFO] Sem pasta .git — hook não instalado (ex.: CI ou archive).");
  process.exit(0);
}

fs.mkdirSync(gitHooksDir, { recursive: true });
fs.writeFileSync(preCommitPath, HOOK, { mode: 0o755 });
console.log("[INFO] Git pre-commit instalado (Node).");
