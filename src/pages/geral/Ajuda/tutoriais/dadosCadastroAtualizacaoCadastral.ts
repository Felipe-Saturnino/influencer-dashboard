import { UserPen } from "lucide-react";
import type { TutorialDef } from "./types";

const IMG = "/tutoriais/rh/dados-cadastro-atualizacao";

/** Tutorial: atualização cadastral obrigatória em Dados de Cadastro. */
export const TUTORIAL_DADOS_CADASTRO_ATUALIZACAO: TutorialDef = {
  id: "dados-cadastro-atualizacao-cadastral",
  urlSlug: "DadosCadastroAtualizacaoCadastral",
  titulo: "Atualização Cadastral",
  section: "RH",
  icon: UserPen,
  relatedPageKey: "rh_dados_cadastro",
  objetivo:
    "Concluir a revisão cadastral obrigatória: atualizar dados e documentos quando necessário ou confirmar que tudo está correto.",
  passos: [
    {
      titulo: "1. Abrir Dados de Cadastro",
      texto:
        "1. No menu, seção RH, clique em **Dados de Cadastro**.\n2. Se a revisão estiver pendente, um aviso aparece no topo da página e o sistema pode bloquear a navegação para outras áreas até concluir.",
      imagens: [
        {
          src: `${IMG}/01-pagina-revisao-pendente.png`,
          alt: "Dados de Cadastro com banner de atualização cadastral pendente",
        },
      ],
    },
    {
      titulo: "2. Revisar pendências",
      texto:
        "No bloco de **atualização cadastral**, leia a mensagem em destaque.\n\nSe ainda faltar algo no cadastro, aparece a lista **Pendências para concluir a atualização cadastral** — resolva cada item nas abas indicadas antes de confirmar.\n\nQuando tudo estiver completo, a lista some e você pode usar **Confirmar sem alterações** (passo 4). Requisitos gerais:\n— campos obrigatórios em **Dados cadastrais**;\n— documentos exigidos pelo seu tipo de contrato em **Documentos**;\n— pelo menos uma formação acadêmica e um idioma em **Formação e Competências**;\n— pelo menos uma experiência profissional em **Experiência Profissional** (exceto Estágio e Temporário).",
      imagens: [
        {
          src: `${IMG}/02-pendencias-revisao.png`,
          alt: "Bloco de revisão cadastral com lista de pendências",
        },
      ],
    },
    {
      titulo: "3. Atualizar dados nas abas",
      texto:
        "Se algo mudou desde a última revisão:\n\n1. Vá à aba correspondente — **Dados cadastrais**, **Documentos**, **Formação e Competências** ou **Experiência Profissional**.\n2. Preencha ou corrija os campos obrigatórios (rótulos em vermelho indicam pendência).\n3. Em **Dados cadastrais**, clique em **Salvar alterações** no topo do bloco **Dados pessoais**.\n4. Em **Documentos**, envie ou substitua arquivos nas categorias exigidas — o envio pode concluir a revisão automaticamente quando não houver mais pendências.\n\nNome completo, nickname e e-mail já cadastrado são somente leitura — alterações nesses itens passam pelo RH e Liderança.",
    },
    {
      titulo: "4. Confirmar sem alterações",
      texto:
        "Se **não** houve mudança e o cadastro já está completo:\n\n1. Volte ao bloco de atualização cadastral no topo da página.\n2. Marque a caixa **Confirmo que meus dados cadastrais e documentos estão corretos**.\n3. Clique em **Confirmar sem alterações**.\n\nO botão só fica ativo quando não há pendências na lista. A revisão é registrada e o bloqueio de navegação é liberado.",
      imagens: [
        {
          src: `${IMG}/04-confirmar-sem-alteracoes.png`,
          alt: "Checkbox e botão Confirmar sem alterações habilitados",
        },
      ],
    },
    {
      titulo: "5. Revisão concluída",
      texto:
        "Após salvar alterações com cadastro completo, confirmar sem alterações ou enviar o último documento pendente, o aviso vermelho some.\n\nNo topo da página aparece a data da **última revisão** e a **próxima revisão cadastral** prevista (ciclo de seis meses). Você volta a navegar normalmente na plataforma.",
      imagens: [
        {
          src: `${IMG}/05-revisao-concluida.png`,
          alt: "Mensagem de revisão cadastral concluída",
        },
      ],
    },
  ],
  notasFinais:
    "— A revisão cadastral é obrigatória no primeiro acesso e a cada seis meses.\n— Salvar só parte dos dados **não** encerra a revisão se ainda houver pendências.\n— **Configurações**, **Ajuda** e **Central de Denúncias** permanecem acessíveis mesmo com revisão pendente.",
};
