import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Globe,
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
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { FiltroBarCampoSelect } from "../../../components/FiltroBarCampoSelect";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
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
import { ConsolidadoPipeline } from "./ConsolidadoPipeline";
import { PipelineTable } from "./PipelineTable";
import { ModalRegistroMarca } from "./ModalRegistroMarca";
import { ModalVerMarca } from "./ModalVerMarca";
import { ModalContato } from "./ModalContato";
import {
  COMERCIAL_FILTRO_ARIA,
  COMERCIAL_FILTRO_TODOS,
  COMERCIAL_FILTRO_TODOS_LABEL,
  FOLHA_BY_PIPELINE,
  PIPELINE_COMERCIAL_NOMES,
  PIPELINE_TABS,
  PIPELINE_TAB_LABEL,
  STATUS_DOMINIO_LABEL,
  TAB_TABLE_CONFIG,
  type StatusPipeline,
  type StatusProduto,
  type TableCol,
} from "./constants";
import type { ComercialOpcao, ComercialContato, PipelineMarcaRow } from "./types";
import {
  buildComercialFiltroExtraOptions,
  buildPipelineComerciais,
  defaultFolhaForPipeline,
  filterMarcas,
  mapContatoFromDb,
  normalizeRetificacoes,
  pipelineComercialNomePorId,
  sortMarcas,
} from "./helpers";

const TAB_ICONS = {
  todos: <LayoutList {...FILTRO_BAR_TAB_ICON_PROPS} />,
  disponiveis: <Globe {...FILTRO_BAR_TAB_ICON_PROPS} />,
  conexao: <Link2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
  negociacao: <Handshake {...FILTRO_BAR_TAB_ICON_PROPS} />,
  fechado: <BadgeCheck {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

function mapRow(
  raw: Record<string, unknown>,
  comercialNames: Record<string, string>,
): PipelineMarcaRow {
  const empresaRaw = raw.empresa as Record<string, unknown>;
  const contatosRaw = (raw.contatos as Record<string, unknown>[] | null) ?? [];
  const produtosRaw = (raw.produtos as Record<string, unknown>[] | null) ?? [];
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
    dominio: raw.dominio ? String(raw.dominio) : null,
    status_dominio: raw.status_dominio === "ok" ? "ok" : "inativo",
    status_pipeline: raw.status_pipeline as StatusPipeline,
    status_folha: raw.status_folha as PipelineMarcaRow["status_folha"],
    comercial_user_id: comercialId,
    comercial_nome: comercialNomeCanonico,
    ultimo_contato: raw.ultimo_contato ? String(raw.ultimo_contato) : null,
    ultima_comunicacao: raw.ultima_comunicacao ? String(raw.ultima_comunicacao) : null,
    empresa: {
      id: String(empresaRaw.id),
      razao_social: String(empresaRaw.razao_social ?? ""),
      cnpj: String(empresaRaw.cnpj ?? ""),
      portaria: empresaRaw.portaria ? String(empresaRaw.portaria) : null,
      portaria_retificacoes: normalizeRetificacoes(empresaRaw.portaria_retificacoes),
      requerimento_numero: empresaRaw.requerimento_numero ? String(empresaRaw.requerimento_numero) : null,
      requerimento_ano: empresaRaw.requerimento_ano ? String(empresaRaw.requerimento_ano) : null,
    },
    contatos: contatosRaw.map(mapContatoFromDb),
    produtos: produtosRaw.map((p) => ({
      produto: p.produto as "mesa_dedicada" | "mesa_network",
      status_produto: p.status_produto as StatusProduto | null,
    })),
  };
}

export default function PipelineB2B() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("comercial_pipeline_b2b");

  const [tab, setTab] = useRouteTab("comercial_pipeline_b2b", "todos", PIPELINE_TABS);
  const [busca, setBusca] = useState("");
  const [comercialFiltro, setComercialFiltro] = useState(COMERCIAL_FILTRO_TODOS);
  const [kpiFolha, setKpiFolha] = useState<import("./constants").StatusFolha | null>(null);
  const [rows, setRows] = useState<PipelineMarcaRow[]>([]);
  const [comerciais, setComerciais] = useState<ComercialOpcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ col: TableCol; dir: SortDir }>({ col: "razao", dir: "asc" });

  const [registroMarca, setRegistroMarca] = useState<PipelineMarcaRow | null>(null);
  const [verMarca, setVerMarca] = useState<PipelineMarcaRow | null>(null);
  const [contatoModal, setContatoModal] = useState<
    | { mode: "edit"; marca: PipelineMarcaRow; contato: ComercialContato }
    | { mode: "add"; marca: PipelineMarcaRow }
    | null
  >(null);

  const pageBox = getPageContentBoxStyle(brand, t);
  const filterBox = getPageFilterBoxStyle(brand, t);

  const patchMarcaRow = useCallback(
    (marcaId: string, patch: (row: PipelineMarcaRow) => PipelineMarcaRow) => {
      let updated: PipelineMarcaRow | undefined;
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
        setContatoModal((m) =>
          m && m.marca.id === marcaId ? { ...m, marca: updated! } : m,
        );
      }
    },
    [],
  );

  const loadData = useCallback(async (opts?: { showLoading?: boolean }) => {
    const showLoading = opts?.showLoading !== false;
    if (showLoading) setLoading(true);
    const [marcasRes, gestoresRes] = await Promise.all([
      supabase
        .from("comercial_marcas")
        .select(
          `
          id, nome, dominio, status_dominio, status_pipeline, status_folha, comercial_user_id, ultimo_contato, ultima_comunicacao,
          empresa:comercial_empresas(id, razao_social, cnpj, portaria, portaria_retificacoes, requerimento_numero, requerimento_ano),
          contatos:comercial_marca_contatos(id, marca_id, nome, telefones, emails, linkedin, instagram, data_nascimento, ordem),
          produtos:comercial_marca_produtos(produto, status_produto)
        `,
        )
        .order("nome"),
      supabase
        .from("profiles")
        .select("id, name")
        .in("name", [...PIPELINE_COMERCIAL_NOMES])
        .or("ativo.is.null,ativo.eq.true"),
    ]);

    if (marcasRes.error) console.error(marcasRes.error);
    if (gestoresRes.error) console.error(gestoresRes.error);

    const comercialList = buildPipelineComerciais(gestoresRes.data ?? []);
    setComerciais(comercialList);

    const names = Object.fromEntries(
      comercialList.flatMap((c) => (c.id ? [[c.id, c.name] as const] : [])),
    );
    const mapped = (marcasRes.data ?? []).map((r) => mapRow(r as Record<string, unknown>, names));
    setRows(mapped);
    if (showLoading) setLoading(false);
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
    return sortMarcas(filtered, sort.col, sort.dir, comerciais);
  }, [rows, tab, busca, comercialFiltro, kpiFolha, sort, comerciais]);

  async function insertHistorico(
    marcaId: string,
    campo: string,
    valorAnterior: string | null,
    valorNovo: string | null,
  ) {
    await supabase.from("comercial_marca_historico").insert({
      marca_id: marcaId,
      campo,
      valor_anterior: valorAnterior,
      valor_novo: valorNovo,
      usuario_id: user?.id ?? null,
    });
  }

  async function updateComercial(row: PipelineMarcaRow, userId: string | null) {
    if (!perm.canEditarOk) return;
    const anterior = row.comercial_user_id;
    const { error } = await supabase
      .from("comercial_marcas")
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

  async function updateUltimoContato(row: PipelineMarcaRow, date: string | null) {
    if (!perm.canEditarOk) return;
    const anterior = row.ultimo_contato;
    const valorNovo = date || null;
    if ((anterior ?? null) === valorNovo) return;
    const { error } = await supabase
      .from("comercial_marcas")
      .update({ ultimo_contato: valorNovo })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(row.id, "ultimo_contato", anterior, valorNovo);
    patchMarcaRow(row.id, (r) => ({ ...r, ultimo_contato: valorNovo }));
  }

  async function updateDominio(marcaId: string, novoDominio: string | null): Promise<boolean> {
    if (!perm.canEditarOk) return false;
    const row = rows.find((r) => r.id === marcaId);
    if (!row) return false;

    const anterior = row.dominio;
    if ((anterior ?? null) === (novoDominio ?? null)) return true;

    const patch: { dominio: string | null; status_dominio?: "inativo" } = {
      dominio: novoDominio,
    };
    if ((anterior ?? null) !== (novoDominio ?? null)) {
      patch.status_dominio = "inativo";
    }

    const { error } = await supabase.from("comercial_marcas").update(patch).eq("id", marcaId);
    if (error) {
      console.error(error);
      return false;
    }

    await insertHistorico(marcaId, "dominio", anterior, novoDominio);
    if (patch.status_dominio === "inativo" && row.status_dominio !== "inativo") {
      await insertHistorico(
        marcaId,
        "status_dominio",
        STATUS_DOMINIO_LABEL[row.status_dominio],
        STATUS_DOMINIO_LABEL.inativo,
      );
    }

    patchMarcaRow(marcaId, (r) => ({
      ...r,
      dominio: novoDominio,
      status_dominio: patch.status_dominio ?? r.status_dominio,
    }));
    return true;
  }

  async function updateStatus(row: PipelineMarcaRow, status: StatusPipeline) {
    if (!perm.canEditarOk) return;
    const anterior = row.status_pipeline;
    let folha = row.status_folha;
    if (!FOLHA_BY_PIPELINE[status].includes(folha)) {
      folha = defaultFolhaForPipeline(status);
    }
    const { error } = await supabase
      .from("comercial_marcas")
      .update({ status_pipeline: status, status_folha: folha })
      .eq("id", row.id);
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(row.id, "status_pipeline", anterior, status);
    patchMarcaRow(row.id, (r) => ({
      ...r,
      status_pipeline: status,
      status_folha: folha,
    }));
  }

  async function updateProduto(
    row: PipelineMarcaRow,
    tipo: "mesa_dedicada" | "mesa_network",
    status: StatusProduto,
  ) {
    if (!perm.canEditarOk) return;
    const existing = row.produtos.find((p) => p.produto === tipo);
    const anterior = existing?.status_produto ?? null;
    const { error } = await supabase.from("comercial_marca_produtos").upsert(
      {
        marca_id: row.id,
        produto: tipo,
        status_produto: status,
      },
      { onConflict: "marca_id,produto" },
    );
    if (error) {
      console.error(error);
      return;
    }
    await insertHistorico(row.id, tipo, anterior, status);
    patchMarcaRow(row.id, (r) => {
      const produtos = [...r.produtos];
      const idx = produtos.findIndex((p) => p.produto === tipo);
      if (idx >= 0) {
        produtos[idx] = { ...produtos[idx], status_produto: status };
      } else {
        produtos.push({ produto: tipo, status_produto: status });
      }
      return { ...r, produtos };
    });
  }

  function toggleSort(col: TableCol) {
    setSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" },
    );
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
        icon={<PageMenuIcon pageKey="comercial_pipeline_b2b" />}
        title={getPageMenuLabel("comercial_pipeline_b2b")}
        subtitle="Organize empresas, marcas e oportunidades de Live Cassino no mercado B2B."
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
            placeholder={PAGE_SEARCH.pipelineB2b}
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
            extraOptions={buildComercialFiltroExtraOptions(comerciais)}
            options={[]}
            minWidth={200}
          />
        </div>
        <div
          role="tablist"
          aria-label="Abas do pipeline"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
          }}
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, PIPELINE_TABS, setTab, (k) => `tab-pipeline-${k}`)}
        >
          {PIPELINE_TABS.map((tb) => (
            <FiltroBarTabButton
              key={tb}
              id={`tab-pipeline-${tb}`}
              active={tab === tb}
              aria-controls={`panel-pipeline-${tb}`}
              onClick={() => setTab(tb)}
              icon={TAB_ICONS[tb]}
            >
              {PIPELINE_TAB_LABEL[tb]}
            </FiltroBarTabButton>
          ))}
        </div>
      </div>

      <div style={pageBox}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0", color: t.textMuted, fontSize: 13, fontFamily: FONT.body, gap: 8 }}>
            <Loader2 size={16} className="app-lucide-spin" aria-hidden />
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
          <button
            type="button"
            disabled
            title="Disponível em breve"
            aria-label="Comunicar — disponível em breve"
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              fontSize: 13,
              fontWeight: 600,
              color: t.textMuted,
              cursor: "not-allowed",
              fontFamily: FONT.body,
            }}
          >
            Comunicar
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Carregando…
          </div>
        ) : (
          <PipelineTable
            tab={tab}
            rows={tableRows}
            comerciais={comerciais}
            sort={sort}
            onSort={toggleSort}
            canEditar={perm.canEditarOk}
            onRegistro={setRegistroMarca}
            onVer={setVerMarca}
            onContato={(marca, contato) => setContatoModal({ mode: "edit", marca, contato })}
            onAddContato={(marca) => setContatoModal({ mode: "add", marca })}
            onUpdateComercial={updateComercial}
            onUpdateStatus={updateStatus}
            onUpdateProduto={updateProduto}
            onUpdateUltimoContato={updateUltimoContato}
            t={t}
          />
        )}
      </div>

      {registroMarca ? (
        <ModalRegistroMarca
          marca={registroMarca}
          onClose={() => setRegistroMarca(null)}
          canEditar={perm.canEditarOk}
          userId={user?.id}
          userName={user?.name}
        />
      ) : null}

      {verMarca ? (
        <ModalVerMarca
          marca={verMarca}
          allMarcas={rows}
          onClose={() => setVerMarca(null)}
          onOpenMarca={(m) => setVerMarca(m)}
          canEditar={perm.canEditarOk}
          onSavedDominio={updateDominio}
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
        />
      ) : null}
    </div>
  );
}
