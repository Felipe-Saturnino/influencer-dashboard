/**
 * Reaplica vínculos mesa/staff em gp_kpi_diario a partir do cadastro atual
 * (sem nova extração Grafana). Útil após cadastrar ID operacional ou mesa.
 *
 *   node scripts/gp-kpi-relink.mjs
 *   node scripts/gp-kpi-relink.mjs --dry-run
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
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env) || process.env[k] === "") process.env[k] = v;
  }
}

carregarEnv(resolve(process.cwd(), ".env.gp-kpi"));

const dryRun = process.argv.includes("--dry-run");

function headers(serviceKey, extras = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extras,
  };
}

async function fetchAll(urlBase, path, serviceKey) {
  const out = [];
  const page = 1000;
  let from = 0;
  for (;;) {
    const to = from + page - 1;
    const res = await fetch(`${urlBase}${path}`, {
      headers: {
        ...headers(serviceKey),
        Range: `${from}-${to}`,
        Prefer: "count=exact",
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

function chave(s) {
  return String(s ?? "").trim().toLowerCase();
}

async function main() {
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.gp-kpi");
    process.exit(1);
  }

  console.log(dryRun ? "Modo: dry-run" : "Modo: produção (PATCH)");

  const [kpi, mesas, staff] = await Promise.all([
    fetchAll(
      supabaseUrl,
      "/rest/v1/gp_kpi_diario?select=dia_brt,ambiente,table_id,game_presenter_id,mesa_id,funcionario_id,estudio_slug,operadora_slug&or=(mesa_id.is.null,funcionario_id.is.null)&order=dia_brt",
      serviceKey,
    ),
    fetchAll(
      supabaseUrl,
      "/rest/v1/mesas_spin_cadastro?select=id,mesa_identificacao,estudio_slug,operadora_slug",
      serviceKey,
    ),
    fetchAll(
      supabaseUrl,
      "/rest/v1/rh_funcionarios?select=id,staff_id_operacional&staff_id_operacional=not.is.null",
      serviceKey,
    ),
  ]);

  const mesaPorId = new Map();
  for (const m of mesas) {
    const k = chave(m.mesa_identificacao);
    if (k) mesaPorId.set(k, m);
  }
  const staffPorOp = new Map();
  for (const s of staff) {
    const k = chave(s.staff_id_operacional);
    if (k && !staffPorOp.has(k)) staffPorOp.set(k, s);
  }

  let patchStaff = 0;
  let patchMesa = 0;
  let semStaff = new Set();
  let semMesa = new Set();

  for (const row of kpi) {
    const patch = {};
    const mesa = mesaPorId.get(chave(row.table_id));
    const st = staffPorOp.get(chave(row.game_presenter_id));

    if (!row.funcionario_id) {
      if (st) {
        patch.funcionario_id = st.id;
        patchStaff += 1;
      } else {
        semStaff.add(String(row.game_presenter_id).trim());
      }
    }
    if (!row.mesa_id) {
      if (mesa) {
        patch.mesa_id = mesa.id;
        patch.estudio_slug = mesa.estudio_slug ?? null;
        patch.operadora_slug = mesa.operadora_slug ?? null;
        patchMesa += 1;
      } else {
        semMesa.add(String(row.table_id).trim());
      }
    }

    if (Object.keys(patch).length === 0) continue;
    if (dryRun) continue;

    const qs = new URLSearchParams({
      dia_brt: `eq.${row.dia_brt}`,
      ambiente: `eq.${row.ambiente}`,
      table_id: `eq.${row.table_id}`,
      game_presenter_id: `eq.${row.game_presenter_id}`,
    });
    const res = await fetch(`${supabaseUrl}/rest/v1/gp_kpi_diario?${qs}`, {
      method: "PATCH",
      headers: headers(serviceKey, { Prefer: "return=minimal" }),
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      throw new Error(`PATCH falhou: ${res.status} ${(await res.text()).slice(0, 400)}`);
    }
  }

  console.log(`Linhas com FK nula: ${kpi.length}`);
  console.log(`Vínculos staff a aplicar: ${patchStaff}`);
  console.log(`Vínculos mesa a aplicar:  ${patchMesa}`);
  if (semStaff.size) console.log(`Ainda sem staff: ${[...semStaff].sort().join(", ")}`);
  if (semMesa.size) console.log(`Ainda sem mesa:  ${[...semMesa].sort().join(", ")}`);
  console.log(dryRun ? "Dry-run OK — rode sem --dry-run para gravar." : "Relink concluído.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
