#!/usr/bin/env node
/**
 * Bloqueia commit/push (e equivalentes) do agente — o usuário faz no Git UI/terminal.
 * Entrada: JSON em stdin (beforeShellExecution). Saída: permission allow|deny|ask.
 */
const fs = require("fs");

let raw = "";
try {
  raw = fs.readFileSync(0, "utf8");
} catch {
  raw = "";
}

let payload = {};
try {
  payload = JSON.parse(raw || "{}");
} catch {
  payload = {};
}

const command = String(payload.command || "");

const GIT_OPTS_WITH_ARG = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--super-prefix",
]);

const BLOCKED_GIT_SUBCOMMANDS = new Set([
  "commit",
  "push",
  "rebase",
  "merge",
  "cherry-pick",
  "am",
]);

/** Tokens respeitando aspas (paths com espaços). */
function tokenize(cmd) {
  const tokens = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(cmd)) !== null) {
    tokens.push(m[1] ?? m[2] ?? m[3]);
  }
  return tokens;
}

/** `git`, `git.exe`, `C:\...\git.exe`, `/usr/bin/git`, paths entre aspas. */
function isGitBinaryToken(token) {
  const s = String(token || "").replace(/^["']|["']$/g, "").replace(/\\/g, "/");
  return /(^|\/)git(\.exe)?$/i.test(s);
}

function isGhBinaryToken(token) {
  const s = String(token || "").replace(/^["']|["']$/g, "").replace(/\\/g, "/");
  return /(^|\/)gh(\.exe)?$/i.test(s);
}

function firstGitSubcommand(segment) {
  const tokens = tokenize(segment);
  const gitIdx = tokens.findIndex((t) => isGitBinaryToken(t));
  if (gitIdx < 0) return null;
  let i = gitIdx + 1;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.startsWith("-")) {
      const base = t.includes("=") ? t.slice(0, t.indexOf("=")) : t;
      if (GIT_OPTS_WITH_ARG.has(base) && !t.includes("=")) {
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    return t.toLowerCase();
  }
  return null;
}

function isBlockedGh(segment) {
  const tokens = tokenize(segment);
  const ghIdx = tokens.findIndex((t) => isGhBinaryToken(t));
  if (ghIdx < 0) return false;
  const a = (tokens[ghIdx + 1] || "").toLowerCase();
  const b = (tokens[ghIdx + 2] || "").toLowerCase();
  if (a === "pr" && ["create", "merge", "ready"].includes(b)) return true;
  if (a === "repo" && b === "sync") return true;
  return false;
}

function isBlockedGitWrite(cmd) {
  if (!cmd) return false;
  const parts = cmd.split(/&&|\|\||;|\n|\r/).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const left = part.split("|")[0].trim();
    const sub = firstGitSubcommand(left);
    if (sub && BLOCKED_GIT_SUBCOMMANDS.has(sub)) return true;
    if (isBlockedGh(left)) return true;
  }
  return false;
}

if (isBlockedGitWrite(command)) {
  process.stdout.write(
    JSON.stringify({
      permission: "deny",
      user_message:
        "Commit/push bloqueado pelo hook do Cursor. Faça o commit e o push você mesmo (Source Control ou terminal).",
      agent_message:
        "git commit/push (e equivalentes) estão bloqueados por política do usuário. Não tente contornar. Deixe as alterações locais e peça ao usuário para commitar/subir.",
    }),
  );
  process.exit(0);
}

process.stdout.write(JSON.stringify({ permission: "allow" }));
process.exit(0);
