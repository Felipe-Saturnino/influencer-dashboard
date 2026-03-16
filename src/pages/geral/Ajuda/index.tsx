import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import type { PageKey } from "../../../types";
import {
  GiHelp,
  GiRadarSweep,
  GiFunnel,
  GiMoneyStack,
  GiCalendar,
  GiCheckMark,
  GiConversation,
  GiPerson,
  GiBinoculars,
  GiCash,
} from "react-icons/gi";

const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
};

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

type Aba = "conheca" | "troubleshooting";
type PageKey2 = PageKey;

// ─── Menu estrutura ───────────────────────────────────────────────────────────
const MENU_AJUDA = [
  {
    section: "Dashboards",
    items: [
      { key: "dash_overview" as PageKey2, label: "Overview", Icon: GiRadarSweep },
      { key: "dash_conversao" as PageKey2, label: "Conversão", Icon: GiFunnel },
      { key: "dash_financeiro" as PageKey2, label: "Financeiro", Icon: GiMoneyStack },
    ],
  },
  {
    section: "Lives",
    items: [
      { key: "agenda" as PageKey2, label: "Agenda", Icon: GiCalendar },
      { key: "resultados" as PageKey2, label: "Resultados", Icon: GiCheckMark },
      { key: "feedback" as PageKey2, label: "Feedback", Icon: GiConversation },
    ],
  },
  {
    section: "Operações",
    items: [
      { key: "influencers" as PageKey2, label: "Influencers", Icon: GiPerson },
      { key: "scout" as PageKey2, label: "Scout", Icon: GiBinoculars },
      { key: "financeiro" as PageKey2, label: "Financeiro", Icon: GiCash },
    ],
  },
];

// ─── Conteúdo: Conheça a Plataforma ──────────────────────────────────────────
const CONTEUDO_CONHECA: Record<string, { titulo: string; blocos: { subtitulo?: string; texto: string }[] }> = {
  dash_overview: {
    titulo: "Overview",
    blocos: [
      {
        texto:
          "O painel executivo da operação. Reúne os principais indicadores de performance das campanhas com influenciadores — financeiros, operacionais e de aquisição — em uma única tela.",
      },
      {
        subtitulo: "Filtros de Período",
        texto:
          "No topo da página você controla o recorte temporal da análise. Use as setas para navegar entre meses ou clique em Histórico para comparar períodos anteriores.\n\nTodos os indicadores exibem um comparativo MTD (mês até hoje) em relação ao mesmo período do mês anterior.\n\nOs filtros de influencer e operadora permitem segmentar os dados para uma visão específica da operação.",
      },
      {
        subtitulo: "KPIs Executivos",
        texto:
          "Indicadores consolidados da operação no período selecionado, organizados em três grupos:\n\n— Financeiros: GGR Total (receita bruta gerada), Investimento (total pago aos influencers) e ROI Geral (retorno sobre o investimento).\n\n— Operacionais: Lives realizadas, Horas transmitidas e Influencers Ativos (com ao menos uma live validada).\n\n— Aquisição: Depósitos (quantidade e volume), Registros, Custo por Registro, FTDs e Custo por FTD.",
      },
      {
        subtitulo: "Funil de Conversão",
        texto:
          "Representa a jornada da audiência desde a live até a conversão em jogador ativo.\n\nViews → Acessos → Registros → FTDs\n\nO volume de Views é calculado como a média das médias de views das lives do período. As taxas entre cada etapa mostram onde a audiência está sendo perdida ao longo do funil.",
      },
      {
        subtitulo: "Ranking de Influencers",
        texto:
          "Tabela com o desempenho individual de cada influencer no período: lives, horas, views, acessos, registros, FTDs, GGR, investimento e ROI.\n\nCada influencer recebe uma classificação de performance — Rentável, Atenção, Não Rentável ou Bônus — com base nos resultados do período.",
      },
    ],
  },
  dash_conversao: {
    titulo: "Conversão",
    blocos: [
      {
        texto:
          "Análise detalhada do funil de aquisição gerado pelas lives. Mostra onde a audiência converte — e onde é perdida — para cada influencer no período.",
      },
      {
        subtitulo: "Filtros de Período",
        texto:
          "Mesmos filtros do Overview: navegação por mês, modo Histórico, filtro de influencer e filtro de operadora. Todos os blocos da página respondem aos filtros aplicados.",
      },
      {
        subtitulo: "Comparativo de Funil",
        texto:
          "Permite comparar o funil de conversão de dois influencers lado a lado. Selecione um influencer em cada painel para visualizar:\n\nViews → Acessos → Registros → FTDs\n\nCada etapa exibe o volume absoluto e a taxa de conversão em relação à etapa anterior. As Taxas Chave condensam os indicadores mais relevantes: View→FTD, Acesso→FTD e FTD/Hora.",
      },
      {
        subtitulo: "Ranking FTD/Hora — Eficiência por Influencer",
        texto:
          "Classifica os top 10 influencers pela quantidade de FTDs gerados por hora de live. É o indicador mais direto de eficiência de transmissão — mostra quem converte mais com menos tempo na tela.\n\nInfluencers sem horas registradas são omitidos do ranking.",
      },
      {
        subtitulo: "Comparativo de Taxas e Ações Recomendadas",
        texto:
          "Tabela com as métricas de conversão de todos os influencers do período: views, acessos, registros, FTDs e as taxas entre cada etapa do funil.\n\nA coluna Ação exibe uma recomendação calculada automaticamente pela plataforma com base na etapa do funil que apresenta maior oportunidade de melhoria para cada influencer.",
      },
    ],
  },
  dash_financeiro: {
    titulo: "Dashboard Financeiro",
    blocos: [
      {
        texto:
          "Visão financeira consolidada da operação por influencer. Mostra o comportamento dos jogadores captados — depósitos, saques, GGR e perfil — permitindo avaliar a qualidade e a rentabilidade de cada parceria.",
      },
      {
        subtitulo: "Filtros de Período",
        texto:
          "Mesmos filtros dos demais dashboards: navegação por mês, modo Histórico, filtro de influencer e filtro de operadora.",
      },
      {
        subtitulo: "KPIs Financeiros",
        texto:
          "Indicadores consolidados do comportamento financeiro dos jogadores captados no período, com comparativo MTD em relação ao mês anterior:\n\n— FTD: volume total dos primeiros depósitos realizados, com ticket médio por jogador.\n— Depósitos: volume total depositado no período, com ticket médio.\n— Saques: volume total sacado, com ticket médio.\n— WD Ratio: proporção entre saques e depósitos (saques ÷ depósitos) — quanto menor, mais saudável para a operação.\n— GGR por Jogador: receita bruta média gerada por cada jogador ativo no período.\n— PVI: indicador de qualidade da base de jogadores captados.",
      },
      {
        subtitulo: "Investimento por Influencer",
        texto:
          "Gráfico de distribuição que mostra como o investimento total do período está dividido entre os influencers ativos. Útil para identificar concentração de budget e equilibrar a alocação entre parceiros.",
      },
      {
        subtitulo: "Ranking Financeiro",
        texto:
          "Tabela com a performance financeira detalhada de cada influencer. As colunas incluem: R$ FTD, ticket médio FTD, R$ depósitos, ticket médio depósito, R$ saques, ticket médio saques, R$ GGR, GGR/jogador, WD Ratio, PVI e perfil do jogador.\n\nUse os filtros de perfil para segmentar a análise por tipo de jogador: Whales, Core, Recreativos ou Caçadores de Bônus.",
      },
    ],
  },
  agenda: {
    titulo: "Agenda",
    blocos: [
      {
        texto:
          "A Agenda exibe todas as lives planejadas, realizadas ou não realizadas. Você pode criar novas lives, filtrar por status, plataforma, influencer e operadora. As lives são organizadas em visualização mensal, semanal ou diária.",
      },
    ],
  },
  resultados: {
    titulo: "Resultados",
    blocos: [
      {
        texto:
          "Em Resultados você valida as lives que já passaram da data e estavam com status pendente. Informe a duração, média e pico de views, e marque como realizada ou não realizada. Esta etapa é necessária para o financeiro calcular os pagamentos.",
      },
    ],
  },
  feedback: {
    titulo: "Feedback",
    blocos: [
      {
        texto:
          "O Feedback mostra o histórico de lives realizadas e não realizadas, com observações, durações e métricas de views. Use os filtros de período, status e influencer para analisar o desempenho.",
      },
    ],
  },
  influencers: {
    titulo: "Influencers",
    blocos: [
      {
        texto:
          "A página de Influencers centraliza o cadastro completo dos parceiros: dados cadastrais, canais (Twitch, YouTube, etc.), links, cachê por hora, operadoras vinculadas e dados bancários. Admin e gestores podem criar e editar; influencers visualizam e editam o próprio perfil.",
      },
    ],
  },
  scout: {
    titulo: "Scout",
    blocos: [
      {
        texto: "Conteúdo em construção.",
      },
    ],
  },
  financeiro: {
    titulo: "Financeiro",
    blocos: [
      {
        texto:
          "O Financeiro gerencia os ciclos de pagamento dos influencers. Visualize KPIs (total pago, pendente, horas), analise e aprove valores, registre pagamentos e acompanhe o consolidado por influencer.",
      },
    ],
  },
};

// ─── Conteúdo: Troubleshooting ────────────────────────────────────────────────
const CONTEUDO_TROUBLE: Record<string, { titulo: string; blocos: { subtitulo: string; texto: string }[] }> = {
  dash_overview: {
    titulo: "Overview",
    blocos: [
      {
        subtitulo: "Os dados não estão aparecendo?",
        texto:
          "Verifique se há lives validadas no período selecionado. Sem lives com status \"Realizada\" registradas em Resultados, os KPIs não são calculados.",
      },
      {
        subtitulo: "Os filtros estão retornando dados parciais?",
        texto:
          "Se você tem um perfil com escopo restrito, só visualiza dados dos influencers e operadoras vinculados ao seu acesso. Isso é esperado.",
      },
      {
        subtitulo: "Os valores de comparativo MTD estão zerados?",
        texto:
          "O comparativo só é gerado quando existem dados no mesmo período do mês anterior. Se for o primeiro mês de operação, essa coluna ficará vazia.",
      },
      {
        subtitulo: "O ROI aparece como \"—\"?",
        texto:
          "Isso indica que o investimento registrado é zero. Verifique se o cachê por hora está preenchido no cadastro do influencer e se as lives foram validadas em Resultados.",
      },
      {
        subtitulo: "O GGR está divergente do esperado?",
        texto:
          "Confira se o filtro de operadora está incluindo todas as operadoras relevantes. GGR é consolidado por operadora — um filtro ativo pode estar excluindo parte dos dados.",
      },
    ],
  },
  dash_conversao: {
    titulo: "Conversão",
    blocos: [
      {
        subtitulo: "O funil de um influencer está vazio ou com dados zerados?",
        texto:
          "Verifique se há lives validadas para esse influencer no período selecionado. Sem lives com status \"Realizada\" em Resultados, o funil não é calculado.",
      },
      {
        subtitulo: "A taxa View→Acesso está acima de 100%?",
        texto:
          "Isso é esperado e indica que o número de acessos via link superou a média de views das lives. Ocorre quando o link continua circulando após o encerramento da transmissão.",
      },
      {
        subtitulo: "O influencer não aparece no Ranking FTD/Hora?",
        texto:
          "O ranking exige que horas de live estejam registradas. Verifique se a duração foi preenchida na validação em Resultados.",
      },
      {
        subtitulo: "A coluna Ação está vazia para algum influencer?",
        texto:
          "A recomendação só é gerada quando há dados suficientes no funil. Influencers com poucas etapas preenchidas podem não receber uma ação sugerida.",
      },
      {
        subtitulo: "Os filtros de operadora estão afetando o funil?",
        texto:
          "Sim. Ao filtrar por operadora, apenas os acessos e conversões originados por links daquela operadora são considerados.",
      },
    ],
  },
  dash_financeiro: {
    titulo: "Dashboard Financeiro",
    blocos: [
      {
        subtitulo: "Os KPIs estão zerados ou sem dados?",
        texto:
          "Verifique se há lives validadas no período e se os filtros de influencer e operadora não estão excluindo toda a base. Dados financeiros dependem de jogadores ativos originados pelas ativações.",
      },
      {
        subtitulo: "O WD Ratio está em 0% ou muito baixo?",
        texto:
          "Indica que não houve saques no período — pode ser esperado em meses iniciais de operação ou quando os jogadores ainda estão na fase de depósito.",
      },
      {
        subtitulo: "O WD Ratio está muito alto (próximo ou acima de 100%)?",
        texto:
          "Sinal de atenção: os jogadores estão sacando mais do que depositando. Vale verificar o perfil da audiência captada por cada influencer no Ranking Financeiro.",
      },
      {
        subtitulo: "O GGR por Jogador aparece como \"—\"?",
        texto:
          "Indica que não há jogadores ativos com GGR registrado no período selecionado. Confirme se as operadoras estão com os dados integrados corretamente.",
      },
      {
        subtitulo: "O Ranking Financeiro não exibe todos os influencers esperados?",
        texto:
          "Influencers sem jogadores ativos no período não aparecem na tabela. Use o filtro de operadora para verificar se a segmentação está excluindo algum parceiro.",
      },
    ],
  },
  agenda: {
    titulo: "Agenda",
    blocos: [
      {
        subtitulo: "Live não aparece?",
        texto:
          "Verifique permissões e filtros. Só quem tem permissão de criação pode adicionar lives. Influencers veem apenas as próprias lives.",
      },
    ],
  },
  resultados: {
    titulo: "Resultados",
    blocos: [
      {
        subtitulo: "Não consigo validar?",
        texto:
          "Verifique se sua role tem permissão de edição em Resultados. Apenas usuários com essa permissão veem o botão Validar.",
      },
    ],
  },
  feedback: {
    titulo: "Feedback",
    blocos: [
      {
        subtitulo: "Filtros não retornam resultados?",
        texto:
          "Ajuste o período ou remova filtros de influencer/status. Lives só aparecem após validadas em Resultados.",
      },
    ],
  },
  influencers: {
    titulo: "Influencers",
    blocos: [
      {
        subtitulo: "Perfil incompleto?",
        texto:
          "Preencha nome artístico, canais, cachê/hora e dados bancários. Operadoras devem ser vinculadas na aba Operadoras do cadastro.",
      },
    ],
  },
  scout: {
    titulo: "Scout",
    blocos: [
      {
        subtitulo: "Conteúdo em construção.",
        texto: "Em breve esta seção terá informações de suporte.",
      },
    ],
  },
  financeiro: {
    titulo: "Financeiro",
    blocos: [
      {
        subtitulo: "Pagamentos não gerados?",
        texto:
          "O ciclo precisa ser fechado (após a data fim). Ciclos abertos mostram apenas prévia. Verifique se as lives foram validadas em Resultados.",
      },
    ],
  },
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Ajuda() {
  const { theme: t } = useApp();
  const perm = usePermission("ajuda");
  const [aba, setAba] = useState<Aba>("conheca");
  const [paginaSelecionada, setPaginaSelecionada] = useState<PageKey2>("dash_overview");

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
      : CONTEUDO_TROUBLE[paginaSelecionada];

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>

      {/* ── Header padrão SectionTitle ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: BRAND.roxo,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <GiHelp size={14} color="#fff" />
        </div>
        <h1 style={{
          fontSize: 22,
          fontWeight: 800,
          color: t.text,
          fontFamily: FONT_TITLE,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          margin: 0,
        }}>
          Ajuda
        </h1>
      </div>

      <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 24px 40px" }}>
        Conheça as funcionalidades da plataforma e encontre soluções para problemas comuns.
      </p>

      {/* ── Abas pill padrão ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {(["conheca", "troubleshooting"] as Aba[]).map((a) => {
          const ativo = aba === a;
          return (
            <button
              key={a}
              onClick={() => setAba(a)}
              style={{
                padding: "8px 20px",
                borderRadius: 20,
                border: `1px solid ${ativo ? BRAND.roxoVivo : t.cardBorder}`,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
                background: ativo ? `${BRAND.roxoVivo}22` : (t.inputBg ?? t.cardBg),
                color: ativo ? BRAND.roxoVivo : t.textMuted,
                transition: "all 0.2s",
              }}
            >
              {a === "conheca" ? "Conheça a Plataforma" : "Troubleshooting"}
            </button>
          );
        })}
      </div>

      {/* ── Layout principal ── */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>

        {/* ── Menu lateral ── */}
        <aside style={{
          width: 240,
          flexShrink: 0,
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 18,
          padding: "16px 12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        }}>
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
                    onClick={() => setPaginaSelecionada(key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      background: ativo ? `${BRAND.roxo}18` : "transparent",
                      color: ativo ? BRAND.roxoVivo : t.text,
                      fontSize: 13,
                      fontFamily: FONT.body,
                      fontWeight: ativo ? 700 : 500,
                      border: ativo ? `1px solid ${BRAND.roxoVivo}55` : "1px solid transparent",
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
                      background: ativo ? `${BRAND.roxo}30` : `${t.textMuted}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Icon size={11} color={ativo ? BRAND.roxoVivo : t.textMuted} />
                    </div>
                    {label}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* ── Área de conteúdo ── */}
        <div style={{
          flex: 1,
          minWidth: 300,
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 18,
          padding: "28px 32px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        }}>
          {dadosConteudo ? (
            <>
              {/* Título da seção */}
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
                  background: `linear-gradient(90deg, ${BRAND.roxo}, ${BRAND.azul})`,
                  borderRadius: 2,
                }} />
              </div>

              {/* Blocos de conteúdo */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {dadosConteudo.blocos.map((bloco, i) => (
                  <div key={i}>
                    {"subtitulo" in bloco && bloco.subtitulo && (
                      <p style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: FONT.body,
                        color: BRAND.roxoVivo,
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
            /* ── Empty state ── */
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
                background: `${BRAND.roxo}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <GiHelp size={22} color={BRAND.roxoVivo} />
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
    </div>
  );
}
