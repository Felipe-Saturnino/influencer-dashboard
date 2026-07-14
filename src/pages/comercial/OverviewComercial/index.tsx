import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { FiltroBarCampoSelect } from "../../../components/FiltroBarCampoSelect";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import {
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
} from "../../../lib/pageContentBoxStyles";
import {
  COMERCIAL_FILTRO_ARIA,
  COMERCIAL_FILTRO_TODOS,
  COMERCIAL_FILTRO_TODOS_LABEL,
  PIPELINE_COMERCIAL_NOMES,
} from "../PipelineB2B/constants";
import {
  buildComercialFiltroExtraOptions,
  buildPipelineComerciais,
  mapContatoFromDb,
  normalizeRetificacoes,
} from "../PipelineB2B/helpers";
import type { ComercialOpcao } from "../PipelineB2B/types";
import {
  PRIORIDADE_FILTRO_ARIA,
  PRIORIDADE_FILTRO_TODAS,
  PRIORIDADE_FILTRO_TODAS_LABEL,
  PRIORIDADE_LABEL,
  PRIORIDADE_ORDEM,
  type PrioridadeIntegracao,
  type StatusIntegracao,
  type TipoIntegracao,
} from "../Integracao/constants";
import type { StatusPipelineAgregadora } from "../PipelineAgregadoras/constants";
import { OverviewComercialAbaNav } from "./OverviewComercialAbaNav";
import { OverviewOperadorasPanel } from "./OverviewOperadorasPanel";
import { OverviewAgregadorasPanel } from "./OverviewAgregadorasPanel";
import { OverviewIntegracoesPanel } from "./OverviewIntegracoesPanel";
import {
  OVERVIEW_COMERCIAL_TABS,
  type OverviewComercialTab,
} from "./overviewComercialTabs";
import {
  filterOverviewRows,
  type HistoricoOverviewRow,
  type OverviewMarcaRow,
} from "./helpers";
import {
  filterOverviewAgregadoras,
  type OverviewAgregadoraHistorico,
  type OverviewAgregadoraRow,
} from "./helpersAgregadoras";
import {
  filterOverviewIntegracoes,
  type OverviewIntegracaoHistorico,
  type OverviewIntegracaoRow,
} from "./helpersIntegracoes";

function mapOverviewRow(
  raw: Record<string, unknown>,
  comercialNames: Record<string, string>,
): OverviewMarcaRow {
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
    status_pipeline: raw.status_pipeline as OverviewMarcaRow["status_pipeline"],
    status_folha: raw.status_folha as OverviewMarcaRow["status_folha"],
    comercial_user_id: comercialId,
    comercial_nome: comercialNomeCanonico,
    agregadora: raw.agregadora ? String(raw.agregadora) : null,
    ultimo_contato: raw.ultimo_contato ? String(raw.ultimo_contato) : null,
    ultima_comunicacao: raw.ultima_comunicacao ? String(raw.ultima_comunicacao) : null,
    created_at: raw.created_at ? String(raw.created_at) : null,
    empresa: {
      id: String(empresaRaw.id),
      razao_social: String(empresaRaw.razao_social ?? ""),
      cnpj: String(empresaRaw.cnpj ?? ""),
      portaria: empresaRaw.portaria ? String(empresaRaw.portaria) : null,
      portaria_retificacoes: normalizeRetificacoes(empresaRaw.portaria_retificacoes),
      requerimento_numero: empresaRaw.requerimento_numero
        ? String(empresaRaw.requerimento_numero)
        : null,
      requerimento_ano: empresaRaw.requerimento_ano ? String(empresaRaw.requerimento_ano) : null,
      cidade: empresaRaw.cidade ? String(empresaRaw.cidade) : null,
      estado: empresaRaw.estado ? String(empresaRaw.estado) : null,
    },
    contatos: contatosRaw.map(mapContatoFromDb),
    produtos: produtosRaw.map((p) => ({
      produto: p.produto as "mesa_dedicada" | "mesa_network",
      status_produto: p.status_produto as OverviewMarcaRow["produtos"][0]["status_produto"],
    })),
  };
}

export default function OverviewComercial() {
  const { theme: t, navigateTo } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("comercial_overview");
  const [aba, setAba] = useRouteTab(
    "comercial_overview",
    "operadoras",
    OVERVIEW_COMERCIAL_TABS,
  );

  const [comercialFiltro, setComercialFiltro] = useState(COMERCIAL_FILTRO_TODOS);
  const [prioridadeFiltro, setPrioridadeFiltro] = useState(PRIORIDADE_FILTRO_TODAS);

  const [rows, setRows] = useState<OverviewMarcaRow[]>([]);
  const [comerciais, setComerciais] = useState<ComercialOpcao[]>([]);
  const [historico, setHistorico] = useState<HistoricoOverviewRow[]>([]);
  const [agregadoras, setAgregadoras] = useState<OverviewAgregadoraRow[]>([]);
  const [agregadoraHist, setAgregadoraHist] = useState<OverviewAgregadoraHistorico[]>([]);
  const [integracoes, setIntegracoes] = useState<OverviewIntegracaoRow[]>([]);
  const [integracaoHist, setIntegracaoHist] = useState<OverviewIntegracaoHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  const pageBox = getPageContentBoxStyle(brand, t);
  const filterBox = getPageFilterBoxStyle(brand, t);

  const loadData = useCallback(async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [marcasRes, gestoresRes, histRes, aggRes, aggHistRes, intRes, intHistRes] =
      await Promise.all([
      supabase
        .from("comercial_marcas")
        .select(
          `
          id, nome, dominio, status_dominio, status_pipeline, status_folha, comercial_user_id, agregadora, ultimo_contato, ultima_comunicacao, created_at,
          empresa:comercial_empresas(id, razao_social, cnpj, portaria, portaria_retificacoes, requerimento_numero, requerimento_ano, cidade, estado),
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
      supabase
        .from("comercial_marca_historico")
        .select("campo, valor_novo, marca_id, marca:comercial_marcas(nome)")
        .gte("created_at", cutoff),
      supabase
        .from("comercial_agregadoras")
        .select("id, nome, status_pipeline, comercial_user_id, jogos")
        .order("nome")
        .limit(500),
      supabase
        .from("comercial_agregadora_historico")
        .select(
          "agregadora_id, campo, valor_novo, agregadora:comercial_agregadoras(nome)",
        )
        .gte("created_at", cutoff)
        .limit(2000),
      supabase
        .from("comercial_integracoes")
        .select("id, operador_nome, prioridade, tipo, status, caminho, agregadora, created_at")
        .order("operador_nome")
        .limit(2000),
      supabase
        .from("comercial_integracao_historico")
        .select("integracao_id, campo, valor_novo, created_at")
        .eq("campo", "status")
        .limit(10000),
    ]);

    if (marcasRes.error) console.error(marcasRes.error);
    if (gestoresRes.error) console.error(gestoresRes.error);
    if (histRes.error) console.error(histRes.error);
    if (aggRes.error) console.error(aggRes.error);
    if (aggHistRes.error) console.error(aggHistRes.error);
    if (intRes.error) console.error(intRes.error);
    if (intHistRes.error) console.error(intHistRes.error);

    const comercialList = buildPipelineComerciais(gestoresRes.data ?? []);
    setComerciais(comercialList);
    const names = Object.fromEntries(
      comercialList.flatMap((c) => (c.id ? [[c.id, c.name] as const] : [])),
    );
    setRows((marcasRes.data ?? []).map((r) => mapOverviewRow(r as Record<string, unknown>, names)));
    setHistorico(
      (histRes.data ?? []).map((h) => {
        const raw = h as Record<string, unknown>;
        const marcaRaw = raw.marca as { nome?: string } | null;
        return {
          marca_id: String(raw.marca_id ?? ""),
          marca_nome: String(marcaRaw?.nome ?? "—"),
          campo: String(raw.campo ?? ""),
          valor_novo: raw.valor_novo != null ? String(raw.valor_novo) : null,
        };
      }),
    );

    setAgregadoras(
      (aggRes.data ?? []).map((r) => {
        const raw = r as Record<string, unknown>;
        const cid = raw.comercial_user_id ? String(raw.comercial_user_id) : null;
        const nomeC = cid ? names[cid] ?? null : null;
        return {
          id: String(raw.id),
          nome: String(raw.nome ?? ""),
          status_pipeline: raw.status_pipeline as StatusPipelineAgregadora,
          comercial_user_id: cid,
          comercial_nome:
            nomeC && (PIPELINE_COMERCIAL_NOMES as readonly string[]).includes(nomeC)
              ? nomeC
              : null,
          jogos: raw.jogos == null ? null : Number(raw.jogos),
        };
      }),
    );

    setAgregadoraHist(
      (aggHistRes.data ?? []).map((h) => {
        const raw = h as Record<string, unknown>;
        const emb = raw.agregadora as { nome?: string } | { nome?: string }[] | null;
        const nome =
          emb && typeof emb === "object"
            ? String((Array.isArray(emb) ? emb[0]?.nome : emb.nome) ?? "—")
            : "—";
        return {
          agregadora_id: String(raw.agregadora_id ?? ""),
          agregadora_nome: nome,
          campo: String(raw.campo ?? ""),
          valor_novo: raw.valor_novo != null ? String(raw.valor_novo) : null,
        };
      }),
    );

    setIntegracoes(
      (intRes.data ?? []).map((r) => {
        const raw = r as Record<string, unknown>;
        return {
          id: String(raw.id),
          operador_nome: String(raw.operador_nome ?? ""),
          prioridade: raw.prioridade as PrioridadeIntegracao,
          tipo: raw.tipo as TipoIntegracao,
          status: raw.status as StatusIntegracao,
          caminho: raw.caminho ? String(raw.caminho) : null,
          agregadora: raw.agregadora ? String(raw.agregadora) : null,
          created_at: raw.created_at ? String(raw.created_at) : null,
        };
      }),
    );

    setIntegracaoHist(
      (intHistRes.data ?? []).map((h) => {
        const raw = h as Record<string, unknown>;
        return {
          integracao_id: String(raw.integracao_id ?? ""),
          campo: String(raw.campo ?? ""),
          valor_novo: raw.valor_novo != null ? String(raw.valor_novo) : null,
          created_at: String(raw.created_at ?? ""),
        };
      }),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredOperadoras = useMemo(
    () => filterOverviewRows(rows, comercialFiltro, comerciais),
    [rows, comercialFiltro, comerciais],
  );

  const filteredAgregadoras = useMemo(
    () => filterOverviewAgregadoras(agregadoras, comercialFiltro, comerciais),
    [agregadoras, comercialFiltro, comerciais],
  );

  const filteredIntegracoes = useMemo(
    () => filterOverviewIntegracoes(integracoes, prioridadeFiltro),
    [integracoes, prioridadeFiltro],
  );

  function handleSelectAba(next: OverviewComercialTab) {
    setAba(next);
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
        icon={<PageMenuIcon pageKey="comercial_overview" />}
        title={getPageMenuLabel("comercial_overview")}
        subtitle="Visão consolidada do funil B2B, produtos Live Cassino e carteira da equipe comercial."
      />

      <div style={filterBox}>
        <OverviewComercialAbaNav aba={aba} onSelectAba={handleSelectAba} />

        {aba === "operadoras" || aba === "agregadoras" ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
            }}
          >
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
        ) : null}

        {aba === "integracoes" ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
            }}
          >
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
        ) : null}
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 400,
          }}
        >
          <div style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
            <Loader2
              size={24}
              className="app-lucide-spin"
              color="var(--brand-primary, #7c3aed)"
              aria-hidden
              style={{ marginBottom: 12 }}
            />
            <div style={{ fontSize: 13 }}>Carregando…</div>
          </div>
        </div>
      ) : (
        <>
          <div
            role="tabpanel"
            id="panel-overview-comercial-operadoras"
            hidden={aba !== "operadoras"}
          >
            {aba === "operadoras" ? (
              <OverviewOperadorasPanel
                filtered={filteredOperadoras}
                comerciais={comerciais}
                historico={historico}
                pageBox={pageBox}
                t={t}
                onGoPipeline={(slug) => navigateTo("comercial_pipeline_b2b", slug ?? "Todos")}
              />
            ) : null}
          </div>
          <div
            role="tabpanel"
            id="panel-overview-comercial-agregadoras"
            hidden={aba !== "agregadoras"}
          >
            {aba === "agregadoras" ? (
              <OverviewAgregadorasPanel
                rows={filteredAgregadoras}
                historico={agregadoraHist}
                comerciais={comerciais}
                pageBox={pageBox}
                t={t}
              />
            ) : null}
          </div>
          <div
            role="tabpanel"
            id="panel-overview-comercial-integracoes"
            hidden={aba !== "integracoes"}
          >
            {aba === "integracoes" ? (
              <OverviewIntegracoesPanel
                rows={filteredIntegracoes}
                historico={integracaoHist}
                pageBox={pageBox}
                t={t}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
