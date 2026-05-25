import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, supabaseUrl, supabaseAnonKey } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BRAND_SEMANTIC as BRAND, FONT, FONT_TITLE } from "../../../constants/theme";
import { MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart2,
  Bell,
  CheckCircle2,
  FileText,
  Loader2,
  MonitorCheck,
  Network,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { ModalConfirmDelete } from "../../../components/OperacoesModal";
import { GestaoUsuariosLoading } from "../GestaoUsuarios/gestaoUsuariosUi";
import { tabAtivaPrincipalStyle } from "../GestaoUsuarios/gestaoUsuariosHelpers";
import {
  ctaGradientStatus,
  ERRO_EMAIL_AGENDA,
  ERRO_EMAIL_DIRETORIA,
  ERRO_REDE_EDGE,
  ERRO_SYNC_CDA,
  ERRO_SYNC_LOBBY_BLAZE,
  ERRO_SYNC_SOCIAL,
  ERRO_SYNC_SPIN_RSS,
  MODAL_OVERLAY_BG,
  MSG_SEM_PERMISSAO,
  tableRowHoverBg,
} from "./statusTecnicoHelpers";
import { AcaoCtaContent, StatusTecnicoLoadingBlock } from "./statusTecnicoUi";

/** Upload OCR PLS removido do produto — ocultar mesmo se a linha ainda existir em `integrations`. */
const SLUG_INTEGRACAO_PLS_UPLOAD_RETIRADA = "upload_pls_daily_commercial";

// ─── StatusSectionTitle (padrão da plataforma — não colidir com shared SectionTitle) ──
function StatusSectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
      <span style={{
        width: 28, height: 28, borderRadius: 8,
        background: brand.primaryIconBg,
        border: brand.primaryIconBorder,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: brand.primaryIconColor, flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{
        fontSize: 14, fontWeight: 800, color: t.text,
        fontFamily: FONT_TITLE,
        letterSpacing: "0.05em", textTransform: "uppercase" as const,
      }}>
        {children}
      </span>
    </div>
  );
}

// ─── StatusKpiCard (accent bar — nomenclatura distinta do KpiCard shared) ─────
function StatusKpiCard({ label, value, accentColor, loading }: {
  label: string; value: React.ReactNode; accentColor: string; loading?: boolean;
}) {
  const { theme: t } = useApp();
  return (
    <div style={{
      background: t.cardBg, borderRadius: 16,
      border: `1px solid ${t.cardBorder}`, overflow: "hidden",
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
      <div style={{ padding: "18px 20px" }}>
        <p style={{
          fontFamily: FONT.body, fontSize: 11, fontWeight: 700,
          color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px",
          margin: "0 0 10px",
        }}>
          {label}
        </p>
        <div style={{
          fontFamily: FONT.body, fontSize: 28, fontWeight: 800,
          color: t.text, margin: 0, lineHeight: 1.1,
        }}>
          {loading ? "—" : value}
        </div>
      </div>
    </div>
  );
}

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
  /** Registros processados (inseridos + atualizados) nos sync_logs da ingestão RSS Spin na Rede, por dia (UTC da data do log). */
  spinRss: number;
  /** Mesas localizadas no lobby (sync_logs lobby_blaze, campo registros_inseridos). */
  lobbyBlaze: number;
  /** Mesas localizadas no lobby CDA (sync_logs lobby_cda). */
  lobbyCda: number;
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
  const [syncSocialExecutando, setSyncSocialExecutando] = useState(false);
  const [syncSocialMensagem, setSyncSocialMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [syncSpinRssExecutando, setSyncSpinRssExecutando] = useState(false);
  const [syncSpinRssMensagem, setSyncSpinRssMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
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
  const [emailEnviosCount, setEmailEnviosCount] = useState(0);
  const [logFiltro, setLogFiltro] = useState<"1h" | "24h" | "48h">("24h");
  const [fluxoHover, setFluxoHover] = useState<string | null>(null);
  const [confirmarSync, setConfirmarSync] = useState<"cda" | "social" | "spin_rss" | "lobby_blaze" | null>(null);
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
  const card: React.CSSProperties = {
    background: t.cardBg,
    borderRadius: 16,
    padding: 24,
    border: `1px solid ${t.cardBorder}`,
  };
  const cidrInputRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const hoje = new Date().toISOString().split("T")[0];

    // Integrações (sem upload PLS — descontinuado; pode sobrar linha no DB até migração)
    const { data: intData } = await supabase.from("integrations").select("*").eq("ativo", true);
    setIntegrations(
      (intData ?? []).filter((i) => i.slug !== SLUG_INTEGRACAO_PLS_UPLOAD_RETIRADA),
    );

    // Sync logs (últimos 7 dias)
    const { data: syncDataRaw } = await supabase
      .from("sync_logs")
      .select("*")
      .order("executado_em", { ascending: false })
      .limit(100);
    const syncData = syncDataRaw ?? [];
    setSyncLogs(syncData);

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

    // Fluxo de dados (últimos 14 dias) — CDA, Social Media, E-mails
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 14);
    const dataInicioStr = dataInicio.toISOString().split("T")[0];

    const [resCda, resSocial, resEmails, resSpinSync, resLobbyBlazeSync, resLobbyCdaSync] = await Promise.all([
      supabase.from("influencer_metricas").select("data").gte("data", dataInicioStr),
      supabase.from("kpi_daily").select("date").gte("date", dataInicioStr),
      supabase.from("email_envios").select("data, tipo, destinatarios_count, created_at").gte("data", dataInicioStr),
      supabase
        .from("sync_logs")
        .select("executado_em, registros_inseridos, registros_atualizados")
        .eq("integracao_slug", "spin_na_rede_rss")
        .gte("executado_em", `${dataInicioStr}T00:00:00.000Z`)
        .order("executado_em", { ascending: false })
        .limit(500),
      supabase
        .from("sync_logs")
        .select("executado_em, registros_inseridos, status")
        .eq("integracao_slug", "lobby_blaze")
        .gte("executado_em", `${dataInicioStr}T00:00:00.000Z`)
        .order("executado_em", { ascending: false })
        .limit(500),
      supabase
        .from("sync_logs")
        .select("executado_em, registros_inseridos, status")
        .eq("integracao_slug", "lobby_cda")
        .gte("executado_em", `${dataInicioStr}T00:00:00.000Z`)
        .order("executado_em", { ascending: false })
        .limit(500),
    ]);

    const agregarSyncPorData = (
      rows: { executado_em: string; registros_inseridos: number | null; registros_atualizados?: number | null; status?: string }[],
    ) =>
      rows.reduce<Record<string, number>>((acc, row) => {
        if (row.status === "falha") return acc;
        const d = row.executado_em?.split("T")[0];
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
    setEmailEnviosCount((resEmails.data ?? []).length);

    const datasSet = new Set<string>([
      ...Object.keys(cdaPorData),
      ...Object.keys(socialPorData),
      ...Object.keys(spinPorData),
      ...Object.keys(lobbyBlazePorData),
      ...Object.keys(lobbyCdaPorData),
      ...Object.keys(emailsPorData),
      hoje,
    ]);
    const fluxoArray: FluxoDia[] = Array.from(datasSet)
      .sort((a, b) => a.localeCompare(b))
      .map((data) => {
        const cda = cdaPorData[data] ?? 0;
        const social = socialPorData[data] ?? 0;
        const spinRss = spinPorData[data] ?? 0;
        const lobbyBlaze = lobbyBlazePorData[data] ?? 0;
        const lobbyCda = lobbyCdaPorData[data] ?? 0;
        const emails = emailsPorData[data] ?? {};
        const emailTotal = Object.values(emails).reduce((s, n) => s + n, 0);
        return {
          data,
          cda,
          social,
          spinRss,
          lobbyBlaze,
          lobbyCda,
          emails,
          total: cda + social + spinRss + lobbyBlaze + lobbyCda + emailTotal,
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
    carregar();
    const interval = setInterval(carregar, 60000); // refresh a cada 1 min
    return () => clearInterval(interval);
  }, [carregar, perm.canView]);

  useEffect(() => {
    if (confirmarSync == null && confirmarEmail == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setConfirmarSync(null);
        setConfirmarEmail(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmarSync, confirmarEmail]);

  useEffect(() => {
    const onResize = () => setFluxoLabelNarrow(window.innerWidth < 480);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const executarSync = async () => {
    if (syncExecutando || !perm.canEditarOk) return;
    setSyncExecutando(true);
    setSyncMensagem(null);
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setSyncMensagem({ tipo: "erro", texto: "Configuração do Supabase incompleta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env." });
        setSyncExecutando(false);
        return;
      }
      const hoje = new Date();
      const dataFim = hoje.toISOString().split("T")[0];
      const dataInicio = "2025-12-01";

      // Usa supabase.functions.invoke — gerencia URL, CORS e auth automaticamente
      const { data: resDataRaw, error: invokeError } = await supabase.functions.invoke("sync-metricas-cda", {
        body: { data_inicio: dataInicio, data_fim: dataFim },
      });

      const resData = (resDataRaw ?? {}) as {
        ok?: boolean;
        erro?: string;
        error?: string;
        auth_usado?: string;
        fase1_influencers?: { registros_upserted?: number; aliases_mapeados?: number };
      };

      // invokeError = problema de rede ou função retornou 4xx/5xx
      if (invokeError) {
        const im = invokeError.message ?? "";
        let texto =
          typeof resData.erro === "string" && resData.erro.length > 0 ? resData.erro : ERRO_SYNC_CDA;
        if (im.includes("Failed to fetch") || im.includes("fetch")) {
          texto = ERRO_REDE_EDGE;
        } else if (im.includes("401") || im.includes("unauthorized")) {
          texto = "Não autorizado. Verifique no Supabase se a Edge Function sync-metricas-cda está implantada.";
        } else if (im.includes("404") || im.includes("not found")) {
          texto = "Edge Function sync-metricas-cda não encontrada. Execute: supabase functions deploy sync-metricas-cda";
        }
        setSyncMensagem({ tipo: "erro", texto });
        setSyncExecutando(false);
        return;
      }

      // Função retornou 200 mas pode ter ok: false no payload
      if (!resData?.ok) {
        let textoErro = resData?.erro ?? resData?.error ?? "Erro desconhecido";
        if (resData?.auth_usado) textoErro += ` (Auth: ${resData.auth_usado})`;
        if (textoErro.includes("403") || textoErro.includes("CDA")) {
          textoErro += " Configure CDA_INFLUENCERS_API_KEY ou CDA_USE_REPORTING_API=true em Supabase → Edge Functions → Secrets.";
        }
        setSyncMensagem({ tipo: "erro", texto: textoErro });
        setSyncExecutando(false);
        return;
      }

      const regs = resData?.fase1_influencers?.registros_upserted ?? 0;
      const aliases = resData?.fase1_influencers?.aliases_mapeados ?? 0;
      setSyncMensagem({
        tipo: "ok",
        texto: `Sync concluído: ${regs} registros sincronizados${aliases > 0 ? ` (${aliases} aliases mapeados)` : ""}. Atualize os dashboards. Se não aparecer, selecione o mês correto no filtro do relatório (ex.: Mar 2026).`,
      });
      carregar();
    } catch (e) {
      console.error(e);
      setSyncMensagem({ tipo: "erro", texto: ERRO_SYNC_CDA });
    } finally {
      setSyncExecutando(false);
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
  const hojeIsoKpi = new Date().toISOString().split("T")[0];

  // Integrações Ativas: CDA, Social, e-mails — OK = último sync/execução com sucesso
  const ultimoSyncCdaLog = syncLogs.find((l) => l.integracao_slug === "casa_apostas");
  const cdaStatusOk = ultimoSyncCdaLog?.status === "ok";

  const ultimoSyncSpinRssLog = syncLogs.find((l) => l.integracao_slug === "spin_na_rede_rss");
  const spinNaRedeRssStatusOk = ultimoSyncSpinRssLog?.status === "ok";

  const ultimoSyncLobbyBlazeLog = syncLogs.find((l) => l.integracao_slug === "lobby_blaze");
  const lobbyBlazeStatusOk = ultimoSyncLobbyBlazeLog?.status === "ok";

  const ultimoSyncLobbyCdaLog = syncLogs.find((l) => l.integracao_slug === "lobby_cda");
  const lobbyCdaStatusOk = ultimoSyncLobbyCdaLog?.status === "ok";

  const ultimoPipelineRun = pipelineRuns.reduce<PipelineRun | null>((max, r) => {
    if (!max) return r;
    return new Date(r.created_at) > new Date(max.created_at) ? r : max;
  }, null);
  const socialStatusOk = ultimoPipelineRun?.status === "success";

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
  const emailStatusDiretoriaOk =
    !!emailUltimoDiretoria &&
    (!ultimoTechLogDiretoria || emailUltimoDiretoria >= ultimoTechLogDiretoria);
  const emailStatusAgendaOk =
    !!emailUltimoAgenda &&
    (!ultimoTechLogAgenda || emailUltimoAgenda >= ultimoTechLogAgenda);

  const integracoesAtivasCount = [
    cdaStatusOk,
    socialStatusOk,
    spinNaRedeRssStatusOk,
    lobbyBlazeStatusOk,
    lobbyCdaStatusOk,
    emailStatusDiretoriaOk,
    emailStatusAgendaOk,
  ].filter(Boolean).length;
  const totalIntegracoes = 7;

  // Último Sync: mais recente entre CDA, Social, Spin na Rede RSS e e-mails (por data de execução)
  const timestamps: Array<{ ts: string; label: string }> = [];
  if (ultimoSyncCdaLog?.executado_em) timestamps.push({ ts: ultimoSyncCdaLog.executado_em, label: "CDA" });
  if (ultimoPipelineRun?.created_at) timestamps.push({ ts: ultimoPipelineRun.created_at, label: "Social" });
  if (ultimoSyncSpinRssLog?.executado_em) timestamps.push({ ts: ultimoSyncSpinRssLog.executado_em, label: "Spin na Rede RSS" });
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
  const spinRssTotal = syncLogs.filter((l) => l.integracao_slug === "spin_na_rede_rss").length;
  const spinRssFalhas = syncLogs.filter((l) => l.integracao_slug === "spin_na_rede_rss" && l.status === "falha").length;
  const lobbyBlazeTotal = syncLogs.filter((l) => l.integracao_slug === "lobby_blaze").length;
  const lobbyBlazeFalhas = syncLogs.filter((l) => l.integracao_slug === "lobby_blaze" && l.status === "falha").length;
  const lobbyCdaTotal = syncLogs.filter((l) => l.integracao_slug === "lobby_cda").length;
  const lobbyCdaFalhas = syncLogs.filter((l) => l.integracao_slug === "lobby_cda" && l.status === "falha").length;
  const socialTotal = pipelineRuns.length;
  const socialFalhas = pipelineRuns.filter((r) => r.status === "error").length;
  const emailFalhas = techLogs.filter((l) =>
    l.tipo === "relatorio_diretoria" || l.tipo === "email_agenda_diaria",
  ).length;
  const emailTotal = emailEnviosCount + emailFalhas;
  const totalTentativas = cdaTotal + spinRssTotal + lobbyBlazeTotal + lobbyCdaTotal + socialTotal + Math.max(emailTotal, 1);
  const totalFalhas = cdaFalhas + spinRssFalhas + lobbyBlazeFalhas + lobbyCdaFalhas + socialFalhas + emailFalhas;
  const taxaErro = totalTentativas > 0 ? ((totalFalhas / totalTentativas) * 100).toFixed(1) : "0";

  // Alertas derivados — ordem: CDA, Social Media, E-mail
  const hojeIso = hojeIsoKpi;
  const alertas: Array<{ nivel: "erro" | "aviso"; msg: string }> = [];
  const vinteQuatroHoras = new Date();
  vinteQuatroHoras.setHours(vinteQuatroHoras.getHours() - 24);
  const trintaSeisHoras = new Date();
  trintaSeisHoras.setHours(trintaSeisHoras.getHours() - 36);

  // ── Sync CDA (Casa de Apostas) ──
  const syncLogsCda = syncLogs.filter((l) => l.integracao_slug === "casa_apostas");
  const ultimoSyncCdaOk = syncLogsCda.find((l) => l.status === "ok");
  const ultimoSyncCdaFalha = syncLogsCda.find((l) => l.status === "falha");
  const taxaErroCda = syncLogsCda.length > 0
    ? ((syncLogsCda.filter((l) => l.status === "falha").length / syncLogsCda.length) * 100).toFixed(1)
    : "0";

  if (!ultimoSyncCdaOk && ultimoSyncCdaFalha) {
    alertas.push({ nivel: "erro", msg: "Nenhum Sync CDA com sucesso" });
  } else if (ultimoSyncCdaOk) {
    const exec = new Date(ultimoSyncCdaOk.executado_em);
    if (exec < vinteQuatroHoras) {
      alertas.push({ nivel: "aviso", msg: "Sync CDA atrasado" });
    }
  }
  if (parseFloat(taxaErroCda) > 5) {
    alertas.push({ nivel: "erro", msg: `Taxa de erro alta no Sync CDA (${taxaErroCda}%)` });
  }
  if (registrosHoje === 0 && fluxoDados.some((f) => f.cda > 0)) {
    alertas.push({ nivel: "aviso", msg: "Sync CDA sem dados recentes" });
  }

  // ── Sync Social Media ──
  const pipelineErros24h = pipelineRuns.filter((r) => {
    const created = new Date(r.created_at);
    return r.status === "error" && created >= vinteQuatroHoras;
  });
  const techLogsSocial24h = techLogs.filter((l) => {
    const created = new Date(l.created_at);
    return ["instagram", "facebook", "youtube", "linkedin"].includes(l.tipo) && created >= vinteQuatroHoras;
  });
  const ultimoPipelineOk = pipelineRuns.find((r) => r.status === "success");
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const anteontem = new Date();
  anteontem.setDate(anteontem.getDate() - 2);
  const ontemIso = ontem.toISOString().split("T")[0];
  const anteontemIso = anteontem.toISOString().split("T")[0];
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
  if (socialTeveDadosAntes && !socialTemDadosRecentes) {
    alertas.push({ nivel: "aviso", msg: "Sync Social Media sem dados recentes" });
  }
  if (ultimoPipelineOk) {
    const exec = new Date(ultimoPipelineOk.created_at);
    if (exec < trintaSeisHoras) {
      alertas.push({ nivel: "aviso", msg: "Sync Social Media atrasado" });
    }
  } else if (pipelineRuns.length > 0 && socialTeveDadosAntes) {
    alertas.push({ nivel: "aviso", msg: "Sync Social Media atrasado" });
  }

  // ── E-mail para diretoria ──
  const techLogsEmailDir24h = techLogs.filter((l) => {
    const created = new Date(l.created_at);
    return l.tipo === "relatorio_diretoria" && created >= vinteQuatroHoras;
  });
  const emailEnviadoHojeDir =
    (fluxoDados.find((f) => f.data === hojeIso)?.emails?.relatorio_diretoria ?? 0) > 0;

  if (techLogsEmailDir24h.length > 0) {
    alertas.push({ nivel: "erro", msg: "Erro ao enviar E-mail - Relatório de Influencers (Resend)" });
  }
  if (!emailEnviadoHojeDir) {
    alertas.push({ nivel: "aviso", msg: "E-mail - Relatório de Influencers (Resend) não enviado hoje" });
  }

  // ── E-mail agenda (operacional) ──
  const techLogsEmailAgenda24h = techLogs.filter((l) => {
    const created = new Date(l.created_at);
    return l.tipo === "email_agenda_diaria" && created >= vinteQuatroHoras;
  });
  const emailEnviadoHojeAgenda =
    (fluxoDados.find((f) => f.data === hojeIso)?.emails?.email_agenda_diaria ?? 0) > 0;

  if (techLogsEmailAgenda24h.length > 0) {
    alertas.push({ nivel: "erro", msg: "Erro ao enviar E-mail - Agenda do dia (Resend)" });
  }
  if (!emailEnviadoHojeAgenda) {
    alertas.push({ nivel: "aviso", msg: "E-mail - Agenda do dia (Resend) não enviado hoje" });
  }

  // ── Ingest Spin na Rede (RSS) ──
  const syncLogsSpinRss = syncLogs.filter((l) => l.integracao_slug === "spin_na_rede_rss");
  const ultimoSyncSpinRssOk = syncLogsSpinRss.find((l) => l.status === "ok");
  const ultimoSyncSpinRssFalha = syncLogsSpinRss.find((l) => l.status === "falha");
  const taxaErroSpinRss = syncLogsSpinRss.length > 0
    ? ((syncLogsSpinRss.filter((l) => l.status === "falha").length / syncLogsSpinRss.length) * 100).toFixed(1)
    : "0";

  if (syncLogsSpinRss.length > 0 && !ultimoSyncSpinRssOk && ultimoSyncSpinRssFalha) {
    alertas.push({ nivel: "erro", msg: "Nenhum ingest Spin na Rede (RSS) com sucesso" });
  } else if (ultimoSyncSpinRssOk) {
    const exec = new Date(ultimoSyncSpinRssOk.executado_em);
    if (exec < vinteQuatroHoras) {
      alertas.push({ nivel: "aviso", msg: "Ingest Spin na Rede (RSS) atrasada (> 24h sem execução OK)" });
    }
  }
  if (parseFloat(taxaErroSpinRss) > 5 && syncLogsSpinRss.length > 0) {
    alertas.push({ nivel: "erro", msg: `Taxa de erro alta no ingest Spin na Rede RSS (${taxaErroSpinRss}%)` });
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
  const statusPorIntegracao = integrations
    .map((int) => {
    const logsInt = syncLogs.filter((l) => l.integracao_slug === int.slug);
    const ultimo = logsInt[0];
    const syncsHoje = logsInt.filter((l) => l.executado_em?.startsWith(hojeIso));
    const regsHoje = syncsHoje.reduce((s, l) => s + (l.registros_inseridos ?? 0) + (l.registros_atualizados ?? 0), 0);
    // Se não teve sync hoje, usar último ok como fallback
    const regsExibir = regsHoje || (ultimo?.status === "ok" ? (ultimo.registros_inseridos ?? 0) + (ultimo.registros_atualizados ?? 0) : 0);
    let status: "ok" | "warning" | "falha" = "ok";
    if (!ultimo) status = "falha";
    else if (ultimo.status === "falha") status = "falha";
    else if (ultimo.erros_count && ultimo.erros_count > 0) status = "warning";
    const syncTipo =
      int.slug === "casa_apostas"
        ? ("cda" as const)
        : int.slug === "spin_na_rede_rss"
          ? ("spin_rss" as const)
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
  });

  // Linha Social Media KPIs — dados de pipeline_runs e fluxoDados
  const fluxoHojeSocial = fluxoDados.find((f) => f.data === hojeIso);
  const socialKpisRow = {
    slug: "social_kpis",
    nome: "Social Media KPIs",
    descricao: "ETL Instagram, Facebook, YouTube, LinkedIn",
    ativo: true,
    ultimoSync: ultimoPipelineRun?.created_at ?? null,
    registrosHoje: fluxoHojeSocial?.social ?? 0,
    erros: pipelineRuns.filter((r) => r.status === "error").length,
    status: (ultimoPipelineRun?.status === "success" ? "ok" : ultimoPipelineRun?.status === "error" ? "falha" : "warning") as "ok" | "warning" | "falha",
    syncTipo: "social" as const,
  };
  // Linha E-mail para diretoria — dados de email_envios e tech_logs
  const emailDiretoriaRow = {
    slug: "email_diretoria",
    nome: "Enviar e-mail para diretoria",
    ultimoSync: emailUltimoDiretoria,
    registrosHoje: fluxoHojeSocial?.emails?.relatorio_diretoria ?? 0,
    erros: techLogs.filter((l) => l.tipo === "relatorio_diretoria").length,
    status: (emailStatusDiretoriaOk ? "ok" : "falha") as "ok" | "warning" | "falha",
    syncTipo: "email" as const,
  };
  const emailAgendaRow = {
    slug: "email_agenda",
    nome: "Enviar e-mail de Agenda",
    ultimoSync: emailUltimoAgenda,
    registrosHoje: fluxoHojeSocial?.emails?.email_agenda_diaria ?? 0,
    erros: techLogs.filter((l) => l.tipo === "email_agenda_diaria").length,
    status: (emailStatusAgendaOk ? "ok" : "falha") as "ok" | "warning" | "falha",
    syncTipo: "email_agenda" as const,
  };

  const linhasCompletas = [...statusPorIntegracao, socialKpisRow, emailDiretoriaRow, emailAgendaRow];

  const fluxoLabel = (k: string) =>
    ({
      cda: "CDA (Casa de Apostas)",
      social: "Social Media",
      spin_rss: "Spin na Rede (RSS)",
      lobby_blaze: "Lobby Blaze",
      lobby_cda: "Lobby CDA",
      relatorio_diretoria: "E-mail: Relatório Diretoria",
      email_agenda_diaria: "E-mail: Agenda do dia",
    }[k] ?? `E-mail: ${k}`);
  const fluxoCor = (k: string) =>
    ({
      cda: BRAND.roxoVivo,
      social: BRAND.azul,
      spin_rss: "#a78bfa",
      lobby_blaze: "#f97316",
      lobby_cda: "#0ea5e9",
      relatorio_diretoria: BRAND.verde,
      email_agenda_diaria: "#14b8a6",
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
        setCidrErroForm(error.message.includes("cidr") ? "CIDR inválido ou duplicado." : "Não foi possível guardar.");
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

  useEffect(() => {
    if (!modalCidrAdicionar) return;
    const id = window.setTimeout(() => cidrInputRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, [modalCidrAdicionar]);

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

  return (
    <div className="app-page-shell" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Header — padrão da plataforma ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: dashBrand.primaryIconBg,
          border: dashBrand.primaryIconBorder,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: dashBrand.primaryIconColor, flexShrink: 0,
        }}>
          <MonitorCheck size={14} aria-hidden="true" />
        </span>
        <div>
          <h1 style={{ fontFamily: FONT_TITLE, fontSize: 22, fontWeight: 800, color: dashBrand.primary, margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Status Técnico
          </h1>
          <p style={{ color: t.textMuted, margin: "4px 0 0", fontFamily: FONT.body, fontSize: 13 }}>
            Monitore integrações, alertas automáticos e sincronizações da plataforma.
          </p>
        </div>
      </div>

      {/* ── KPI Cards — accent bar ── */}
      <div className="app-grid-kpi-4" style={{ gap: 16 }}>
        <StatusKpiCard
          label="Integrações Ativas"
          loading={loading}
          accentColor={corIntegracoes}
          value={<span style={{ color: corIntegracoes }}>{integracoesAtivasCount} / {totalIntegracoes}</span>}
        />
        <StatusKpiCard
          label="Último Sync"
          loading={loading}
          accentColor={BRAND.ciano}
          value={<span style={{ fontSize: 20, fontWeight: 700 }}>{ultimoSyncQualquer ? formatarHora(ultimoSyncQualquer.ts) : "Nunca"}</span>}
        />
        <StatusKpiCard
          label="Registros Hoje"
          loading={loading}
          accentColor={BRAND.roxoVivo}
          value={<span style={{ color: BRAND.roxoVivo }}>{registrosHojeTotal.toLocaleString("pt-BR")}</span>}
        />
        <StatusKpiCard
          label="Taxa de Erro"
          loading={loading}
          accentColor={corTaxaErro}
          value={<span style={{ color: corTaxaErro }}>{taxaErro}%</span>}
        />
      </div>

      {/* ── Status das Integrações ── */}
      <div style={card}>
        <StatusSectionTitle icon={<Activity size={14} aria-hidden="true" />}>Status das Integrações</StatusSectionTitle>
        {(syncMensagem || syncSocialMensagem || syncSpinRssMensagem || syncLobbyBlazeMensagem || emailMensagem || emailAgendaMensagem) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {[
              syncMensagem && { prefix: "Sync CDA", msg: syncMensagem },
              syncSocialMensagem && { prefix: "Sync Social", msg: syncSocialMensagem },
              syncSpinRssMensagem && { prefix: "Spin na Rede RSS", msg: syncSpinRssMensagem },
              syncLobbyBlazeMensagem && { prefix: "Lobby Blaze", msg: syncLobbyBlazeMensagem },
              emailMensagem && { prefix: "E-mail Diretoria", msg: emailMensagem },
              emailAgendaMensagem && { prefix: "E-mail Agenda", msg: emailAgendaMensagem },
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
        )}
        {loading ? (
          <StatusTecnicoLoadingBlock />
        ) : (
          <div className="app-table-wrap">
            <table style={{
              width: "100%", borderCollapse: "separate", borderSpacing: 0,
              borderRadius: 12, overflow: "hidden", border: `1px solid ${t.cardBorder}`,
            }}>
              <caption style={{ display: "none" }}>Status das integrações de dados</caption>
              <thead>
                <tr>
                  {["Integração", "Último Sync", "Registros Hoje", "Erros", "Status", ...(mostrarColunaAcao ? ["Ação"] : [])].map((h) => (
                    <th key={h} scope="col" style={{ ...getThStyle(t), textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhasCompletas.map((row, idx) => {
                  const isCda = row.syncTipo === "cda";
                  const isSocial = row.syncTipo === "social";
                  const isSpinRss = row.syncTipo === "spin_rss";
                  const isLobbyBlaze = row.syncTipo === "lobby_blaze";
                  const isLobbyCda = row.syncTipo === "lobby_cda";
                  const isEmailDir = row.syncTipo === "email";
                  const isEmailAgenda = row.syncTipo === "email_agenda";
                  const syncExecutandoRow = isCda
                    ? syncExecutando
                    : isSocial
                      ? syncSocialExecutando
                      : isSpinRss
                        ? syncSpinRssExecutando
                        : false;
                  const ultimoSync = "ultimoSync" in row ? row.ultimoSync : null;
                  const registrosHojeR = "registrosHoje" in row ? row.registrosHoje : 0;
                  const erros = "erros" in row ? row.erros : 0;
                  const status = "status" in row ? row.status : null;
                  const zebra = zebraStripe(idx);
                  return (
                    <tr
                      key={row.slug}
                      style={{ background: zebra }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = tableRowHoverBg(t.isDark);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = zebra;
                      }}
                    >
                      <td style={getTdStyle(t)}>
                        {row.nome}
                      </td>
                      <td style={getTdStyle(t)}>{ultimoSync ? formatarHora(ultimoSync) : "—"}</td>
                      <td style={getTdStyle(t)}>{(registrosHojeR as number).toLocaleString("pt-BR")}</td>
                      <td style={getTdStyle(t)}>{erros as number}</td>
                      <td style={getTdStyle(t)}>
                        {status && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            background: status === "ok" ? `${BRAND.verde}18` : status === "warning" ? `${BRAND.amarelo}18` : `${BRAND.vermelho}18`,
                            color: status === "ok" ? BRAND.verde : status === "warning" ? BRAND.amarelo : BRAND.vermelho,
                            borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700,
                            border: `1px solid ${status === "ok" ? `${BRAND.verde}44` : status === "warning" ? `${BRAND.amarelo}44` : `${BRAND.vermelho}44`}`,
                          }}>
                            {status === "ok" && <CheckCircle2 size={13} aria-hidden="true" />}
                            {status === "warning" && <AlertTriangle size={13} aria-hidden="true" />}
                            {status === "falha" && <XCircle size={13} aria-hidden="true" />}
                            {status === "ok" ? "OK" : status === "warning" ? "Atenção" : "Falha"}
                          </span>
                        )}
                      </td>
                      {mostrarColunaAcao && (
                      <td style={getTdStyle(t)}>
                        {(isLobbyBlaze || isLobbyCda) && (
                          <span style={{ color: t.textMuted, fontFamily: FONT.body }}>—</span>
                        )}
                        {(isCda || isSocial || isSpinRss) && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmarSync(
                                isCda ? "cda" : isSocial ? "social" : "spin_rss",
                              )}
                            disabled={syncExecutandoRow || !perm.canEditarOk}
                            style={btnAcao(syncExecutandoRow)}
                          >
                            <AcaoCtaContent
                              executando={syncExecutandoRow}
                              label="Sync"
                              labelExecutando="Sincronizando..."
                              icon={<RefreshCw size={13} aria-hidden="true" />}
                            />
                          </button>
                        )}
                        {isEmailDir && (
                          <button
                            type="button"
                            onClick={() => setConfirmarEmail("diretoria")}
                            disabled={emailEnviando || !perm.canEditarOk}
                            style={btnAcao(emailEnviando)}
                          >
                            <AcaoCtaContent executando={emailEnviando} label="Enviar" labelExecutando="Enviando..." />
                          </button>
                        )}
                        {isEmailAgenda && (
                          <button
                            type="button"
                            onClick={() => setConfirmarEmail("agenda")}
                            disabled={emailAgendaEnviando || !perm.canEditarOk}
                            style={btnAcao(emailAgendaEnviando)}
                          >
                            <AcaoCtaContent executando={emailAgendaEnviando} label="Enviar" labelExecutando="Enviando..." />
                          </button>
                        )}
                      </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fluxo de Dados — sem legenda textual (#5 + remoção legenda) */}
      <div style={card}>
        <StatusSectionTitle icon={<BarChart2 size={14} aria-hidden="true" />}>Fluxo de Dados (últimos 14 dias)</StatusSectionTitle>

        {/* Legenda visual compacta — sem texto explicativo de escala */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { key: "cda", label: "CDA" },
            { key: "social", label: "Social Media" },
            { key: "spin_rss", label: "Spin RSS" },
            { key: "lobby_blaze", label: "Lobby Blaze" },
            { key: "lobby_cda", label: "Lobby CDA" },
            { key: "relatorio_diretoria", label: "E-mail Diretoria" },
            { key: "email_agenda_diaria", label: "E-mail Agenda" },
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
                    {new Date(f.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
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

      {/* Alertas — hierarquia erro vs aviso (#4, #8) */}
      <div style={card}>
        <StatusSectionTitle icon={<Bell size={14} aria-hidden="true" />}>Alertas</StatusSectionTitle>
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

      {/* Logs Recentes */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
          <StatusSectionTitle icon={<FileText size={14} aria-hidden="true" />}>Logs Recentes</StatusSectionTitle>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
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
        ) : (() => {
          const horasDisplay = logFiltro === "1h" ? 1 : logFiltro === "24h" ? 24 : 48;
          const desdeDisplay = new Date(); desdeDisplay.setHours(desdeDisplay.getHours() - horasDisplay);
          const techLogsFiltrados = techLogs.filter((l) => new Date(l.created_at) >= desdeDisplay);
          return techLogsFiltrados.length === 0 ? (
            <p style={{ color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>Nenhum log de erro no período.</p>
          ) : (
            <div className="app-table-wrap">
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 12, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
                <caption style={{ display: "none" }}>Logs de erro recentes das integrações</caption>
                <thead>
                  <tr>
                    {["Hora", "Integração", "Tipo", "Descrição"].map((h) => (
                      <th key={h} scope="col" style={getThStyle(t)}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {techLogsFiltrados.map((log, idx) => {
                    const integracaoLabel =
                      log.integracao_slug
                        ? integrations.find((i) => i.slug === log.integracao_slug)?.nome ??
                          (log.integracao_slug === "spin_na_rede_rss"
                            ? "Spin na Rede (RSS)"
                            : log.integracao_slug === "lobby_blaze"
                              ? "Lobby Blaze"
                              : log.integracao_slug === "lobby_cda"
                                ? "Lobby Casa de Apostas"
                                : log.integracao_slug)
                        : {
                            instagram: "Social Media (Instagram)", facebook: "Social Media (Facebook)",
                            youtube: "Social Media (YouTube)", linkedin: "Social Media (LinkedIn)",
                            relatorio_diretoria: "E-mail - Relatório de Influencers (Resend)",
                            email_agenda_diaria: "E-mail - Agenda do dia (Resend)",
                            resend: "E-mail (Resend)",
                            spin_na_rede_rss: "Spin na Rede (RSS)",
                            lobby_blaze: "Lobby Blaze",
                            lobby_cda: "Lobby Casa de Apostas",
                          }[log.tipo] ?? log.tipo;
                    const zebra = zebraStripe(idx);
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
                        <td style={getTdStyle(t)}>{formatarHora(log.created_at)}</td>
                        <td style={getTdStyle(t)}>{integracaoLabel}</td>
                        <td style={getTdStyle(t)}>
                          <code style={{ background: t.cardBorder, padding: "2px 6px", borderRadius: 4, fontSize: 11, fontFamily: FONT.body }}>{log.tipo}</code>
                        </td>
                        <td style={getTdStyle(t)}>{log.descricao}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Redes permitidas — check-in de prestadores */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <StatusSectionTitle icon={<Network size={14} aria-hidden="true" />}>
            Redes permitidas — check-in de prestadores
          </StatusSectionTitle>
          {perm.canEditarOk && (
            <CtaCriarButton
              type="button"
              onClick={() => {
                setCidrErroForm(null);
                setNovoCidr("");
                setNovoRotuloCidr("");
                setModalCidrAdicionar(true);
              }}
              disabledBackground={BRAND.cinza}
              style={{ marginBottom: 20 }}
              aria-label="Nova Rede"
            >
              Nova Rede
            </CtaCriarButton>
          )}
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
                  <button
                    type="button"
                    onClick={() => {
                      setCidrErroExcluir(null);
                      setCidrExcluir(row);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: `1px solid ${BRAND.vermelho}55`,
                      background: `${BRAND.vermelho}14`,
                      color: BRAND.vermelho,
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0,
                    }}
                    aria-label={`Remover prefixo ${String(row.cidr)}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Excluir
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Configuração de Alertas */}
      <div style={card}>
        <StatusSectionTitle icon={<AlertTriangle size={14} aria-hidden="true" />}>Configuração de Alertas</StatusSectionTitle>
        <p style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted, marginBottom: 16, marginTop: -12 }}>
          Condições monitoradas automaticamente. Edição futura via administração.
        </p>
        {loading ? (
          <StatusTecnicoLoadingBlock />
        ) : (
          <div className="app-table-wrap">
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 12, overflow: "hidden" }}>
              <caption style={{ display: "none" }}>Condições monitoradas para alertas automáticos</caption>
              <thead>
                <tr>
                  <th scope="col" style={getThStyle(t)}>Alerta</th>
                  <th scope="col" style={getThStyle(t)}>Condição</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={getTdStyle(t)}>Nenhum Sync CDA com sucesso</td>
                  <td style={getTdStyle(t)}>Último sync com falha, nenhum OK</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Sync CDA atrasado</td>
                  <td style={getTdStyle(t)}>&gt; 24h sem sync OK</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Taxa de erro alta no Sync CDA</td>
                  <td style={getTdStyle(t)}>&gt; 5%</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Sync CDA sem dados recentes</td>
                  <td style={getTdStyle(t)}>Nenhum registro hoje (com histórico)</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Erro no Sync Social Media</td>
                  <td style={getTdStyle(t)}>pipeline_runs status=error (24h)</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Sync Social Media com erro</td>
                  <td style={getTdStyle(t)}>tech_logs canal (24h)</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Sync Social Media sem dados recentes</td>
                  <td style={getTdStyle(t)}>Sem kpi_daily em 3 dias (com histórico)</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Sync Social Media atrasado</td>
                  <td style={getTdStyle(t)}>&gt; 36h sem pipeline success</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Erro ao enviar E-mail - Relatório de Influencers (Resend)</td>
                  <td style={getTdStyle(t)}>tech_logs relatorio_diretoria (24h)</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>E-mail - Relatório de Influencers (Resend) não enviado hoje</td>
                  <td style={getTdStyle(t)}>Sem email_envios hoje (tipo relatorio_diretoria)</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Erro ao enviar E-mail - Agenda do dia (Resend)</td>
                  <td style={getTdStyle(t)}>tech_logs email_agenda_diaria (24h)</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>E-mail - Agenda do dia (Resend) não enviado hoje</td>
                  <td style={getTdStyle(t)}>Sem email_envios hoje (tipo email_agenda_diaria)</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Nenhum ingest Spin na Rede (RSS) com sucesso</td>
                  <td style={getTdStyle(t)}>Último sync_logs com falha, nenhum OK (slug spin_na_rede_rss)</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Ingest Spin na Rede (RSS) atrasada</td>
                  <td style={getTdStyle(t)}>&gt; 24h sem sync_logs OK</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Taxa de erro alta no ingest Spin na Rede RSS</td>
                  <td style={getTdStyle(t)}>&gt; 5% em sync_logs (slug spin_na_rede_rss)</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Nenhuma coleta Lobby Blaze com sucesso</td>
                  <td style={getTdStyle(t)}>Último sync_logs com falha, nenhum OK (slug lobby_blaze)</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Coleta Lobby Blaze atrasada</td>
                  <td style={getTdStyle(t)}>&gt; 24h sem sync_logs OK</td>
                </tr>
                <tr>
                  <td style={getTdStyle(t)}>Taxa de erro alta no Lobby Blaze</td>
                  <td style={getTdStyle(t)}>&gt; 5% em sync_logs (slug lobby_blaze)</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(confirmarSync || confirmarEmail) && (
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
              {confirmarSync === "cda" && "Confirmar Sync CDA"}
              {confirmarSync === "social" && "Confirmar Sync Social"}
              {confirmarSync === "spin_rss" && "Confirmar ingest Spin na Rede (RSS)"}
              {confirmarSync === "lobby_blaze" && "Confirmar coleta Lobby Blaze"}
              {confirmarEmail === "diretoria" && "Confirmar envio — E-mail Diretoria"}
              {confirmarEmail === "agenda" && "Confirmar envio — E-mail Agenda"}
            </h2>
            <p style={{ fontFamily: FONT.body, fontSize: 14, color: t.textMuted, marginBottom: 0 }}>
              {confirmarSync
                ? "Esta ação irá sincronizar dados conforme a configuração do período. Continuar?"
                : "Esta ação irá disparar o envio do e-mail. Continuar?"}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  setConfirmarSync(null);
                  setConfirmarEmail(null);
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
                  if (confirmarSync === "cda") {
                    setConfirmarSync(null);
                    void executarSync();
                  } else if (confirmarSync === "social") {
                    setConfirmarSync(null);
                    void executarSyncSocial();
                  } else if (confirmarSync === "spin_rss") {
                    setConfirmarSync(null);
                    void executarSyncSpinRss();
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

      {modalCidrAdicionar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-tecnico-cidr-add-title"
          style={{
            position: "fixed",
            inset: 0,
            background: MODAL_OVERLAY_BG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2050,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !cidrSalvando) setModalCidrAdicionar(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 16,
              padding: 24,
              maxWidth: 440,
              width: "100%",
              maxHeight: "90dvh",
              overflowY: "auto",
            }}
          >
            <h2 id="status-tecnico-cidr-add-title" style={{ marginTop: 0, fontFamily: FONT_TITLE, fontSize: 17, color: t.text }}>
              Adicionar CIDR
            </h2>
            {cidrErroForm && (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  marginBottom: 12,
                  background: "rgba(232,64,37,0.12)",
                  border: "1px solid rgba(232,64,37,0.35)",
                  color: "#e84025",
                  fontSize: 13,
                  fontFamily: FONT.body,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={14} color="#e84025" aria-hidden="true" />
                {cidrErroForm}
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="status-tecnico-cidr-input" style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT.body, marginBottom: 6 }}>
                Prefixo CIDR
                <CampoObrigatorioMark />
              </label>
              <input
                ref={cidrInputRef}
                id="status-tecnico-cidr-input"
                type="text"
                value={novoCidr}
                onChange={(e) => setNovoCidr(e.target.value)}
                placeholder="ex.: 187.102.187.36/30"
                autoComplete="off"
                aria-label="Prefixo CIDR"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontFamily: FONT.body,
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="status-tecnico-cidr-rotulo" style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT.body, marginBottom: 6 }}>
                Rótulo
              </label>
              <input
                id="status-tecnico-cidr-rotulo"
                type="text"
                value={novoRotuloCidr}
                onChange={(e) => setNovoRotuloCidr(e.target.value)}
                placeholder="ex.: WAN Mundivox"
                autoComplete="off"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontFamily: FONT.body,
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={cidrSalvando}
                onClick={() => !cidrSalvando && setModalCidrAdicionar(false)}
                style={{
                  background: "transparent",
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 10,
                  padding: "9px 16px",
                  cursor: cidrSalvando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  color: t.text,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={cidrSalvando}
                onClick={() => void salvarCidrAllowlist()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: ctaGradientStatus(dashBrand, cidrSalvando, BRAND.cinza),
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 16px",
                  cursor: cidrSalvando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: cidrSalvando ? 0.85 : 1,
                }}
              >
                {cidrSalvando ? (
                  <>
                    <Loader2 size={14} color="#fff" className="app-lucide-spin" aria-hidden="true" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {cidrExcluir && (
        <ModalConfirmDelete
          texto={`Remover o prefixo ${String(cidrExcluir.cidr)} da lista?`}
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
