import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const geoPath = path.join(__dirname, "../docs/mockups/br-uf.geojson");
const outPath = path.join(__dirname, "../docs/mockups/brazil-states-paths.json");

const geo = JSON.parse(fs.readFileSync(geoPath, "utf8"));
const W = 800;
const H = 850;
const PAD = 16;

let minLon = Infinity;
let maxLon = -Infinity;
let minLat = Infinity;
let maxLat = -Infinity;

for (const f of geo.features) {
  const walk = (coords) => {
    if (typeof coords[0] === "number") {
      const [lon, lat] = coords;
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    } else {
      coords.forEach(walk);
    }
  };
  walk(f.geometry.coordinates);
}

const proj = ([lon, lat]) => [
  PAD + ((lon - minLon) / (maxLon - minLon)) * (W - 2 * PAD),
  PAD + ((maxLat - lat) / (maxLat - minLat)) * (H - 2 * PAD),
];

function simplifyRing(ring, step) {
  if (ring.length <= step + 2) return ring;
  const out = [ring[0]];
  for (let i = step; i < ring.length - 1; i += step) out.push(ring[i]);
  const last = ring[ring.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function ringToPath(ring, step = 6) {
  const r = simplifyRing(ring, step);
  return (
    r
      .map((c, i) => `${i === 0 ? "M" : "L"}${proj(c).map((n) => n.toFixed(1)).join(",")}`)
      .join(" ") + " Z"
  );
}

function geomToPath(geom, step) {
  if (geom.type === "Polygon") {
    return geom.coordinates.map((r) => ringToPath(r, step)).join(" ");
  }
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.map((p) => p.map((r) => ringToPath(r, step)).join(" ")).join(" ");
  }
  return "";
}

/** Código IBGE (codarea) → sigla UF */
const CODAREA_TO_UF = {
  11: "RO",
  12: "AC",
  13: "AM",
  14: "RR",
  15: "PA",
  16: "AP",
  17: "TO",
  21: "MA",
  22: "PI",
  23: "CE",
  24: "RN",
  25: "PB",
  26: "PE",
  27: "AL",
  28: "SE",
  29: "BA",
  31: "MG",
  32: "ES",
  33: "RJ",
  35: "SP",
  41: "PR",
  42: "SC",
  43: "RS",
  50: "MS",
  51: "MT",
  52: "GO",
  53: "DF",
};

const UF_NAMES = {
  RO: "Rondônia",
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

const states = geo.features
  .map((f) => {
    const cod = Number(f.properties?.codarea);
    const sigla =
      f.properties?.sigla ||
      CODAREA_TO_UF[cod] ||
      f.properties?.UF;
    const nome = UF_NAMES[sigla] || f.properties?.nome || sigla;
    return {
      sigla,
      nome,
      d: geomToPath(f.geometry, 8),
    };
  })
  .filter((s) => s.sigla && s.d)
  .sort((a, b) => a.sigla.localeCompare(b.sigla));

const payload = { viewBox: `0 0 ${W} ${H}`, states };
fs.writeFileSync(outPath, JSON.stringify(payload));
console.log(`Wrote ${states.length} states to ${outPath} (${fs.statSync(outPath).size} bytes)`);
