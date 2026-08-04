/**
 * Órfãos GP KPI filtrados ao time Game Presenter (org_time).
 *   node scripts/gp-kpi-orfaos-gp.mjs
 *   node scripts/gp-kpi-orfaos-gp.mjs --de=2026-07-01 --ate=2026-08-03
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

function arg(nome) {
  const p = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return p ? p.slice(nome.length + 3) : null;
}

function headers(serviceKey) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
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

function displayId(s) {
  return String(s ?? "").trim();
}

function ehGamePresenter(nomeTime) {
  return String(nomeTime ?? "")
    .trim()
    .toLowerCase()
    .includes("game presenter");
}

async function main() {
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.gp-kpi");
    process.exit(1);
  }

  const de = arg("de") ?? "2026-07-01";
  const ate = arg("ate") ?? "2026-08-03";

  console.log(`Filtro dia_brt: ${de} → ${ate}`);
  console.log("Escopo DI: apenas time Game Presenter (rh_org_times)\n");

  const [kpiRows, times, staffRows] = await Promise.all([
    fetchAll(
      supabaseUrl,
      `/rest/v1/gp_kpi_diario?select=game_presenter_id,funcionario_id,rodadas,dia_brt,table_id&dia_brt=gte.${de}&dia_brt=lte.${ate}&order=game_presenter_id`,
      serviceKey,
    ),
    fetchAll(supabaseUrl, "/rest/v1/rh_org_times?select=id,nome,status&order=nome", serviceKey),
    fetchAll(
      supabaseUrl,
      "/rest/v1/rh_funcionarios?select=id,nome,staff_id_operacional,status,org_time_id&staff_id_operacional=not.is.null&order=nome",
      serviceKey,
    ),
  ]);

  const timePorId = new Map(times.map((t) => [t.id, t]));
  const gpTimeIds = new Set(
    times.filter((t) => ehGamePresenter(t.nome)).map((t) => t.id),
  );

  console.log(
    "Times Game Presenter:",
    times
      .filter((t) => ehGamePresenter(t.nome))
      .map((t) => `${t.nome} (${t.status ?? "—"})`)
      .join("; ") || "(nenhum)",
  );

  const porWork = new Map();
  for (const r of kpiRows) {
    const k = chave(r.game_presenter_id);
    if (!k) continue;
    let agg = porWork.get(k);
    if (!agg) {
      agg = {
        workId: displayId(r.game_presenter_id),
        funcionario_id: r.funcionario_id ?? null,
        rodadas: 0,
        dias: new Set(),
        mesas: new Set(),
      };
      porWork.set(k, agg);
    }
    if (r.funcionario_id) agg.funcionario_id = r.funcionario_id;
    agg.rodadas += Number(r.rodadas) || 0;
    if (r.dia_brt) agg.dias.add(String(r.dia_brt).slice(0, 10));
    if (r.table_id) agg.mesas.add(String(r.table_id).trim());
  }

  /** Staff GP com ID operacional */
  const staffGpPorOp = new Map();
  let staffComIdOpTotal = 0;
  let staffGpComIdOp = 0;
  let staffOutrosComIdOp = 0;

  for (const s of staffRows) {
    staffComIdOpTotal += 1;
    const k = chave(s.staff_id_operacional);
    if (!k) continue;
    const time = timePorId.get(s.org_time_id);
    const isGp = s.org_time_id && gpTimeIds.has(s.org_time_id);
    if (!isGp) {
      staffOutrosComIdOp += 1;
      continue;
    }
    staffGpComIdOp += 1;
    if (staffGpPorOp.has(k)) continue;
    staffGpPorOp.set(k, {
      id: s.id,
      nome: (s.nome || "").trim() || "—",
      workId: displayId(s.staff_id_operacional),
      status: s.status ?? null,
      timeNome: time?.nome ?? "—",
    });
  }

  const grafanaSemStaff = [...porWork.values()]
    .filter((w) => !staffGpPorOp.has(chave(w.workId)))
    .sort((a, b) => b.rodadas - a.rodadas || a.workId.localeCompare(b.workId));

  // Tem staff GP no DI? (pode estar em outro time com mesmo código — raro)
  const grafanaSemStaffMasEmOutroTime = [];
  for (const w of grafanaSemStaff) {
    const k = chave(w.workId);
    const emOutro = staffRows.find((s) => chave(s.staff_id_operacional) === k);
    if (emOutro) {
      const t = timePorId.get(emOutro.org_time_id);
      grafanaSemStaffMasEmOutroTime.push({
        workId: w.workId,
        nome: emOutro.nome,
        time: t?.nome ?? "(sem time)",
        status: emOutro.status,
        rodadas: w.rodadas,
      });
    }
  }

  const staffGpSemGrafana = [...staffGpPorOp.values()]
    .filter((s) => !porWork.has(chave(s.workId)))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const vinculados = [...porWork.values()].filter((w) => staffGpPorOp.has(chave(w.workId)));

  console.log("\n=== RESUMO (só Game Presenter no DI) ===");
  console.log(`Linhas gp_kpi_diario:              ${kpiRows.length}`);
  console.log(`Work IDs na carga Grafana:         ${porWork.size}`);
  console.log(`Staff c/ ID op (todos os times):   ${staffComIdOpTotal}`);
  console.log(`  → Game Presenter:                ${staffGpComIdOp}`);
  console.log(`  → outros times (fora do escopo): ${staffOutrosComIdOp}`);
  console.log(`Vinculados (Grafana ∩ GP no DI):   ${vinculados.length}`);
  console.log(`A) Grafana sem GP no DI:           ${grafanaSemStaff.length}`);
  console.log(`B) GP no DI sem dados Grafana:     ${staffGpSemGrafana.length}`);

  console.log("\n=== A) Work IDs na carga SEM cadastro no time Game Presenter ===");
  if (!grafanaSemStaff.length) console.log("(nenhum)");
  else {
    console.log("work_id\trodadas\tdias\tmesas");
    for (const w of grafanaSemStaff) {
      console.log(`${w.workId}\t${w.rodadas}\t${w.dias.size}\t${w.mesas.size}`);
    }
  }

  if (grafanaSemStaffMasEmOutroTime.length) {
    console.log("\n--- Destes, já existem no DI mas em OUTRO time (não GP) ---");
    console.log("work_id\tnome\ttime\tstatus\trodadas");
    for (const x of grafanaSemStaffMasEmOutroTime) {
      console.log(`${x.workId}\t${x.nome}\t${x.time}\t${x.status}\t${x.rodadas}`);
    }
  }

  console.log("\n=== B) Game Presenter no DI SEM dados em gp_kpi_diario ===");
  if (!staffGpSemGrafana.length) console.log("(nenhum)");
  else {
    console.log("work_id\tnome\tstatus");
    for (const s of staffGpSemGrafana) {
      console.log(`${s.workId}\t${s.nome}\t${s.status ?? "—"}`);
    }
  }

  console.log("\nPronto.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
