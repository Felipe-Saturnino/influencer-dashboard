import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Globe, Handshake, LayoutList, Link2, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { TabelaComPaginacao } from "../../../components/TabelaPaginacaoBar";
import { agruparContiguo } from "../../../lib/tablePagination";
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
import { getPageContentBoxStyle, getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { ConsolidadoPipeline } from "../PipelineB2B/ConsolidadoPipeline";
import { ModalRegistroMarca } from "../PipelineB2B/ModalRegistroMarca";
import { ModalVerMarca } from "../PipelineB2B/ModalVerMarca";
import { ModalContato } from "../PipelineB2B/ModalContato";
import {
  COMERCIAL_FILTRO_ARIA,
  COMERCIAL_FILTRO_TODOS,
  COMERCIAL_FILTRO_TODOS_LABEL,
  FOLHA_BY_PIPELINE,
  PIPELINE_COMERCIAL_NOMES,
  PIPELINE_TABS,
  PIPELINE_TAB_LABEL,
  STATUS_DOMINIO_LABEL,
  STATUS_PRODUTO_LABEL,
  STATUS_PRODUTO_ORDEM,
  TAB_TABLE_CONFIG,
  badgeProdutoStyle,
  type StatusPipeline,
  type StatusProduto,
} from "../PipelineB2B/constants";
import type { ComercialContato, ComercialOpcao } from "../PipelineB2B/types";
import {
  buildComercialFiltroExtraOptions,
  buildPipelineComerciais,
  defaultFolhaForPipeline,
  derivarStatusPipelinePorProdutos,
  filterMarcas,
  folhaDerivadaPorPipelineEProdutos,
  pipelineComercialNomePorId,
} from "../PipelineB2B/helpers";
import { CryptoTable } from "./CryptoTable";
import { ModalNovaMarca } from "./ModalNovaMarca";
import { CRYPTO_MARCA_SELECT, cnpjEhSolo, mapCryptoMarcaFromDb } from "./mapRow";
import type { CryptoMarcaRow, CryptoTableCol, PossuiCrypto } from "./types";

const MSG_ERRO_CARREGAR =
  "Não foi possível carregar o pipeline. Se o problema persistir, entre em contato com o suporte.";

const TAB_ICONS = {
  todos: <LayoutList {...FILTRO_BAR_TAB_ICON_PROPS} />,
  disponiveis: <Globe {...FILTRO_BAR_TAB_ICON_PROPS} />,
  conexao: <Link2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
  negociacao: <Handshake {...FILTRO_BAR_TAB_ICON_PROPS} />,
  fechado: <BadgeCheck {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

const CAMPO_LABELS: Record<string, string> = {
  ultima_comunicacao: "Última Comunicação",
  possui_crypto: "Possui Crypto",
  retorno: "Retorno",
};

function sortCrypto(rows: CryptoMarcaRow[], col: CryptoTableCol, dir: SortDir): CryptoMarcaRow[] {
  const factor = dir === "asc" ? 1 : -1;
  const texto = (a: string, b: string) => a.localeCompare(b, "pt-BR") * factor;
  return [...rows].sort((a, b) => {
    if (col === "razao") return texto(a.empresa.razao_social, b.empresa.razao_social);
    if (col === "possui_crypto") return texto(a.possui_crypto ?? "", b.possui_crypto ?? "");
    if (col === "retorno") {
      const ia = a.retorno ? STATUS_PRODUTO_ORDEM.indexOf(a.retorno) : 99;
      const ib = b.retorno ? STATUS_PRODUTO_ORDEM.indexOf(b.retorno) : 99;
      return (ia - ib) * factor;
    }
    if (col === "ultima_comunicacao") {
      const da = a.ultima_comunicacao ?? "";
      const db = b.ultima_comunicacao ?? "";
      if (da === db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return dir === "asc" ? da.localeCompare(db) : db.localeCompare(da);
    }
    return 0;
  });
}

export default function PipelineCrypto() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("comercial_pipeline_crypto");
  const [tab, setTab] = useRouteTab("comercial_pipeline_crypto", "todos", PIPELINE_TABS);
  const [busca, setBusca] = useState("");
  const [comercialFiltro, setComercialFiltro] = useState(COMERCIAL_FILTRO_TODOS);
  const [kpiFolha, setKpiFolha] = useState<import("../PipelineB2B/constants").StatusFolha | null>(null);
  const [rows, setRows] = useState<CryptoMarcaRow[]>([]);
  const [comerciais, setComerciais] = useState<ComercialOpcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ col: CryptoTableCol; dir: SortDir }>({ col: "razao", dir: "asc" });
  const [novaMarcaAberta, setNovaMarcaAberta] = useState(false);
  const [registroMarca, setRegistroMarca] = useState<CryptoMarcaRow | null>(null);
  const [verMarca, setVerMarca] = useState<CryptoMarcaRow | null>(null);
  const [contatoModal, setContatoModal] = useState<
    | { mode: "edit"; marca: CryptoMarcaRow; contato: ComercialContato }
    | { mode: "add"; marca: CryptoMarcaRow }
    | null
  >(null);

  const pageBox = getPageContentBoxStyle(brand, t);
  const filterBox = getPageFilterBoxStyle(brand, t);

  const patchMarcaRow = useCallback((marcaId: string, patch: (row: CryptoMarcaRow) => CryptoMarcaRow) => {
    let updated: CryptoMarcaRow | undefined;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== marcaId) return r;
        updated = patch(r);
        return updated;
      }),
    );
    if (updated) {
      setVerMarca((v) => (v?.id === marcaId ? updated! : v));
      setRegistroMarca((v) => (v?.id === marcaId ? updated! : v));
      setContatoModal((m) => (m && m.marca.id === marcaId ? { ...m, marca: updated! } : m));
    }
  }, []);

  const loadData = useCallback(async (opts?: { showLoading?: boolean }) => {
    const showLoading = opts?.showLoading !== false;
    if (showLoading) setLoading(true);
    setLoadError(null);
    try {
      const [marcasRows, gestoresRes] = await Promise.all([
        fetchAllPages<Record<string, unknown>>(async (from, to) =>
          supabase
            .from("comercial_crypto_marcas")
            .select(CRYPTO_MARCA_SELECT)
            .order("nome")
            .order("id")
            .range(from, to),
        ),
        supabase
          .from("profiles")
          .select("id, name")
          .in("name", [...PIPELINE_COMERCIAL_NOMES])
          .or("ativo.is.null,ativo.eq.true"),
      ]);
      if (gestoresRes.error) throw new Error(gestoresRes.error.message);
      const comercialList = buildPipelineComerciais(gestoresRes.data ?? []);
      setComerciais(comercialList);
      const names = Object.fromEntries(
        comercialList.flatMap((c) => (c.id ? [[c.id, c.name] as const] : [])),
      );
      setRows(marcasRows.map((r) => mapCryptoMarcaFromDb(r, names)));
    } catch (e: unknown) {
      console.error("[PipelineCrypto] loadData:", e);
      setRows([]);
      setComerciais([]);
      setLoadError(MSG_ERRO_CARREGAR);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setKpiFolha(null);
  }, [tab]);

  const filteredBase = useMemo(
    () => filterMarcas(rows, tab, busca, comercialFiltro, null, comerciais),
    [rows, tab, busca, comercialFiltro, comerciais],
  );

  const tableRows = useMemo(() => {
    const filtered = filterMarcas(rows, tab, busca, comercialFiltro, kpiFolha, comerciais);
    return sortCrypto(filtered as CryptoMarcaRow[], sort.col, sort.dir);
  }, [rows, tab, busca, comercialFiltro, kpiFolha, sort, comerciais]);

  const gruposRazao = useMemo(
    () => agruparContiguo(tableRows, (r) => r.empresa.cnpj),
    [tableRows],
  );

  async function insertHistorico(
    marcaId: string,
    campo: string,
    valorAnterior: string | null,
    valorNovo: string | null,
  ) {
    await supabase.from("comercial_crypto_historico").insert({
      marca_id: marcaId,
      campo,
      valor_anterior: valorAnterior,
      valor_novo: valorNovo,
      usuario_id: user?.id ?? null,
    });
  }

  async function updateComercial(row: CryptoMarcaRow, userId: string | null) {
    if (!perm.canEditarOk) return;
    const anterior = row.comercial_user_id;
    const { error } = await supabase
      .from("comercial_crypto_marcas")
      .update({ comercial_user_id: userId })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(
      row.id,
      "comercial_user_id",
      pipelineComercialNomePorId(anterior, comerciais) ?? "—",
      pipelineComercialNomePorId(userId, comerciais) ?? "—",
    );
    patchMarcaRow(row.id, (r) => ({
      ...r,
      comercial_user_id: userId,
      comercial_nome: userId ? pipelineComercialNomePorId(userId, comerciais) : null,
    }));
  }

  async function updateUltima(row: CryptoMarcaRow, date: string | null) {
    if (!perm.canEditarOk) return;
    const valorNovo = date || null;
    if ((row.ultima_comunicacao ?? null) === valorNovo) return;
    const { error } = await supabase
      .from("comercial_crypto_marcas")
      .update({ ultima_comunicacao: valorNovo })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(row.id, "ultima_comunicacao", row.ultima_comunicacao, valorNovo);
    patchMarcaRow(row.id, (r) => ({ ...r, ultima_comunicacao: valorNovo, ultimo_contato: valorNovo }));
  }

  async function updateStatus(row: CryptoMarcaRow, status: StatusPipeline) {
    if (!perm.canEditarOk) return;
    const anterior = row.status_pipeline;
    let folha = row.status_folha;
    if (!FOLHA_BY_PIPELINE[status].includes(folha)) {
      folha = defaultFolhaForPipeline(status);
    }
    const { error } = await supabase
      .from("comercial_crypto_marcas")
      .update({ status_pipeline: status, status_folha: folha })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(row.id, "status_pipeline", anterior, status);
    patchMarcaRow(row.id, (r) => ({ ...r, status_pipeline: status, status_folha: folha }));
  }

  async function updatePossui(row: CryptoMarcaRow, valor: PossuiCrypto | null) {
    if (!perm.canEditarOk) return;
    if ((row.possui_crypto ?? null) === valor) return;
    const { error } = await supabase
      .from("comercial_crypto_marcas")
      .update({ possui_crypto: valor })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(row.id, "possui_crypto", row.possui_crypto, valor);
    patchMarcaRow(row.id, (r) => ({ ...r, possui_crypto: valor }));
  }

  async function updateRetorno(row: CryptoMarcaRow, valor: StatusProduto | null) {
    if (!perm.canEditarOk) return;
    if ((row.retorno ?? null) === valor) return;
    const { error } = await supabase
      .from("comercial_crypto_marcas")
      .update({ retorno: valor })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(row.id, "retorno", row.retorno, valor);

    const produtosNext = valor ? [{ produto: "mesa_network" as const, status_produto: valor }] : [];
    let statusPipelineNext = row.status_pipeline;
    let statusFolhaNext = row.status_folha;
    const derivado = derivarStatusPipelinePorProdutos(produtosNext);
    if (derivado && derivado !== row.status_pipeline) {
      statusPipelineNext = derivado;
      statusFolhaNext = folhaDerivadaPorPipelineEProdutos(derivado, produtosNext);
      const { error: errStatus } = await supabase
        .from("comercial_crypto_marcas")
        .update({ status_pipeline: statusPipelineNext, status_folha: statusFolhaNext })
        .eq("id", row.id);
      if (errStatus) {
        console.error(errStatus);
        statusPipelineNext = row.status_pipeline;
        statusFolhaNext = row.status_folha;
      } else {
        await insertHistorico(row.id, "status_pipeline", row.status_pipeline, statusPipelineNext);
      }
    } else if (derivado === row.status_pipeline) {
      const folhaIdeal = folhaDerivadaPorPipelineEProdutos(derivado, produtosNext);
      if (folhaIdeal !== row.status_folha && FOLHA_BY_PIPELINE[derivado].includes(folhaIdeal)) {
        statusFolhaNext = folhaIdeal;
        const { error: errFolha } = await supabase
          .from("comercial_crypto_marcas")
          .update({ status_folha: statusFolhaNext })
          .eq("id", row.id);
        if (errFolha) {
          console.error(errFolha);
          statusFolhaNext = row.status_folha;
        }
      }
    }

    patchMarcaRow(row.id, (r) => ({
      ...r,
      retorno: valor,
      produtos: produtosNext,
      status_pipeline: statusPipelineNext,
      status_folha: statusFolhaNext,
    }));
  }

  async function updateDominio(marcaId: string, novoDominio: string | null): Promise<boolean> {
    if (!perm.canEditarOk) return false;
    const row = rows.find((r) => r.id === marcaId);
    if (!row) return false;
    if ((row.dominio ?? null) === (novoDominio ?? null)) return true;
    const { error } = await supabase
      .from("comercial_crypto_marcas")
      .update({ dominio: novoDominio, status_dominio: "inativo" })
      .eq("id", marcaId);
    if (error) {
      console.error(error);
      return false;
    }
    await insertHistorico(marcaId, "dominio", row.dominio, novoDominio);
    if (row.status_dominio !== "inativo") {
      await insertHistorico(
        marcaId,
        "status_dominio",
        STATUS_DOMINIO_LABEL[row.status_dominio],
        STATUS_DOMINIO_LABEL.inativo,
      );
    }
    patchMarcaRow(marcaId, (r) => ({ ...r, dominio: novoDominio, status_dominio: "inativo" }));
    return true;
  }

  function toggleSort(col: CryptoTableCol) {
    setSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" },
    );
  }

  const comercialExtra = useMemo(
    () => buildComercialFiltroExtraOptions(comerciais),
    [comerciais],
  );

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
        icon={<PageMenuIcon pageKey="comercial_pipeline_crypto" />}
        title={getPageMenuLabel("comercial_pipeline_crypto")}
        subtitle="Organize empresas, marcas e oportunidades no mercado crypto."
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
            placeholder={PAGE_SEARCH.pipelineCrypto}
            aria-label="Buscar por CNPJ, razão social ou marca"
            wrapperStyle={{ flex: 1, minWidth: 240, maxWidth: 560 }}
          />
          <FiltroBarCampoSelect
            value={comercialFiltro}
            onChange={setComercialFiltro}
            icon={FilterBarIcons.influencer}
            ariaLabel={COMERCIAL_FILTRO_ARIA}
            todasValue={COMERCIAL_FILTRO_TODOS}
            todasLabel={COMERCIAL_FILTRO_TODOS_LABEL}
            extraOptions={comercialExtra}
            options={[]}
            minWidth={200}
          />
        </div>
        <div className="app-filter-bar-tabs-cta">
          <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
          <div
            className="app-filter-bar-tabs-cta__tabs"
            role="tablist"
            aria-label="Abas do Pipeline Crypto"
            onKeyDown={(e) =>
              onFiltroBarTabsKeyDown(e, PIPELINE_TABS, setTab, (k) => `tab-pipeline-crypto-${k}`)
            }
          >
            {PIPELINE_TABS.map((key) => (
              <FiltroBarTabButton
                key={key}
                id={`tab-pipeline-crypto-${key}`}
                active={tab === key}
                aria-controls={`panel-pipeline-crypto-${key}`}
                icon={TAB_ICONS[key]}
                onClick={() => setTab(key)}
              >
                {PIPELINE_TAB_LABEL[key]}
              </FiltroBarTabButton>
            ))}
          </div>
          <div className="app-filter-bar-tabs-cta__actions">
            <AjudaContextualAcoes pageKey="comercial_pipeline_crypto" />
          </div>
        </div>
      </div>

      {loadError ? (
        <div style={pageBox} role="alert">
          <p style={{ margin: "0 0 12px", color: "#e84025", fontFamily: FONT.body, fontSize: 13 }}>{loadError}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid rgba(232,64,37,0.35)",
              background: "transparent",
              color: "#e84025",
              cursor: "pointer",
              fontFamily: FONT.body,
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div style={pageBox} role="tabpanel" id={`panel-pipeline-crypto-${tab}`} aria-labelledby={`tab-pipeline-crypto-${tab}`}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0", color: t.textMuted, fontSize: 13, fontFamily: FONT.body, gap: 8 }}>
                <Loader2 size={16} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
                Carregando…
              </div>
            ) : (
              <ConsolidadoPipeline
                tab={tab}
                rows={filteredBase}
                kpiFolha={kpiFolha}
                onKpiClick={setKpiFolha}
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
              <SectionTitle>{TAB_TABLE_CONFIG[tab].title}</SectionTitle>
              {perm.canCriarOk ? (
                <CtaCriarButton onClick={() => setNovaMarcaAberta(true)}>Nova Marca</CtaCriarButton>
              ) : null}
            </div>
            {loading ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                Carregando…
              </div>
            ) : (
              <TabelaComPaginacao
                items={gruposRazao}
                t={t}
                resetKey={`${tab}|${busca}|${comercialFiltro}|${kpiFolha ?? ""}|${sort.col}|${sort.dir}`}
              >
                {(gruposPagina) => (
                  <CryptoTable
                    rows={gruposPagina.flat() as CryptoMarcaRow[]}
                    comerciais={comerciais}
                    sort={sort}
                    onSort={toggleSort}
                    canEditar={perm.canEditarOk}
                    onRegistro={setRegistroMarca}
                    onVer={setVerMarca}
                    onContato={(row, contato) => setContatoModal({ mode: "edit", marca: row, contato })}
                    onAddContato={(row) => setContatoModal({ mode: "add", marca: row })}
                    onUpdateComercial={updateComercial}
                    onUpdateStatus={updateStatus}
                    onUpdatePossui={updatePossui}
                    onUpdateRetorno={updateRetorno}
                    onUpdateUltima={updateUltima}
                    t={t}
                  />
                )}
              </TabelaComPaginacao>
            )}
          </div>
        </>
      )}

      {novaMarcaAberta ? (
        <ModalNovaMarca
          onClose={() => setNovaMarcaAberta(false)}
          onSaved={() => {
            setTab("todos");
            void loadData({ showLoading: false });
          }}
        />
      ) : null}

      {registroMarca ? (
        <ModalRegistroMarca
          marca={registroMarca}
          onClose={() => setRegistroMarca(null)}
          canEditar={perm.canEditarOk}
          userId={user?.id}
          userName={user?.name}
          anotacoesTable="comercial_crypto_anotacoes"
          historicoTable="comercial_crypto_historico"
          campoLabels={CAMPO_LABELS}
        />
      ) : null}

      {verMarca ? (
        <ModalVerMarca
          marca={verMarca}
          allMarcas={rows}
          onClose={() => setVerMarca(null)}
          onOpenMarca={(m) => setVerMarca(m as CryptoMarcaRow)}
          canEditar={perm.canEditarOk}
          onSavedDominio={updateDominio}
          licencaHeaders={["Marca", "Status", "Possui Crypto", "Retorno"]}
          renderLicencaCelulas={(m) => {
            const row = m as CryptoMarcaRow;
            const cnpjOk = !cnpjEhSolo(row.empresa.cnpj);
            if (!cnpjOk) return ["—", "—"];
            return [
              row.possui_crypto === "sim" ? (
                <span style={badgeProdutoStyle("ativo")}>Sim</span>
              ) : row.possui_crypto === "nao" ? (
                "Não"
              ) : (
                "—"
              ),
              row.retorno ? (
                <span style={badgeProdutoStyle(row.retorno)}>{STATUS_PRODUTO_LABEL[row.retorno]}</span>
              ) : (
                "—"
              ),
            ];
          }}
        />
      ) : null}

      {contatoModal ? (
        <ModalContato
          mode={contatoModal.mode}
          marca={contatoModal.marca}
          contato={contatoModal.mode === "edit" ? contatoModal.contato : undefined}
          onClose={() => setContatoModal(null)}
          onSaved={() => void loadData({ showLoading: false })}
          canEditar={perm.canEditarOk}
          contatosTable="comercial_crypto_contatos"
        />
      ) : null}
    </div>
  );
}
