/**
 * Gera Excel fictício: 95 Game Presenters, 4×2 defasado,
 * 32 Manhã / 31 Tarde / 32 Noite → ~21 por turno/dia.
 * Mês de referência: agosto/2026.
 */
import ExcelJS from "exceljs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(
  __dirname,
  "..",
  "docs",
  "previews",
  "exemplo-escala-game-presenters-4x2-ago-2026-32-31-32.xlsx",
);

const NOMES_BASE = [
  "Ana Beatriz Costa", "Bruno Almeida", "Camila Ferreira", "Diego Santos", "Eduarda Lima",
  "Felipe Rocha", "Gabriela Martins", "Henrique Souza", "Isabela Nunes", "João Pedro Alves",
  "Karina Oliveira", "Lucas Mendes", "Mariana Barbosa", "Nicolas Teixeira", "Olivia Ramos",
  "Paulo Henrique Dias", "Queila Monteiro", "Rafael Cardoso", "Sofia Azevedo", "Thiago Moreira",
  "Úrsula Pinto", "Vitor Hugo Correia", "Wanessa Freitas", "Xavier Lopes", "Yasmin Castro",
  "Zeca Andrade", "Amanda Ribeiro", "Bernardo Duarte", "Carolina Pires", "Daniel Fonseca",
  "Elisa Guimarães", "Fabio Moura", "Giovana Rezende", "Hugo Batista", "Ingrid Peixoto",
  "Júlia Campos", "Kaique Nascimento", "Larissa Vieira", "Mateus Silveira", "Natália Borges",
  "Otávio Cunha", "Priscila Farias", "Renato Macedo", "Sabrina Tavares", "Tales Braga",
  "Valentina Melo", "William Siqueira", "Aline Vargas", "Caio Domingues", "Débora Leal",
  "Enzo Gabriel Prado", "Fernanda Aguiar", "Gustavo Henrique Barros", "Helena Coelho", "Igor Vasconcelos",
  "Jéssica Menezes", "Kevin Santana", "Lívia Cordeiro", "Murilo Paiva", "Nina Beltrão",
  "Otto Figueiredo", "Patrícia Guedes", "Quirino Assis", "Roberta Neves", "Samuel Dantas",
  "Tatiane Rabelo", "Ulisses Brandão", "Vitória Sales", "Wesley Couto", "Ágata Bittencourt",
  "Breno Queiroz", "Cecília Magalhães", "Davi Lucca Serra", "Esther Pimentel", "Francisco Neto",
  "Geovana Lacerda", "Heitor Caldas", "Íris Valente", "Jonas Escobar", "Kelly Regina Torres",
  "Leandro Padilha", "Mirella Sampaio", "Nathan Furtado", "Olívia Bezerra", "Pedro Lucas Antunes",
  "Raquel Chaves", "Sérgio Bastos", "Tainá Godoy", "Ubirajara Melo", "Vera Lúcia Franco",
  "Wagner Pacheco", "Yago Nogueira", "Zélia Amaral", "Alice Monteiro", "Bárbara Esteves",
];

const ANO = 2026;
const MES0 = 7; // agosto (0-based)
const DIAS_NO_MES = 31;

/** 4×2: trabalho se m < 4 no ciclo de 6; fase espalhada no turno. */
function valorDia(turnoSigla, idxNoTurno, diaDoMes) {
  // offset contínuo desde 2026-08-01
  const off = diaDoMes - 1;
  const fase = (idxNoTurno * 2) % 6; // 0,2,4,0,2,4... cobre 3 fases × 2 pessoas
  const m = ((off + fase) % 6 + 6) % 6;
  if (m >= 4) return "Folga";
  return turnoSigla;
}

function labelDia(isoDia) {
  const d = new Date(Date.UTC(ANO, MES0, isoDia));
  const dow = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][d.getUTCDay()];
  return `${isoDia} ${dow}`;
}

function montarDealers() {
  const turnos = [
    ...Array(32).fill({ turno: "Manhã", sigla: "MRN" }),
    ...Array(31).fill({ turno: "Tarde", sigla: "AFT" }),
    ...Array(32).fill({ turno: "Noite", sigla: "NGT" }),
  ];
  const dealers = [];
  let contPorTurno = { Manhã: 0, Tarde: 0, Noite: 0 };
  for (let i = 0; i < 95; i++) {
    const t = turnos[i];
    const idx = contPorTurno[t.turno]++;
    dealers.push({
      id: i + 1,
      nome: NOMES_BASE[i] ?? `Dealer Fictício ${i + 1}`,
      turno: t.turno,
      sigla: t.sigla,
      escala: "4x2",
      idxNoTurno: idx,
    });
  }
  return dealers;
}

async function main() {
  const dealers = montarDealers();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Spin Data Intelligence — exemplo";
  wb.created = new Date();

  // —— Aba Cadastro ——
  const wsCad = wb.addWorksheet("Cadastro", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  wsCad.columns = [
    { header: "ID", key: "id", width: 6 },
    { header: "Nome", key: "nome", width: 28 },
    { header: "Turno", key: "turno", width: 10 },
    { header: "Escala", key: "escala", width: 8 },
    { header: "Fase 4x2 (0–5)", key: "fase", width: 14 },
  ];
  for (const d of dealers) {
    wsCad.addRow({
      id: d.id,
      nome: d.nome,
      turno: d.turno,
      escala: d.escala,
      fase: (d.idxNoTurno * 2) % 6,
    });
  }
  styleHeader(wsCad);

  // —— Aba Escala Diária ——
  const wsEsc = wb.addWorksheet("Escala Diária Ago-2026", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 2 }],
  });
  const header1 = ["ID", "Nome", "Turno"];
  const header2 = ["", "", ""];
  for (let dia = 1; dia <= DIAS_NO_MES; dia++) {
    header1.push(labelDia(dia));
    header2.push(`${ANO}-08-${String(dia).padStart(2, "0")}`);
  }
  wsEsc.addRow(header1);
  wsEsc.addRow(header2);
  wsEsc.getRow(1).font = { bold: true };
  wsEsc.getColumn(1).width = 6;
  wsEsc.getColumn(2).width = 28;
  wsEsc.getColumn(3).width = 10;
  for (let c = 4; c <= 3 + DIAS_NO_MES; c++) wsEsc.getColumn(c).width = 9;

  const contagem = {
    Manhã: Array(DIAS_NO_MES).fill(0),
    Tarde: Array(DIAS_NO_MES).fill(0),
    Noite: Array(DIAS_NO_MES).fill(0),
  };

  for (const d of dealers) {
    const row = [d.id, d.nome, d.turno];
    for (let dia = 1; dia <= DIAS_NO_MES; dia++) {
      const v = valorDia(d.sigla, d.idxNoTurno, dia);
      row.push(v === "Folga" ? "Folga" : d.turno);
      if (v !== "Folga") contagem[d.turno][dia - 1] += 1;
    }
    wsEsc.addRow(row);
  }

  // cores leves por valor
  wsEsc.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return;
    for (let c = 4; c <= 3 + DIAS_NO_MES; c++) {
      const cell = row.getCell(c);
      const v = String(cell.value ?? "");
      if (v === "Folga") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
      } else if (v === "Manhã") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
      } else if (v === "Tarde") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
      } else if (v === "Noite") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE9D5FF" } };
      }
    }
  });

  // —— Aba Consolidado ——
  const wsCon = wb.addWorksheet("Consolidado", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const hCon = ["Turno", ...Array.from({ length: DIAS_NO_MES }, (_, i) => labelDia(i + 1))];
  wsCon.addRow(hCon);
  styleHeader(wsCon);
  wsCon.getColumn(1).width = 12;
  for (let c = 2; c <= 1 + DIAS_NO_MES; c++) wsCon.getColumn(c).width = 8;

  for (const turno of ["Manhã", "Tarde", "Noite"]) {
    wsCon.addRow([`Turno da ${turno === "Manhã" ? "Manhã" : turno}`, ...contagem[turno]]);
  }
  const totais = Array.from({ length: DIAS_NO_MES }, (_, i) =>
    contagem.Manhã[i] + contagem.Tarde[i] + contagem.Noite[i],
  );
  const rowTot = wsCon.addRow(["TOTAL", ...totais]);
  rowTot.font = { bold: true };

  // médias
  wsCon.addRow([]);
  wsCon.addRow(["Resumo", "Meta", "Média no mês", "Mín", "Máx"]);
  for (const turno of ["Manhã", "Tarde", "Noite"]) {
    const arr = contagem[turno];
    const media = arr.reduce((a, b) => a + b, 0) / arr.length;
    wsCon.addRow([
      turno,
      21,
      Math.round(media * 10) / 10,
      Math.min(...arr),
      Math.max(...arr),
    ]);
  }
  wsCon.addRow([]);
  wsCon.addRow([
    "Nota",
    "95 dealers fictícios · 32 Manhã + 31 Tarde + 32 Noite · escala 4×2 com fases defasadas (×2) · meta ~21/turno/dia",
  ]);

  // —— Legenda ——
  const wsLeg = wb.addWorksheet("Legenda");
  wsLeg.getColumn(1).width = 18;
  wsLeg.getColumn(2).width = 70;
  wsLeg.addRows([
    ["Campo", "Significado"],
    ["Escala 4x2", "4 dias de trabalho + 2 de folga, ciclo contínuo de 6 dias"],
    ["Fase", "Deslocamento no ciclo (0–5) para não concentrar folgas no mesmo dia"],
    ["Meta", "21 Game Presenters por turno (Manhã, Tarde, Noite)"],
    ["Pool", "≈32 pessoas por turno → média diária ≈ 32 × 4/6 ≈ 21,3"],
    ["Mês", "Agosto/2026 (exemplo)"],
    ["Uso", "Arquivo ilustrativo — nomes fictícios; não é carga na plataforma"],
  ]);
  styleHeader(wsLeg);

  mkdirSync(dirname(OUT), { recursive: true });
  await wb.xlsx.writeFile(OUT);
  console.log("Gerado:", OUT);
  console.log(
    "Médias:",
    Object.fromEntries(
      ["Manhã", "Tarde", "Noite"].map((t) => {
        const a = contagem[t];
        return [t, (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)];
      }),
    ),
  );
}

function styleHeader(ws) {
  const row = ws.getRow(1);
  row.font = { bold: true };
  row.alignment = { vertical: "middle" };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
