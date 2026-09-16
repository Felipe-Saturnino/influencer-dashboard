#!/usr/bin/env node
/**
 * Diagnóstico read-only da aba Streamers → Jogadores.
 *
 * Responde três perguntas em uma passada:
 *   1. O que o Revenue Sentinel gravou (datas, buckets, mesas) em jogadores_metricas_diarias?
 *   2. O que a dimensão `jogadores` diz do lifetime Spin (jogou_spin, rodadas, primeira/última)?
 *   3. O que a regra atual do front devolveria por competência vs. a regra de coorte lifetime?
 *
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (lidos de .env.gp-kpi / .env.bko-pls / .env.local).
 * Nada é escrito no banco. Nenhum segredo é impresso.
 *
 * Uso: node scripts/diagnostico-jogadores-aba.mjs [--desde 2025-12-01]
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ARQUIVOS_ENV = [".env.gp-kpi", ".env.bko-pls", ".env.local", ".env"];
const OPERADORA = "casa_apostas";
const PAGE = 1000;

function carregarEnv() {
  for (const arquivo of ARQUIVOS_ENV) {
    const caminho = resolve(process.cwd(), arquivo);
    if (!existsSync(caminho)) continue;
    for (const linha of readFileSync(caminho, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(linha);
      if (!m) continue;
      const valor = m[2].trim().replace(/^["']|["']$/g, "");
      if (valor && !process.env[m[1]]) process.env[m[1]] = valor;
    }
  }
}

function arg(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
}

function mes(dataIso) {
  return String(dataIso ?? "").slice(0, 7);
}

function num(v) {
  return typeof v === "number" ? v : Number(v ?? 0) || 0;
}

function fmt(n, casas = 0) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

async function selectAll(base, key, tabela, query) {
  const linhas = [];
  for (let from = 0; ; from += PAGE) {
    const url = `${base}/rest/v1/${tabela}?${query}`;
    const res = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + PAGE - 1}`,
        "Range-Unit": "items",
      },
    });
    if (!res.ok) throw new Error(`${tabela} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const pagina = await res.json();
    linhas.push(...pagina);
    if (pagina.length < PAGE) break;
  }
  return linhas;
}

function tabelaTexto(titulo, colunas, linhas) {
  const larguras = colunas.map((c, i) =>
    Math.max(c.length, ...linhas.map((l) => String(l[i] ?? "").length)),
  );
  const linha = (vals) => vals.map((v, i) => String(v ?? "").padEnd(larguras[i])).join("  ");
  console.log(`\n### ${titulo}`);
  console.log(linha(colunas));
  console.log(larguras.map((w) => "-".repeat(w)).join("  "));
  for (const l of linhas) console.log(linha(l));
}

async function main() {
  carregarEnv();
  const base = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!base || !key) {
    console.error(
      "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ex.: em .env.gp-kpi). A anon key não lê estas tabelas.",
    );
    process.exit(1);
  }
  const desde = arg("desde", "2025-12-01");

  const [diarias, cadastro, logs] = await Promise.all([
    selectAll(
      base,
      key,
      "jogadores_metricas_diarias",
      new URLSearchParams({
        select:
          "data,ext_customer_id,influencer_id,cda_conta,registration_count,deposit_count,rodadas_spin,apostas_spin,ggr_spin,turnover_spin,jogou_spin,jogou_outros,rodadas_por_jogo,rodadas_por_mesa,fonte",
        operadora_slug: `eq.${OPERADORA}`,
        cda_conta: "eq.influencers",
        data: `gte.${desde}`,
        order: "data.asc",
      }).toString(),
    ),
    selectAll(
      base,
      key,
      "jogadores",
      new URLSearchParams({
        select:
          "ext_customer_id,influencer_id,registrado_em,jogou_spin,jogou_outros,rodadas_spin,ggr_spin,turnover_spin,primeira_rodada_spin,ultima_rodada_spin,atualizado_em",
        operadora_slug: `eq.${OPERADORA}`,
        cda_conta: "eq.influencers",
      }).toString(),
    ),
    selectAll(
      base,
      key,
      "sync_logs",
      new URLSearchParams({
        select: "*",
        integracao_slug: "eq.revenue_sentinel",
        order: "id.desc",
      }).toString(),
    ).catch((e) => [{ erro: e.message }]),
  ]);

  console.log(`\n## Diagnóstico aba Jogadores — desde ${desde}`);
  console.log(
    `linhas diárias=${fmt(diarias.length)} · jogadores no cadastro=${fmt(cadastro.length)} · sync_logs RS=${fmt(logs.length)}`,
  );

  // ---------------------------------------------------------------- sync_logs
  const ultimos = logs.slice(0, 8).filter((l) => !l.erro);
  if (ultimos.length) {
    tabelaTexto(
      "1. Últimos syncs Revenue Sentinel (sync_logs)",
      ["quando", "status", "período", "inseridos", "cadastro", "erros", "mensagem"],
      ultimos.map((l) => [
        String(l.executado_em ?? l.criado_em ?? l.created_at ?? "").slice(0, 19),
        l.status,
        `${l.periodo_inicio ?? "—"} → ${l.periodo_fim ?? "—"}`,
        fmt(num(l.registros_inseridos)),
        fmt(num(l.registros_atualizados)),
        fmt(num(l.erros_count)),
        String(l.mensagem_erro ?? "").slice(0, 60),
      ]),
    );
  } else {
    console.log("\n### 1. sync_logs — sem leitura", logs[0]?.erro ?? "(vazio)");
  }

  // ------------------------------------------------- distribuição por dia (RS)
  const porData = new Map();
  for (const r of diarias) {
    const d = porData.get(r.data) ?? { rodadas: 0, jogadores: new Set(), registros: 0 };
    d.rodadas += num(r.rodadas_spin);
    if (num(r.rodadas_spin) > 0) d.jogadores.add(r.ext_customer_id);
    d.registros += num(r.registration_count);
    porData.set(r.data, d);
  }
  const diasComRodada = [...porData.entries()]
    .filter(([, d]) => d.rodadas > 0)
    .sort((a, b) => b[1].rodadas - a[1].rodadas);
  tabelaTexto(
    "2. Onde as rodadas Spin estão carimbadas (top 15 dias)",
    ["data", "rodadas", "jogadores c/ rodada", "é dia 1 do mês?"],
    diasComRodada
      .slice(0, 15)
      .map(([data, d]) => [data, fmt(d.rodadas), fmt(d.jogadores.size), data.endsWith("-01") ? "sim" : "NÃO"]),
  );
  console.log(
    `dias distintos com rodada: ${diasComRodada.length} · meses distintos: ${new Set(diasComRodada.map(([d]) => mes(d))).size}`,
  );

  // ------------------------------------------------------- panorama mensal
  const meses = new Map();
  const getMes = (m) => {
    let x = meses.get(m);
    if (!x) {
      x = {
        registros: new Set(),
        comRodadaNoMes: new Set(),
        comDepositoNoMes: new Set(),
        rodadas: 0,
        rodadasDeQuemRegistrouNoMes: 0,
        ggr: 0,
        turnover: 0,
        linhasComMesa: 0,
        linhasComJogo: 0,
        rodadasSemDetalhe: 0,
      };
      meses.set(m, x);
    }
    return x;
  };

  const registroDoJogador = new Map(); // ext -> mês do primeiro registro na diária
  const rodadasPorJogador = new Map(); // ext -> total rodadas no recorte
  const mesesComRodadaPorJogador = new Map(); // ext -> Set(mês)

  for (const r of diarias) {
    const m = mes(r.data);
    const x = getMes(m);
    const rodadas = num(r.rodadas_spin);
    if (num(r.registration_count) > 0 && r.influencer_id) {
      x.registros.add(r.ext_customer_id);
      const atual = registroDoJogador.get(r.ext_customer_id);
      if (!atual || m < atual) registroDoJogador.set(r.ext_customer_id, m);
    }
    if (num(r.deposit_count) > 0) x.comDepositoNoMes.add(r.ext_customer_id);
    if (rodadas > 0) {
      x.comRodadaNoMes.add(r.ext_customer_id);
      x.rodadas += rodadas;
      x.ggr += num(r.ggr_spin);
      x.turnover += num(r.turnover_spin);
      rodadasPorJogador.set(r.ext_customer_id, (rodadasPorJogador.get(r.ext_customer_id) ?? 0) + rodadas);
      const set = mesesComRodadaPorJogador.get(r.ext_customer_id) ?? new Set();
      set.add(m);
      mesesComRodadaPorJogador.set(r.ext_customer_id, set);
      const mesas = Array.isArray(r.rodadas_por_mesa) ? r.rodadas_por_mesa : [];
      const jogos = r.rodadas_por_jogo && typeof r.rodadas_por_jogo === "object" ? r.rodadas_por_jogo : {};
      if (mesas.length > 0) x.linhasComMesa += 1;
      if (Object.keys(jogos).length > 0) x.linhasComJogo += 1;
      const detalhadas =
        mesas.reduce((s, mm) => s + num(mm?.rodadas), 0) ||
        Object.values(jogos).reduce((s, v) => s + num(v), 0);
      x.rodadasSemDetalhe += Math.max(0, rodadas - detalhadas);
    }
  }

  tabelaTexto(
    "3. Por competência — o que a regra ATUAL do front enxerga (registro e rodada no mesmo mês)",
    [
      "mês",
      "registros",
      "jogaram spin (mês)",
      "rodadas (mês)",
      "rodadas s/ mesa",
      "linhas c/ mesa",
      "GGR",
      "turnover",
    ],
    [...meses.entries()]
      .sort()
      .map(([m, x]) => {
        const coorteSpin = [...x.registros].filter((e) => x.comRodadaNoMes.has(e));
        return [
          m,
          fmt(x.registros.size),
          fmt(coorteSpin.length),
          fmt(x.rodadas),
          fmt(x.rodadasSemDetalhe),
          fmt(x.linhasComMesa),
          fmt(x.ggr, 2),
          fmt(x.turnover, 2),
        ];
      }),
  );

  // ---------------------------------------- últimos dias com registro (sync TAP)
  const ultimasDatasRegistro = [...porData.entries()]
    .filter(([data, d]) => d.registros > 0 && data >= "2026-08-01")
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));
  tabelaTexto(
    "3a. Últimos dias com registro gravado (fase de IDs do sync TAP)",
    ["data", "registros"],
    ultimasDatasRegistro.map(([data, d]) => [data, fmt(d.registros)]),
  );

  // -------------------------------------- registros mapeados vs. sem UTM/influencer
  const regPorMes = new Map();
  for (const r of diarias) {
    if (num(r.registration_count) <= 0) continue;
    const m = mes(r.data);
    const x = regPorMes.get(m) ?? { mapeados: new Set(), semInfluencer: new Set(), linhas: 0 };
    x.linhas += 1;
    if (r.influencer_id) x.mapeados.add(r.ext_customer_id);
    else x.semInfluencer.add(r.ext_customer_id);
    regPorMes.set(m, x);
  }
  tabelaTexto(
    "3b. Registros por competência — mapeados vs. sem influencer_id",
    ["mês", "linhas c/ registro", "IDs mapeados", "IDs sem influencer_id"],
    [...regPorMes.entries()]
      .sort()
      .map(([m, x]) => [m, fmt(x.linhas), fmt(x.mapeados.size), fmt(x.semInfluencer.size)]),
  );

  // ------------------------- cruzamento com o agregado TAP (influencer_metricas)
  const agregado = await selectAll(
    base,
    key,
    "influencer_metricas",
    new URLSearchParams({
      select: "data,registration_count",
      operadora_slug: `eq.${OPERADORA}`,
      data: `gte.${desde}`,
    }).toString(),
  ).catch(() => []);
  if (agregado.length) {
    const agPorMes = new Map();
    for (const r of agregado) {
      agPorMes.set(mes(r.data), (agPorMes.get(mes(r.data)) ?? 0) + num(r.registration_count));
    }
    tabelaTexto(
      "3c. Registros: agregado TAP (influencer_metricas) vs. por jogador (jogadores_metricas_diarias)",
      ["mês", "agregado TAP", "linhas por jogador", "cobertura"],
      [...agPorMes.entries()].sort().map(([m, total]) => {
        const porJogador = regPorMes.get(m)?.linhas ?? 0;
        return [
          m,
          fmt(total),
          fmt(porJogador),
          total > 0 ? `${((porJogador / total) * 100).toFixed(0)}%` : "—",
        ];
      }),
    );
  }

  // ------------------------------------------- coorte lifetime (regra pedida)
  const cadastroPorExt = new Map(cadastro.map((c) => [c.ext_customer_id, c]));
  tabelaTexto(
    "4. Por competência — coorte LIFETIME (registro no mês × jogou Spin em qualquer mês)",
    [
      "mês registro",
      "registros",
      "spin no mesmo mês",
      "spin em outro mês",
      "spin lifetime (cadastro)",
      "rodadas lifetime",
    ],
    [...meses.entries()]
      .sort()
      .map(([m, x]) => {
        let mesmoMes = 0;
        let outroMes = 0;
        let lifetimeCadastro = 0;
        let rodadasLifetime = 0;
        for (const ext of x.registros) {
          if (registroDoJogador.get(ext) !== m) continue;
          const mesesRodada = mesesComRodadaPorJogador.get(ext);
          if (mesesRodada?.has(m)) mesmoMes += 1;
          else if (mesesRodada && mesesRodada.size > 0) outroMes += 1;
          const c = cadastroPorExt.get(ext);
          if (c?.jogou_spin) lifetimeCadastro += 1;
          rodadasLifetime += num(c?.rodadas_spin);
        }
        return [
          m,
          fmt(x.registros.size),
          fmt(mesmoMes),
          fmt(outroMes),
          fmt(lifetimeCadastro),
          fmt(rodadasLifetime),
        ];
      }),
  );

  // --------------------------------------------------------- dimensão jogadores
  const comSpin = cadastro.filter((c) => c.jogou_spin);
  const rodadasCadastro = cadastro.reduce((s, c) => s + num(c.rodadas_spin), 0);
  const rodadasDiarias = [...rodadasPorJogador.values()].reduce((s, v) => s + v, 0);
  const primeiras = comSpin.map((c) => String(c.primeira_rodada_spin ?? "").slice(0, 10)).filter(Boolean);
  const ultimas = comSpin.map((c) => String(c.ultima_rodada_spin ?? "").slice(0, 10)).filter(Boolean);
  console.log("\n### 5. Dimensão `jogadores` (lifetime do RS)");
  console.log(`jogadores influencers: ${fmt(cadastro.length)} · jogou_spin=true: ${fmt(comSpin.length)}`);
  console.log(
    `rodadas no cadastro: ${fmt(rodadasCadastro)} · rodadas somadas nas diárias: ${fmt(rodadasDiarias)} · diferença: ${fmt(rodadasCadastro - rodadasDiarias)}`,
  );
  console.log(
    `primeira_rodada_spin: ${primeiras.length ? `${primeiras.sort()[0]} → ${primeiras.sort().at(-1)}` : "—"} · ultima_rodada_spin: ${ultimas.length ? `${ultimas.sort()[0]} → ${ultimas.sort().at(-1)}` : "—"}`,
  );
  const orfaos = comSpin.filter((c) => !registroDoJogador.has(c.ext_customer_id));
  console.log(
    `jogou_spin sem registro mapeado na diária do recorte: ${fmt(orfaos.length)} (não entram em nenhuma competência)`,
  );
  if (orfaos.length) {
    const porCausa = new Map();
    for (const c of orfaos) {
      const causa = !c.influencer_id
        ? "sem influencer_id"
        : !c.registrado_em
          ? "sem registrado_em"
          : c.registrado_em < desde
            ? `registrado antes de ${desde}`
            : `registrado em ${mes(c.registrado_em)} sem linha registration_count>0`;
      porCausa.set(causa, (porCausa.get(causa) ?? 0) + 1);
    }
    for (const [causa, n] of [...porCausa].sort((a, b) => b[1] - a[1])) {
      console.log(`   · ${causa}: ${fmt(n)}`);
    }
  }

  // ------------------------------------------------------------- inconsistências
  console.log("\n### 6. Achados automáticos");
  const achados = [];
  const mesesSemRodada = [...meses.entries()].filter(([, x]) => x.rodadas === 0).map(([m]) => m);
  if (mesesSemRodada.length) achados.push(`Competências sem nenhuma rodada gravada: ${mesesSemRodada.join(", ")}`);
  const diasForaDoDia1 = diasComRodada.filter(([d]) => !d.endsWith("-01"));
  if (diasForaDoDia1.length) {
    achados.push(
      `Rodadas carimbadas fora do dia 1 (bucket antigo): ${diasForaDoDia1.slice(0, 5).map(([d, x]) => `${d} (${fmt(x.rodadas)})`).join(", ")}`,
    );
  }
  const semMesa = [...meses.values()].reduce((s, x) => s + x.rodadasSemDetalhe, 0);
  if (semMesa > 0) achados.push(`Rodadas sem quebra por mesa/jogo: ${fmt(semMesa)} (caem em “Mesa não informada”)`);
  const flagIncoerente = diarias.filter((r) => r.jogou_spin === true && num(r.rodadas_spin) === 0).length;
  if (flagIncoerente > 0) achados.push(`Linhas com jogou_spin=true e rodadas_spin=0: ${fmt(flagIncoerente)}`);
  const registrosSemInfluencer = diarias.filter(
    (r) => num(r.registration_count) > 0 && !r.influencer_id,
  ).length;
  if (registrosSemInfluencer > 0) {
    achados.push(`Registros sem influencer_id (fora de todos os KPIs): ${fmt(registrosSemInfluencer)} linhas`);
  }
  if (rodadasCadastro !== rodadasDiarias) {
    achados.push(
      `Cadastro e diárias divergem em rodadas (${fmt(rodadasCadastro)} vs ${fmt(rodadasDiarias)}) — cadastro só é reescrito com atualizar_cadastro=true`,
    );
  }
  if (achados.length === 0) console.log("nenhum achado automático");
  for (const a of achados) console.log(`- ${a}`);
  console.log("");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
