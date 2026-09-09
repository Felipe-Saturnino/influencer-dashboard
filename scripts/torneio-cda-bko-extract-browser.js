/**
 * Extrai jogos BKO dos participantes do torneio CDA — modo incremental.
 *
 * Cole no Console do PLS Backoffice (aba find-players, logado) OU rode via CDP.
 *
 * Cache em memória: window.__TORNEIO_GAME_CACHE
 *   - 1ª execução: pagina newest-first até startedAt < periodoInicio
 *   - Syncs seguintes: para ao achar gameId já conhecido (só faltantes)
 *
 * Ao terminar: window.__TORNEIO_SNAP (ranking compacto) + atualiza o cache.
 * Depois: exportar snap → node scripts/torneio-cda-gravar-snap.mjs
 */
(async () => {
  const PERIODO_INICIO = "2026-09-03T19:54:18.957Z";
  const fromMs = Date.parse(PERIODO_INICIO);
  const toIso = new Date().toISOString();
  const toMs = Date.parse(toIso);

  const CDA_MESAS = new Set([
    "tableSG6134",
    "tableSG6131",
    "tableSG6132",
    "bacSG6133",
    "roSG6130",
  ]);

  const PARTICIPANTES = [
    { userName: "2205336", apelido: "Alessandro Tomazelli" },
    { userName: "2204772", apelido: "Eliane Luiza" },
    { userName: "2204766", apelido: "Fernando Luis" },
    { userName: "2204764", apelido: "Flavio Luis" },
    { userName: "2204743", apelido: "Humberto dos Anjos" },
    { userName: "2204823", apelido: "Pedro Alexandre" },
    { userName: "2204769", apelido: "Flavio Hirata" },
    { userName: "2204759", apelido: "Rodrigo Junqueira" },
    { userName: "2207973", apelido: "Renato Dias" },
    { userName: "2204755", apelido: "Luiz Viveiros" },
    { userName: "2208185", apelido: "Miqueas Marcelo" },
    { userName: "548736", apelido: "Rodrigo Simonini" },
    { userName: "2208087", apelido: "Bruno Yela" },
    { userName: "770840", apelido: "João Vitor" },
    { userName: "2210427", apelido: "Luis Carlos" },
    { userName: "2210442", apelido: "Matheus Tonetti" },
    { userName: "2210443", apelido: "Bruno Hopf" },
    { userName: "2210445", apelido: "Marcos Alexandre" },
  ];

  const PTS_RODADA = 500;
  const PTS_POR_REAL_APOSTADO = 100;
  const PTS_RODADA_GANHA = 1000;
  const PTS_POR_REAL_GANHO = 150;
  const PAGE = 50;

  if (!window.__TORNEIO_GAME_CACHE || window.__TORNEIO_GAME_CACHE.periodoInicio !== PERIODO_INICIO) {
    window.__TORNEIO_GAME_CACHE = {
      periodoInicio: PERIODO_INICIO,
      atualizadoEm: null,
      byUser: {},
    };
  }
  const cache = window.__TORNEIO_GAME_CACHE;

  function slimGame(g) {
    return {
      gameId: g.gameId,
      tableId: g.tableId,
      tableName: g.tableName ?? "",
      gameType: g.gameType ?? "",
      startedAt: g.startedAt,
      transactions: (g.transactions ?? []).map((tx) => ({
        bets: (tx.bets ?? []).map((b) => ({
          totals: {
            amount: Number(b.totals?.amount ?? 0),
            payout: Number(b.totals?.payout ?? 0),
            net: Number(b.totals?.net ?? 0),
          },
        })),
      })),
    };
  }

  function listaJogadores(json) {
    if (Array.isArray(json?.players)) return json.players;
    if (Array.isArray(json?.results)) return json.results;
    if (Array.isArray(json)) return json;
    return [];
  }

  function escolherJogador(json, userName) {
    const lista = listaJogadores(json);
    return (
      lista.find((p) => String(p.externalName ?? "").trim() === userName) ??
      lista.find((p) => String(p.playerId ?? "").includes(`.CDA-${userName}`)) ??
      null
    );
  }

  async function fetchPlayerMeta(userName) {
    for (const exactMatch of [true, false]) {
      const qs = new URLSearchParams({
        exactMatch: String(exactMatch),
        pattern: userName,
        limit: "10",
      });
      const res = await fetch(`/backoffice/api/players/search?${qs}`, { credentials: "include" });
      if (!res.ok) continue;
      const json = await res.json();
      const player = escolherJogador(json, userName);
      if (player) {
        return {
          userName,
          screenName: player.screenName ?? player.nickName ?? null,
          playerId: player.playerId ?? `casadeapostas.if_dgc.L011_358_56.CDA-${userName}`,
        };
      }
    }
    return {
      userName,
      screenName: null,
      playerId: `casadeapostas.if_dgc.L011_358_56.CDA-${userName}`,
    };
  }

  /** Newest-first; para ao achar game conhecido ou startedAt < inicio. */
  async function fetchNovosGames(playerId, knownIds) {
    const novos = [];
    let offset = 0;
    let hitKnown = false;
    let hitBefore = false;

    while (!hitKnown && !hitBefore) {
      const qs = new URLSearchParams({
        offset: String(offset),
        limit: String(PAGE),
        from: PERIODO_INICIO,
        to: toIso,
      });
      const url = `/backoffice/api/players/search/player/games/${encodeURIComponent(playerId)}?${qs}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${playerId}: HTTP ${res.status}`);
      const json = await res.json();
      const batch = json.games ?? [];
      if (!batch.length) break;

      for (const g of batch) {
        const started = Number(g.startedAt ?? 0);
        if (started && started < fromMs) {
          hitBefore = true;
          break;
        }
        if (started && started > toMs) continue;
        if (!CDA_MESAS.has(g.tableId)) continue;
        if (!g.gameId) continue;
        if (knownIds.has(g.gameId)) {
          hitKnown = true;
          break;
        }
        novos.push(slimGame(g));
      }

      if (batch.length < PAGE) break;
      offset += PAGE;
      if (offset > 5000) break;
    }
    return { novos, hitKnown, hitBefore };
  }

  function metricasRodada(g) {
    let amount = 0;
    let net = 0;
    for (const tx of g.transactions ?? []) {
      for (const b of tx.bets ?? []) {
        amount += Number(b.totals?.amount ?? 0);
        net += Number(b.totals?.net ?? 0);
      }
    }
    return { amount, net, ganhou: net > 0 };
  }

  function pontosDe(amount, net, ganhou) {
    let pts = PTS_RODADA + amount * PTS_POR_REAL_APOSTADO;
    if (ganhou) pts += PTS_RODADA_GANHA + net * PTS_POR_REAL_GANHO;
    return Math.round(pts);
  }

  let novosTotal = 0;
  for (const p of PARTICIPANTES) {
    const meta = await fetchPlayerMeta(p.userName);
    if (!cache.byUser[p.userName]) {
      cache.byUser[p.userName] = {
        apelido: p.apelido,
        screenName: meta.screenName,
        playerId: meta.playerId,
        gamesById: {},
      };
    }
    const slot = cache.byUser[p.userName];
    slot.apelido = p.apelido;
    slot.screenName = meta.screenName ?? slot.screenName;
    slot.playerId = meta.playerId;
    const known = new Set(Object.keys(slot.gamesById));
    const { novos } = await fetchNovosGames(meta.playerId, known);
    for (const g of novos) slot.gamesById[g.gameId] = g;
    novosTotal += novos.length;
    console.log(`${p.apelido}: +${novos.length} (cache ${Object.keys(slot.gamesById).length})`);
  }
  cache.atualizadoEm = new Date().toISOString();

  const ranking = [];
  let rodadasJogadas = 0;
  let rodadasGanhas = 0;
  let valorApostado = 0;
  const wins = [];

  for (const p of PARTICIPANTES) {
    const slot = cache.byUser[p.userName] || { gamesById: {} };
    let rj = 0;
    let rg = 0;
    let va = 0;
    let pts = 0;
    for (const g of Object.values(slot.gamesById)) {
      const m = metricasRodada(g);
      rj += 1;
      va += m.amount;
      pts += pontosDe(m.amount, m.net, m.ganhou);
      if (m.ganhou) {
        rg += 1;
        wins.push({
          userName: p.userName,
          apelido: p.apelido,
          gameId: g.gameId,
          gameType: g.gameType,
          tableName: g.tableName,
          valorNet: m.net,
          ocorridoEm: new Date(Number(g.startedAt)).toISOString(),
          _net: m.net,
        });
      }
    }
    rodadasJogadas += rj;
    rodadasGanhas += rg;
    valorApostado += va;
    ranking.push({
      userName: p.userName,
      apelido: p.apelido,
      rodadasJogadas: rj,
      rodadasGanhas: rg,
      valorApostado: va,
      pontos: pts,
      posicao: 0,
    });
  }

  ranking.sort((a, b) => b.pontos - a.pontos || b.rodadasGanhas - a.rodadasGanhas || a.apelido.localeCompare(b.apelido, "pt-BR"));
  ranking.forEach((r, i) => {
    r.posicao = i + 1;
  });

  wins.sort((a, b) => Date.parse(b.ocorridoEm) - Date.parse(a.ocorridoEm));
  const atividades = wins.slice(0, 15).map((w, i) => {
    const top = i === 0 || w._net >= 100;
    return {
      userName: w.userName,
      apelido: w.apelido,
      gameId: w.gameId,
      gameType: w.gameType,
      tableName: w.tableName,
      valorNet: w.valorNet,
      mensagem: top
        ? `${w.apelido} ganha R$\u00a0${w.valorNet.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} na última rodada`
        : `${w.apelido} ganha R$\u00a0${w.valorNet.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} em ${w.tableName}`,
      ocorridoEm: w.ocorridoEm,
    };
  });

  window.__TORNEIO_SNAP = {
    ranking,
    consolidado: { rodadasJogadas, rodadasGanhas, valorApostado },
    atividades,
    sincronizadoEm: new Date().toISOString(),
    periodo: { from: PERIODO_INICIO, to: toIso },
  };

  console.log(`Incremental: +${novosTotal} jogos · total ${rodadasJogadas} rodadas`);
  console.log("--- Top 5 ---");
  for (const r of ranking.slice(0, 5)) {
    console.log(`${r.posicao}. ${r.apelido} — ${r.pontos.toLocaleString("pt-BR")} pts · ${r.rodadasJogadas} rod.`);
  }
  return { novos: novosTotal, total: rodadasJogadas, top: ranking.slice(0, 5).map((r) => r.apelido) };
})();
