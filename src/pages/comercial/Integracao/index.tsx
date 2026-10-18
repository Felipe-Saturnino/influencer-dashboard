import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  CircleDashed,
  LayoutList,
  Loader2,
  Loader,
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
import { TabelaComPaginacao } from "../../../components/TabelaPaginacaoBar";
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
import { ConsolidadoIntegracao } from "./ConsolidadoIntegracao";
import { IntegracaoTable } from "./IntegracaoTable";
import { ModalNovaIntegracao } from "./ModalNovaIntegracao";
import { ModalHistoricoIntegracao } from "./ModalHistoricoIntegracao";
import { ModalComentarIntegracao } from "./ModalComentarIntegracao";
import { ModalVerMarca } from "../PipelineB2B/ModalVerMarca";
import {
  mapPipelineMarcaFromDb,
  PIPELINE_MARCA_SELECT_EMBED,
} from "../PipelineB2B/helpers";
import type { PipelineMarcaRow } from "../PipelineB2B/types";
import {
  INTEGRACAO_TABS,
  INTEGRACAO_TAB_LABEL,
  PRIORIDADE_FILTRO_ARIA,
  PRIORIDADE_FILTRO_TODAS,
  PRIORIDADE_FILTRO_TODAS_LABEL,
  PRIORIDADE_LABEL,
  PRIORIDADE_ORDEM,
  STATUS_INTEGRACAO_LABEL,
  TIPO_INTEGRACAO_LABEL,
  type IntegracaoTab,
  type PrioridadeIntegracao,
  type StatusIntegracao,
  type TableColIntegracao,
  type TipoIntegracao,
} from "./constants";
import type { IntegracaoRow, MarcaFechadaOpcao } from "./types";
import { filterIntegracoes, sortIntegracoes } from "./helpers";
import { fetchAllPages } from "../../../lib/supabasePaginate";

const MSG_ERRO_CARREGAR =
  "Não foi possível carregar as integrações. Se o problema persistir, entre em contato com o suporte.";

const TAB_ICONS: Record<IntegracaoTab, ReactNode> = {
  todos: <LayoutList {...FILTRO_BAR_TAB_ICON_PROPS} />,
  nao_iniciados: <CircleDashed {...FILTRO_BAR_TAB_ICON_PROPS} />,
  em_andamento: <Loader {...FILTRO_BAR_TAB_ICON_PROPS} />,
  concluidos: <BadgeCheck {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

function mapRow(raw: Record<string, unknown>): IntegracaoRow {
  return {
    id: String(raw.id),
    marca_id: String(raw.marca_id),
    operador_nome: String(raw.operador_nome ?? ""),
    prioridade: raw.prioridade as PrioridadeIntegracao,
    tipo: raw.tipo as TipoIntegracao,
    caminho: raw.caminho ? String(raw.caminho) : null,
    pam: raw.pam ? String(raw.pam) : null,
    agregadora: raw.agregadora ? String(raw.agregadora) : null,
    status: raw.status as StatusIntegracao,
    comentario: raw.comentario ? String(raw.comentario) : null,
  };
}

export default function Integracao() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("comercial_integracao");

  const [tab, setTab] = useRouteTab("comercial_integracao", "todos", INTEGRACAO_TABS);
  const [busca, setBusca] = useState("");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState(PRIORIDADE_FILTRO_TODAS);
  const [kpiStatus, setKpiStatus] = useState<StatusIntegracao | null>(null);
  const [rows, setRows] = useState<IntegracaoRow[]>([]);
  const [agregadoraOpcoes, setAgregadoraOpcoes] = useState<string[]>([]);
  const [marcasFechadas, setMarcasFechadas] = useState<MarcaFechadaOpcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ col: TableColIntegracao; dir: SortDir }>({
    col: "status",
    dir: "asc",
  });

  const [mostrarNova, setMostrarNova] = useState(false);
  const [historicoRow, setHistoricoRow] = useState<IntegracaoRow | null>(null);
  const [comentarRow, setComentarRow] = useState<IntegracaoRow | null>(null);
  const [verMarca, setVerMarca] = useState<PipelineMarcaRow | null>(null);
  const [marcasVerCache, setMarcasVerCache] = useState<PipelineMarcaRow[]>([]);
  const [carregandoVer, setCarregandoVer] = useState(false);

  const pageBox = getPageContentBoxStyle(brand, t);
  const filterBox = getPageFilterBoxStyle(brand, t);

  const loadData = useCallback(async (opts?: { showLoading?: boolean }) => {
    const showLoading = opts?.showLoading !== false;
    if (showLoading) setLoading(true);
    setLoadError(null);

    try {
      const [intRows, aggRows, prodRows] = await Promise.all([
        fetchAllPages<Record<string, unknown>>(async (from, to) =>
          supabase
            .from("comercial_integracoes")
            .select(
              "id, marca_id, operador_nome, prioridade, tipo, caminho, pam, agregadora, status, comentario",
            )
            .order("operador_nome")
            .order("id")
            .range(from, to),
        ),
        fetchAllPages<{ nome: string }>(async (from, to) =>
          supabase
            .from("comercial_agregadoras")
            .select("id, nome")
            .order("nome")
            .order("id")
            .range(from, to),
        ),
        fetchAllPages<Record<string, unknown>>(async (from, to) =>
          supabase
            .from("comercial_marca_produtos")
            .select("marca_id, produto, status_produto, marca:comercial_marcas(id, nome)")
            .in("status_produto", ["contrato_assinado", "ativo"])
            .order("marca_id")
            .order("produto")
            .range(from, to),
        ),
      ]);

      setRows(intRows.map((r) => mapRow(r)));
      setAgregadoraOpcoes(
        aggRows
          .map((r) => String(r.nome ?? "").trim())
          .filter(Boolean),
      );

      const byMarca = new Map<string, MarcaFechadaOpcao>();
      for (const raw of prodRows) {
        const marcaEmbed = (raw as { marca?: unknown }).marca;
        const marcaObj = Array.isArray(marcaEmbed) ? marcaEmbed[0] : marcaEmbed;
        if (!marcaObj || typeof marcaObj !== "object") continue;
        const m = marcaObj as { id?: string; nome?: string };
        const id = String(m.id ?? raw.marca_id ?? "");
        const nome = String(m.nome ?? "").trim();
        if (!id || !nome) continue;
        if (!byMarca.has(id)) byMarca.set(id, { id, nome });
      }
      setMarcasFechadas(
        [...byMarca.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      );
    } catch (e: unknown) {
      console.error("[Integracao] loadData:", e);
      setRows([]);
      setAgregadoraOpcoes([]);
      setMarcasFechadas([]);
      setLoadError(MSG_ERRO_CARREGAR);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const kpiBase = useMemo(
    () => filterIntegracoes(rows, "todos", busca, prioridadeFiltro, null),
    [rows, busca, prioridadeFiltro],
  );

  const tableRows = useMemo(() => {
    const filtered = filterIntegracoes(rows, tab, busca, prioridadeFiltro, kpiStatus);
    return sortIntegracoes(filtered, sort.col, sort.dir);
  }, [rows, tab, busca, prioridadeFiltro, kpiStatus, sort]);

  async function insertHistorico(
    integracaoId: string,
    campo: string,
    valorAnterior: string | null,
    valorNovo: string | null,
  ) {
    await supabase.from("comercial_integracao_historico").insert({
      integracao_id: integracaoId,
      campo,
      valor_anterior: valorAnterior,
      valor_novo: valorNovo,
      usuario_id: user?.id ?? null,
    });
  }

  async function handleCreate(payload: {
    marca_id: string;
    operador_nome: string;
    prioridade: PrioridadeIntegracao;
    tipo: TipoIntegracao;
    caminho: string;
    pam: string;
    agregadora: string;
  }): Promise<string | null> {
    const { data, error } = await supabase
      .from("comercial_integracoes")
      .insert({
        marca_id: payload.marca_id,
        operador_nome: payload.operador_nome,
        prioridade: payload.prioridade,
        tipo: payload.tipo,
        caminho: payload.caminho,
        pam: payload.pam,
        agregadora: payload.agregadora,
        status: "nao_iniciado",
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      return "Não foi possível criar a integração. Se o problema persistir, entre em contato com o suporte.";
    }

    await Promise.all([
      insertHistorico(data.id, "criado", null, "Não Iniciado"),
      insertHistorico(data.id, "prioridade", null, PRIORIDADE_LABEL[payload.prioridade]),
      insertHistorico(data.id, "tipo", null, TIPO_INTEGRACAO_LABEL[payload.tipo]),
    ]);
    await loadData({ showLoading: false });
    setTab("nao_iniciados");
    return null;
  }

  async function updatePrioridade(row: IntegracaoRow, prioridade: PrioridadeIntegracao) {
    if (!perm.canEditarOk || row.prioridade === prioridade) return;
    const anterior = row.prioridade;
    const { error } = await supabase
      .from("comercial_integracoes")
      .update({ prioridade })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(
      row.id,
      "prioridade",
      PRIORIDADE_LABEL[anterior],
      PRIORIDADE_LABEL[prioridade],
    );
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, prioridade } : r)));
  }

  async function updateStatus(row: IntegracaoRow, status: StatusIntegracao) {
    if (!perm.canEditarOk || row.status === status) return;
    const anterior = row.status;
    const { error } = await supabase
      .from("comercial_integracoes")
      .update({ status })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(
      row.id,
      "status",
      STATUS_INTEGRACAO_LABEL[anterior],
      STATUS_INTEGRACAO_LABEL[status],
    );
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
  }

  async function updateAgregadora(row: IntegracaoRow, agregadora: string | null) {
    if (!perm.canEditarOk) return;
    if ((row.agregadora ?? null) === (agregadora ?? null)) return;
    const anterior = row.agregadora;
    const { error } = await supabase
      .from("comercial_integracoes")
      .update({ agregadora })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(row.id, "agregadora", anterior, agregadora);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, agregadora } : r)));
  }

  async function updateCaminho(row: IntegracaoRow, caminho: string | null) {
    if (!perm.canEditarOk) return;
    if ((row.caminho ?? null) === (caminho ?? null)) return;
    const anterior = row.caminho;
    const { error } = await supabase
      .from("comercial_integracoes")
      .update({ caminho })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(row.id, "caminho", anterior, caminho);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, caminho } : r)));
  }

  async function updatePam(row: IntegracaoRow, pam: string | null) {
    if (!perm.canEditarOk) return;
    if ((row.pam ?? null) === (pam ?? null)) return;
    const anterior = row.pam;
    const { error } = await supabase
      .from("comercial_integracoes")
      .update({ pam })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(row.id, "pam", anterior, pam);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, pam } : r)));
  }

  async function handleComentar(comentario: string): Promise<string | null> {
    if (!comentarRow || !perm.canEditarOk) return "Sem permissão.";
    const anterior = comentarRow.comentario;
    const { error } = await supabase
      .from("comercial_integracoes")
      .update({ comentario })
      .eq("id", comentarRow.id);
    if (error) {
      console.error(error);
      return "Não foi possível salvar o comentário. Se o problema persistir, entre em contato com o suporte.";
    }
    await insertHistorico(comentarRow.id, "comentario", anterior, comentario);
    setRows((prev) =>
      prev.map((r) => (r.id === comentarRow.id ? { ...r, comentario } : r)),
    );
    return null;
  }

  async function openVerOperador(row: IntegracaoRow) {
    if (carregandoVer) return;
    const cached = marcasVerCache.find((m) => m.id === row.marca_id);
    if (cached) {
      setVerMarca(cached);
      return;
    }
    setCarregandoVer(true);
    try {
      const { data: alvoRaw, error: alvoErr } = await supabase
        .from("comercial_marcas")
        .select(PIPELINE_MARCA_SELECT_EMBED)
        .eq("id", row.marca_id)
        .maybeSingle();
      if (alvoErr) throw alvoErr;
      if (!alvoRaw) {
        setVerMarca(null);
        return;
      }
      const alvo = mapPipelineMarcaFromDb(alvoRaw as Record<string, unknown>);
      const empresaId = alvo.empresa.id;
      let siblings: PipelineMarcaRow[] = [alvo];
      if (empresaId) {
        const { data: sibRaw, error: sibErr } = await supabase
          .from("comercial_marcas")
          .select(PIPELINE_MARCA_SELECT_EMBED)
          .eq("empresa_id", empresaId)
          .order("nome");
        if (sibErr) throw sibErr;
        siblings = (sibRaw ?? []).map((r) => mapPipelineMarcaFromDb(r as Record<string, unknown>));
      }
      setMarcasVerCache((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m]));
        for (const m of siblings) byId.set(m.id, m);
        return [...byId.values()];
      });
      setVerMarca(siblings.find((m) => m.id === row.marca_id) ?? alvo);
    } catch (e: unknown) {
      console.error("[Integracao] openVerOperador:", e);
    } finally {
      setCarregandoVer(false);
    }
  }

  function toggleSort(col: TableColIntegracao) {
    setSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" },
    );
  }

  function handleKpiClick(status: StatusIntegracao | null) {
    setKpiStatus(status);
    if (!status) {
      setTab("todos");
      return;
    }
    if (status === "nao_iniciado") setTab("nao_iniciados");
    else if (status === "em_andamento") setTab("em_andamento");
    else if (status === "concluido") setTab("concluidos");
  }

  function handleTabClick(next: IntegracaoTab) {
    setKpiStatus(null);
    setTab(next);
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell app-page-shell--pb64">
      <PageHeader
        icon={<PageMenuIcon pageKey="comercial_integracao" />}
        title={getPageMenuLabel("comercial_integracao")}
        subtitle="Acompanhe a integração técnica das marcas com Contrato Assinado no Pipeline B2B."
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
            placeholder={PAGE_SEARCH.integracao}
            aria-label="Buscar por operador, caminho ou PAM"
            wrapperStyle={{ flex: 1, minWidth: 240, maxWidth: 560 }}
          />
          <FiltroBarCampoSelect
            value={prioridadeFiltro}
            onChange={setPrioridadeFiltro}
            icon={FilterBarIcons.status}
            ariaLabel={PRIORIDADE_FILTRO_ARIA}
            todasValue={PRIORIDADE_FILTRO_TODAS}
            todasLabel={PRIORIDADE_FILTRO_TODAS_LABEL}
            options={PRIORIDADE_ORDEM.map((p) => ({
              value: p,
              label: PRIORIDADE_LABEL[p],
            }))}
            minWidth={200}
          />
        </div>
        <div className="app-filter-bar-tabs-cta">
          <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
          <div
            className="app-filter-bar-tabs-cta__tabs"
            role="tablist"
            aria-label="Abas de integração"
            onKeyDown={(e) =>
              onFiltroBarTabsKeyDown(e, INTEGRACAO_TABS, handleTabClick, (k) => `tab-integracao-${k}`)
            }
          >
            {INTEGRACAO_TABS.map((tb) => (
              <FiltroBarTabButton
                key={tb}
                id={`tab-integracao-${tb}`}
                active={tab === tb}
                aria-controls={`panel-integracao-${tb}`}
                onClick={() => handleTabClick(tb)}
                icon={TAB_ICONS[tb]}
              >
                {INTEGRACAO_TAB_LABEL[tb]}
              </FiltroBarTabButton>
            ))}
          </div>
          <div className="app-filter-bar-tabs-cta__actions">
            <AjudaContextualAcoes pageKey="comercial_integracao" />
          </div>
        </div>
      </div>

      <div
        id={`panel-integracao-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-integracao-${tab}`}
        tabIndex={0}
      >
      {loadError ? (
        <div
          role="alert"
          aria-live="polite"
          style={pageBox}
        >
          <div style={{ padding: "40px 0", textAlign: "center", fontFamily: FONT.body }}>
            <p style={{ color: "#e84025", fontSize: 13, marginBottom: 12 }}>{loadError}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                color: t.text,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      ) : (
        <>
      <div style={pageBox}>
        <SectionTitle sub="Totais por status da integração">KPIs Consolidados</SectionTitle>
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
          <ConsolidadoIntegracao
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
          <SectionTitle sub="Marcas em integração técnica">Integrações</SectionTitle>
          {perm.canCriarOk ? (
            <CtaCriarButton onClick={() => setMostrarNova(true)}>Nova Integração</CtaCriarButton>
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
          <TabelaComPaginacao
            items={tableRows}
            t={t}
            resetKey={`${tab}|${busca}|${prioridadeFiltro}|${kpiStatus ?? ""}|${sort.col}|${sort.dir}`}
          >
            {(linhas, zebraIdx) => (
          <IntegracaoTable
            rows={linhas}
            zebraIdx={zebraIdx}
            agregadoraOpcoes={agregadoraOpcoes}
            sort={sort}
            onSort={toggleSort}
            canEditar={perm.canEditarOk}
            onVerOperador={(row) => void openVerOperador(row)}
            onHistorico={setHistoricoRow}
            onComentar={setComentarRow}
            onUpdatePrioridade={updatePrioridade}
            onUpdateStatus={updateStatus}
            onUpdateAgregadora={updateAgregadora}
            onUpdateCaminho={updateCaminho}
            onUpdatePam={updatePam}
            t={t}
          />
            )}
          </TabelaComPaginacao>
        )}
      </div>
        </>
      )}
      </div>

      {mostrarNova ? (
        <ModalNovaIntegracao
          onClose={() => setMostrarNova(false)}
          onCreated={handleCreate}
          marcas={marcasFechadas}
          agregadoraOpcoes={agregadoraOpcoes}
          canCriar={perm.canCriarOk}
        />
      ) : null}

      {historicoRow ? (
        <ModalHistoricoIntegracao row={historicoRow} onClose={() => setHistoricoRow(null)} />
      ) : null}

      {comentarRow ? (
        <ModalComentarIntegracao
          row={comentarRow}
          onClose={() => setComentarRow(null)}
          onSave={handleComentar}
          canEditar={perm.canEditarOk}
        />
      ) : null}

      {verMarca ? (
        <ModalVerMarca
          marca={verMarca}
          allMarcas={marcasVerCache}
          onClose={() => setVerMarca(null)}
          onOpenMarca={(m) => setVerMarca(m)}
          canEditar={false}
          onSavedDominio={async () => false}
        />
      ) : null}
    </div>
  );
}
