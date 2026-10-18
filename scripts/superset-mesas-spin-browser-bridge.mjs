/**
 * Gera expressões CDP curtas (fetch localhost → eval oneshot → POST save).
 * Imprime JSON: { network, dedicado, monthly } cada um { run, save } expressions.
 *
 * Pré-requisito: superset-mesas-spin-local-server.mjs rodando + oneshot gerados.
 */
const port = process.env.MESAS_SPIN_LOCAL_PORT || "18765";
const base = `http://127.0.0.1:${port}`;

function bridge(modo, winKey) {
  const run = `(async () => {
  const src = await fetch("${base}/oneshot-${modo}.js").then((r) => r.text());
  const p = (0, eval)(src);
  const out = await p;
  window.${winKey} = window.${winKey} || out;
  return { ok: true, keys: Object.keys(window.${winKey} || {}) };
})()`;
  const save = `(async () => {
  const body = JSON.stringify(window.${winKey});
  const r = await fetch("${base}/save/${modo}", { method: "POST", headers: { "Content-Type": "application/json" }, body });
  return { ok: r.ok, status: r.status, text: await r.text() };
})()`;
  return { run, save };
}

console.log(
  JSON.stringify(
    {
      network: bridge("network", "__mesasNet"),
      dedicado: bridge("dedicado", "__mesasDed"),
      monthly: bridge("monthly", "__mesasMon"),
    },
    null,
    0,
  ),
);
