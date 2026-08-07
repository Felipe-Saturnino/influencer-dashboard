/**
 * Scripts (templates) de descrição por Tipo — Incidentes.
 * Fonte: Word operacional (BRL Jira tickets Description). Tipos fora do catálogo atual do app ficam de fora.
 */

import type { IncidenteTimeAlvo } from "./estudioIncidentesTypes";

export type IncidenteScript = {
  id: string;
  /** Rótulo do chip na faixa de scripts. */
  titulo: string;
  corpo: string;
};

const ANEXO = "O Vídeo/Imagem está anexado.";

/** GP — cartas (Blackjack / Baccarat / Futebol Brasileiro). Chave = rótulo exato do Tipo. */
const SCRIPTS_GP_CARTAS: Record<string, IncidenteScript[]> = {
  "Card not scanned": [
    {
      id: "card-not-scanned",
      titulo: "Padrão",
      corpo: `O Game Presenter falhou em escanear a carta pedida (hit), e a carta seguinte foi escaneada. O Service Manager instruiu o Game Presenter a abrir todas as cartas, e cancelou o jogo.\n${ANEXO}`,
    },
  ],
  "Card(s) on the floor": [
    {
      id: "floor-escaneada",
      titulo: "Escaneada no chão",
      corpo: `O Game Presenter deixou cair uma carta já escaneada no chão. O Service Manager foi até a mesa e pegou a carta do chão. A carta foi usada no jogo afetado.\n${ANEXO}`,
    },
    {
      id: "floor-nao-escaneada",
      titulo: "Não escaneada",
      corpo: `O Game Presenter derrubou uma carta não escaneada no chão. O Service Manager cancelou o jogo.\n${ANEXO}`,
    },
    {
      id: "floor-escaneada-joelho",
      titulo: "Escaneada no joelho",
      corpo: `O Game Presenter derrubou um carta escaneada em seus joelhos/coxas. O Service Manager instruiu o Game Presenter a pegar a carta e continuar o jogo.\n${ANEXO}`,
    },
    {
      id: "floor-nao-escaneada-joelho",
      titulo: "Não escaneada no joelho",
      corpo: `O Game Presenter derrubou uma carta não escaneada em seus joelhos/coxas. O Service Manager instruiu o Game Presenter a pegar a carta e cancelou o jogo.\n${ANEXO}`,
    },
    {
      id: "floor-apos-rodada",
      titulo: "Após rodada",
      corpo: `O Game Presenter derrubou uma ou mais cartas no chão depois da rodada ser encerrada. O Service Manager foi até a mesa pegar as cartas, checar as com face para cima e instruir o Game Presenter a dar continuidade ao jogo.\n${ANEXO}`,
    },
  ],
  "Card scanned too early": [
    {
      id: "early-necessaria",
      titulo: "Carta necessária",
      corpo: `O Game Presenter puxou uma carta extra antes do tempo. O Service Manager resumiu o jogo, pois, a carta mostrou-se necessária.\n${ANEXO}`,
    },
    {
      id: "early-queimar",
      titulo: "Queimar carta extra",
      corpo: `O Game Presenter puxou uma carta extra antes do tempo. O Service Manager resumiu o jogo e instruiu o Game Presenter a queimar a carta extra\n${ANEXO}`,
    },
  ],
  "Cards Scattered or Dropped": [
    {
      id: "scattered-shoe",
      titulo: "Troca de Shoe",
      corpo: `O Game Presenter derrubou as cartas durante o procedimento de troca de sapato. O Service Manager foi até a mesa para ajudar a coletar as cartas. Assim que todas as cartas espalhadas foram coletadas, o jogo foi retomado.\n${ANEXO}`,
    },
    {
      id: "scattered-fim",
      titulo: "Fim da rodada",
      corpo: `O Game Presenter derrubou/esparramou as cartas durante o recolhimento no fim da rodada. O Service Manager instruiu o Game Presenter a coletar as cartas. Quando as cartas espalhadas/derrubadas foram coletas - o jogo foi resumido.\n${ANEXO}`,
    },
  ],
  "Cards scattered or dropped": [
    {
      id: "scattered-shoe-bf",
      titulo: "Troca de Shoe",
      corpo: `O Game Presenter derrubou as cartas durante o procedimento de troca de sapato. O Service Manager foi até a mesa para ajudar a coletar as cartas. Assim que todas as cartas espalhadas foram coletadas, o jogo foi retomado.\n${ANEXO}`,
    },
    {
      id: "scattered-fim-bf",
      titulo: "Fim da rodada",
      corpo: `O Game Presenter derrubou/esparramou as cartas durante o recolhimento no fim da rodada. O Service Manager instruiu o Game Presenter a coletar as cartas. Quando as cartas espalhadas/derrubadas foram coletas - o jogo foi resumido.\n${ANEXO}`,
    },
  ],
  "Extra card not needed": [
    {
      id: "extra-card",
      titulo: "Padrão",
      corpo: `O Game Presenter puxou uma carta extra não necessária para o jogo. O Service Manager instruiu o Game Presenter a abrir a carta extra e posicioná-la próxima ao scanner. Após isso, as cartas foram coletadas com a permissão do Service Manager.\n${ANEXO}`,
    },
  ],
  "Faced up card in the shoe": [
    {
      id: "faced-up",
      titulo: "Padrão",
      corpo: `Uma ou mais cartas apareceram viradas dentro do sapato. O Service Manager cancelou o jogo e instruiu o Game Presenter para proceder com a "troca de sapato".\n${ANEXO}`,
    },
  ],
  "Game before time": [
    {
      id: "gbt-nao-exposta",
      titulo: "Carta não exposta",
      corpo: `O Game Presenter puxou a carta antes do jogo se iniciar e não a expôs(carta). O Service Manager resumiu o jogo e instruiu o Game Presenter para usar esta carta no "jogo afetado".\n${ANEXO}`,
    },
    {
      id: "gbt-exposta",
      titulo: "Carta exposta",
      corpo: `O Game Presenter puxou a carta antes do jogo começar e a expôs. O Service Manager cancelou o jogo.\n${ANEXO}`,
    },
  ],
  "Game(s) instead of the shoe change": [
    {
      id: "shoe-iniciado",
      titulo: "Jogo Iniciado",
      corpo: `O Game Presenter não fez a troca de sapato requerida e procedeu com um novo jogo. O Service Manager instruiu o Game Presenter a finalizar o jogo e após isso, realizar a troca de sapato.\n${ANEXO}`,
    },
    {
      id: "shoe-nao-iniciado",
      titulo: "Jogo não Iniciado",
      corpo: `O Game Presenter não fez a troca de sapato requerida e não procedeu com um novo jogo. O Service Manager instruiu o Game Presenter a trocar o sapato durante o tempo de apostas do próximo jogo.\n${ANEXO}`,
    },
  ],
  "Hidden card opened before time": [
    {
      id: "hidden-cancelou",
      titulo: "Cancelou",
      corpo: `O Game Presenter abriu a carta "escondida" antes do tempo necessário. O Service Manager cancelou o jogo.\n${ANEXO}`,
    },
    {
      id: "hidden-sem-impacto",
      titulo: "Sem Impacto",
      corpo: `O Game Presenter abriu a carta "escondida" antes do tempo necessário. Como as decisões do jogador não foram afetadas por isso, o jogo foi resolvido.\n${ANEXO}`,
    },
  ],
  "ID card not scanned": [
    {
      id: "id-not-scanned",
      titulo: "Padrão",
      corpo: `Game Presenter não escaneou sua ID quando chegou a mesa e está com seu "nickname" errado.\nTime frame: 00:00 UTC - 00:01 UTC\n${ANEXO}`,
    },
  ],
  "Incorrect burn procedure": [
    {
      id: "burn-extra",
      titulo: "Carta extra",
      corpo: `O Game Presenter puxou uma carta extra durante o "procedimento de queima de cartas". O Service Manager instruiu o Game Presenter a usar a carta extra como uma carta de queima e "descartá-la" também..\n${ANEXO}`,
    },
    {
      id: "burn-abriu",
      titulo: "Abriu queima",
      corpo: `O Game Presenter abriu as cartas de queima durante o procedimento. O Service Manager instruiu o Game Presenter a virar as cartas, deixando-as com a face para baixo e prosseguir com a queima.\n${ANEXO}`,
    },
    {
      id: "burn-scan",
      titulo: "Scan incorreto",
      corpo: `Duas cartas/Cartas incorretas foram escaneadas sendo a(s) cartas de face para cima(indicando quantas deveriam ser queimadas). O SSM instruiu o GP a abrir ambas as cartas e cancelou o jogo. Após cancelar o jogo, o SSM pediu ao GP para re-escanear a carta correta; rescaneando a segunda carta que foi queimada e continuando com o procedimento correto de queima.`,
    },
  ],
  "Incorrect card position": [
    {
      id: "pos-reconstruiu",
      titulo: "Reconstruiu",
      corpo: `O Game Presenter distribuiu as cartas de maneira incorreta. Service Manager foi até a mesa e reconstruiu o jogo, após isso, o jogo foi resolvido/resumido.\n${ANEXO}`,
    },
    {
      id: "pos-cancelou",
      titulo: "Cancelou",
      corpo: `O Game Presenter distribuiu as cartas de maneira incorreta. O Service Manager cancelou o jogo pois as posições das cartas estavam completamente aleatórias.\n${ANEXO}`,
    },
  ],
  "Less/ More boxes": [
    {
      id: "boxes-menos",
      titulo: "Menos assentos",
      corpo: `O Game Presenter distribuiu as cartas para menos assentos do que era necessário. O Service Manager foi até a mesa para reconstruir o jogo. Após o jogo ser reconstruído, a rodada foi resumida.\n${ANEXO}`,
    },
    {
      id: "boxes-mais",
      titulo: "Mais assentos",
      corpo: `O Game Presenter distribuiu as cartas para mais assentos do que era necessário. A carta escondida foi exposta - O Service Manager cancelou o jogo.\n${ANEXO}`,
    },
  ],
  Misscan: [
    {
      id: "misscan-rescan",
      titulo: "Rescan",
      corpo: `O Game Presenter falhou em escanear a carta e a próxima carta foi escaneada. O Service Manager instruiu o Game Presenter a fazer o procedimento de "rescan", após isso, o jogo foi resumido.\n${ANEXO}`,
    },
    {
      id: "misscan-cancelou",
      titulo: "Cancelou",
      corpo: `Game Presenter falhou em escanear a carta e a próxima carta foi escaneada. O Service Manager instruiu o Game Presenter a abrir a carta escondida da banca e cancelou o jogo(rodada).\n${ANEXO}`,
    },
  ],
  "Next card scanned instead of the hidden card": [
    {
      id: "next-instead-hidden",
      titulo: "Padrão",
      corpo: `O Game Presenter puxou a próxima carta do sapato ao invés de escanear a carta escondida. A carta foi usada/ A carta foi descartada.\n${ANEXO}`,
    },
  ],
  "Removed cards before the end of the game": [
    {
      id: "removed-before-end",
      titulo: "Padrão",
      corpo: `O Game Presenter recolheu as cartas antes do jogo ser finalizado por completo. O Service Manager foi até a mesa para reconstruir o jogo, após isso, o Game Presenter foi instruído a finalizar o jogo.\n${ANEXO}`,
    },
  ],
  "Scan Hidden Card before time": [
    {
      id: "scan-hidden-early",
      titulo: "Padrão",
      corpo: `O Game Presenter escaneou a carta escondida antes do que era necessário. O Service Manager resumiu o jogo e instruiu o Game Presenter a continuar o jogo.\n${ANEXO}`,
    },
  ],
  "Two (or more) cards out": [
    {
      id: "two-out-rescan",
      titulo: "Rescan",
      corpo: `Duas ou mais cartas saíram do sapato e as cartas foram escaneadas incorretamente. Service Manager instruiu o Game Presenter para proceder com o "rescan" e resumiu o jogo.\n${ANEXO}`,
    },
    {
      id: "two-out-cancelou",
      titulo: "Cancelou",
      corpo: `Duas ou mais cartas saíram do sapato e as cartas foram escaneadas incorretamente. Service Manager instruiu o Game Presenter a abrir a carta escondida da banca e cancelou o jogo.\n${ANEXO}`,
    },
    {
      id: "two-out-scan-ok",
      titulo: "Scan correto",
      corpo: `Duas ou mais cartas saíram do sapato e as cartas foram escaneadas corretamente. Service Manager instruiu o Game Presenter a posicionar as cartas corretamente e resumiu o jogo.\n${ANEXO}`,
    },
    {
      id: "two-out-decisao",
      titulo: "Em decisão",
      corpo: `Duas ou mais cartas saíram fora do sapato no momento de decisão do "jogador" e a carta incorreta foi escaneada. Service Manager instruiu o Game Presenter a reposicionar as cartas para o assento (x) e cancelou o jogo.\n${ANEXO}`,
    },
    {
      id: "two-out-final",
      titulo: "Final incorreto",
      corpo: `Duas ou mais cartas saíram do sapato e as cartas foram escaneadas incorretamente. Jogo foi finalizado. O valor final ficou incorreto, devendo a banca/jogador terminar com X ponto, porém o resultado permaneceu correto, com o jogador/banca vencendo.`,
    },
    {
      id: "two-out-resultado",
      titulo: "Resultado errado",
      corpo: `Duas ou mais cartas saíram do sapato e as cartas foram escaneadas incorretamente. Jogo foi cancelado. O valor final e o resultado foram errados, devendo a banca/jogador terminar com X ponto, com banca/jogador vencendo.`,
    },
  ],
  "Two (or more) cards out (with cutting card)": [
    {
      id: "cc-carta-escaneada",
      titulo: "Carta escaneada",
      corpo: `Uma carta com a CC saiu fora do sapato, a carta foi escaneada. Service Manager instruiu o Game Presenter a posicionar a carta para o jogador e "re-escanear" a CC(Carta de Corte).\n${ANEXO}`,
    },
    {
      id: "cc-cc-escaneada",
      titulo: "CC escaneada",
      corpo: `Uma carta com a CC saiu fora do sapato, a carta de corte(CC) foi escaneada. Service Manager instruiu o Game Presenter a posicionar a carta de corte(CC) próxima ao dispenser, re-escanear a carta(comum) e posicioná-la onde deveria estar.\n${ANEXO}`,
    },
  ],
};

/** GP — Roleta. */
const SCRIPTS_GP_ROLETA: Record<string, IncidenteScript[]> = {
  "No spin": [
    {
      id: "nospin-antes",
      titulo: "Antes de cair",
      corpo: `O Game Presenter fez um giro inválido, porém pegou a bola ANTES de cair na roleta. O Game Presenter informou o Service Manager sobre o procedimento de re-spin.\n${ANEXO}`,
    },
    {
      id: "nospin-depois",
      titulo: "Depois de cair",
      corpo: `O Game Presenter fez um giro inválido, porém pegou a bola DEPOIS de cair na roleta. O Game Presenter informou o Service Manager sobre o procedimento de re-spin.\n${ANEXO}`,
    },
    {
      id: "nospin-pausado",
      titulo: "Jogo pausado",
      corpo: `O Game Presenter fez um giro inválido que fez o jogo ser pausado. O Service Manager instruiu o Game Presenter a fazer um re-spin.\n${ANEXO}`,
    },
  ],
  "Ball dropped": [
    {
      id: "ball-dropped",
      titulo: "Padrão",
      corpo: `O Game Presenter antes de colocar a bola no aro, deixou cair dentro da roleta. O Game Presenter informou o Service Manager sobre o procedimento de re-spin.\n${ANEXO}`,
    },
  ],
  "Ball out": [
    {
      id: "ball-out-giro",
      titulo: "No giro",
      corpo: `O Game Presenter ao realizar o giro, fez com que a bola saísse da roleta. O GP pressionou o botão "Ball Out" e depois prosseguiu com a bola reserva. O SM verificou o local em que a bola caiu e durante o tempo de apostas fez a reposição da bola na torre da roleta\n${ANEXO}`,
    },
    {
      id: "ball-out-numeros",
      titulo: "Indo aos números",
      corpo: `No momento em que a bola estava indo para os números, fez com que a bola saísse da roleta. O GP pressionou o botão "Ball Out" e depois prosseguiu com a bola reserva. O SM verificou o local em que a bola caiu e durante o tempo de apostas fez a reposição da bola na torre da roleta.\n${ANEXO}`,
    },
  ],
  "Game before time / Early spin": [
    {
      id: "early-spin",
      titulo: "Padrão",
      corpo: `O Game Presenter girou a bola antes dos 7 segundos finais de apostas. O Service Manager cancelou o jogo e informou o Game Presenter para colocar a bola no último número registrado e depois, seguir para a próxima rodada.\nO Vídeo/Imagem está anexada.`,
    },
  ],
  "Same direction": [
    {
      id: "same-direction",
      titulo: "Padrão",
      corpo: `O Game Presenter fez o giro do cilindro na direção correta, porém fez o giro da bola na mesma direção em que estava indo o cilindro. O Service Manager instruiu o Game Presenter a fazer o re-spin da bola na direção contrária.\n${ANEXO}`,
    },
  ],
  "Ball spun twice instead of confirming the result": [
    {
      id: "spun-twice-incorreto",
      titulo: "Resultado incorreto",
      corpo: `O Game Presenter fez um segundo giro em vez de deixar ser confirmado o primeiro número vencedor. O Game Presenter informou o Service Manager sobre o re-spin. O jogo terminou com o resultado INCORRETO.\n${ANEXO}`,
    },
    {
      id: "spun-twice-pausado",
      titulo: "Pausado antes",
      corpo: `O Game Presenter fez um segundo giro em vez de deixar ser confirmado o primeiro número vencedor. O Game Presenter informou o Service Manager sobre o re-spin. O jogo foi pausado ANTES do resultado ser computado.\n${ANEXO}`,
    },
  ],
  "Two balls in the wheel": [
    {
      id: "two-balls-wheel",
      titulo: "Padrão",
      corpo: `O Game Presenter derrubou a bola reserva dentro da roleta, fazendo com que 2 bolas estivessem dentro da roleta. O Service Manager foi até a mesa, explicou a situação para os jogadores, posicionou uma das bolas na torre e a outra no último número e instruiu o Game Presenter a prosseguir com o jogo.\n${ANEXO}`,
    },
  ],
  "Two balls out": [
    {
      id: "two-balls-out",
      titulo: "Padrão",
      corpo: `O Game Presenter comete um "ball out". A bola reserva é utilizada para fazer o re-spin, porém comete outro ball out, ficando sem bolas para efetuar o giro. O Service Manager leva 2 bolas para a mesa, posicionando a primeira no último número computado e a segunda na torre e informa o Game Presenter a fazer o re-spin.\n${ANEXO}`,
    },
  ],
  "Wrong direction": [
    {
      id: "wrong-dir-nao",
      titulo: "Não alterou",
      corpo: `O Game Presenter não alterou a direção da roleta quando era necessário. O Service Manager instruiu o Game Presenter a mudar a direção da roleta e proceder com o re-spin.\n${ANEXO}`,
    },
    {
      id: "wrong-dir-sim",
      titulo: "Alterou sem precisar",
      corpo: `O Game Presenter alterou a direção da roleta quando não era necessário. O Service Manager instruiu o Game Presenter a mudar a direção da roleta e proceder com o re-spin.\n${ANEXO}`,
    },
  ],
  "Wheel stopped": [
    {
      id: "wheel-stopped",
      titulo: "Padrão",
      corpo: `O Game Presenter falhou em manter a velocidade da roleta. Service Manager pediu para o Game Presenter empurrar o cilindro e fazer o re-spin.\n${ANEXO}`,
    },
  ],
};

/** Shuffler — só tipos existentes no select do app. */
const SCRIPTS_SHUFFLER: Record<string, IncidenteScript[]> = {
  "Bad Shuffle": [
    {
      id: "bad-shuffle",
      titulo: "Padrão",
      corpo: `Após o Game Presenter distribuir algumas rodadas, o sistema acusou que houve um "mau embaralhamento". O Service Manager instruiu o Game Presenter a fazer o processo de troca de sapato e prosseguir com as rodadas.\nMau embaralhamento foi realizado às 00:00 UTC\n${ANEXO}`,
    },
  ],
  "Card(s) on the floor": [
    {
      id: "shuf-floor-ate3",
      titulo: "Até 3 · 1ª/2ª torre",
      corpo: `O Shuffler durante a 1/2° torre deixou até 3 cartas caírem no chão. O Service Manager foi até a mesa, pegou a(s) carta(s) do chão, reposicionou na torre e solicitou que o shuffler seguisse o embaralhamento de onde estava.\n${ANEXO}`,
    },
    {
      id: "shuf-floor-mais3",
      titulo: "Mais de 3 · 1ª/2ª torre",
      corpo: `O Shuffler durante a 1/2° torre deixou mais de 3 cartas caírem no chão. O Service Manager foi até a mesa, pegou a(s) carta(s) do chão, reposicionou na torre e solicitou que o Shuffler fizesse o embaralhamento completo, do começo.\n${ANEXO}`,
    },
    {
      id: "shuf-floor-3a",
      titulo: "3ª torre",
      corpo: `O Shuffler durante a 3° torre deixou a(s) carta(s) caírem no chão. O Service Manager foi até a mesa, pegou a(s) carta(s) do chão, reposicionou na torre e solicitou que o Shuffler fizesse o embaralhamento completo, do começo.\n${ANEXO}`,
    },
  ],
  "Cards Scattered": [
    {
      id: "shuf-scat-ate3",
      titulo: "Até 3 · 1ª/2ª torre",
      corpo: `O Shuffler durante a 1/2° torre deixou até 3 cartas caírem na mesa de embaralhamento. O Service Manager solicitou para que o Shuffler reposicionasse às cartas e seguisse o embaralhamento de onde estava.\n${ANEXO}`,
    },
    {
      id: "shuf-scat-mais3",
      titulo: "Mais de 3",
      corpo: `O Shuffler deixou mais de 3 cartas caírem na mesa de embaralhamento. O Service Manager solicitou para que o Shuffler reposicionasse às cartas e fizesse o embaralhamento completo, do começo.\n${ANEXO}`,
    },
    {
      id: "shuf-scat-3a",
      titulo: "3ª torre",
      corpo: `O Shuffler durante a 3° torre deixou as cartas caírem na mesa de embaralhamento. O Service Manager solicitou para que o Shuffler reposicionasse às cartas e fizesse o embaralhamento completo, do começo.\n${ANEXO}`,
    },
  ],
  "CC placed incorrectly": [
    {
      id: "cc-sistema",
      titulo: "Sistema pediu troca",
      corpo: `O Shuffler após o embaralhamento, posicionou o cutting card no local incorreto. Antes do Cutting card sair, o sistema informou o Game Presenter para trocar o sapato.\n${ANEXO}`,
    },
    {
      id: "cc-proporcao",
      titulo: "Proporção 7:1 / 4:4",
      corpo: `O Shuffler posicionou o cutting card incorretamente. Na vez de posicionar o CC 7:1, o shuffler posicionou 4:4 (ou vice-versa). Service Manager foi até a mesa e reposicionou o cutting card corretamente.\n${ANEXO}`,
    },
  ],
};

/**
 * Scripts disponíveis para o formulário (Time + Tipo).
 * Tipos sem entrada no catálogo → lista vazia (UI não mostra a faixa).
 */
export function scriptsParaIncidente(
  timeAlvo: IncidenteTimeAlvo,
  tipo: string,
): IncidenteScript[] {
  const t = tipo.trim();
  if (!t) return [];
  if (timeAlvo === "shuf") {
    return SCRIPTS_SHUFFLER[t] ?? [];
  }
  return SCRIPTS_GP_CARTAS[t] ?? SCRIPTS_GP_ROLETA[t] ?? [];
}
