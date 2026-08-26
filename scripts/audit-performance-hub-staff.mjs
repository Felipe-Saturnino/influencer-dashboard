/**
 * Audita prestadores GP/Shuffler visíveis em Staff vs elegíveis no Performance Hub.
 * Uso: node scripts/audit-performance-hub-staff.mjs [--nome=Yasmim]
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function carregarEnv(caminho) {
  if (!existsSync(caminho)) return;
  for (const linha of readFileSync(caminho, "utf8").split(/\r?\n/)) {
    const t = linha.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env) || process.env[k] === "") process.env[k] = v;
  }
}

carregarEnv(resolve(process.cwd(), ".env"));

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!url || !key) {
  console.error("Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou anon) em .env");
  process.exit(1);
}

function norm(s) {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function phExactGp(nomeTime) {
  const t = norm(nomeTime);
  return t === "game presenter" || t === "game presenters";
}

function phIncludesGp(nomeTime) {
  return norm(nomeTime).includes("game presenter");
}

function phExactSh(nomeTime) {
  const t = norm(nomeTime);
  return t === "shuffler" || t === "shufflers";
}

function phIncludesSh(nomeTime) {
  return norm(nomeTime).includes("shuffler");
}

async function fetchAll(path) {
  const out = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const to = from + page - 1;
    const res = await fetch(`${url}${path}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${to}`,
      },
    });
    if (!res.ok) throw new Error(`${path}: ${res.status} ${(await res.text()).slice(0, 400)}`);
    const chunk = await res.json();
    out.push(...chunk);
    if (chunk.length < page) break;
    from += page;
  }
  return out;
}

function arg(nome) {
  const p = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return p ? p.slice(nome.length + 3) : null;
}

async function main() {
  console.log(`Auth: ${hasService ? "service_role" : "anon (RLS pode limitar)"}`);

  const times = await fetchAll(
    "/rest/v1/rh_org_times?select=id,nome,status,gerencia_id&status=eq.ativo&order=nome.asc",
  );
  const gerencias = await fetchAll("/rest/v1/rh_org_gerencias?select=id,nome,status");
  const gerenciaPorId = new Map(gerencias.map((g) => [g.id, g]));

  const timePorId = new Map(times.map((t) => [t.id, t]));

  const phTimeIdsExact = new Set();
  const phTimeIdsIncludes = new Set();
  for (const t of times) {
    if (phExactGp(t.nome) || phExactSh(t.nome)) phTimeIdsExact.add(t.id);
    if (phIncludesGp(t.nome) || phIncludesSh(t.nome)) phTimeIdsIncludes.add(t.id);
  }

  const funcionarios = await fetchAll(
    "/rest/v1/rh_funcionarios?select=id,nome,status,org_time_id,staff_live_no_estudio,data_inicio&status=in.(ativo,indisponivel)&order=nome.asc",
  );

  const filtroNome = arg("nome");
  const rows = funcionarios.filter((f) => {
    const time = f.org_time_id ? timePorId.get(f.org_time_id) : null;
    const nomeTime = time?.nome ?? "";
    const incluiGpSh = phIncludesGp(nomeTime) || phIncludesSh(nomeTime);
    if (!incluiGpSh) return false;
    if (filtroNome && !norm(f.nome).includes(norm(filtroNome))) return false;
    return true;
  });

  const excluidosExact = rows.filter((f) => !phTimeIdsExact.has(f.org_time_id));
  const incluidosExact = rows.filter((f) => phTimeIdsExact.has(f.org_time_id));

  console.log(`\nTimes GP/Shuffler (includes): ${phTimeIdsIncludes.size} | PH exact match: ${phTimeIdsExact.size}`);

  const variantTimes = times.filter((t) => {
    const gp = phIncludesGp(t.nome);
    const sh = phIncludesSh(t.nome);
    if (!gp && !sh) return false;
    return !phExactGp(t.nome) && !phExactSh(t.nome);
  });
  if (variantTimes.length) {
    console.log("\nTimes com nome GP/Shuffler fora do match exacto do PH:");
    for (const t of variantTimes) {
      const g = gerenciaPorId.get(t.gerencia_id);
      console.log(`  - "${t.nome}" (${g?.nome ?? "?"}) id=${t.id}`);
    }
  }

  if (excluidosExact.length) {
    console.log(`\n${excluidosExact.length} prestador(es) GP/Shuffler EXCLUÍDOS do PH (match exacto):`);
    for (const f of excluidosExact) {
      const time = timePorId.get(f.org_time_id);
      console.log(
        `  - ${f.nome} | time="${time?.nome ?? "?"}" | go-live=${f.staff_live_no_estudio ?? "—"} | início=${f.data_inicio ?? "—"}`,
      );
    }
  } else {
    console.log("\nNenhum GP/Shuffler ativo excluído pelo match exacto de nome de time.");
  }

  const nomeBusca = filtroNome ?? "Yasmim";
  const yasmim = funcionarios.filter((f) => norm(f.nome).includes(norm(nomeBusca)));
  if (yasmim.length) {
    console.log(`\n--- Busca "${nomeBusca}" ---`);
    for (const f of yasmim) {
      const time = f.org_time_id ? timePorId.get(f.org_time_id) : null;
      const g = time ? gerenciaPorId.get(time.gerencia_id) : null;
      const inPhExact = f.org_time_id && phTimeIdsExact.has(f.org_time_id);
      const inPhIncludes = f.org_time_id && phTimeIdsIncludes.has(f.org_time_id);
      console.log(JSON.stringify({
        nome: f.nome,
        status: f.status,
        time: time?.nome ?? null,
        gerencia: g?.nome ?? null,
        noPerformanceHubExact: Boolean(inPhExact),
        noPerformanceHubIncludes: Boolean(inPhIncludes),
        staff_live_no_estudio: f.staff_live_no_estudio,
        data_inicio: f.data_inicio,
      }, null, 2));
    }
  }

  console.log(`\nTotal GP/Shuffler ativos/indisponíveis (includes): ${rows.length}`);
  console.log(`Incluídos no PH hoje (exact): ${incluidosExact.length}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
