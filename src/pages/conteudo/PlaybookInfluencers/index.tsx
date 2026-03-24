import { useState, useEffect, useCallback, type CSSProperties, type ReactNode } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import type { Role } from "../../../types";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import {
  Check, ChevronRight, AlertTriangle, Info,
  BookOpen, Users, Calendar, Gamepad2,
  Zap, Wrench, Star, MonitorPlay, ShieldCheck,
} from "lucide-react";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  azul:     "#1e36f8",
  vermelho: "#e84025",
  roxo:     "#4a2082",
  ciano:    "#70cae4",
  verde:    "#22c55e",
  amarelo:  "#f59e0b",
} as const;

/** Texto introdutório fixo abaixo do título (visível em todas as abas). */
const PLAYBOOK_SUBTITULO_PARAGRAFOS = [
  "Este material tem como objetivo orientar e apoiar o criador durante suas transmissões ao vivo, garantindo alinhamento com a operação, posicionamento de marca e melhor experiência para o público.",
  "As diretrizes abaixo devem ser aplicadas de forma natural e autêntica, respeitando o estilo de cada criador.",
] as const;

/** Papéis que podem ver o painel de auditoria (além de usePermission.canEditarOk). Operador fica de fora. */
const ROLES_AUDITORIA_PLAYBOOK: Role[] = ["admin", "gestor", "executivo", "agencia"];

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

function TituloSecao({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 24 }}>
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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
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
    { label: "Equipamentos de áudio e vídeo de última geração", value: "✓" },
  ];
  const operacao = [
    { label: "Baralhos em operação", value: "18.000+" },
    { label: "Dealers treinados internamente", value: "210+" },
    { label: "Academia própria de dealers", value: "✓" },
    { label: "Treinadores com certificação internacional", value: "✓" },
  ];
  const suporte = [
    { label: "Tempo médio de resposta do suporte", value: "3 segundos" },
    { label: "Suporte 24h", value: "✓" },
  ];
  return (
    <div>
      <p style={{ fontFamily: FONT.body, fontSize: 14, color: dark ? "#d0d0ee" : "#1a1a3e", lineHeight: 1.7, marginTop: 0 }}>
        Use esses dados como ganchos durante a live para reforçar o posicionamento da <strong>Spin Gaming</strong>. São opcionais, mas altamente recomendados para engajamento.
      </p>
      <TituloSecao accent={BRAND.ciano}>Fun Facts</TituloSecao>
      <TituloSecao accent={BRAND.ciano}>Estrutura</TituloSecao>
      <GridFunFacts dark={dark} items={estrutura} />
      <TituloSecao accent={BRAND.ciano}>Operação</TituloSecao>
      <GridFunFacts dark={dark} items={operacao} />
      <TituloSecao accent={BRAND.ciano}>Suporte</TituloSecao>
      <GridFunFacts dark={dark} items={suporte} />
    </div>
  );
};

const ConteudoAcesso: React.FC<{ dark: boolean }> = ({ dark }) => (
  <div>
    <TituloSecao accent={BRAND.azul}>
      <>Mesas <strong>Spin Gaming</strong></>
    </TituloSecao>
    <ListaOK dark={dark} items={[
      "Clique no banner \"MESAS EXCLUSIVAS\"",
      "Ou acesse pelas mesas exibidas logo abaixo do banner",
    ]} />
    <div style={{ marginTop: 20, borderRadius: 12, overflow: "hidden", border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`, boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.35)" : "0 8px 28px rgba(0,0,0,0.08)" }}>
      <img
        src="/playbook/mesas-spin-gaming.png"
        alt="Interface do site: banner Mesas Exclusivas Liberadas, atalhos e mesas ao vivo (Roleta e Blackjack exclusivos)"
        loading="lazy"
        decoding="async"
        style={{ display: "block", width: "100%", height: "auto" }}
      />
    </div>
    <TituloSecao accent={dark ? "#70cae4" : "#0f6a8a"}>Games Global (Slots)</TituloSecao>
    <ListaOK dark={dark} items={[
      "Acesse pela aba CASSINO",
      "Utilize a tag \"Games Global\" para filtrar os jogos",
      "Ou role a barra até encontrar a seção Games Global",
    ]} />
    <div style={{ marginTop: 20, borderRadius: 12, overflow: "hidden", border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`, boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.35)" : "0 8px 28px rgba(0,0,0,0.08)" }}>
      <img
        src="/playbook/games-global-slots.png"
        alt="Interface do cassino: aba CASSINO com a seção Games Global e carrossel de slots"
        loading="lazy"
        decoding="async"
        style={{ display: "block", width: "100%", height: "auto" }}
      />
    </div>
  </div>
);

const ABAS: AbaConfig[] = [
  { key: "posicionamento", label: "Posicionamento", icon: <Star size={14} />, obrigatoria: false, accentColor: BRAND.azul, content: ConteudoPosicionamento },
  { key: "dealers", label: "Dealers", icon: <Users size={14} />, obrigatoria: true, itemKey: "dealers_boas_praticas", accentColor: BRAND.vermelho, content: ConteudoDealers },
  { key: "agendamento", label: "Agendamento", icon: <Calendar size={14} />, obrigatoria: true, itemKey: "agendamento_lives", accentColor: BRAND.vermelho, content: ConteudoAgendamento },
  { key: "jogos", label: "Jogos", icon: <Gamepad2 size={14} />, obrigatoria: true, itemKey: "prioridade_jogos", accentColor: BRAND.vermelho, content: ConteudoJogos },
  { key: "blackjack", label: "Side Bets", icon: <Zap size={14} />, obrigatoria: false, accentColor: BRAND.azul, content: ConteudoBlackjack },
  { key: "tecnico", label: "Situações Técnicas", icon: <Wrench size={14} />, obrigatoria: false, accentColor: BRAND.azul, content: ConteudoTecnico },
  { key: "funfacts", label: "Fun Facts", icon: <Info size={14} />, obrigatoria: false, accentColor: BRAND.ciano, content: ConteudoFunFacts },
  { key: "acesso", label: "Acesso aos Jogos", icon: <MonitorPlay size={14} />, obrigatoria: false, accentColor: BRAND.azul, content: ConteudoAcesso },
];

const ITENS_OBRIGATORIOS = ABAS.filter((a) => a.obrigatoria && a.itemKey);

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
      const [confRes, influRes] = await Promise.all([
        supabase.from("guia_confirmacoes").select("id, influencer_id, item_key, confirmed_at").eq("item_key", itemKey),
        supabase.from("profiles").select("id, name").eq("role", "influencer"),
      ]);
      const confs = (confRes.data ?? []) as Confirmacao[];
      const influs = ((influRes.data ?? []) as { id: string; name: string }[]).filter((i) => podeVerInfluencer(i.id));
      const confIds = new Set(confs.map((c) => c.influencer_id));
      const influsIds = new Set(influs.map((i) => i.id));

      const confComNome = confs
        .filter((c) => podeVerInfluencer(c.influencer_id))
        .map((c) => ({
          ...c,
          influencer_nome: influs.find((i) => i.id === c.influencer_id)?.name ?? c.influencer_id,
        }));

      setConfirmacoes(confComNome);
      setPendentes(influs.filter((i) => !confIds.has(i.id)));
      setLoading(false);
    }
    load();
  }, [itemKey, podeVerInfluencer]);

  if (loading) {
    return <div style={{ padding: "16px 0", color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>Carregando...</div>;
  }

  return (
    <div style={{
      marginTop: 24, padding: "18px 20px", borderRadius: 12,
      background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
      border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <ShieldCheck size={16} color={dark ? "#7b95ff" : BRAND.azul} />
        <span style={{ fontSize: 11, fontWeight: 700, color: dark ? "#7b95ff" : BRAND.azul, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Auditoria de Ciência
        </span>
        <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginLeft: 4 }}>
          — {confirmacoes.length} confirmado{confirmacoes.length !== 1 ? "s" : ""} · {pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: BRAND.verde, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body, marginBottom: 8 }}>
            Confirmaram ({confirmacoes.length})
          </div>
          {confirmacoes.length === 0 ? (
            <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>Nenhum ainda.</span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {confirmacoes.map((c) => (
                <div key={c.id} style={{ padding: "8px 10px", borderRadius: 8, background: dark ? "rgba(34,197,94,0.07)" : "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.20)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: dark ? "#86efac" : "#15803d", fontFamily: FONT.body }}>{c.influencer_nome}</div>
                  <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginTop: 2 }}>
                    {new Date(c.confirmed_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          )}
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

  useEffect(() => {
    supabase.from("guia_confirmacoes")
      .select("id, confirmed_at")
      .eq("influencer_id", influencerId)
      .eq("item_key", itemKey)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setConfirmado(true);
          setConfirmedAt(data.confirmed_at);
        }
        setLoadingCheck(false);
      });
  }, [influencerId, itemKey]);

  const handleConfirmar = async () => {
    if (!checked || saving || confirmado || !podeConfirmar) return;
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("guia_confirmacoes").upsert(
      { influencer_id: influencerId, item_key: itemKey, confirmed_at: now },
      { onConflict: "influencer_id,item_key" },
    );
    if (!error) {
      setConfirmado(true);
      setConfirmedAt(now);
      onConfirmado();
    }
    setSaving(false);
  };

  if (loadingCheck) return null;

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
      {confirmado ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${BRAND.verde}20`, border: `2px solid ${BRAND.verde}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Check size={16} color={BRAND.verde} />
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
          <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0, accentColor: BRAND.vermelho }}
            />
            <span style={{ fontFamily: FONT.body, fontSize: 13, color: dark ? "#d0d0ee" : "#1a1a3e", lineHeight: 1.55 }}>
              Li e compreendi as regras de <strong>{label}</strong> e me comprometo a segui-las durante toda a campanha.
            </span>
          </label>
          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={!checked || saving}
              style={{
                padding: "9px 20px", borderRadius: 10, border: "none",
                background: checked ? BRAND.vermelho : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                color: checked ? "#fff" : t.textMuted,
                fontFamily: FONT.body, fontSize: 13, fontWeight: 700,
                cursor: checked && !saving ? "pointer" : "not-allowed",
                opacity: checked && !saving ? 1 : 0.65,
                transition: "all 0.2s",
              }}
            >
              {saving ? "Confirmando..." : "Confirmar Ciência"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PRINCIPAL ────────────────────────────────────────────────────────────────
export default function PlaybookInfluencers() {
  const { theme: t, user, isDark, podeVerInfluencer } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("playbook_influencers");
  const dark = isDark ?? false;

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
    user?.role === "influencer" &&
    (perm.canCriarOk || perm.canEditarOk);

  const carregarConfirmacoes = useCallback(async () => {
    setLoadingStats(true);
    const itensOb = ITENS_OBRIGATORIOS.map((a) => a.itemKey!);

    if (exibirAuditoria) {
      const { data: influsRaw } = await supabase.from("profiles").select("id").eq("role", "influencer");
      const influsVis = (influsRaw ?? []).filter((row: { id: string }) => podeVerInfluencer(row.id));
      setTotalInflu(influsVis.length);

      const { data: confRows } = await supabase.from("guia_confirmacoes").select("influencer_id, item_key").in("item_key", itensOb);
      const porInflu: Record<string, Set<string>> = {};
      (confRows ?? []).forEach((c: { influencer_id: string; item_key: string }) => {
        if (!podeVerInfluencer(c.influencer_id)) return;
        if (!porInflu[c.influencer_id]) porInflu[c.influencer_id] = new Set();
        porInflu[c.influencer_id].add(c.item_key);
      });
      const completos = influsVis.filter((row: { id: string }) =>
        itensOb.every((k) => porInflu[row.id]?.has(k)),
      ).length;
      setTotalConfAll(completos);
    } else if (user?.role === "influencer" && influencerId) {
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
        Você não tem permissão para visualizar o Playbook Influencers.
      </div>
    );
  }

  const abaConfig = ABAS.find((a) => a.key === abaAtiva)!;
  const Conteudo = abaConfig.content;
  const totalOb = ITENS_OBRIGATORIOS.length;
  const confirmadosOb = ITENS_OBRIGATORIOS.filter((a) => confirmacoes.has(a.itemKey!)).length;
  const tudoConfirmado = user?.role === "influencer" && confirmadosOb === totalOb && totalOb > 0;

  return (
    <div style={{ padding: "20px 24px 48px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 9,
              background: brand.primaryIconBg,
              border: brand.primaryIconBorder,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: brand.primaryIconColor, flexShrink: 0,
            }}>
              <BookOpen size={16} />
            </span>
            <h1 style={{
              fontSize: 18, fontWeight: 800, color: brand.primary,
              fontFamily: FONT_TITLE, margin: 0,
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>
              Playbook — Influencers
            </h1>
          </div>
          <div style={{
            marginTop: 12,
            marginLeft: 40,
            maxWidth: 720,
            fontFamily: FONT.body,
            fontSize: 13,
            lineHeight: 1.65,
            color: t.textMuted,
          }}>
            {PLAYBOOK_SUBTITULO_PARAGRAFOS.map((texto, i) => (
              <p key={i} style={{ margin: i === 0 ? "0 0 10px 0" : 0 }}>
                {texto}
              </p>
            ))}
          </div>
        </div>

        {!loadingStats && (
          exibirAuditoria ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 14px", borderRadius: 20,
              background: dark ? "rgba(30,54,248,0.10)" : "rgba(30,54,248,0.07)",
              border: "1px solid rgba(30,54,248,0.25)",
            }}>
              <ShieldCheck size={14} color={dark ? "#7b95ff" : BRAND.azul} />
              <span style={{ fontSize: 12, fontWeight: 700, color: dark ? "#7b95ff" : BRAND.azul, fontFamily: FONT.body }}>
                {totalConfAll} de {totalInflu} influencers confirmaram tudo
              </span>
            </div>
          ) : user?.role === "influencer" ? (
            tudoConfirmado ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 14px", borderRadius: 20,
                background: dark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.07)",
                border: "1px solid rgba(34,197,94,0.25)",
              }}>
                <Check size={14} color={BRAND.verde} />
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
              }}>
                <AlertTriangle size={14} color={BRAND.vermelho} />
                <span style={{ fontSize: 12, fontWeight: 700, color: dark ? "#ff9980" : BRAND.vermelho, fontFamily: FONT.body }}>
                  {confirmadosOb} de {totalOb} itens obrigatórios confirmados
                </span>
              </div>
            )
          ) : null
        )}
      </div>

      {user?.role === "influencer" && tudoConfirmado && (
        <div style={{
          marginBottom: 20, padding: "16px 20px", borderRadius: 12,
          background: dark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.07)",
          border: "1.5px solid rgba(34,197,94,0.30)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${BRAND.verde}20`, border: `2px solid ${BRAND.verde}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Check size={18} color={BRAND.verde} />
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

      {user?.role === "influencer" && !tudoConfirmado && totalOb > 0 && (
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
              background: `linear-gradient(90deg, ${BRAND.vermelho}, ${BRAND.azul})`,
              borderRadius: 3, transition: "width 0.4s ease",
            }} />
          </div>
        </div>
      )}

      <div style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 0, scrollbarWidth: "none" }}>
          {ABAS.map((aba) => {
            const isAtiva = abaAtiva === aba.key;
            const jaConfirmou = user?.role === "influencer" && aba.itemKey ? confirmacoes.has(aba.itemKey) : false;
            return (
              <button
                key={aba.key}
                type="button"
                onClick={() => setAbaAtiva(aba.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 14px",
                  borderRadius: "10px 10px 0 0",
                  border: `1px solid ${isAtiva ? t.cardBorder : "transparent"}`,
                  borderBottom: isAtiva ? `1px solid ${brand.blockBg ?? t.cardBg}` : "none",
                  background: isAtiva ? (brand.blockBg ?? t.cardBg) : "transparent",
                  color: isAtiva ? aba.accentColor : t.textMuted,
                  fontSize: 12, fontWeight: isAtiva ? 700 : 500,
                  fontFamily: FONT.body,
                  cursor: "pointer", whiteSpace: "nowrap",
                  transition: "all 0.15s",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <span style={{ color: isAtiva ? aba.accentColor : t.textMuted, display: "flex" }}>{aba.icon}</span>
                {aba.label}
                {aba.obrigatoria && user?.role === "influencer" && !jaConfirmou && (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: BRAND.vermelho, flexShrink: 0 }} />
                )}
                {aba.obrigatoria && user?.role === "influencer" && jaConfirmou && (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: BRAND.verde, flexShrink: 0 }} />
                )}
                {aba.obrigatoria && exibirAuditoria && (
                  <span style={{
                    padding: "1px 6px", borderRadius: 4,
                    background: `${BRAND.vermelho}18`,
                    color: dark ? "#ff9980" : BRAND.vermelho,
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                  }}>OBR</span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ height: 1, background: t.cardBorder }} />
      </div>

      <div style={{
        background: brand.blockBg ?? t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderTop: "none",
        borderRadius: "0 0 14px 14px",
        padding: "24px 28px 28px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
      }}>
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

        {abaConfig.obrigatoria && abaConfig.itemKey && user?.role === "influencer" && influencerId && (
          <BlocoCiencia
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
