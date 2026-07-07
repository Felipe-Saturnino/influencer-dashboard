/**
 * Lista prestadores cujo profiles.role diverge do organograma (matriz staff interno).
 * Uso: node scripts/audit-rh-prestador-perfil-organograma.mjs
 * Requer .env com VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY só se RLS permitir — preferir service role).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const path = resolve(root, ".env");
  try {
    const raw = readFileSync(path, "utf8");
    const env = {};
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

function normNome(s) {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/** Espelha resolvePerfilEscopo da Edge — só perfis staff pedidos na auditoria. */
function perfilEsperadoStaff(gerenciaNome, timeNome) {
  const g = normNome(gerenciaNome);
  if (g === "figurino") return "figurino";
  if (g === "comunicacao") return "comunicacao";
  if (g === "rh" || g === "recursos humanos") return "rh";
  if (g === "tech ops") return "tech_ops";

  const t = normNome(timeNome);
  if (t === "tech ops") return "tech_ops";
  if (t === "performance coach") return "performance_coach";
  if (t === "shift leader") return "shift_leader";
  if (t === "service manager") return "service_manager";

  return null;
}

function labelOrganograma(row) {
  if (row.org_time_nome) {
    return `Time: ${row.org_time_nome}${row.org_gerencia_nome ? ` (${row.org_gerencia_nome})` : ""}`;
  }
  if (row.org_gerencia_nome) return `Gerência: ${row.org_gerencia_nome}`;
  if (row.org_diretoria_nome) return `Diretoria: ${row.org_diretoria_nome}`;
  return row.setor?.trim() || "—";
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) no .env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: rows, error } = await supabase
  .from("rh_funcionarios")
  .select(
    `
    id,
    nome,
    status,
    email,
    email_spin,
    setor,
    org_time_id,
    org_gerencia_id,
    org_diretoria_id,
    rh_org_times:org_time_id ( nome, rh_org_gerencias:gerencia_id ( nome ) ),
    rh_org_gerencias:org_gerencia_id ( nome ),
    rh_org_diretorias:org_diretoria_id ( nome )
  `,
  )
  .neq("status", "encerrado");

if (error) {
  console.error("Erro ao carregar rh_funcionarios:", error.message);
  process.exit(1);
}

const emails = new Set();
for (const r of rows ?? []) {
  const spin = String(r.email_spin ?? "").trim().toLowerCase();
  const personal = String(r.email ?? "").trim().toLowerCase();
  if (spin.includes("@")) emails.add(spin);
  if (personal.includes("@")) emails.add(personal);
}

const emailList = [...emails];
const profileByEmail = new Map();

if (emailList.length > 0) {
  const chunk = 200;
  for (let i = 0; i < emailList.length; i += chunk) {
    const slice = emailList.slice(i, i + chunk);
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, email, role, ativo, name")
      .in("email", slice);
    if (pErr) {
      console.error("Erro ao carregar profiles:", pErr.message);
      process.exit(1);
    }
    for (const p of profiles ?? []) {
      profileByEmail.set(String(p.email).trim().toLowerCase(), p);
    }
  }
}

const divergentes = [];
const semLogin = [];
const ok = [];

for (const r of rows ?? []) {
  const timeRow = r.rh_org_times;
  const timeNome = timeRow?.nome ?? null;
  const gerenciaNome = r.rh_org_gerencias?.nome ?? timeRow?.rh_org_gerencias?.nome ?? null;
  const diretoriaNome = r.rh_org_diretorias?.nome ?? null;

  const esperado = perfilEsperadoStaff(gerenciaNome, timeNome);
  if (!esperado) continue;

  const spin = String(r.email_spin ?? "").trim().toLowerCase();
  const personal = String(r.email ?? "").trim().toLowerCase();
  const loginEmail = spin.includes("@") ? spin : personal.includes("@") ? personal : null;

  const rowFlat = {
    org_time_nome: timeNome,
    org_gerencia_nome: gerenciaNome,
    org_diretoria_nome: diretoriaNome,
    setor: r.setor,
  };

  if (!loginEmail) {
    semLogin.push({
      nome: r.nome,
      status: r.status,
      organograma: labelOrganograma(rowFlat),
      perfil_esperado: esperado,
    });
    continue;
  }

  const profile = profileByEmail.get(loginEmail);
  if (!profile) {
    semLogin.push({
      nome: r.nome,
      status: r.status,
      organograma: labelOrganograma(rowFlat),
      perfil_esperado: esperado,
      observacao: "Sem profile (e-mail cadastrado, login não criado)",
      email_login: loginEmail,
    });
    continue;
  }

  const atual = String(profile.role ?? "").trim();
  if (atual === esperado) {
    ok.push({ nome: r.nome, perfil: atual });
    continue;
  }

  divergentes.push({
    nome: r.nome,
    status: r.status,
    organograma: labelOrganograma(rowFlat),
    perfil_esperado: esperado,
    perfil_atual: atual || "—",
    profile_ativo: profile.ativo,
    email_login: loginEmail,
    rh_funcionario_id: r.id,
    profile_id: profile.id,
  });
}

divergentes.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

console.log(JSON.stringify({ total_divergentes: divergentes.length, total_sem_login: semLogin.length, divergentes, sem_login: semLogin }, null, 2));
