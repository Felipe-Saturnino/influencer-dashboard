/**
 * Gera Políticas Internas de Imagem no formato Word leve
 * (mesmo padrão de Politica_Descumprimentos_Contratuais - Manual Gestão).
 *
 * Uso: node scripts/generate-politica-imagem-docx.mjs acessorios
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const FONT = "Calibri";
const SIZE_BODY = 22; // 11pt
const SIZE_TITLE = 28; // 14pt
const SIZE_SECTION = 24; // 12pt
const SIZE_SMALL = 18; // 9pt
const SIZE_HEADER = 20; // 10pt

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 160, before: opts.before ?? 0, line: 276 },
    ...opts.paragraph,
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts.size ?? SIZE_BODY,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color,
      }),
    ],
  });
}

function sectionTitle(num, title) {
  return new Paragraph({
    spacing: { before: 280, after: 140, line: 276 },
    children: [
      new TextRun({
        text: `${num}. ${title}`,
        font: FONT,
        size: SIZE_SECTION,
        bold: true,
      }),
    ],
  });
}

function subTitle(text) {
  return new Paragraph({
    spacing: { before: 200, after: 80, line: 276 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: SIZE_BODY,
        bold: true,
      }),
    ],
  });
}

function labelLine(label, color) {
  return new Paragraph({
    spacing: { before: 120, after: 60, line: 276 },
    children: [
      new TextRun({
        text: label,
        font: FONT,
        size: SIZE_BODY,
        bold: true,
        color,
      }),
    ],
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { after: 80, line: 276 },
    indent: { left: 360 },
    children: [
      new TextRun({
        text: `• ${text}`,
        font: FONT,
        size: SIZE_BODY,
      }),
    ],
  });
}

function numberedItem(n, text) {
  return new Paragraph({
    spacing: { after: 80, line: 276 },
    indent: { left: 360 },
    children: [
      new TextRun({
        text: `${n}. ${text}`,
        font: FONT,
        size: SIZE_BODY,
      }),
    ],
  });
}

function metaCell(label, value) {
  return new TableCell({
    width: { size: 4500, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
    },
    children: [
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: label, font: FONT, size: SIZE_SMALL, bold: true }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: value, font: FONT, size: SIZE_BODY }),
        ],
      }),
    ],
  });
}

function rolesTable(rows) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };

  const header = new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 2800, type: WidthType.DXA },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "PAPEL", font: FONT, size: SIZE_SMALL, bold: true }),
            ],
          }),
        ],
      }),
      new TableCell({
        borders,
        width: { size: 6200, type: WidthType.DXA },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "RESPONSABILIDADE",
                font: FONT,
                size: SIZE_SMALL,
                bold: true,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const body = rows.map(
    ([papel, resp]) =>
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 2800, type: WidthType.DXA },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: papel, font: FONT, size: SIZE_BODY }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders,
            width: { size: 6200, type: WidthType.DXA },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: resp, font: FONT, size: SIZE_BODY }),
                ],
              }),
            ],
          }),
        ],
      }),
  );

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [2800, 6200],
    rows: [header, ...body],
  });
}

function buildAcessoriosChildren() {
  return [
    p("POLÍTICA INTERNA", { bold: true, size: SIZE_TITLE, after: 80 }),
    p("Política de Acessórios e Joias – Uso Interno Gestão Spin Gaming", {
      italics: true,
      after: 200,
    }),

    new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: [4500, 4500],
      rows: [
        new TableRow({
          children: [
            metaCell("ÁREA RESPONSÁVEL", "Performance Coach"),
            metaCell("APROVADO POR", "Recursos Humanos / Diretoria"),
          ],
        }),
      ],
    }),

    sectionTitle("1", "OBJETIVO"),
    p(
      "Estabelecer os padrões de uso de anéis, brincos, piercings, colares, correntes e pulseiras para os Prestadores de Serviços que atuam em frente às câmeras na operação da Spin Gaming — incluindo Game Presenter, Shuffler, Service Manager e Shift Leader quando em frente à câmera —, garantindo uma apresentação visual discreta, padronizada e segura para a operação ao vivo.",
    ),

    sectionTitle("2", "ABRANGÊNCIA E APLICAÇÃO"),
    p(
      "Aplica-se a todos os Prestadores de Serviços que atuam em frente às câmeras na operação da Spin Gaming — incluindo, entre outras, as funções de Game Presenter, Shuffler, Service Manager e Shift Leader quando estiverem em frente à câmera —, independentemente de gênero.",
    ),
    p(
      "Não se aplica a colaboradores que não atuam em câmera, nem a Service Manager e Shift Leader quando estiverem fora do ambiente de câmera.",
    ),
    p("Fora do escopo desta política (tratados em documentos próprios):", {
      bold: true,
      after: 80,
    }),
    bullet("Óculos e lentes."),
    bullet("Acessórios de cabelo (grampos, elásticos, tiaras, contas em tranças)."),
    bullet("Meia-calça, cinto e demais complementos de figurino."),
    bullet(
      "Acessórios oficiais exigidos pelo uniforme (quando houver) — prevalecem sobre joias pessoais, desde que usados conforme o padrão do figurino.",
    ),

    sectionTitle("3", "DIRETRIZES GERAIS"),
    p(
      "Princípio: na dúvida, priorizar visual discreto. Se a peça chama mais atenção que o uniforme ou a condução do jogo, deve ser removida ou substituída antes do turno.",
    ),

    subTitle("3.1 Anéis"),
    labelLine("Permitido", "1F7A3A"),
    bullet("Um único anel de casamento, discreto e clássico, no dedo anelar."),
    bullet(
      "Game Presenter de Roleta: o anel de casamento deve ser utilizado exclusivamente na mão esquerda.",
    ),
    labelLine("Não permitido", "C62828"),
    bullet("Anéis adicionais (qualquer dedo)."),
    bullet("Pedras no anel de casamento, independentemente do tamanho."),
    bullet(
      "Detalhes que possam arranhar ou danificar equipamentos, cartas, chips ou superfícies de mesa.",
    ),

    subTitle("3.2 Brincos"),
    labelLine("Permitido", "1F7A3A"),
    bullet("Brincos pequenos, elegantes e discretos."),
    bullet(
      "Segundo furo na orelha, desde que a peça seja pequena, discreta e compatível com o padrão visual.",
    ),
    bullet(
      "Argola pequena no primeiro furo e brinco pequeno (pino/stud) no segundo furo.",
    ),
    bullet("Brincos pequenos (pino/stud) em ambos os furos."),
    labelLine("Não permitido", "C62828"),
    bullet("Argolas em ambos os furos (primeira e segunda fileira)."),
    bullet("Brincos com pedrarias, cristais, strass ou pedras."),
    bullet(
      "Brincos grandes, chamativos, brilhantes, barulhentos ou que gerem ruído/reflexo operacional.",
    ),

    subTitle("3.3 Piercings — regras comuns"),
    p("Aplicam-se a qualquer piercing utilizado em mesa:"),
    numberedItem(
      1,
      "Sem brilho ou strass — não são permitidos piercings com strass, pedras, cristais ou outros elementos com brilho.",
    ),
    numberedItem(
      2,
      "Tamanho — a peça deve respeitar a faixa de 0,6 a 0,8 cm de diâmetro, conforme o padrão informado pela Spin Gaming.",
    ),
    numberedItem(
      3,
      "Discrição — não são permitidas peças grandes, volumosas ou modelos chamativos que dominem o visual.",
    ),
    numberedItem(
      4,
      "Checklist antes de entrar em mesa: sem strass; sem pedras, cristais ou detalhes brilhantes; diâmetro dentro da faixa 0,6 a 0,8 cm.",
    ),

    subTitle("3.4 Piercings — orelha"),
    labelLine("Permitido", "1F7A3A"),
    bullet(
      "Piercings nas regiões de orelha da referência visual Spin (lóbulo, helix, mid helix, forward helix, tragus, daith, rook, conch, flat, minions e equivalentes), desde que atendam às regras comuns.",
    ),
    bullet(
      "Os modelos ilustrados servem apenas para localização anatômica — não liberam acabamentos com brilho nem tamanhos fora do padrão.",
    ),
    labelLine("Não permitido", "C62828"),
    bullet("Peças com brilho, strass, cristais ou pedras."),
    bullet("Peças fora da faixa de 0,6 a 0,8 cm de diâmetro."),
    bullet(
      "Alargadores aparentes: quando presentes, devem permanecer cobertos com plug na cor da pele durante a operação.",
    ),

    subTitle("3.5 Piercings — nariz"),
    labelLine("Permitido", "1F7A3A"),
    bullet("Septo de aparência leve e discreta."),
    bullet("Nostril / narina com peça delicada e discreta."),
    labelLine("Não permitido", "C62828"),
    bullet("Modelos grandes, volumosos ou muito chamativos."),
    bullet("Peças com brilho, strass, cristais ou pedras."),
    bullet("Peças fora da faixa de 0,6 a 0,8 cm de diâmetro."),
    bullet(
      "Múltiplos piercings faciais além do padrão de nariz + orelha permitido nesta política.",
    ),

    subTitle("3.6 Piercings — demais regiões"),
    labelLine("Não permitido", "C62828"),
    bullet(
      "Piercings em qualquer outra parte do rosto que não seja nariz ou orelha (ex.: lábio, sobrancelha, bochecha), enquanto em operação em câmera.",
    ),

    subTitle("3.7 Colares e correntes"),
    labelLine("Permitido", "1F7A3A"),
    bullet(
      "Peças minimalistas e discretas, sem brilho excessivo, sem ruído e sem risco operacional.",
    ),
    labelLine("Não permitido", "C62828"),
    bullet("Correntes grossas; colares em camadas; pingentes religiosos ou ofensivos."),
    bullet("Pedras brutas, peças reflexivas ou altamente brilhantes."),
    bullet(
      "Qualquer peça que prenda no uniforme, faça barulho ou possa danificar equipamentos.",
    ),

    subTitle("3.8 Pulseiras"),
    labelLine("Não permitido", "C62828"),
    bullet("Uso de pulseiras na área de jogo / em câmera, sem exceção."),

    subTitle("3.9 Proibições transversais"),
    p("Não são permitidos, em qualquer categoria desta política:"),
    bullet("Acessórios religiosos ou ofensivos."),
    bullet(
      "Peças grandes, barulhentas, reflexivas ou que desviem a atenção da mesa.",
    ),
    bullet(
      "Eletrônicos ou acessórios que configurem risco operacional na área de jogos.",
    ),

    sectionTitle("4", "PAPÉIS E RESPONSABILIDADES"),
    rolesTable([
      [
        "Prestador de Serviços",
        "Apresentar-se em conformidade com esta política antes de cada turno; remover ou substituir peças em dúvida antes de entrar em câmera; comunicar à liderança qualquer dúvida sobre a adequação de uma peça específica.",
      ],
      [
        "Liderança (Shift Leader / Service Manager)",
        "Verificar a conformidade visual da equipe antes do início do turno; orientar e, quando necessário, solicitar ajuste antes de o Prestador de Serviços entrar em câmera.",
      ],
      [
        "Performance Coach",
        "Aplicar as avaliações de performance considerando os critérios desta política; registrar conformidade ou desvios no padrão de acessórios.",
      ],
    ]),

    sectionTitle("5", "NÃO CONFORMIDADE E PENALIDADES"),
    p(
      "O descumprimento desta política é classificado como Descumprimento/Desvio Contratual e segue o fluxo estabelecido nas Políticas de Desvios/Descumprimentos Contratuais da Spin Gaming, iniciando pelo alinhamento direto com a liderança e podendo evoluir para notificação formal em caso de reincidência ou recusa de ajuste.",
    ),
    p(
      "Adicionalmente, o não cumprimento pode impactar a avaliação de desempenho do Prestador de Serviços, bem como as Políticas e métricas de Bonificação vigentes.",
    ),

    sectionTitle("6", "EXCEÇÕES"),
    p(
      "Casos que não se enquadrem claramente nas regras desta política devem ser encaminhados à liderança direta antes do início do turno, sem improviso em câmera.",
    ),
    p("Esta política é revisada periodicamente pelo Performance Coach."),
  ];
}

async function generateAcessoriosDocx() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          styles: [
            {
              id: "Normal",
              name: "Normal",
              run: { font: FONT, size: SIZE_BODY },
            },
          ],
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: "POLÍTICA INTERNA",
                    font: FONT,
                    size: SIZE_HEADER,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                border: {
                  top: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 8 },
                },
                children: [
                  new TextRun({
                    text: "Spin Gaming  •  Documento Interno  •  Política Interna  •  Confidencial",
                    font: FONT,
                    size: 16,
                    color: "666666",
                  }),
                  new TextRun({ text: "     ", font: FONT, size: 16 }),
                  new TextRun({
                    text: "Página ",
                    font: FONT,
                    size: 16,
                    color: "666666",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT,
                    size: 16,
                    color: "666666",
                  }),
                  new TextRun({
                    text: " de ",
                    font: FONT,
                    size: 16,
                    color: "666666",
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: FONT,
                    size: 16,
                    color: "666666",
                  }),
                ],
              }),
            ],
          }),
        },
        children: buildAcessoriosChildren(),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = "Politica_Interna_Acessorios_e_Joias_Spin.docx";
  const downloads = path.join(
    process.env.USERPROFILE || process.env.HOME || ".",
    "Downloads",
  );
  const repoOut = path.join(ROOT, "docs", "manual-imagem", "01-acessorios-e-joias");
  fs.mkdirSync(repoOut, { recursive: true });
  const pathDownloads = path.join(downloads, fileName);
  const pathRepo = path.join(repoOut, fileName);
  fs.writeFileSync(pathDownloads, buffer);
  fs.writeFileSync(pathRepo, buffer);
  return [pathDownloads, pathRepo];
}

const key = (process.argv[2] || "acessorios").toLowerCase();
if (key !== "acessorios") {
  console.error(`Política desconhecida: ${key}. Disponível: acessorios`);
  process.exit(1);
}

const saved = await generateAcessoriosDocx();
for (const s of saved) console.log(`DOCX gerado: ${s}`);
