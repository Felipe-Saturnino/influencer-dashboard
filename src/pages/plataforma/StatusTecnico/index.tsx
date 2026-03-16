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

interface Integration {
  slug: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface FluxoDia {
  data: string;
  total: number;
}

export default function StatusTecnico() {
  const { theme: t } = useApp();
  const perm = usePermission("status_tecnico");
  const [loading, setLoading] = useState(true);
  const [syncExecutando, setSyncExecutando] = useState(false);
  const [syncMensagem, setSyncMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [techLogs, setTechLogs] = useState<TechLog[]>([]);
  const [fluxoDados, setFluxoDados] = useState<FluxoDia[]>([]);
  const [registrosHoje, setRegistrosHoje] = useState(0);
  const [logFiltro, setLogFiltro] = useState<"1h" | "24h" | "48h">("24h");

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

    // Tech logs com filtro de tempo
    const horas = logFiltro === "1h" ? 1 : logFiltro === "24h" ? 24 : 48;
    const desde = new Date();
    desde.setHours(desde.getHours() - horas);
    const { data: techData } = await supabase
      .from("tech_logs")
      .select("*")
      .gte("created_at", desde.toISOString())
      .order("created_at", { ascending: false })
      .limit(50);
    setTechLogs(techData ?? []);

    // Registros hoje (influencer_metricas)
    const { count } = await supabase
      .from("influencer_metricas")
      .select("*", { count: "exact", head: true })
      .eq("data", hoje);
    setRegistrosHoje(count ?? 0);

    // Fluxo de dados (últimos 14 dias)
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 14);
    const { data: fluxoData } = await supabase
      .from("influencer_metricas")
      .select("data")
      .gte("data", dataInicio.toISOString().split("T")[0]);
    const agrupado = (fluxoData ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.data] = (acc[row.data] ?? 0) + 1;
      return acc;
    }, {});
    const fluxoArray: FluxoDia[] = Object.entries(agrupado)
      .map(([data, total]) => ({ data, total }))
      .sort((a, b) => a.data.localeCompare(b.data));
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
      // Usa anon key (não expira) em vez do token de sessão para evitar 401
      const token = supabaseAnonKey;
      if (!token || !supabaseUrl) {
        setSyncMensagem({ tipo: "erro", texto: "Configuração do Supabase incompleta." });
        setSyncExecutando(false);
        return;
      }
      const url = `${supabaseUrl}/functions/v1/sync-metricas`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const resData = (await res.json().catch(() => ({}))) as { ok?: boolean; erro?: string; error?: string; fase1_influencers?: { registros_upserted?: number; aliases_mapeados?: number } };
      if (!res.ok) {
        const msg = resData?.erro ?? resData?.error ?? `Erro ${res.status}: ${res.statusText}`;
        let texto = msg;
        if (res.status === 401) {
          texto = "Não autorizado (401). Verifique no Supabase se a Edge Function sync-metricas está implantada e se aceita requisições com a chave do projeto.";
        } else if (msg.includes("SMARTICO_TOKEN")) {
          texto = `${msg} Configure em Supabase → Settings → Edge Functions → Secrets.`;
        } else if (res.status === 500) {
          texto = `${msg} Verifique os logs em Supabase → Edge Functions → sync-metricas → Logs.`;
        }
        setSyncMensagem({ tipo: "erro", texto });
        setSyncExecutando(false);
        return;
      }
      if (resData?.ok) {
        const regs = resData?.fase1_influencers?.registros_upserted ?? 0;
        const aliases = resData?.fase1_influencers?.aliases_mapeados ?? 0;
        setSyncMensagem({ tipo: "ok", texto: `Sync concluído: ${regs} registros sincronizados${aliases > 0 ? ` (${aliases} aliases mapeados)` : ""}. Atualize os dashboards.` });
        carregar();
      } else {
        setSyncMensagem({ tipo: "erro", texto: resData?.erro ?? "Erro desconhecido" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSyncMensagem({ tipo: "erro", texto: msg });
    } finally {
      setSyncExecutando(false);
    }
  };

  // KPIs derivados
  const ultimoSyncOk = syncLogs.find((l) => l.status === "ok");
  const integracoesAtivas = integrations.filter((int) => {
    const ultimo = syncLogs.find((l) => l.integracao_slug === int.slug && l.status === "ok");
    return ultimo && ultimo.executado_em;
  }).length;
  const totalSyncs = syncLogs.length;
  const syncsFalha = syncLogs.filter((l) => l.status === "falha").length;
  const taxaErro = totalSyncs > 0 ? ((syncsFalha / totalSyncs) * 100).toFixed(1) : "0";

  // Alertas derivados
  const alertas: Array<{ nivel: "erro" | "aviso"; msg: string; integracao?: string }> = [];
  const vinteQuatroHoras = new Date();
  vinteQuatroHoras.setHours(vinteQuatroHoras.getHours() - 24);
  integrations.forEach((int) => {
    const logs = syncLogs.filter((l) => l.integracao_slug === int.slug);
    const ultimoOk = logs.find((l) => l.status === "ok");
    const ultimoFalha = logs.find((l) => l.status === "falha");
    if (!ultimoOk && ultimoFalha) {
      alertas.push({ nivel: "erro", msg: "Nenhum sync com sucesso", integracao: int.nome });
    } else if (ultimoOk) {
      const exec = new Date(ultimoOk.executado_em);
      if (exec < vinteQuatroHoras) {
        alertas.push({ nivel: "aviso", msg: "Último sync há mais de 24h", integracao: int.nome });
      }
    }
  });
  if (parseFloat(taxaErro) > 5) {
    alertas.push({ nivel: "erro", msg: `Taxa de erro acima de 5% (${taxaErro}%)` });
  }
  if (registrosHoje === 0 && fluxoDados.some((f) => f.total > 0)) {
    alertas.push({ nivel: "aviso", msg: "Nenhum registro processado hoje" });
  }

  // Status por integração (última execução)
  const hojeIso = new Date().toISOString().split("T")[0];
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
    };
  });

  const maxFluxo = Math.max(...fluxoDados.map((f) => f.total), 1);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: FONT.title, fontSize: 28, color: t.text, margin: 0 }}>
            📡 Status Técnico
          </h1>
          <p style={{ color: t.textMuted, marginTop: 6, fontFamily: FONT.body }}>
            Acompanhamento de integrações e saúde da plataforma.
          </p>
        </div>
        <button
          onClick={executarSync}
          disabled={syncExecutando || !perm.canView}
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: syncExecutando ? "#6b7280" : "linear-gradient(135deg, #4a2082, #1e36f8)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: syncExecutando ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {syncExecutando ? "Sincronizando..." : "🔄 Executar Sync"}
        </button>
      </div>

      {syncMensagem && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: syncMensagem.tipo === "ok" ? "#05966922" : "#ef444422",
            border: `1px solid ${syncMensagem.tipo === "ok" ? "#059669" : "#ef4444"}`,
            color: syncMensagem.tipo === "ok" ? "#059669" : "#ef4444",
            fontFamily: FONT.body,
            fontSize: 13,
          }}
        >
          {syncMensagem.tipo === "ok" ? "✅ " : "⚠️ "}
          {syncMensagem.texto}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div style={card}>
          <p style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>
            Integrações Ativas
          </p>
          <p style={{ fontFamily: FONT.title, fontSize: 28, color: "#059669", margin: 0, fontWeight: 700 }}>
            {loading ? "—" : `${integracoesAtivas} / ${integrations.length}`}
          </p>
        </div>
        <div style={card}>
          <p style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>
            Último Sync
          </p>
          <p style={{ fontFamily: FONT.title, fontSize: 28, color: t.text, margin: 0, fontWeight: 600 }}>
            {loading ? "—" : ultimoSyncOk ? formatarHora(ultimoSyncOk.executado_em) : "Nunca"}
          </p>
        </div>
        <div style={card}>
          <p style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>
            Registros Hoje
          </p>
          <p style={{ fontFamily: FONT.title, fontSize: 28, color: "#7c3aed", margin: 0, fontWeight: 700 }}>
            {loading ? "—" : registrosHoje.toLocaleString("pt-BR")}
          </p>
        </div>
        <div style={card}>
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
        </div>
      </div>

      {/* Status das Integrações */}
      <div style={card}>
        <h2 style={{ fontFamily: FONT.title, fontSize: 16, color: t.text, margin: "0 0 20px" }}>
          Status das Integrações
        </h2>
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
                </tr>
              </thead>
              <tbody>
                {statusPorIntegracao.map((row) => (
                  <tr key={row.slug}>
                    <td style={tdStyle}>{row.nome}</td>
                    <td style={tdStyle}>{row.ultimoSync ? formatarHora(row.ultimoSync) : "—"}</td>
                    <td style={tdStyle}>{row.registrosHoje.toLocaleString("pt-BR")}</td>
                    <td style={tdStyle}>{row.erros}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: row.status === "ok" ? "#05966922" : row.status === "warning" ? "#f59e0b22" : "#ef444422",
                          color: row.status === "ok" ? "#059669" : row.status === "warning" ? "#f59e0b" : "#ef4444",
                          borderRadius: 8,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {row.status === "ok" && "🟢 OK"}
                        {row.status === "warning" && "🟡 Warning"}
                        {row.status === "falha" && "🔴 Falha"}
                      </span>
                    </td>
                  </tr>
                ))}
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
        {loading ? (
          <p style={{ color: t.textMuted }}>Carregando...</p>
        ) : fluxoDados.length === 0 ? (
          <p style={{ color: t.textMuted, fontFamily: FONT.body }}>Nenhum dado no período.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {fluxoDados.slice(-14).map((f) => (
              <div key={f.data} style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
                  }}
                >
                  <div
                    style={{
                      width: `${(f.total / maxFluxo) * 100}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #7c3aed, #2563eb)",
                      borderRadius: 6,
                      minWidth: f.total > 0 ? 4 : 0,
                    }}
                  />
                </div>
                <span style={{ fontFamily: FONT.body, fontSize: 12, fontWeight: 600, color: t.text, minWidth: 60 }}>
                  {f.total.toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
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
                <span style={{ fontFamily: FONT.body, fontSize: 13, color: t.text }}>
                  {a.msg}
                  {a.integracao && ` — Integração: ${a.integracao}`}
                </span>
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
        ) : techLogs.length === 0 ? (
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
                {techLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={tdStyle}>{formatarHora(log.created_at)}</td>
                    <td style={tdStyle}>{log.integracao_slug ?? "—"}</td>
                    <td style={tdStyle}>
                      <code style={{ background: t.bg, padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>{log.tipo}</code>
                    </td>
                    <td style={tdStyle}>{log.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                  <td style={tdStyle}>Nenhum registro novo</td>
                  <td style={tdStyle}>24h</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Taxa de erro</td>
                  <td style={tdStyle}>&gt; 5%</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Sync atrasado</td>
                  <td style={tdStyle}>&gt; 1h</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Integração offline</td>
                  <td style={tdStyle}>timeout</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
