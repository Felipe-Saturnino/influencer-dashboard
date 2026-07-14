import fs from "node:fs";
import XLSX from "xlsx";

const xlsxPath = process.argv[2] || "c:/Users/FelipeSaturnino/Downloads/Inscritos.xlsx";
const outPath =
  process.argv[3] ||
  "c:/Users/FelipeSaturnino/Downloads/inscritos_legado_rh_vaga_candidaturas.sql";

const wb = XLSX.readFile(xlsxPath);
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

const ORIGEM = {
  linkedin: "linkedin",
  indicação: "indicacao",
  indicacao: "indicacao",
  "site de vagas": "site_vagas",
  site_vagas: "site_vagas",
  instagram: "instagram",
  "site da spin": "site_spin",
  site_spin: "site_spin",
};

const ETAPAS = new Set([
  "inscritos",
  "aguardando_retorno",
  "agendado",
  "em_avaliacao",
  "stand_by",
  "contratado",
  "dispensado",
]);

function esc(s) {
  if (s == null || s === "") return "NULL";
  return `'${String(s).replace(/'/g, "''")}'`;
}

function excelTs(v) {
  if (v === "" || v == null) return "NULL";
  if (typeof v === "number") {
    const p = XLSX.SSF.parse_date_code(v);
    const iso = new Date(
      Date.UTC(p.y, p.m - 1, p.d, p.H || 0, p.M || 0, Math.floor(p.S || 0)),
    ).toISOString();
    return `'${iso}'`;
  }
  const s = String(v).trim();
  if (!s) return "NULL";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`data inválida: ${s}`);
  return `'${d.toISOString()}'`;
}

function phone(v) {
  if (v === "" || v == null) return "NULL";
  if (typeof v === "number") return esc(String(Math.round(v)));
  return esc(String(v).replace(/\.0$/, "").trim());
}

function turno(v) {
  const t = String(v || "").trim();
  if (!t) return "NULL";
  if (["Manhã", "Tarde", "Noite", "Comercial"].includes(t)) return esc(t);
  throw new Error(`turno inválido: ${t}`);
}

function origem(v) {
  const k = String(v || "")
    .trim()
    .toLowerCase();
  const m = ORIGEM[k];
  if (!m) throw new Error(`origem inválida: ${v}`);
  return esc(m);
}

function etapa(v) {
  const e = String(v || "inscritos")
    .trim()
    .toLowerCase();
  if (!ETAPAS.has(e)) throw new Error(`etapa inválida: ${v}`);
  return esc(e);
}

const lines = [];
const errors = [];

data.forEach((r, i) => {
  try {
    const codigo = String(r.codigo_vaga).trim();
    const nome = String(r.nome_completo).trim();
    const email = String(r.email).trim().toLowerCase();
    if (!codigo || !nome || !email) throw new Error("faltam codigo/nome/email");

    const created = excelTs(r.data_inscricao);
    const obs = String(r.observacao || "").trim();
    const carta = obs ? esc(obs) : "''";
    const cidade = String(r.cidade || "").trim();
    const redes = String(r.redes_sociais || "").trim();
    const quem = String(r.quem_indicou || "").trim();
    const portfolio = String(r.portfolio_url || "").trim();
    const motivo = String(r.motivo_dispensa || "").trim();

    lines.push(
      `(${[
        esc(codigo),
        esc(nome),
        esc(email),
        phone(r.telefone),
        cidade ? esc(cidade) : "''",
        redes ? esc(redes) : "NULL",
        origem(r.origem),
        quem ? esc(quem) : "NULL",
        portfolio ? esc(portfolio) : "NULL",
        turno(r.turno_trabalho),
        etapa(r.etapa),
        created,
        excelTs(r.data_agendamento),
        excelTs(r.data_aprovacao),
        excelTs(r.data_contratacao),
        excelTs(r.data_dispensa),
        motivo ? esc(motivo) : "NULL",
        carta,
        created,
      ].join(", ")})`,
    );
  } catch (e) {
    errors.push(`linha Excel ${i + 2}: ${e.message}`);
  }
});

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const codigos = [...new Set(data.map((r) => String(r.codigo_vaga).trim()))];
const codigosValues = codigos.map((c) => `    (${esc(c)})`).join(",\n");

const sql = `-- Legado candidaturas externas (Inscritos.xlsx) - ${data.length} linhas
-- origem_formulario = site | funcionario_id = NULL
-- Resolve vaga_id por codigo_vaga. Aborta se algum codigo nao existir.

BEGIN;

DO $$
DECLARE
  faltantes text;
BEGIN
  SELECT string_agg(DISTINCT c.codigo, ', ' ORDER BY c.codigo)
  INTO faltantes
  FROM (VALUES
${codigosValues}
  ) AS c(codigo)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.rh_vagas v WHERE v.codigo_vaga = c.codigo
  );
  IF faltantes IS NOT NULL THEN
    RAISE EXCEPTION 'codigo_vaga inexistente em rh_vagas: %', faltantes;
  END IF;
END $$;

INSERT INTO public.rh_vaga_candidaturas (
  vaga_id,
  funcionario_id,
  nome_completo,
  email,
  telefone,
  cidade,
  redes_sociais,
  origem,
  quem_indicou,
  portfolio_url,
  turno_trabalho,
  origem_formulario,
  etapa,
  etapa_entrada_em,
  data_agendamento,
  data_aprovacao,
  data_contratacao,
  data_dispensa,
  motivo_dispensa,
  funcao_atual,
  carta_apresentacao,
  curriculo_storage_path,
  curriculo_nome_arquivo,
  created_by,
  created_at,
  updated_at
)
SELECT
  v.id,
  NULL,
  s.nome_completo,
  s.email,
  s.telefone,
  s.cidade,
  s.redes_sociais,
  s.origem,
  s.quem_indicou,
  s.portfolio_url,
  s.turno_trabalho,
  'site',
  s.etapa,
  s.etapa_entrada_em::timestamptz,
  s.data_agendamento::timestamptz,
  s.data_aprovacao::timestamptz,
  s.data_contratacao::timestamptz,
  s.data_dispensa::timestamptz,
  s.motivo_dispensa,
  '',
  s.carta_apresentacao,
  NULL,
  NULL,
  NULL,
  s.created_at::timestamptz,
  s.created_at::timestamptz
FROM (
  VALUES
${lines.join(",\n")}
) AS s(
  codigo_vaga,
  nome_completo,
  email,
  telefone,
  cidade,
  redes_sociais,
  origem,
  quem_indicou,
  portfolio_url,
  turno_trabalho,
  etapa,
  created_at,
  data_agendamento,
  data_aprovacao,
  data_contratacao,
  data_dispensa,
  motivo_dispensa,
  carta_apresentacao,
  etapa_entrada_em
)
JOIN public.rh_vagas v ON v.codigo_vaga = s.codigo_vaga;

COMMIT;
`;

fs.writeFileSync(outPath, sql, "utf8");
console.log(`OK: ${lines.length} candidaturas → ${outPath}`);
console.log(`Vagas: ${codigos.join(", ")}`);
