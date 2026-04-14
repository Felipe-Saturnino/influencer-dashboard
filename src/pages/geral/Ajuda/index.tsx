import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BRAND_SEMANTIC, FONT, FONT_TITLE } from "../../../constants/theme";
import { AbaGlossario } from "./GlossarioPanel";
import type { PageKey } from "../../../types";
import { HelpCircle } from "lucide-react";
import {
  GiTv,
  GiCalendar,
  GiConversation,
  GiPerson,
  GiBinoculars,
  GiCash,
} from "react-icons/gi";

type Aba = "conheca" | "troubleshooting" | "glossario";

// ─── Menu estrutura ───────────────────────────────────────────────────────────
const MENU_AJUDA = [
  {
    section: "Dashboards",
    items: [
      { key: "streamers" as PageKey, label: "Streamers", Icon: GiTv },
    ],
  },
  {
    section: "Lives",
    items: [
      { key: "agenda" as PageKey, label: "Agenda", Icon: GiCalendar },
      { key: "feedback" as PageKey, label: "Feedback", Icon: GiConversation },
    ],
  },
  {
    section: "Operações",
    items: [
      { key: "influencers" as PageKey, label: "Influencers", Icon: GiPerson },
      { key: "scout" as PageKey, label: "Scout", Icon: GiBinoculars },
      { key: "financeiro" as PageKey, label: "Financeiro", Icon: GiCash },
    ],
  },
];

// ─── Conteúdo: Conheça a Plataforma ──────────────────────────────────────────
const CONTEUDO_CONHECA: Record<string, { titulo: string; blocos: { subtitulo?: string; texto: string }[] }> = {
  streamers: {
    titulo: "Streamers",
    blocos: [
      {
        texto:
          "Área unificada com três abas — Overview executivo, Conversão e Dashboard financeiro — para análise de performance das lives e dos jogadores captados. O acesso é controlado por uma única permissão na Gestão de Usuários (página Streamers). Influencers e agências continuam usando o Overview Influencer, separado.",
      },
      {
        subtitulo: "Aba Overview",
        texto:
          "Painel executivo: KPIs financeiros, operacionais e de aquisição, funil de conversão agregado e ranking de influencers com classificação de performance (Rentável, Atenção, Não Rentável, Bônus).",
      },
      {
        subtitulo: "Aba Conversão",
        texto:
          "Funil detalhado por influencer, comparativo lado a lado entre dois parceiros, ranking FTD/hora e tabela de taxas com ações recomendadas.",
      },
      {
        subtitulo: "Aba Financeiro",
        texto:
          "KPIs do comportamento financeiro dos jogadores (depósitos, saques, WD Ratio, GGR por jogador, PVI), distribuição de investimento e ranking financeiro por influencer.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Em cada aba, o bloco de filtros segue o mesmo padrão dos dashboards anteriores: mês, Histórico, influencer e operadora conforme seu perfil e escopo.",
      },
    ],
  },
  agenda: {
    titulo: "Agenda",
    blocos: [
      {
        texto:
          "Calendário completo das lives da operação. Permite visualizar, criar e acompanhar todas as ativações agendadas por influencer, plataforma e operadora.",
      },
      {
        subtitulo: "Visualização do Calendário",
        texto:
          "A agenda pode ser exibida em três modos: Mensal, Semanal ou Diário. Use as setas para navegar entre períodos ou clique em Hoje para voltar à data atual.\n\nCada live é exibida no dia correspondente com seu status identificado por cor: Agendada (roxo), Realizada (verde) e Não Realizada (vermelho).",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Use os filtros no topo para segmentar a visualização por influencer, operadora e plataforma (Twitch, YouTube, Instagram, TikTok, Kick, Discord, WhatsApp ou Telegram). Os filtros de status permitem ocultar ou destacar lives por situação.",
      },
      {
        subtitulo: "Criando uma Nova Live",
        texto:
          "Clique em + Nova Live para abrir o modal de criação. Preencha:\n\n— Influencer: selecione o parceiro responsável pela live\n— Data e Horário: quando a live está programada\n— Plataforma: Twitch, YouTube, Instagram, TikTok, Kick, Discord, WhatsApp ou Telegram\n— Link: o campo de link é exibido automaticamente para a plataforma selecionada e é obrigatório para salvar a live",
      },
      {
        subtitulo: "Permissões",
        texto:
          "Todos os perfis podem criar lives. Influencers visualizam apenas as próprias lives na agenda — gestores e admins visualizam todas.",
      },
    ],
  },
  feedback: {
    titulo: "Feedback",
    blocos: [
      {
        texto:
          "Histórico completo das lives validadas na operação. Permite acompanhar o resultado final de cada ativação — duração, audiência e status — com visão consolidada por período.",
      },
      {
        subtitulo: "KPIs do Período",
        texto:
          "No topo da página são exibidos os indicadores consolidados do período selecionado:\n\n— Total de Lives: quantidade total de lives no período, com breakdown entre realizadas e não realizadas.\n— Horas Realizadas: soma das durações de todas as lives realizadas.\n— Média de Views: média das médias de views por live no período.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Selecione o período de análise — Semana, Mês ou Tudo — e combine com os filtros de status (Realizada, Não Realizada), operadora e influencer para refinar a visualização.",
      },
      {
        subtitulo: "Lista de Lives",
        texto:
          "Cada live exibe data, horário, influencer, plataforma e os três indicadores de audiência: Duração, Média de Views e Pico de Views. Lives realizadas aparecem com destaque verde; não realizadas, com vermelho.\n\nInfluencers visualizam apenas as próprias lives. Gestores e admins visualizam todas.",
      },
    ],
  },
  influencers: {
    titulo: "Influencers",
    blocos: [
      {
        texto:
          "Cadastro central dos parceiros da operação. Reúne todos os dados necessários para ativar, acompanhar e pagar cada influencer — e serve de base para os módulos de Agenda, Resultados, Feedback e Financeiro.",
      },
      {
        subtitulo: "Cards de Resumo",
        texto:
          "Dois cards no topo oferecem uma leitura rápida da base:\n\n— Total de Influencers: quantidade total cadastrada, com breakdown por status (Ativo, Inativo, Cancelado) e por plataforma ativa.\n— Perfil Incompleto: influencers ativos com dados obrigatórios pendentes. A lista é clicável — acesse diretamente os perfis que precisam de atualização, especialmente antes de fechamentos financeiros.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Combine os filtros para localizar rapidamente qualquer parceiro na base:\n\n— Busca: por nome artístico ou e-mail\n— Status: Ativo, Inativo ou Cancelado\n— Plataforma: Twitch, YouTube, Instagram, TikTok, Kick, Discord, WhatsApp ou Telegram\n— Operadora: filtra por relacionamento comercial\n— Cachê por hora: slider para encontrar parceiros dentro de uma faixa de orçamento",
      },
      {
        subtitulo: "Lista de Influencers",
        texto:
          "Cada influencer aparece em um card com: avatar, nome artístico, status, cachê por hora, canais ativos e operadoras vinculadas.\n\nO status pode ser alterado diretamente no card, sem precisar abrir o perfil completo.",
      },
      {
        subtitulo: "Visualizando e Editando um Perfil",
        texto:
          "Clique em Ver para consultar o perfil em modo leitura, ou em Editar para atualizar os dados. As informações são organizadas em quatro abas:\n\n— Cadastral: dados de identificação do influencer\n— Canais: plataformas em que o influencer atua e seus links\n— Financeiro: dados para cálculo e pagamento\n— Operadoras: operadoras vinculadas e identificadores associados\n\nO próprio influencer ou sua agência pode editar o próprio perfil diretamente na plataforma.",
      },
    ],
  },
  scout: {
    titulo: "Scout",
    blocos: [
      {
        texto:
          "Pipeline de prospecção de novos influencers. Registre candidatos, acompanhe o andamento das negociações e mantenha o histórico de contatos em um só lugar.",
      },
      {
        subtitulo: "Funil de Prospecção",
        texto:
          "Os cards no topo mostram quantos prospectos estão em cada etapa do funil:\n\n— Visualizado: perfil identificado, ainda sem contato iniciado\n— Contato: abordagem realizada, aguardando resposta\n— Negociação: condições sendo discutidas\n— Fechado: parceria confirmada",
      },
      {
        subtitulo: "Cobertura de Plataformas",
        texto:
          "Exibe quantos prospectos estão cadastrados por plataforma — Twitch, YouTube, Instagram, TikTok, Kick, Discord, WhatsApp e Telegram. Útil para identificar gaps de cobertura na estratégia de prospecção.",
      },
      {
        subtitulo: "Filtros",
        texto:
          "Localize prospectos rapidamente combinando os filtros disponíveis:\n\n— Busca: por nome ou e-mail\n— Status: etapa do funil\n— Plataforma: canal de atuação\n— Cachê por hora: faixa de orçamento negociado\n— Views: faixa de audiência média",
      },
      {
        subtitulo: "Lista de Prospectos",
        texto:
          "Cada prospecto exibe nome, status atual, plataformas com média de views, cachê negociado e categoria. O status pode ser atualizado diretamente no card, sem abrir o perfil completo.",
      },
      {
        subtitulo: "Adicionando e Editando um Prospecto",
        texto:
          "Clique em + Adicionar para registrar um novo candidato. O modal é organizado em três abas:\n\n— Contato: nome artístico, status no funil, tipo de contato, cachê negociado, categoria e e-mail\n— Canais: plataformas em que o prospecto atua e métricas de audiência\n— Anotações: campo livre para registrar observações sobre a negociação\n\nApenas admins e gestores podem adicionar e editar prospectos.",
      },
    ],
  },
  financeiro: {
    titulo: "Financeiro",
    blocos: [
      {
        texto:
          "Central de gestão de pagamentos dos influencers parceiros. Acompanhe ciclos semanais, aprove valores, registre pagamentos e consulte o histórico financeiro de cada parceiro.",
      },
      {
        subtitulo: "KPIs",
        texto:
          "Três indicadores consolidados no topo, com filtro próprio de período (Total ou por mês):\n\n— Total Pago: volume financeiro já realizado para influencers e agentes.\n— Pendente: valor ainda em aberto, em análise ou aguardando pagamento.\n— Total de Horas Realizadas: volume de horas que gerou base de cálculo para os pagamentos.",
      },
      {
        subtitulo: "Ciclo de Pagamento",
        texto:
          "Os pagamentos são organizados em ciclos semanais. Selecione o ciclo no seletor para visualizar o status financeiro daquele período.\n\nCiclo aberto (atual): exibe um preview em tempo real com as lives realizadas, horas e valores estimados. Nenhum pagamento definitivo é gerado enquanto o ciclo está em andamento.\n\nCiclo fechado: o sistema fecha automaticamente após a data final e gera os pagamentos com status Em análise. A partir daí, o fluxo segue três etapas:\n\n— Analisar: abre o detalhamento do pagamento — lives consideradas, horas e valor calculado. É possível ajustar o valor manualmente antes de aprovar.\n— A pagar: pagamento aprovado, aguardando quitação.\n— Pago: pagamento registrado. A plataforma salva automaticamente a data de pagamento.\n\nTambém é possível registrar Pagamentos de Agente de forma independente, sem vínculo com horas de live.",
      },
      {
        subtitulo: "Consolidado de Influencers",
        texto:
          "Tabela histórica com o relacionamento financeiro de cada parceiro: total pago, total de horas, valor pendente, data do último pagamento e status. Cada linha pode ser expandida para ver o histórico detalhado por ciclo.\n\nQuando há pagamentos de agentes no período, uma linha de Agência aparece ao final da tabela — sem horas associadas e sem expansão.",
      },
    ],
  },
};

// ─── Conteúdo: Troubleshooting ────────────────────────────────────────────────
const CONTEUDO_TROUBLE: Record<string, { titulo: string; blocos: { subtitulo: string; texto: string }[] }> = {
  streamers: {
    titulo: "Streamers",
    blocos: [
      {
        subtitulo: "Os dados não estão aparecendo (aba Overview)?",
        texto:
          "Verifique se há lives validadas no período selecionado. Sem lives com status \"Realizada\" registradas em Resultados, os KPIs não são calculados.",
      },
      {
        subtitulo: "Os filtros estão retornando dados parciais?",
        texto:
          "Se você tem um perfil com escopo restrito, só visualiza dados dos influencers e operadoras vinculados ao seu acesso. Isso é esperado.",
      },
      {
        subtitulo: "O ROI ou o GGR por jogador aparecem como \"—\"?",
        texto:
          "ROI \"—\" costuma indicar investimento zero (cachê/validação em Resultados). GGR por jogador \"—\" indica ausência de jogadores ativos com GGR no período.",
      },
      {
        subtitulo: "O funil na aba Conversão está vazio?",
        texto:
          "Verifique lives validadas para o influencer no período. Sem duração em Resultados, o ranking FTD/hora pode omitir o parceiro.",
      },
      {
        subtitulo: "WD Ratio ou ranking financeiro estranhos?",
        texto:
          "Confirme filtros de operadora e influencer. WD alto pode indicar audiência que saca mais do que deposita; ranking lista só quem teve jogadores ativos no período.",
      },
    ],
  },
  agenda: {
    titulo: "Agenda",
    blocos: [
      {
        subtitulo: "Uma live não aparece no calendário?",
        texto:
          "Verifique se os filtros de influencer, operadora ou plataforma não estão ocultando a live. Influencers só visualizam as próprias lives — se você tem esse perfil e não vê uma live, ela pode ter sido cadastrada com outro influencer.",
      },
      {
        subtitulo: "Não consigo salvar uma nova live?",
        texto:
          "O campo de link é obrigatório. Verifique se o link da plataforma selecionada foi preenchido corretamente antes de confirmar.",
      },
      {
        subtitulo: "A live está no dia errado no calendário?",
        texto:
          "Confirme o fuso horário configurado no perfil. A data e horário exibidos seguem o fuso da plataforma.",
      },
      {
        subtitulo: "O botão + Nova Live não aparece?",
        texto:
          "Verifique se você está logado com um perfil com permissão de criação. Se o botão não aparecer mesmo assim, entre em contato com o administrador da conta.",
      },
    ],
  },
  feedback: {
    titulo: "Feedback",
    blocos: [
      {
        subtitulo: "Nenhuma live aparece na lista?",
        texto:
          "Verifique o filtro de período selecionado — o padrão pode estar limitando a visualização. Tente selecionar Tudo para ver o histórico completo. Lives só aparecem após serem validadas em Resultados.",
      },
      {
        subtitulo: "Os KPIs do topo estão zerados?",
        texto:
          "Indica que não há lives validadas no período selecionado. Ajuste o filtro de período ou verifique se as lives foram validadas em Resultados.",
      },
      {
        subtitulo: "Uma live específica não aparece?",
        texto:
          "Confirme se o filtro de influencer ou operadora não está excluindo essa live. Se você tem perfil de influencer, só visualiza as próprias lives — lives de outros influencers não serão exibidas.",
      },
      {
        subtitulo: "A Média de Views está diferente do esperado?",
        texto:
          "A métrica exibida é a média das médias por live, não a soma total de views. Cada live contribui com sua própria média de audiência para o cálculo.",
      },
    ],
  },
  influencers: {
    titulo: "Influencers",
    blocos: [
      {
        subtitulo: "Um influencer aparece no card de Perfil Incompleto. O que falta?",
        texto:
          "Os campos mais comuns que causam esse alerta são os dados da aba Financeiro — chave PIX, dados bancários ou cachê por hora. Abra o perfil e verifique os campos obrigatórios sinalizados.",
      },
      {
        subtitulo: "O influencer não aparece na lista?",
        texto:
          "Verifique se o filtro de status está configurado para exibir o status correto. Influencers inativos ou cancelados só aparecem quando o filtro correspondente está selecionado.",
      },
      {
        subtitulo: "Não consigo editar o perfil de um influencer?",
        texto:
          "A edição está disponível para o próprio influencer, sua agência e perfis com permissão de gestão. Se o botão Editar não aparecer, seu perfil pode não ter essa permissão.",
      },
      {
        subtitulo: "Os canais do influencer não aparecem na Agenda ou no Feedback?",
        texto:
          "Verifique se os canais estão cadastrados na aba Canais do perfil e se as operadoras estão vinculadas na aba Operadoras. Dados ausentes nessas abas afetam outros módulos da plataforma.",
      },
    ],
  },
  scout: {
    titulo: "Scout",
    blocos: [
      {
        subtitulo: "Um prospecto não aparece na lista?",
        texto:
          "Verifique se o filtro de status não está ocultando a etapa onde ele se encontra. Se o filtro de plataforma ou cachê estiver ativo, também pode estar excluindo o prospecto da visualização.",
      },
      {
        subtitulo: "O funil não está refletindo a quantidade correta de prospectos?",
        texto:
          "Os cards do funil respondem aos filtros aplicados. Com filtros ativos, os totais exibidos representam apenas os prospectos que atendem aos critérios selecionados — não o total geral.",
      },
      {
        subtitulo: "Não consigo adicionar ou editar um prospecto?",
        texto:
          "O Scout é restrito a admins e gestores. Se você não tem esse perfil, o botão de adição e edição não estará disponível.",
      },
      {
        subtitulo: "Quero converter um prospecto em influencer ativo. Como faço?",
        texto:
          "Após fechar a parceria, o prospecto precisa ser cadastrado manualmente na página Influencers. O Scout não realiza essa conversão automaticamente.",
      },
    ],
  },
  financeiro: {
    titulo: "Financeiro",
    blocos: [
      {
        subtitulo: "Os pagamentos do ciclo não foram gerados?",
        texto:
          "O ciclo precisa estar fechado para que os pagamentos sejam criados. Ciclos com data final no futuro ainda estão em andamento e exibem apenas uma prévia estimada.",
      },
      {
        subtitulo: "O valor calculado está incorreto?",
        texto:
          "Verifique se todas as lives do período foram validadas em Resultados e se o cachê por hora está preenchido no cadastro do influencer em Influencers. Esses dois dados são a base do cálculo.",
      },
      {
        subtitulo: "Quero ajustar o valor antes de aprovar. Como faço?",
        texto:
          "Clique em Analisar no ciclo fechado. O modal exibe o valor calculado e permite editá-lo manualmente antes de mover o pagamento para A pagar.",
      },
      {
        subtitulo: "O KPI de Pendente está alto mas não encontro pagamentos em aberto?",
        texto:
          "Verifique os filtros de influencer e operadora — podem estar ocultando parte dos ciclos. Também confira se há ciclos fechados com pagamentos ainda em Em análise.",
      },
      {
        subtitulo: "A linha de Agência não aparece no Consolidado?",
        texto:
          "A linha de Agência só é exibida quando há pagamentos de agente registrados no período filtrado. Ajuste o filtro de mês para verificar outros períodos.",
      },
    ],
  },
};

// ─── Componente principal ─────────────────────────────────────────────────────
const ABAS: Aba[] = ["conheca", "troubleshooting", "glossario"];

const LABELS_ABA: Record<Aba, string> = {
  conheca: "Conheça a Plataforma",
  troubleshooting: "Troubleshooting",
  glossario: "Glossário",
};

export default function Ajuda() {
  const { theme: t, isDark } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("ajuda");
  const [aba, setAba] = useState<Aba>("conheca");
  const [paginaSelecionada, setPaginaSelecionada] = useState<PageKey>("streamers");

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
  const pillActiveBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-accent) 18%, transparent)"
    : `${BRAND_SEMANTIC.roxoVivo}22`;
  const navActiveBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-primary) 12%, transparent)"
    : `${BRAND_SEMANTIC.roxo}18`;
  const navIconBg = brand.useBrand
    ? "color-mix(in srgb, var(--brand-primary) 22%, transparent)"
    : `${BRAND_SEMANTIC.roxo}30`;
  const tituloGradient =
    brand.useBrand
      ? "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))"
      : `linear-gradient(90deg, ${BRAND_SEMANTIC.roxo}, ${BRAND_SEMANTIC.azul})`;

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a Ajuda.
      </div>
    );
  }

  const dadosConteudo =
    aba === "conheca"
      ? CONTEUDO_CONHECA[paginaSelecionada]
      : aba === "troubleshooting"
        ? CONTEUDO_TROUBLE[paginaSelecionada]
        : undefined;

  return (
    <div className="app-page-shell" style={{ maxWidth: "1100px", margin: "0 auto" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: brand.primaryIconBg,
          border: brand.primaryIconBorder,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: brand.primaryIconColor,
          flexShrink: 0,
        }}>
          <HelpCircle size={14} aria-hidden="true" />
        </span>
        <h1 style={{
          fontSize: 22,
          fontWeight: 800,
          color: brand.primary,
          fontFamily: FONT_TITLE,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          margin: 0,
        }}>
          Ajuda
        </h1>
      </div>

      <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 24px 40px" }}>
        Conheça as funcionalidades da plataforma, o glossário de métricas e soluções para problemas comuns.
      </p>

      <div
        role="tablist"
        aria-label="Seções de ajuda"
        style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}
      >
        {ABAS.map((a) => {
          const ativo = aba === a;
          return (
            <button
              key={a}
              type="button"
              role="tab"
              id={`tab-ajuda-${a}`}
              aria-selected={ativo}
              aria-controls={`panel-ajuda-${a}`}
              onClick={() => setAba(a)}
              style={{
                padding: "8px 20px",
                borderRadius: 20,
                border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
                background: ativo ? pillActiveBg : (t.inputBg ?? t.cardBg),
                color: ativo ? brand.accent : t.textMuted,
                transition: "all 0.2s",
              }}
            >
              {LABELS_ABA[a]}
            </button>
          );
        })}
      </div>

      {aba === "glossario" ? (
        <div
          role="tabpanel"
          id="panel-ajuda-glossario"
          aria-labelledby="tab-ajuda-glossario"
        >
          <div
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 18,
              padding: "28px 32px",
              boxShadow: cardShadow,
            }}
          >
            <AbaGlossario dark={isDark} t={t} brand={brand} />
          </div>
        </div>
      ) : (
        <div
          role="tabpanel"
          id={`panel-ajuda-${aba}`}
          aria-labelledby={`tab-ajuda-${aba}`}
          style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}
        >
          <aside
            aria-label="Navegação de ajuda"
            style={{
              width: 240,
              maxWidth: "100%",
              flexShrink: 0,
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 18,
              padding: "16px 12px",
              boxShadow: cardShadow,
            }}
          >
            <nav>
              {MENU_AJUDA.map((sec) => (
                <div key={sec.section} style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "1.4px",
                    textTransform: "uppercase",
                    color: t.textMuted,
                    marginBottom: 8,
                    fontFamily: FONT.body,
                    paddingLeft: 10,
                  }}>
                    {sec.section}
                  </div>
                  {sec.items.map(({ key, label, Icon }) => {
                    const ativo = paginaSelecionada === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPaginaSelecionada(key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 12px",
                          borderRadius: 10,
                          cursor: "pointer",
                          background: ativo ? navActiveBg : "transparent",
                          color: ativo ? brand.accent : t.text,
                          fontSize: 13,
                          fontFamily: FONT.body,
                          fontWeight: ativo ? 700 : 500,
                          border: ativo ? `1px solid color-mix(in srgb, ${brand.accent} 35%, transparent)` : "1px solid transparent",
                          width: "100%",
                          textAlign: "left",
                          marginBottom: 2,
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: ativo ? navIconBg : `${t.textMuted}18`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Icon size={11} color={ativo ? brand.accent : t.textMuted} />
                        </div>
                        {label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>

          <div style={{
            flex: 1,
            minWidth: 300,
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 18,
            padding: "28px 32px",
            boxShadow: cardShadow,
          }}>
            {dadosConteudo ? (
              <>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: t.text,
                    fontFamily: FONT_TITLE,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    margin: "0 0 8px",
                  }}>
                    {dadosConteudo.titulo}
                  </h2>
                  <div style={{
                    height: 2,
                    width: 40,
                    background: tituloGradient,
                    borderRadius: 2,
                  }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {dadosConteudo.blocos.map((bloco, i) => (
                    <div key={i}>
                      {"subtitulo" in bloco && bloco.subtitulo && (
                        <p style={{
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: FONT.body,
                          color: brand.accent,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          margin: "0 0 6px",
                        }}>
                          {bloco.subtitulo}
                        </p>
                      )}
                      <p style={{
                        fontSize: 14,
                        lineHeight: 1.75,
                        color: t.text,
                        fontFamily: FONT.body,
                        margin: 0,
                        whiteSpace: "pre-line",
                      }}>
                        {bloco.texto}
                      </p>
                      {i < dadosConteudo.blocos.length - 1 && (
                        <div style={{
                          height: 1,
                          background: t.cardBorder,
                          marginTop: 20,
                        }} />
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                gap: 12,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: navActiveBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <HelpCircle size={22} color={brand.primary} aria-hidden="true" />
                </div>
                <p style={{
                  fontSize: 14,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  margin: 0,
                  textAlign: "center",
                }}>
                  Conteúdo em construção para esta página.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
