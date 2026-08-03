/**
 * Levantamento de órfãos Work ID ↔ ID operacional.
 *
 * A) Grafana/carga (gp_kpi_diario) sem staff no Data Intelligence
 * B) Staff com ID operacional no DI sem linhas em gp_kpi_diario (no período carregado)
 *
 * Uso (raiz do repo, com .env.gp-kpi):
 *   node scripts/gp-kpi-orfaos.mjs
 *   node scripts/gp-kpi-orfaos.mjs --de=2026-07-01 --ate=2026-07-31
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
    if (!res.ok) {
      throw new Error(`${path}: ${res.status} ${(await res.text()).slice(0, 400)}`);
    }
    const chunk = await res.json();
    out.push(...chunk);
    if (chunk.length < page) break;
    from += page;
  }
  return out;
}

function chave(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function displayId(s) {
  return String(s ?? "").trim();
}

async function main() {
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.gp-kpi");
    process.exit(1);
  }

  const de = arg("de");
  const ate = arg("ate");

  let pathKpi =
    "/rest/v1/gp_kpi_diario?select=game_presenter_id,funcionario_id,rodadas,dia_brt,table_id&order=game_presenter_id";
  if (de) pathKpi += `&dia_brt=gte.${de}`;
  if (ate) pathKpi += `&dia_brt=lte.${ate}`;

  console.log("Consultando Supabase…");
  if (de || ate) console.log(`Filtro dia_brt: ${de ?? "…"} → ${ate ?? "…"}`);

  const [kpiRows, staffRows, mesasOrfas] = await Promise.all([
    fetchAll(supabaseUrl, pathKpi, serviceKey),
    fetchAll(
      supabaseUrl,
      "/rest/v1/rh_funcionarios?select=id,nome,staff_id_operacional,status&staff_id_operacional=not.is.null&order=nome",
      serviceKey,
    ),
    fetchAll(
      supabaseUrl,
      "/rest/v1/gp_kpi_diario?select=table_id,mesa_id&mesa_id=is.null" +
        (de ? `&dia_brt=gte.${de}` : "") +
        (ate ? `&dia_brt=lte.${ate}` : ""),
      serviceKey,
    ),
  ]);

  /** @type {Map<string, { workId: string, funcionario_id: string|null, rodadas: number, dias: Set<string>, mesas: Set<string> }>} */
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

  /** @type {Map<string, { id: string, nome: string, workId: string, status: string|null }>} */
  const staffPorOp = new Map();
  const duplicadosStaff = [];
  for (const s of staffRows) {
    const k = chave(s.staff_id_operacional);
    if (!k) continue;
    if (staffPorOp.has(k)) {
      duplicadosStaff.push({
        workId: displayId(s.staff_id_operacional),
        nome: s.nome,
        id: s.id,
        outro: staffPorOp.get(k).nome,
      });
      continue;
    }
    staffPorOp.set(k, {
      id: s.id,
      nome: (s.nome || "").trim() || "—",
      workId: displayId(s.staff_id_operacional),
      status: s.status ?? null,
    });
  }

  // A) Grafana (carga) sem staff no DI
  const grafanaSemStaff = [...porWork.values()]
    .filter((w) => !staffPorOp.has(chave(w.workId)))
    .sort((a, b) => b.rodadas - a.rodadas || a.workId.localeCompare(b.workId));

  // Também: tem linha com funcionario_id null mas o código JÁ existe no staff
  // (carga antiga antes do vínculo — precisa reupsert)
  const grafanaComCodigoMasFkNula = [...porWork.values()]
    .filter((w) => staffPorOp.has(chave(w.workId)) && !w.funcionario_id)
    .map((w) => ({
      workId: w.workId,
      nome: staffPorOp.get(chave(w.workId)).nome,
      rodadas: w.rodadas,
      dias: w.dias.size,
    }))
    .sort((a, b) => b.rodadas - a.rodadas);

  // B) Staff com ID operacional sem dados no período carregado
  const staffSemGrafana = [...staffPorOp.values()]
    .filter((s) => !porWork.has(chave(s.workId)))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  // Vinculados OK
  const vinculados = [...porWork.values()].filter((w) => staffPorOp.has(chave(w.workId)));

  // Mesas órfãs
  const mesasSemCadastro = new Map();
  for (const r of mesasOrfas) {
    const tid = displayId(r.table_id);
    if (!tid) continue;
    mesasSemCadastro.set(tid.toLowerCase(), tid);
  }

  console.log("\n=== RESUMO ===");
  console.log(`Linhas gp_kpi_diario no filtro: ${kpiRows.length}`);
  console.log(`Work IDs distintos na carga:     ${porWork.size}`);
  console.log(`Staff com ID operacional (DI):   ${staffPorOp.size}`);
  console.log(`Vinculados (Work ID ∩ Staff):    ${vinculados.length}`);
  console.log(`A) Grafana sem Staff no DI:      ${grafanaSemStaff.length}`);
  console.log(`B) Staff no DI sem dados Grafana:${staffSemGrafana.length}`);
  console.log(`FK nula mas código já no Staff:  ${grafanaComCodigoMasFkNula.length}`);
  console.log(`IDs operacionais duplicados:     ${duplicadosStaff.length}`);
  console.log(`table_id sem mesa_id:            ${mesasSemCadastro.size}`);

  console.log("\n=== A) Work IDs na carga SEM cadastro de ID operacional no DI ===");
  if (grafanaSemStaff.length === 0) {
    console.log("(nenhum)");
  } else {
    console.log("work_id\trodadas\tdias\tmesas");
    for (const w of grafanaSemStaff) {
      console.log(`${w.workId}\t${w.rodadas}\t${w.dias.size}\t${w.mesas.size}`);
    }
  }

  console.log("\n=== B) ID operacional no DI SEM dados em gp_kpi_diario (período filtrado) ===");
  console.log("(pode ser GP sem atividade no período, ou ainda não carregado no Grafana)");
  if (staffSemGrafana.length === 0) {
    console.log("(nenhum)");
  } else {
    console.log("work_id\tnome\tstatus");
    for (const s of staffSemGrafana) {
      console.log(`${s.workId}\t${s.nome}\t${s.status ?? "—"}`);
    }
  }

  if (grafanaComCodigoMasFkNula.length) {
    console.log("\n=== Atenção: código existe no Staff mas funcionario_id ainda NULL na carga ===");
    console.log("(rode de novo o upsert do período para preencher o vínculo)");
    for (const w of grafanaComCodigoMasFkNula) {
      console.log(`${w.workId}\t${w.nome}\trodadas=${w.rodadas}\tdias=${w.dias}`);
    }
  }

  if (duplicadosStaff.length) {
    console.log("\n=== IDs operacionais duplicados no DI ===");
    for (const d of duplicadosStaff) {
      console.log(`${d.workId}\t${d.nome}\t(também em ${d.outro})`);
    }
  }

  if (mesasSemCadastro.size) {
    console.log("\n=== table_id sem mesa cadastrada (mesa_id null) ===");
    for (const tid of [...mesasSemCadastro.values()].sort()) {
      console.log(tid);
    }
  }

  console.log("\nPronto.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
