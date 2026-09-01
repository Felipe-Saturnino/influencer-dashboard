/**
 * Extrai jogos BKO dos participantes do torneio CDA (cole no Console do PLS Backoffice logado).
 *
 * Pré-requisito: abrir https://bo2.sg.onairent.live/backoffice/static/bo/find-players
 *
 * Ajuste PERIODO e PARTICIPANTES antes de rodar. O JSON baixado alimenta:
 *   node scripts/torneio-cda-bko-sync.mjs --slug=... --arquivo=tmp/torneio-cda-bko.json
 */
(async () => {
  const PERIODO = {
    from: "2026-05-01T03:00:00.000Z",
    to: "2026-06-01T02:59:59.000Z",
  };

  const PARTICIPANTES = [
    { userName: "1990329", nick: "Nathan", playerId: "casadeapostas.if_dgc.L011_358_56.CDA-1990329" },
    { userName: "1989697", nick: "Daci", playerId: "casadeapostas.if_dgc.L011_358_56.CDA-1989697" },
    { userName: "1713222", nick: "Gusti", playerId: "casadeapostas.if_dgc.L011_358_56.CDA-1713222" },
    { userName: "2152775", nick: "Matrix00", playerId: "casadeapostas.if_dgc.L011_358_56.CDA-2152775" },
    { userName: "2032222", nick: "DG", playerId: "casadeapostas.if_dgc.L011_358_56.CDA-2032222" },
  ];

  const PAGE = 1000;

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
    console.log(`Buscando ${p.nick} (${p.userName})…`);
    const games = await fetchGames(p.playerId);
    payload.participantes.push({ ...p, games });
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
