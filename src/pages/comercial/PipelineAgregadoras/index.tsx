import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Handshake,
  LayoutList,
  Link2,
  Loader2,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { FiltroBarCampoSelect } from "../../../components/FiltroBarCampoSelect";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
  SectionTitle,
  type SortDir,
} from "../../../components/dashboard";
import {
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
} from "../../../lib/pageContentBoxStyles";
import { ConsolidadoAgregadoras } from "./ConsolidadoAgregadoras";
import { AgregadorasTable } from "./AgregadorasTable";
import { ModalCadastrarAgregadora } from "./ModalCadastrarAgregadora";
import { ModalVerAgregadora } from "./ModalVerAgregadora";
import { ModalHistoricoAgregadora } from "./ModalHistoricoAgregadora";
import {
  AGREGADORA_TABS,
  AGREGADORA_TAB_LABEL,
  COMERCIAL_FILTRO_ARIA,
  COMERCIAL_FILTRO_TODOS,
  COMERCIAL_FILTRO_TODOS_LABEL,
  PIPELINE_COMERCIAL_NOMES,
  STATUS_PIPELINE_AGREGADORA_LABEL,
  type AgregadoraTab,
  type StatusPipelineAgregadora,
  type TableColAgregadora,
} from "./constants";
import type { AgregadoraRow, ComercialOpcao } from "./types";
import {
  buildComercialFiltroExtraOptions,
  buildPipelineComerciais,
  filterAgregadoras,
  pipelineComercialNomePorId,
  sortAgregadoras,
} from "./helpers";

const TAB_ICONS: Record<AgregadoraTab, ReactNode> = {
  todos: <LayoutList {...FILTRO_BAR_TAB_ICON_PROPS} />,
  conexao: <Link2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
  negociacao: <Handshake {...FILTRO_BAR_TAB_ICON_PROPS} />,
  fechado: <BadgeCheck {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

function mapRow(
  raw: Record<string, unknown>,
  comercialNames: Record<string, string>,
): AgregadoraRow {
  const comercialId = raw.comercial_user_id ? String(raw.comercial_user_id) : null;
  const rawComercialNome = comercialId ? comercialNames[comercialId] ?? null : null;
  const comercialNomeCanonico =
    rawComercialNome &&
    (PIPELINE_COMERCIAL_NOMES as readonly string[]).includes(rawComercialNome)
      ? rawComercialNome
      : null;

  return {
    id: String(raw.id),
    nome: String(raw.nome ?? ""),
    site: String(raw.site ?? ""),
    jogos: raw.jogos == null ? null : Number(raw.jogos),
    status_pipeline: raw.status_pipeline as StatusPipelineAgregadora,
    comercial_user_id: comercialId,
    comercial_nome: comercialNomeCanonico,
    ultimo_contato: raw.ultimo_contato ? String(raw.ultimo_contato) : null,
  };
}

export default function PipelineAgregadoras() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("comercial_pipeline_agregadoras");

  const [tab, setTab] = useRouteTab(
    "comercial_pipeline_agregadoras",
    "todos",
    AGREGADORA_TABS,
  );
  const [busca, setBusca] = useState("");
  const [comercialFiltro, setComercialFiltro] = useState(COMERCIAL_FILTRO_TODOS);
  const [kpiStatus, setKpiStatus] = useState<StatusPipelineAgregadora | null>(null);
  const [rows, setRows] = useState<AgregadoraRow[]>([]);
  const [comerciais, setComerciais] = useState<ComercialOpcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ col: TableColAgregadora; dir: SortDir }>({
    col: "nome",
    dir: "asc",
  });

  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [verRow, setVerRow] = useState<AgregadoraRow | null>(null);
  const [historicoRow, setHistoricoRow] = useState<AgregadoraRow | null>(null);

  const pageBox = getPageContentBoxStyle(brand, t);
  const filterBox = getPageFilterBoxStyle(brand, t);

  const loadData = useCallback(async (opts?: { showLoading?: boolean }) => {
    const showLoading = opts?.showLoading !== false;
    if (showLoading) setLoading(true);
    const [aggRes, gestoresRes] = await Promise.all([
      supabase
        .from("comercial_agregadoras")
        .select(
          "id, nome, site, jogos, status_pipeline, comercial_user_id, ultimo_contato",
        )
        .order("nome")
        .limit(500),
      supabase
        .from("profiles")
        .select("id, name")
        .in("name", [...PIPELINE_COMERCIAL_NOMES])
        .or("ativo.is.null,ativo.eq.true"),
    ]);

    if (aggRes.error) console.error(aggRes.error);
    if (gestoresRes.error) console.error(gestoresRes.error);

    const comercialList = buildPipelineComerciais(gestoresRes.data ?? []);
    setComerciais(comercialList);

    const names = Object.fromEntries(
      comercialList.flatMap((c) => (c.id ? [[c.id, c.name] as const] : [])),
    );
    setRows((aggRes.data ?? []).map((r) => mapRow(r as Record<string, unknown>, names)));
    if (showLoading) setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const kpiBase = useMemo(
    () => filterAgregadoras(rows, "todos", busca, comercialFiltro, null),
    [rows, busca, comercialFiltro],
  );

  const tableRows = useMemo(() => {
    const filtered = filterAgregadoras(rows, tab, busca, comercialFiltro, kpiStatus);
    return sortAgregadoras(filtered, sort.col, sort.dir);
  }, [rows, tab, busca, comercialFiltro, kpiStatus, sort]);

  async function insertHistorico(
    agregadoraId: string,
    campo: string,
    valorAnterior: string | null,
    valorNovo: string | null,
  ) {
    await supabase.from("comercial_agregadora_historico").insert({
      agregadora_id: agregadoraId,
      campo,
      valor_anterior: valorAnterior,
      valor_novo: valorNovo,
      usuario_id: user?.id ?? null,
    });
  }

  async function handleCreate(payload: {
    nome: string;
    site: string;
    jogos: number | null;
    comercial_user_id: string;
  }): Promise<string | null> {
    const { data, error } = await supabase
      .from("comercial_agregadoras")
      .insert({
        nome: payload.nome,
        site: payload.site,
        jogos: payload.jogos,
        comercial_user_id: payload.comercial_user_id,
        status_pipeline: "conexao",
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      if (error.code === "23505") {
        return "Já existe uma agregadora com este nome.";
      }
      return "Não foi possível cadastrar a agregadora. Se o problema persistir, entre em contato com o suporte.";
    }

    const comercialNome =
      pipelineComercialNomePorId(payload.comercial_user_id, comerciais) ?? "—";
    await insertHistorico(data.id, "status_pipeline", null, "conexao");
    await insertHistorico(data.id, "comercial_user_id", null, comercialNome);

    await loadData({ showLoading: false });
    setTab("conexao");
    return null;
  }

  async function updateStatus(row: AgregadoraRow, status: StatusPipelineAgregadora) {
    if (!perm.canEditarOk || row.status_pipeline === status) return;
    const anterior = row.status_pipeline;
    const { error } = await supabase
      .from("comercial_agregadoras")
      .update({ status_pipeline: status })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(
      row.id,
      "status_pipeline",
      STATUS_PIPELINE_AGREGADORA_LABEL[anterior],
      STATUS_PIPELINE_AGREGADORA_LABEL[status],
    );
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status_pipeline: status } : r)),
    );
    setVerRow((v) => (v?.id === row.id ? { ...v, status_pipeline: status } : v));
  }

  async function updateComercial(row: AgregadoraRow, userId: string | null) {
    if (!perm.canEditarOk) return;
    const anterior = row.comercial_user_id;
    if ((anterior ?? null) === (userId ?? null)) return;
    const { error } = await supabase
      .from("comercial_agregadoras")
      .update({ comercial_user_id: userId })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    const nomeNovo = pipelineComercialNomePorId(userId, comerciais);
    await insertHistorico(
      row.id,
      "comercial_user_id",
      pipelineComercialNomePorId(anterior, comerciais) ?? "—",
      nomeNovo ?? "—",
    );
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, comercial_user_id: userId, comercial_nome: nomeNovo }
          : r,
      ),
    );
    setVerRow((v) =>
      v?.id === row.id
        ? { ...v, comercial_user_id: userId, comercial_nome: nomeNovo }
        : v,
    );
  }

  async function updateJogos(row: AgregadoraRow, jogos: number | null) {
    if (!perm.canEditarOk) return;
    if ((row.jogos ?? null) === (jogos ?? null)) return;
    const anterior = row.jogos;
    const { error } = await supabase
      .from("comercial_agregadoras")
      .update({ jogos })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(
      row.id,
      "jogos",
      anterior == null ? null : String(anterior),
      jogos == null ? null : String(jogos),
    );
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, jogos } : r)));
    setVerRow((v) => (v?.id === row.id ? { ...v, jogos } : v));
  }

  async function updateUltimoContato(row: AgregadoraRow, iso: string | null) {
    if (!perm.canEditarOk) return;
    const anterior = row.ultimo_contato;
    if ((anterior ?? null) === (iso ?? null)) return;
    const { error } = await supabase
      .from("comercial_agregadoras")
      .update({ ultimo_contato: iso })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(row.id, "ultimo_contato", anterior, iso);
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, ultimo_contato: iso } : r)),
    );
    setVerRow((v) => (v?.id === row.id ? { ...v, ultimo_contato: iso } : v));
  }

  function toggleSort(col: TableColAgregadora) {
    setSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" },
    );
  }

  function handleKpiClick(status: StatusPipelineAgregadora | null) {
    setKpiStatus(status);
    if (!status) return;
    if (status === "disponiveis") {
      setTab("todos");
      return;
    }
    setTab(status);
  }

  function handleTabClick(next: AgregadoraTab) {
    setKpiStatus(null);
    setTab(next);
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div className="app-page-shell app-page-shell--pb64">
      <PageHeader
        icon={<PageMenuIcon pageKey="comercial_pipeline_agregadoras" />}
        title={getPageMenuLabel("comercial_pipeline_agregadoras")}
        subtitle="Organize agregadoras de jogos e oportunidades comerciais no funil B2B."
      />

      <div style={filterBox}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            marginBottom: 10,
          }}
        >
          <BarraPesquisaPagina
            value={busca}
            onChange={setBusca}
            placeholder={PAGE_SEARCH.pipelineAgregadoras}
            aria-label="Buscar por nome ou site da agregadora"
            wrapperStyle={{ flex: 1, minWidth: 240, maxWidth: 560 }}
          />
          <FiltroBarCampoSelect
            value={comercialFiltro}
            onChange={setComercialFiltro}
            icon={FilterBarIcons.influencer}
            ariaLabel={COMERCIAL_FILTRO_ARIA}
            todasValue={COMERCIAL_FILTRO_TODOS}
            todasLabel={COMERCIAL_FILTRO_TODOS_LABEL}
            extraOptions={buildComercialFiltroExtraOptions(comerciais)}
            options={[]}
            minWidth={200}
          />
        </div>
        <div className="app-filter-bar-tabs-cta">
          <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
          <div
            className="app-filter-bar-tabs-cta__tabs"
            role="tablist"
            aria-label="Abas do pipeline de agregadoras"
            onKeyDown={(e) =>
              onFiltroBarTabsKeyDown(e, AGREGADORA_TABS, handleTabClick, (k) => `tab-agregadoras-${k}`)
            }
          >
            {AGREGADORA_TABS.map((tb) => (
              <FiltroBarTabButton
                key={tb}
                id={`tab-agregadoras-${tb}`}
                active={tab === tb}
                aria-controls={`panel-agregadoras-${tb}`}
                onClick={() => handleTabClick(tb)}
                icon={TAB_ICONS[tb]}
              >
                {AGREGADORA_TAB_LABEL[tb]}
              </FiltroBarTabButton>
            ))}
          </div>
          <div className="app-filter-bar-tabs-cta__actions">
            <AjudaContextualAcoes pageKey="comercial_pipeline_agregadoras" />
          </div>
        </div>
      </div>

      <div style={pageBox}>
        <SectionTitle sub="Totais por status do funil">KPIs Consolidados</SectionTitle>
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px 0",
              color: t.textMuted,
              fontSize: 13,
              fontFamily: FONT.body,
              gap: 8,
            }}
          >
            <Loader2 size={16} className="app-lucide-spin" aria-hidden />
            Carregando…
          </div>
        ) : (
          <ConsolidadoAgregadoras
            rows={kpiBase}
            kpiStatus={kpiStatus}
            onKpiClick={handleKpiClick}
            t={t}
          />
        )}
      </div>

      <div style={pageBox}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SectionTitle sub="Catálogo de prospecção">Agregadoras</SectionTitle>
          {perm.canCriarOk ? (
            <CtaCriarButton onClick={() => setMostrarCadastro(true)}>
              Cadastrar
            </CtaCriarButton>
          ) : null}
        </div>

        {loading ? (
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              color: t.textMuted,
              fontSize: 13,
              fontFamily: FONT.body,
            }}
          >
            Carregando…
          </div>
        ) : (
          <AgregadorasTable
            rows={tableRows}
            comerciais={comerciais}
            sort={sort}
            onSort={toggleSort}
            canEditar={perm.canEditarOk}
            onVer={setVerRow}
            onHistorico={setHistoricoRow}
            onUpdateStatus={updateStatus}
            onUpdateComercial={updateComercial}
            onUpdateJogos={updateJogos}
            onUpdateUltimoContato={updateUltimoContato}
            t={t}
          />
        )}
      </div>

      {mostrarCadastro ? (
        <ModalCadastrarAgregadora
          onClose={() => setMostrarCadastro(false)}
          onCreated={handleCreate}
          comerciais={comerciais}
          canCriar={perm.canCriarOk}
        />
      ) : null}

      {verRow ? (
        <ModalVerAgregadora agregadora={verRow} onClose={() => setVerRow(null)} />
      ) : null}

      {historicoRow ? (
        <ModalHistoricoAgregadora
          agregadora={historicoRow}
          onClose={() => setHistoricoRow(null)}
        />
      ) : null}
    </div>
  );
}
