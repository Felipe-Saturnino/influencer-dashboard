import { RotateCw } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/estudio/controle-turno/rotacao";

/** Tutorial: gerar e publicar a rotação no Controle de Turno — visão de liderança. */
export const TUTORIAL_CONTROLE_TURNO_ROTACAO: TutorialDef = {
  id: "controle-turno-rotacao",
  urlSlug: "ControleTurnoRotacao",
  titulo: "Gerar Rotação",
  section: "Estúdio",
  icon: RotateCw,
  relatedPageKey: "escala_controle_turno",
  relatedTabId: "rotacao",
  objetivo:
    "Como liderança, gerar a prévia da rotação do turno, ajustar o pool (incluindo liderança e protocolo de 20 min), mover prestadores entre estúdios ou na grade e publicar.",
  passos: [
    {
      titulo: "1. Abrir a aba Rotação",
      texto:
        "1. No menu, seção **Estúdio**, clique em **Controle de Turno**.\n2. Clique na aba **Rotação**.\n3. Escolha o **dia** no carrossel (ou **Hoje**) e o **turno** (**Manhã**, **Tarde** ou **Noite**).\n4. Cada **estúdio ativo** aparece em um bloco próprio (**Pool do turno** + grade).\n5. Confira os KPIs do bloco: **Escalados**, **Não Chegaram**, **Horas Adicionais** e **Disponíveis**.\n6. O pool só inclui quem está na **Escala do Turno** com status **Presente**, **Pendente**, **Saída Antecipada** ou **Hora Adicional**. **Falta** fica de fora.\n7. A Escala de Game Presenter do mês precisa estar **aprovada** em **Escala Estúdio** — senão o pool fica vazio.",
      aviso:
        "Gerar prévia e publicar exigem permissão de **Criar**. Incluir liderança e arrastar linhas na grade exigem **Criar** ou **Editar**.",
      imagens: [
        {
          src: `${IMG}/01-aba-rotacao.png`,
          alt: "Controle de Turno — aba Rotação com blocos por estúdio",
        },
      ],
    },
    {
      titulo: "2. Gerar a prévia",
      texto:
        "1. No bloco do estúdio desejado, clique em **Gerar prévia**.\n2. A plataforma monta a grade com slots (padrão **30 min**), cobrindo **todas** as mesas do estúdio.\n3. A ordem das linhas de Game Presenter é **aleatória** a cada geração completa — a sequência de mesas e breaks muda entre dias e regenerações.\n4. Na prévia ficam disponíveis **Incluir Liderança**, o toggle **Rotação de 20min** / **Rotação de 30min** e **Publicar**.\n5. Depois de publicada, o bloco só mostra **Regenerar** (volta ao pool para nova prévia).",
      imagens: [
        {
          src: `${IMG}/02-gerar-previa.png`,
          alt: "Bloco do estúdio após Gerar prévia",
        },
      ],
    },
    {
      titulo: "3. Incluir liderança",
      texto:
        "1. Com a prévia aberta, clique em **Incluir Liderança**.\n2. Abre o painel âmbar: **Shift Leaders** e **Service Managers** escalados no dia (Manhã, Tarde ou Noite na Escala Estúdio) — disponíveis em **qualquer** turno daquele dia.\n3. Clique no card da pessoa desejada para incluí-la na grade.\n4. A liderança **não** entra sozinha na geração — só por este botão.\n5. Na grade, fora da janela de horário da liderança (**08h–20h** ou **20h–08h**, conforme o horário de staff), as células ficam com **X**.\n6. Incluir liderança **não** embaralha de novo as linhas dos GPs já gerados.",
      aviso:
        "Se o painel mostrar que não há liderança disponível, confira se há Shift Leader ou Service Manager com escala aprovada neste dia na Escala Estúdio.",
      imagens: [
        {
          src: `${IMG}/03-incluir-lideranca.png`,
          alt: "Painel Incluir Liderança com Shift Leaders e Service Managers",
        },
      ],
    },
    {
      titulo: "4. Protocolo de 20 min (e 30 min)",
      texto:
        "1. O slot padrão da prévia é **30 minutos**.\n2. Clique no botão âmbar **Rotação de 20min** para regenerar a grade em slots de **20 minutos** (mais slots no turno; útil quando falta cobertura ou o headcount está justo).\n3. Com a grade em 20 min, o mesmo botão passa a **Rotação de 30min** — clique para voltar ao protocolo de 30 minutos.\n4. A regra de negócio mantém o tempo contínuo em mesa o mais próximo possível de **até 2 horas** antes do Break (**4×30 min** ou **6×20 min**).\n5. Use o protocolo de 20 min (ou **Incluir Liderança**) quando a cobertura das mesas falhar na geração ou no reingresso no meio do turno.",
      imagens: [
        {
          src: `${IMG}/04-protocolo-20min.png`,
          alt: "Toggle Rotação de 20min / 30min na prévia",
        },
      ],
    },
    {
      titulo: "5. Mover pessoas entre estúdios",
      texto:
        "1. No **pool** (chips dos prestadores), use o seletor **Mover estúdio…** no chip da pessoa.\n2. Escolha o estúdio de destino — a alocação vale só para aquele **dia e turno** (não altera o cadastro permanente em Staff nem a Escala Estúdio do mês).\n3. Se a pessoa já tiver sido movida manualmente, aparece **Restaurar estúdio** para voltar ao estúdio original da escala.\n4. O mesmo prestador **não** pode ficar em dois estúdios no mesmo dia/turno.\n5. Depois de mover, regenere ou ajuste a prévia do(s) bloco(s) afetado(s) para a grade refletir o novo pool.",
      imagens: [
        {
          src: `${IMG}/05-mover-estudio.png`,
          alt: "Chip do pool com Mover estúdio e Restaurar estúdio",
        },
      ],
    },
    {
      titulo: "6. Mover prestadores na linha da mesma rotação",
      texto:
        "1. Na grade da **prévia**, a primeira coluna é **Equipe**.\n2. Arraste o nome (ou o ícone de arraste) de uma linha e solte sobre outra linha da **mesma** grade.\n3. As duas pessoas **trocam** a sequência de mesas/breaks — só a ordem das linhas muda; os horários dos slots permanecem.\n4. Isso vale **só na prévia** (antes de publicar). Depois de publicada, use **Regenerar** se precisar remontar.\n5. Arrastar linhas **não** é o mesmo que **Mover estúdio…** (que troca o bloco/estúdio do turno).",
      imagens: [
        {
          src: `${IMG}/06-arrastar-linha.png`,
          alt: "Coluna Equipe com arraste para trocar sequência de mesas",
        },
      ],
    },
    {
      titulo: "7. Publicar a rotação",
      texto:
        "1. Revise a grade do bloco (mesas cobertas, liderança, protocolo 20/30 min e ordem das linhas).\n2. Clique em **Publicar**.\n3. Se algum prestador tiver **2 horas ou mais** seguidas em mesa na prévia, a plataforma abre uma confirmação com o tempo máximo detectado (ex.: «2 horas», «2 horas e 20 min») — confirme se quiser seguir ou cancele e ajuste a grade.\n4. Sem esse trecho contínuo ≥ 2h, a publicação grava direto.\n5. Após publicar, o bloco fica em modo publicado: use **Regenerar** só se precisar descartar e gerar de novo a partir do pool.\n6. Repita o fluxo nos outros estúdios do turno, se necessário.",
      imagens: [
        {
          src: `${IMG}/07-publicar.png`,
          alt: "Botão Publicar e confirmação de tempo contínuo em mesa",
        },
      ],
    },
  ],
  notasFinais:
    "— A rotação do CT é o fluxo oficial; a página legada de Rotação no menu Escala foi descontinuada.\n— Chegada no meio do turno: slots já passados não são reescritos; o reingresso começa no próximo slot — se faltar cobertura, use 20 min ou Incluir Liderança.\n— Visibilidade inicial do tutorial: Shift Leader, Service Manager e Gestor de Operações.",
};
