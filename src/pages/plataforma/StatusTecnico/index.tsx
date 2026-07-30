import { useState, useEffect, useCallback, useRef, useMemo, type Dispatch, type SetStateAction } from "react";
import { supabase, supabaseUrl, supabaseAnonKey } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { BRAND_SEMANTIC as BRAND, FONT, FONT_TITLE } from "../../../constants/theme";
import { MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { ModalConfirmExcluirPadrao } from "../../../components/OperacoesModal";
import { BtnExcluirLinha } from "../../../components/BtnExcluirLinha";
import {descricaoModalExcluirItem, tooltipExcluir} from "../../../lib/excluirItemUi";
import { GestaoUsuariosLoading } from "../GestaoUsuarios/gestaoUsuariosUi";
import { tabAtivaPrincipalStyle } from "../GestaoUsuarios/gestaoUsuariosHelpers";
import { ModalCidrAdicionarStatusTecnico } from "./ModalCidrAdicionarStatusTecnico";
import {
  ctaGradientStatus,
  ERRO_EMAIL_AGENDA,
  ERRO_EMAIL_DIRETORIA,
  ERRO_DIAGNOSTICO_PLATAFORMA,
  ERRO_REDE_EDGE,
  ERRO_SYNC_CDA,
  ERRO_SYNC_CDA_AFILIADOS,
  ERRO_SYNC_COMERCIAL_SPA,
  LABEL_UI_COMERCIAL_SPA_LISTA,
  LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO,
  LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE,
  LABEL_UI_CS_ATENDIMENTO_OUTLOOK,
  nomeIntegracaoStatusTecnicoUi,
  ERRO_SYNC_COMERCIAL_DOMINIO,
  ERRO_SYNC_COMERCIAL_CNPJ,
  ERRO_SYNC_LOBBY_BLAZE,
  ERRO_SYNC_SOCIAL,
  ERRO_SYNC_SPIN_RSS,
  ERRO_SYNC_CS_OUTLOOK,
  formatarErroRespostaCsOutlook,
  HORARIO_AGENDADO_BR,
  mesclarSyncLogsPorExecucao,
  MODAL_OVERLAY_BG,
  MSG_SEM_PERMISSAO,
  pipelineSucessoNoDia,
  SYNC_LOG_SLUGS_GARANTIDOS,
  syncLogOkNoDia,
  tableRowHoverBg,
} from "./statusTecnicoHelpers";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import { AcaoCtaContent, StatusTecnicoLoadingBlock } from "./statusTecnicoUi";
import { StatusIntegracaoTable } from "./statusTecnicoIntegracaoTable";
import {
  ordenarLinhasIntegracao,
  type IntegracaoSortCol,
  type StatusIntegracaoRow,
} from "./statusTecnicoIntegracaoTypes";
import {
  getPageContentBoxStyle,
  getPageKpiSectionGapStyle,
} from "../../../lib/pageContentBoxStyles";
import {
  fmtDataBrasilCurta,
  hojeIsoBrasil,
  inicioDiaBrasilUtcIso,
  isoDateBrasilFromInstant,
  passouHorarioAgendadoBr,
  subDiasIso,
} from "../../../lib/dateBrasil";
import {
  labelTipoTechLog,
} from "../../../lib/platformHealthDiagnostics";
import type { CSSProperties } from "react";

/** Upload OCR PLS removido do produto — ocultar mesmo se a linha ainda existir em `integrations`. */
const SLUG_INTEGRACAO_PLS_UPLOAD_RETIRADA = "upload_pls_daily_commercial";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface SyncLog {
  id: string;
  integracao_slug: string;
  executado_em: string;
  status: "ok" | "falha";
  registros_inseridos: number;
  registros_atualizados: number;
  erros_count: number;
  mensagem_erro: string | null;
  duracao_ms: number | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
}

interface TechLog {
  id: string;
  integracao_slug: string | null;
  tipo: string;
  descricao: string;
  created_at: string;
}

interface PipelineRun {
  id: string;
  run_date: string;
  channel: string;
  status: string;
  error_msg: string | null;
  created_at: string;
}

interface Integration {
  slug: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface FluxoDia {
  data: string;
  cda: number;
  social: number;
  /** Registros processados (inseridos + atualizados) nos sync_logs da ingestão RSS Spin na Rede, por dia civil (America/Sao_Paulo). */
  spinRss: number;
  /** Mesas localizadas no lobby (sync_logs lobby_blaze, campo registros_inseridos). */
  lobbyBlaze: number;
  /** Mesas localizadas no lobby CDA (sync_logs lobby_cda). */
  lobbyCda: number;
  /** Empresas enriquecidas (cidade/UF) — sync_logs comercial_cnpj_enriquecimento. */
  comercialCnpj: number;
  emails: Record<string, number>; // tipo -> destinatarios_count
  total: number;
}

interface PrestadorPontoCidrRow {
  id: string;
  cidr: string;
  rotulo: string | null;
  created_at: string;
}

export default function StatusTecnico() {
  const { theme: t, user } = useApp();
  const dashBrand = useDashboardBrand();
  const perm = usePermission("status_tecnico");
  const [loading, setLoading] = useState(true);
  const [syncExecutando, setSyncExecutando] = useState(false);
  const [syncMensagem, setSyncMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [syncAfiliadosExecutando, setSyncAfiliadosExecutando] = useState(false);
  const [syncAfiliadosMensagem, setSyncAfiliadosMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [syncSocialExecutando, setSyncSocialExecutando] = useState(false);
  const [syncSocialMensagem, setSyncSocialMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [syncSpinRssExecutando, setSyncSpinRssExecutando] = useState(false);
  const [syncSpinRssMensagem, setSyncSpinRssMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [syncCsOutlookExecutando, setSyncCsOutlookExecutando] = useState(false);
  const [syncCsOutlookMensagem, setSyncCsOutlookMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [syncComercialSpaExecutando, setSyncComercialSpaExecutando] = useState(false);
  const [syncComercialSpaMensagem, setSyncComercialSpaMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [syncComercialDominioExecutando, setSyncComercialDominioExecutando] = useState(false);
  const [syncComercialDominioMensagem, setSyncComercialDominioMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [syncComercialCnpjExecutando, setSyncComercialCnpjExecutando] = useState(false);
  const [syncComercialCnpjMensagem, setSyncComercialCnpjMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [syncLobbyBlazeExecutando, setSyncLobbyBlazeExecutando] = useState(false);
  const [syncLobbyBlazeMensagem, setSyncLobbyBlazeMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [emailEnviando, setEmailEnviando] = useState(false);
  const [emailMensagem, setEmailMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [emailAgendaEnviando, setEmailAgendaEnviando] = useState(false);
  const [emailAgendaMensagem, setEmailAgendaMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [techLogs, setTechLogs] = useState<TechLog[]>([]);
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([]);
  const [fluxoDados, setFluxoDados] = useState<FluxoDia[]>([]);
  const [registrosHoje, setRegistrosHoje] = useState(0);
  const [emailUltimoDiretoria, setEmailUltimoDiretoria] = useState<string | null>(null);
  const [emailUltimoAgenda, setEmailUltimoAgenda] = useState<string | null>(null);
  const [emailUltimoBoasVindas, setEmailUltimoBoasVindas] = useState<string | null>(null);
  const [emailUltimoReset, setEmailUltimoReset] = useState<string | null>(null);
  const [emailEnviosCount, setEmailEnviosCount] = useState(0);
  const [sortOperadoras, setSortOperadoras] = useState<{ col: IntegracaoSortCol; dir: SortDir }>({
    col: "ultimoSync",
    dir: "desc",
  });
  const [sortExternas, setSortExternas] = useState<{ col: IntegracaoSortCol; dir: SortDir }>({
    col: "ultimoSync",
    dir: "desc",
  });
  const [sortEmails, setSortEmails] = useState<{ col: IntegracaoSortCol; dir: SortDir }>({
    col: "ultimoSync",
    dir: "desc",
  });
  const [logFiltro, setLogFiltro] = useState<"1h" | "24h" | "48h">("24h");
  type LogSortCol = "hora" | "integracao" | "tipo" | "descricao";
  const [sortLog, setSortLog] = useState<{ col: LogSortCol; dir: SortDir }>({ col: "hora", dir: "desc" });
  const [fluxoHover, setFluxoHover] = useState<string | null>(null);
  const [confirmarSync, setConfirmarSync] = useState<"cda" | "cda_afiliados" | "social" | "spin_rss" | "cs_outlook" | "comercial_spa" | "comercial_dominio" | "comercial_cnpj" | "lobby_blaze" | null>(null);
  const [confirmarDiagnostico, setConfirmarDiagnostico] = useState(false);
  const [diagnosticoExecutando, setDiagnosticoExecutando] = useState(false);
  const [diagnosticoMensagem, setDiagnosticoMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [confirmarEmail, setConfirmarEmail] = useState<"diretoria" | "agenda" | null>(null);
  const [fluxoLabelNarrow, setFluxoLabelNarrow] = useState(
    typeof window !== "undefined" && window.innerWidth < 480,
  );
  const [cidrRows, setCidrRows] = useState<PrestadorPontoCidrRow[]>([]);
  const [modalCidrAdicionar, setModalCidrAdicionar] = useState(false);
  const [novoCidr, setNovoCidr] = useState("");
  const [novoRotuloCidr, setNovoRotuloCidr] = useState("");
  const [cidrSalvando, setCidrSalvando] = useState(false);
  const [cidrErroForm, setCidrErroForm] = useState<string | null>(null);
  const [cidrExcluir, setCidrExcluir] = useState<PrestadorPontoCidrRow | null>(null);
  const [cidrExcluindo, setCidrExcluindo] = useState(false);
  const [cidrErroExcluir, setCidrErroExcluir] = useState<string | null>(null);
  const pageBox = getPageContentBoxStyle(dashBrand, t);
  const dataTable = useDataTableBlock();
  const cidrInputRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const hoje = hojeIsoBrasil();
    const dataInicioStr = subDiasIso(hoje, 14);
    const syncDesdeUtc = inicioDiaBrasilUtcIso(dataInicioStr);

    // Integrações (sem upload PLS — descontinuado; pode sobrar linha no DB até migração)
    const { data: intData } = await supabase.from("integrations").select("*").eq("ativo", true);
    setIntegrations(
      (intData ?? []).filter((i) => i.slug !== SLUG_INTEGRACAO_PLS_UPLOAD_RETIRADA),
    );

    // Sync logs: janela 14d + fetch dedicado por slug crítico (jobs horários empurram diários fora do topo global)
    const [{ data: syncDataRaw }, ...slugSyncRes] = await Promise.all([
      supabase
        .from("sync_logs")
        .select("*")
        .gte("executado_em", syncDesdeUtc)
        .order("executado_em", { ascending: false })
        .limit(300),
      ...SYNC_LOG_SLUGS_GARANTIDOS.map((slug) =>
        supabase
          .from("sync_logs")
          .select("*")
          .eq("integracao_slug", slug)
          .gte("executado_em", syncDesdeUtc)
          .order("executado_em", { ascending: false })
          .limit(40),
      ),
    ]);
    setSyncLogs(
      mesclarSyncLogsPorExecucao(
        (syncDataRaw ?? []) as SyncLog[],
        ...slugSyncRes.map((r) => (r.data ?? []) as SyncLog[]),
      ),
    );

    // Tech logs — sempre buscar 48h para alertas; exibir conforme logFiltro
    const desde = new Date();
    desde.setHours(desde.getHours() - 48);
    const { data: techData } = await supabase
      .from("tech_logs")
      .select("*")
      .gte("created_at", desde.toISOString())
      .order("created_at", { ascending: false })
      .limit(100);
    setTechLogs(techData ?? []);

    // Pipeline runs (Social Media) — últimos 7 dias
    const dataPipelineInicio = new Date();
    dataPipelineInicio.setDate(dataPipelineInicio.getDate() - 7);
    const { data: pipelineData } = await supabase
      .from("pipeline_runs")
      .select("id, run_date, channel, status, error_msg, created_at")
      .gte("run_date", dataPipelineInicio.toISOString().split("T")[0])
      .order("created_at", { ascending: false })
      .limit(100);
    setPipelineRuns((pipelineData ?? []) as PipelineRun[]);

    // Registros hoje (influencer_metricas)
    const { count } = await supabase
      .from("influencer_metricas")
      .select("*", { count: "exact", head: true })
      .eq("data", hoje);
    setRegistrosHoje(count ?? 0);

    // Fluxo de dados (últimos 14 dias) — CDA, Social Media, E-mails (datas civis em SP)
    const [resCda, resSocial, resEmails, resSpinSync, resLobbyBlazeSync, resLobbyCdaSync, resComercialCnpjSync] = await Promise.all([
      supabase.from("influencer_metricas").select("data").gte("data", dataInicioStr),
      supabase.from("kpi_daily").select("date").gte("date", dataInicioStr),
      supabase.from("email_envios").select("data, tipo, destinatarios_count, created_at").gte("data", dataInicioStr),
      supabase
        .from("sync_logs")
        .select("executado_em, registros_inseridos, registros_atualizados")
        .eq("integracao_slug", "spin_na_rede_rss")
        .gte("executado_em", syncDesdeUtc)
        .order("executado_em", { ascending: false })
        .limit(500),
      supabase
        .from("sync_logs")
        .select("executado_em, registros_inseridos, status")
        .eq("integracao_slug", "lobby_blaze")
        .gte("executado_em", syncDesdeUtc)
        .order("executado_em", { ascending: false })
        .limit(500),
      supabase
        .from("sync_logs")
        .select("executado_em, registros_inseridos, status")
        .eq("integracao_slug", "lobby_cda")
        .gte("executado_em", syncDesdeUtc)
        .order("executado_em", { ascending: false })
        .limit(500),
      supabase
        .from("sync_logs")
        .select("executado_em, registros_inseridos, registros_atualizados, status")
        .eq("integracao_slug", "comercial_cnpj_enriquecimento")
        .gte("executado_em", syncDesdeUtc)
        .order("executado_em", { ascending: false })
        .limit(500),
    ]);

    const agregarSyncPorData = (
      rows: { executado_em: string; registros_inseridos: number | null; registros_atualizados?: number | null; status?: string }[],
    ) =>
      rows.reduce<Record<string, number>>((acc, row) => {
        if (row.status === "falha") return acc;
        const d = isoDateBrasilFromInstant(row.executado_em);
        if (!d) return acc;
        const n = (row.registros_inseridos ?? 0) + (row.registros_atualizados ?? 0);
        acc[d] = (acc[d] ?? 0) + n;
        return acc;
      }, {});

    const spinPorData = agregarSyncPorData(
      (resSpinSync.data ?? []) as { executado_em: string; registros_inseridos: number | null; registros_atualizados: number | null }[],
    );
    const lobbyBlazePorData = agregarSyncPorData(
      (resLobbyBlazeSync.data ?? []) as { executado_em: string; registros_inseridos: number | null; status: string }[],
    );
    const lobbyCdaPorData = agregarSyncPorData(
      (resLobbyCdaSync.data ?? []) as { executado_em: string; registros_inseridos: number | null; status: string }[],
    );
    const comercialCnpjPorData = agregarSyncPorData(
      (resComercialCnpjSync.data ?? []) as {
        executado_em: string;
        registros_inseridos: number | null;
        registros_atualizados: number | null;
        status: string;
      }[],
    );

    const cdaPorData = (resCda.data ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.data] = (acc[row.data] ?? 0) + 1;
      return acc;
    }, {});
    const socialPorData = (resSocial.data ?? []).reduce<Record<string, number>>((acc, row) => {
      const d = (row as { date: string }).date;
      acc[d] = (acc[d] ?? 0) + 1;
      return acc;
    }, {});
    const emailsPorData = (resEmails.data ?? []).reduce<Record<string, Record<string, number>>>((acc, row) => {
      const r = row as { data: string; tipo: string; destinatarios_count: number };
      if (!acc[r.data]) acc[r.data] = {};
      acc[r.data][r.tipo] = (acc[r.data][r.tipo] ?? 0) + r.destinatarios_count;
      return acc;
    }, {});
    const emailRowsBrutos = (resEmails.data ?? []) as { data: string; tipo: string; destinatarios_count: number; created_at?: string }[];
    const ultimoPorTipo = (tipo: string) =>
      emailRowsBrutos.filter((r) => r.tipo === tipo).reduce<string | null>((max, row) => {
        if (!row.created_at) return max;
        return !max || row.created_at > max ? row.created_at : max;
      }, null);
    setEmailUltimoDiretoria(ultimoPorTipo("relatorio_diretoria"));
    setEmailUltimoAgenda(ultimoPorTipo("email_agenda_diaria"));
    setEmailUltimoBoasVindas(ultimoPorTipo("boas_vindas"));
    setEmailUltimoReset(ultimoPorTipo("recuperar_senha"));
    setEmailEnviosCount((resEmails.data ?? []).length);

    const datasSet = new Set<string>([
      ...Object.keys(cdaPorData),
      ...Object.keys(socialPorData),
      ...Object.keys(spinPorData),
      ...Object.keys(lobbyBlazePorData),
      ...Object.keys(lobbyCdaPorData),
      ...Object.keys(comercialCnpjPorData),
      ...Object.keys(emailsPorData),
      hoje,
    ]);
    const fluxoArray: FluxoDia[] = Array.from(datasSet)
      .filter((data) => data >= dataInicioStr && data <= hoje)
      .sort((a, b) => a.localeCompare(b))
      .map((data) => {
        const cda = cdaPorData[data] ?? 0;
        const social = socialPorData[data] ?? 0;
        const spinRss = spinPorData[data] ?? 0;
        const lobbyBlaze = lobbyBlazePorData[data] ?? 0;
        const lobbyCda = lobbyCdaPorData[data] ?? 0;
        const comercialCnpj = comercialCnpjPorData[data] ?? 0;
        const emails = emailsPorData[data] ?? {};
        const emailTotal = Object.values(emails).reduce((s, n) => s + n, 0);
        return {
          data,
          cda,
          social,
          spinRss,
          lobbyBlaze,
          lobbyCda,
          comercialCnpj,
          emails,
          total: cda + social + spinRss + lobbyBlaze + lobbyCda + comercialCnpj + emailTotal,
        };
      });
    setFluxoDados(fluxoArray);

    const { data: cidrData, error: cidrErr } = await supabase
      .from("prestador_ponto_cidr_allowlist")
      .select("id, cidr, rotulo, created_at")
      .order("created_at", { ascending: true });
    if (cidrErr) setCidrRows([]);
    else setCidrRows((cidrData ?? []) as PrestadorPontoCidrRow[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    if (perm.canView === "nao") return;
    void carregar();
  }, [carregar, perm.canView]);

  useEffect(() => {
    if (confirmarSync == null && confirmarEmail == null && !confirmarDiagnostico) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setConfirmarSync(null);
        setConfirmarEmail(null);
        setConfirmarDiagnostico(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmarSync, confirmarEmail, confirmarDiagnostico]);

  useEffect(() => {
    const onResize = () => setFluxoLabelNarrow(window.innerWidth < 480);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const executarSync = async (conta: "influencers" | "afiliados" = "influencers") => {
    const isAfiliados = conta === "afiliados";
    if (isAfiliados) {
      if (syncAfiliadosExecutando || !perm.canEditarOk) return;
      setSyncAfiliadosExecutando(true);
      setSyncAfiliadosMensagem(null);
    } else {
      if (syncExecutando || !perm.canEditarOk) return;
      setSyncExecutando(true);
      setSyncMensagem(null);
    }
    const setMsg = isAfiliados ? setSyncAfiliadosMensagem : setSyncMensagem;
    const setExec = isAfiliados ? setSyncAfiliadosExecutando : setSyncExecutando;
    const erroPadrao = isAfiliados ? ERRO_SYNC_CDA_AFILIADOS : ERRO_SYNC_CDA;
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setMsg({ tipo: "erro", texto: "Configuração do Supabase incompleta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env." });
        setExec(false);
        return;
      }
      const hoje = new Date();
      const dataFim = hoje.toISOString().split("T")[0];
      const dataInicio = "2025-12-01";

      const { data: resDataRaw, error: invokeError } = await supabase.functions.invoke("sync-metricas-cda", {
        body: { data_inicio: dataInicio, data_fim: dataFim, conta },
      });

      const resData = (resDataRaw ?? {}) as {
        ok?: boolean;
        erro?: string;
        error?: string;
        auth_usado?: string;
        fase1_influencers?: { registros_upserted?: number; aliases_mapeados?: number };
      };

      if (invokeError) {
        const im = invokeError.message ?? "";
        let texto =
          typeof resData.erro === "string" && resData.erro.length > 0 ? resData.erro : erroPadrao;
        if (im.includes("Failed to fetch") || im.includes("fetch")) {
          texto = ERRO_REDE_EDGE;
        } else if (im.includes("401") || im.includes("unauthorized")) {
          texto = "Não autorizado. Verifique no Supabase se a Edge Function sync-metricas-cda está implantada.";
        } else if (im.includes("404") || im.includes("not found")) {
          texto = "Edge Function sync-metricas-cda não encontrada. Execute: supabase functions deploy sync-metricas-cda";
        }
        setMsg({ tipo: "erro", texto });
        setExec(false);
        return;
      }

      if (!resData?.ok) {
        let textoErro = resData?.erro ?? resData?.error ?? "Erro desconhecido";
        if (resData?.auth_usado) textoErro += ` (Auth: ${resData.auth_usado})`;
        if (textoErro.includes("403") || textoErro.includes("CDA")) {
          textoErro += isAfiliados
            ? " Configure CDA_AFILIADOS_API_KEY em Supabase → Edge Functions → Secrets."
            : " Configure CDA_INFLUENCERS_API_KEY ou CDA_USE_REPORTING_API=true em Supabase → Edge Functions → Secrets.";
        }
        setMsg({ tipo: "erro", texto: textoErro });
        setExec(false);
        return;
      }

      const regs = resData?.fase1_influencers?.registros_upserted ?? 0;
      const aliases = resData?.fase1_influencers?.aliases_mapeados ?? 0;
      setMsg({
        tipo: "ok",
        texto: `Sync concluído${isAfiliados ? " (Afiliados)" : ""}: ${regs} registros sincronizados${aliases > 0 ? ` (${aliases} aliases mapeados)` : ""}. Atualize os dashboards. Se não aparecer, selecione o mês correto no filtro do relatório (ex.: Mar 2026).`,
      });
      carregar();
    } catch (e) {
      console.error(e);
      setMsg({ tipo: "erro", texto: erroPadrao });
    } finally {
      setExec(false);
    }
  };

  const executarSyncSocial = async () => {
    if (syncSocialExecutando || !perm.canEditarOk) return;
    setSyncSocialExecutando(true);
    setSyncSocialMensagem(null);
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setSyncSocialMensagem({
          tipo: "erro",
          texto: "Configuração do Supabase incompleta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.",
        });
        setSyncSocialExecutando(false);
        return;
      }
      const { data: resDataRaw, error: invokeError } = await supabase.functions.invoke("trigger-social-kpis", {
        body: {},
      });

      const resData = (resDataRaw ?? {}) as { ok?: boolean; erro?: string; message?: string };

      if (invokeError) {
        const im = invokeError.message ?? "";
        let texto =
          typeof resData.erro === "string" && resData.erro.length > 0 ? resData.erro : ERRO_SYNC_SOCIAL;
        if (im.includes("non-2xx") && resData.erro) texto = resData.erro;
        else if (im.includes("Failed to fetch") || im.includes("fetch")) texto = ERRO_REDE_EDGE;
        if (texto.includes("404") || texto.includes("not found")) {
          texto =
            "Edge Function trigger-social-kpis não encontrada. Execute: supabase functions deploy trigger-social-kpis. Configure GITHUB_TOKEN e GITHUB_REPO nos Secrets.";
        }
        setSyncSocialMensagem({ tipo: "erro", texto });
        setSyncSocialExecutando(false);
        return;
      }

      if (!resData?.ok) {
        setSyncSocialMensagem({
          tipo: "erro",
          texto: resData?.erro ?? "Erro ao disparar workflow. Verifique GITHUB_TOKEN e GITHUB_REPO nos Secrets.",
        });
        setSyncSocialExecutando(false);
        return;
      }

      setSyncSocialMensagem({
        tipo: "ok",
        texto: resData?.message ?? "Workflow disparado. Verifique o Dashboard de Mídias Sociais em alguns minutos.",
      });
    } catch (e) {
      console.error(e);
      setSyncSocialMensagem({ tipo: "erro", texto: ERRO_SYNC_SOCIAL });
    } finally {
      setSyncSocialExecutando(false);
    }
  };

  const executarSyncSpinRss = async () => {
    if (syncSpinRssExecutando || !perm.canEditarOk) return;
    setSyncSpinRssExecutando(true);
    setSyncSpinRssMensagem(null);
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setSyncSpinRssMensagem({
          tipo: "erro",
          texto: "Configuração do Supabase incompleta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.",
        });
        setSyncSpinRssExecutando(false);
        return;
      }
      const { data: resDataRaw, error: invokeError } = await supabase.functions.invoke("sync-spin-na-rede-rss", {
        body: {},
      });
      const resData = (resDataRaw ?? {}) as {
        ok?: boolean;
        erro?: string;
        linhas_upsert?: number;
        items_parseados?: number;
        erros_feed?: string[];
        erros_db?: string[];
      };

      if (invokeError) {
        const im = invokeError.message ?? "";
        let texto =
          typeof resData.erro === "string" && resData.erro.length > 0 ? resData.erro : ERRO_SYNC_SPIN_RSS;
        if (im.includes("404") || im.includes("not found")) {
          texto =
            "Edge Function sync-spin-na-rede-rss não encontrada. Execute: supabase functions deploy sync-spin-na-rede-rss";
        } else if (im.includes("Failed to fetch") || im.includes("fetch")) {
          texto = ERRO_REDE_EDGE;
        }
        setSyncSpinRssMensagem({ tipo: "erro", texto });
        setSyncSpinRssExecutando(false);
        return;
      }

      if (!resData?.ok) {
        const extra = [resData?.erro, ...(resData?.erros_feed ?? []), ...(resData?.erros_db ?? [])].filter(Boolean).join(" — ");
        setSyncSpinRssMensagem({
          tipo: "erro",
          texto: extra.length > 0 ? extra : "Ingestão RSS concluída com erros (ver resposta da função).",
        });
        setSyncSpinRssExecutando(false);
        return;
      }

      const ups = resData?.linhas_upsert ?? 0;
      const parsed = resData?.items_parseados ?? 0;
      setSyncSpinRssMensagem({
        tipo: "ok",
        texto: `Spin na Rede RSS: ${ups} linha(s) gravadas (${parsed} itens parseados nos feeds).`,
      });
      void carregar();
    } catch (e) {
      console.error(e);
      setSyncSpinRssMensagem({ tipo: "erro", texto: ERRO_SYNC_SPIN_RSS });
    } finally {
      setSyncSpinRssExecutando(false);
    }
  };

  const executarSyncCsOutlook = async () => {
    if (syncCsOutlookExecutando || !perm.canEditarOk) return;
    setSyncCsOutlookExecutando(true);
    setSyncCsOutlookMensagem(null);
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setSyncCsOutlookMensagem({
          tipo: "erro",
          texto: "Configuração do Supabase incompleta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.",
        });
        setSyncCsOutlookExecutando(false);
        return;
      }
      const { data: resDataRaw, error: invokeError } = await supabase.functions.invoke(
        "ingest-cs-atendimento-outlook",
        { body: { max_messages: 25 } },
      );
      const resData = (resDataRaw ?? {}) as {
        ok?: boolean;
        erro?: string;
        azure_erro?: string;
        azure_detalhe?: string;
        avisos_secrets?: string[];
        criados?: number;
        encontrados?: number;
        duplicados?: number;
        ignorados?: number;
        protocolos?: string[];
        erros?: string[];
      };

      if (invokeError) {
        const im = invokeError.message ?? "";
        let texto = formatarErroRespostaCsOutlook(resData);
        if (!texto) texto = ERRO_SYNC_CS_OUTLOOK;
        if (im.includes("non-2xx") && resData.erro) texto = formatarErroRespostaCsOutlook(resData);
        if (im.includes("404") || im.includes("not found")) {
          texto =
            "Edge Function ingest-cs-atendimento-outlook não encontrada. Execute: supabase functions deploy ingest-cs-atendimento-outlook";
        } else if (im.includes("Failed to fetch") || im.includes("fetch")) {
          texto = ERRO_REDE_EDGE;
        }
        setSyncCsOutlookMensagem({ tipo: "erro", texto });
        setSyncCsOutlookExecutando(false);
        return;
      }

      if (!resData?.ok) {
        const extra = formatarErroRespostaCsOutlook(resData);
        setSyncCsOutlookMensagem({
          tipo: "erro",
          texto: extra.length > 0 ? extra : ERRO_SYNC_CS_OUTLOOK,
        });
        setSyncCsOutlookExecutando(false);
        return;
      }

      const criados = resData.criados ?? 0;
      const encontrados = resData.encontrados ?? 0;
      const protocolos = (resData.protocolos ?? []).join(", ");
      setSyncCsOutlookMensagem({
        tipo: "ok",
        texto: protocolos
          ? `${LABEL_UI_CS_ATENDIMENTO_OUTLOOK}: ${criados} chamado(s) criado(s) (${encontrados} e-mail(s) na fila). Protocolos: ${protocolos}.`
          : `${LABEL_UI_CS_ATENDIMENTO_OUTLOOK}: ${criados} chamado(s) criado(s) de ${encontrados} e-mail(s) processado(s).`,
      });
      void carregar();
    } catch (e) {
      console.error(e);
      setSyncCsOutlookMensagem({ tipo: "erro", texto: ERRO_SYNC_CS_OUTLOOK });
    } finally {
      setSyncCsOutlookExecutando(false);
    }
  };

  const executarSyncComercialSpa = async () => {
    if (syncComercialSpaExecutando || !perm.canEditarOk) return;
    setSyncComercialSpaExecutando(true);
    setSyncComercialSpaMensagem(null);
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setSyncComercialSpaMensagem({
          tipo: "erro",
          texto: "Configuração do Supabase incompleta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.",
        });
        setSyncComercialSpaExecutando(false);
        return;
      }
      const { data: resDataRaw, error: invokeError } = await supabase.functions.invoke("sync-comercial-spa-lista", {
        body: {},
      });
      const resData = (resDataRaw ?? {}) as {
        ok?: boolean;
        skipped?: boolean;
        motivo?: string;
        erro?: string;
        empresas_inseridas?: number;
        empresas_atualizadas?: number;
        marcas_inseridas?: number;
        marcas_atualizadas?: number;
        marcas_parseadas?: number;
        blocos?: number;
        erros?: string[];
      };

      if (invokeError) {
        const im = invokeError.message ?? "";
        let texto =
          typeof resData.erro === "string" && resData.erro.length > 0 ? resData.erro : ERRO_SYNC_COMERCIAL_SPA;
        if (im.includes("404") || im.includes("not found")) {
          texto =
            "Edge Function sync-comercial-spa-lista não encontrada. Execute: supabase functions deploy sync-comercial-spa-lista";
        } else if (im.includes("Failed to fetch") || im.includes("fetch")) {
          texto = ERRO_REDE_EDGE;
        }
        setSyncComercialSpaMensagem({ tipo: "erro", texto });
        setSyncComercialSpaExecutando(false);
        return;
      }

      if (!resData?.ok) {
        const extra = [resData?.erro, ...(resData?.erros ?? [])].filter(Boolean).join(" — ");
        setSyncComercialSpaMensagem({
          tipo: "erro",
          texto: extra.length > 0 ? extra : "Sync da lista SPA/MF concluído com erros (ver resposta da função).",
        });
        setSyncComercialSpaExecutando(false);
        return;
      }

      if (resData.skipped) {
        setSyncComercialSpaMensagem({
          tipo: "ok",
          texto: resData.motivo ?? "Lista SPA/MF: CSV sem alteração desde o último import.",
        });
      } else {
        const ins = (resData.empresas_inseridas ?? 0) + (resData.marcas_inseridas ?? 0);
        const upd = (resData.empresas_atualizadas ?? 0) + (resData.marcas_atualizadas ?? 0);
        const marcas = resData.marcas_parseadas ?? 0;
        setSyncComercialSpaMensagem({
          tipo: "ok",
          texto: `Pipeline B2B — Lista SPA/MF: ${ins} inserido(s), ${upd} atualizado(s) (${marcas} marcas na planilha).`,
        });
      }
      void carregar();
    } catch (e) {
      console.error(e);
      setSyncComercialSpaMensagem({ tipo: "erro", texto: ERRO_SYNC_COMERCIAL_SPA });
    } finally {
      setSyncComercialSpaExecutando(false);
    }
  };

  const executarSyncComercialDominio = async () => {
    if (syncComercialDominioExecutando || !perm.canEditarOk) return;
    setSyncComercialDominioExecutando(true);
    setSyncComercialDominioMensagem(null);
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setSyncComercialDominioMensagem({
          tipo: "erro",
          texto: "Configuração do Supabase incompleta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.",
        });
        setSyncComercialDominioExecutando(false);
        return;
      }
      const { data: resDataRaw, error: invokeError } = await supabase.functions.invoke(
        "validate-comercial-dominios",
        { body: {} },
      );
      const resData = (resDataRaw ?? {}) as {
        ok?: boolean;
        erro?: string;
        verificadas?: number;
        atualizadas?: number;
        ativas?: number;
        inativas?: number;
        erros?: string[];
      };

      if (invokeError) {
        const im = invokeError.message ?? "";
        let texto =
          typeof resData.erro === "string" && resData.erro.length > 0
            ? resData.erro
            : ERRO_SYNC_COMERCIAL_DOMINIO;
        if (im.includes("404") || im.includes("not found")) {
          texto =
            "Edge Function validate-comercial-dominios não encontrada. Execute: supabase functions deploy validate-comercial-dominios";
        } else if (im.includes("Failed to fetch") || im.includes("fetch")) {
          texto = ERRO_REDE_EDGE;
        }
        setSyncComercialDominioMensagem({ tipo: "erro", texto });
        setSyncComercialDominioExecutando(false);
        return;
      }

      if (!resData?.ok) {
        const extra = [resData?.erro, ...(resData?.erros ?? [])].filter(Boolean).join(" — ");
        setSyncComercialDominioMensagem({
          tipo: "erro",
          texto: extra.length > 0 ? extra : "Validação de domínios concluída com erros (ver resposta da função).",
        });
        setSyncComercialDominioExecutando(false);
        return;
      }

      setSyncComercialDominioMensagem({
        tipo: "ok",
        texto: `${LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO}: ${resData.verificadas ?? 0} verificada(s), ${resData.atualizadas ?? 0} atualizada(s) (${resData.ativas ?? 0} ativa(s), ${resData.inativas ?? 0} inativa(s)).`,
      });
      void carregar();
    } catch (e) {
      console.error(e);
      setSyncComercialDominioMensagem({ tipo: "erro", texto: ERRO_SYNC_COMERCIAL_DOMINIO });
    } finally {
      setSyncComercialDominioExecutando(false);
    }
  };

  const executarSyncComercialCnpj = async () => {
    if (syncComercialCnpjExecutando || !perm.canEditarOk) return;
    setSyncComercialCnpjExecutando(true);
    setSyncComercialCnpjMensagem(null);
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setSyncComercialCnpjMensagem({
          tipo: "erro",
          texto: "Configuração do Supabase incompleta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.",
        });
        setSyncComercialCnpjExecutando(false);
        return;
      }
      const { data: resDataRaw, error: invokeError } = await supabase.functions.invoke("enrich-comercial-cnpj", {
        body: {},
      });
      const resData = (resDataRaw ?? {}) as {
        ok?: boolean;
        erro?: string;
        empresas_selecionadas?: number;
        consultadas?: number;
        atualizadas?: number;
        sem_alteracao?: number;
        falhas?: number;
        erros?: string[];
      };

      if (invokeError) {
        const im = invokeError.message ?? "";
        let texto =
          typeof resData.erro === "string" && resData.erro.length > 0
            ? resData.erro
            : ERRO_SYNC_COMERCIAL_CNPJ;
        if (im.includes("404") || im.includes("not found")) {
          texto =
            "Edge Function enrich-comercial-cnpj não encontrada. Execute: supabase functions deploy enrich-comercial-cnpj";
        } else if (im.includes("Failed to fetch") || im.includes("fetch")) {
          texto = ERRO_REDE_EDGE;
        }
        setSyncComercialCnpjMensagem({ tipo: "erro", texto });
        setSyncComercialCnpjExecutando(false);
        return;
      }

      if (!resData?.ok) {
        const extra = [resData?.erro, ...(resData?.erros ?? [])].filter(Boolean).join(" — ");
        setSyncComercialCnpjMensagem({
          tipo: "erro",
          texto: extra.length > 0 ? extra : "Enriquecimento Estado / Cidade concluído com erros (ver resposta da função).",
        });
        setSyncComercialCnpjExecutando(false);
        return;
      }

      setSyncComercialCnpjMensagem({
        tipo: "ok",
        texto: `${LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE}: ${resData.atualizadas ?? 0} empresa(s) atualizada(s) (${resData.consultadas ?? 0} consultada(s), ${resData.sem_alteracao ?? 0} sem alteração).`,
      });
      void carregar();
    } catch (e) {
      console.error(e);
      setSyncComercialCnpjMensagem({ tipo: "erro", texto: ERRO_SYNC_COMERCIAL_CNPJ });
    } finally {
      setSyncComercialCnpjExecutando(false);
    }
  };

  const executarSyncLobbyBlaze = async () => {
    if (syncLobbyBlazeExecutando || !perm.canEditarOk) return;
    setSyncLobbyBlazeExecutando(true);
    setSyncLobbyBlazeMensagem(null);
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setSyncLobbyBlazeMensagem({
          tipo: "erro",
          texto: "Configuração do Supabase incompleta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.",
        });
        setSyncLobbyBlazeExecutando(false);
        return;
      }
      const { data: resDataRaw, error: invokeError } = await supabase.functions.invoke("monitor-lobby-blaze", {
        body: {},
      });
      const resData = (resDataRaw ?? {}) as {
        ok?: boolean;
        status?: string;
        erro?: string;
        mesas_encontradas?: number;
        mesas_esperadas?: number;
        jogos_escaneados?: number;
        execucao_id?: string | null;
      };

      if (invokeError) {
        const im = invokeError.message ?? "";
        let texto =
          typeof resData.erro === "string" && resData.erro.length > 0 ? resData.erro : ERRO_SYNC_LOBBY_BLAZE;
        if (im.includes("404") || im.includes("not found")) {
          texto =
            "Edge Function monitor-lobby-blaze não encontrada. Execute: supabase functions deploy monitor-lobby-blaze";
        } else if (im.includes("Failed to fetch") || im.includes("fetch")) {
          texto = ERRO_REDE_EDGE;
        }
        setSyncLobbyBlazeMensagem({ tipo: "erro", texto });
        setSyncLobbyBlazeExecutando(false);
        return;
      }

      const erroApi = resData?.erro ?? "";
      if (!resData?.ok) {
        let texto = erroApi || "Monitor Lobby Blaze concluído com erros.";
        if (erroApi.includes("451") || erroApi.toLowerCase().includes("bloqueio")) {
          texto +=
            " A API da Blaze bloqueia IPs de datacenter (Edge). Use o job da Telecom (scripts/monitor-lobby-blaze-run.mjs).";
        }
        setSyncLobbyBlazeMensagem({ tipo: "erro", texto });
        void carregar();
        setSyncLobbyBlazeExecutando(false);
        return;
      }

      const mesas = resData.mesas_encontradas ?? 0;
      const esperadas = resData.mesas_esperadas ?? mesas;
      const parcial = resData.status === "parcial";
      setSyncLobbyBlazeMensagem({
        tipo: "ok",
        texto: parcial
          ? `Lobby Blaze: snapshot gravado (${mesas}/${esperadas} mesas). Verifique mesas sem ID ou ausentes no lobby.`
          : `Lobby Blaze: ${mesas} mesa(s) posicionada(s), ${resData.jogos_escaneados ?? 0} jogos no lobby.`,
      });
      void carregar();
    } catch (e) {
      console.error(e);
      setSyncLobbyBlazeMensagem({ tipo: "erro", texto: ERRO_SYNC_LOBBY_BLAZE });
    } finally {
      setSyncLobbyBlazeExecutando(false);
    }
  };

  const executarDiagnosticoPlataforma = async () => {
    if (diagnosticoExecutando || !perm.canEditarOk) return;
    setDiagnosticoExecutando(true);
    setDiagnosticoMensagem(null);
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setDiagnosticoMensagem({
          tipo: "erro",
          texto: "Configuração do Supabase incompleta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.",
        });
        setDiagnosticoExecutando(false);
        return;
      }

      const { data: resDataRaw, error: invokeError } = await supabase.functions.invoke("platform-health-check", {
        body: {},
      });

      const resData = (resDataRaw ?? {}) as {
        ok?: boolean;
        erro?: string;
        resumo?: string;
        inseridos?: number;
        erroCount?: number;
        avisoCount?: number;
      };

      if (invokeError) {
        const im = invokeError.message ?? "";
        let texto =
          typeof resData.erro === "string" && resData.erro.length > 0 ? resData.erro : ERRO_DIAGNOSTICO_PLATAFORMA;
        if (im.includes("Failed to fetch") || im.includes("fetch")) {
          texto = ERRO_REDE_EDGE;
        } else if (im.includes("404") || im.includes("not found")) {
          texto =
            "Função de diagnóstico não encontrada. Publique a Edge Function platform-health-check no Supabase.";
        } else if (im.includes("403")) {
          texto = "Sem permissão para executar diagnóstico. Libere Editar em Status Técnico.";
        }
        setDiagnosticoMensagem({ tipo: "erro", texto });
        setDiagnosticoExecutando(false);
        return;
      }

      if (!resData?.ok) {
        setDiagnosticoMensagem({
          tipo: "erro",
          texto: resData.erro ?? ERRO_DIAGNOSTICO_PLATAFORMA,
        });
        setDiagnosticoExecutando(false);
        return;
      }

      const temFalha = (resData.erroCount ?? 0) > 0;
      setDiagnosticoMensagem({
        tipo: temFalha ? "erro" : "ok",
        texto:
          resData.resumo ??
          `Diagnóstico gravado (${resData.inseridos ?? 0} entradas). Confira Logs Recentes.`,
      });
      setLogFiltro("1h");
      void carregar();
    } catch (e) {
      console.error(e);
      setDiagnosticoMensagem({ tipo: "erro", texto: ERRO_DIAGNOSTICO_PLATAFORMA });
    } finally {
      setDiagnosticoExecutando(false);
    }
  };

  const enviarEmailDiretoria = async () => {
    if (emailEnviando || !perm.canEditarOk) return;
    setEmailEnviando(true);
    setEmailMensagem(null);
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setEmailMensagem({
          tipo: "erro",
          texto: "Configuração do Supabase incompleta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.",
        });
        setEmailEnviando(false);
        return;
      }
      // fetch explícito (mesmos headers do GitHub Actions) — CORS na função deve incluir apikey + x-client-info
      let bearer = supabaseAnonKey;
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session?.access_token) bearer = sess.session.access_token;
      } catch {
        /* mantém anon */
      }
      const base = supabaseUrl.replace(/\/$/, "");
      const urlFn = `${base}/functions/v1/relatorio-diario-diretoria`;
      let res: Response;
      const tentarFetch = () =>
        fetch(urlFn, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bearer}`,
            apikey: supabaseAnonKey,
            "Content-Type": "application/json",
          },
          body: "{}",
        });
      try {
        res = await tentarFetch();
        if (!res.ok && (res.status === 502 || res.status === 503 || res.status === 504)) {
          await new Promise((r) => setTimeout(r, 800));
          res = await tentarFetch();
        }
      } catch (fetchErr) {
        console.error(fetchErr);
        setEmailMensagem({ tipo: "erro", texto: ERRO_REDE_EDGE });
        setEmailEnviando(false);
        return;
      }

      const resData = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; destinatarios?: string[] };

      if (!res.ok) {
        setEmailMensagem({
          tipo: "erro",
          texto:
            typeof resData.error === "string"
              ? resData.error
              : `Erro HTTP ${res.status}. Verifique logs da função no Supabase e secrets (Resend / destinatários).`,
        });
        setEmailEnviando(false);
        return;
      }

      if (!resData?.ok) {
        setEmailMensagem({
          tipo: "erro",
          texto: resData?.error ?? "Erro ao enviar relatório para a diretoria.",
        });
        setEmailEnviando(false);
        return;
      }

      const dest = resData?.destinatarios?.length ? ` para ${resData.destinatarios.join(", ")}` : "";
      setEmailMensagem({
        tipo: "ok",
        texto: `Relatório enviado com sucesso${dest}. A diretoria pode acompanhar possíveis erros e o status das integrações.`,
      });
      void carregar();
    } catch (e) {
      console.error(e);
      setEmailMensagem({ tipo: "erro", texto: ERRO_EMAIL_DIRETORIA });
    } finally {
      setEmailEnviando(false);
    }
  };

  const enviarEmailAgenda = async () => {
    if (emailAgendaEnviando || !perm.canEditarOk) return;
    setEmailAgendaEnviando(true);
    setEmailAgendaMensagem(null);
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setEmailAgendaMensagem({
          tipo: "erro",
          texto: "Configuração do Supabase incompleta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.",
        });
        setEmailAgendaEnviando(false);
        return;
      }
      let bearer = supabaseAnonKey;
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session?.access_token) bearer = sess.session.access_token;
      } catch {
        /* mantém anon */
      }
      const base = supabaseUrl.replace(/\/$/, "");
      const urlFn = `${base}/functions/v1/email-agenda-diaria`;
      let res: Response;
      const tentarFetch = () =>
        fetch(urlFn, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bearer}`,
            apikey: supabaseAnonKey,
            "Content-Type": "application/json",
          },
          body: "{}",
        });
      try {
        res = await tentarFetch();
        if (!res.ok && (res.status === 502 || res.status === 503 || res.status === 504)) {
          await new Promise((r) => setTimeout(r, 800));
          res = await tentarFetch();
        }
      } catch (fetchErr) {
        const raw = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        const rede =
          raw.includes("Failed to fetch") ||
          raw.includes("NetworkError") ||
          raw.toLowerCase().includes("network");
        setEmailAgendaMensagem({
          tipo: "erro",
          texto: rede
            ? "Não foi possível chegar à Edge Function (rede, CORS). Confira se email-agenda-diaria está publicada no Supabase."
            : raw,
        });
        setEmailAgendaEnviando(false);
        return;
      }

      const resData = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; destinatarios?: string[] };

      if (!res.ok) {
        setEmailAgendaMensagem({
          tipo: "erro",
          texto:
            typeof resData.error === "string"
              ? resData.error
              : `Erro HTTP ${res.status}. Verifique logs da função e secrets EMAIL_AGENDA_DESTINATARIOS / Resend.`,
        });
        setEmailAgendaEnviando(false);
        return;
      }

      if (!resData?.ok) {
        setEmailAgendaMensagem({
          tipo: "erro",
          texto: resData?.error ?? "Erro ao enviar e-mail de agenda.",
        });
        setEmailAgendaEnviando(false);
        return;
      }

      const dest = resData?.destinatarios?.length ? ` para ${resData.destinatarios.join(", ")}` : "";
      setEmailAgendaMensagem({
        tipo: "ok",
        texto: `Agenda enviada com sucesso${dest}.`,
      });
      void carregar();
    } catch (e) {
      console.error(e);
      setEmailAgendaMensagem({ tipo: "erro", texto: ERRO_EMAIL_AGENDA });
    } finally {
      setEmailAgendaEnviando(false);
    }
  };

  // KPIs derivados
  const hojeIsoKpi = hojeIsoBrasil();

  const passouHorarioCda = passouHorarioAgendadoBr(HORARIO_AGENDADO_BR.cda);
  const passouHorarioSocial = passouHorarioAgendadoBr(HORARIO_AGENDADO_BR.social);
  const passouHorarioComercialSpa = passouHorarioAgendadoBr(HORARIO_AGENDADO_BR.comercialSpa);
  const passouHorarioComercialDominio = passouHorarioAgendadoBr(HORARIO_AGENDADO_BR.comercialDominio);
  const passouHorarioComercialCnpj = passouHorarioAgendadoBr(HORARIO_AGENDADO_BR.comercialCnpj);

  // Integrações Ativas: jobs diários — OK se executou com sucesso hoje (SP); antes do horário, aceita último OK
  const syncLogsCdaKpi = syncLogs.filter((l) => l.integracao_slug === "casa_apostas");
  const ultimoSyncCdaLog = syncLogsCdaKpi[0];
  const cdaOkHoje = syncLogOkNoDia(syncLogsCdaKpi, hojeIsoKpi);
  const cdaStatusOk =
    cdaOkHoje || (!passouHorarioCda && ultimoSyncCdaLog?.status === "ok");

  const syncLogsCdaAfiliadosKpi = syncLogs.filter((l) => l.integracao_slug === "casa_apostas_afiliados");
  const ultimoSyncCdaAfiliadosLog = syncLogsCdaAfiliadosKpi[0];
  const cdaAfiliadosOkHoje = syncLogOkNoDia(syncLogsCdaAfiliadosKpi, hojeIsoKpi);
  const cdaAfiliadosStatusOk =
    cdaAfiliadosOkHoje || (!passouHorarioCda && ultimoSyncCdaAfiliadosLog?.status === "ok");

  const syncLogsSpinRssKpi = syncLogs.filter((l) => l.integracao_slug === "spin_na_rede_rss");
  const ultimoSyncSpinRssLog = syncLogsSpinRssKpi[0];
  const spinRssOkHoje = syncLogOkNoDia(syncLogsSpinRssKpi, hojeIsoKpi);
  const spinNaRedeRssStatusOk =
    spinRssOkHoje || (!passouHorarioSocial && ultimoSyncSpinRssLog?.status === "ok");

  const syncLogsComercialSpaKpi = syncLogs.filter((l) => l.integracao_slug === "comercial_spa_lista");
  const ultimoSyncComercialSpaLog = syncLogsComercialSpaKpi[0];
  const comercialSpaOkHoje = syncLogOkNoDia(syncLogsComercialSpaKpi, hojeIsoKpi);
  const comercialSpaStatusOk =
    comercialSpaOkHoje || (!passouHorarioComercialSpa && ultimoSyncComercialSpaLog?.status === "ok");

  const syncLogsComercialDominioKpi = syncLogs.filter(
    (l) => l.integracao_slug === "comercial_dominio_validacao",
  );
  const ultimoSyncComercialDominioLog = syncLogsComercialDominioKpi[0];
  const comercialDominioOkHoje = syncLogOkNoDia(syncLogsComercialDominioKpi, hojeIsoKpi);
  const comercialDominioStatusOk =
    comercialDominioOkHoje ||
    (!passouHorarioComercialDominio && ultimoSyncComercialDominioLog?.status === "ok");

  const syncLogsComercialCnpjKpi = syncLogs.filter(
    (l) => l.integracao_slug === "comercial_cnpj_enriquecimento",
  );
  const ultimoSyncComercialCnpjLog = syncLogsComercialCnpjKpi[0];
  const comercialCnpjOkHoje = syncLogOkNoDia(syncLogsComercialCnpjKpi, hojeIsoKpi);
  const comercialCnpjStatusOk =
    comercialCnpjOkHoje ||
    (!passouHorarioComercialCnpj && ultimoSyncComercialCnpjLog?.status === "ok");

  const ultimoSyncLobbyBlazeLog = syncLogs.find((l) => l.integracao_slug === "lobby_blaze");
  const lobbyBlazeStatusOk = ultimoSyncLobbyBlazeLog?.status === "ok";

  const ultimoSyncLobbyCdaLog = syncLogs.find((l) => l.integracao_slug === "lobby_cda");
  const lobbyCdaStatusOk = ultimoSyncLobbyCdaLog?.status === "ok";

  const ultimoPipelineRun = pipelineRuns.reduce<PipelineRun | null>((max, r) => {
    if (!max) return r;
    return new Date(r.created_at) > new Date(max.created_at) ? r : max;
  }, null);
  const socialOkHoje = pipelineSucessoNoDia(pipelineRuns, hojeIsoKpi);
  const socialStatusOk =
    socialOkHoje || (!passouHorarioSocial && ultimoPipelineRun?.status === "success");

  const ultimoTechLogDiretoria = techLogs
    .filter((l) => l.tipo === "relatorio_diretoria")
    .reduce<string | null>((max, l) => {
      if (!max) return l.created_at;
      return l.created_at > max ? l.created_at : max;
    }, null);
  const ultimoTechLogAgenda = techLogs
    .filter((l) => l.tipo === "email_agenda_diaria")
    .reduce<string | null>((max, l) => {
      if (!max) return l.created_at;
      return l.created_at > max ? l.created_at : max;
    }, null);
  const emailDiretoriaHoje =
    (fluxoDados.find((f) => f.data === hojeIsoKpi)?.emails?.relatorio_diretoria ?? 0) > 0;
  const emailAgendaHoje =
    (fluxoDados.find((f) => f.data === hojeIsoKpi)?.emails?.email_agenda_diaria ?? 0) > 0;
  const emailStatusDiretoriaOk =
    emailDiretoriaHoje ||
    (!passouHorarioSocial &&
      !!emailUltimoDiretoria &&
      (!ultimoTechLogDiretoria || emailUltimoDiretoria >= ultimoTechLogDiretoria));
  const emailStatusAgendaOk =
    emailAgendaHoje ||
    (!passouHorarioSocial &&
      !!emailUltimoAgenda &&
      (!ultimoTechLogAgenda || emailUltimoAgenda >= ultimoTechLogAgenda));

  const integracoesAtivasCount = [
    cdaStatusOk,
    cdaAfiliadosStatusOk,
    socialStatusOk,
    spinNaRedeRssStatusOk,
    comercialSpaStatusOk,
    comercialDominioStatusOk,
    comercialCnpjStatusOk,
    lobbyBlazeStatusOk,
    lobbyCdaStatusOk,
    emailStatusDiretoriaOk,
    emailStatusAgendaOk,
  ].filter(Boolean).length;
  const totalIntegracoes = 11;

  // Último Sync: mais recente entre CDA, Social, Spin na Rede RSS e e-mails (por data de execução)
  const timestamps: Array<{ ts: string; label: string }> = [];
  if (ultimoSyncCdaLog?.executado_em) timestamps.push({ ts: ultimoSyncCdaLog.executado_em, label: "CDA Influencers" });
  if (ultimoSyncCdaAfiliadosLog?.executado_em) {
    timestamps.push({ ts: ultimoSyncCdaAfiliadosLog.executado_em, label: "CDA Afiliados" });
  }
  if (ultimoPipelineRun?.created_at) timestamps.push({ ts: ultimoPipelineRun.created_at, label: "Social" });
  if (ultimoSyncSpinRssLog?.executado_em) timestamps.push({ ts: ultimoSyncSpinRssLog.executado_em, label: "Spin na Rede RSS" });
  if (ultimoSyncComercialSpaLog?.executado_em) {
    timestamps.push({ ts: ultimoSyncComercialSpaLog.executado_em, label: LABEL_UI_COMERCIAL_SPA_LISTA });
  }
  if (ultimoSyncComercialDominioLog?.executado_em) {
    timestamps.push({
      ts: ultimoSyncComercialDominioLog.executado_em,
      label: LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO,
    });
  }
  if (ultimoSyncComercialCnpjLog?.executado_em) {
    timestamps.push({
      ts: ultimoSyncComercialCnpjLog.executado_em,
      label: LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE,
    });
  }
  if (ultimoSyncLobbyBlazeLog?.executado_em) timestamps.push({ ts: ultimoSyncLobbyBlazeLog.executado_em, label: "Lobby Blaze" });
  if (ultimoSyncLobbyCdaLog?.executado_em) timestamps.push({ ts: ultimoSyncLobbyCdaLog.executado_em, label: "Lobby CDA" });
  if (emailUltimoDiretoria) timestamps.push({ ts: emailUltimoDiretoria, label: "E-mail Diretoria" });
  if (emailUltimoAgenda) timestamps.push({ ts: emailUltimoAgenda, label: "E-mail Agenda" });
  const ultimoSyncQualquer = timestamps.length > 0 ? timestamps.reduce((a, b) => (a.ts > b.ts ? a : b)) : null;

  // Registros Hoje: soma do fluxo total (CDA + Social Media + E-mails)
  const fluxoHoje = fluxoDados.find((f) => f.data === hojeIsoKpi);
  const registrosHojeTotal = fluxoHoje?.total ?? registrosHoje;

  // Taxa de Erro: falhas / total de tentativas (CDA, Social, e-mails)
  const cdaTotal = syncLogs.filter((l) => l.integracao_slug === "casa_apostas").length;
  const cdaFalhas = syncLogs.filter((l) => l.integracao_slug === "casa_apostas" && l.status === "falha").length;
  const cdaAfiliadosTotal = syncLogs.filter((l) => l.integracao_slug === "casa_apostas_afiliados").length;
  const cdaAfiliadosFalhas = syncLogs.filter(
    (l) => l.integracao_slug === "casa_apostas_afiliados" && l.status === "falha",
  ).length;
  const spinRssTotal = syncLogs.filter((l) => l.integracao_slug === "spin_na_rede_rss").length;
  const spinRssFalhas = syncLogs.filter((l) => l.integracao_slug === "spin_na_rede_rss" && l.status === "falha").length;
  const comercialSpaTotal = syncLogs.filter((l) => l.integracao_slug === "comercial_spa_lista").length;
  const comercialSpaFalhas = syncLogs.filter((l) => l.integracao_slug === "comercial_spa_lista" && l.status === "falha").length;
  const comercialDominioTotal = syncLogs.filter((l) => l.integracao_slug === "comercial_dominio_validacao").length;
  const comercialDominioFalhas = syncLogs.filter(
    (l) => l.integracao_slug === "comercial_dominio_validacao" && l.status === "falha",
  ).length;
  const comercialCnpjTotal = syncLogs.filter((l) => l.integracao_slug === "comercial_cnpj_enriquecimento").length;
  const comercialCnpjFalhas = syncLogs.filter(
    (l) => l.integracao_slug === "comercial_cnpj_enriquecimento" && l.status === "falha",
  ).length;
  const lobbyBlazeTotal = syncLogs.filter((l) => l.integracao_slug === "lobby_blaze").length;
  const lobbyBlazeFalhas = syncLogs.filter((l) => l.integracao_slug === "lobby_blaze" && l.status === "falha").length;
  const lobbyCdaTotal = syncLogs.filter((l) => l.integracao_slug === "lobby_cda").length;
  const lobbyCdaFalhas = syncLogs.filter((l) => l.integracao_slug === "lobby_cda" && l.status === "falha").length;
  const socialTotal = pipelineRuns.length;
  const socialFalhas = pipelineRuns.filter((r) => r.status === "error").length;
  const emailFalhas = techLogs.filter((l) =>
    l.tipo === "relatorio_diretoria" ||
    l.tipo === "email_agenda_diaria" ||
    l.tipo === "boas_vindas" ||
    l.tipo === "recuperar_senha",
  ).length;
  const emailTotal = emailEnviosCount + emailFalhas;
  const totalTentativas =
    cdaTotal +
    cdaAfiliadosTotal +
    spinRssTotal +
    comercialSpaTotal +
    comercialDominioTotal +
    comercialCnpjTotal +
    lobbyBlazeTotal +
    lobbyCdaTotal +
    socialTotal +
    Math.max(emailTotal, 1);
  const totalFalhas =
    cdaFalhas +
    cdaAfiliadosFalhas +
    spinRssFalhas +
    comercialSpaFalhas +
    comercialDominioFalhas +
    comercialCnpjFalhas +
    lobbyBlazeFalhas +
    lobbyCdaFalhas +
    socialFalhas +
    emailFalhas;
  const taxaErro = totalTentativas > 0 ? ((totalFalhas / totalTentativas) * 100).toFixed(1) : "0";

  // Alertas derivados — ordem: CDA, Social Media, E-mail
  const hojeIso = hojeIsoKpi;
  const ontemIso = subDiasIso(hojeIso, 1);
  const alertas: Array<{ nivel: "erro" | "aviso"; msg: string }> = [];
  const vinteQuatroHoras = new Date();
  vinteQuatroHoras.setHours(vinteQuatroHoras.getHours() - 24);

  // ── Sync CDA (Casa de Apostas) — Influencers — Actions 4h BRT ──
  const syncLogsCda = syncLogsCdaKpi;
  const ultimoSyncCdaOk = syncLogsCda.find((l) => l.status === "ok");
  const ultimoSyncCdaFalha = syncLogsCda.find((l) => l.status === "falha");
  const cdaTeveHistorico = syncLogsCda.some((l) => l.status === "ok") || fluxoDados.some((f) => f.cda > 0);
  const taxaErroCda = syncLogsCda.length > 0
    ? ((syncLogsCda.filter((l) => l.status === "falha").length / syncLogsCda.length) * 100).toFixed(1)
    : "0";

  if (!ultimoSyncCdaOk && ultimoSyncCdaFalha) {
    alertas.push({ nivel: "erro", msg: "Nenhum Sync CDA Influencers com sucesso" });
  }
  if (passouHorarioCda && !cdaOkHoje && cdaTeveHistorico) {
    alertas.push({ nivel: "erro", msg: "Sync CDA Influencers não executou hoje (agendado 4h)" });
  }
  if (parseFloat(taxaErroCda) > 5) {
    alertas.push({ nivel: "erro", msg: `Taxa de erro alta no Sync CDA Influencers (${taxaErroCda}%)` });
  }
  // Métricas CDA são D-1: o sync de hoje grava em influencer_metricas com data = ontem (SP).
  const cdaMetricasOntem = fluxoDados.find((f) => f.data === ontemIso)?.cda ?? 0;
  if (passouHorarioCda && cdaMetricasOntem === 0 && fluxoDados.some((f) => f.cda > 0)) {
    alertas.push({ nivel: "aviso", msg: "Sync CDA sem dados recentes" });
  }

  // ── Sync CDA Afiliados — mesma janela 4h BRT ──
  const syncLogsCdaAfiliados = syncLogsCdaAfiliadosKpi;
  const ultimoSyncCdaAfiliadosOk = syncLogsCdaAfiliados.find((l) => l.status === "ok");
  const ultimoSyncCdaAfiliadosFalha = syncLogsCdaAfiliados.find((l) => l.status === "falha");
  const cdaAfiliadosTeveHistorico = syncLogsCdaAfiliados.some((l) => l.status === "ok");
  const taxaErroCdaAfiliados = syncLogsCdaAfiliados.length > 0
    ? ((syncLogsCdaAfiliados.filter((l) => l.status === "falha").length / syncLogsCdaAfiliados.length) * 100).toFixed(1)
    : "0";

  if (!ultimoSyncCdaAfiliadosOk && ultimoSyncCdaAfiliadosFalha) {
    alertas.push({ nivel: "erro", msg: "Nenhum Sync CDA Afiliados com sucesso" });
  }
  if (passouHorarioCda && !cdaAfiliadosOkHoje && cdaAfiliadosTeveHistorico) {
    alertas.push({ nivel: "erro", msg: "Sync CDA Afiliados não executou hoje (agendado 4h)" });
  }
  if (parseFloat(taxaErroCdaAfiliados) > 5) {
    alertas.push({ nivel: "erro", msg: `Taxa de erro alta no Sync CDA Afiliados (${taxaErroCdaAfiliados}%)` });
  }

  // ── Sync Social Media ──
  const pipelineErros24h = pipelineRuns.filter((r) => {
    const created = new Date(r.created_at);
    return r.status === "error" && created >= vinteQuatroHoras;
  });
  const techLogsSocial24h = techLogs.filter((l) => {
    const created = new Date(l.created_at);
    return ["instagram", "facebook", "youtube", "linkedin", "meta_ads"].includes(l.tipo) && created >= vinteQuatroHoras;
  });
  const anteontemIso = subDiasIso(hojeIso, 2);
  const socialTemDadosRecentes = fluxoDados.some((f) => (f.data === hojeIso || f.data === ontemIso || f.data === anteontemIso) && f.social > 0);
  const socialTeveDadosAntes = fluxoDados.some((f) => f.social > 0);

  if (pipelineErros24h.length > 0) {
    const canais = [...new Set(pipelineErros24h.map((r) => r.channel))].join(", ");
    alertas.push({ nivel: "erro", msg: `Erro no Sync Social Media${canais ? ` (${canais})` : ""}` });
  }
  if (techLogsSocial24h.length > 0) {
    const canais = [...new Set(techLogsSocial24h.map((l) => l.tipo))].join(", ");
    alertas.push({ nivel: "erro", msg: `Sync Social Media com erro${canais ? ` (${canais})` : ""}` });
  }
  if (passouHorarioSocial && socialTeveDadosAntes && !socialOkHoje) {
    alertas.push({ nivel: "erro", msg: "Sync Social Media não executou hoje (agendado 6h)" });
  } else if (socialTeveDadosAntes && !socialTemDadosRecentes) {
    alertas.push({ nivel: "aviso", msg: "Sync Social Media sem dados recentes" });
  }

  // ── E-mail para diretoria ──
  const techLogsEmailDir24h = techLogs.filter((l) => {
    const created = new Date(l.created_at);
    return l.tipo === "relatorio_diretoria" && created >= vinteQuatroHoras;
  });
  if (techLogsEmailDir24h.length > 0) {
    alertas.push({ nivel: "erro", msg: "Erro ao enviar E-mail - Relatório de Influencers (Resend)" });
  }
  if (passouHorarioSocial && !emailDiretoriaHoje) {
    alertas.push({ nivel: "erro", msg: "E-mail - Relatório de Influencers (Resend) não enviado hoje (agendado 6h)" });
  }

  // ── E-mail agenda (operacional) ──
  const techLogsEmailAgenda24h = techLogs.filter((l) => {
    const created = new Date(l.created_at);
    return l.tipo === "email_agenda_diaria" && created >= vinteQuatroHoras;
  });
  if (techLogsEmailAgenda24h.length > 0) {
    alertas.push({ nivel: "erro", msg: "Erro ao enviar E-mail - Agenda do dia (Resend)" });
  }
  if (passouHorarioSocial && !emailAgendaHoje) {
    alertas.push({ nivel: "erro", msg: "E-mail - Agenda do dia (Resend) não enviado hoje (agendado 6h)" });
  }

  const techLogsBoasVindas24h = techLogs.filter((l) => {
    const created = new Date(l.created_at);
    return l.tipo === "boas_vindas" && created >= vinteQuatroHoras;
  });
  if (techLogsBoasVindas24h.length > 0) {
    alertas.push({ nivel: "aviso", msg: "Erro ao enviar E-mail de Boas-vindas (Resend)" });
  }

  const techLogsResetSenha24h = techLogs.filter((l) => {
    const created = new Date(l.created_at);
    return l.tipo === "recuperar_senha" && created >= vinteQuatroHoras;
  });
  if (techLogsResetSenha24h.length > 0) {
    alertas.push({ nivel: "aviso", msg: "Erro ao enviar E-mail de Reset de Senha (Resend)" });
  }

  // ── Ingest Spin na Rede (RSS) — Actions 6h BRT ──
  const syncLogsSpinRss = syncLogsSpinRssKpi;
  const ultimoSyncSpinRssOk = syncLogsSpinRss.find((l) => l.status === "ok");
  const ultimoSyncSpinRssFalha = syncLogsSpinRss.find((l) => l.status === "falha");
  const spinRssTeveHistorico =
    syncLogsSpinRss.some((l) => l.status === "ok") || fluxoDados.some((f) => f.spinRss > 0);
  const taxaErroSpinRss = syncLogsSpinRss.length > 0
    ? ((syncLogsSpinRss.filter((l) => l.status === "falha").length / syncLogsSpinRss.length) * 100).toFixed(1)
    : "0";

  if (syncLogsSpinRss.length > 0 && !ultimoSyncSpinRssOk && ultimoSyncSpinRssFalha) {
    alertas.push({ nivel: "erro", msg: "Nenhuma ingestão Spin na Rede (RSS) com sucesso" });
  }
  if (passouHorarioSocial && spinRssTeveHistorico && !spinRssOkHoje) {
    alertas.push({ nivel: "erro", msg: "Ingestão Spin na Rede (RSS) não executou hoje (agendado 6h)" });
  }
  if (parseFloat(taxaErroSpinRss) > 5 && syncLogsSpinRss.length > 0) {
    alertas.push({ nivel: "erro", msg: `Taxa de erro alta na ingestão Spin na Rede (RSS) (${taxaErroSpinRss}%)` });
  }

  // ── Pipeline B2B — Lista SPA/MF — Actions 7h30 BRT ──
  const syncLogsComercialSpa = syncLogsComercialSpaKpi;
  const ultimoSyncComercialSpaOk = syncLogsComercialSpa.find((l) => l.status === "ok");
  const ultimoSyncComercialSpaFalha = syncLogsComercialSpa.find((l) => l.status === "falha");
  const comercialSpaTeveHistorico = syncLogsComercialSpa.some((l) => l.status === "ok");
  const taxaErroComercialSpa =
    syncLogsComercialSpa.length > 0
      ? ((syncLogsComercialSpa.filter((l) => l.status === "falha").length / syncLogsComercialSpa.length) * 100).toFixed(1)
      : "0";

  if (syncLogsComercialSpa.length > 0 && !ultimoSyncComercialSpaOk && ultimoSyncComercialSpaFalha) {
    alertas.push({ nivel: "erro", msg: "Nenhum sync Pipeline B2B — Lista SPA/MF com sucesso" });
  }
  if (passouHorarioComercialSpa && comercialSpaTeveHistorico && !comercialSpaOkHoje) {
    alertas.push({ nivel: "erro", msg: "Importação Lista SPA/MF não executou hoje (agendado 7h30)" });
  }
  if (parseFloat(taxaErroComercialSpa) > 5 && syncLogsComercialSpa.length > 0) {
    alertas.push({
      nivel: "erro",
      msg: `Taxa de erro alta na importação Lista SPA/MF (${taxaErroComercialSpa}%)`,
    });
  }

  // ── Pipeline B2B — Validação de domínios — Actions 8h BRT ──
  const syncLogsComercialDominio = syncLogsComercialDominioKpi;
  const ultimoSyncComercialDominioOk = syncLogsComercialDominio.find((l) => l.status === "ok");
  const ultimoSyncComercialDominioFalha = syncLogsComercialDominio.find((l) => l.status === "falha");
  const comercialDominioTeveHistorico = syncLogsComercialDominio.some((l) => l.status === "ok");
  const taxaErroComercialDominio =
    syncLogsComercialDominio.length > 0
      ? (
          (syncLogsComercialDominio.filter((l) => l.status === "falha").length /
            syncLogsComercialDominio.length) *
          100
        ).toFixed(1)
      : "0";

  if (
    syncLogsComercialDominio.length > 0 &&
    !ultimoSyncComercialDominioOk &&
    ultimoSyncComercialDominioFalha
  ) {
    alertas.push({ nivel: "erro", msg: `Nenhuma ${LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO} com sucesso` });
  }
  if (passouHorarioComercialDominio && comercialDominioTeveHistorico && !comercialDominioOkHoje) {
    alertas.push({
      nivel: "erro",
      msg: `${LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO} não executou hoje (agendado 8h)`,
    });
  }
  if (parseFloat(taxaErroComercialDominio) > 5 && syncLogsComercialDominio.length > 0) {
    alertas.push({
      nivel: "erro",
      msg: `Taxa de erro alta em ${LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO} (${taxaErroComercialDominio}%)`,
    });
  }

  // ── Pipeline B2B — Estado / Cidade (CNPJ) — Actions 8h30 BRT ──
  const syncLogsComercialCnpj = syncLogsComercialCnpjKpi;
  const ultimoSyncComercialCnpjOk = syncLogsComercialCnpj.find((l) => l.status === "ok");
  const ultimoSyncComercialCnpjFalha = syncLogsComercialCnpj.find((l) => l.status === "falha");
  const comercialCnpjTeveHistorico = syncLogsComercialCnpj.some((l) => l.status === "ok");
  const taxaErroComercialCnpj =
    syncLogsComercialCnpj.length > 0
      ? (
          (syncLogsComercialCnpj.filter((l) => l.status === "falha").length / syncLogsComercialCnpj.length) *
          100
        ).toFixed(1)
      : "0";

  if (
    syncLogsComercialCnpj.length > 0 &&
    !ultimoSyncComercialCnpjOk &&
    ultimoSyncComercialCnpjFalha
  ) {
    alertas.push({
      nivel: "erro",
      msg: `Nenhum enriquecimento ${LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE} com sucesso`,
    });
  }
  if (passouHorarioComercialCnpj && comercialCnpjTeveHistorico && !comercialCnpjOkHoje) {
    alertas.push({
      nivel: "erro",
      msg: `${LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE} não executou hoje (agendado 8h30)`,
    });
  }
  if (parseFloat(taxaErroComercialCnpj) > 5 && syncLogsComercialCnpj.length > 0) {
    alertas.push({
      nivel: "erro",
      msg: `Taxa de erro alta em ${LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE} (${taxaErroComercialCnpj}%)`,
    });
  }

  // ── Lobby Blaze ──
  const syncLogsLobbyBlaze = syncLogs.filter((l) => l.integracao_slug === "lobby_blaze");
  const ultimoSyncLobbyOk = syncLogsLobbyBlaze.find((l) => l.status === "ok");
  const ultimoSyncLobbyFalha = syncLogsLobbyBlaze.find((l) => l.status === "falha");
  const taxaErroLobbyBlaze =
    syncLogsLobbyBlaze.length > 0
      ? ((syncLogsLobbyBlaze.filter((l) => l.status === "falha").length / syncLogsLobbyBlaze.length) * 100).toFixed(1)
      : "0";

  if (syncLogsLobbyBlaze.length > 0 && !ultimoSyncLobbyOk && ultimoSyncLobbyFalha) {
    alertas.push({ nivel: "erro", msg: "Nenhuma coleta Lobby Blaze com sucesso" });
  } else if (ultimoSyncLobbyOk) {
    const exec = new Date(ultimoSyncLobbyOk.executado_em);
    if (exec < vinteQuatroHoras) {
      alertas.push({ nivel: "aviso", msg: "Coleta Lobby Blaze atrasada (> 24h sem execução OK)" });
    }
  }
  if (parseFloat(taxaErroLobbyBlaze) > 5 && syncLogsLobbyBlaze.length > 0) {
    alertas.push({ nivel: "erro", msg: `Taxa de erro alta no Lobby Blaze (${taxaErroLobbyBlaze}%)` });
  }

  // ── Lobby CDA ──
  const syncLogsLobbyCda = syncLogs.filter((l) => l.integracao_slug === "lobby_cda");
  const ultimoSyncLobbyCdaOk = syncLogsLobbyCda.find((l) => l.status === "ok");
  const ultimoSyncLobbyCdaFalha = syncLogsLobbyCda.find((l) => l.status === "falha");
  const taxaErroLobbyCda =
    syncLogsLobbyCda.length > 0
      ? ((syncLogsLobbyCda.filter((l) => l.status === "falha").length / syncLogsLobbyCda.length) * 100).toFixed(1)
      : "0";

  if (syncLogsLobbyCda.length > 0 && !ultimoSyncLobbyCdaOk && ultimoSyncLobbyCdaFalha) {
    alertas.push({ nivel: "erro", msg: "Nenhuma coleta Lobby CDA com sucesso" });
  } else if (ultimoSyncLobbyCdaOk) {
    const exec = new Date(ultimoSyncLobbyCdaOk.executado_em);
    if (exec < vinteQuatroHoras) {
      alertas.push({ nivel: "aviso", msg: "Coleta Lobby CDA atrasada (> 24h sem execução OK)" });
    }
  }
  if (parseFloat(taxaErroLobbyCda) > 5 && syncLogsLobbyCda.length > 0) {
    alertas.push({ nivel: "erro", msg: `Taxa de erro alta no Lobby CDA (${taxaErroLobbyCda}%)` });
  }

  // Status por integração (última execução)
  const statusPorIntegracao = useMemo(
    () =>
      integrations.map((int) => {
        const logsInt = syncLogs.filter((l) => l.integracao_slug === int.slug);
        const ultimo = logsInt[0];
        const syncsHoje = logsInt.filter((l) => isoDateBrasilFromInstant(l.executado_em) === hojeIso);
        const regsHoje = syncsHoje.reduce((s, l) => s + (l.registros_inseridos ?? 0) + (l.registros_atualizados ?? 0), 0);
        const regsExibir =
          regsHoje || (ultimo?.status === "ok" ? (ultimo.registros_inseridos ?? 0) + (ultimo.registros_atualizados ?? 0) : 0);
        let status: "ok" | "warning" | "falha" = "ok";
        if (!ultimo) status = "falha";
        else if (ultimo.status === "falha") status = "falha";
        else if (ultimo.erros_count && ultimo.erros_count > 0) status = "warning";
        const syncTipo =
          int.slug === "casa_apostas"
            ? ("cda" as const)
            : int.slug === "casa_apostas_afiliados"
              ? ("cda_afiliados" as const)
            : int.slug === "spin_na_rede_rss"
              ? ("spin_rss" as const)
              : int.slug === "cs_atendimento_outlook"
                ? ("cs_outlook" as const)
              : int.slug === "comercial_spa_lista"
                ? ("comercial_spa" as const)
                : int.slug === "comercial_dominio_validacao"
                  ? ("comercial_dominio" as const)
                  : int.slug === "comercial_cnpj_enriquecimento"
                    ? ("comercial_cnpj" as const)
                : int.slug === "lobby_blaze"
                ? ("lobby_blaze" as const)
                : int.slug === "lobby_cda"
                  ? ("lobby_cda" as const)
                  : ("none" as const);
        return {
          ...int,
          ultimoSync: ultimo?.executado_em ?? null,
          registrosHoje: regsExibir,
          erros: ultimo?.erros_count ?? 0,
          status,
          syncTipo,
        };
      }),
    [integrations, syncLogs, hojeIso],
  );

  const fluxoHojeSocial = fluxoDados.find((f) => f.data === hojeIso);

  const socialKpisRow = useMemo(
    () => ({
      slug: "social_kpis",
      nome: "Social Media KPIs",
      descricao: "ETL Instagram, Facebook, YouTube, LinkedIn",
      ativo: true,
      ultimoSync: ultimoPipelineRun?.created_at ?? null,
      registrosHoje: fluxoHojeSocial?.social ?? 0,
      erros: pipelineRuns.filter((r) => r.status === "error").length,
      status: (socialOkHoje || ultimoPipelineRun?.status === "success"
        ? "ok"
        : ultimoPipelineRun?.status === "error"
          ? "falha"
          : "warning") as "ok" | "warning" | "falha",
      syncTipo: "social" as const,
    }),
    [ultimoPipelineRun, fluxoHojeSocial, pipelineRuns, socialOkHoje],
  );

  const emailDiretoriaRow = useMemo(
    () => ({
      slug: "email_diretoria",
      nome: "E-mail de Relatório",
      ultimoSync: emailUltimoDiretoria,
      registrosHoje: fluxoHojeSocial?.emails?.relatorio_diretoria ?? 0,
      erros: techLogs.filter((l) => l.tipo === "relatorio_diretoria").length,
      status: (emailStatusDiretoriaOk ? "ok" : "falha") as "ok" | "warning" | "falha",
      syncTipo: "email" as const,
    }),
    [emailUltimoDiretoria, fluxoHojeSocial, techLogs, emailStatusDiretoriaOk],
  );

  const emailAgendaRow = useMemo(
    () => ({
      slug: "email_agenda",
      nome: "E-mail de Agenda",
      ultimoSync: emailUltimoAgenda,
      registrosHoje: fluxoHojeSocial?.emails?.email_agenda_diaria ?? 0,
      erros: techLogs.filter((l) => l.tipo === "email_agenda_diaria").length,
      status: (emailStatusAgendaOk ? "ok" : "falha") as "ok" | "warning" | "falha",
      syncTipo: "email_agenda" as const,
    }),
    [emailUltimoAgenda, fluxoHojeSocial, techLogs, emailStatusAgendaOk],
  );

  const emailBoasVindasRow = useMemo(() => {
    const erros = techLogs.filter((l) => l.tipo === "boas_vindas").length;
    return {
      slug: "email_boas_vindas",
      nome: "E-mail de Boas-vindas",
      ultimoSync: emailUltimoBoasVindas,
      registrosHoje: fluxoHojeSocial?.emails?.boas_vindas ?? 0,
      erros,
      status: (erros > 0 ? "warning" : "ok") as "ok" | "warning" | "falha",
      syncTipo: "email_track" as const,
    };
  }, [emailUltimoBoasVindas, fluxoHojeSocial, techLogs]);

  const emailResetRow = useMemo(() => {
    const erros = techLogs.filter((l) => l.tipo === "recuperar_senha").length;
    return {
      slug: "email_reset_senha",
      nome: "E-mail de Reset de Senha",
      ultimoSync: emailUltimoReset,
      registrosHoje: fluxoHojeSocial?.emails?.recuperar_senha ?? 0,
      erros,
      status: (erros > 0 ? "warning" : "ok") as "ok" | "warning" | "falha",
      syncTipo: "email_track" as const,
    };
  }, [emailUltimoReset, fluxoHojeSocial, techLogs]);

  const pickIntegracaoRow = useCallback(
    (slug: string): StatusIntegracaoRow | null => {
      const r = statusPorIntegracao.find((i) => i.slug === slug);
      if (!r) return null;
      return {
        slug: r.slug,
        nome: nomeIntegracaoStatusTecnicoUi(r.slug, r.nome),
        ultimoSync: r.ultimoSync,
        registrosHoje: r.registrosHoje,
        erros: r.erros,
        status: r.status,
        syncTipo: r.syncTipo === "none" ? "none" : r.syncTipo,
      };
    },
    [statusPorIntegracao],
  );

  /** Sempre visível na tabela Externas — fallback se a migration de `integrations` ainda não rodou. */
  const csAtendimentoOutlookRow = useMemo((): StatusIntegracaoRow => {
    const fromDb = statusPorIntegracao.find((i) => i.slug === "cs_atendimento_outlook");
    if (fromDb) {
      return {
        slug: fromDb.slug,
        nome: nomeIntegracaoStatusTecnicoUi(fromDb.slug, fromDb.nome),
        ultimoSync: fromDb.ultimoSync,
        registrosHoje: fromDb.registrosHoje,
        erros: fromDb.erros,
        status: fromDb.status,
        syncTipo: "cs_outlook",
      };
    }

    const logsInt = syncLogs.filter((l) => l.integracao_slug === "cs_atendimento_outlook");
    const ultimo = logsInt[0];
    const syncsHoje = logsInt.filter((l) => isoDateBrasilFromInstant(l.executado_em) === hojeIso);
    const regsHoje = syncsHoje.reduce(
      (s, l) => s + (l.registros_inseridos ?? 0) + (l.registros_atualizados ?? 0),
      0,
    );
    const regsExibir =
      regsHoje ||
      (ultimo?.status === "ok" ? (ultimo.registros_inseridos ?? 0) + (ultimo.registros_atualizados ?? 0) : 0);
    let status: "ok" | "warning" | "falha" = "ok";
    if (!ultimo) status = "falha";
    else if (ultimo.status === "falha") status = "falha";
    else if (ultimo.erros_count && ultimo.erros_count > 0) status = "warning";

    return {
      slug: "cs_atendimento_outlook",
      nome: LABEL_UI_CS_ATENDIMENTO_OUTLOOK,
      ultimoSync: ultimo?.executado_em ?? null,
      registrosHoje: regsExibir,
      erros: ultimo?.erros_count ?? 0,
      status,
      syncTipo: "cs_outlook",
    };
  }, [statusPorIntegracao, syncLogs, hojeIso]);

  const linhasOperadoras = useMemo(
    () =>
      ordenarLinhasIntegracao(
        (["casa_apostas", "casa_apostas_afiliados", "lobby_blaze", "lobby_cda"] as const)
          .map((slug) => pickIntegracaoRow(slug))
          .filter(Boolean) as StatusIntegracaoRow[],
        sortOperadoras,
      ),
    [pickIntegracaoRow, sortOperadoras],
  );

  const linhasExternas = useMemo(
    () =>
      ordenarLinhasIntegracao(
        [
          csAtendimentoOutlookRow,
          pickIntegracaoRow("spin_na_rede_rss"),
          pickIntegracaoRow("comercial_spa_lista"),
          pickIntegracaoRow("comercial_dominio_validacao"),
          pickIntegracaoRow("comercial_cnpj_enriquecimento"),
          pickIntegracaoRow("painel_noticias_rss"),
          {
            slug: socialKpisRow.slug,
            nome: socialKpisRow.nome,
            ultimoSync: socialKpisRow.ultimoSync,
            registrosHoje: socialKpisRow.registrosHoje,
            erros: socialKpisRow.erros,
            status: socialKpisRow.status,
            syncTipo: "social" as const,
          },
        ].filter(Boolean) as StatusIntegracaoRow[],
        sortExternas,
      ),
    [csAtendimentoOutlookRow, pickIntegracaoRow, socialKpisRow, sortExternas],
  );

  const linhasEmails = useMemo(
    () =>
      ordenarLinhasIntegracao(
        [emailResetRow, emailDiretoriaRow, emailBoasVindasRow, emailAgendaRow] as StatusIntegracaoRow[],
        sortEmails,
      ),
    [emailResetRow, emailDiretoriaRow, emailBoasVindasRow, emailAgendaRow, sortEmails],
  );

  const toggleSortIntegracao = useCallback(
    (setSort: Dispatch<SetStateAction<{ col: IntegracaoSortCol; dir: SortDir }>>) =>
      (col: IntegracaoSortCol) => {
        setSort((s) => ({
          col,
          dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
        }));
      },
    [],
  );

  const handleSortOperadoras = useMemo(
    () => toggleSortIntegracao(setSortOperadoras),
    [toggleSortIntegracao],
  );
  const handleSortExternas = useMemo(
    () => toggleSortIntegracao(setSortExternas),
    [toggleSortIntegracao],
  );
  const handleSortEmails = useMemo(
    () => toggleSortIntegracao(setSortEmails),
    [toggleSortIntegracao],
  );

  const techLogsFiltrados = useMemo(() => {
    const horasDisplay = logFiltro === "1h" ? 1 : logFiltro === "24h" ? 24 : 48;
    const desdeDisplay = new Date();
    desdeDisplay.setHours(desdeDisplay.getHours() - horasDisplay);
    return techLogs.filter((l) => new Date(l.created_at) >= desdeDisplay);
  }, [techLogs, logFiltro]);

  const labelIntegracaoLog = useCallback(
    (log: TechLog) => {
      if (log.integracao_slug) {
        const nomeDb =
          integrations.find((i) => i.slug === log.integracao_slug)?.nome ??
          (log.integracao_slug === "spin_na_rede_rss"
            ? "Spin na Rede (RSS)"
            : log.integracao_slug === "cs_atendimento_outlook"
              ? LABEL_UI_CS_ATENDIMENTO_OUTLOOK
            : log.integracao_slug === "lobby_blaze"
              ? "Lobby Blaze"
              : log.integracao_slug === "lobby_cda"
                ? "Lobby Casa de Apostas"
                : log.integracao_slug);
        return nomeIntegracaoStatusTecnicoUi(log.integracao_slug, nomeDb);
      }
      return (
        {
          instagram: "Social Media (Instagram)",
          facebook: "Social Media (Facebook)",
          youtube: "Social Media (YouTube)",
          linkedin: "Social Media (LinkedIn)",
          meta_ads: "Social Media (Impulsionamento Meta)",
          relatorio_diretoria: "E-mail - Relatório de Influencers (Resend)",
          email_agenda_diaria: "E-mail - Agenda do dia (Resend)",
          boas_vindas: "E-mail — Boas-vindas",
          recuperar_senha: "E-mail — Reset de senha",
          resend: "E-mail (Resend)",
          spin_na_rede_rss: "Spin na Rede (RSS)",
          comercial_spa_lista: LABEL_UI_COMERCIAL_SPA_LISTA,
          comercial_dominio_validacao: LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO,
          comercial_cnpj_enriquecimento: LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE,
          painel_noticias_rss: "Painel de Notícias (RSS)",
          cs_atendimento_outlook: LABEL_UI_CS_ATENDIMENTO_OUTLOOK,
          lobby_blaze: "Lobby Blaze",
          lobby_cda: "Lobby Casa de Apostas",
          diagnostico_plataforma: "Diagnóstico da plataforma",
          diagnostico_ok: "Diagnóstico da plataforma",
          diagnostico_aviso: "Diagnóstico da plataforma",
          diagnostico_erro: "Diagnóstico da plataforma",
        }[log.tipo] ?? log.tipo
      );
    },
    [integrations],
  );

  const techLogsOrdenados = useMemo(() => {
    const arr = [...techLogsFiltrados];
    const { col, dir } = sortLog;
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "hora":
          c = compareLocaleTexto(a.created_at, b.created_at, dir);
          break;
        case "integracao":
          c = compareLocaleTexto(labelIntegracaoLog(a), labelIntegracaoLog(b), dir);
          break;
        case "tipo":
          c = compareLocaleTexto(a.tipo, b.tipo, dir);
          break;
        case "descricao":
          c = compareLocaleTexto(a.descricao, b.descricao, dir);
          break;
        default:
          c = 0;
      }
      if (c !== 0) return c;
      return compareLocaleTexto(b.created_at, a.created_at, "desc");
    });
    return arr;
  }, [techLogsFiltrados, sortLog, labelIntegracaoLog]);

  const fluxoLabel = (k: string) =>
    ({
      cda: "CDA (Casa de Apostas)",
      social: "Social Media",
      spin_rss: "Spin na Rede (RSS)",
      comercial_cnpj: `${LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE} (Pipeline B2B)`,
      lobby_blaze: "Lobby Blaze",
      lobby_cda: "Lobby CDA",
      relatorio_diretoria: "E-mail: Relatório",
      email_agenda_diaria: "E-mail: Agenda",
      boas_vindas: "E-mail: Boas-vindas",
      recuperar_senha: "E-mail: Reset de senha",
    }[k] ?? `E-mail: ${k}`);
  const fluxoCor = (k: string) =>
    ({
      cda: BRAND.roxoVivo,
      social: BRAND.azul,
      spin_rss: "#a78bfa",
      comercial_cnpj: "#0d9488",
      lobby_blaze: "#f97316",
      lobby_cda: "#0ea5e9",
      relatorio_diretoria: BRAND.verde,
      email_agenda_diaria: "#14b8a6",
      boas_vindas: "#8b5cf6",
      recuperar_senha: "#6366f1",
    }[k] ?? "#10b981");

  const corIntegracoes = integracoesAtivasCount === totalIntegracoes ? BRAND.verde : integracoesAtivasCount > 0 ? BRAND.amarelo : BRAND.vermelho;
  const corTaxaErro = parseFloat(taxaErro) > 5 ? BRAND.vermelho : parseFloat(taxaErro) > 0 ? BRAND.amarelo : BRAND.verde;

  const btnAcao = (disabled: boolean): React.CSSProperties => ({
    padding: "6px 14px",
    borderRadius: 8,
    border: "none",
    background: ctaGradientStatus(dashBrand, disabled, BRAND.cinza),
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: FONT.body,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    opacity: disabled ? 0.85 : 1,
  });
  const mostrarColunaAcao = perm.canEditarOk;
  const formatarHora = (iso: string) => {
    const d = new Date(iso);
    const hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) {
      return `Hoje ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  const tabelaIntegracaoBase = {
    mostrarColunaAcao,
    dataTable,
    t,
    formatarHora,
    tableRowHoverBg,
    btnAcao,
    syncExecutando,
    syncAfiliadosExecutando,
    syncSocialExecutando,
    syncSpinRssExecutando,
    syncCsOutlookExecutando,
    syncComercialSpaExecutando,
    syncComercialDominioExecutando,
    syncComercialCnpjExecutando,
    emailEnviando,
    emailAgendaEnviando,
    canEditarOk: perm.canEditarOk,
    onConfirmarSync: (tipo: "cda" | "cda_afiliados" | "social" | "spin_rss" | "cs_outlook" | "comercial_spa" | "comercial_dominio" | "comercial_cnpj") =>
      setConfirmarSync(tipo),
    onConfirmarEmail: (tipo: "diretoria" | "agenda") => setConfirmarEmail(tipo),
  };

  const salvarCidrAllowlist = async () => {
    setCidrErroForm(null);
    const c = novoCidr.trim();
    if (!c) {
      setCidrErroForm("Informe o prefixo CIDR.");
      return;
    }
    if (!perm.canEditarOk) return;
    setCidrSalvando(true);
    try {
      const { error } = await supabase.from("prestador_ponto_cidr_allowlist").insert({
        cidr: c,
        rotulo: novoRotuloCidr.trim() || null,
        created_by: user?.id ?? null,
      });
      if (error) {
        setCidrErroForm(error.message.includes("cidr") ? "CIDR inválido ou duplicado." : "Não foi possível salvar.");
        return;
      }
      setModalCidrAdicionar(false);
      setNovoCidr("");
      setNovoRotuloCidr("");
      await carregar();
    } finally {
      setCidrSalvando(false);
    }
  };

  const excluirCidrConfirmado = async () => {
    if (!cidrExcluir || !perm.canEditarOk) return;
    setCidrExcluindo(true);
    setCidrErroExcluir(null);
    try {
      const { error } = await supabase.from("prestador_ponto_cidr_allowlist").delete().eq("id", cidrExcluir.id);
      if (error) {
        setCidrErroExcluir("Não foi possível remover.");
        return;
      }
      setCidrExcluir(null);
      await carregar();
    } finally {
      setCidrExcluindo(false);
    }
  };

  if (perm.loading) {
    return (
      <div className="app-page-shell">
        <GestaoUsuariosLoading />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        {MSG_SEM_PERMISSAO}
      </div>
    );
  }

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
  const kpiSkeletonStyle: CSSProperties = {
    height: 28,
    width: "65%",
    borderRadius: 8,
    background: t.isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
  };
  const kpisConsolidados: { label: string; color: string; display: React.ReactNode }[] = [
    {
      label: "INTEGRAÇÕES ATIVAS",
      color: corIntegracoes,
      display: `${integracoesAtivasCount} / ${totalIntegracoes}`,
    },
    {
      label: "ÚLTIMO SYNC",
      color: BRAND.ciano,
      display: ultimoSyncQualquer ? formatarHora(ultimoSyncQualquer.ts) : "Nunca",
    },
    {
      label: "REGISTROS HOJE",
      color: BRAND.roxoVivo,
      display: registrosHojeTotal.toLocaleString("pt-BR"),
    },
    {
      label: "TAXA DE ERRO",
      color: corTaxaErro,
      display: `${taxaErro}%`,
    },
  ];

  return (
    <div className="app-page-shell">

      <PageHeader
        icon={<PageMenuIcon pageKey="status_tecnico" />}
        title={getPageMenuLabel("status_tecnico")}
        subtitle="Monitore integrações, alertas automáticos e sincronizações da plataforma."
        actions={<AjudaContextualAcoes pageKey="status_tecnico" />}
      />

      <div className="app-grid-kpi-4" style={{ ...getPageKpiSectionGapStyle(), width: "100%", gap: 14 }}>
        {kpisConsolidados.map((k) => (
          <div
            key={k.label}
            aria-label={loading ? k.label : `${k.label}: ${k.display}`}
            style={{
              borderRadius: 14,
              border: `1px solid ${t.cardBorder}`,
              borderLeft: `3px solid ${k.color}`,
              background: dashBrand.blockBg,
              padding: "16px 18px",
              boxShadow: cardShadow,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: t.textMuted,
                fontFamily: FONT.body,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {k.label}
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: k.color,
                fontFamily: FONT_TITLE,
                marginTop: 6,
                minHeight: 32,
                display: "flex",
                alignItems: "center",
              }}
            >
              {loading ? <div style={kpiSkeletonStyle} aria-hidden /> : k.display}
            </div>
          </div>
        ))}
      </div>

      {/* ── Mensagens de sync / e-mail / diagnóstico ── */}
      {(diagnosticoMensagem ||
        syncMensagem ||
        syncAfiliadosMensagem ||
        syncSocialMensagem ||
        syncSpinRssMensagem ||
        syncCsOutlookMensagem ||
        syncComercialSpaMensagem ||
        syncComercialDominioMensagem ||
        syncComercialCnpjMensagem ||
        syncLobbyBlazeMensagem ||
        emailMensagem ||
        emailAgendaMensagem) && (
        <div style={{ ...pageBox, marginBottom: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              diagnosticoMensagem && { prefix: "Diagnóstico", msg: diagnosticoMensagem },
              syncMensagem && { prefix: "Sync CDA Influencers", msg: syncMensagem },
              syncAfiliadosMensagem && { prefix: "Sync CDA Afiliados", msg: syncAfiliadosMensagem },
              syncSocialMensagem && { prefix: "Sync Social", msg: syncSocialMensagem },
              syncSpinRssMensagem && { prefix: "Spin na Rede RSS", msg: syncSpinRssMensagem },
              syncCsOutlookMensagem && { prefix: LABEL_UI_CS_ATENDIMENTO_OUTLOOK, msg: syncCsOutlookMensagem },
              syncComercialSpaMensagem && { prefix: LABEL_UI_COMERCIAL_SPA_LISTA, msg: syncComercialSpaMensagem },
              syncComercialDominioMensagem && {
                prefix: LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO,
                msg: syncComercialDominioMensagem,
              },
              syncComercialCnpjMensagem && {
                prefix: LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE,
                msg: syncComercialCnpjMensagem,
              },
              syncLobbyBlazeMensagem && { prefix: "Lobby Blaze", msg: syncLobbyBlazeMensagem },
              emailMensagem && { prefix: "E-mail de Relatório", msg: emailMensagem },
              emailAgendaMensagem && { prefix: "E-mail de Agenda", msg: emailAgendaMensagem },
            ]
              .filter(Boolean)
              .map((item, i) => {
                const { prefix, msg } = item as { prefix: string; msg: { tipo: "ok" | "erro"; texto: string } };
                return (
                  <div key={i} style={{
                    padding: 12, borderRadius: 10,
                    background: msg.tipo === "ok" ? `${BRAND.verde}18` : `${BRAND.vermelho}18`,
                    border: `1px solid ${msg.tipo === "ok" ? BRAND.verde : BRAND.vermelho}`,
                    color: msg.tipo === "ok" ? BRAND.verde : BRAND.vermelho,
                    fontFamily: FONT.body, fontSize: 12,
                    display: "flex", alignItems: "flex-start", gap: 8,
                  }}>
                    {msg.tipo === "ok" ? (
                      <CheckCircle2 size={16} color={BRAND.verde} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <AlertTriangle size={16} color={BRAND.vermelho} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
                    )}
                    <span>
                      {prefix ? `${prefix}: ` : ""}
                      {msg.texto}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div style={pageBox}>
        <SectionTitle sub="Aquisição e Lobby das Operadoras">Status das Integrações de Operadoras</SectionTitle>
        {loading ? (
          <StatusTecnicoLoadingBlock />
        ) : (
          <StatusIntegracaoTable
            caption="Status das integrações de operadoras"
            rows={linhasOperadoras}
            headers={{
              col1: "Integração",
              col2: "Último Sync",
              col3: "Registros Hoje",
            }}
            sortIntegracao={sortOperadoras}
            onSortChange={handleSortOperadoras}
            {...tabelaIntegracaoBase}
          />
        )}
      </div>

      <div style={pageBox}>
        <SectionTitle sub="Automações com plataformas/sites de mercado">Status das Integrações Externas</SectionTitle>
        {loading ? (
          <StatusTecnicoLoadingBlock />
        ) : (
          <StatusIntegracaoTable
            caption="Status das integrações externas"
            rows={linhasExternas}
            headers={{
              col1: "Integração",
              col2: "Último Sync",
              col3: "Registros Hoje",
            }}
            sortIntegracao={sortExternas}
            onSortChange={handleSortExternas}
            {...tabelaIntegracaoBase}
          />
        )}
      </div>

      <div style={pageBox}>
        <SectionTitle sub="transacionais, sistêmicos e operacionais">Status dos E-mails</SectionTitle>
        {loading ? (
          <StatusTecnicoLoadingBlock />
        ) : (
          <StatusIntegracaoTable
            caption="Status dos e-mails transacionais, sistêmicos e operacionais"
            rows={linhasEmails}
            headers={{
              col1: "E-mail",
              col2: "Último envio",
              col3: "Envios Hoje",
            }}
            sortIntegracao={sortEmails}
            onSortChange={handleSortEmails}
            {...tabelaIntegracaoBase}
          />
        )}
      </div>

      <div style={pageBox}>
        <SectionTitle sub="últimos 14 dias">Fluxo de Dados</SectionTitle>

        {/* Legenda visual compacta — sem texto explicativo de escala */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { key: "cda", label: "CDA" },
            { key: "social", label: "Social Media" },
            { key: "spin_rss", label: "Spin RSS" },
            { key: "lobby_blaze", label: "Lobby Blaze" },
            { key: "lobby_cda", label: "Lobby CDA" },
            { key: "comercial_cnpj", label: LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE },
            { key: "relatorio_diretoria", label: "E-mail de Relatório" },
            { key: "email_agenda_diaria", label: "E-mail de Agenda" },
            { key: "boas_vindas", label: "Boas-vindas" },
            { key: "recuperar_senha", label: "Reset de senha" },
          ].map((item) => (
            <span key={item.key} style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: fluxoCor(item.key), flexShrink: 0, display: "inline-block" }} />
              {item.label}
            </span>
          ))}
        </div>

        {loading ? (
          <StatusTecnicoLoadingBlock />
        ) : fluxoDados.length === 0 ? (
          <p style={{ color: t.textMuted, fontFamily: FONT.body }}>{MSG_SEM_DADOS_FILTRO}</p>
        ) : (
          <div
            role="img"
            aria-label="Gráfico de barras empilhadas com o fluxo de dados dos últimos 14 dias por fonte"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {[...fluxoDados.slice(-14)].reverse().map((f) => {
              const isHover = fluxoHover === f.data;
              const pct = (v: number) => f.total > 0 ? (v / f.total) * 100 : 0;
              return (
                <div
                  key={f.data}
                  style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}
                  onMouseEnter={() => setFluxoHover(f.data)}
                  onMouseLeave={() => setFluxoHover(null)}
                >
                  <span style={{ fontFamily: FONT.body, fontSize: 12, color: t.textMuted, width: fluxoLabelNarrow ? 80 : 100, flexShrink: 0 }}>
                    {fmtDataBrasilCurta(f.data)}
                  </span>
                  <div style={{ flex: 1, height: 24, background: t.cardBorder, borderRadius: 6, overflow: "hidden", display: "flex" }}>
                    {f.cda > 0 && (
                      <div
                        title={`${fluxoLabel("cda")}: ${f.cda.toLocaleString("pt-BR")}`}
                        style={{ width: `${pct(f.cda)}%`, minWidth: f.cda > 0 ? 8 : 0, height: "100%", background: fluxoCor("cda"), opacity: isHover ? 1 : 0.88, transition: "opacity 0.15s" }}
                      />
                    )}
                    {f.social > 0 && (
                      <div
                        title={`${fluxoLabel("social")}: ${f.social.toLocaleString("pt-BR")}`}
                        style={{ width: `${pct(f.social)}%`, minWidth: f.social > 0 ? 8 : 0, height: "100%", background: fluxoCor("social"), opacity: isHover ? 1 : 0.88, transition: "opacity 0.15s" }}
                      />
                    )}
                    {f.spinRss > 0 && (
                      <div
                        title={`${fluxoLabel("spin_rss")}: ${f.spinRss.toLocaleString("pt-BR")}`}
                        style={{ width: `${pct(f.spinRss)}%`, minWidth: f.spinRss > 0 ? 8 : 0, height: "100%", background: fluxoCor("spin_rss"), opacity: isHover ? 1 : 0.88, transition: "opacity 0.15s" }}
                      />
                    )}
                    {f.lobbyBlaze > 0 && (
                      <div
                        title={`${fluxoLabel("lobby_blaze")}: ${f.lobbyBlaze.toLocaleString("pt-BR")}`}
                        style={{ width: `${pct(f.lobbyBlaze)}%`, minWidth: f.lobbyBlaze > 0 ? 8 : 0, height: "100%", background: fluxoCor("lobby_blaze"), opacity: isHover ? 1 : 0.88, transition: "opacity 0.15s" }}
                      />
                    )}
                    {f.lobbyCda > 0 && (
                      <div
                        title={`${fluxoLabel("lobby_cda")}: ${f.lobbyCda.toLocaleString("pt-BR")}`}
                        style={{ width: `${pct(f.lobbyCda)}%`, minWidth: f.lobbyCda > 0 ? 8 : 0, height: "100%", background: fluxoCor("lobby_cda"), opacity: isHover ? 1 : 0.88, transition: "opacity 0.15s" }}
                      />
                    )}
                    {f.comercialCnpj > 0 && (
                      <div
                        title={`${fluxoLabel("comercial_cnpj")}: ${f.comercialCnpj.toLocaleString("pt-BR")}`}
                        style={{ width: `${pct(f.comercialCnpj)}%`, minWidth: f.comercialCnpj > 0 ? 8 : 0, height: "100%", background: fluxoCor("comercial_cnpj"), opacity: isHover ? 1 : 0.88, transition: "opacity 0.15s" }}
                      />
                    )}
                    {Object.entries(f.emails).filter(([, n]) => n > 0).map(([tipo, n]) => (
                      <div
                        key={tipo}
                        title={`${fluxoLabel(tipo)}: ${n.toLocaleString("pt-BR")}`}
                        style={{ width: `${pct(n)}%`, minWidth: 8, height: "100%", background: fluxoCor(tipo), opacity: isHover ? 1 : 0.88, transition: "opacity 0.15s" }}
                      />
                    ))}
                  </div>
                  <span style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 700, color: t.text, minWidth: 40, textAlign: "right" }}>
                    {f.total.toLocaleString("pt-BR")}
                  </span>

                  {/* Tooltip on hover */}
                  {isHover && f.total > 0 && (
                    <div style={{
                      position: "absolute",
                      left: fluxoLabelNarrow ? 88 : 110,
                      top: "50%",
                      transform: "translateY(-50%)",
                      marginLeft: 4,
                      padding: "8px 12px",
                      background: t.cardBg,
                      border: `1px solid ${t.cardBorder}`,
                      borderRadius: 8,
                      boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
                      fontSize: 12,
                      fontFamily: FONT.body,
                      color: t.text,
                      zIndex: 10,
                      maxWidth: "calc(100% - 120px)",
                      overflow: "hidden",
                    }}>
                      {f.cda > 0 && <div style={{ padding: "2px 0" }}><span style={{ color: fluxoCor("cda"), fontWeight: 600 }} aria-hidden="true">●</span> {fluxoLabel("cda")}: {f.cda.toLocaleString("pt-BR")}</div>}
                      {f.social > 0 && <div style={{ padding: "2px 0" }}><span style={{ color: fluxoCor("social"), fontWeight: 600 }} aria-hidden="true">●</span> {fluxoLabel("social")}: {f.social.toLocaleString("pt-BR")}</div>}
                      {f.spinRss > 0 && <div style={{ padding: "2px 0" }}><span style={{ color: fluxoCor("spin_rss"), fontWeight: 600 }} aria-hidden="true">●</span> {fluxoLabel("spin_rss")}: {f.spinRss.toLocaleString("pt-BR")}</div>}
                      {f.lobbyBlaze > 0 && <div style={{ padding: "2px 0" }}><span style={{ color: fluxoCor("lobby_blaze"), fontWeight: 600 }} aria-hidden="true">●</span> {fluxoLabel("lobby_blaze")}: {f.lobbyBlaze.toLocaleString("pt-BR")}</div>}
                      {f.lobbyCda > 0 && <div style={{ padding: "2px 0" }}><span style={{ color: fluxoCor("lobby_cda"), fontWeight: 600 }} aria-hidden="true">●</span> {fluxoLabel("lobby_cda")}: {f.lobbyCda.toLocaleString("pt-BR")}</div>}
                      {f.comercialCnpj > 0 && <div style={{ padding: "2px 0" }}><span style={{ color: fluxoCor("comercial_cnpj"), fontWeight: 600 }} aria-hidden="true">●</span> {fluxoLabel("comercial_cnpj")}: {f.comercialCnpj.toLocaleString("pt-BR")}</div>}
                      {Object.entries(f.emails).filter(([, n]) => n > 0).map(([tipo, n]) => (
                        <div key={tipo} style={{ padding: "2px 0" }}><span style={{ color: fluxoCor(tipo), fontWeight: 600 }} aria-hidden="true">●</span> {fluxoLabel(tipo)}: {n.toLocaleString("pt-BR")}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={pageBox}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: alertas.length === 0 ? 0 : 16,
          }}
        >
          <SectionTitle compact>Alertas</SectionTitle>
          {mostrarColunaAcao && (
            <button
              type="button"
              onClick={() => setConfirmarDiagnostico(true)}
              disabled={diagnosticoExecutando}
              style={btnAcao(diagnosticoExecutando)}
              aria-label="Executar diagnóstico da plataforma"
              title="Executar diagnóstico da plataforma"
            >
              <AcaoCtaContent
                executando={diagnosticoExecutando}
                label="Executar Diagnóstico"
                labelExecutando="Executando..."
                icon={<RefreshCw size={13} aria-hidden="true" />}
              />
            </button>
          )}
        </div>
        {alertas.length === 0 ? (
          <p style={{ color: BRAND.verde, fontFamily: FONT.body, fontSize: 14, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={16} color={BRAND.verde} aria-hidden="true" />
            Nenhum alerta no momento.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alertas.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px", borderRadius: 10,
                  background: a.nivel === "erro" ? `${BRAND.vermelho}12` : `${BRAND.amarelo}12`,
                  border: `1px solid ${a.nivel === "erro" ? `${BRAND.vermelho}44` : `${BRAND.amarelo}44`}`,
                  borderLeft: `${a.nivel === "erro" ? "4px" : "2px"} solid ${a.nivel === "erro" ? BRAND.vermelho : BRAND.amarelo}`,
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0, display: "flex" }}>
                  {a.nivel === "erro" ? (
                    <XCircle size={16} color={BRAND.vermelho} aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={16} color={BRAND.amarelo} aria-hidden="true" />
                  )}
                </span>
                <span style={{
                  fontFamily: FONT.body, fontSize: 13, color: t.text,
                  fontWeight: a.nivel === "erro" ? 700 : 400,
                }}>
                  {a.msg}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={pageBox}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SectionTitle compact>Logs Recentes</SectionTitle>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["1h", "24h", "48h"] as const).map((f) => {
              const ativo = logFiltro === f;
              const chip = tabAtivaPrincipalStyle(ativo, t.cardBorder, t.inputBg ?? t.bg);
              return (
              <button
                key={f}
                type="button"
                aria-pressed={ativo}
                aria-label={f === "1h" ? "Filtrar logs da última hora" : f === "24h" ? "Filtrar logs das últimas 24 horas" : "Filtrar logs das últimas 48 horas"}
                onClick={() => setLogFiltro(f)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: chip.border,
                  background: chip.background,
                  color: ativo ? chip.color : t.textMuted,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 12,
                  fontWeight: chip.fontWeight,
                }}
              >
                {f === "1h" ? "Última 1 hora" : f === "24h" ? "Últimas 24h" : "Últimas 48h"}
              </button>
            );
            })}
          </div>
        </div>

        {loading ? (
          <StatusTecnicoLoadingBlock />
        ) : techLogsFiltrados.length === 0 ? (
          <p style={{ color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>Nenhum log de erro no período.</p>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle()}>
              <caption style={{ display: "none" }}>Logs de erro recentes das integrações</caption>
              <thead>
                <tr>
                  <SortTableTh<LogSortCol>
                    label="Hora"
                    col="hora"
                    sortCol={sortLog.col}
                    sortDir={sortLog.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) =>
                      setSortLog((s) => ({
                        col: c,
                        dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                  <SortTableTh<LogSortCol>
                    label="Integração"
                    col="integracao"
                    sortCol={sortLog.col}
                    sortDir={sortLog.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) =>
                      setSortLog((s) => ({
                        col: c,
                        dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                  <SortTableTh<LogSortCol>
                    label="Tipo"
                    col="tipo"
                    sortCol={sortLog.col}
                    sortDir={sortLog.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) =>
                      setSortLog((s) => ({
                        col: c,
                        dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                  <SortTableTh<LogSortCol>
                    label="Descrição"
                    col="descricao"
                    sortCol={sortLog.col}
                    sortDir={sortLog.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) =>
                      setSortLog((s) => ({
                        col: c,
                        dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                </tr>
              </thead>
              <tbody>
                {techLogsOrdenados.map((log, idx) => {
                  const integracaoLabel = labelIntegracaoLog(log);
                  const zebra = dataTable.zebraRow(idx);
                  return (
                    <tr
                      key={log.id}
                      style={{ background: zebra }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = tableRowHoverBg(t.isDark);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = zebra;
                      }}
                    >
                      <td style={dataTable.tdCenter}>{formatarHora(log.created_at)}</td>
                      <td style={dataTable.tdCenter}>{integracaoLabel}</td>
                      <td style={dataTable.tdCenter}>
                        <code style={{ background: t.cardBorder, padding: "2px 6px", borderRadius: 4, fontSize: 11, fontFamily: FONT.body }}>{labelTipoTechLog(log.tipo)}</code>
                      </td>
                      <td style={dataTable.tdCenter}>{log.descricao}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={pageBox}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <SectionTitle compact sub="check-in de prestadores">
            Redes permitidas
          </SectionTitle>
          {perm.canEditarOk ? (
            <CtaCriarButton
              type="button"
              onClick={() => {
                setCidrErroForm(null);
                setNovoCidr("");
                setNovoRotuloCidr("");
                setModalCidrAdicionar(true);
              }}
              disabledBackground={BRAND.cinza}
              aria-label="Nova Rede"
            >
              Nova Rede
            </CtaCriarButton>
          ) : null}
        </div>
        {loading ? (
          <StatusTecnicoLoadingBlock />
        ) : cidrRows.length === 0 ? (
          <p style={{ color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>
            Nenhum prefixo configurado. O Check-in/Check-out de prestadores fica bloqueado até existir pelo menos um CIDR.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {cidrRows.map((row) => (
              <li
                key={row.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <code style={{
                    fontFamily: FONT.body,
                    fontSize: 14,
                    fontWeight: 700,
                    color: t.text,
                    wordBreak: "break-all",
                  }}>
                    {String(row.cidr)}
                  </code>
                  {row.rotulo?.trim() ? (
                    <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginTop: 4 }}>
                      {row.rotulo}
                    </div>
                  ) : null}
                </div>
                {perm.canEditarOk && (
                  <BtnExcluirLinha
                    labelAcao={tooltipExcluir("prefixo")}
                    onClick={() => {
                      setCidrErroExcluir(null);
                      setCidrExcluir(row);
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={pageBox}>
        <SectionTitle sub="Condições monitoradas automaticamente">
          Configuração de Alertas
        </SectionTitle>
        {loading ? (
          <StatusTecnicoLoadingBlock />
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle()}>
              <caption style={{ display: "none" }}>Condições monitoradas para alertas automáticos</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>Alerta</th>
                  <th scope="col" style={dataTable.thHeader}>Condição</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Nenhum Sync CDA Influencers com sucesso", "Último sync com falha, nenhum OK (slug casa_apostas)"],
                  ["Sync CDA Influencers não executou hoje (agendado 4h)", "Após 8h BRT, sem sync_logs OK na data civil de hoje (SP); cron 4h"],
                  ["Taxa de erro alta no Sync CDA Influencers", "> 5% (slug casa_apostas)"],
                  ["Nenhum Sync CDA Afiliados com sucesso", "Último sync com falha, nenhum OK (slug casa_apostas_afiliados)"],
                  ["Sync CDA Afiliados não executou hoje (agendado 4h)", "Após 8h BRT, sem sync_logs OK na data civil de hoje (SP); cron 4h"],
                  ["Taxa de erro alta no Sync CDA Afiliados", "> 5% (slug casa_apostas_afiliados)"],
                  ["Sync CDA sem dados recentes", "Após 8h BRT, sem influencer_metricas com data = ontem (D-1), com histórico"],
                  ["Erro no Sync Social Media", "pipeline_runs status=error (24h)"],
                  ["Sync Social Media com erro", "tech_logs canal (24h)"],
                  ["Sync Social Media sem dados recentes", "Sem kpi_daily em 3 dias (com histórico)"],
                  ["Sync Social Media não executou hoje (agendado 6h)", "Após 6h BRT, sem pipeline_runs success na data de hoje (SP)"],
                  ["Erro ao enviar E-mail - Relatório de Influencers (Resend)", "tech_logs relatorio_diretoria (24h)"],
                  ["E-mail - Relatório de Influencers (Resend) não enviado hoje (agendado 6h)", "Após 6h BRT, sem email_envios na data civil de hoje (tipo relatorio_diretoria)"],
                  ["Erro ao enviar E-mail - Agenda do dia (Resend)", "tech_logs email_agenda_diaria (24h)"],
                  ["E-mail - Agenda do dia (Resend) não enviado hoje (agendado 6h)", "Após 6h BRT, sem email_envios na data civil de hoje (tipo email_agenda_diaria)"],
                  ["Erro ao enviar E-mail de Boas-vindas (Resend)", "tech_logs boas_vindas (24h)"],
                  ["Erro ao enviar E-mail de Reset de Senha (Resend)", "tech_logs recuperar_senha (24h)"],
                  ["Nenhuma ingestão Spin na Rede (RSS) com sucesso", "Último sync_logs com falha, nenhum OK (slug spin_na_rede_rss)"],
                  ["Ingestão Spin na Rede (RSS) não executou hoje (agendado 6h)", "Após 6h BRT, sem sync_logs OK na data civil de hoje (slug spin_na_rede_rss)"],
                  ["Taxa de erro alta na ingestão Spin na Rede (RSS)", "> 5% em sync_logs (slug spin_na_rede_rss)"],
                  ["Nenhum sync Pipeline B2B — Lista SPA/MF com sucesso", "Último sync_logs com falha, nenhum OK (slug comercial_spa_lista)"],
                  ["Importação Lista SPA/MF não executou hoje (agendado 7h30)", "Após 7h BRT, sem sync_logs OK na data civil de hoje (slug comercial_spa_lista)"],
                  ["Taxa de erro alta na importação Lista SPA/MF", "> 5% em sync_logs (slug comercial_spa_lista)"],
                  [
                    `Nenhuma ${LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO} com sucesso`,
                    "Último sync_logs com falha, nenhum OK (slug comercial_dominio_validacao)",
                  ],
                  [
                    `${LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO} não executou hoje (agendado 8h)`,
                    "Após 8h BRT, sem sync_logs OK na data civil de hoje (slug comercial_dominio_validacao)",
                  ],
                  [
                    `Taxa de erro alta em ${LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO}`,
                    "> 5% em sync_logs (slug comercial_dominio_validacao)",
                  ],
                  [
                    `Nenhum enriquecimento ${LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE} com sucesso`,
                    "Último sync_logs com falha, nenhum OK (slug comercial_cnpj_enriquecimento)",
                  ],
                  [
                    `${LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE} não executou hoje (agendado 8h30)`,
                    "Após 9h BRT, sem sync_logs OK na data civil de hoje (slug comercial_cnpj_enriquecimento)",
                  ],
                  [
                    `Taxa de erro alta em ${LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE}`,
                    "> 5% em sync_logs (slug comercial_cnpj_enriquecimento)",
                  ],
                  ["Nenhuma coleta Lobby Blaze com sucesso", "Último sync_logs com falha, nenhum OK (slug lobby_blaze)"],
                  ["Coleta Lobby Blaze atrasada", "> 24h sem sync_logs OK"],
                  ["Taxa de erro alta no Lobby Blaze", "> 5% em sync_logs (slug lobby_blaze)"],
                ].map(([alerta, condicao], idx) => (
                  <tr
                    key={alerta}
                    style={{ background: dataTable.zebraRow(idx) }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = tableRowHoverBg(t.isDark);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = dataTable.zebraRow(idx);
                    }}
                  >
                    <td style={dataTable.tdCenter}>{alerta}</td>
                    <td style={dataTable.tdCenter}>{condicao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(confirmarSync || confirmarEmail || confirmarDiagnostico) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-tecnico-confirm-title"
          style={{
            position: "fixed",
            inset: 0,
            background: MODAL_OVERLAY_BG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmarSync(null);
              setConfirmarEmail(null);
              setConfirmarDiagnostico(false);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 16,
              padding: 24,
              maxWidth: 420,
              width: "100%",
            }}
          >
            <h2 id="status-tecnico-confirm-title" style={{ marginTop: 0, fontFamily: FONT_TITLE, fontSize: 17, color: t.text }}>
              {confirmarSync === "cda" && "Confirmar Sync CDA — Influencers"}
              {confirmarSync === "cda_afiliados" && "Confirmar Sync CDA — Afiliados"}
              {confirmarSync === "social" && "Confirmar Sync Social"}
              {confirmarSync === "spin_rss" && "Confirmar ingestão Spin na Rede (RSS)"}
              {confirmarSync === "cs_outlook" && `Confirmar ingestão ${LABEL_UI_CS_ATENDIMENTO_OUTLOOK}`}
              {confirmarSync === "comercial_spa" && `Confirmar importação ${LABEL_UI_COMERCIAL_SPA_LISTA}`}
              {confirmarSync === "comercial_dominio" &&
                `Confirmar ${LABEL_UI_COMERCIAL_DOMINIO_VALIDACAO}`}
              {confirmarSync === "comercial_cnpj" &&
                `Confirmar enriquecimento ${LABEL_UI_COMERCIAL_CNPJ_ESTADO_CIDADE}`}
              {confirmarSync === "lobby_blaze" && "Confirmar coleta Lobby Blaze"}
              {confirmarEmail === "diretoria" && "Confirmar envio — E-mail de Relatório"}
              {confirmarEmail === "agenda" && "Confirmar envio — E-mail de Agenda"}
              {confirmarDiagnostico && "Executar diagnóstico da plataforma"}
            </h2>
            <p style={{ fontFamily: FONT.body, fontSize: 14, color: t.textMuted, marginBottom: 0 }}>
              {confirmarDiagnostico
                ? "Serão verificados jobs recentes, credenciais e integrações. O resultado aparece em Logs Recentes (última 1 hora). Não dispara sync nem e-mails. Continuar?"
                : confirmarSync
                  ? "Esta ação irá sincronizar dados conforme a configuração do período. Continuar?"
                  : "Esta ação irá disparar o envio do e-mail. Continuar?"}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  setConfirmarSync(null);
                  setConfirmarEmail(null);
                  setConfirmarDiagnostico(false);
                }}
                style={{
                  background: "transparent",
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 10,
                  padding: "9px 16px",
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  color: t.text,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmarDiagnostico) {
                    setConfirmarDiagnostico(false);
                    void executarDiagnosticoPlataforma();
                  } else if (confirmarSync === "cda") {
                    setConfirmarSync(null);
                    void executarSync("influencers");
                  } else if (confirmarSync === "cda_afiliados") {
                    setConfirmarSync(null);
                    void executarSync("afiliados");
                  } else if (confirmarSync === "social") {
                    setConfirmarSync(null);
                    void executarSyncSocial();
                  } else if (confirmarSync === "spin_rss") {
                    setConfirmarSync(null);
                    void executarSyncSpinRss();
                  } else if (confirmarSync === "cs_outlook") {
                    setConfirmarSync(null);
                    void executarSyncCsOutlook();
                  } else if (confirmarSync === "comercial_spa") {
                    setConfirmarSync(null);
                    void executarSyncComercialSpa();
                  } else if (confirmarSync === "comercial_dominio") {
                    setConfirmarSync(null);
                    void executarSyncComercialDominio();
                  } else if (confirmarSync === "comercial_cnpj") {
                    setConfirmarSync(null);
                    void executarSyncComercialCnpj();
                  } else if (confirmarSync === "lobby_blaze") {
                    setConfirmarSync(null);
                    void executarSyncLobbyBlaze();
                  } else if (confirmarEmail === "diretoria") {
                    setConfirmarEmail(null);
                    void enviarEmailDiretoria();
                  } else if (confirmarEmail === "agenda") {
                    setConfirmarEmail(null);
                    void enviarEmailAgenda();
                  }
                }}
                style={{
                  background: ctaGradientStatus(dashBrand, false, BRAND.cinza),
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 16px",
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalCidrAdicionarStatusTecnico
        open={modalCidrAdicionar}
        t={t}
        brand={dashBrand}
        cidr={novoCidr}
        rotulo={novoRotuloCidr}
        erro={cidrErroForm}
        salvando={cidrSalvando}
        inputRef={cidrInputRef}
        onCidrChange={setNovoCidr}
        onRotuloChange={setNovoRotuloCidr}
        onClose={() => {
          if (!cidrSalvando) setModalCidrAdicionar(false);
        }}
        onSalvar={() => void salvarCidrAllowlist()}
      />

      {cidrExcluir && (
        <ModalConfirmExcluirPadrao
          descricaoItem={descricaoModalExcluirItem(
            "o prefixo",
            String(cidrExcluir.cidr),
            "da lista de allowlist",
          )}
          onCancel={() => {
            if (!cidrExcluindo) setCidrExcluir(null);
            setCidrErroExcluir(null);
          }}
          onConfirm={() => void excluirCidrConfirmado()}
          loading={cidrExcluindo}
          error={cidrErroExcluir}
          zIndex={2100}
        />
      )}
    </div>
  );
}
