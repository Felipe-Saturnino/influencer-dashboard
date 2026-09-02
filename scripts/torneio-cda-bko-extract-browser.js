/**
 * Extrai jogos BKO dos participantes do torneio CDA (cole no Console do PLS Backoffice logado).
 *
 * Pré-requisito: abrir https://bo2.sg.onairent.live/backoffice/static/bo/find-players
 *
 * Nome exibido no torneio = Screen Name do BKO (campo screenName na busca).
 * Ajuste PERIODO e PARTICIPANTES (User Names CDA) antes de rodar. O JSON alimenta:
 *   node scripts/torneio-cda-bko-sync.mjs --slug=... --arquivo=tmp/torneio-cda-bko.json
 */
(async () => {
  const PERIODO = {
    from: "2026-09-01T03:00:00.000Z",
    to: "2026-10-01T02:59:59.000Z",
  };

  /** User Name CDA (externalName) — não é apelido manual. */
  const USER_NAMES = ["1990329", "1989697", "1713222", "2152775", "2032222"];

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
          screenName: player.screenName ?? player.nickName ?? userName,
          playerId:
            player.playerId ??
            `casadeapostas.if_dgc.L011_358_56.CDA-${userName}`,
        };
      }
    }
    return {
      userName,
      screenName: userName,
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

  for (const userName of USER_NAMES) {
    const meta = await fetchPlayerMeta(userName);
    console.log(`Buscando ${meta.screenName} (${userName})…`);
    const games = await fetchGames(meta.playerId);
    payload.participantes.push({
      userName: meta.userName,
      screenName: meta.screenName,
      apelido: meta.screenName,
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
