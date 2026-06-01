import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { LayoutList, Loader2, SlidersHorizontal } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { FiltroBarTabButton, onFiltroBarTabsKeyDown } from "../../../components/dashboard";
import { FILTRO_BAR_TAB_ICON_PROPS } from "../../../lib/filterBarStyles";
import { getPageContentBoxShadow } from "../../../lib/pageContentBoxStyles";
import { stripHtmlText } from "../../../lib/informativosWorkflow";
import { buildMesesCarrossel, itemNoMesCarrossel, type MesCarrosselEntry } from "../PortalRh/portalRhCarrossel";
import { InformativosBlocoFiltros } from "./InformativosBlocoFiltros";
import { InformativoCard } from "./InformativoCard";
import {
  GerenciamentoInformativos,
  GerenciamentoInformativosFiltroStatus,
} from "./GerenciamentoInformativos";
import type { InformativoStatus } from "../../../lib/informativosWorkflow";

type AbaInformativos = "informativos" | "gerenciamento";

const ERRO_CARREGAR = "Não foi possível carregar os informativos. Se o problema persistir, contate o suporte.";

function tabsInformativosKeys(canEditarOk: boolean): AbaInformativos[] {
  const keys: AbaInformativos[] = ["informativos"];
  if (canEditarOk) keys.push("gerenciamento");
  return keys;
}

function onInformativosTabsKeyDown(
  e: KeyboardEvent,
  abaAtiva: AbaInformativos,
  setAba: (key: AbaInformativos) => void,
  canEditarOk: boolean,
) {
  const tabs = tabsInformativosKeys(canEditarOk);
  onFiltroBarTabsKeyDown(e, tabs, setAba, (k) => `tab-informativos-${k}`);
}

export default function InformativosPage() {
  const { theme: t } = useApp();
  const perm = usePermission("informativos");

  const [aba, setAba] = useRouteTab("informativos", "informativos", ["informativos", "gerenciamento"] as const);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [lista, setLista] = useState<
    {
      id: string;
      assunto: string;
      descricao: string;
      perfis: string[];
      published_at: string | null;
      created_by: string | null;
      published_by: string | null;
    }[]
  >([]);
  const [metaAutores, setMetaAutores] = useState<Record<string, string>>({});

  const [busca, setBusca] = useState("");
  const [buscaDeb, setBuscaDeb] = useState("");
  const [modoHistorico, setModoHistorico] = useState(false);
  const [mesesCarrossel, setMesesCarrossel] = useState<MesCarrosselEntry[]>([]);
  const [idxMes, setIdxMes] = useState(0);
  const [mesesGer, setMesesGer] = useState<MesCarrosselEntry[]>([]);
  const [idxMesGer, setIdxMesGer] = useState(0);
  const [filtroStatusGer, setFiltroStatusGer] = useState<"todos" | InformativoStatus>("todos");

  const abrirCriarGerenciamentoRef = useRef<(() => void) | null>(null);

  const cardShadow = getPageContentBoxShadow(t.isDark);

  const filtroCarrossel = useMemo(() => {
    const meses = aba === "gerenciamento" ? mesesGer : mesesCarrossel;
    const idx = aba === "gerenciamento" ? idxMesGer : idxMes;
    const setIdx = aba === "gerenciamento" ? setIdxMesGer : setIdxMes;
    return { meses, idx, setIdx };
  }, [aba, mesesCarrossel, idxMes, mesesGer, idxMesGer]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase
      .from("conteudo_informativo")
      .select("id, assunto, descricao, perfis, published_at, created_by, published_by, status")
      .eq("status", "publicado")
      .order("published_at", { ascending: false });

    if (error) {
      console.error("[Informativos] carregar:", error);
      setErro(ERRO_CARREGAR);
      setLista([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as typeof lista;
    setLista(rows);
    setMesesCarrossel(buildMesesCarrossel(rows.map((r) => ({ iso: r.published_at }))));

    const userIds = new Set<string>();
    for (const r of rows) {
      const uid = r.created_by ?? r.published_by;
      if (uid) userIds.add(uid);
    }
    const nomes: Record<string, string> = {};
    if (userIds.size > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", [...userIds]);
      for (const p of profs ?? []) {
        const pr = p as { id: string; name: string | null };
        nomes[pr.id] = pr.name ?? "";
      }
    }
    setMetaAutores(nomes);
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setBuscaDeb(busca), 300);
    return () => window.clearTimeout(id);
  }, [busca]);

  useEffect(() => {
    if (perm.canView !== "nao" && !perm.loading) void carregar();
  }, [perm.canView, perm.loading, carregar]);

  const listaFiltrada = useMemo(() => {
    const mes = mesesCarrossel[idxMes];
    const q = buscaDeb.trim().toLowerCase();
    return lista.filter((item) => {
      if (!modoHistorico && mes && !itemNoMesCarrossel(item.published_at, mes)) return false;
      if (q) {
        const texto = `${item.assunto} ${stripHtmlText(item.descricao)}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [lista, mesesCarrossel, idxMes, modoHistorico, buscaDeb]);

  const handleRegisterAbrirCriar = useCallback((fn: () => void) => {
    abrirCriarGerenciamentoRef.current = fn;
  }, []);

  const handleMesesGerChange = useCallback((meses: MesCarrosselEntry[]) => {
    setMesesGer(meses);
    setIdxMesGer((i) => Math.min(i, Math.max(0, meses.length - 1)));
  }, []);

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ background: t.bg, fontFamily: FONT.body, color: t.textMuted }}>
        <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ display: "block", margin: "48px auto" }} />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, background: t.bg }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body, paddingBottom: 32 }}>
      <PageHeader
        icon={<PageMenuIcon pageKey="informativos" />}
        title={getPageMenuLabel("informativos")}
        subtitle="Comunicados e avisos para a Home de cada Perfil"
      />

      <InformativosBlocoFiltros
        meses={filtroCarrossel.meses}
        idxMes={filtroCarrossel.idx}
        onIdxMesChange={filtroCarrossel.setIdx}
        modoHistorico={modoHistorico}
        onModoHistoricoChange={setModoHistorico}
        busca={busca}
        onBuscaChange={setBusca}
        linhaAbas={
          <div
            role="tablist"
            aria-label="Seções de informativos"
            style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
            onKeyDown={(e) => onInformativosTabsKeyDown(e, aba, setAba, perm.canEditarOk)}
          >
            <FiltroBarTabButton
              id="tab-informativos-informativos"
              active={aba === "informativos"}
              aria-controls="panel-informativos-informativos"
              onClick={() => setAba("informativos")}
              icon={<LayoutList {...FILTRO_BAR_TAB_ICON_PROPS} />}
            >
              Informativos
            </FiltroBarTabButton>
            {perm.canEditarOk ? (
              <FiltroBarTabButton
                id="tab-informativos-gerenciamento"
                active={aba === "gerenciamento"}
                aria-controls="panel-informativos-gerenciamento"
                onClick={() => setAba("gerenciamento")}
                icon={<SlidersHorizontal {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                Gerenciamento de Informativos
              </FiltroBarTabButton>
            ) : null}
          </div>
        }
        filtroStatusGerenciamento={
          aba === "gerenciamento" && perm.canEditarOk ? (
            <GerenciamentoInformativosFiltroStatus filtroStatus={filtroStatusGer} onFiltroStatusChange={setFiltroStatusGer} />
          ) : undefined
        }
        linhaAposSubabas={
          aba === "gerenciamento" && perm.canEditarOk && perm.canCriarOk ? (
            <CtaCriarButton type="button" onClick={() => abrirCriarGerenciamentoRef.current?.()}>
              Novo Informativo
            </CtaCriarButton>
          ) : undefined
        }
      />

      {erro ? (
        <div role="alert" style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: "rgba(232,64,37,0.12)", color: "#e84025", fontSize: 13 }}>
          {erro}
        </div>
      ) : null}

      {aba === "gerenciamento" && perm.canEditarOk ? (
        <GerenciamentoInformativos
          onDadosAlterados={() => void carregar()}
          buscaDeb={buscaDeb}
          modoHistorico={modoHistorico}
          idxMes={idxMesGer}
          mesesDisponiveis={mesesGer}
          filtroStatus={filtroStatusGer}
          onMesesCarrosselChange={handleMesesGerChange}
          onRegisterAbrirCriar={handleRegisterAbrirCriar}
        />
      ) : loading ? (
        <div style={{ textAlign: "center", padding: 40, color: t.textMuted }}>
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ verticalAlign: "middle", marginRight: 8 }} />
          Carregando…
        </div>
      ) : (
        <div
          role="tabpanel"
          id="panel-informativos-informativos"
          aria-labelledby="tab-informativos-informativos"
          tabIndex={0}
          style={{ marginTop: 4 }}
        >
          {listaFiltrada.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              {buscaDeb ? "Nenhum resultado para os termos pesquisados." : "Sem dados para o período selecionado."}
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {listaFiltrada.map((item) => {
                const autorId = item.created_by ?? item.published_by;
                return (
                  <li key={item.id}>
                    <InformativoCard
                      assunto={item.assunto}
                      descricao={item.descricao}
                      perfis={item.perfis ?? []}
                      dataPublicacao={item.published_at}
                      autorNome={autorId ? (metaAutores[autorId] ?? "") : ""}
                      cardShadow={cardShadow}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
