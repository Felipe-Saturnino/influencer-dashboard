import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT, BASE_COLORS } from "../../../constants/theme";
import { MENU } from "../../../constants/menu";
import type { PageKey } from "../../../types";

type Aba = "conheca" | "troubleshooting";

const PAGINAS_EXCLUIDAS_AJUDA: PageKey[] = ["gestao_links", "gestao_usuarios", "gestao_operadoras"];

const MENU_AJUDA = MENU.filter((sec) => sec.section !== "Plataforma")
  .map((sec) => ({
    ...sec,
    items: sec.items.filter((i) => !PAGINAS_EXCLUIDAS_AJUDA.includes(i.key)),
  }))
  .filter((sec) => sec.items.length > 0);

const CONTEUDO_CONHECA: Record<string, string> = {
  dash_overview: "O Dashboard Overview apresenta os principais indicadores do período: total de FTDs, depósitos, GGR e conversão. Use os filtros por mês, influencer e operadora para analisar o desempenho. Os gráficos mostram a evolução ao longo do tempo.",
  dash_conversao: "O Dashboard de Conversão foca em métricas de aquisição: taxa de conversão de visitantes em cadastros, primeiros depósitos e recorrência. Ideal para analisar a efetividade das campanhas e dos influencers.",
  dash_financeiro: "O Dashboard Financeiro consolida dados de investimento, faturamento e margem por operadora. Visualize a saúde financeira das parcerias e identifique oportunidades de otimização.",
  agenda: "A Agenda exibe todas as lives planejadas, realizadas ou não realizadas. Você pode criar novas lives, filtrar por status, plataforma, influencer e operadora. As lives são organizadas em visualização mensal, semanal ou diária.",
  resultados: "Em Resultados você valida as lives que já passaram da data e estavam com status pendente. Informe a duração, média e pico de views, e marque como realizada ou não realizada. Esta etapa é necessária para o financeiro calcular os pagamentos.",
  feedback: "O Feedback mostra o histórico de lives realizadas e não realizadas, com observações, durações e métricas de views. Use os filtros de período, status e influencer para analisar o desempenho.",
  influencers: "A página de Influencers centraliza o cadastro completo dos parceiros: dados cadastrais, canais (Twitch, YouTube, etc.), links, cachê por hora, operadoras vinculadas e dados bancários. Admin e gestores podem criar e editar; influencers visualizam e editam o próprio perfil.",
  financeiro: "O Financeiro gerencia os ciclos de pagamento dos influencers. Visualize KPIs (total pago, pendente, horas), analise e aprove valores, registre pagamentos e acompanhe o consolidado por influencer.",
};

const CONTEUDO_TROUBLESHOOTING: Record<string, string> = {
  dash_overview: "Dados não aparecem? Verifique se há registros no período selecionado e se os filtros de influencer/operadora não estão excluindo tudo. Se você tem escopo restrito, só verá dados dos influencers e operadoras permitidos para seu perfil.",
  dash_conversao: "Métricas zeradas podem indicar ausência de dados no período ou filtros muito restritivos. Confira também se os UTMs estão mapeados corretamente.",
  dash_financeiro: "Valores discrepantes? Confirme se as lives foram validadas em Resultados e se o cachê por hora está cadastrado no perfil do influencer.",
  agenda: "Live não aparece? Verifique permissões e filtros. Só quem tem permissão de criação pode adicionar lives. Influencers veem apenas as próprias lives.",
  resultados: "Não consigo validar? Verifique se sua role tem permissão de edição em Resultados. Apenas usuários com essa permissão veem o botão Validar.",
  feedback: "Filtros não retornam resultados? Ajuste o período ou remova filtros de influencer/status. Lives só aparecem após validadas em Resultados.",
  influencers: "Perfil incompleto? Preencha nome artístico, canais, cachê/hora e dados bancários. Operadoras devem ser vinculadas na aba Operadoras do cadastro.",
  financeiro: "Pagamentos não gerados? O ciclo precisa ser fechado (após a data fim). Ciclos abertos mostram apenas prévia. Verifique se as lives foram validadas em Resultados.",
};

export default function Ajuda() {
  const { theme: t } = useApp();
  const perm = usePermission("ajuda");
  const [aba, setAba] = useState<Aba>("conheca");
  const [paginaSelecionada, setPaginaSelecionada] = useState<PageKey>("dash_overview");

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a Ajuda.
      </div>
    );
  }

  const conteudo = aba === "conheca"
    ? (CONTEUDO_CONHECA[paginaSelecionada] ?? "Selecione uma página no menu.")
    : (CONTEUDO_TROUBLESHOOTING[paginaSelecionada] ?? "Selecione uma página no menu.");

  const tabBtn = (ativ: boolean) => ({
    padding: "10px 20px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 700,
    fontFamily: FONT.body,
    background: ativ ? `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})` : t.inputBg,
    color: ativ ? "#fff" : t.textMuted,
    borderBottom: ativ ? "none" : `2px solid transparent`,
    transition: "all 0.2s",
  } as React.CSSProperties);

  const menuItem = (key: PageKey, label: string, icon: string, ativo: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    borderRadius: "10px",
    cursor: "pointer",
    background: ativo ? `${BASE_COLORS.purple}22` : "transparent",
    color: ativo ? BASE_COLORS.purple : t.text,
    fontSize: "13px",
    fontFamily: FONT.body,
    fontWeight: ativo ? 700 : 500,
    border: "none",
    width: "100%",
    textAlign: "left" as const,
    marginBottom: "4px",
    transition: "all 0.15s",
  } as React.CSSProperties);

  return (
    <div style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 900, color: t.text, fontFamily: FONT.title, margin: "0 0 8px" }}>
        💬 Ajuda
      </h1>
      <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: "0 0 24px" }}>
        Conheça as funcionalidades da plataforma e encontre soluções para problemas comuns.
      </p>

      {/* Abas */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        <button onClick={() => setAba("conheca")} style={tabBtn(aba === "conheca")}>
          Conheça a Plataforma
        </button>
        <button onClick={() => setAba("troubleshooting")} style={tabBtn(aba === "troubleshooting")}>
          Troubleshooting
        </button>
      </div>

      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
        {/* Menu lateral */}
        <aside style={{
          width: "260px",
          flexShrink: 0,
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: "16px",
          padding: "16px",
        }}>
          {MENU_AJUDA.map((sec) => (
            <div key={sec.section} style={{ marginBottom: "20px" }}>
              <div style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "1.2px",
                textTransform: "uppercase",
                color: t.textMuted,
                marginBottom: "10px",
                fontFamily: FONT.body,
              }}>
                {sec.section}
              </div>
              {sec.items.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setPaginaSelecionada(item.key)}
                  style={menuItem(item.key, item.label, item.icon, paginaSelecionada === item.key)}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Conteúdo */}
        <div style={{
          flex: 1,
          minWidth: 280,
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: "16px",
          padding: "24px",
        }}>
          <h2 style={{
            fontSize: "16px",
            fontWeight: 800,
            color: t.text,
            fontFamily: FONT.title,
            margin: "0 0 16px",
            borderBottom: `2px solid ${BASE_COLORS.purple}`,
            paddingBottom: "8px",
            display: "inline-block",
          }}>
            {MENU_AJUDA.flatMap((s) => s.items).find((i) => i.key === paginaSelecionada)?.label ?? paginaSelecionada}
          </h2>
          <p style={{
            fontSize: "14px",
            lineHeight: 1.7,
            color: t.text,
            fontFamily: FONT.body,
            margin: 0,
          }}>
            {conteudo}
          </p>
        </div>
      </div>
    </div>
  );
}
