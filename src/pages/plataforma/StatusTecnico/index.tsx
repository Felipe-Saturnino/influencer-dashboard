import { useState, useEffect, useCallback } from "react";
import { supabase, supabaseUrl, supabaseAnonKey } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { GiRadarSweep, GiSiren, GiCircuitry, GiGearStick } from "react-icons/gi";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo:     "#4a2082",
  roxoVivo: "#7c3aed",
  azul:     "#1e36f8",
  vermelho: "#e84025",
  ciano:    "#70cae4",
  verde:    "#22c55e",
  amarelo:  "#f59e0b",
} as const;

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

// ─── SectionTitle (padrão da plataforma) ─────────────────────────────────────
function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  const { theme: t } = useApp();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
      <span style={{
        width: 28, height: 28, borderRadius: 8,
        background: "rgba(74,32,130,0.18)",
        border: "1px solid rgba(74,32,130,0.30)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: BRAND.ciano, flexShrink: 0,
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

// ─── KpiCard (padrão da plataforma com accent bar) ───────────────────────────
function KpiCard({ label, value, accentColor, loading }: {
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
  emails: Record<string, number>; // tipo -> destinatarios_count
  total: number;
}

export default function StatusTecnico() {
  const { theme: t } = useApp();
  const perm = usePermission("status_tecnico");
  const [loading, setLoading] = useState(true);
  const [syncExecutando, setSyncExecutando] = useState(false);
  const [syncMensagem, setSyncMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [syncSocialExecutando, setSyncSocialExecutando] = useState(false);
  const [syncSocialMensagem, setSyncSocialMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [emailEnviando, setEmailEnviando] = useState(false);
  const [emailMensagem, setEmailMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [techLogs, setTechLogs] = useState<TechLog[]>([]);
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([]);
  const [fluxoDados, setFluxoDados] = useState<FluxoDia[]>([]);
  const [registrosHoje, setRegistrosHoje] = useState(0);
  const [ultimoEmailEnvioAt, setUltimoEmailEnvioAt] = useState<string | null>(null);
  const [emailEnviosCount, setEmailEnviosCount] = useState(0);
  const [logFiltro, setLogFiltro] = useState<"1h" | "24h" | "48h">("24h");
  const [fluxoHover, setFluxoHover] = useState<string | null>(null);

  const card: React.CSSProperties = {
    background: t.cardBg,
    borderRadius: 16,
    padding: 24,
    border: `1px solid ${t.cardBorder}`,
  };
  const thStyle: React.CSSProperties = {
    fontFamily: FONT.body, fontSize: 11, fontWeight: 700,
    color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px",
    padding: "10px 14px", textAlign: "left",
    background: "rgba(74,32,130,0.10)",
    borderBottom: `1px solid ${t.cardBorder}`,
  };
  const tdStyle: React.CSSProperties = {
    fontFamily: FONT.body, fontSize: 13, color: t.text,
    padding: "12px 14px", borderTop: `1px solid ${t.cardBorder}`,
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    const hoje = new Date().toISOString().split("T")[0];

    // Integrações
    const { data: intData } = await supabase.from("integrations").select("*").eq("ativo", true);
    setIntegrations(intData ?? []);

    // Sync logs (últimos 7 dias)
    const { data: syncData } = await supabase
      .from("sync_logs")
      .select("*")
      .order("executado_em", { ascending: false })
      .limit(100);
    setSyncLogs(syncData ?? []);

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

    const [resCda, resSocial, resEmails] = await Promise.all([
      supabase.from("influencer_metricas").select("data").gte("data", dataInicioStr),
      supabase.from("kpi_daily").select("date").gte("date", dataInicioStr),
      supabase.from("email_envios").select("data, tipo, destinatarios_count, created_at").gte("data", dataInicioStr),
    ]);

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
    const ultimoEmail = (resEmails.data ?? []).reduce<string | null>((max, row) => {
      const r = row as { created_at?: string };
      if (!r.created_at) return max;
      return !max || r.created_at > max ? r.created_at : max;
    }, null);
    setUltimoEmailEnvioAt(ultimoEmail);
    setEmailEnviosCount((resEmails.data ?? []).length);

    const datasSet = new Set<string>([
      ...Object.keys(cdaPorData),
      ...Object.keys(socialPorData),
      ...Object.keys(emailsPorData),
      hoje,
    ]);
    const fluxoArray: FluxoDia[] = Array.from(datasSet)
      .sort((a, b) => a.localeCompare(b))
      .map((data) => {
        const cda = cdaPorData[data] ?? 0;
        const social = socialPorData[data] ?? 0;
        const emails = emailsPorData[data] ?? {};
        const emailTotal = Object.values(emails).reduce((s, n) => s + n, 0);
        return {
          data,
          cda,
          social,
          emails,
          total: cda + social + emailTotal,
        };
      });
    setFluxoDados(fluxoArray);

    setLoading(false);
  }, [logFiltro]);

  useEffect(() => {
    carregar();
    const interval = setInterval(carregar, 60000); // refresh a cada 1 min
    return () => clearInterval(interval);
  }, [carregar]);

  const executarSync = async () => {
    if (syncExecutando || !perm.canView || perm.canView === "nao") return;
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
        const msg = invokeError.message ?? "Erro ao chamar sync-metricas-cda";
        let texto = msg;
        if (msg.includes("Failed to fetch") || msg.includes("fetch")) {
          texto =
            "Failed to fetch — a requisição não chegou ao servidor. Verifique: (1) VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env; (2) Edge Function sync-metricas-cda implantada (supabase functions deploy sync-metricas-cda); (3) CORS/firewall/rede.";
        } else if (msg.includes("401") || msg.includes("unauthorized")) {
          texto = "Não autorizado. Verifique no Supabase se a Edge Function sync-metricas-cda está implantada.";
        } else if (msg.includes("404") || msg.includes("not found")) {
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
      const msg = e instanceof Error ? e.message : String(e);
      let texto = msg;
      if (msg === "Failed to fetch") {
        texto =
          "Failed to fetch — a requisição não chegou ao servidor. Verifique: (1) VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env; (2) Edge Function sync-metricas-cda implantada (supabase functions deploy sync-metricas-cda); (3) CORS/firewall/rede; (4) Abra o DevTools (F12) → Network para ver o erro exato.";
      }
      setSyncMensagem({ tipo: "erro", texto });
    } finally {
      setSyncExecutando(false);
    }
  };

  const executarSyncSocial = async () => {
    if (syncSocialExecutando || !perm.canView || perm.canView === "nao") return;
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
        let texto = invokeError.message ?? "Erro ao chamar trigger-social-kpis";
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
      const msg = e instanceof Error ? e.message : String(e);
      setSyncSocialMensagem({ tipo: "erro", texto: msg });
    } finally {
      setSyncSocialExecutando(false);
    }
  };

  const enviarEmailDiretoria = async () => {
    if (emailEnviando || !perm.canView || perm.canView === "nao") return;
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
      const { data: resDataRaw, error: invokeError } = await supabase.functions.invoke("relatorio-diario-diretoria", {
        body: {},
      });

      const resData = (resDataRaw ?? {}) as { ok?: boolean; error?: string; destinatarios?: string[] };

      if (invokeError) {
        setEmailMensagem({
          tipo: "erro",
          texto: invokeError.message ?? "Erro ao enviar relatório. Verifique se a Edge Function relatorio-diario-diretoria está implantada.",
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setEmailMensagem({ tipo: "erro", texto: msg });
    } finally {
      setEmailEnviando(false);
    }
  };

  // KPIs derivados
  const hojeIsoKpi = new Date().toISOString().split("T")[0];

  // Integrações Ativas: 3 (CDA, Social Media, E-mail) — OK = último Sync (automático ou manual) foi sucesso
  const ultimoSyncCdaLog = syncLogs.find((l) => l.integracao_slug === "casa_apostas");
  const cdaStatusOk = ultimoSyncCdaLog?.status === "ok";

  const ultimoPipelineRun = pipelineRuns.reduce<PipelineRun | null>((max, r) => {
    if (!max) return r;
    return new Date(r.created_at) > new Date(max.created_at) ? r : max;
  }, null);
  const socialStatusOk = ultimoPipelineRun?.status === "success";

  const ultimoTechLogEmail = techLogs
    .filter((l) => l.tipo === "relatorio_diretoria")
    .reduce<string | null>((max, l) => {
      if (!max) return l.created_at;
      return l.created_at > max ? l.created_at : max;
    }, null);
  const emailStatusOk =
    !!ultimoEmailEnvioAt &&
    (!ultimoTechLogEmail || ultimoEmailEnvioAt >= ultimoTechLogEmail);

  const integracoesAtivasCount = [cdaStatusOk, socialStatusOk, emailStatusOk].filter(Boolean).length;
  const totalIntegracoes = 3;

  // Último Sync: mais recente de qualquer uma das 3 (por data de execução)
  const timestamps: Array<{ ts: string; label: string }> = [];
  if (ultimoSyncCdaLog?.executado_em) timestamps.push({ ts: ultimoSyncCdaLog.executado_em, label: "CDA" });
  if (ultimoPipelineRun?.created_at) timestamps.push({ ts: ultimoPipelineRun.created_at, label: "Social" });
  if (ultimoEmailEnvioAt) timestamps.push({ ts: ultimoEmailEnvioAt, label: "E-mail" });
  const ultimoSyncQualquer = timestamps.length > 0 ? timestamps.reduce((a, b) => (a.ts > b.ts ? a : b)) : null;

  // Registros Hoje: soma do fluxo total (CDA + Social Media + E-mails)
  const fluxoHoje = fluxoDados.find((f) => f.data === hojeIsoKpi);
  const registrosHojeTotal = fluxoHoje?.total ?? registrosHoje;

  // Taxa de Erro: agregada das 3 (falhas / total tentativas)
  const cdaTotal = syncLogs.filter((l) => l.integracao_slug === "casa_apostas").length;
  const cdaFalhas = syncLogs.filter((l) => l.integracao_slug === "casa_apostas" && l.status === "falha").length;
  const socialTotal = pipelineRuns.length;
  const socialFalhas = pipelineRuns.filter((r) => r.status === "error").length;
  const emailFalhas = techLogs.filter((l) => l.tipo === "relatorio_diretoria").length;
  const emailTotal = emailEnviosCount + emailFalhas;
  const totalTentativas = cdaTotal + socialTotal + Math.max(emailTotal, 1);
  const totalFalhas = cdaFalhas + socialFalhas + emailFalhas;
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
  const techLogsEmail24h = techLogs.filter((l) => {
    const created = new Date(l.created_at);
    return l.tipo === "relatorio_diretoria" && created >= vinteQuatroHoras;
  });
  const emailEnviadoHoje = (fluxoDados.find((f) => f.data === hojeIso)?.emails?.relatorio_diretoria ?? 0) > 0;

  if (techLogsEmail24h.length > 0) {
    alertas.push({ nivel: "erro", msg: "Erro ao enviar E-mail - Relatório de Influencers (Resend)" });
  }
  if (!emailEnviadoHoje) {
    alertas.push({ nivel: "aviso", msg: "E-mail - Relatório de Influencers (Resend) não enviado hoje" });
  }

  // Status por integração (última execução)
  const statusPorIntegracao = integrations.map((int) => {
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
    return {
      ...int,
      ultimoSync: ultimo?.executado_em ?? null,
      registrosHoje: regsExibir,
      erros: ultimo?.erros_count ?? 0,
      status,
      syncTipo: "cda" as const,
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
    ultimoSync: ultimoEmailEnvioAt,
    registrosHoje: fluxoHojeSocial?.emails?.relatorio_diretoria ?? 0,
    erros: techLogs.filter((l) => l.tipo === "relatorio_diretoria").length,
    status: (emailStatusOk ? "ok" : "falha") as "ok" | "warning" | "falha",
    syncTipo: "email" as const,
  };
  const linhasCompletas = [...statusPorIntegracao, socialKpisRow, emailDiretoriaRow];

  const maxFluxo = Math.max(...fluxoDados.map((f) => f.total), 1);
  const fluxoLabel = (k: string) =>
    ({ cda: "CDA (Casa de Apostas)", social: "Social Media", relatorio_diretoria: "E-mail: Relatório Diretoria" }[k] ?? `E-mail: ${k}`);
  const fluxoCor = (k: string) =>
    ({ cda: BRAND.roxoVivo, social: BRAND.azul, relatorio_diretoria: BRAND.verde }[k] ?? "#10b981");

  const corIntegracoes = integracoesAtivasCount === totalIntegracoes ? BRAND.verde : integracoesAtivasCount > 0 ? BRAND.amarelo : BRAND.vermelho;
  const corTaxaErro = parseFloat(taxaErro) > 5 ? BRAND.vermelho : parseFloat(taxaErro) > 0 ? BRAND.amarelo : BRAND.verde;

  const btnAcao = (disabled: boolean): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 8, border: "none",
    background: disabled ? "#6b7280" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
    color: "#fff", fontSize: 12, fontWeight: 700,
    fontFamily: FONT.body, cursor: disabled ? "not-allowed" : "pointer",
  });
  const formatarHora = (iso: string) => {
    const d = new Date(iso);
    const hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) {
      return `Hoje ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar o Status Técnico.
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Header — padrão da plataforma ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 36, height: 36, borderRadius: 10,
          background: "rgba(74,32,130,0.18)", border: "1px solid rgba(74,32,130,0.30)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: BRAND.ciano, flexShrink: 0,
        }}>
          <GiRadarSweep size={18} />
        </span>
        <div>
          <h1 style={{ fontFamily: FONT_TITLE, fontSize: 22, fontWeight: 800, color: t.text, margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Status Técnico
          </h1>
          <p style={{ color: t.textMuted, margin: "4px 0 0", fontFamily: FONT.body, fontSize: 13 }}>
            Acompanhamento de integrações e saúde da plataforma.
          </p>
        </div>
      </div>

      {/* ── KPI Cards — accent bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <KpiCard
          label="Integrações Ativas"
          loading={loading}
          accentColor={corIntegracoes}
          value={<span style={{ color: corIntegracoes }}>{integracoesAtivasCount} / {totalIntegracoes}</span>}
        />
        <KpiCard
          label="Último Sync"
          loading={loading}
          accentColor={BRAND.ciano}
          value={<span style={{ fontSize: 20, fontWeight: 700 }}>{ultimoSyncQualquer ? formatarHora(ultimoSyncQualquer.ts) : "Nunca"}</span>}
        />
        <KpiCard
          label="Registros Hoje"
          loading={loading}
          accentColor={BRAND.roxoVivo}
          value={<span style={{ color: BRAND.roxoVivo }}>{registrosHojeTotal.toLocaleString("pt-BR")}</span>}
        />
        <KpiCard
          label="Taxa de Erro"
          loading={loading}
          accentColor={corTaxaErro}
          value={<span style={{ color: corTaxaErro }}>{taxaErro}%</span>}
        />
      </div>

      {/* ── Status das Integrações ── */}
      <div style={card}>
        <SectionTitle icon={<GiCircuitry size={14} />}>Status das Integrações</SectionTitle>
        {(syncMensagem || syncSocialMensagem || emailMensagem) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {[syncMensagem && { prefix: "Sync CDA", msg: syncMensagem }, syncSocialMensagem && { prefix: "Sync Social", msg: syncSocialMensagem }, emailMensagem && { prefix: "E-mail", msg: emailMensagem }]
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
                  }}>
                    {msg.tipo === "ok" ? "✅ " : "⚠️ "}{prefix}: {msg.texto}
                  </div>
                );
              })}
          </div>
        )}
        {loading ? (
          <p style={{ color: t.textMuted, fontFamily: FONT.body }}>Carregando...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%", borderCollapse: "separate", borderSpacing: 0,
              borderRadius: 12, overflow: "hidden", border: `1px solid ${t.cardBorder}`,
            }}>
              <thead>
                <tr>
                  {["Integração", "Último Sync", "Registros Hoje", "Erros", "Status", "Ação"].map((h, i) => (
                    <th key={h} style={{ ...thStyle, textAlign: i === 0 ? "left" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhasCompletas.map((row, idx) => {
                  const isCda = row.syncTipo === "cda";
                  const isSocial = row.syncTipo === "social";
                  const isEmail = row.syncTipo === "email";
                  const syncExecutandoRow = isCda ? syncExecutando : isSocial ? syncSocialExecutando : false;
                  const onSync = isCda ? executarSync : isSocial ? executarSyncSocial : () => {};
                  const ultimoSync = "ultimoSync" in row ? row.ultimoSync : null;
                  const registrosHojeR = "registrosHoje" in row ? row.registrosHoje : 0;
                  const erros = "erros" in row ? row.erros : 0;
                  const status = "status" in row ? row.status : null;
                  const rowBg = idx % 2 === 1 ? "rgba(74,32,130,0.06)" : "transparent";
                  return (
                    <tr key={row.slug} style={{ background: rowBg }}>
                      <td style={tdStyle}>
                        {isEmail ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}>📧 {row.nome}</span> : row.nome}
                      </td>
                      <td style={tdStyle}>{ultimoSync ? formatarHora(ultimoSync) : "—"}</td>
                      <td style={tdStyle}>{(registrosHojeR as number).toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{erros as number}</td>
                      <td style={tdStyle}>
                        {status && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            background: status === "ok" ? `${BRAND.verde}18` : status === "warning" ? `${BRAND.amarelo}18` : `${BRAND.vermelho}18`,
                            color: status === "ok" ? BRAND.verde : status === "warning" ? BRAND.amarelo : BRAND.vermelho,
                            borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700,
                            border: `1px solid ${status === "ok" ? `${BRAND.verde}44` : status === "warning" ? `${BRAND.amarelo}44` : `${BRAND.vermelho}44`}`,
                          }}>
                            {status === "ok" && "🟢 OK"}
                            {status === "warning" && "🟡 Warning"}
                            {status === "falha" && "🔴 Falha"}
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {(isCda || isSocial) && (
                          <button onClick={onSync} disabled={syncExecutandoRow || !perm.canView} style={btnAcao(syncExecutandoRow)}>
                            {syncExecutandoRow ? "..." : "🔄 Sync"}
                          </button>
                        )}
                        {isEmail && (
                          <button onClick={enviarEmailDiretoria} disabled={emailEnviando || !perm.canView} style={btnAcao(emailEnviando)}>
                            {emailEnviando ? "Enviando..." : "Enviar"}
                          </button>
                        )}
                      </td>
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
        <SectionTitle icon={<GiGearStick size={14} />}>Fluxo de Dados (últimos 14 dias)</SectionTitle>

        {/* Legenda visual compacta — sem texto explicativo de escala */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { key: "cda", label: "CDA" },
            { key: "social", label: "Social Media" },
            { key: "relatorio_diretoria", label: "E-mail Diretoria" },
          ].map((item) => (
            <span key={item.key} style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: fluxoCor(item.key), flexShrink: 0, display: "inline-block" }} />
              {item.label}
            </span>
          ))}
        </div>

        {loading ? (
          <p style={{ color: t.textMuted, fontFamily: FONT.body }}>Carregando...</p>
        ) : fluxoDados.length === 0 ? (
          <p style={{ color: t.textMuted, fontFamily: FONT.body }}>Nenhum dado no período.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                  <span style={{ fontFamily: FONT.body, fontSize: 12, color: t.textMuted, width: 100, flexShrink: 0 }}>
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
                      position: "absolute", left: 116, top: "50%", transform: "translateY(-50%)",
                      marginLeft: 4, padding: "8px 12px",
                      background: t.cardBg, border: `1px solid ${t.cardBorder}`,
                      borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      fontSize: 12, fontFamily: FONT.body, color: t.text, zIndex: 10, whiteSpace: "nowrap",
                    }}>
                      {f.cda > 0 && <div style={{ padding: "2px 0" }}><span style={{ color: fluxoCor("cda"), fontWeight: 600 }}>●</span> {fluxoLabel("cda")}: {f.cda.toLocaleString("pt-BR")}</div>}
                      {f.social > 0 && <div style={{ padding: "2px 0" }}><span style={{ color: fluxoCor("social"), fontWeight: 600 }}>●</span> {fluxoLabel("social")}: {f.social.toLocaleString("pt-BR")}</div>}
                      {Object.entries(f.emails).filter(([, n]) => n > 0).map(([tipo, n]) => (
                        <div key={tipo} style={{ padding: "2px 0" }}><span style={{ color: fluxoCor(tipo), fontWeight: 600 }}>●</span> {fluxoLabel(tipo)}: {n.toLocaleString("pt-BR")}</div>
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
        <SectionTitle icon={<GiSiren size={14} />}>Alertas</SectionTitle>
        {alertas.length === 0 ? (
          <p style={{ color: BRAND.verde, fontFamily: FONT.body, fontSize: 14, margin: 0 }}>✅ Nenhum alerta no momento.</p>
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
                <span style={{ fontSize: 16, flexShrink: 0 }}>{a.nivel === "erro" ? "🔴" : "🟡"}</span>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: "rgba(74,32,130,0.18)", border: "1px solid rgba(74,32,130,0.30)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: BRAND.ciano, flexShrink: 0,
            }}>
              <GiCircuitry size={13} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Logs Recentes
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["1h", "24h", "48h"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setLogFiltro(f)}
                style={{
                  padding: "6px 12px", borderRadius: 8,
                  border: `1px solid ${logFiltro === f ? BRAND.roxoVivo : t.cardBorder}`,
                  background: logFiltro === f ? `${BRAND.roxoVivo}22` : "transparent",
                  color: logFiltro === f ? BRAND.roxoVivo : t.textMuted,
                  cursor: "pointer", fontFamily: FONT.body, fontSize: 12, fontWeight: 600,
                }}
              >
                {f === "1h" ? "Última 1 hora" : f === "24h" ? "Últimas 24h" : "Últimas 48h"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: t.textMuted, fontFamily: FONT.body }}>Carregando...</p>
        ) : (() => {
          const horasDisplay = logFiltro === "1h" ? 1 : logFiltro === "24h" ? 24 : 48;
          const desdeDisplay = new Date(); desdeDisplay.setHours(desdeDisplay.getHours() - horasDisplay);
          const techLogsFiltrados = techLogs.filter((l) => new Date(l.created_at) >= desdeDisplay);
          return techLogsFiltrados.length === 0 ? (
            <p style={{ color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>Nenhum log de erro no período.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 12, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
                <thead>
                  <tr>
                    {["Hora", "Integração", "Tipo", "Descrição"].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {techLogsFiltrados.map((log, idx) => {
                    const integracaoLabel =
                      log.integracao_slug
                        ? integrations.find((i) => i.slug === log.integracao_slug)?.nome ?? log.integracao_slug
                        : {
                            instagram: "Social Media (Instagram)", facebook: "Social Media (Facebook)",
                            youtube: "Social Media (YouTube)", linkedin: "Social Media (LinkedIn)",
                            relatorio_diretoria: "E-mail - Relatório de Influencers (Resend)",
                            resend: "E-mail (Resend)",
                          }[log.tipo] ?? log.tipo;
                    return (
                      <tr key={log.id} style={{ background: idx % 2 === 1 ? "rgba(74,32,130,0.06)" : "transparent" }}>
                        <td style={tdStyle}>{formatarHora(log.created_at)}</td>
                        <td style={tdStyle}>{integracaoLabel}</td>
                        <td style={tdStyle}>
                          <code style={{ background: t.cardBorder, padding: "2px 6px", borderRadius: 4, fontSize: 11, fontFamily: FONT.body }}>{log.tipo}</code>
                        </td>
                        <td style={tdStyle}>{log.descricao}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Configuração de Alertas */}
      <div style={card}>
        <h2 style={{ fontFamily: FONT.title, fontSize: 16, color: t.text, margin: "0 0 20px" }}>
          Configuração de Alertas
        </h2>
        <p style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted, marginBottom: 16 }}>
          Condições monitoradas automaticamente. Edição futura via administração.
        </p>
        {loading ? (
          <p style={{ color: t.textMuted }}>Carregando...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Alerta</th>
                  <th style={thStyle}>Condição</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Nenhum Sync CDA com sucesso</td>
                  <td style={tdStyle}>Último sync com falha, nenhum OK</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Sync CDA atrasado</td>
                  <td style={tdStyle}>&gt; 24h sem sync OK</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Taxa de erro alta no Sync CDA</td>
                  <td style={tdStyle}>&gt; 5%</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Sync CDA sem dados recentes</td>
                  <td style={tdStyle}>Nenhum registro hoje (com histórico)</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Erro no Sync Social Media</td>
                  <td style={tdStyle}>pipeline_runs status=error (24h)</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Sync Social Media com erro</td>
                  <td style={tdStyle}>tech_logs canal (24h)</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Sync Social Media sem dados recentes</td>
                  <td style={tdStyle}>Sem kpi_daily em 3 dias (com histórico)</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Sync Social Media atrasado</td>
                  <td style={tdStyle}>&gt; 36h sem pipeline success</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Erro ao enviar E-mail - Relatório de Influencers (Resend)</td>
                  <td style={tdStyle}>tech_logs relatorio_diretoria (24h)</td>
                </tr>
                <tr>
                  <td style={tdStyle}>E-mail - Relatório de Influencers (Resend) não enviado hoje</td>
                  <td style={tdStyle}>Sem email_envios hoje</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
