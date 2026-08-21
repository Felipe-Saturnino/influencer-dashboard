/**
 * Gera PDFs de atividades de prestadores com brandguide Spin Gaming.
 * Uso: node scripts/generate-game-presenter-pdf.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/** Tokens Spin (global.css / theme.ts) */
const BRAND = {
  action: "#7c3aed",
  contrast: "#1e36f8",
  gradientStart: "#4a2082",
  gradientEnd: "#1e36f8",
  bgDark: "#0f0f1a",
  text: "#1a1a2e",
  textMuted: "#666688",
  textBody: "#3a3a4a",
  white: "#ffffff",
  pageBg: "#ffffff",
  accentLine: "#1e36f8",
};

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_BOTTOM = PAGE_H - 22;
const LINE_H = 4.8;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawGradientRect(pdf, x, y, w, h, fromHex, toHex) {
  const [r1, g1, b1] = hexToRgb(fromHex);
  const [r2, g2, b2] = hexToRgb(toHex);
  const steps = Math.max(24, Math.ceil(h));
  const sh = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = steps <= 1 ? 0 : i / (steps - 1);
    pdf.setFillColor(
      Math.round(r1 + (r2 - r1) * t),
      Math.round(g1 + (g2 - g1) * t),
      Math.round(b1 + (b2 - b1) * t),
    );
    pdf.rect(x, y + i * sh, w, sh + 0.02, "F");
  }
}

function readLogoAsset() {
  const logoPath = path.join(ROOT, "public", "Logo Spin Gaming White.png");
  if (!fs.existsSync(logoPath)) return null;
  const buf = fs.readFileSync(logoPath);
  const widthPx = buf.readUInt32BE(16);
  const heightPx = buf.readUInt32BE(20);
  return {
    dataUrl: `data:image/png;base64,${buf.toString("base64")}`,
    aspect: widthPx / heightPx,
  };
}

/** Textos revisados em PT-BR — conceito original preservado. */
const DOCS = [
  {
    file: "Game_Presenter_Spin.pdf",
    headerKicker: "ATIVIDADES RELACIONADAS À PRESTAÇÃO  ·  OPERAÇÕES",
    title: "Game Presenter",
    subtitle: "Prestador(a) de Serviços — Apresentação e condução de jogos ao vivo",
    footerLeft: "Spin Gaming — Game Presenter · Uso interno",
    sections: [
      {
        num: "1",
        title: "DESCRIÇÃO DAS ATIVIDADES",
        body: "Responsável por conduzir transmissões de jogos ao vivo, representando a Spin Gaming diante dos jogadores com postura profissional, comunicação clara e alto padrão de atendimento. Atua garantindo a correta execução das partidas, a integridade das operações e uma experiência dinâmica, segura e envolvente para os clientes, seguindo rigorosamente os procedimentos operacionais e de compliance definidos pela empresa.",
      },
      {
        num: "2",
        title: "PRINCIPAIS ATIVIDADES",
        bullets: [
          "Conduzir transmissões de jogos ao vivo (Roleta, Blackjack, Baccarat, Futebol Brasileiro e demais jogos do portfólio).",
          "Manter desempenho confiante e claro diante das câmeras durante toda a operação.",
          "Exercer excelente controle da mesa de jogo e do sistema/software de operação.",
          "Garantir a integridade do jogo em todas as rodadas realizadas.",
          "Falar diretamente com os jogadores e prestar apoio durante a partida.",
          "Participar ativamente de promoções e campanhas de mídia da Spin Gaming.",
          "Cumprir rigorosamente os critérios de assiduidade, cooperação, velocidade e controle de erros definidos nos procedimentos.",
          "Zelar pelo padrão de imagem, comunicação e postura definidos no Manual de Imagem da Academy.",
          "Concluir o programa de treinamento Academy (e a etapa de Prototype, quando aplicável) antes de iniciar a operação ao vivo.",
          "Participar ativamente, quando solicitado ou convidado, dos treinamentos e/ou revisões de práticas propostos pela área de Academy.",
        ],
      },
    ],
  },
  {
    file: "Shift_Leader_Spin.pdf",
    headerKicker: "ATIVIDADES RELACIONADAS À PRESTAÇÃO  ·  OPERAÇÕES — LIDERANÇA DE TURNO",
    title: "Shift Leader",
    level: "Nível I",
    subtitle: "Prestador(a) de Serviços — Liderança operacional de turno, Gaming Floor",
    footerLeft: "Spin Gaming — Shift Leader · Uso interno",
    sections: [
      {
        num: "1",
        title: "DESCRIÇÃO DAS ATIVIDADES",
        body: "Responsável por supervisionar a rotina operacional dos turnos, acompanhando o desempenho dos Game Presenters e Shufflers para assegurar o cumprimento dos procedimentos, indicadores e padrões estabelecidos pela Spin Gaming. Atua como referência direta da equipe de prestadores de serviços em operação, promovendo organização, disciplina operacional, desenvolvimento técnico e integração entre as áreas, contribuindo para a eficiência e a qualidade das operações do estúdio.",
      },
      {
        num: "2",
        title: "PRINCIPAIS ATIVIDADES",
        bullets: [
          "Supervisionar as operações diárias do estúdio durante o turno, garantindo regularidade, eficiência e disciplina operacional.",
          "Acompanhar o desempenho dos Game Presenters e Shufflers em mesa, verificando a conformidade com os padrões e procedimentos vigentes.",
          "Conduzir reuniões de equipe e reuniões individuais de coaching e feedback, incluindo o PDP trimestral.",
          "Elaborar escalas mensais de turno e gerenciar solicitações de ausência, troca de turno e listas de espera.",
          "Conduzir o processo de integração (onboarding) de novos prestadores de serviços na operação.",
          "Identificar, registrar e escalar incidentes operacionais, colaborando com outras áreas para sua resolução.",
          "Gerenciar chamados no sistema da Spin e demais sistemas internos (Microsoft 365, software de escalas).",
          "Apoiar o encerramento de contratos de prestação de serviços, incluindo documentação e checklist de encerramento.",
          "Atuar na organização de ações de engajamento e desenvolvimento da equipe de turno.",
          "Reportar de forma estruturada à Gerência de Operações sobre indicadores, ocorrências e necessidades da equipe.",
          "Acompanhar assuntos referentes à área de Recursos Humanos dos prestadores de serviços com quem atua (contratação, encerramento de contrato, períodos de indisponibilidade programada e demais rotinas).",
          "Assumir rotações na mesa tanto para vivência e modernização dos conhecimentos quanto para suprir necessidades de continuidade operacional.",
          "Participar ativamente, quando solicitado ou convidado, dos treinamentos e/ou revisões de práticas propostos pela área de Academy.",
        ],
      },
    ],
  },
  {
    file: "Shuffler_Spin.pdf",
    headerKicker: "ATIVIDADES RELACIONADAS À PRESTAÇÃO  ·  OPERAÇÕES",
    title: "Shuffler",
    subtitle: "Prestador(a) de Serviços — Preparo e embaralhamento de baralhos",
    footerLeft: "Spin Gaming — Shuffler · Uso interno",
    sections: [
      {
        num: "1",
        title: "DESCRIÇÃO DAS ATIVIDADES",
        body: "Responsável pelo preparo, organização e embaralhamento dos baralhos utilizados nas mesas de jogos ao vivo, assegurando que todos os materiais estejam em perfeitas condições de uso e em conformidade com os protocolos de segurança. Sua atuação contribui diretamente para a integridade das operações, dando suporte aos Game Presenters e garantindo a continuidade das mesas durante todos os turnos.",
      },
      {
        num: "2",
        title: "PRINCIPAIS ATIVIDADES",
        bullets: [
          "Embaralhar e preparar os baralhos para diferentes mesas e turnos.",
          "Garantir que todas as cartas estejam íntegras, completas e em boas condições de uso.",
          "Seguir rigorosamente os protocolos de segurança para evitar manipulações indevidas.",
          "Auxiliar a equipe de Game Presenters e supervisores conforme necessário.",
          "Manter o ambiente de trabalho limpo e organizado.",
          "Concluir o programa de treinamento Academy (e a etapa de Prototype, quando aplicável) antes de iniciar a operação ao vivo.",
          "Participar ativamente, quando solicitado ou convidado, dos treinamentos e/ou revisões de práticas propostos pela área de Academy.",
        ],
      },
    ],
  },
  {
    file: "Treinador_Spin.pdf",
    headerKicker: "ATIVIDADES RELACIONADAS À PRESTAÇÃO  ·  OPERAÇÕES — FORMAÇÃO E TREINAMENTO",
    title: "Treinador(a) — Spin Academy",
    subtitle: "Prestador(a) de Serviços — Formação técnica de Game Presenters e Shufflers",
    footerLeft: "Spin Gaming — Treinador · Uso interno",
    sections: [
      {
        num: "1",
        title: "DESCRIÇÃO DAS ATIVIDADES",
        body: "Responsável por estruturar e conduzir os programas de treinamento inicial e atualizações de conhecimento (Academy) dos prestadores de serviços do time de Game Floor, com duração e cronograma detalhados nos manuais internos, incluindo as etapas complementares de Prototype e Avaliação quando aplicável. Atua na formação técnica, comportamental e procedimental dos novos prestadores, avaliando sua aptidão para o início da operação ao vivo e assegurando aderência aos padrões de qualidade, imagem e integridade de jogo estabelecidos pela Spin Gaming.",
      },
      {
        num: "2",
        title: "PRINCIPAIS ATIVIDADES",
        bullets: [
          "Conduzir os treinamentos Academy para o time de Game Floor, cobrindo regras de jogo, técnica de mesa, padrões de imagem e comunicação.",
          "Conduzir a etapa de Prototype, avaliando o desempenho dos treinandos em ambiente controlado antes da liberação para a operação ao vivo.",
          "Atestar formalmente a aptidão dos prestadores de serviços para o início da operação, conforme os critérios estipulados.",
          "Aplicar avaliações técnicas e comportamentais ao longo do treinamento, documentando resultados de forma objetiva.",
          "Identificar necessidades de retreinamento e conduzir reforços pontuais a treinandos com dificuldades específicas.",
          "Desenvolver, manter e atualizar o material didático da Academy em conformidade com os manuais e procedimentos vigentes.",
          "Reportar à Operações e ao RH os indicadores de aproveitamento de cada turma de formação.",
          "Assumir rotações na mesa tanto para vivência e modernização dos conhecimentos quanto para suprir necessidades de continuidade operacional.",
          "Conduzir, quando necessário, avaliações mensais por prestador alinhadas conforme necessidade operacional, observando os blocos de Cuidados com a Imagem, Comunicação, Desempenho na Mesa e outros alinhados mensalmente para avaliação.",
        ],
      },
    ],
  },
  {
    file: "Performance_Coach_Spin.pdf",
    headerKicker: "ATIVIDADES RELACIONADAS À PRESTAÇÃO  ·  OPERAÇÕES — DESENVOLVIMENTO DE PERFORMANCE",
    title: "Performance Coach",
    subtitle: "Prestador(a) de Serviços — Avaliação qualitativa e desenvolvimento de Game Presenters",
    footerLeft: "Spin Gaming — Performance Coach · Uso interno",
    sections: [
      {
        num: "1",
        title: "DESCRIÇÃO DAS ATIVIDADES",
        body: "Responsável por conduzir a avaliação qualitativa de desempenho dos Game Presenters em mesa, aplicando a régua de excelência definida pela Spin Gaming e fornecendo subsídios objetivos para o processo de feedback estruturado. Atua na observação direta da operação, no registro de avaliações no Performance Hub e no acompanhamento da evolução técnica, comunicacional e de imagem dos prestadores de serviços da função de Game Presenter.",
      },
      {
        num: "2",
        title: "PRINCIPAIS ATIVIDADES",
        bullets: [
          "Conduzir a quantidade de avaliações mensais por prestador alinhadas conforme meta mensal, observando os blocos de Cuidados com a Imagem, Comunicação, Desempenho na Mesa e outros alinhados mensalmente para avaliação.",
          "Registrar as avaliações e observações objetivas em ficha digital no Performance Hub.",
          "Assinar digitalmente as avaliações e realizar acompanhamento quinzenal da evolução dos avaliados.",
          "Apoiar o Shift Lead na preparação do roteiro de feedback, com pontos fortes e pontos de melhoria.",
          "Identificar padrões de erro e necessidades de retreinamento, direcionando casos à Academy quando aplicável.",
          "Calibrar critérios de avaliação com outros Performance Coaches, garantindo consistência entre turnos e avaliadores.",
          "Interpretar corretamente os Manuais da Academy e suas atualizações na aplicação das notas do Bloco 1.",
          "Assumir rotações na mesa tanto para vivência e modernização dos conhecimentos quanto para suprir necessidades de continuidade operacional.",
        ],
      },
    ],
  },
  {
    file: "Service_Manager_Nivel_I_Spin.pdf",
    headerKicker: "ATIVIDADES RELACIONADAS À PRESTAÇÃO  ·  OPERAÇÕES — ESPECIALISTA EM SERVIÇO",
    title: "Service Manager",
    level: "Nível I",
    subtitle: "Prestador(a) de Serviços — Continuidade operacional e integridade de jogo",
    footerLeft: "Spin Gaming — Service Manager Nível I · Uso interno",
    sections: [
      {
        num: "1",
        title: "DESCRIÇÃO DAS ATIVIDADES",
        body: "Responsável por garantir o funcionamento contínuo das operações do estúdio de jogos ao vivo, monitorando a execução dos jogos, a integridade das partidas e a correta aplicação dos procedimentos operacionais. Atua também na moderação do chat e no atendimento a demandas de Customer Service — incluindo sinais de linguagem inadequada e ativações de Jogo Responsável — além de identificar e tratar incidentes, oferecendo suporte às equipes de mesa e contribuindo para a estabilidade e a qualidade dos serviços prestados pela Spin Gaming.",
      },
      {
        num: "2",
        title: "PRINCIPAIS ATIVIDADES",
        bullets: [
          "Executar e monitorar as operações diárias do estúdio, garantindo funcionamento contínuo e sem interrupções.",
          "Garantir que os resultados dos jogos sejam concluídos e processados de acordo com os procedimentos definidos.",
          "Supervisionar a integridade do jogo em tempo real, prevenindo e identificando desvios.",
          "Identificar, analisar, registrar, resolver e escalar incidentes operacionais conforme necessário.",
          "Manusear cartas e demais equipamentos de estúdio quando a situação exigir.",
          "Prestar cobertura a outros prestadores de serviços durante períodos de indisponibilidade programada ou outras ausências.",
          "Apoiar o treinamento e a ambientação de novos prestadores de serviços na função.",
          "Utilizar sistemas internos (sistema da Spin, MS Office) para registro e acompanhamento das ocorrências.",
          "Reportar à liderança sugestões de melhoria nos processos de Gerenciamento de Serviço.",
          "Atender prontamente aos sinais do chat — palavrões, nicks de baixo calão e ativações de Jogo Responsável — resolvendo a ocorrência o mais rápido possível.",
          "Manter os manuais operacionais atualizados no sistema da Spin, refletindo fielmente os procedimentos diários e as demandas que possam surgir.",
          "Manter atualizado o glossário de palavrões e nicks proibidos, prevenindo tentativas de burlar o filtro com números ou símbolos.",
          "Criar tickets no sistema da Spin para as principais ativações e ocorrências do setor.",
          "Prestar suporte a outros Service Managers e Shift Leaders durante o turno, especialmente quando estes não estiverem disponíveis.",
          "Atender às demandas de atendimento ao cliente dos operadores parceiros, com atenção especial aos tickets relacionados a payout.",
          "Assumir rotações na mesa tanto para vivência e modernização dos conhecimentos quanto para suprir necessidades de continuidade operacional.",
        ],
      },
    ],
  },
  {
    file: "Service_Manager_Nivel_III_Spin.pdf",
    headerKicker: "ATIVIDADES RELACIONADAS À PRESTAÇÃO  ·  OPERAÇÕES — ESPECIALISTA EM SERVIÇO",
    title: "Service Manager",
    level: "Nível III",
    subtitle: "Prestador(a) de Serviços — Continuidade operacional sênior e integridade de jogo",
    footerLeft: "Spin Gaming — Service Manager Nível III · Uso interno",
    sections: [
      {
        num: "1",
        title: "DESCRIÇÃO DAS ATIVIDADES",
        body: "Responsável pela gestão operacional sênior dos serviços do estúdio de jogos ao vivo, assegurando a continuidade das operações, a integridade dos jogos e o adequado tratamento de incidentes de maior complexidade. Supervisiona também a moderação de chat e o atendimento de Customer Service — incluindo ativações de Jogo Responsável — realizado pelos Service Managers Nível I e Nível II. Atua de forma proativa na melhoria de processos, no treinamento das equipes e no suporte a áreas operacionais, contribuindo para elevados padrões de qualidade e disponibilidade dos serviços da Spin Gaming.",
      },
      {
        num: "2",
        title: "PRINCIPAIS ATIVIDADES",
        bullets: [
          "Coordenar a continuidade operacional do estúdio em cenários de maior complexidade ou criticidade.",
          "Conduzir a investigação e o tratamento de incidentes recorrentes ou de causa não evidente.",
          "Propor e implementar melhorias nos processos de Gerenciamento de Serviço, com acompanhamento de resultado.",
          "Apoiar e orientar os Service Managers de outros níveis na condução de ocorrências e no uso de sistemas internos.",
          "Consolidar relatórios de qualidade operacional e integridade de jogo para a Gerência de Operações.",
          "Garantir o treinamento adequado de novos colegas, incluindo aspectos técnicos e de integridade de jogo.",
          "Prestar cobertura a outros prestadores de serviços durante períodos de indisponibilidade programada, mantendo a continuidade do serviço.",
          "Servir de referência técnica sobre regras de jogo e protocolos de integridade para toda a operação.",
          "Supervisionar e validar a atuação dos Service Managers de outros níveis na moderação de chat, no tratamento de ativações de Jogo Responsável e na criação de tickets para as principais ocorrências do setor.",
          "Validar a atualização dos manuais operacionais e do glossário de termos e nicks proibidos no sistema da Spin.",
          "Atuar como ponto de escalonamento para demandas de Customer Service não resolvidas em primeiro nível, incluindo tickets de payout junto aos operadores.",
          "Conduzir a integração e o acompanhamento inicial de novos Service Managers de outros níveis na função.",
          "Propor e revisar critérios de priorização de incidentes com base em impacto operacional e de negócio.",
          "Auditar periodicamente a qualidade dos registros de incidentes e ocorrências realizados pelos Service Managers de outros níveis.",
          "Assumir rotações na mesa tanto para vivência e modernização dos conhecimentos quanto para suprir necessidades de continuidade operacional.",
        ],
      },
    ],
  },
];

function drawHeader(pdf, logoAsset, doc) {
  const gradientH = 3;
  const headerH = 38;
  const rowH = headerH - gradientH;

  pdf.setFillColor(...hexToRgb(BRAND.bgDark));
  pdf.rect(0, 0, PAGE_W, headerH, "F");
  drawGradientRect(pdf, 0, headerH - gradientH, PAGE_W, gradientH, BRAND.gradientStart, BRAND.gradientEnd);

  const logoPad = 4;
  const logoH = rowH - logoPad * 2;
  const logoW = logoAsset ? logoH * logoAsset.aspect : 0;
  const logoX = MARGIN;
  const logoY = logoPad;
  const rowCenterY = rowH / 2;

  if (logoAsset) {
    pdf.addImage(logoAsset.dataUrl, "PNG", logoX, logoY, logoW, logoH);
  } else {
    pdf.setTextColor(...hexToRgb(BRAND.white));
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("SPIN GAMING", logoX, rowCenterY + 2);
  }

  pdf.setFont("helvetica", "bold");
  let fontSize = 8;
  pdf.setFontSize(fontSize);
  pdf.setTextColor(...hexToRgb(BRAND.contrast));
  const kickerX = logoAsset ? logoX + logoW + 8 : MARGIN;
  const kickerMaxW = PAGE_W - MARGIN - kickerX;
  while (fontSize > 6 && pdf.getTextWidth(doc.headerKicker) > kickerMaxW) {
    fontSize -= 0.2;
    pdf.setFontSize(fontSize);
  }
  pdf.text(doc.headerKicker, kickerX, rowCenterY + 2.4);

  return headerH + 10;
}

function paintPageBg(pdf) {
  pdf.setFillColor(...hexToRgb(BRAND.pageBg));
  pdf.rect(0, 0, PAGE_W, PAGE_H, "F");
}

function newPage(pdf, logoAsset, doc) {
  pdf.addPage("a4", "portrait");
  paintPageBg(pdf);
  return drawHeader(pdf, logoAsset, doc);
}

function ensureSpace(pdf, logoAsset, doc, y, needed) {
  if (y + needed <= CONTENT_BOTTOM) return y;
  return newPage(pdf, logoAsset, doc);
}

function drawSectionTitle(pdf, logoAsset, doc, y, num, title) {
  y = ensureSpace(pdf, logoAsset, doc, y, 14);
  pdf.setDrawColor(...hexToRgb(BRAND.accentLine));
  pdf.setLineWidth(0.4);
  pdf.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...hexToRgb(BRAND.action));
  pdf.text(`${num}.`, MARGIN, y + 4);

  pdf.setTextColor(...hexToRgb(BRAND.text));
  pdf.text(title, MARGIN + 7, y + 4);

  return y + 10;
}

function drawBodyParagraph(pdf, logoAsset, doc, y, text) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...hexToRgb(BRAND.textBody));
  const lines = pdf.splitTextToSize(text, CONTENT_W);
  for (const line of lines) {
    y = ensureSpace(pdf, logoAsset, doc, y, LINE_H);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...hexToRgb(BRAND.textBody));
    pdf.text(line, MARGIN, y, { maxWidth: CONTENT_W });
    y += LINE_H;
  }
  return y + 6;
}

function drawBullets(pdf, logoAsset, doc, y, items) {
  const bulletX = MARGIN + 2;
  const textX = MARGIN + 7;
  const textW = CONTENT_W - 9;

  for (const item of items) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(item, textW);
    const blockH = lines.length * LINE_H + 3.2;
    y = ensureSpace(pdf, logoAsset, doc, y, blockH);

    pdf.setFillColor(...hexToRgb(BRAND.contrast));
    pdf.circle(bulletX, y - 1.2, 0.9, "F");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...hexToRgb(BRAND.textBody));
    pdf.text(lines, textX, y, { maxWidth: textW });
    y += blockH;
  }

  return y;
}

function drawFooter(pdf, doc, pageNum, totalPages) {
  const y = PAGE_H - 12;
  pdf.setDrawColor(...hexToRgb(BRAND.accentLine));
  pdf.setLineWidth(0.25);
  pdf.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...hexToRgb(BRAND.textMuted));
  pdf.text(doc.footerLeft, MARGIN, y);
  pdf.text(`Página ${pageNum} de ${totalPages}`, PAGE_W - MARGIN, y, { align: "right" });
}

function generatePdf(doc, logoAsset, outputPath) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  paintPageBg(pdf);

  let y = drawHeader(pdf, logoAsset, doc);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(...hexToRgb(BRAND.text));
  pdf.text(doc.title, MARGIN, y + 6);
  y += 14;

  if (doc.level) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...hexToRgb(BRAND.action));
    pdf.text(doc.level, MARGIN, y);
    y += 7;
  }

  pdf.setDrawColor(...hexToRgb(BRAND.accentLine));
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(10);
  pdf.setTextColor(...hexToRgb(BRAND.textMuted));
  const subLines = pdf.splitTextToSize(doc.subtitle, CONTENT_W);
  pdf.text(subLines, MARGIN, y);
  y += subLines.length * 5 + 8;

  for (const section of doc.sections) {
    y = drawSectionTitle(pdf, logoAsset, doc, y, section.num, section.title);
    if (section.body) {
      y = drawBodyParagraph(pdf, logoAsset, doc, y, section.body);
    }
    if (section.bullets?.length) {
      y = drawBullets(pdf, logoAsset, doc, y, section.bullets);
    }
    y += 4;
  }

  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    drawFooter(pdf, doc, i, total);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(pdf.output("arraybuffer")));
  return outputPath;
}

const downloads = path.join(process.env.USERPROFILE || process.env.HOME || ".", "Downloads");
const logoAsset = readLogoAsset();

for (const doc of DOCS) {
  const saved = generatePdf(doc, logoAsset, path.join(downloads, doc.file));
  console.log(`PDF gerado: ${saved}`);
}
