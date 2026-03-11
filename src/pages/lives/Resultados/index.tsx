import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { Live, LiveResultado, LiveStatus } from "../../../types";
import InfluencerMultiSelect from "../../../components/InfluencerMultiSelect";

const PLAT_COLOR: Record<string, string> = {
  Twitch: "#9146ff", YouTube: "#ff0000", Instagram: "#e1306c",
  TikTok: "#010101", Kick: "#53fc18",
};

const STATUS_OPTS: { value: LiveStatus; label: string; color: string }[] = [
  { value: "realizada",     label: "Realizada",     color: "#27ae60" },
  { value: "nao_realizada", label: "Não Realizada", color: "#e94025" },
];

function toISO(d: Date) { return d.toISOString().split("T")[0]; }

export default function Resultados() {
  const { theme: t } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, escoposVisiveis } = useDashboardFiltros();
  const perm = usePermission("resultados");

  const [lives,        setLives]        = useState<Live[]>([]);
  const [resultados,   setResultados]   = useState<Record<string, LiveResultado>>({});
  const [nomeCompletos, setNomeCompletos] = useState<Record<string, string>>({});
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState<Live | null>(null);
  const [filterInfluencers, setFilterInfluencers] = useState<string[]>([]);
  const [filterOperadora,   setFilterOperadora]   = useState<string>("todas");
  const [influencerList,    setInfluencerList]    = useState<{ id: string; name: string }[]>([]);
  const [operadorasList,    setOperadorasList]    = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraInfMap,   setOperadoraInfMap]   = useState<Record<string, string[]>>({});

  const todayISO = toISO(new Date());

  const influencerListVisiveis = useMemo(() =>
    influencerList.filter((i) => podeVerInfluencer(i.id)),
    [influencerList, podeVerInfluencer]
  );
  const showInfluencerName = influencerListVisiveis.length > 1;

  async function loadData() {
    setLoading(true);

    const { data: livesData } = await supabase
      .from("lives")
      .select("*, profiles!lives_influencer_id_fkey(name)")
      .lt("data", todayISO)
      .eq("status", "agendada")
      .order("data", { ascending: false })
      .order("horario", { ascending: true });

    if (livesData) {
      const mapped = livesData.map((l: any) => ({
        ...l,
        influencer_name: l.profiles?.name,
      }));
      const visiveis = mapped.filter((l: Live) => podeVerInfluencer(l.influencer_id));
      setLives(visiveis);

      const ids = visiveis.map((l: Live) => l.id);
      if (ids.length > 0) {
        const { data: resData } = await supabase
          .from("live_resultados").select("*").in("live_id", ids);
        if (resData) {
          const map: Record<string, LiveResultado> = {};
          resData.forEach((r: LiveResultado) => { map[r.live_id] = r; });
          setResultados(map);
        }
      }

      // Buscar nome_completo quando há múltiplos influencers nas lives
      const influencerIds = [...new Set(visiveis.map((l: any) => l.influencer_id).filter(Boolean))];
      if (influencerIds.length > 1) {
        if (influencerIds.length > 0) {
          const { data: perfisData } = await supabase
            .from("influencer_perfil")
            .select("id, nome_completo")
            .in("id", influencerIds);
          if (perfisData) {
            const nomesMap: Record<string, string> = {};
            perfisData.forEach((p: any) => { nomesMap[p.id] = p.nome_completo ?? ""; });
            setNomeCompletos(nomesMap);
          }
        }
      }
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [podeVerInfluencer]);

  useEffect(() => {
    supabase.from("profiles").select("id, name").eq("role", "influencer")
      .then(({ data }) => { if (data) setInfluencerList(data); });
  }, []);

  useEffect(() => {
    supabase.from("operadoras").select("slug, nome").order("nome")
      .then(({ data }) => { if (data) setOperadorasList(data); });
  }, []);

  useEffect(() => {
    supabase.from("influencer_operadoras").select("influencer_id, operadora_slug")
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string[]> = {};
        data.forEach((row: { influencer_id: string; operadora_slug: string }) => {
          if (!map[row.operadora_slug]) map[row.operadora_slug] = [];
          map[row.operadora_slug].push(row.influencer_id);
        });
        setOperadoraInfMap(map);
      });
  }, []);

  const livesFiltered = useMemo(() => {
    let out = lives;
    if (filterInfluencers.length > 0)
      out = out.filter((l) => filterInfluencers.includes(l.influencer_id));
    if (filterOperadora && filterOperadora !== "todas") {
      const ids = operadoraInfMap[filterOperadora] ?? [];
      out = out.filter((l) => ids.includes(l.influencer_id));
    }
    return out;
  }, [lives, filterInfluencers, filterOperadora, operadoraInfMap]);

  const card: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "16px", padding: "20px", marginBottom: "12px",
  };
  const badge = (color: string): React.CSSProperties => ({
    fontSize: "11px", padding: "3px 10px", borderRadius: "20px",
    background: `${color}22`, color, fontWeight: 600, fontFamily: FONT.body,
  });

  function LiveCard({ live }: { live: Live }) {
    // FIX: subtítulo exibe Nome Completo (nome real) · data · hora
    const nomeCompleto = nomeCompletos[live.influencer_id] ?? "";

    return (
      <div style={card}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: PLAT_COLOR[live.plataforma], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
              {live.plataforma === "Twitch" ? "🟣" : live.plataforma === "YouTube" ? "▶️" : live.plataforma === "Instagram" ? "📸" : live.plataforma === "TikTok" ? "🎵" : "🟢"}
            </div>
            <div>
              {/* Linha 1: Nome Artístico em negrito */}
              <div style={{ fontSize: "14px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>{live.influencer_name}</div>
              {/* FIX linha 2: Nome Completo · data · hora */}
              <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginTop: "2px" }}>
                {showInfluencerName && nomeCompleto && <span>{nomeCompleto} · </span>}
                {live.data} · {live.horario?.slice(0, 5)}
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                <span style={badge(PLAT_COLOR[live.plataforma])}>{live.plataforma}</span>
                <span style={badge("#f39c12")}>⚠️ Pendente validação</span>
              </div>
            </div>
          </div>

          {perm.canEditarOk && (
            <button onClick={() => setModal(live)}
              style={{ padding: "8px 16px", borderRadius: "10px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "12px", fontWeight: 700, fontFamily: FONT.body }}>
              ✅ Validar
            </button>
          )}
        </div>
      </div>
    );
  }

  function ModalValidacao({ live }: { live: Live }) {
    const existing = resultados[live.id];
    const [status,       setStatus]       = useState<LiveStatus>("realizada");
    const [observacao,   setObservacao]   = useState("");
    const [horarioReal,  setHorarioReal]  = useState(live.horario?.slice(0, 5) ?? "");
    const [duracaoHoras, setDuracaoHoras] = useState(existing?.duracao_horas ?? 0);
    const [duracaoMin,   setDuracaoMin]   = useState(existing?.duracao_min   ?? 0);
    const [mediaViews,   setMediaViews]   = useState(existing?.media_views   ?? 0);
    const [maxViews,     setMaxViews]     = useState(existing?.max_views     ?? 0);
    const [saving,       setSaving]       = useState(false);
    const [error,        setError]        = useState("");

    const showResultFields = status === "realizada";

    async function handleSave() {
      setError("");
      if (showResultFields) {
        if (duracaoHoras === 0 && duracaoMin === 0)
          return setError("Informe a duração da live.");
        if (maxViews < mediaViews)
          return setError("Máximo não pode ser menor que a média.");
      }

      setSaving(true);

      const liveUpdate: Record<string, any> = {
        status,
        observacao: observacao || null,
      };
      if (showResultFields && horarioReal) {
        liveUpdate.horario = horarioReal;
      }

      const { error: updateError } = await supabase
        .from("lives")
        .update(liveUpdate)
        .eq("id", live.id);

      if (updateError) {
        setError("Erro ao salvar. Tente novamente.");
        setSaving(false);
        return;
      }

      if (showResultFields) {
        const payload = {
          live_id:       live.id,
          duracao_horas: duracaoHoras,
          duracao_min:   duracaoMin,
          media_views:   mediaViews,
          max_views:     maxViews,
        };
        const { error: resultError } = existing
          ? await supabase.from("live_resultados").update(payload).eq("live_id", live.id)
          : await supabase.from("live_resultados").insert(payload);

        if (resultError) {
          setError("Erro ao salvar resultado. Tente novamente.");
          setSaving(false);
          return;
        }
      }

      setSaving(false);
      setModal(null);
      await loadData();
    }

    const inputStyle: React.CSSProperties = {
      width: "100%", boxSizing: "border-box", padding: "10px 14px",
      borderRadius: "10px", border: `1px solid ${t.inputBorder}`,
      background: t.inputBg, color: t.inputText,
      fontSize: "13px", fontFamily: FONT.body, outline: "none",
    };
    const labelStyle: React.CSSProperties = {
      display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "1.2px",
      textTransform: "uppercase", color: t.label, marginBottom: "5px", fontFamily: FONT.body,
    };
    const row: React.CSSProperties = { marginBottom: "14px" };

    return (
      <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>
              ✅ Validar Live
            </h2>
            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
          </div>
          {/* Modal header: Nome Artístico · data · hora */}
          <div style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "20px" }}>
            {live.influencer_name} · {live.data} {live.horario?.slice(0, 5)}
          </div>

          {error && (
            <div style={{ background: "#e9402518", border: "1px solid #e9402544", color: "#e94025", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "14px" }}>
              ⚠️ {error}
            </div>
          )}

          <div style={row}>
            <label style={labelStyle}>Status da Live</label>
            <div style={{ display: "flex", gap: "10px" }}>
              {STATUS_OPTS.map(opt => (
                <button key={opt.value} onClick={() => setStatus(opt.value)}
                  style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `2px solid ${status === opt.value ? opt.color : t.cardBorder}`, background: status === opt.value ? `${opt.color}18` : t.inputBg, color: status === opt.value ? opt.color : t.textMuted, fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body, transition: "all 0.15s" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={row}>
            <label style={labelStyle}>Observação</label>
            <textarea value={observacao} onChange={e => setObservacao(e.target.value)}
              rows={3} placeholder="Comentários sobre a live..."
              style={{ ...inputStyle, resize: "vertical", lineHeight: "1.5" }} />
          </div>

          {showResultFields && (
            <>
              <div style={row}>
                <label style={labelStyle}>Horário Real de Início</label>
                <input type="time" value={horarioReal} onChange={e => setHorarioReal(e.target.value)} style={inputStyle} />
                <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body, marginTop: "4px", display: "block" }}>
                  Pré-preenchido com o horário agendado. Altere se a live começou em outro horário.
                </span>
              </div>

              <div style={row}>
                <label style={labelStyle}>Duração</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <input type="number" min={0} max={24} value={duracaoHoras} onChange={e => setDuracaoHoras(Number(e.target.value))} style={inputStyle} placeholder="0" />
                    <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>horas</span>
                  </div>
                  <div>
                    <input type="number" min={0} max={59} value={duracaoMin} onChange={e => setDuracaoMin(Number(e.target.value))} style={inputStyle} placeholder="0" />
                    <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>min</span>
                  </div>
                </div>
              </div>

              <div style={row}>
                <label style={labelStyle}>Média de Views</label>
                <input type="number" min={0} value={mediaViews} onChange={e => setMediaViews(Number(e.target.value))} style={inputStyle} placeholder="0" />
              </div>

              <div style={row}>
                <label style={labelStyle}>Máximo de Views</label>
                <input type="number" min={0} value={maxViews} onChange={e => setMaxViews(Number(e.target.value))} style={inputStyle} placeholder="0" />
              </div>

              <div style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "16px" }}>
                ℹ️ Salvar irá marcar a live como Realizada automaticamente.
              </div>
            </>
          )}

          <button onClick={handleSave} disabled={saving}
            style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            {saving ? "⏳" : "Salvar Validação"}
          </button>
        </div>
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar os resultados de lives.
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: t.text, fontFamily: FONT.title, margin: "0 0 6px" }}>
          📋 Resultado de Lives
        </h1>
        <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>
          Lives passadas com status pendente de validação.
        </p>
      </div>

      {(showFiltroInfluencer || showFiltroOperadora) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
          {showFiltroInfluencer && influencerListVisiveis.length > 0 && (
            <InfluencerMultiSelect
              selected={filterInfluencers}
              onChange={setFilterInfluencers}
              influencers={influencerListVisiveis}
              t={t}
            />
          )}
          {showFiltroOperadora && operadorasList.length > 0 && (
            <select
              value={filterOperadora}
              onChange={(e) => setFilterOperadora(e.target.value)}
              style={{
                padding: "6px 14px", borderRadius: "20px",
                border: `1.5px solid ${filterOperadora !== "todas" ? BASE_COLORS.purple : t.cardBorder}`,
                background: filterOperadora !== "todas" ? `${BASE_COLORS.purple}22` : t.inputBg,
                color: filterOperadora !== "todas" ? BASE_COLORS.purple : t.textMuted,
                fontSize: "12px", fontWeight: 600, fontFamily: FONT.body,
                cursor: "pointer", outline: "none",
              }}
            >
              <option value="todas">Todas as operadoras</option>
              {operadorasList.filter((o) => escoposVisiveis.operadorasVisiveis.length === 0 || escoposVisiveis.operadorasVisiveis.includes(o.slug)).map((o) => (
                <option key={o.slug} value={o.slug}>{o.nome}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body }}>
          Carregando...
        </div>
      ) : livesFiltered.length === 0 ? (
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "48px", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          ✅ Nenhuma live pendente de validação.
        </div>
      ) : (
        <>
          <div style={{ fontSize: "13px", color: "#f39c12", fontFamily: FONT.body, marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
            ⚠️ {livesFiltered.length} live(s) aguardando validação
          </div>
          {livesFiltered.map(l => <LiveCard key={l.id} live={l} />)}
        </>
      )}

      {modal && <ModalValidacao live={modal} />}
    </div>
  );
}
