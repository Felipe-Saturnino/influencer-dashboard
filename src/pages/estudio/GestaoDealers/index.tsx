import { useState, useEffect, useCallback, useMemo, type CSSProperties, type ReactNode } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { getPageContentBoxStyle, getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getGameTagChipStyle } from "../../../lib/gameIdentityColors";
import { GAME_IDENTITY_ICONS } from "../../../lib/gameIdentityIcons";
import { BRAND, FONT_TITLE, MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import type { Dealer, DealerGenero, DealerTurno, DealerJogo, Operadora } from "../../../types";
import {
  Eye,
  History,
  Send,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  Loader2,
  Star,
} from "lucide-react";
import OperadoraTag from "../../../components/OperadoraTag";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { normalizarTextoBusca } from "../../../lib/searchText";
import { FiltroEstudioSelect } from "../../../components/FiltroEstudioSelect";
import {
  buildEstudiosSlugsParaOperadoras,
  buildOperadoraParaEstudioMap,
  FILTRO_STAFF_ESTUDIO_NENHUM,
  FILTRO_STAFF_ESTUDIO_TODOS,
} from "../../rh/GestaoStaff/gestaoStaffEstudioHelpers";
import {
  dealerEstudioLabelFromRow,
  dealerNoEscopoEstudio,
  dealerRowPassaFiltroEstudio,
} from "./gestaoDealersEstudioHelpers";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalSolicitacao } from "../solicitacoes/ModalSolicitacao";
import { ModalThreadSolicitacao } from "../solicitacoes/ModalThreadSolicitacao";
import { BannerPendencias } from "../solicitacoes/BannerPendencias";
import { buildOperadoraBySlugMap, labelOperadoraFromSlug, type OperadoraLabelRow } from "../../../lib/operadoraLabels";
import { corStatusSolicitacao, type SolicitacaoStatus, type SolicitacaoTipo } from "../solicitacoes/solicitacoesUtils";

/** Jogos no cadastro e filtros. `mesa_vip` pode existir no banco por legado; usar flag `vip` no cadastro. */
type DealerJogoCadastro = Exclude<DealerJogo, "mesa_vip">;

// ─── Constantes ───────────────────────────────────────────────────────────────
const GENERO_OPTS: { value: DealerGenero; label: string }[] = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
];

const TURNO_OPTS: { value: DealerTurno; label: string }[] = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];

const JOGOS_OPTS: { value: DealerJogoCadastro; label: string }[] = [
  { value: "blackjack", label: "Blackjack" },
  { value: "roleta", label: "Roleta" },
  { value: "baccarat", label: "Baccarat" },
  { value: "futebol_brasileiro", label: "Futebol Brasileiro" },
];

function passaFiltroEstudio(
  d: Dealer,
  filtroEstudio: string,
  opParaEstudio: Record<string, string>,
  estudioSlugsPermitidos?: readonly string[] | null,
): boolean {
  return dealerRowPassaFiltroEstudio(d, filtroEstudio, opParaEstudio, estudioSlugsPermitidos);
}

const ICONE_GENERO: Record<DealerGenero, ReactNode> = {
  feminino: <User size={13} aria-hidden />,
  masculino: <Users size={13} aria-hidden />,
};

function estiloTagJogoDealer(key: DealerJogoCadastro, isDark: boolean): CSSProperties {
  const chip = getGameTagChipStyle(key, isDark);
  return {
    background: chip.bg,
    border: `1px solid ${chip.border}`,
    color: chip.color,
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: FONT.body,
    textTransform: "uppercase",
    flexShrink: 0,
  };
}

function estiloFiltroJogoDealer(
  key: DealerJogoCadastro,
  isDark: boolean,
  ativo: boolean,
  textMuted: string,
): CSSProperties {
  const chip = getGameTagChipStyle(key, isDark);
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 12px",
    borderRadius: 999,
    cursor: "pointer",
    fontFamily: FONT.body,
    fontSize: 12,
    border: ativo ? `1px solid ${chip.border}` : `1px solid color-mix(in srgb, ${chip.hex} 22%, transparent)`,
    background: ativo ? chip.bg : "transparent",
    color: ativo ? chip.color : textMuted,
    fontWeight: ativo ? 700 : 500,
    transition: "all 0.15s",
  };
}

const CARD_SHADOW = (isDark: boolean) =>
  isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

/** Retratos de dealer: âncora no topo para não cortar rosto em `object-fit: cover`. */
const DEALER_FOTO_ASPECT_RATIO = "4/5";

const DEALER_FOTO_IMG_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "top center",
  display: "block",
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function GestaoDealers() {
  const { theme: t, user, effectiveRole } = useApp();
  const brand = useDashboardBrand();
  const consolidadoBox = getPageContentBoxStyle(brand, t, { padding: "14px 18px" });
  const { operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("gestao_dealers");
  const permCentral = usePermission("central_notificacoes");
  const role = effectiveRole ?? user?.role;
  const isOperadorEscopo = role === "operador" && !!operadoraSlugsForcado?.length;
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [estudios, setEstudios] = useState<{ slug: string; nome: string }[]>([]);
  const [estudiosNome, setEstudiosNome] = useState<Record<string, string>>({});
  const [opParaEstudio, setOpParaEstudio] = useState<Record<string, string>>({});
  /** Junction bruta — escopo Operador usa todos os estúdios (dedicado + network), não o mapa 1:1. */
  const [junctionEstudio, setJunctionEstudio] = useState<
    { operadora_slug: string; estudio_slug: string; tipo: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [modalVer, setModalVer] = useState<Dealer | null>(null);
  const [modalHistoricoDealer, setModalHistoricoDealer] = useState<Dealer | null>(null);
  const [modalSolicitacao, setModalSolicitacao] = useState<Dealer | null>(null);
  const [solicitacaoThreadId, setSolicitacaoThreadId] = useState<string | null>(null);

  const [filtroGenero, setFiltroGenero] = useState<string>("todos");
  const [filtroTurno, setFiltroTurno] = useState<string>("todos");
  const [filtroEstudio, setFiltroEstudio] = useState(FILTRO_STAFF_ESTUDIO_TODOS);
  const [filtroJogos, setFiltroJogos] = useState<string>("todos");
  const [buscaDealer, setBuscaDealer] = useState("");

  const carregarEstudios = useCallback(async () => {
    const { data } = await supabase
      .from("estudios_spin")
      .select("slug, nome, tipo, estudios_spin_operadoras(operadora_slug)")
      .eq("ativo", true);
    const nomeMap: Record<string, string> = {};
    const opts: { slug: string; nome: string }[] = [];
    const junctionFlat: { operadora_slug: string; estudio_slug: string; tipo: string }[] = [];
    for (const raw of data ?? []) {
      const e = raw as {
        slug: string;
        nome: string;
        tipo: string;
        estudios_spin_operadoras: { operadora_slug: string } | { operadora_slug: string }[] | null;
      };
      nomeMap[e.slug] = e.nome;
      opts.push({ slug: e.slug, nome: e.nome });
      const joins = e.estudios_spin_operadoras;
      const list = joins == null ? [] : Array.isArray(joins) ? joins : [joins];
      for (const j of list) {
        junctionFlat.push({
          operadora_slug: j.operadora_slug,
          estudio_slug: e.slug,
          tipo: e.tipo,
        });
      }
    }
    const opMap = buildOperadoraParaEstudioMap(junctionFlat);
    setEstudiosNome(nomeMap);
    setEstudios(opts.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
    setOpParaEstudio(opMap);
    setJunctionEstudio(junctionFlat);
    return { opMap, junctionFlat };
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { opMap, junctionFlat } = await carregarEstudios();
    const slugsForcado =
      isOperadorEscopo && operadoraSlugsForcado?.length
        ? buildEstudiosSlugsParaOperadoras(junctionFlat, operadoraSlugsForcado)
        : null;
    const { data: dealersRpc, error: dealersErr } = await supabase.rpc("dealers_lista_elenco");
    let dealersLista: Dealer[];
    if (dealersErr) {
      console.error("Gestão de Dealers: RPC dealers_lista_elenco indisponível — fallback em dealers", dealersErr);
      const { data: legacy, error: legacyErr } = await supabase
        .from("dealers")
        .select("*")
        .not("rh_funcionario_id", "is", null)
        .order("nickname");
      if (legacyErr) console.error("Gestão de Dealers: falha ao carregar dealers", legacyErr);
      dealersLista = (legacy ?? []) as Dealer[];
    } else {
      dealersLista = (dealersRpc ?? []) as Dealer[];
    }
    if (isOperadorEscopo && slugsForcado?.length) {
      dealersLista = dealersLista.filter((d) => dealerNoEscopoEstudio(d, slugsForcado, opMap));
    } else if (isOperadorEscopo) {
      // Escopo sem junction resolvida — não exibir elenco global.
      dealersLista = [];
    }
    dealersLista.sort((a, b) => (a.nickname ?? "").localeCompare(b.nickname ?? "", "pt-BR"));
    const [operadorasRes] = await Promise.all([
      supabase.from("operadoras").select("slug, nome, brand_action").order("nome"),
    ]);
    setDealers(dealersLista);
    setOperadoras((operadorasRes.data ?? []) as Operadora[]);
    setLoading(false);
  }, [isOperadorEscopo, operadoraSlugsForcado, carregarEstudios]);

  const estudioSlugsForcado = useMemo(() => {
    if (!isOperadorEscopo || !operadoraSlugsForcado?.length) return null;
    const slugs = buildEstudiosSlugsParaOperadoras(junctionEstudio, operadoraSlugsForcado);
    return slugs.length > 0 ? slugs : null;
  }, [isOperadorEscopo, operadoraSlugsForcado, junctionEstudio]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (isOperadorEscopo && estudioSlugsForcado?.length === 1) {
      setFiltroEstudio(estudioSlugsForcado[0]!);
    }
  }, [isOperadorEscopo, estudioSlugsForcado]);

  const estudiosVisiveis = useMemo(() => {
    if (estudioSlugsForcado?.length) {
      return estudios.filter((e) => estudioSlugsForcado.includes(e.slug));
    }
    return estudios;
  }, [estudios, estudioSlugsForcado]);

  const dealersPorEstudio = useMemo(
    () => dealers.filter((d) => passaFiltroEstudio(d, filtroEstudio, opParaEstudio, estudioSlugsForcado)),
    [dealers, filtroEstudio, opParaEstudio, estudioSlugsForcado],
  );

  const filtered = useMemo(() => {
    const q = normalizarTextoBusca(buscaDealer);
    return dealersPorEstudio.filter((d) => {
      if (filtroGenero !== "todos" && d.genero !== filtroGenero) return false;
      if (filtroTurno !== "todos" && d.turno !== filtroTurno) return false;
      if (filtroJogos !== "todos" && !(d.jogos ?? []).includes(filtroJogos as DealerJogoCadastro)) return false;
      if (q) {
        const nick = normalizarTextoBusca(d.nickname ?? "");
        const nome = normalizarTextoBusca(d.nome_real ?? "");
        if (!nick.includes(q) && !nome.includes(q)) return false;
      }
      return true;
    });
  }, [dealersPorEstudio, filtroGenero, filtroTurno, filtroJogos, buscaDealer]);

  /** Total do consolidado: estúdio + turno + gênero + jogo (sem busca por texto). */
  const totalDealersDestaque = useMemo(
    () =>
      dealersPorEstudio.filter((d) => {
        if (filtroTurno !== "todos" && d.turno !== filtroTurno) return false;
        if (filtroGenero !== "todos" && d.genero !== filtroGenero) return false;
        if (filtroJogos !== "todos" && !(d.jogos ?? []).includes(filtroJogos as DealerJogoCadastro)) return false;
        return true;
      }).length,
    [dealersPorEstudio, filtroTurno, filtroGenero, filtroJogos]
  );

  /** Contagens por gênero com turno + jogo + estúdio aplicados (sem o filtro de gênero). */
  const porGenero = useMemo(() => {
    const acc: Record<string, number> = { feminino: 0, masculino: 0 };
    dealersPorEstudio.forEach((d) => {
      if (filtroTurno !== "todos" && d.turno !== filtroTurno) return;
      if (filtroJogos !== "todos" && !(d.jogos ?? []).includes(filtroJogos as DealerJogoCadastro)) return;
      acc[d.genero] = (acc[d.genero] ?? 0) + 1;
    });
    return acc;
  }, [dealersPorEstudio, filtroTurno, filtroJogos]);

  /** Contagens por jogo com turno + gênero + estúdio (sem o filtro de jogo). */
  const porJogo = useMemo(() => {
    const acc: Record<string, number> = { blackjack: 0, roleta: 0, baccarat: 0, futebol_brasileiro: 0 };
    dealersPorEstudio.forEach((d) => {
      if (filtroTurno !== "todos" && d.turno !== filtroTurno) return;
      if (filtroGenero !== "todos" && d.genero !== filtroGenero) return;
      (d.jogos ?? []).forEach((j) => {
        if (j in acc) acc[j] = (acc[j] ?? 0) + 1;
      });
    });
    return acc;
  }, [dealersPorEstudio, filtroTurno, filtroGenero]);

  const irTurnoAnterior = () => {
    if (filtroTurno === "todos") {
      setFiltroTurno(TURNO_OPTS[2].value);
      return;
    }
    const i = TURNO_OPTS.findIndex((o) => o.value === filtroTurno);
    const prev = i <= 0 ? 2 : i - 1;
    setFiltroTurno(TURNO_OPTS[prev].value);
  };

  const irTurnoProximo = () => {
    if (filtroTurno === "todos") {
      setFiltroTurno(TURNO_OPTS[0].value);
      return;
    }
    const i = TURNO_OPTS.findIndex((o) => o.value === filtroTurno);
    const next = i < 0 || i >= 2 ? 0 : i + 1;
    setFiltroTurno(TURNO_OPTS[next].value);
  };

  const labelTurnoCarrossel =
    filtroTurno === "todos"
      ? "Todos os turnos"
      : (TURNO_OPTS.find((o) => o.value === filtroTurno)?.label ?? filtroTurno);

  /** Slug da operadora para solicitações (operador com escopo — fluxo Central permanece por operadora). */
  const operadoraSlugAtiva = useMemo(() => {
    if (!isOperadorEscopo || !operadoraSlugsForcado?.length) return null;
    if (operadoraSlugsForcado.length === 1) return operadoraSlugsForcado[0];
    if (
      filtroEstudio !== FILTRO_STAFF_ESTUDIO_TODOS &&
      filtroEstudio !== FILTRO_STAFF_ESTUDIO_NENHUM
    ) {
      const op = operadoraSlugsForcado.find((o) => opParaEstudio[o] === filtroEstudio);
      if (op) return op;
    }
    return operadoraSlugsForcado[0] ?? null;
  }, [isOperadorEscopo, operadoraSlugsForcado, filtroEstudio, opParaEstudio]);

  const operadoraBySlug = useMemo(() => buildOperadoraBySlugMap(operadoras), [operadoras]);

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      <PageHeader
        icon={<PageMenuIcon pageKey="gestao_dealers" />}
        title={getPageMenuLabel("gestao_dealers")}
        subtitle="Catálogo de Game Presenters em operação — especialidades, turnos e solicitações das operadoras."
      />

      {isOperadorEscopo ? (
        <BannerPendencias operadoraSlugs={operadoraSlugsForcado} operadoras={operadoras} podeInteragir={permCentral.canEditarOk} />
      ) : null}

      {/* ─── Bloco filtros: carrossel turnos (Overview) + estúdio ───────────── */}
      <div style={getPageFilterBoxStyle(brand, t)}>
          <div className="app-filter-bar-tabs-cta">
          <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
          <div className="app-filter-bar-tabs-cta__tabs" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              aria-label="Turno anterior"
              onClick={irTurnoAnterior}
              style={getCarouselBtnNavStyle(t, false)}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span style={getCarouselPeriodLabelStyle(t)}>{labelTurnoCarrossel}</span>
            <button
              type="button"
              aria-label="Próximo turno"
              onClick={irTurnoProximo}
              style={getCarouselBtnNavStyle(t, false)}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
            {estudiosVisiveis.length > 0 ? (
              <FiltroEstudioSelect
                pill
                minWidth={200}
                value={filtroEstudio}
                onChange={setFiltroEstudio}
                estudios={estudiosVisiveis}
                showTodosOption={!estudioSlugsForcado || estudioSlugsForcado.length !== 1}
                extraOptions={[{ value: FILTRO_STAFF_ESTUDIO_NENHUM, label: "Nenhum estúdio" }]}
              />
            ) : null}
          </div>
          <div className="app-filter-bar-tabs-cta__actions">
            <AjudaContextualAcoes pageKey="gestao_dealers" />
          </div>
          </div>
      </div>

      {/* ─── Bloco consolidado: metade Dealers + metade filtros / busca ───────── */}
      {loading ? (
        <div
          style={{
            ...consolidadoBox,
            display: "flex",
            flexWrap: "wrap",
            gap: "20px 28px",
          }}
        >
          <div style={{ flex: "1 1 220px", minHeight: 118, borderRadius: 12, background: t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
          <div style={{ flex: "2 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
            <div style={{ height: 14, width: "55%", borderRadius: 6, background: t.isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
            <div style={{ height: 14, width: "80%", borderRadius: 6, background: t.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} />
            <div style={{ height: 36, width: "100%", borderRadius: 999, background: t.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} />
          </div>
        </div>
      ) : null}
      {!loading && (
        <div
          style={{
            ...consolidadoBox,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "stretch",
            gap: "20px 28px",
          }}
        >
          <div style={{
            flex: "1 1 220px",
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            minHeight: 118,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body, marginBottom: 12 }}>
              Dealers
            </div>
            <div style={{ fontSize: 56, fontWeight: 900, color: brand.accent, fontFamily: FONT_TITLE, lineHeight: 1 }}>
              {totalDealersDestaque}
            </div>
          </div>
          <div style={{ flex: "2 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{
                flexShrink: 0,
                minWidth: 72,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: t.textMuted,
                fontFamily: FONT.body,
              }}>
                Gêneros
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", flex: 1, minWidth: 0 }}>
                {GENERO_OPTS.map((o) => {
                  const ativo = filtroGenero === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => setFiltroGenero(ativo ? "todos" : o.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontFamily: FONT.body,
                        fontSize: 12,
                        border: ativo ? `1px solid ${BRAND.verde}` : `1px solid ${BRAND.verde}55`,
                        background: ativo ? "rgba(34,197,94,0.15)" : "transparent",
                        color: ativo ? BRAND.verde : t.textMuted,
                        fontWeight: ativo ? 700 : 400,
                        transition: "all 0.15s",
                      }}
                    >
                      {ICONE_GENERO[o.value]}
                      <span>{o.label} · {porGenero[o.value] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{
                flexShrink: 0,
                minWidth: 72,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: t.textMuted,
                fontFamily: FONT.body,
              }}>
                Jogos
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", flex: 1, minWidth: 0 }}>
                {JOGOS_OPTS.map((o) => {
                  const ativo = filtroJogos === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => setFiltroJogos(ativo ? "todos" : o.value)}
                      style={estiloFiltroJogoDealer(o.value, t.isDark, ativo, t.textMuted)}
                    >
                      {GAME_IDENTITY_ICONS[o.value]}
                      <span>{o.label} · {porJogo[o.value] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <BarraPesquisaPagina
              value={buscaDealer}
              onChange={setBuscaDealer}
              placeholder={PAGE_SEARCH.nomeNickname}
              aria-label="Buscar dealers por nome ou nickname"
              wrapperStyle={{ width: "100%" }}
            />
          </div>
        </div>
      )}

      {/* ─── Bloco 3: Elenco completo ────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, overflow: "hidden" }}>
              <div style={{ aspectRatio: DEALER_FOTO_ASPECT_RATIO, background: t.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} />
              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ height: 18, width: "60%", borderRadius: 6, background: t.isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
                <div style={{ height: 12, width: "40%", borderRadius: 6, background: t.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 48, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>{MSG_SEM_DADOS_FILTRO}</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          {filtered.map((d) => (
            <DealerCard
              key={d.id}
              dealer={d}
              estudioLabel={dealerEstudioLabelFromRow(d, estudiosNome, opParaEstudio)}
              operadoraBySlug={operadoraBySlug}
              onVer={() => setModalVer(d)}
              onSolicitar={operadoraSlugAtiva && permCentral.canEditarOk ? () => setModalSolicitacao(d) : undefined}
              onHistoricoSolicitacoes={
                !permCentral.loading &&
                (permCentral.canView === "sim" || permCentral.canView === "proprios") &&
                (role !== "operador" || !!operadoraSlugAtiva)
                  ? () => setModalHistoricoDealer(d)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Modais */}
      {modalVer && (
        <ModalVer
          dealer={modalVer}
          estudioLabel={dealerEstudioLabelFromRow(modalVer, estudiosNome, opParaEstudio)}
          operadoraBySlug={operadoraBySlug}
          onClose={() => setModalVer(null)}
        />
      )}
      {modalHistoricoDealer && (
        <ModalHistoricoSolicitacoesDealer
          dealer={modalHistoricoDealer}
          operadoraBySlug={operadoraBySlug}
          slugSolicitacaoFiltro={isOperadorEscopo ? operadoraSlugAtiva : null}
          onClose={() => setModalHistoricoDealer(null)}
          onAbrirThread={(id) => {
            setModalHistoricoDealer(null);
            setSolicitacaoThreadId(id);
          }}
        />
      )}
      {modalSolicitacao && operadoraSlugAtiva ? (
        <ModalSolicitacao
          dealer={modalSolicitacao}
          operadoraSlug={operadoraSlugAtiva}
          onClose={() => setModalSolicitacao(null)}
          onEnviado={() => {
            void carregar();
          }}
        />
      ) : null}
      {solicitacaoThreadId ? (
        <ModalThreadSolicitacao
          solicitacaoId={solicitacaoThreadId}
          operadoras={operadoras}
          podeInteragir={permCentral.canEditarOk}
          onClose={() => setSolicitacaoThreadId(null)}
          onResolvido={() => {
            void carregar();
          }}
        />
      ) : null}
    </div>
  );
}

/** Carrossel de fotos (cards e modal ver): setas só quando há mais de uma URL. */
function DealerFotoCarrossel({
  urls,
  alt,
  resetKey,
}: {
  urls: string[];
  alt: string;
  resetKey: string;
}) {
  const n = urls.length;
  const [idx, setIdx] = useState(0);
  const urlsKey = useMemo(() => urls.join("|"), [urls]);

  useEffect(() => {
    setIdx(0);
  }, [resetKey, urlsKey]);

  if (n === 0) return null;

  const cur = ((idx % n) + n) % n;

  const navBtn: CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 4,
    width: "min(40px, 10vw)",
    height: "min(40px, 10vw)",
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,0.45)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <img
        src={urls[cur]}
        alt={n > 1 ? `${alt} — foto ${cur + 1} de ${n}` : alt}
        style={DEALER_FOTO_IMG_STYLE}
      />
      {n > 1 ? (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => (i - 1 + n) % n);
            }}
            style={{ ...navBtn, left: 6 }}
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Próxima foto"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => (i + 1) % n);
            }}
            style={{ ...navBtn, right: 6 }}
          >
            <ChevronRight size={18} aria-hidden />
          </button>
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 3,
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              padding: "2px 10px",
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: FONT.body,
              pointerEvents: "none",
            }}
            aria-live="polite"
          >
            {cur + 1} / {n}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── DealerCard ────────────────────────────────────────────────────────────────
function DealerCard({
  dealer,
  estudioLabel,
  operadoraBySlug,
  onVer,
  onSolicitar,
  onHistoricoSolicitacoes,
}: {
  dealer: Dealer;
  estudioLabel: string;
  operadoraBySlug: Record<string, OperadoraLabelRow>;
  onVer: () => void;
  /** Só operador com escopo de operadora definido. */
  onSolicitar?: () => void;
  /** Lista de solicitações do dealer (Central); ver permissão na página pai. */
  onHistoricoSolicitacoes?: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const fotosUrls = (dealer.fotos ?? []).filter((u): u is string => typeof u === "string" && u.length > 0);
  const operadoraSlug = (dealer.operadora_slug ?? "").trim();
  const operadoraRow = operadoraSlug ? operadoraBySlug[operadoraSlug] : undefined;

  return (
    <article
      aria-label={`Dealer: ${dealer.nickname}`}
      style={{
      background: brand.blockBg,
      border: `1px solid ${t.cardBorder}`,
      borderRadius: 18,
      overflow: "hidden",
      boxShadow: CARD_SHADOW(t.isDark),
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: 0,
    }}
    >
      {/* Área da foto */}
      <div style={{
        aspectRatio: DEALER_FOTO_ASPECT_RATIO,
        background: "linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 100%)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        {fotosUrls.length > 0 ? (
          <DealerFotoCarrossel urls={fotosUrls} alt={dealer.nickname} resetKey={dealer.id} />
        ) : (
          <div style={{ fontSize: 48, color: "rgba(255,255,255,0.2)", fontWeight: 800, fontFamily: FONT.body }}>
            {(dealer.nickname || "?")[0]?.toUpperCase()}
          </div>
        )}
        {/* Badges sobre a foto */}
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {dealer.status === "aprovado" && (
            <span style={{ background: BRAND.verde, color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: FONT.body }}>APROVADO</span>
          )}
          {dealer.status === "pendente" && (
            <span style={{ background: "#f59e0b", color: "#1a1a2e", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: FONT.body }}>PENDENTE</span>
          )}
          {dealer.vip && (
            <span style={{ background: BRAND.amarelo, color: "#1a1a2e", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: FONT.body, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Star size={10} aria-hidden /> VIP
            </span>
          )}
        </div>
        <div style={{ position: "absolute", bottom: 10, left: 10 }}>
          <span style={{ background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: FONT.body, textTransform: "uppercase" }}>
            {TURNO_OPTS.find((o) => o.value === dealer.turno)?.label ?? dealer.turno}
          </span>
        </div>
      </div>
      {/* Corpo do card: flex para empurrar género + ações para o fundo (alinhamento na grelha) */}
      <div
        style={{
          padding: "16px 18px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {dealer.nickname}
        </h3>
        <p style={{ margin: "4px 0 10px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          {dealer.nome_real}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, alignItems: "center", alignContent: "flex-start" }}>
          {(dealer.jogos ?? []).filter((j): j is DealerJogoCadastro => j !== "mesa_vip").map((j) => (
            <span key={j} style={estiloTagJogoDealer(j, t.isDark)}>
              {JOGOS_OPTS.find((o) => o.value === j)?.label ?? j}
            </span>
          ))}
        </div>
        {dealer.perfil_influencer ? (
          <p
            style={{
              fontSize: 12,
              color: t.textMuted,
              fontFamily: FONT.body,
              lineHeight: 1.4,
              margin: "0 0 12px",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {dealer.perfil_influencer}
          </p>
        ) : null}
        {/* Ocupa o espaço vertical restante para alinhar género e botões entre cards da mesma linha */}
        <div style={{ flex: 1, minHeight: 0 }} aria-hidden />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <span
            style={{
              background: "var(--brand-action-12, rgba(124,58,237,0.12))",
              color: "var(--brand-action, #7c3aed)",
              border: "1px solid var(--brand-action-border, rgba(124,58,237,0.28))",
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: FONT.body,
            }}
          >
            {GENERO_OPTS.find((o) => o.value === dealer.genero)?.label ?? dealer.genero}
          </span>
          {estudioLabel !== "—" ? (
            <span
              style={{
                background: "color-mix(in srgb, var(--brand-accent, #1e36f8) 12%, transparent)",
                color: "var(--brand-accent, #1e36f8)",
                border: "1px solid color-mix(in srgb, var(--brand-accent, #1e36f8) 28%, transparent)",
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: FONT.body,
              }}
            >
              {estudioLabel}
            </span>
          ) : null}
          {operadoraSlug ? (
            <OperadoraTag
              label={labelOperadoraFromSlug(operadoraSlug, operadoraBySlug)}
              corPrimaria={operadoraRow?.brand_action}
            />
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={onVer} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
            <Eye size={13} aria-hidden /> Ver
          </button>
          {onSolicitar ? (
            <button
              type="button"
              onClick={onSolicitar}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}
            >
              <Send size={13} aria-hidden /> Solicitar
            </button>
          ) : null}
          {onHistoricoSolicitacoes ? (
            <button
              type="button"
              onClick={onHistoricoSolicitacoes}
              aria-label={tooltipAcao("Histórico de solicitações")}
              title={tooltipAcao("Histórico de solicitações")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}
            >
              <History size={13} aria-hidden /> Histórico
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

// ─── Modal Histórico de solicitações (por dealer) ─────────────────────────────
interface SolicResumo {
  id: string;
  tipo: SolicitacaoTipo;
  status: SolicitacaoStatus;
  titulo: string | null;
  created_at: string;
  aguarda_resposta_de: string | null;
  operadora_slug: string;
  operadoras: { nome: string; brand_action: string | null } | { nome: string; brand_action: string | null }[] | null;
}

function operadoraEmbFromSolicitacao(
  emb: SolicResumo["operadoras"],
): { nome: string; brand_action: string | null } | null {
  if (emb == null) return null;
  const row = Array.isArray(emb) ? emb[0] : emb;
  if (!row?.nome?.trim()) return null;
  return row;
}

function ModalHistoricoSolicitacoesDealer({
  dealer,
  operadoraBySlug,
  slugSolicitacaoFiltro,
  onClose,
  onAbrirThread,
}: {
  dealer: Dealer;
  operadoraBySlug: Record<string, OperadoraLabelRow>;
  /** Operador: restringe à operadora; gestor/admin: null = todas as solicitações do dealer. */
  slugSolicitacaoFiltro: string | null;
  onClose: () => void;
  onAbrirThread: (solicitacaoId: string) => void;
}) {
  const { theme: t } = useApp();
  const [solicitacoes, setSolicitacoes] = useState<SolicResumo[]>([]);
  const [solLoading, setSolLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setSolLoading(true);
    void (async () => {
      let q = supabase
        .from("dealer_solicitacoes")
        .select("id, tipo, status, titulo, created_at, aguarda_resposta_de, operadora_slug, operadoras(nome, brand_action)")
        .eq("dealer_id", dealer.id)
        .order("created_at", { ascending: false })
        .limit(150);
      if (slugSolicitacaoFiltro) q = q.eq("operadora_slug", slugSolicitacaoFiltro);
      const { data } = await q;
      if (!cancel) {
        setSolicitacoes((data ?? []) as SolicResumo[]);
        setSolLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [dealer.id, slugSolicitacaoFiltro]);

  return (
    <ModalBase onClose={onClose} maxWidth={520} zIndex={1050}>
      <ModalHeader title={`Solicitações · ${dealer.nickname}`} onClose={onClose} />
      <p style={{ margin: "0 0 14px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
        Todas as solicitações ligadas a este dealer{slugSolicitacaoFiltro ? " na sua operadora" : ""}.
      </p>
      {solLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
        </div>
      ) : solicitacoes.length === 0 ? (
        <span style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Nenhuma solicitação registrada.</span>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: "min(60vh, 420px)",
            overflowY: "auto",
          }}
        >
          {solicitacoes.map((s) => {
            const cor = corStatusSolicitacao(s.status);
            const opJoin = operadoraEmbFromSolicitacao(s.operadoras);
            const opRow = operadoraBySlug[s.operadora_slug];
            const opLabel = opJoin?.nome?.trim() || labelOperadoraFromSlug(s.operadora_slug, operadoraBySlug);
            const opCor = opJoin?.brand_action ?? opRow?.brand_action;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onAbrirThread(s.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg ?? t.cardBg,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{s.titulo ?? s.id}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: `${cor}22`,
                        color: cor,
                        border: `1px solid ${cor}44`,
                      }}
                    >
                      {s.status}
                    </span>
                    <span style={{ fontSize: 11, color: t.textMuted }}>
                      {new Date(s.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                    {!slugSolicitacaoFiltro ? (
                      <span style={{ fontSize: 11, color: t.textMuted }}>
                        <OperadoraTag label={opLabel} corPrimaria={opCor} />
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div style={{ marginTop: 18 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: "transparent",
            color: t.text,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Fechar
        </button>
      </div>
    </ModalBase>
  );
}

// ─── Modal Ver ────────────────────────────────────────────────────────────────
function ModalVer({
  dealer,
  estudioLabel,
  operadoraBySlug,
  onClose,
}: {
  dealer: Dealer;
  estudioLabel: string;
  operadoraBySlug: Record<string, OperadoraLabelRow>;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const fotosUrls = (dealer.fotos ?? []).filter((u): u is string => typeof u === "string" && u.length > 0);
  const operadoraSlug = (dealer.operadora_slug ?? "").trim();
  const operadoraRow = operadoraSlug ? operadoraBySlug[operadoraSlug] : undefined;

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title={dealer.nickname} onClose={onClose} />
      {fotosUrls.length > 0 ? (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 20, aspectRatio: DEALER_FOTO_ASPECT_RATIO }}>
          <DealerFotoCarrossel urls={fotosUrls} alt={dealer.nickname} resetKey={dealer.id} />
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT.body }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Nome Real</span>
          <br />
          <span style={{ fontSize: 14, color: t.text }}>{dealer.nome_real}</span>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Gênero</span>
          <br />
          <span style={{ fontSize: 14, color: t.text }}>{GENERO_OPTS.find((o) => o.value === dealer.genero)?.label}</span>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Turno</span>
          <br />
          <span style={{ fontSize: 14, color: t.text }}>{TURNO_OPTS.find((o) => o.value === dealer.turno)?.label}</span>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Jogos</span>
          <br />
          <span style={{ fontSize: 14, color: t.text }}>
            {(dealer.jogos ?? [])
              .filter((j): j is DealerJogoCadastro => j !== "mesa_vip")
              .map((j) => JOGOS_OPTS.find((o) => o.value === j)?.label)
              .filter(Boolean)
              .join(", ") || "—"}
          </span>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Estúdio</span>
          <br />
          <span style={{ fontSize: 14, color: t.text }}>{estudioLabel}</span>
        </div>
        {operadoraSlug ? (
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Operadora</span>
            <br />
            <OperadoraTag
              label={labelOperadoraFromSlug(operadoraSlug, operadoraBySlug)}
              corPrimaria={operadoraRow?.brand_action}
            />
          </div>
        ) : null}
        {dealer.perfil_influencer && (
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>Bio do Dealer</span>
            <br />
            <span style={{ fontSize: 14, color: t.text, whiteSpace: "pre-wrap" }}>{dealer.perfil_influencer}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: "transparent",
            color: t.text,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Fechar
        </button>
      </div>
    </ModalBase>
  );
}
