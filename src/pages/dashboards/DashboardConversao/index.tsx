import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, BarChart, Bar, Legend,
} from "recharts";

interface InfluencerPerfil {
  id: string;
  nome_artistico: string;
  cache_hora: number;
}

interface ConversaoRow {
  influencer_id: string;
  nome: string;
  views: number;
  acessos: number;
  registros: number;
  ftds: number;
  horas: number;
  pctViewAcesso: number | null;
  pctAcessoReg: number;
  pctRegFTD: number;
  pctViewFTD: number | null;
  ftdPorHora: number;
  perfil: string;
}

function getPeriodDates(periodo: string): { inicio: string; fim: string } {
  const hoje = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (periodo === "mes_atual") {
    return { inicio: fmt(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim: fmt(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)) };
  }
  if (periodo === "semana_atual") {
    const diff = hoje.getDay() === 0 ? -6 : 1 - hoje.getDay();
    const inicio = new Date(hoje); inicio.setDate(hoje.getDate() + diff);
    return { inicio: fmt(inicio), fim: fmt(hoje) };
  }
  if (periodo === "ultimos_30") {
    const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - 29);
    return { inicio: fmt(inicio), fim: fmt(hoje) };
  }
  return { inicio: fmt(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)), fim: fmt(new Date(hoje.getFullYear(), hoje.getMonth(), 0)) };
}

function pct(num: number, den: number): number | null {
  if (den === 0) return null;
  return (num / den) * 100;
}

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return v.toFixed(1) + "%";
}

function perfilConversao(row: ConversaoRow): { label: string; cor: string; bg: string; border: string } {
  const p = row.pctViewFTD;
  if (p !== null && p >= 5) return { label: "Conversor", cor: "#22c55e", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.28)" };
  if (row.views > 5000)      return { label: "Audiência", cor: "#3b82f6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.28)" };
  if (p !== null && p < 2)   return { label: "Baixa qualidade", cor: "#ef4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.28)" };
  return                            { label: "Equilibrado", cor: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)" };
}

export default function DashboardConversao() {
  const { theme: t } = useApp();
  const [periodo, setPeriodo]   = useState("mes_atual");
  const [influencerFiltro, setInfluencerFiltro] = useState("todos");
  const [plataformaFiltro, setPlataformaFiltro] = useState("todas");
  const [loading, setLoading]   = useState(true);
  const [perfis, setPerfis]     = useState<InfluencerPerfil[]>([]);
  const [rows, setRows]         = useState<ConversaoRow[]>([]);
  const [influencerDetalhe, setInfluencerDetalhe] = useState<string>("todos");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { inicio, fim } = getPeriodDates(periodo);

      const { data: perfisData } = await supabase
        .from("influencer_perfil")
        .select("id, nome_artistico, cache_hora")
        .order("nome_artistico");
      const perfisLista: InfluencerPerfil[] = perfisData || [];
      setPerfis(perfisLista);

      let qMetricas = supabase
        .from("influencer_metricas")
        .select("influencer_id, registration_count, ftd_count, visit_count, data")
        .gte("data", inicio).lte("data", fim);
      if (influencerFiltro !== "todos") qMetricas = qMetricas.eq("influencer_id", influencerFiltro);

      const { data: metricasData } = await qMetricas;
      const metricas = metricasData || [];

      let qLives = supabase
        .from("lives")
        .select("id, influencer_id, status, plataforma, data")
        .gte("data", inicio).lte("data", fim).eq("status", "realizada");
      if (influencerFiltro !== "todos") qLives = qLives.eq("influencer_id", influencerFiltro);
      if (plataformaFiltro !== "todas") qLives = qLives.eq("plataforma", plataformaFiltro);

      const { data: livesData } = await qLives;
      const lives = livesData || [];

      const liveIds = lives.map((l: any) => l.id);
      let resultados: any[] = [];
      if (liveIds.length > 0) {
        const { data: resData } = await supabase
          .from("live_resultados")
          .select("live_id, duracao_horas, duracao_min, media_views")
          .in("live_id", liveIds);
        resultados = resData || [];
      }

      // Agregar por influencer
      const mapa = new Map<string, { acessos: number; registros: number; ftds: number; views: number; horas: number }>();

      metricas.forEach((m: any) => {
        if (!mapa.has(m.influencer_id)) mapa.set(m.influencer_id, { acessos: 0, registros: 0, ftds: 0, views: 0, horas: 0 });
        const r = mapa.get(m.influencer_id)!;
        r.acessos   += m.visit_count || 0;
        r.registros += m.registration_count || 0;
        r.ftds      += m.ftd_count || 0;
      });

      lives.forEach((live: any) => {
        if (!mapa.has(live.influencer_id)) mapa.set(live.influencer_id, { acessos: 0, registros: 0, ftds: 0, views: 0, horas: 0 });
        const r = mapa.get(live.influencer_id)!;
        const res = resultados.find((x: any) => x.live_id === live.id);
        if (res) {
          r.views += res.media_views || 0;
          r.horas += (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
        }
      });

      const resultado: ConversaoRow[] = [];
      mapa.forEach((data, id) => {
        const perfil = perfisLista.find((p) => p.id === id);
        if (!perfil) return;
        const row: ConversaoRow = {
          influencer_id: id,
          nome: perfil.nome_artistico,
          views: data.views,
          acessos: data.acessos,
          registros: data.registros,
          ftds: data.ftds,
          horas: data.horas,
          pctViewAcesso:   pct(data.acessos, data.views),
          pctAcessoReg:    pct(data.registros, data.acessos) ?? 0,
          pctRegFTD:       pct(data.ftds, data.registros) ?? 0,
          pctViewFTD:      pct(data.ftds, data.views),
          ftdPorHora:      data.horas > 0 ? data.ftds / data.horas : 0,
          perfil: "",
        };
        row.perfil = perfilConversao(row).label;
        resultado.push(row);
      });

      resultado.sort((a, b) => b.ftds - a.ftds);
      setRows(resultado);
      setLoading(false);
    }
    carregar();
  }, [periodo, influencerFiltro, plataformaFiltro]);

  const detalhe = influencerDetalhe !== "todos"
    ? rows.find((r) => r.influencer_id === influencerDetalhe) || null
    : null;

  const scatterData = rows.map((r) => ({ nome: r.nome.split(" ")[0], views: r.views, ftds: r.ftds, id: r.influencer_id }));
  const eficienciaData = rows.slice(0, 10).map((r) => ({
    nome: r.nome.split(" ")[0],
    "FTD/Hora": parseFloat(r.ftdPorHora.toFixed(2)),
    "Reg→FTD%": parseFloat(r.pctRegFTD.toFixed(1)),
  }));

  const card = { background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 16, boxShadow: "0 6px 24px rgba(0,0,0,0.25)" } as React.CSSProperties;
  const cardTitle = { margin: "0 0 14px", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", color: t.text, fontFamily: FONT.body } as React.CSSProperties;
  const selectStyle = { background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.text, padding: "9px 12px", borderRadius: 12, fontSize: 13, fontFamily: FONT.body, outline: "none", cursor: "pointer" } as React.CSSProperties;
  const thStyle = { textAlign: "left" as const, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: t.textMuted, padding: "10px 12px", borderBottom: `1px solid ${t.cardBorder}`, background: "rgba(255,255,255,0.03)", fontFamily: FONT.body, whiteSpace: "nowrap" as const };
  const tdStyle = { padding: "10px 12px", fontSize: 13, borderBottom: `1px solid rgba(255,255,255,0.05)`, color: t.text, fontFamily: FONT.body, whiteSpace: "nowrap" as const };

  return (
    <div style={{ padding: "20px 24px 40px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.text, fontFamily: FONT.title, letterSpacing: "0.03em" }}>
          Dashboards • Conversão
        </h2>
        <p style={{ margin: "6px 0 0", color: t.textMuted, fontSize: 13 }}>
          Análise do funil de conversão por influencer — taxas, eficiência e perfil de audiência.
        </p>
      </div>

      {/* FILTROS */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={selectStyle}>
          <option value="mes_atual">Mês atual</option>
          <option value="semana_atual">Semana atual</option>
          <option value="ultimos_30">Últimos 30 dias</option>
          <option value="mes_passado">Mês passado</option>
        </select>
        <select value={influencerFiltro} onChange={(e) => setInfluencerFiltro(e.target.value)} style={selectStyle}>
          <option value="todos">Influencer: Todos</option>
          {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome_artistico}</option>)}
        </select>
        <select value={plataformaFiltro} onChange={(e) => setPlataformaFiltro(e.target.value)} style={selectStyle}>
          <option value="todas">Plataforma: Todas</option>
          {["Twitch", "YouTube", "Instagram", "TikTok", "Kick"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {loading && <span style={{ fontSize: 12, color: t.textMuted }}>⏳ Carregando...</span>}
      </div>

      {/* FUNIL DETALHADO POR INFLUENCER */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ ...cardTitle, margin: 0 }}>Funil por Influencer</h3>
            <select
              value={influencerDetalhe}
              onChange={(e) => setInfluencerDetalhe(e.target.value)}
              style={{ ...selectStyle, fontSize: 12 }}
            >
              <option value="todos">Consolidado (todos)</option>
              {rows.map((r) => <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>)}
            </select>
          </div>

          {(() => {
            const d = detalhe || {
              views: rows.reduce((s, r) => s + r.views, 0),
              acessos: rows.reduce((s, r) => s + r.acessos, 0),
              registros: rows.reduce((s, r) => s + r.registros, 0),
              ftds: rows.reduce((s, r) => s + r.ftds, 0),
              horas: rows.reduce((s, r) => s + r.horas, 0),
            };
            const taxa1 = fmtPct(pct(d.acessos, d.views));
            const taxa2 = fmtPct(pct(d.registros, d.acessos));
            const taxa3 = fmtPct(pct(d.ftds, d.registros));
            const taxa4 = fmtPct(pct(d.ftds, d.views));
            const ftdH  = d.horas > 0 ? (d.ftds / d.horas).toFixed(2) : "—";

            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  {[
                    { label: "Views", val: d.views, pct: undefined },
                    { label: "Acessos", val: d.acessos, pct: taxa1 },
                    { label: "Registros", val: d.registros, pct: taxa2 },
                    { label: "FTDs", val: d.ftds, pct: taxa3 },
                  ].map((step) => (
                    <div key={step.label} style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${t.cardBorder}`, background: "rgba(255,255,255,0.03)", marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{step.label}</div>
                          {step.pct && <div style={{ fontSize: 11, color: BASE_COLORS.purple, marginTop: 2 }}>↓ {step.pct}</div>}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>{step.val.toLocaleString("pt-BR")}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignContent: "start" }}>
                  {[
                    { l: "View→Acesso", v: taxa1, h: "CTA / link" },
                    { l: "Acesso→Reg", v: taxa2, h: "UX cadastro" },
                    { l: "Reg→FTD", v: taxa3, h: "Incentivo" },
                    { l: "View→FTD", v: taxa4, h: "Eficiência", hl: true },
                    { l: "FTD/Hora", v: ftdH, h: "Produtividade" },
                  ].map((r) => (
                    <div key={r.l} style={{ padding: "10px 10px", borderRadius: 12, border: r.hl ? "1px solid rgba(109,40,217,0.35)" : `1px solid ${t.cardBorder}`, background: r.hl ? "rgba(109,40,217,0.12)" : "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: 11, color: t.textMuted }}>{r.l}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: t.text, margin: "4px 0 2px" }}>{r.v}</div>
                      <div style={{ fontSize: 10, color: t.textMuted }}>{r.h}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Scatter: Volume vs Conversão */}
        <div style={card}>
          <h3 style={cardTitle}>Mapa: Volume vs Conversão</h3>
          <p style={{ margin: "-8px 0 12px", fontSize: 12, color: t.textMuted }}>
            Cada ponto é um influencer. X = Views totais, Y = FTDs gerados.
          </p>
          {loading || rows.length === 0 ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>
              {loading ? "Carregando..." : "Sem dados no período"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="views" name="Views" tick={{ fill: t.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v > 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <YAxis dataKey="ftds" name="FTDs" tick={{ fill: t.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, fontSize: 12, color: t.text }}
                  formatter={(value, name, props) => [value, name]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.nome || ""}
                />
                <Scatter data={scatterData} fill="rgba(109,40,217,0.8)">
                  {scatterData.map((_, i) => (
                    <Cell key={i} fill={`rgba(109,40,217,${0.5 + i * 0.02})`} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            {[
              { label: "Alto alcance", hint: "Views altos", cor: "#3b82f6" },
              { label: "Alta conversão", hint: "FTDs altos", cor: "#22c55e" },
            ].map((q) => (
              <div key={q.label} style={{ fontSize: 11, color: t.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: q.cor, display: "inline-block" }} />
                <span style={{ color: q.cor }}>{q.label}</span> — {q.hint}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GRÁFICO EFICIÊNCIA */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h3 style={cardTitle}>Eficiência por Influencer — FTD/Hora e Taxa Registro→FTD (%)</h3>
        {loading || eficienciaData.length === 0 ? (
          <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>
            {loading ? "Carregando..." : "Sem dados"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={eficienciaData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="nome" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: t.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, fontSize: 12, color: t.text }} />
              <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted }} />
              <Bar dataKey="FTD/Hora" fill="rgba(109,40,217,0.75)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Reg→FTD%" fill="rgba(34,197,94,0.65)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* TABELA COMPARATIVA */}
      <div style={card}>
        <h3 style={cardTitle}>Comparativo de Taxas de Conversão</h3>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Carregando dados...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Nenhum dado encontrado.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
              <thead>
                <tr>
                  {["Influencer", "Views", "Acessos", "Registros", "FTDs", "View→Acesso", "Acesso→Reg", "Reg→FTD", "View→FTD", "FTD/Hora", "Perfil"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const pf = perfilConversao(r);
                  return (
                    <tr key={r.influencer_id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nome}</td>
                      <td style={tdStyle}>{r.views > 0 ? r.views.toLocaleString("pt-BR") : "—"}</td>
                      <td style={tdStyle}>{r.acessos.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{r.registros.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{r.ftds.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{fmtPct(r.pctViewAcesso)}</td>
                      <td style={tdStyle}>{fmtPct(r.pctAcessoReg)}</td>
                      <td style={tdStyle}>{fmtPct(r.pctRegFTD)}</td>
                      <td style={tdStyle}>{fmtPct(r.pctViewFTD)}</td>
                      <td style={tdStyle}>{r.ftdPorHora > 0 ? r.ftdPorHora.toFixed(2) : "—"}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${pf.border}`, background: pf.bg, color: pf.cor, fontSize: 11 }}>{pf.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
