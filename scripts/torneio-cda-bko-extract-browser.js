/**
 * Extrai jogos BKO dos participantes do torneio CDA (cole no Console do PLS Backoffice logado).
 *
 * Pré-requisito: abrir https://bo2.sg.onairent.live/backoffice/static/bo/find-players
 *
 * Nome na UI = apelido travado abaixo (não Screen Name). Período = 03/09/2026 BRT.
 *   node scripts/torneio-cda-bko-sync.mjs --slug=cda-vip-setembro-2026 --arquivo=tmp/torneio-cda-bko.json
 */
(async () => {
  /** 03/09/2026 00:00–23:59:59 America/Sao_Paulo */
  const PERIODO = {
    from: "2026-09-03T03:00:00.000Z",
    to: "2026-09-04T02:59:59.999Z",
  };

  /** userName → nome travado na UI (primeiro + segundo nome) */
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

  const PAGE = 1000;

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

  async function fetchGames(playerId) {
    const out = [];
    let offset = 0;
    let total = Infinity;
    const qs = new URLSearchParams({
      offset: "0",
      limit: String(PAGE),
      from: PERIODO.from,
      to: PERIODO.to,
    });
    while (offset < total) {
      qs.set("offset", String(offset));
      const url = `/backoffice/api/players/search/player/games/${encodeURIComponent(playerId)}?${qs}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`${playerId}: HTTP ${res.status} ${await res.text()}`);
      }
      const json = await res.json();
      total = Number(json.count ?? 0);
      const batch = json.games ?? [];
      out.push(...batch);
      if (batch.length < PAGE) break;
      offset += PAGE;
    }
    return out;
  }

  const payload = {
    extraidoEm: new Date().toISOString(),
    periodo: PERIODO,
    participantes: [],
  };

  for (const p of PARTICIPANTES) {
    const meta = await fetchPlayerMeta(p.userName);
    console.log(`Buscando ${p.apelido} (${p.userName})…`);
    const games = await fetchGames(meta.playerId);
    payload.participantes.push({
      userName: p.userName,
      screenName: meta.screenName,
      apelido: p.apelido,
      playerId: meta.playerId,
      games,
    });
    console.log(`  → ${games.length} rodada(s)`);
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `torneio-cda-bko-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  a.click();
  console.log("Download iniciado.", payload);
  return payload;
})();
