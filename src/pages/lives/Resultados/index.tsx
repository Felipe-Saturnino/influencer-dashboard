import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { Live, LiveResultado, LiveStatus } from "../../../types";
import InfluencerMultiSelect from "../../../components/InfluencerMultiSelect";
import { X } from "lucide-react";
import {
  GiNotebook, GiShield, GiCheckMark,
} from "react-icons/gi";

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

// ─── LOGOS SVG DAS PLATAFORMAS ────────────────────────────────────────────────
import { PLAT_COLOR, PLAT_LOGO, PLAT_LOGO_DARK } from "../../../constants/platforms";

function PlatLogo({ plataforma, size = 20, isDark }: { plataforma: string; size?: number; isDark: boolean }) {
  const [err, setErr] = useState(false);
  const src = isDark ? (PLAT_LOGO_DARK[plataforma] ?? PLAT_LOGO[plataforma]) : PLAT_LOGO[plataforma];
  if (err || !src) return <span style={{ fontSize: size * 0.65, color: PLAT_COLOR[plataforma] ?? "#fff" }}>●</span>;
  return (
    <img src={src} alt={plataforma} width={size} height={size}
      onError={() => setErr(true)}
      style={{ display: "block", flexShrink: 0 }} />
  );
}

// ─── STATUS ───────────────────────────────────────────────────────────────────
const STATUS_OPTS: { value: LiveStatus; label: string; color: string }[] = [
  { value: "realizada",     label: "Realizada",     color: BRAND.verde    },
  { value: "nao_realizada", label: "Não Realizada", color: BRAND.vermelho },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function toISO(d: Date) { return d.toISOString().split("T")[0]; }

function fmtData(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Resultados() {
  const { theme: t, isDark } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, podeVerOperadora, escoposVisiveis } = useDashboardFiltros();
  const perm = usePermission("resultados");

  const [lives,          setLives]          = useState<Live[]>([]);
  const [resultados,     setResultados]     = useState<Record<string, LiveResultado>>({});
  const [nomeCompletos,  setNomeCompletos]  = useState<Record<string, string>>({});
  const [loading,        setLoading]        = useState(true);
  const [modal,          setModal]          = useState<Live | null>(null);
  const [filterInfluencers, setFilterInfluencers] = useState<string[]>([]);
  const [filterOperadora,   setFilterOperadora]   = useState<string>("todas");
  const [influencerList,    setInfluencerList]    = useState<{ id: string; name: string }[]>([]);
  const [operadorasList,    setOperadorasList]    = useState<{ slug: string; nome: string }[]>([]);

  const todayISO = toISO(new Date());

  const influencerListVisiveis = useMemo(
    () => influencerList.filter((i) => podeVerInfluencer(i.id)),
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
      const mapped = livesData.map((l: { profiles?: { name: string }; [k: string]: unknown }) => ({ ...l, influencer_name: l.profiles?.name })) as Live[];
      const visiveis = mapped.filter((l) => podeVerInfluencer(l.influencer_id));
      setLives(visiveis);

      const ids = visiveis.map((l) => l.id);
      if (ids.length > 0) {
        const { data: resData } = await supabase.from("live_resultados").select("*").in("live_id", ids);
        if (resData) {
          const map: Record<string, LiveResultado> = {};
          resData.forEach((r: LiveResultado) => { map[r.live_id] = r; });
          setResultados(map);
        }
      }

      const influencerIds = [...new Set(visiveis.map((l) => l.influencer_id).filter(Boolean))];
      if (influencerIds.length > 1) {
        const { data: perfisData } = await supabase
          .from("influencer_perfil").select("id, nome_completo").in("id", influencerIds);
        if (perfisData) {
          const nomesMap: Record<string, string> = {};
          perfisData.forEach((p: Record<string, string>) => { nomesMap[p.id] = p.nome_completo ?? ""; });
          setNomeCompletos(nomesMap);
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

  const livesFiltered = useMemo(() => {
    let out = lives;
    if (filterInfluencers.length > 0)
      out = out.filter((l) => filterInfluencers.includes(l.influencer_id));
    if (filterOperadora && filterOperadora !== "todas")
      out = out.filter((l) => l.operadora_slug === filterOperadora);
    return out;
  }, [lives, filterInfluencers, filterOperadora]);

  // ── LiveCard ─────────────────────────────────────────────────────────────────
  function LiveCard({ live }: { live: Live }) {
    const nomeCompleto = nomeCompletos[live.influencer_id] ?? "";
    const platColor    = PLAT_COLOR[live.plataforma];

    return (
      <div style={{
        background: t.cardBg, border: `1px solid ${t.cardBorder}`,
        borderRadius: 16, padding: 20, marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Ícone da plataforma — logo SVG oficial */}
            <div style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              background: `${platColor}22`,
              border: `1.5px solid ${platColor}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <PlatLogo plataforma={live.plataforma} size={20} isDark={isDark ?? false} />
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                {live.influencer_name}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginTop: 2 }}>
                {showInfluencerName && nomeCompleto && <span>{nomeCompleto} · </span>}
                {fmtData(live.data)} · {live.horario?.slice(0, 5)}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {/* Badge plataforma */}
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 11, padding: "3px 9px", borderRadius: 20,
                  background: `${platColor}22`, color: platColor,
                  fontWeight: 600, fontFamily: FONT.body,
                }}>
                  <PlatLogo plataforma={live.plataforma} size={11} isDark={isDark ?? false} />
                  {live.plataforma}
                </span>
                {/* Badge pendente */}
                <span style={{
                  fontSize: 11, padding: "3px 9px", borderRadius: 20,
                  background: `${BRAND.amarelo}22`, color: BRAND.amarelo,
                  fontWeight: 600, fontFamily: FONT.body,
                  border: `1px solid ${BRAND.amarelo}44`,
                }}>
                  ⚠ Pendente validação
                </span>
              </div>
            </div>
          </div>

          {/* Botão Validar */}
          {perm.canEditarOk && (perm.canEditar !== "proprios" || podeVerInfluencer(live.influencer_id)) && (
            <button
              onClick={() => setModal(live)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 10, border: "none",
                cursor: "pointer",
                background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
                color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT.body,
              }}
            >
              <GiCheckMark size={13} />
              Validar
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Modal Validação ───────────────────────────────────────────────────────────
  function ModalValidacao({ live }: { live: Live }) {
    const existing = resultados[live.id];
    const [status,       setStatus]       = useState<LiveStatus>("realizada");
    const [operadoraSlug, setOperadoraSlug] = useState(live.operadora_slug ?? "");
    const [observacao,   setObservacao]   = useState(live.observacao ?? "");
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
        if (!operadoraSlug?.trim())
          return setError("Selecione a operadora. É obrigatório para o Financeiro.");
        if (duracaoHoras === 0 && duracaoMin === 0)
          return setError("Informe a duração da live.");
        if (maxViews < mediaViews)
          return setError("Máximo não pode ser menor que a média.");
      }

      setSaving(true);
      const liveUpdate: Record<string, unknown> = { status, observacao: observacao || null };
      if (operadoraSlug?.trim()) (liveUpdate as Record<string, string>).operadora_slug = operadoraSlug.trim();
      if (showResultFields && horarioReal) (liveUpdate as Record<string, string>).horario = horarioReal;

      const { error: updateError } = await supabase.from("lives").update(liveUpdate).eq("id", live.id);
      if (updateError) { setError("Erro ao salvar. Tente novamente."); setSaving(false); return; }

      if (showResultFields) {
        const payload = { live_id: live.id, duracao_horas: duracaoHoras, duracao_min: duracaoMin, media_views: mediaViews, max_views: maxViews };
        const { error: resultError } = existing
          ? await supabase.from("live_resultados").update(payload).eq("live_id", live.id)
          : await supabase.from("live_resultados").insert(payload);
        if (resultError) { setError("Erro ao salvar resultado. Tente novamente."); setSaving(false); return; }
      }

      setSaving(false);
      setModal(null);
      await loadData();
    }

    const inputStyle: React.CSSProperties = {
      width: "100%", boxSizing: "border-box", padding: "10px 14px",
      borderRadius: 10, border: `1px solid ${t.inputBorder ?? t.cardBorder}`,
      background: t.inputBg ?? t.cardBg, color: t.inputText ?? t.text,
      fontSize: 13, fontFamily: FONT.body, outline: "none",
    };
    const labelStyle: React.CSSProperties = {
      display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "1.2px",
      textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body,
    };
    const row: React.CSSProperties = { marginBottom: 14 };

    return (
      <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>

          {/* Cabeçalho do modal */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: "rgba(74,32,130,0.18)",
                border: "1px solid rgba(74,32,130,0.30)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: BRAND.ciano,
              }}>
                <GiCheckMark size={13} />
              </span>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Validar Live
              </h2>
            </div>
            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center", padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          {/* Subtítulo com data formatada */}
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, marginBottom: 20 }}>
            {live.influencer_name} · {fmtData(live.data)} {live.horario?.slice(0, 5)}
          </div>

          {/* Erro */}
          {error && (
            <div style={{ background: `${BRAND.vermelho}18`, border: `1px solid ${BRAND.vermelho}44`, color: BRAND.vermelho, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Status */}
          <div style={row}>
            <label style={labelStyle}>Status da Live</label>
            <div style={{ display: "flex", gap: 10 }}>
              {STATUS_OPTS.map(opt => (
                <button key={opt.value} onClick={() => setStatus(opt.value)}
                  style={{
                    flex: 1, padding: 10, borderRadius: 10,
                    border: `2px solid ${status === opt.value ? opt.color : t.cardBorder}`,
                    background: status === opt.value ? `${opt.color}18` : (t.inputBg ?? t.cardBg),
                    color: status === opt.value ? opt.color : t.textMuted,
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: FONT.body, transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Operadora — obrigatória para realizada (Financeiro) */}
          {showResultFields && operadorasList.length > 0 && (
            <div style={row}>
              <label style={labelStyle}>Operadora <span style={{ color: BRAND.vermelho }}>*</span></label>
              <select
                value={operadoraSlug}
                onChange={e => setOperadoraSlug(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="">Selecione a operadora...</option>
                {operadorasList
                  .filter((o) => escoposVisiveis.operadorasVisiveis.length === 0 || escoposVisiveis.operadorasVisiveis.includes(o.slug))
                  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                  .map(o => <option key={o.slug} value={o.slug}>{o.nome}</option>)}
              </select>
              <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginTop: 4, display: "block" }}>
                Obrigatório para o Financeiro considerar a live no cálculo de pagamentos.
              </span>
            </div>
          )}

          {/* Observação */}
          <div style={row}>
            <label style={labelStyle}>Observação</label>
            <textarea value={observacao} onChange={e => setObservacao(e.target.value)}
              rows={3} placeholder="Comentários sobre a live..."
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
          </div>

          {/* Campos de resultado — só se Realizada */}
          {showResultFields && (
            <>
              <div style={row}>
                <label style={labelStyle}>Horário Real de Início</label>
                <input type="time" value={horarioReal} onChange={e => setHorarioReal(e.target.value)} style={inputStyle} />
                <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginTop: 4, display: "block" }}>
                  Pré-preenchido com o horário agendado. Altere se a live começou em outro horário.
                </span>
              </div>

              <div style={row}>
                <label style={labelStyle}>Duração</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <input type="number" min={0} max={24} value={duracaoHoras} onChange={e => setDuracaoHoras(Math.max(0, Math.min(24, Number(e.target.value) || 0)))} style={inputStyle} placeholder="0" />
                    <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>horas</span>
                  </div>
                  <div>
                    <input type="number" min={0} max={59} value={duracaoMin} onChange={e => setDuracaoMin(Math.max(0, Math.min(59, Number(e.target.value) || 0)))} style={inputStyle} placeholder="0" />
                    <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>min</span>
                  </div>
                </div>
              </div>

              <div style={row}>
                <label style={labelStyle}>Média de Views</label>
                <input type="number" min={0} value={mediaViews} onChange={e => setMediaViews(Number(e.target.value) || 0)} style={inputStyle} placeholder="0" />
              </div>

              <div style={row}>
                <label style={labelStyle}>Máximo de Views</label>
                <input type="number" min={0} value={maxViews} onChange={e => setMaxViews(Math.max(0, Number(e.target.value) || 0))} style={inputStyle} placeholder="0" />
              </div>

              {/* Hint estilizado — sem emoji inline */}
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "10px 12px", borderRadius: 10, marginBottom: 16,
                background: `${BRAND.azul}0d`,
                border: `1px solid ${BRAND.azul}30`,
              }}>
                <span style={{ color: BRAND.azul, flexShrink: 0, marginTop: 1, fontSize: 13 }}>ℹ</span>
                <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.5 }}>
                  Salvar irá marcar a live como <strong style={{ color: BRAND.verde }}>Realizada</strong> automaticamente.
                </span>
              </div>
            </>
          )}

          {/* Botão salvar */}
          <button
            onClick={handleSave} disabled={saving}
            style={{
              width: "100%", padding: 13, borderRadius: 10, border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
              color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.body,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <GiCheckMark size={14} />
            {saving ? "Salvando..." : "Salvar Validação"}
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar os resultados de lives.
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>

      {/* ── HEADER — padrão NHD Bold + ícone container ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 9,
          background: "rgba(74,32,130,0.18)",
          border: "1px solid rgba(74,32,130,0.30)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: BRAND.ciano, flexShrink: 0,
        }}>
          <GiNotebook size={16} />
        </span>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Resultado de Lives
          </h1>
          <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, margin: "2px 0 0" }}>
            Lives passadas com status pendente de validação.
          </p>
        </div>
      </div>

      {/* ── FILTROS ── */}
      {(showFiltroInfluencer || showFiltroOperadora) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
          {showFiltroInfluencer && influencerListVisiveis.length > 0 && (
            <InfluencerMultiSelect
              selected={filterInfluencers}
              onChange={setFilterInfluencers}
              influencers={influencerListVisiveis}
              t={t}
            />
          )}
          {showFiltroOperadora && operadorasList.length > 0 && (
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <span style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", pointerEvents: "none", color: t.textMuted }}>
                <GiShield size={13} />
              </span>
              <select
                value={filterOperadora}
                onChange={(e) => setFilterOperadora(e.target.value)}
                style={{
                  padding: "6px 14px 6px 30px", borderRadius: 20,
                  border: `1.5px solid ${filterOperadora !== "todas" ? BRAND.roxoVivo : t.cardBorder}`,
                  background: filterOperadora !== "todas" ? `${BRAND.roxoVivo}22` : (t.inputBg ?? t.cardBg),
                  color: filterOperadora !== "todas" ? BRAND.roxoVivo : t.textMuted,
                  fontSize: 12, fontWeight: 600, fontFamily: FONT.body,
                  cursor: "pointer", outline: "none", appearance: "none",
                }}
              >
                <option value="todas">Todas as operadoras</option>
                {operadorasList
                  .filter((o) => podeVerOperadora(o.slug))
                  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                  .map((o) => <option key={o.slug} value={o.slug}>{o.nome}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── CONTEÚDO ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: t.textMuted, fontFamily: FONT.body }}>
          Carregando...
        </div>
      ) : livesFiltered.length === 0 ? (
        <div style={{
          background: t.cardBg, border: `1px solid ${t.cardBorder}`,
          borderRadius: 16, padding: 48,
          textAlign: "center", color: t.textMuted, fontFamily: FONT.body,
        }}>
          <GiCheckMark size={24} style={{ marginBottom: 8, color: BRAND.verde }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma live pendente de validação.</div>
        </div>
      ) : (
        <>
          {/* Contador com BRAND.amarelo */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, color: BRAND.amarelo,
            fontFamily: FONT.body, marginBottom: 16, fontWeight: 600,
          }}>
            <span style={{ fontSize: 15 }}>⚠</span>
            {livesFiltered.length} live{livesFiltered.length !== 1 ? "s" : ""} aguardando validação
          </div>
          {livesFiltered.map(l => <LiveCard key={l.id} live={l} />)}
        </>
      )}

      {modal && <ModalValidacao live={modal} />}
    </div>
  );
}
