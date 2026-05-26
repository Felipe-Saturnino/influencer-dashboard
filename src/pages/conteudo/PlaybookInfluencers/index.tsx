import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import type { Role } from "../../../types";
import { BRAND_SEMANTIC as BRAND, FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import {
  Check, ChevronRight, AlertTriangle, Info,
  BookOpen, Users, Calendar, Gamepad2,
  Zap, Wrench, Star, MonitorPlay, ShieldCheck, Loader2,
} from "lucide-react";
import { FiltroBarTabButton, onFiltroBarTabsKeyDown } from "../../../components/dashboard";
import { FILTRO_BAR_TAB_ICON_SIZE } from "../../../lib/filterBarStyles";
import { ROLES_PARIDADE_INFLUENCER, roleParidadeInfluencer } from "../../../lib/staffRoles";

/** Papéis que podem ver o painel de auditoria (além de usePermission.canEditarOk). Operador fica de fora. */
const ROLES_AUDITORIA_PLAYBOOK: Role[] = [
  "admin",
  "gestor",
  "executivo",
  "agencia",
  "shift_leader",
  "service_manager",
  "figurino",
  "rh",
];

interface PerfilAuditoriaRow {
  id: string;
  status: string | null;
  nome_artistico: string | null;
}

function mapaPerfilAuditoria(rows: PerfilAuditoriaRow[] | null | undefined): Map<string, PerfilAuditoriaRow> {
  const m = new Map<string, PerfilAuditoriaRow>();
  (rows ?? []).forEach((r) => m.set(r.id, r));
  return m;
}

/** Auditoria: só influencers com cadastro em `influencer_perfil` e status operacional ativo. */
function influencerElegivelAuditoria(influencerId: string, perfilMap: Map<string, PerfilAuditoriaRow>): boolean {
  const perfil = perfilMap.get(influencerId);
  if (!perfil) return false;
  const s = (perfil.status ?? "ativo").toLowerCase();
  return s !== "inativo" && s !== "cancelado";
}

function nomeExibicaoAuditoria(
  influencerId: string,
  perfilMap: Map<string, PerfilAuditoriaRow>,
  profileName?: string | null,
): string {
  const art = perfilMap.get(influencerId)?.nome_artistico?.trim();
  if (art) return art;
  const nome = profileName?.trim();
  if (nome && !/^sec-prober-/i.test(nome)) return nome;
  return `Influencer (${influencerId.slice(0, 8)}…)`;
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Confirmacao {
  id: string;
  influencer_id: string;
  item_key: string;
  confirmed_at: string;
  influencer_nome?: string;
}

interface AbaConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  obrigatoria: boolean;
  itemKey?: string;
  accentColor: string;
  content: React.FC<{ dark: boolean }>;
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function BlocoAlerta({ children, dark }: { children: React.ReactNode; dark: boolean }) {
  return (
    <div style={{
      display: "flex", gap: 12, padding: "14px 16px", borderRadius: 10,
      background: dark ? "rgba(232,64,37,0.08)" : "rgba(232,64,37,0.05)",
      border: "1px solid rgba(232,64,37,0.25)",
      borderLeft: `3px solid ${BRAND.vermelho}`,
      marginTop: 16,
    }}>
      <AlertTriangle size={16} color={BRAND.vermelho} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontFamily: FONT.body, fontSize: 13, color: dark ? "#ff9980" : "#b02a14", lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

function BlocoInfo({ children, dark }: { children: React.ReactNode; dark: boolean }) {
  return (
    <div style={{
      display: "flex", gap: 12, padding: "14px 16px", borderRadius: 10,
      background: dark ? "rgba(30,54,248,0.07)" : "rgba(30,54,248,0.04)",
      border: "1px solid rgba(30,54,248,0.20)",
      borderLeft: `3px solid ${BRAND.azul}`,
      marginTop: 16,
    }}>
      <Info size={16} color={dark ? "#7b95ff" : BRAND.azul} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontFamily: FONT.body, fontSize: 13, color: dark ? "#d0d0ee" : "#1a1a3e", lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

function ListaOK({ items, dark }: { items: React.ReactNode[]; dark: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${BRAND.verde}20`, border: `1px solid ${BRAND.verde}60`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
            <Check size={10} color={BRAND.verde} />
          </div>
          <span style={{ fontFamily: FONT.body, fontSize: 14, color: dark ? "#d0d0ee" : "#1a1a3e", lineHeight: 1.55 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function TituloSecao({ children, accent, compactTop }: { children: React.ReactNode; accent: string; compactTop?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, marginTop: compactTop ? 0 : 24 }}>
      <div style={{ width: 3, height: 16, borderRadius: 2, background: accent, flexShrink: 0 }} />
      <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: accent, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {children}
      </h3>
    </div>
  );
}

// ─── CONTEÚDO DAS ABAS ────────────────────────────────────────────────────────
const ConteudoPosicionamento: React.FC<{ dark: boolean }> = ({ dark }) => (
  <div>
    <p style={{ fontFamily: FONT.body, fontSize: 14, color: dark ? "#d0d0ee" : "#1a1a3e", lineHeight: 1.7, marginTop: 0 }}>
      A <strong>Spin Gaming</strong> é um estúdio 100% brasileiro, com operação nacional e dealers brasileiros. Sempre que possível, reforce esses pontos de forma orgânica durante a transmissão.
    </p>
    <TituloSecao accent={BRAND.azul}>Diferenciais para explorar na live</TituloSecao>
    <ListaOK dark={dark} items={[
      "Estrutura totalmente localizada no Brasil",
      "Dealers brasileiros treinados internamente",
      "Operação própria com alto padrão técnico",
    ]} />
    <BlocoInfo dark={dark}>
      As diretrizes devem ser aplicadas de forma <strong>natural e autêntica</strong>, respeitando o estilo de cada criador.
    </BlocoInfo>
    <TituloSecao accent={BRAND.azul}>Uso de marca</TituloSecao>
    <ListaOK dark={dark} items={[
      <>Utilize sempre o nome correto: <strong>Spin Gaming</strong></>,
      "Configure corretamente bots, overlays e comandos do chat",
      "Mantenha padrão de comunicação ao mencionar a marca",
    ]} />
  </div>
);

const ConteudoDealers: React.FC<{ dark: boolean }> = ({ dark }) => (
  <div>
    <p style={{ fontFamily: FONT.body, fontSize: 14, color: dark ? "#d0d0ee" : "#1a1a3e", lineHeight: 1.7, marginTop: 0 }}>
      A interação com os dealers é um dos principais diferenciais da <strong>Spin Gaming</strong>. Use isso para aumentar o engajamento da sua live.
    </p>
    <TituloSecao accent={BRAND.azul}>Boas práticas</TituloSecao>
    <ListaOK dark={dark} items={[
      "Utilize o chat da mesa para interagir com a/o dealer sempre que possível",
      "O chat da mesa é apenas entre cada jogador e o dealer. Então você não verá as mensagens de outros jogadores, assim como eles não verão as suas se você não mostrar na live",
      "Estimule a interação entre você, a dealer e o público",
      "Utilize essa dinâmica para aumentar o engajamento da live",
      "Utilize sempre os nomes profissionais apresentados na plataforma",
    ]} />
    <BlocoAlerta dark={dark}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <strong>Importante¹:</strong> Evite incentivar ou solicitar informações pessoais das dealers. Não estimule busca por redes sociais ou nomes reais.
        </div>
        <div>
          <strong>Importante²:</strong> Nunca use o nome real do(a) dealer, sempre utilizar o Nickname da tela
        </div>
      </div>
    </BlocoAlerta>
  </div>
);

const ConteudoAgendamento: React.FC<{ dark: boolean }> = ({ dark }) => (
  <div>
    <p style={{ fontFamily: FONT.body, fontSize: 14, color: dark ? "#d0d0ee" : "#1a1a3e", lineHeight: 1.7, marginTop: 0 }}>
      O agendamento prévio de lives é <strong>obrigatório</strong> para fins operacionais e acompanhamento de campanha.
    </p>
    <TituloSecao accent={BRAND.vermelho}>Regras obrigatórias</TituloSecao>
    <ListaOK dark={dark} items={[
      <>Registrar previamente todas as lives nesta plataforma na página <strong>AGENDA</strong></>,
      "O agendamento deve conter data e horário da transmissão",
      "O registro deve ser realizado com antecedência mínima de 24 horas",
    ]} />
    <BlocoAlerta dark={dark}>
      <strong>Atenção:</strong> Lives realizadas sem agendamento ou Lives agendadas no mesmo dia não serão contabilizadas para fins de campanha.
    </BlocoAlerta>
    <TituloSecao accent={BRAND.vermelho}>Por que isso é essencial</TituloSecao>
    <ListaOK dark={dark} items={[
      "Acompanhamento da equipe SPIN durante a live",
      "Suporte em tempo real garantido",
      "Validação das entregas da campanha",
    ]} />
  </div>
);

const ConteudoJogos: React.FC<{ dark: boolean }> = ({ dark }) => (
  <div>
    <p style={{ fontFamily: FONT.body, fontSize: 14, color: dark ? "#d0d0ee" : "#1a1a3e", lineHeight: 1.7, marginTop: 0 }}>
      O foco principal é atrair novos jogadores para as mesas da <strong>Spin Gaming</strong>. As regras abaixo são <strong>obrigatórias</strong>.
    </p>
    <TituloSecao accent={BRAND.vermelho}>Foco obrigatório — Live Casino SPIN</TituloSecao>
    <ListaOK dark={dark} items={[
      <>Blackjack nas mesas <strong>Spin Gaming</strong></>,
      <>Roleta nas mesas <strong>Spin Gaming</strong></>,
      <>Baccarat nas mesas <strong>Spin Gaming</strong></>,
    ]} />
    <BlocoAlerta dark={dark}>
      <strong>Proibido:</strong> Jogar Blackjack, Roleta ou Baccarat em mesas de provedores concorrentes (Evolution, Pragmatic Play, Playtech ou qualquer outro provedor). Esses jogos devem ocorrer <strong>exclusivamente</strong> nas mesas da <strong>Spin Gaming</strong>.
    </BlocoAlerta>
    <TituloSecao accent={dark ? "#7b95ff" : BRAND.azul}>Uso de Slots (permitido com limite)</TituloSecao>
    <ListaOK dark={dark} items={[
      "Até 15 minutos de slots a cada 1 hora de live",
      "Games Global é recomendado (parceira estratégica), mas não obrigatório",
      "O criador possui liberdade de escolha nos slots",
    ]} />
  </div>
);

const ConteudoBlackjack: React.FC<{ dark: boolean }> = ({ dark }) => (
  <div>
    <p style={{ fontFamily: FONT.body, fontSize: 14, color: dark ? "#d0d0ee" : "#1a1a3e", lineHeight: 1.7, marginTop: 0 }}>
      Sempre que fizer sentido dentro da dinâmica da live, explore os Side Bets para aumentar o engajamento.
    </p>
    <TituloSecao accent={BRAND.azul}>Boas práticas</TituloSecao>
    <ListaOK dark={dark} items={[
      "Apresente e incentive o uso de Side Bets",
      "Explique que aumentam a dinâmica e a diversão do jogo",
      "Use como gancho de conteúdo para educar o público",
    ]} />
  </div>
);

const ConteudoTecnico: React.FC<{ dark: boolean }> = ({ dark }) => (
  <div>
    <p style={{ fontFamily: FONT.body, fontSize: 14, color: dark ? "#d0d0ee" : "#1a1a3e", lineHeight: 1.7, marginTop: 0 }}>
      A operação está em constante evolução. Saiba como agir em situações inesperadas sem comprometer a live.
    </p>
    <TituloSecao accent={BRAND.azul}>Como agir</TituloSecao>
    <ListaOK dark={dark} items={[
      "Troque de mesa de forma natural",
      "Mantenha o fluxo da live",
      "Evite dar foco ao problema",
    ]} />
    <BlocoInfo dark={dark}>
      A <strong>Spin Gaming</strong> acompanha as transmissões em tempo real pelo usuário <strong>@Spingamingbr</strong>. Adicione como MOD da live e aproveite as interações no chat como apoio.
    </BlocoInfo>
    <TituloSecao accent={BRAND.azul}>Situações que podem ocorrer</TituloSecao>
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
      {["Instabilidade técnica", "Parada de dealer", "Comportamento fora do padrão"].map((item, i) => (
        <div key={i} style={{ padding: "10px 14px", borderRadius: 8, background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, fontFamily: FONT.body, fontSize: 13, color: dark ? "#9898be" : "#4a4a6a" }}>
          {item}
        </div>
      ))}
    </div>
  </div>
);

const FUN_FACT_CARD: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 10,
  border: "1px solid rgba(112,202,228,0.20)",
  borderLeft: `3px solid ${BRAND.ciano}`,
};

function GridFunFacts({ items, dark }: { items: { label: string; value: string }[]; dark: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))", gap: 10, marginTop: 12 }}>
      {items.map((f, i) => (
        <div
          key={i}
          style={{
            ...FUN_FACT_CARD,
            background: dark ? "rgba(112,202,228,0.06)" : "rgba(112,202,228,0.05)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, color: dark ? "#70cae4" : "#0f6a8a", fontFamily: FONT_TITLE, lineHeight: 1 }}>{f.value}</div>
          <div style={{ fontSize: 12, color: dark ? "#9898be" : "#4a4a6a", fontFamily: FONT.body, marginTop: 6, lineHeight: 1.4 }}>{f.label}</div>
        </div>
      ))}
    </div>
  );
}

const ConteudoFunFacts: React.FC<{ dark: boolean }> = ({ dark }) => {
  const estrutura = [
    { label: "Investimento em estrutura", value: "R$ 30M+" },
    { label: "Cabeamento interno", value: "5+ km" },
    { label: "Autonomia do gerador próprio", value: "72 horas" },
    { label: "Equipamentos de áudio e vídeo de última geração", value: "Sim" },
  ];
  const operacao = [
    { label: "Baralhos em operação", value: "18.000+" },
    { label: "Dealers treinados internamente", value: "210+" },
    { label: "Academia própria de dealers", value: "Sim" },
    { label: "Treinadores com certificação internacional", value: "Sim" },
  ];
  const suporte = [
    { label: "Tempo médio de resposta do suporte", value: "3 segundos" },
    { label: "Suporte 24h", value: "Sim" },
  ];
  return (
    <div>
      <p style={{ fontFamily: FONT.body, fontSize: 14, color: dark ? "#d0d0ee" : "#1a1a3e", lineHeight: 1.7, marginTop: 0 }}>
        Use esses dados como ganchos durante a live para reforçar o posicionamento da <strong>Spin Gaming</strong>. São opcionais, mas altamente recomendados para engajamento.
      </p>
      <TituloSecao accent={BRAND.ciano}>Estrutura</TituloSecao>
      <GridFunFacts dark={dark} items={estrutura} />
      <TituloSecao accent={BRAND.ciano}>Operação</TituloSecao>
      <GridFunFacts dark={dark} items={operacao} />
      <TituloSecao accent={BRAND.ciano}>Suporte</TituloSecao>
      <GridFunFacts dark={dark} items={suporte} />
    </div>
  );
};

const playbookAcessoImgShell = (dark: boolean) => ({
  borderRadius: 10,
  overflow: "hidden" as const,
  border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`,
  boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.32)" : "0 4px 16px rgba(0,0,0,0.08)",
});

const ConteudoAcesso: React.FC<{ dark: boolean }> = ({ dark }) => (
  <div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
      <div style={{ flex: "0 0 220px", width: 220, maxWidth: "100%" }}>
        <div style={playbookAcessoImgShell(dark)}>
          <img
            src="/playbook/mesas-spin-gaming.png"
            alt="Interface do site: banner Mesas Exclusivas Liberadas, atalhos e mesas ao vivo (Roleta e Blackjack exclusivos)"
            width={440}
            height={780}
            loading="lazy"
            decoding="async"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </div>
      </div>
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <TituloSecao accent={BRAND.azul} compactTop>
          <>Mesas <strong>Spin Gaming</strong></>
        </TituloSecao>
        <ListaOK dark={dark} items={[
          "Clique no banner \"MESAS EXCLUSIVAS\"",
          "Ou acesse pelas mesas exibidas logo abaixo do banner",
        ]} />
      </div>
    </div>

    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start", marginTop: 32 }}>
      <div style={{ flex: "0 0 220px", width: 220, maxWidth: "100%" }}>
        <div style={playbookAcessoImgShell(dark)}>
          <img
            src="/playbook/games-global-slots.png"
            alt="Interface do cassino: aba CASSINO com a seção Games Global e carrossel de slots"
            width={440}
            height={780}
            loading="lazy"
            decoding="async"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </div>
      </div>
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <TituloSecao accent={dark ? "#70cae4" : "#0f6a8a"} compactTop>
          Games Global (Slots)
        </TituloSecao>
        <ListaOK dark={dark} items={[
          "Acesse pela aba CASSINO",
          "Utilize a tag \"Games Global\" para filtrar os jogos",
          "Ou role a barra até encontrar a seção Games Global",
        ]} />
      </div>
    </div>
  </div>
);

const ABAS: AbaConfig[] = [
  { key: "posicionamento", label: "Posicionamento", icon: <Star size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />, obrigatoria: false, accentColor: BRAND.azul, content: ConteudoPosicionamento },
  { key: "dealers", label: "Dealers", icon: <Users size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />, obrigatoria: true, itemKey: "dealers_boas_praticas", accentColor: BRAND.vermelho, content: ConteudoDealers },
  { key: "agendamento", label: "Agendamento", icon: <Calendar size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />, obrigatoria: true, itemKey: "agendamento_lives", accentColor: BRAND.vermelho, content: ConteudoAgendamento },
  { key: "jogos", label: "Jogos", icon: <Gamepad2 size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />, obrigatoria: true, itemKey: "prioridade_jogos", accentColor: BRAND.vermelho, content: ConteudoJogos },
  { key: "blackjack", label: "Side Bets", icon: <Zap size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />, obrigatoria: false, accentColor: BRAND.azul, content: ConteudoBlackjack },
  { key: "tecnico", label: "Situações Técnicas", icon: <Wrench size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />, obrigatoria: false, accentColor: BRAND.azul, content: ConteudoTecnico },
  { key: "funfacts", label: "Fun Facts", icon: <Info size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />, obrigatoria: false, accentColor: BRAND.ciano, content: ConteudoFunFacts },
  { key: "acesso", label: "Acesso aos Jogos", icon: <MonitorPlay size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />, obrigatoria: false, accentColor: BRAND.azul, content: ConteudoAcesso },
];

const ITENS_OBRIGATORIOS = ABAS.filter((a) => a.obrigatoria && a.itemKey);

const PLAYBOOK_TAB_KEYS = ABAS.map((a) => a.key);

// ─── PAINEL DE AUDITORIA ──────────────────────────────────────────────────────
function PainelAuditoria({
  itemKey,
  dark,
  podeVerInfluencer,
}: {
  itemKey: string;
  dark: boolean;
  podeVerInfluencer: (id: string) => boolean;
}) {
  const { theme: t } = useApp();
  const [confirmacoes, setConfirmacoes] = useState<Confirmacao[]>([]);
  const [pendentes, setPendentes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [confRes, influRes, perfilRes] = await Promise.all([
        supabase.from("guia_confirmacoes").select("id, influencer_id, item_key, confirmed_at").eq("item_key", itemKey),
        supabase.from("profiles").select("id, name, ativo").in("role", [...ROLES_PARIDADE_INFLUENCER]).eq("ativo", true),
        supabase.from("influencer_perfil").select("id, status, nome_artistico"),
      ]);
      const perfilMap = mapaPerfilAuditoria((perfilRes.data ?? []) as PerfilAuditoriaRow[]);
      const confs = (confRes.data ?? []) as Confirmacao[];
      const influs = ((influRes.data ?? []) as { id: string; name: string | null }[])
        .filter(
          (i) =>
            podeVerInfluencer(i.id) &&
            influencerElegivelAuditoria(i.id, perfilMap),
        )
        .map((i) => ({
          id: i.id,
          name: nomeExibicaoAuditoria(i.id, perfilMap, i.name),
        }));
      const confIds = new Set(
        confs
          .filter((c) => podeVerInfluencer(c.influencer_id) && influencerElegivelAuditoria(c.influencer_id, perfilMap))
          .map((c) => c.influencer_id),
      );

      setConfirmacoes(
        confs.filter(
          (c) => podeVerInfluencer(c.influencer_id) && influencerElegivelAuditoria(c.influencer_id, perfilMap),
        ),
      );
      setPendentes(influs.filter((i) => !confIds.has(i.id)));
      setLoading(false);
    }
    load();
  }, [itemKey, podeVerInfluencer]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0", color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
        <Loader2 size={18} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
        Carregando…
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 24, padding: "18px 20px", borderRadius: 12,
      background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
      border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <ShieldCheck size={16} color={dark ? "#7b95ff" : BRAND.azul} aria-hidden />
        <span style={{ fontSize: 11, fontWeight: 700, color: dark ? "#7b95ff" : BRAND.azul, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Auditoria de Ciência
        </span>
        <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginLeft: 4 }}>
          — {confirmacoes.length} confirmado{confirmacoes.length !== 1 ? "s" : ""} · {pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: BRAND.vermelho, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body, marginBottom: 8 }}>
          Pendentes ({pendentes.length})
        </div>
        {pendentes.length === 0 ? (
          <span style={{ fontSize: 12, color: BRAND.verde, fontFamily: FONT.body, fontWeight: 600 }}>Todos confirmaram.</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pendentes.map((p) => (
              <div key={p.id} style={{ padding: "8px 10px", borderRadius: 8, background: dark ? "rgba(232,64,37,0.06)" : "rgba(232,64,37,0.04)", border: "1px solid rgba(232,64,37,0.18)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: dark ? "#ff9980" : "#b02a14", fontFamily: FONT.body }}>{p.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BLOCO DE CIÊNCIA (influencer) ────────────────────────────────────────────
function BlocoCiencia({
  itemKey,
  label,
  influencerId,
  onConfirmado,
  dark,
  podeConfirmar,
}: {
  itemKey: string;
  label: string;
  influencerId: string;
  onConfirmado: () => void;
  dark: boolean;
  podeConfirmar: boolean;
}) {
  const { theme: t } = useApp();
  const [confirmado, setConfirmado] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [erroUpsert, setErroUpsert] = useState<string | null>(null);

  useEffect(() => {
    setLoadingCheck(true);
    setConfirmado(false);
    setConfirmedAt(null);
    setChecked(false);
    setErroUpsert(null);

    let cancelled = false;
    void (async () => {
      try {
        const { data } = await supabase
          .from("guia_confirmacoes")
          .select("id, confirmed_at")
          .eq("influencer_id", influencerId)
          .eq("item_key", itemKey)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          setConfirmado(true);
          setConfirmedAt(data.confirmed_at);
        } else {
          setConfirmado(false);
          setConfirmedAt(null);
        }
      } finally {
        if (!cancelled) setLoadingCheck(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [influencerId, itemKey]);

  const handleConfirmar = async () => {
    if (!checked || saving || confirmado || !podeConfirmar) return;
    setSaving(true);
    setErroUpsert(null);
    const now = new Date().toISOString();
    const { error } = await supabase.from("guia_confirmacoes").upsert(
      { influencer_id: influencerId, item_key: itemKey, confirmed_at: now },
      { onConflict: "influencer_id,item_key" },
    );
    if (error) {
      console.error("[PlaybookInfluencers] Erro ao confirmar ciência:", error);
      setErroUpsert("Não foi possível registrar a confirmação. Tente novamente.");
    } else {
      setConfirmado(true);
      setConfirmedAt(now);
      onConfirmado();
    }
    setSaving(false);
  };

  if (loadingCheck) {
    return (
      <div
        aria-hidden
        style={{
          marginTop: 28,
          minHeight: 88,
          borderRadius: 12,
          border: `1px solid ${t.cardBorder}`,
          background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        }}
      />
    );
  }

  if (!podeConfirmar && !confirmado) {
    return (
      <div style={{ marginTop: 28, padding: "14px 16px", borderRadius: 12, border: `1px solid ${t.cardBorder}`, fontFamily: FONT.body, fontSize: 13, color: t.textMuted }}>
        Você pode ler este conteúdo, mas não tem permissão para registrar ciência nesta página. Em caso de dúvida, fale com o gestor.
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 28,
      padding: "18px 20px",
      borderRadius: 12,
      background: confirmado
        ? (dark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.05)")
        : (dark ? "rgba(232,64,37,0.07)" : "rgba(232,64,37,0.04)"),
      border: `1.5px solid ${confirmado ? "rgba(34,197,94,0.30)" : "rgba(232,64,37,0.30)"}`,
      transition: "all 0.3s ease",
    }}>
      <div aria-live="polite" aria-atomic="true">
        {confirmado ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${BRAND.verde}20`, border: `2px solid ${BRAND.verde}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Check size={16} color={BRAND.verde} aria-hidden />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: dark ? "#86efac" : "#15803d", fontFamily: FONT.body }}>
                Ciência confirmada
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginTop: 2 }}>
                {confirmedAt ? `Confirmado em ${new Date(confirmedAt).toLocaleString("pt-BR")}` : ""}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.vermelho, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body, marginBottom: 12 }}>
              Confirmação obrigatória
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-label="Confirmar que li e compreendi as regras"
                onClick={() => setChecked((c) => !c)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  flexShrink: 0,
                  marginTop: 2,
                  cursor: "pointer",
                  border: `2px solid ${checked ? BRAND.vermelho : t.cardBorder}`,
                  background: checked ? BRAND.vermelho : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                  padding: 0,
                }}
              >
                {checked ? <Check size={12} color="#fff" aria-hidden /> : null}
              </button>
              <span style={{ fontFamily: FONT.body, fontSize: 13, color: dark ? "#d0d0ee" : "#1a1a3e", lineHeight: 1.55 }}>
                Li e compreendi as regras de <strong>{label}</strong> e me comprometo a segui-las durante toda a campanha.
              </span>
            </div>
            {erroUpsert ? (
              <div role="alert" aria-live="polite" style={{ marginTop: 12, fontSize: 12, color: "#e84025", fontFamily: FONT.body }}>
                {erroUpsert}
              </div>
            ) : null}
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => void handleConfirmar()}
                disabled={!checked || saving}
                style={{
                  padding: "9px 20px", borderRadius: 10, border: "none",
                  background: checked ? BRAND.vermelho : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                  color: checked ? "#fff" : t.textMuted,
                  fontFamily: FONT.body, fontSize: 13, fontWeight: 700,
                  cursor: checked && !saving ? "pointer" : "not-allowed",
                  opacity: checked && !saving ? 1 : 0.65,
                  transition: "all 0.2s",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden />
                    Confirmando…
                  </>
                ) : (
                  "Confirmar Ciência"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PRINCIPAL ────────────────────────────────────────────────────────────────
export default function PlaybookInfluencers() {
  const { theme: t, user, podeVerInfluencer } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("playbook_influencers");
  const dark = t.isDark ?? false;

  const [abaAtiva, setAbaAtiva] = useState(ABAS[0].key);
  const [confirmacoes, setConfirmacoes] = useState<Set<string>>(new Set());
  const [totalInflu, setTotalInflu] = useState(0);
  const [totalConfAll, setTotalConfAll] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const exibirAuditoria =
    perm.canEditarOk &&
    !!user &&
    ROLES_AUDITORIA_PLAYBOOK.includes(user.role);

  const influencerId = user?.id ?? "";

  const podeInfluencerConfirmar =
    roleParidadeInfluencer(user?.role) &&
    (perm.canCriarOk || perm.canEditarOk);

  const carregarConfirmacoes = useCallback(async () => {
    setLoadingStats(true);
    const itensOb = ITENS_OBRIGATORIOS.map((a) => a.itemKey!);

    if (exibirAuditoria) {
      const [{ data: influsRaw }, { data: perfilRows }] = await Promise.all([
        supabase.from("profiles").select("id").in("role", [...ROLES_PARIDADE_INFLUENCER]).eq("ativo", true),
        supabase.from("influencer_perfil").select("id, status, nome_artistico"),
      ]);
      const perfilMap = mapaPerfilAuditoria((perfilRows ?? []) as PerfilAuditoriaRow[]);
      const influsVis = (influsRaw ?? []).filter(
        (row: { id: string }) =>
          podeVerInfluencer(row.id) && influencerElegivelAuditoria(row.id, perfilMap),
      );
      setTotalInflu(influsVis.length);

      const { data: confRows } = await supabase.from("guia_confirmacoes").select("influencer_id, item_key").in("item_key", itensOb);
      const porInflu: Record<string, Set<string>> = {};
      (confRows ?? []).forEach((c: { influencer_id: string; item_key: string }) => {
        if (!podeVerInfluencer(c.influencer_id)) return;
        if (!influencerElegivelAuditoria(c.influencer_id, perfilMap)) return;
        if (!porInflu[c.influencer_id]) porInflu[c.influencer_id] = new Set();
        porInflu[c.influencer_id].add(c.item_key);
      });
      const completos = influsVis.filter((row: { id: string }) =>
        itensOb.every((k) => porInflu[row.id]?.has(k)),
      ).length;
      setTotalConfAll(completos);
    } else if (roleParidadeInfluencer(user?.role) && influencerId) {
      const { data } = await supabase.from("guia_confirmacoes").select("item_key").eq("influencer_id", influencerId);
      setConfirmacoes(new Set((data ?? []).map((c: { item_key: string }) => c.item_key)));
    } else {
      setConfirmacoes(new Set());
      setTotalInflu(0);
      setTotalConfAll(0);
    }
    setLoadingStats(false);
  }, [exibirAuditoria, influencerId, user?.role, podeVerInfluencer]);

  useEffect(() => {
    carregarConfirmacoes();
  }, [carregarConfirmacoes]);

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  const abaConfig = ABAS.find((a) => a.key === abaAtiva)!;
  const Conteudo = abaConfig.content;
  const totalOb = ITENS_OBRIGATORIOS.length;
  const confirmadosOb = ITENS_OBRIGATORIOS.filter((a) => confirmacoes.has(a.itemKey!)).length;
  const tudoConfirmado = roleParidadeInfluencer(user?.role) && confirmadosOb === totalOb && totalOb > 0;

  return (
    <div className="app-page-shell">
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: "1 1 200px" }}>
            <span style={{
              width: 32, height: 32, borderRadius: 9,
              background: brand.primaryIconBg,
              border: brand.primaryIconBorder,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: brand.primaryIconColor, flexShrink: 0,
            }}>
              <BookOpen size={16} aria-hidden />
            </span>
            <h1 style={{
              fontSize: 18, fontWeight: 800, color: brand.primary,
              fontFamily: FONT_TITLE, margin: 0,
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>
              Playbook — Influencers
            </h1>
          </div>

          {!loadingStats && (
            exibirAuditoria ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 14px", borderRadius: 20,
                background: dark ? "rgba(30,54,248,0.10)" : "rgba(30,54,248,0.07)",
                border: "1px solid rgba(30,54,248,0.25)",
                flexShrink: 0,
              }}>
                <ShieldCheck size={14} color={dark ? "#7b95ff" : BRAND.azul} aria-hidden />
                <span style={{ fontSize: 12, fontWeight: 700, color: dark ? "#7b95ff" : BRAND.azul, fontFamily: FONT.body }}>
                  {totalConfAll} de {totalInflu} influencers confirmaram tudo
                </span>
              </div>
            ) : roleParidadeInfluencer(user?.role) ? (
              tudoConfirmado ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 14px", borderRadius: 20,
                  background: dark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.07)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  flexShrink: 0,
                }}>
                  <Check size={14} color={BRAND.verde} aria-hidden />
                  <span style={{ fontSize: 12, fontWeight: 700, color: dark ? "#86efac" : "#15803d", fontFamily: FONT.body }}>
                    Playbook concluído
                  </span>
                </div>
              ) : (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 14px", borderRadius: 20,
                  background: dark ? "rgba(232,64,37,0.09)" : "rgba(232,64,37,0.06)",
                  border: "1px solid rgba(232,64,37,0.25)",
                  flexShrink: 0,
                }}>
                  <AlertTriangle size={14} color={BRAND.vermelho} aria-hidden />
                  <span style={{ fontSize: 12, fontWeight: 700, color: dark ? "#ff9980" : BRAND.vermelho, fontFamily: FONT.body }}>
                    {confirmadosOb} de {totalOb} itens obrigatórios confirmados
                  </span>
                </div>
              )
            ) : null
          )}
        </div>

        <p
          style={{
            color: t.textMuted,
            fontFamily: FONT.body,
            fontSize: 13,
            margin: "5px 0 0",
            paddingLeft: 40,
            lineHeight: 1.45,
          }}
        >
          O material abaixo tem como objetivo orientar e apoiar o criador durante suas transmissões ao vivo, garantindo alinhamento com a operação, posicionamento de marca e melhor experiência para o público.
        </p>
      </div>

      {roleParidadeInfluencer(user?.role) && tudoConfirmado && (
        <div style={{
          marginBottom: 20, padding: "16px 20px", borderRadius: 12,
          background: dark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.07)",
          border: "1.5px solid rgba(34,197,94,0.30)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${BRAND.verde}20`, border: `2px solid ${BRAND.verde}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Check size={18} color={BRAND.verde} aria-hidden />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: dark ? "#86efac" : "#15803d", fontFamily: FONT.body }}>
              Obrigado! Você confirmou todos os itens obrigatórios.
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginTop: 2 }}>
              Sua ciência foi registrada. Boas transmissões.
            </div>
          </div>
        </div>
      )}

      {roleParidadeInfluencer(user?.role) && !tudoConfirmado && totalOb > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Progresso
            </span>
            <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
              {confirmadosOb}/{totalOb} itens obrigatórios
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${totalOb > 0 ? (confirmadosOb / totalOb) * 100 : 0}%`,
              background: brand.useBrand
                ? "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))"
                : `linear-gradient(90deg, ${BRAND.vermelho}, ${BRAND.azul})`,
              borderRadius: 3, transition: "width 0.4s ease",
            }} />
          </div>
        </div>
      )}

      <div style={{ marginBottom: 0 }}>
        <div style={{ position: "relative", marginBottom: 0 }}>
          <div
            role="tablist"
            aria-label="Seções do Playbook"
            style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 0, scrollbarWidth: "none" }}
            onKeyDown={(e) => onFiltroBarTabsKeyDown(e, PLAYBOOK_TAB_KEYS, setAbaAtiva, (k) => `tab-${k}`)}
          >
          {ABAS.map((aba) => {
            const isAtiva = abaAtiva === aba.key;
            const jaConfirmou = roleParidadeInfluencer(user?.role) && aba.itemKey ? confirmacoes.has(aba.itemKey) : false;
            return (
              <FiltroBarTabButton
                key={aba.key}
                id={`tab-${aba.key}`}
                active={isAtiva}
                aria-controls={`panel-${aba.key}`}
                onClick={() => setAbaAtiva(aba.key)}
                activeColor={aba.accentColor}
                icon={aba.icon}
                style={{ flexShrink: 0 }}
              >
                {aba.label}
                {aba.obrigatoria && roleParidadeInfluencer(user?.role) && !jaConfirmou && (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: BRAND.vermelho, flexShrink: 0 }} aria-hidden />
                )}
                {aba.obrigatoria && roleParidadeInfluencer(user?.role) && !jaConfirmou ? (
                  <span className="sr-only">item obrigatório pendente</span>
                ) : null}
                {aba.obrigatoria && roleParidadeInfluencer(user?.role) && jaConfirmou && (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: BRAND.verde, flexShrink: 0 }} aria-hidden />
                )}
                {aba.obrigatoria && roleParidadeInfluencer(user?.role) && jaConfirmou ? (
                  <span className="sr-only">item obrigatório confirmado</span>
                ) : null}
                {aba.obrigatoria && exibirAuditoria && (
                  <span style={{
                    padding: "1px 6px", borderRadius: 4,
                    background: `${BRAND.vermelho}18`,
                    color: dark ? "#ff9980" : BRAND.vermelho,
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                  }}>OBR</span>
                )}
              </FiltroBarTabButton>
            );
          })}
          </div>
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 1,
              width: 60,
              background: `linear-gradient(to left, ${brand.blockBg ?? t.cardBg} 0%, transparent 100%)`,
              pointerEvents: "none",
            }}
          />
        </div>
        <div style={{ height: 1, background: t.cardBorder }} />
      </div>

      <div
        role="tabpanel"
        id={`panel-${abaConfig.key}`}
        aria-labelledby={`tab-${abaConfig.key}`}
        tabIndex={0}
        style={{
        background: brand.blockBg ?? t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderTop: "none",
        borderRadius: "0 0 14px 14px",
        padding: "clamp(14px, 4vw, 28px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
      }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 4, height: 22, borderRadius: 2, background: abaConfig.accentColor, flexShrink: 0 }} />
            <h2 style={{
              margin: 0, fontSize: 15, fontWeight: 700,
              color: abaConfig.accentColor, fontFamily: FONT_TITLE,
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              {abaConfig.label}
            </h2>
          </div>
          {abaConfig.obrigatoria && (
            <span style={{
              padding: "3px 10px", borderRadius: 6,
              background: `${BRAND.vermelho}15`,
              color: dark ? "#ff9980" : BRAND.vermelho,
              border: "1px solid rgba(232,64,37,0.30)",
              fontSize: 10, fontWeight: 700, fontFamily: FONT.body,
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              Obrigatório
            </span>
          )}
        </div>

        <Conteudo dark={dark} />

        {abaConfig.obrigatoria && abaConfig.itemKey && roleParidadeInfluencer(user?.role) && influencerId && (
          <BlocoCiencia
            key={abaConfig.itemKey}
            itemKey={abaConfig.itemKey}
            label={abaConfig.label}
            influencerId={influencerId}
            dark={dark}
            podeConfirmar={podeInfluencerConfirmar}
            onConfirmado={() => {
              setConfirmacoes((prev) => new Set([...prev, abaConfig.itemKey!]));
            }}
          />
        )}

        {abaConfig.obrigatoria && abaConfig.itemKey && exibirAuditoria && (
          <PainelAuditoria itemKey={abaConfig.itemKey} dark={dark} podeVerInfluencer={podeVerInfluencer} />
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28, paddingTop: 20, borderTop: `1px solid ${t.cardBorder}` }}>
          {ABAS.findIndex((a) => a.key === abaAtiva) < ABAS.length - 1 && (
            <button
              type="button"
              onClick={() => {
                const idx = ABAS.findIndex((a) => a.key === abaAtiva);
                setAbaAtiva(ABAS[idx + 1].key);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 10, border: "none",
                background: brand.useBrand ? "var(--brand-accent)" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
                color: "#fff", fontSize: 13, fontWeight: 700,
                fontFamily: FONT.body, cursor: "pointer",
              }}
            >
              Próxima seção
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
