/**
 * Gera Políticas Internas de Imagem em PDF no layout da
 * Política de Descumprimentos Contratuais (Manual Gestão):
 * - faixa azul #1E36F8 no topo
 * - logo Spin (colorida) à esquerda + "POLÍTICA INTERNA" em azul à direita
 * - título + subtítulo itálico + tabela Área/Aprovado
 * - seções numeradas em negrito, texto institucional
 * - rodapé: Spin Gaming • Documento Interno • Política Interna • Confidencial
 *
 * NÃO usa o layout dos PDFs de atividades (header escuro + gradiente).
 *
 * Uso: node scripts/generate-politica-imagem-pdf.mjs acessorios
 *      node scripts/generate-politica-imagem-pdf.mjs figurino
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BLUE = "#1E36F8";
const TEXT = "#222222";
const MUTED = "#555555";
const LINE = "#D9D9D9";
const FOOTER = "#666666";
const TABLE_BG = "#F7F7F7";
const TABLE_BORDER = "#CCCCCC";

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_BOTTOM = PAGE_H - 20;
const LINE_H = 5.2;
const HEADER_H = 28;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function readLogoAsset() {
  // Header claro (layout Descumprimentos) → logo preta/colorida
  const candidates = [
    "Logo Spin Gaming Black.png",
    "Logo Spin Gaming.png",
    "Logo Spin Gaming White.png",
  ].map((n) => path.join(ROOT, "public", n));

  for (const logoPath of candidates) {
    if (!fs.existsSync(logoPath)) continue;
    const buf = fs.readFileSync(logoPath);
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      const widthPx = buf.readUInt32BE(16);
      const heightPx = buf.readUInt32BE(20);
      return {
        dataUrl: `data:image/png;base64,${buf.toString("base64")}`,
        aspect: widthPx / heightPx,
        format: "PNG",
        path: logoPath,
      };
    }
  }
  return null;
}

function paintPageBg(pdf) {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, PAGE_W, PAGE_H, "F");
}

/** Header espelhando Descumprimentos: barra azul + logo + rótulo */
function drawDocHeader(pdf, logoAsset) {
  // Faixa azul fina no topo
  pdf.setFillColor(...hexToRgb(BLUE));
  pdf.rect(0, 0, PAGE_W, 2.2, "F");

  const logoH = 12;
  const logoY = 7;
  if (logoAsset) {
    const logoW = logoH * logoAsset.aspect;
    pdf.addImage(logoAsset.dataUrl, logoAsset.format, MARGIN, logoY, logoW, logoH);
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...hexToRgb(BLUE));
    pdf.text("SPIN GAMING", MARGIN, logoY + 8);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...hexToRgb(BLUE));
  pdf.text("POLÍTICA INTERNA", PAGE_W - MARGIN, logoY + 8, { align: "right" });

  pdf.setDrawColor(...hexToRgb(LINE));
  pdf.setLineWidth(0.35);
  pdf.line(MARGIN, HEADER_H - 1, PAGE_W - MARGIN, HEADER_H - 1);

  return HEADER_H + 6;
}

function drawFooter(pdf, pageNum, totalPages) {
  const y = PAGE_H - 12;
  pdf.setDrawColor(...hexToRgb(LINE));
  pdf.setLineWidth(0.25);
  pdf.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...hexToRgb(FOOTER));
  pdf.text(
    "Spin Gaming  •  Documento Interno  •  Política Interna  •  Confidencial",
    MARGIN,
    y,
  );
  pdf.text(`Página ${pageNum} de ${totalPages}`, PAGE_W - MARGIN, y, {
    align: "right",
  });
}

function newPage(pdf, logoAsset) {
  pdf.addPage("a4", "portrait");
  paintPageBg(pdf);
  return drawDocHeader(pdf, logoAsset);
}

function ensureSpace(pdf, logoAsset, y, needed) {
  if (y + needed <= CONTENT_BOTTOM) return y;
  return newPage(pdf, logoAsset);
}

function drawParagraph(pdf, logoAsset, y, text, opts = {}) {
  const font = opts.bold ? "bold" : opts.italics ? "italic" : "normal";
  const size = opts.size ?? 10.5;
  const color = opts.color ?? TEXT;
  const indent = opts.indent ?? 0;
  const maxW = CONTENT_W - indent;

  pdf.setFont("helvetica", font);
  pdf.setFontSize(size);
  const lines = pdf.splitTextToSize(text, maxW);

  for (const line of lines) {
    y = ensureSpace(pdf, logoAsset, y, LINE_H);
    pdf.setFont("helvetica", font);
    pdf.setFontSize(size);
    pdf.setTextColor(...hexToRgb(color));
    pdf.text(line, MARGIN + indent, y);
    y += LINE_H;
  }
  return y + (opts.after ?? 3);
}

function drawSectionTitle(pdf, logoAsset, y, num, title) {
  y = ensureSpace(pdf, logoAsset, y, 12);
  y += 2;
  return drawParagraph(pdf, logoAsset, y, `${num}. ${title}`, {
    bold: true,
    size: 11.5,
    after: 3,
  });
}

function drawBullet(pdf, logoAsset, y, text) {
  return drawParagraph(pdf, logoAsset, y, `•  ${text}`, {
    indent: 4,
    after: 2,
    size: 10.5,
  });
}

function drawMetaTable(pdf, logoAsset, y, area, aprovado) {
  y = ensureSpace(pdf, logoAsset, y, 22);
  const colW = CONTENT_W / 2;
  const rowH = 16;
  const x = MARGIN;

  pdf.setDrawColor(...hexToRgb(TABLE_BORDER));
  pdf.setFillColor(...hexToRgb(TABLE_BG));
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, colW, rowH, "FD");
  pdf.rect(x + colW, y, colW, rowH, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...hexToRgb(TEXT));
  pdf.text("ÁREA RESPONSÁVEL", x + 3, y + 5);
  pdf.text("APROVADO POR", x + colW + 3, y + 5);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(area, x + 3, y + 11);
  pdf.text(aprovado, x + colW + 3, y + 11);

  return y + rowH + 8;
}

function drawRolesTable(pdf, logoAsset, y, rows) {
  const col1 = 48;
  const col2 = CONTENT_W - col1;
  const pad = 2.5;
  const headerH = 8;

  y = ensureSpace(pdf, logoAsset, y, 10);
  pdf.setFillColor(...hexToRgb(TABLE_BG));
  pdf.setDrawColor(...hexToRgb(TABLE_BORDER));
  pdf.setLineWidth(0.3);
  pdf.rect(MARGIN, y, col1, headerH, "FD");
  pdf.rect(MARGIN + col1, y, col2, headerH, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...hexToRgb(TEXT));
  pdf.text("PAPEL", MARGIN + pad, y + 5.2);
  pdf.text("RESPONSABILIDADE", MARGIN + col1 + pad, y + 5.2);
  y += headerH;

  for (const [papel, resp] of rows) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    const papelLines = pdf.splitTextToSize(papel, col1 - pad * 2);
    const respLines = pdf.splitTextToSize(resp, col2 - pad * 2);
    const rowH = Math.max(papelLines.length, respLines.length) * 4.6 + 5;

    y = ensureSpace(pdf, logoAsset, y, rowH);
    pdf.setDrawColor(...hexToRgb(TABLE_BORDER));
    pdf.setLineWidth(0.3);
    pdf.rect(MARGIN, y, col1, rowH, "D");
    pdf.rect(MARGIN + col1, y, col2, rowH, "D");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...hexToRgb(TEXT));
    pdf.text(papelLines, MARGIN + pad, y + 4.5);
    pdf.text(respLines, MARGIN + col1 + pad, y + 4.5);
    y += rowH;
  }

  return y + 4;
}

function generateAcessoriosPdf(outputPath, logoAsset) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  paintPageBg(pdf);
  let y = drawDocHeader(pdf, logoAsset);

  y = drawParagraph(pdf, logoAsset, y, "POLÍTICA INTERNA", {
    bold: true,
    size: 14,
    after: 2,
  });
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Política de Acessórios e Joias – Uso Interno Gestão Spin Gaming",
    { italics: true, size: 10.5, color: MUTED, after: 5 },
  );

  y = drawMetaTable(
    pdf,
    logoAsset,
    y,
    "Performance Coach",
    "Recursos Humanos / Diretoria",
  );

  y = drawSectionTitle(pdf, logoAsset, y, "1", "OBJETIVO");
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Estabelecer os padrões de uso de anéis, brincos, piercings, colares, correntes e pulseiras para os Prestadores de Serviços que atuam em frente às câmeras na operação da Spin Gaming — incluindo Game Presenter, Shuffler, Service Manager e Shift Leader quando em frente à câmera —, garantindo uma apresentação visual discreta, padronizada e segura para a operação ao vivo.",
  );

  y = drawSectionTitle(pdf, logoAsset, y, "2", "ABRANGÊNCIA E APLICAÇÃO");
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Aplica-se a todos os Prestadores de Serviços que atuam em frente às câmeras na operação da Spin Gaming — incluindo, entre outras, as funções de Game Presenter, Shuffler, Service Manager e Shift Leader quando estiverem em frente à câmera —, independentemente de gênero.",
  );
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Não se aplica a colaboradores que não atuam em câmera, nem a Service Manager e Shift Leader quando estiverem fora do ambiente de câmera.",
  );
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Fora do escopo desta política (tratados em documentos próprios):",
    { bold: true, after: 2 },
  );
  y = drawBullet(pdf, logoAsset, y, "Óculos e lentes.");
  y = drawBullet(
    pdf,
    logoAsset,
    y,
    "Acessórios de cabelo (grampos, elásticos, tiaras, contas em tranças).",
  );
  y = drawBullet(pdf, logoAsset, y, "Meia-calça, cinto e demais complementos de figurino.");
  y = drawBullet(
    pdf,
    logoAsset,
    y,
    "Acessórios oficiais exigidos pelo uniforme (quando houver) — prevalecem sobre joias pessoais, desde que usados conforme o padrão do figurino.",
  );

  y = drawSectionTitle(pdf, logoAsset, y, "3", "DIRETRIZES GERAIS");
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Princípio: na dúvida, priorizar visual discreto. Se a peça chama mais atenção que o uniforme ou a condução do jogo, deve ser removida ou substituída antes do turno.",
  );

  const sub = (title) => {
    y = drawParagraph(pdf, logoAsset, y, title, {
      bold: true,
      size: 10.5,
      after: 2,
    });
  };
  const permitido = (...items) => {
    y = drawParagraph(pdf, logoAsset, y, "Permitido:", { bold: true, after: 1 });
    for (const i of items) y = drawBullet(pdf, logoAsset, y, i);
  };
  const naoPermitido = (...items) => {
    y = drawParagraph(pdf, logoAsset, y, "Não permitido:", {
      bold: true,
      after: 1,
    });
    for (const i of items) y = drawBullet(pdf, logoAsset, y, i);
  };

  sub("3.1 Anéis");
  permitido(
    "Um único anel de casamento, discreto e clássico, no dedo anelar.",
    "Game Presenter de Roleta: o anel de casamento deve ser utilizado exclusivamente na mão esquerda.",
  );
  naoPermitido(
    "Anéis adicionais (qualquer dedo).",
    "Pedras no anel de casamento, independentemente do tamanho.",
    "Detalhes que possam arranhar ou danificar equipamentos, cartas, chips ou superfícies de mesa.",
  );

  sub("3.2 Brincos");
  permitido(
    "Brincos pequenos, elegantes e discretos.",
    "Segundo furo na orelha, desde que a peça seja pequena, discreta e compatível com o padrão visual.",
    "Argola pequena no primeiro furo e brinco pequeno (pino/stud) no segundo furo.",
    "Brincos pequenos (pino/stud) em ambos os furos.",
  );
  naoPermitido(
    "Argolas em ambos os furos (primeira e segunda fileira).",
    "Brincos com pedrarias, cristais, strass ou pedras.",
    "Brincos grandes, chamativos, brilhantes, barulhentos ou que gerem ruído/reflexo operacional.",
  );

  sub("3.3 Piercings — regras comuns");
  y = drawParagraph(pdf, logoAsset, y, "Aplicam-se a qualquer piercing utilizado em mesa:");
  y = drawBullet(
    pdf,
    logoAsset,
    y,
    "Sem brilho ou strass: não são permitidos piercings com strass, pedras, cristais ou outros elementos com brilho.",
  );
  y = drawBullet(
    pdf,
    logoAsset,
    y,
    "Tamanho: a peça deve respeitar a faixa de 0,6 a 0,8 cm de diâmetro, conforme o padrão informado pela Spin Gaming.",
  );
  y = drawBullet(
    pdf,
    logoAsset,
    y,
    "Discrição: não são permitidas peças grandes, volumosas ou modelos chamativos que dominem o visual.",
  );
  y = drawBullet(
    pdf,
    logoAsset,
    y,
    "Checklist antes de entrar em mesa: sem strass; sem pedras, cristais ou detalhes brilhantes; diâmetro dentro da faixa 0,6 a 0,8 cm.",
  );

  sub("3.4 Piercings — orelha");
  permitido(
    "Piercings nas regiões de orelha da referência visual Spin (lóbulo, helix, mid helix, forward helix, tragus, daith, rook, conch, flat, minions e equivalentes), desde que atendam às regras comuns.",
    "Os modelos ilustrados servem apenas para localização anatômica — não liberam acabamentos com brilho nem tamanhos fora do padrão.",
  );
  naoPermitido(
    "Peças com brilho, strass, cristais ou pedras.",
    "Peças fora da faixa de 0,6 a 0,8 cm de diâmetro.",
    "Alargadores aparentes: quando presentes, devem permanecer cobertos com plug na cor da pele durante a operação.",
  );

  sub("3.5 Piercings — nariz");
  permitido(
    "Septo de aparência leve e discreta.",
    "Nostril / narina com peça delicada e discreta.",
  );
  naoPermitido(
    "Modelos grandes, volumosos ou muito chamativos.",
    "Peças com brilho, strass, cristais ou pedras.",
    "Peças fora da faixa de 0,6 a 0,8 cm de diâmetro.",
    "Múltiplos piercings faciais além do padrão de nariz + orelha permitido nesta política.",
  );

  sub("3.6 Piercings — demais regiões");
  naoPermitido(
    "Piercings em qualquer outra parte do rosto que não seja nariz ou orelha (ex.: lábio, sobrancelha, bochecha), enquanto em operação em câmera.",
  );

  sub("3.7 Colares e correntes");
  permitido(
    "Peças minimalistas e discretas, sem brilho excessivo, sem ruído e sem risco operacional.",
  );
  naoPermitido(
    "Correntes grossas; colares em camadas; pingentes religiosos ou ofensivos.",
    "Pedras brutas, peças reflexivas ou altamente brilhantes.",
    "Qualquer peça que prenda no uniforme, faça barulho ou possa danificar equipamentos.",
  );

  sub("3.8 Pulseiras");
  naoPermitido("Uso de pulseiras na área de jogo / em câmera, sem exceção.");

  sub("3.9 Proibições transversais");
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Não são permitidos, em qualquer categoria desta política:",
  );
  y = drawBullet(pdf, logoAsset, y, "Acessórios religiosos ou ofensivos.");
  y = drawBullet(
    pdf,
    logoAsset,
    y,
    "Peças grandes, barulhentas, reflexivas ou que desviem a atenção da mesa.",
  );
  y = drawBullet(
    pdf,
    logoAsset,
    y,
    "Eletrônicos ou acessórios que configurem risco operacional na área de jogos.",
  );

  y = drawSectionTitle(pdf, logoAsset, y, "4", "PAPÉIS E RESPONSABILIDADES");
  y = drawRolesTable(pdf, logoAsset, y, [
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
  ]);

  y = drawSectionTitle(pdf, logoAsset, y, "5", "NÃO CONFORMIDADE E PENALIDADES");
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "O descumprimento desta política é classificado como Descumprimento/Desvio Contratual e segue o fluxo estabelecido nas Políticas de Desvios/Descumprimentos Contratuais da Spin Gaming, iniciando pelo alinhamento direto com a liderança e podendo evoluir para notificação formal em caso de reincidência ou recusa de ajuste.",
  );
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Adicionalmente, o não cumprimento pode impactar a avaliação de desempenho do Prestador de Serviços, bem como as Políticas e métricas de Bonificação vigentes.",
  );

  y = drawSectionTitle(pdf, logoAsset, y, "6", "EXCEÇÕES");
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Casos que não se enquadrem claramente nas regras desta política devem ser encaminhados à liderança direta antes do início do turno, sem improviso em câmera.",
  );
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Esta política é revisada periodicamente pelo Performance Coach.",
  );

  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    drawFooter(pdf, i, total);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(pdf.output("arraybuffer")));
  return outputPath;
}

function generateFigurinoPdf(outputPath, logoAsset) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  paintPageBg(pdf);
  let y = drawDocHeader(pdf, logoAsset);

  y = drawParagraph(pdf, logoAsset, y, "POLÍTICA INTERNA", {
    bold: true,
    size: 14,
    after: 2,
  });
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Política de Figurino e Uniforme – Uso Interno Gestão Spin Gaming",
    { italics: true, size: 10.5, color: MUTED, after: 5 },
  );

  y = drawMetaTable(
    pdf,
    logoAsset,
    y,
    "Performance Coach",
    "Recursos Humanos / Diretoria",
  );

  y = drawSectionTitle(pdf, logoAsset, y, "1", "OBJETIVO");
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Estabelecer os padrões de uso, conservação e apresentação do figurino (uniforme) fornecido pela Spin Gaming para os Prestadores de Serviços que atuam em frente às câmeras — incluindo Game Presenter, Shuffler, Service Manager e Shift Leader quando em frente à câmera —, garantindo apresentação visual profissional, padronizada e segura para a operação ao vivo.",
  );

  y = drawSectionTitle(pdf, logoAsset, y, "2", "ABRANGÊNCIA E APLICAÇÃO");
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Aplica-se a todos os Prestadores de Serviços que atuam em frente às câmeras na operação da Spin Gaming — incluindo, entre outras, as funções de Game Presenter, Shuffler, Service Manager e Shift Leader quando estiverem em frente à câmera —, independentemente de gênero.",
  );
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Não se aplica a colaboradores que não atuam em câmera, nem a Service Manager e Shift Leader quando estiverem fora do ambiente de câmera.",
  );

  y = drawSectionTitle(pdf, logoAsset, y, "3", "DIRETRIZES GERAIS");
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Princípio: na área de jogos e em câmera, utilizar somente o figurino fornecido pela Spin Gaming, completo e conforme o kit do estúdio. Peças pessoais não substituem itens oficiais. Na dúvida, consultar a liderança ou a equipe de Figurino antes do turno.",
  );

  const sub = (title) => {
    y = drawParagraph(pdf, logoAsset, y, title, {
      bold: true,
      size: 10.5,
      after: 2,
    });
  };
  const permitido = (...items) => {
    y = drawParagraph(pdf, logoAsset, y, "Permitido:", { bold: true, after: 1 });
    for (const i of items) y = drawBullet(pdf, logoAsset, y, i);
  };
  const naoPermitido = (...items) => {
    y = drawParagraph(pdf, logoAsset, y, "Não permitido:", {
      bold: true,
      after: 1,
    });
    for (const i of items) y = drawBullet(pdf, logoAsset, y, i);
  };
  const obrigatorio = (...items) => {
    y = drawParagraph(pdf, logoAsset, y, "Obrigatório:", {
      bold: true,
      after: 1,
    });
    for (const i of items) y = drawBullet(pdf, logoAsset, y, i);
  };

  sub("3.1 Uso exclusivo do figurino oficial");
  permitido(
    "Utilizar peças registradas no inventário de Figurinos, retiradas conforme o fluxo oficial.",
    "Composição conforme kit do estúdio escalado e materiais oficiais daquele estúdio (Manual Academy do estúdio, Figurinos e liderança).",
  );
  naoPermitido(
    "Substituir peça oficial por roupa ou acessório pessoal equivalente.",
    "Entrar em câmera com figurino incompleto quando o kit exige a peça.",
    "Utilizar peças de figurino de outro estúdio sem autorização da liderança.",
  );

  sub("3.2 Retirada, uso e devolução");
  permitido(
    "Retirada Emprestada (turno) conforme fluxo da página Figurinos.",
    "Manter o figurino durante todo o período em operação no estúdio escalado.",
  );
  obrigatorio(
    "Retirar o figurino antes do turno, com tempo para vestir e conferir o kit.",
    "Devolver peças emprestadas ao final do turno (ou conforme orientação da liderança).",
    "Informar condição na devolução: boa condição, possível descarte ou manutenção.",
  );
  naoPermitido(
    "Retirar peças sem registro quando o fluxo exige retirada registrada.",
    "Emprestar figurino a terceiros sem registro/devolução formal.",
  );

  sub("3.3 Conservação, higiene e integridade");
  obrigatorio(
    "Apresentar-se com figurino limpo e bem apresentado; comunicar dano ou mancha persistente.",
    "Vestir corretamente cada peça conforme o kit do estúdio e utilizar todos os acessórios obrigatórios previstos.",
    "Manipular tecidos delicados com zelo; evitar vincos profundos no transporte ou guarda temporária.",
  );
  naoPermitido(
    "Alterar, cortar, customizar, amarrar ou reformar peças oficiais.",
    "Utilizar peça com rasgo, fecho quebrado, mancha, amassado ou fio puxado visível — solicitar troca antes de entrar em mesa.",
    "Entrar no estúdio com peça reprovada na conferência visual (seção 3.7).",
  );

  sub("3.4 Meia-calça e cinto");
  permitido(
    "Meia-calça preta ou nude, opaca, sem estampa ou brilho, quando exigida pelo kit feminino.",
    "Cinto preto, discreto e liso, quando integrante do kit masculino.",
  );
  naoPermitido(
    "Meia-calça colorida, estampada, arrastão ou com brilho.",
    "Cinto chamativo, com fivela grande ou logotipos.",
  );

  sub("3.5 Acessórios integrantes do uniforme");
  permitido(
    "Grampos, elásticos ou presilhas pretos/discretos para fixar cabelo conforme padrão do estúdio.",
    "Acessórios cadastrados na categoria Acessório do inventário, quando previstos.",
  );
  naoPermitido(
    "Tiaras, laços ou adornos que não façam parte do figurino oficial.",
    "Substituir acessório oficial por peça pessoal divergente.",
  );

  sub("3.6 Caimento mínimo");
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Composição e caimento detalhados ficam nos materiais de cada estúdio (Manual Academy). Padrão mínimo: ajuste adequado ao corpo, silhueta alinhada com kit completo, comprimento conforme material oficial do estúdio; trocar tamanho via Figurinos antes de entrar em câmera quando necessário.",
  );

  sub("3.7 Conferência visual antes do estúdio");
  obrigatorio(
    "Conferir figurino antes da área ao vivo; substituir peça com amassado, mancha, fio puxado, rasgo ou desarmonia visual.",
  );

  sub("3.8 Calçado na operação ao vivo");
  obrigatorio(
    "Calçado fechado ou adequado ao ambiente profissional; Game Presenter e Shuffler: modelo indicado pela empresa para o estúdio (Manual Academy do estúdio).",
  );
  naoPermitido("Chinelos, rasteiras, Crocs ou calçado aberto/informal incompatível.");

  sub("3.9 Segurança e circulação");
  obrigatorio(
    "Figurino completo ao entrar na área ao vivo e ao circular dentro do estúdio durante o turno.",
  );
  naoPermitido(
    "Sair das dependências da empresa utilizando figurino oficial — medida de segurança.",
  );

  sub("3.10 Conduta e apresentação");
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Manter comportamento profissional enquanto utilizar o figurino oficial nas áreas operacionais do estúdio.",
  );

  sub("3.11 Proibições transversais");
  y = drawParagraph(pdf, logoAsset, y, "Não são permitidos:");
  y = drawBullet(
    pdf,
    logoAsset,
    y,
    "Logotipos ou símbolos não autorizados visíveis sobre o figurino.",
  );
  y = drawBullet(
    pdf,
    logoAsset,
    y,
    "Peças pessoais adicionais que alterem a silhueta do uniforme (casacos, moletons, etc.).",
  );
  y = drawBullet(
    pdf,
    logoAsset,
    y,
    "Uso parcial ou descuidado do figurino que comprometa a padronização da equipe.",
  );

  y = drawSectionTitle(pdf, logoAsset, y, "4", "PAPÉIS E RESPONSABILIDADES");
  y = drawRolesTable(pdf, logoAsset, y, [
    [
      "Prestador de Serviços",
      "Retirar, vestir e devolver o figurino conforme o fluxo oficial; apresentar-se com kit completo, limpo e íntegro; comunicar necessidade de troca ou manutenção; seguir o kit do estúdio escalado.",
    ],
    [
      "Liderança (Shift Leader / Service Manager)",
      "Verificar conformidade do figurino e calçado antes do turno; conferência visual pré-estúdio; orientar ajustes e solicitar troca; escalar à equipe de Figurinos indisponibilidade ou dano.",
    ],
    [
      "Equipe de Figurino",
      "Manter inventário, retirada, devolução, registro de condição e encaminhamento para lavagem/costura/descarte.",
    ],
    [
      "Performance Coach",
      "Considerar conformidade de figurino nas avaliações de performance; registrar desvios e orientações de adequação.",
    ],
  ]);

  y = drawSectionTitle(pdf, logoAsset, y, "5", "NÃO CONFORMIDADE E PENALIDADES");
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "O descumprimento desta política é classificado como Descumprimento/Desvio Contratual e segue o fluxo estabelecido nas Políticas de Desvios/Descumprimentos Contratuais da Spin Gaming, iniciando pelo alinhamento direto com a liderança e podendo evoluir para notificação formal em caso de reincidência ou recusa de ajuste.",
  );
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Adicionalmente, o não cumprimento pode impactar a avaliação de desempenho do Prestador de Serviços, bem como as Políticas e métricas de Bonificação vigentes.",
  );
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Danos a peças por uso inadequado podem ser tratados conforme procedimentos internos de Figurinos e RH, quando aplicável.",
  );

  y = drawSectionTitle(pdf, logoAsset, y, "6", "EXCEÇÕES");
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Casos excepcionais (indisponibilidade de peça, restrição médica documentada, etc.) devem ser encaminhados à liderança e à equipe de Figurinos antes do início do turno, sem improviso em câmera.",
  );
  y = drawParagraph(
    pdf,
    logoAsset,
    y,
    "Esta política é revisada periodicamente pelo Performance Coach.",
  );

  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    drawFooter(pdf, i, total);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(pdf.output("arraybuffer")));
  return outputPath;
}

const POLITICAS = {
  acessorios: {
    fileName: "Politica_Interna_Acessorios_e_Joias_Spin.pdf",
    folder: "01-acessorios-e-joias",
    generate: generateAcessoriosPdf,
  },
  figurino: {
    fileName: "Politica_Interna_Figurino_e_Uniforme_Spin.pdf",
    folder: "02-figurino-uniforme",
    generate: generateFigurinoPdf,
  },
};

const key = (process.argv[2] || "acessorios").toLowerCase();
const politica = POLITICAS[key];
if (!politica) {
  console.error(
    `Política desconhecida: ${key}. Disponível: ${Object.keys(POLITICAS).join(", ")}`,
  );
  process.exit(1);
}

const logoAsset = readLogoAsset();
const downloads = path.join(
  process.env.USERPROFILE || process.env.HOME || ".",
  "Downloads",
);
const repoOut = path.join(ROOT, "docs", "manual-imagem", politica.folder);

console.log(
  `PDF gerado: ${politica.generate(path.join(downloads, politica.fileName), logoAsset)}`,
);
console.log(
  `PDF gerado: ${politica.generate(path.join(repoOut, politica.fileName), logoAsset)}`,
);
