import { useState, useEffect, useCallback } from "react";
import { supabase, supabaseUrl, supabaseAnonKey } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";

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
    fontFamily: FONT.body,
    fontSize: 11,
    fontWeight: 700,
    color: t.textMuted,
    textTransform: "uppercase",
    letterSpacing: "1px",
    padding: "10px 14px",
    textAlign: "left",
  };
  const tdStyle: React.CSSProperties = {
    fontFamily: FONT.body,
    fontSize: 13,
    color: t.text,
    padding: "12px 14px",
    borderTop: `1px solid ${t.cardBorder}`,
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

  // Último Sync: mais recente de qualquer uma das 3
  const ultimoSyncCda = syncLogs.find((l) => l.integracao_slug === "casa_apostas");
  const ultimoSyncSocial = pipelineRuns.find((r) => r.status === "success");
  const timestamps: Array<{ ts: string; label: string }> = [];
  if (ultimoSyncCda?.executado_em) timestamps.push({ ts: ultimoSyncCda.executado_em, label: "CDA" });
  if (ultimoSyncSocial?.created_at) timestamps.push({ ts: ultimoSyncSocial.created_at, label: "Social" });
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
    ({ cda: "#7c3aed", social: "#2563eb", relatorio_diretoria: "#059669" }[k] ?? "#10b981");
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
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ fontFamily: FONT.title, fontSize: 28, color: t.text, margin: 0 }}>
          📡 Status Técnico
        </h1>
        <p style={{ color: t.textMuted, marginTop: 6, fontFamily: FONT.body }}>
          Acompanhamento de integrações e saúde da plataforma.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div style={card} title="CDA, Social Media e E-mail — OK quando o último Sync (automático ou manual) foi sucesso">
          <p style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>
            Integrações Ativas
          </p>
          <p style={{ fontFamily: FONT.title, fontSize: 28, color: integracoesAtivasCount === totalIntegracoes ? "#059669" : integracoesAtivasCount > 0 ? "#f59e0b" : "#ef4444", margin: 0, fontWeight: 700 }}>
            {loading ? "—" : `${integracoesAtivasCount} / ${totalIntegracoes}`}
          </p>
          <p style={{ fontFamily: FONT.body, fontSize: 10, color: t.textMuted, margin: "4px 0 0", opacity: 0.8 }}>
            CDA, Social, E-mail
          </p>
        </div>
        <div style={card} title="Mais recente de: sync_logs (CDA), pipeline_runs (Social) ou email_envios (E-mail)">
          <p style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>
            Último Sync
          </p>
          <p style={{ fontFamily: FONT.title, fontSize: 28, color: t.text, margin: 0, fontWeight: 600 }}>
            {loading ? "—" : ultimoSyncQualquer ? formatarHora(ultimoSyncQualquer.ts) : "Nunca"}
          </p>
        </div>
        <div style={card} title="Soma do fluxo do dia: CDA (influencer_metricas) + Social Media (kpi_daily) + E-mails (destinatários)">
          <p style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>
            Registros Hoje
          </p>
          <p style={{ fontFamily: FONT.title, fontSize: 28, color: "#7c3aed", margin: 0, fontWeight: 700 }}>
            {loading ? "—" : registrosHojeTotal.toLocaleString("pt-BR")}
          </p>
          <p style={{ fontFamily: FONT.body, fontSize: 10, color: t.textMuted, margin: "4px 0 0", opacity: 0.8 }}>
            CDA + Social + E-mails
          </p>
        </div>
        <div style={card} title="Falhas / total tentativas das 3: sync_logs (CDA) + pipeline_runs (Social) + email_envios + tech_logs (E-mail)">
          <p style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>
            Taxa de Erro
          </p>
          <p style={{
            fontFamily: FONT.title,
            fontSize: 28,
            color: parseFloat(taxaErro) > 5 ? "#ef4444" : parseFloat(taxaErro) > 0 ? "#f59e0b" : "#059669",
            margin: 0,
            fontWeight: 700,
          }}>
            {loading ? "—" : `${taxaErro}%`}
          </p>
          <p style={{ fontFamily: FONT.body, fontSize: 10, color: t.textMuted, margin: "4px 0 0", opacity: 0.8 }}>
            Falhas / total (3 fontes)
          </p>
        </div>
      </div>

      {/* Status das Integrações */}
      <div style={card}>
        <h2 style={{ fontFamily: FONT.title, fontSize: 16, color: t.text, margin: "0 0 20px" }}>
          Status das Integrações
        </h2>
        {(syncMensagem || syncSocialMensagem || emailMensagem) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {syncMensagem && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: syncMensagem.tipo === "ok" ? "#05966922" : "#ef444422",
                  border: `1px solid ${syncMensagem.tipo === "ok" ? "#059669" : "#ef4444"}`,
                  color: syncMensagem.tipo === "ok" ? "#059669" : "#ef4444",
                  fontFamily: FONT.body,
                  fontSize: 12,
                }}
              >
                {syncMensagem.tipo === "ok" ? "✅ " : "⚠️ "} Sync CDA: {syncMensagem.texto}
              </div>
            )}
            {syncSocialMensagem && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: syncSocialMensagem.tipo === "ok" ? "#05966922" : "#ef444422",
                  border: `1px solid ${syncSocialMensagem.tipo === "ok" ? "#059669" : "#ef4444"}`,
                  color: syncSocialMensagem.tipo === "ok" ? "#059669" : "#ef4444",
                  fontFamily: FONT.body,
                  fontSize: 12,
                }}
              >
                {syncSocialMensagem.tipo === "ok" ? "✅ " : "⚠️ "} Sync Social: {syncSocialMensagem.texto}
              </div>
            )}
            {emailMensagem && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: emailMensagem.tipo === "ok" ? "#05966922" : "#ef444422",
                  border: `1px solid ${emailMensagem.tipo === "ok" ? "#059669" : "#ef4444"}`,
                  color: emailMensagem.tipo === "ok" ? "#059669" : "#ef4444",
                  fontFamily: FONT.body,
                  fontSize: 12,
                }}
              >
                {emailMensagem.tipo === "ok" ? "✅ " : "⚠️ "} {emailMensagem.texto}
              </div>
            )}
          </div>
        )}
        {loading ? (
          <p style={{ color: t.textMuted }}>Carregando...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Integração</th>
                  <th style={thStyle}>Último Sync</th>
                  <th style={thStyle}>Registros Hoje</th>
                  <th style={thStyle}>Erros</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {linhasCompletas.map((row) => {
                  const isCda = row.syncTipo === "cda";
                  const isSocial = row.syncTipo === "social";
                  const isEmail = row.syncTipo === "email";
                  const syncExecutandoRow = isCda ? syncExecutando : isSocial ? syncSocialExecutando : false;
                  const onSync = isCda ? executarSync : isSocial ? executarSyncSocial : () => {};
                  const ultimoSync = "ultimoSync" in row ? row.ultimoSync : null;
                  const registrosHoje = "registrosHoje" in row ? row.registrosHoje : 0;
                  const erros = "erros" in row ? row.erros : 0;
                  const status = "status" in row ? row.status : null;
                  return (
                    <tr key={row.slug}>
                      <td style={tdStyle}>
                        {isEmail ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            📧 {row.nome}
                          </span>
                        ) : (
                          row.nome
                        )}
                      </td>
                      <td style={tdStyle}>{ultimoSync ? formatarHora(ultimoSync) : "—"}</td>
                      <td style={tdStyle}>{registrosHoje.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{erros}</td>
                      <td style={tdStyle}>
                        {status ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: status === "ok" ? "#05966922" : status === "warning" ? "#f59e0b22" : "#ef444422",
                              color: status === "ok" ? "#059669" : status === "warning" ? "#f59e0b" : "#ef4444",
                              borderRadius: 8,
                              padding: "4px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {status === "ok" && "🟢 OK"}
                            {status === "warning" && "🟡 Warning"}
                            {status === "falha" && "🔴 Falha"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {(isCda || isSocial) && (
                            <button
                              onClick={onSync}
                              disabled={syncExecutandoRow || !perm.canView}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 8,
                                border: "none",
                                background: syncExecutandoRow ? "#6b7280" : "linear-gradient(135deg, #4a2082, #1e36f8)",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: FONT.body,
                                cursor: syncExecutandoRow ? "not-allowed" : "pointer",
                              }}
                            >
                              {syncExecutandoRow ? "..." : "🔄 Sync"}
                            </button>
                          )}
                          {isEmail && (
                            <button
                              onClick={enviarEmailDiretoria}
                              disabled={emailEnviando || !perm.canView}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 8,
                                border: "none",
                                background: emailEnviando ? "#6b7280" : "#059669",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: FONT.body,
                                cursor: emailEnviando ? "not-allowed" : "pointer",
                              }}
                            >
                              {emailEnviando ? "Enviando..." : "Enviar"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fluxo de Dados */}
      <div style={card}>
        <h2 style={{ fontFamily: FONT.title, fontSize: 16, color: t.text, margin: "0 0 20px" }}>
          Fluxo de Dados (últimos 14 dias)
        </h2>
        <p style={{ fontFamily: FONT.body, fontSize: 12, color: t.textMuted, margin: "-8px 0 8px" }}>
          CDA e Social: 1 = 1 registro. E-mail: 1 = cada destinatário.
        </p>
        <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted }}>
            <span style={{ color: fluxoCor("cda"), fontWeight: 600 }}>●</span> CDA
          </span>
          <span style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted }}>
            <span style={{ color: fluxoCor("social"), fontWeight: 600 }}>●</span> Social Media
          </span>
          <span style={{ fontFamily: FONT.body, fontSize: 11, color: t.textMuted }}>
            <span style={{ color: fluxoCor("relatorio_diretoria"), fontWeight: 600 }}>●</span> E-mail Diretoria
          </span>
        </div>
        {loading ? (
          <p style={{ color: t.textMuted }}>Carregando...</p>
        ) : fluxoDados.length === 0 ? (
          <p style={{ color: t.textMuted, fontFamily: FONT.body }}>Nenhum dado no período.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...fluxoDados.slice(-14)].reverse().map((f) => {
              const emailTotal = Object.values(f.emails).reduce((s, n) => s + n, 0);
              const pct = (v: number) => (f.total > 0 ? (v / f.total) * 100 : 0);
              const isHover = fluxoHover === f.data;
              return (
                <div
                  key={f.data}
                  style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}
                  onMouseEnter={() => setFluxoHover(f.data)}
                  onMouseLeave={() => setFluxoHover(null)}
                >
                  <span style={{ fontFamily: FONT.body, fontSize: 12, color: t.textMuted, width: 100 }}>
                    {new Date(f.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 24,
                      background: t.bg,
                      borderRadius: 6,
                      overflow: "hidden",
                      display: "flex",
                    }}
                  >
                    {f.cda > 0 && (
                      <div
                        title={`${fluxoLabel("cda")}: ${f.cda.toLocaleString("pt-BR")}`}
                        style={{
                          width: `${pct(f.cda)}%`,
                          minWidth: f.cda > 0 ? 4 : 0,
                          height: "100%",
                          background: fluxoCor("cda"),
                          transition: "opacity 0.15s",
                          opacity: isHover ? 1 : 0.9,
                        }}
                      />
                    )}
                    {f.social > 0 && (
                      <div
                        title={`${fluxoLabel("social")}: ${f.social.toLocaleString("pt-BR")}`}
                        style={{
                          width: `${pct(f.social)}%`,
                          minWidth: f.social > 0 ? 4 : 0,
                          height: "100%",
                          background: fluxoCor("social"),
                          transition: "opacity 0.15s",
                          opacity: isHover ? 1 : 0.9,
                        }}
                      />
                    )}
                    {Object.entries(f.emails)
                      .filter(([, n]) => n > 0)
                      .map(([tipo, n]) => (
                        <div
                          key={tipo}
                          title={`${fluxoLabel(tipo)}: ${n.toLocaleString("pt-BR")}`}
                          style={{
                            width: `${pct(n)}%`,
                            minWidth: 4,
                            height: "100%",
                            background: fluxoCor(tipo),
                            transition: "opacity 0.15s",
                            opacity: isHover ? 1 : 0.9,
                          }}
                        />
                      ))}
                  </div>
                  <span style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 600, color: t.text, minWidth: 60 }}>
                    {f.total.toLocaleString("pt-BR")}
                  </span>
                  {isHover && f.total > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: 116,
                        top: "50%",
                        transform: "translateY(-50%)",
                        marginLeft: 4,
                        padding: "8px 12px",
                        background: t.cardBg,
                        border: `1px solid ${t.cardBorder}`,
                        borderRadius: 8,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        fontSize: 12,
                        fontFamily: FONT.body,
                        color: t.text,
                        zIndex: 10,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.cda > 0 && (
                        <div style={{ padding: "2px 0" }}>
                          <span style={{ color: fluxoCor("cda"), fontWeight: 600 }}>●</span> {fluxoLabel("cda")}: {f.cda.toLocaleString("pt-BR")}
                        </div>
                      )}
                      {f.social > 0 && (
                        <div style={{ padding: "2px 0" }}>
                          <span style={{ color: fluxoCor("social"), fontWeight: 600 }}>●</span> {fluxoLabel("social")}: {f.social.toLocaleString("pt-BR")}
                        </div>
                      )}
                      {Object.entries(f.emails).map(([tipo, n]) => (
                        <div key={tipo} style={{ padding: "2px 0" }}>
                          <span style={{ color: fluxoCor(tipo), fontWeight: 600 }}>●</span> {fluxoLabel(tipo)}: {n.toLocaleString("pt-BR")}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alertas */}
      <div style={card}>
        <h2 style={{ fontFamily: FONT.title, fontSize: 16, color: t.text, margin: "0 0 20px" }}>
          ⚠ Alertas
        </h2>
        {alertas.length === 0 ? (
          <p style={{ color: "#059669", fontFamily: FONT.body, fontSize: 14 }}>✅ Nenhum alerta no momento.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alertas.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 10,
                  background: a.nivel === "erro" ? "#ef444422" : "#f59e0b22",
                  border: `1px solid ${a.nivel === "erro" ? "#ef4444" : "#f59e0b"}`,
                }}
              >
                <span style={{ fontSize: 18 }}>{a.nivel === "erro" ? "🔴" : "🟡"}</span>
                <span style={{ fontFamily: FONT.body, fontSize: 13, color: t.text }}>{a.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logs Recentes */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: FONT.title, fontSize: 16, color: t.text, margin: 0 }}>
            Logs Recentes
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            {(["1h", "24h", "48h"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setLogFiltro(f)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: `1px solid ${logFiltro === f ? "#7c3aed" : t.cardBorder}`,
                  background: logFiltro === f ? "#7c3aed22" : "transparent",
                  color: logFiltro === f ? "#a78bfa" : t.textMuted,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Última{f === "1h" ? " 1 hora" : f === "24h" ? "s 24h" : "s 48h"}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <p style={{ color: t.textMuted }}>Carregando...</p>
        ) : (() => {
          const horasDisplay = logFiltro === "1h" ? 1 : logFiltro === "24h" ? 24 : 48;
          const desdeDisplay = new Date();
          desdeDisplay.setHours(desdeDisplay.getHours() - horasDisplay);
          const techLogsFiltrados = techLogs.filter((l) => new Date(l.created_at) >= desdeDisplay);
          return techLogsFiltrados.length === 0 ? (
            <p style={{ color: t.textMuted, fontFamily: FONT.body }}>Nenhum log de erro no período.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Hora</th>
                    <th style={thStyle}>Integração</th>
                    <th style={thStyle}>Tipo</th>
                    <th style={thStyle}>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {techLogsFiltrados.map((log) => {
                  const integracaoLabel =
                    log.integracao_slug
                      ? integrations.find((i) => i.slug === log.integracao_slug)?.nome ?? log.integracao_slug
                      : {
                          instagram: "Social Media (Instagram)",
                          facebook: "Social Media (Facebook)",
                          youtube: "Social Media (YouTube)",
                          linkedin: "Social Media (LinkedIn)",
                          relatorio_diretoria: "E-mail - Relatório de Influencers (Resend)",
                          resend: "E-mail (Resend)",
                        }[log.tipo] ?? (log.tipo.startsWith("relatorio_")
                          ? `E-mail - Relatório ${log.tipo.replace("relatorio_", "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} (Resend)`
                          : log.tipo);
                    return (
                      <tr key={log.id}>
                        <td style={tdStyle}>{formatarHora(log.created_at)}</td>
                        <td style={tdStyle}>{integracaoLabel}</td>
                        <td style={tdStyle}>
                          <code style={{ background: t.bg, padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>{log.tipo}</code>
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
