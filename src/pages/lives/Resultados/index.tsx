import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { BRAND, FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { fetchLiveResultadosBatched } from "../../../lib/supabasePaginate";
import { Live, LiveResultado, LiveStatus } from "../../../types";

const LIVE_RESULTADO_COLS =
  "id, live_id, duracao_horas, duracao_min, media_views, max_views, created_at, updated_at";
import { ModalConfirmExcluirPadrao } from "../../../components/OperacoesModal";
import { BtnExcluirLinha } from "../../../components/BtnExcluirLinha";
import {descricaoModalExcluirItem, tooltipExcluir} from "../../../lib/excluirItemUi";
import { FiltroInfluencerSelect } from "../../../components/dashboard";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { PlatLogo } from "../../../components/PlatLogo";
import { DashboardPageHeader, FiltroOperadoraSelect } from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Info,
  Loader2,
  X,
} from "lucide-react";

import { getFilterBarRowStyle, getFilterBarWrapperStyle } from "../../../lib/filterBarStyles";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { PLAT_COLOR } from "../../../constants/platforms";
import { ROLES_PARIDADE_INFLUENCER } from "../../../lib/staffRoles";

// ─── STATUS ───────────────────────────────────────────────────────────────────
const STATUS_OPTS: { value: LiveStatus; label: string; color: string }[] = [
  { value: "realizada",     label: "Realizada",     color: BRAND.verde    },
  { value: "nao_realizada", label: "Não Realizada", color: BRAND.vermelho },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
/** Data local YYYY-MM-DD (alinhado a data + horário agendados da live). */
function todayISOLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLiveLocal(data: string, horario: string): Date {
  const [y, mo, d] = data.split("-").map((x) => parseInt(x, 10));
  const parts = (horario || "00:00").split(":");
  const hh = parseInt(parts[0] ?? "0", 10) || 0;
  const mm = parseInt(parts[1] ?? "0", 10) || 0;
  const ss = parseInt(parts[2] ?? "0", 10) || 0;
  return new Date(y, mo - 1, d, hh, mm, ss);
}

/** Só entram lives cujo horário agendado já passou há mais de 5h (fuso local). */
const RESULTADOS_JANELA_MS = 5 * 60 * 60 * 1000;

function fmtData(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

type ThemeTokens = ReturnType<typeof useApp>["theme"];
type DashboardBrand = ReturnType<typeof useDashboardBrand>;
type PermResultados = ReturnType<typeof usePermission>;
type EscoposVisiveis = ReturnType<typeof useDashboardFiltros>["escoposVisiveis"];

function ctaGradient(brand: DashboardBrand): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, #4a2082, #1e36f8)";
}

interface LiveCardProps {
  live: Live;
  brand: DashboardBrand;
  t: ThemeTokens;
  isDark: boolean | undefined;
  perm: PermResultados;
  podeVerInfluencer: (id: string) => boolean;
  showInfluencerName: boolean;
  nomeCompletos: Record<string, string>;
  excluindo: Live | null;
  setExcluindo: (v: Live | null) => void;
  onValidar: (live: Live) => void;
  onLiveDeleted: (live: Live) => void;
}

function LiveCard({
  live,
  brand,
  t,
  isDark,
  perm,
  podeVerInfluencer,
  showInfluencerName,
  nomeCompletos,
  excluindo,
  setExcluindo,
  onValidar,
  onLiveDeleted,
}: LiveCardProps) {
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const nomeCompleto = nomeCompletos[live.influencer_id] ?? "";
  const platColor = PLAT_COLOR[live.plataforma];
  const podeExcluir = perm.canExcluirOk && (perm.canExcluir !== "proprios" || podeVerInfluencer(live.influencer_id));
  const isExcluindo = excluindo?.id === live.id;
  const liveCardStyle = { ...getPageContentBoxStyle(brand, t), marginBottom: 12 };

  async function handleExcluirConfirmado() {
    if (!perm.canExcluirOk) return;
    setExcluindo(live);
    await supabase.from("live_resultados").delete().eq("live_id", live.id);
    const { error } = await supabase.from("lives").delete().eq("id", live.id);
    setExcluindo(null);
    setModalExcluirAberto(false);
    if (!error) onLiveDeleted(live);
  }

  return (
    <div style={liveCardStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: `${platColor}22`,
            border: `1.5px solid ${platColor}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <PlatLogo plataforma={live.plataforma} size={20} isDark={isDark ?? false} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
              {live.influencer_name}
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {showInfluencerName && nomeCompleto && <span>{nomeCompleto} · </span>}
              {fmtData(live.data)} · {live.horario?.slice(0, 5)}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, padding: "3px 9px", borderRadius: 20,
                background: `${platColor}22`, color: platColor,
                fontWeight: 600, fontFamily: FONT.body,
              }}>
                <PlatLogo plataforma={live.plataforma} size={11} isDark={isDark ?? false} />
                {live.plataforma}
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, padding: "3px 9px", borderRadius: 20,
                background: `${BRAND.amarelo}22`, color: BRAND.amarelo,
                fontWeight: 600, fontFamily: FONT.body,
                border: `1px solid ${BRAND.amarelo}44`,
              }}>
                <AlertTriangle size={10} aria-hidden="true" />
                Pendente validação
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", alignItems: "center" }}>
          {perm.canEditarOk && (perm.canEditar !== "proprios" || podeVerInfluencer(live.influencer_id)) && (
            <button
              type="button"
              onClick={() => onValidar(live)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 10, border: "none",
                cursor: "pointer",
                background: ctaGradient(brand),
                color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT.body,
              }}
            >
              <Check size={13} aria-hidden="true" />
              Validar
            </button>
          )}
          {podeExcluir && (
            <BtnExcluirLinha
              labelAcao={tooltipExcluir("live")}
              disabled={isExcluindo}
              onClick={() => setModalExcluirAberto(true)}
            />
          )}
        </div>
      </div>

      {modalExcluirAberto ? (
        <ModalConfirmExcluirPadrao
          descricaoItem={descricaoModalExcluirItem(
            "a live de",
            live.influencer_name,
            `em ${fmtData(live.data)} às ${live.horario?.slice(0, 5) ?? "—"}`,
          )}
          onCancel={() => {
            if (!isExcluindo) setModalExcluirAberto(false);
          }}
          onConfirm={() => void handleExcluirConfirmado()}
          loading={isExcluindo}
        />
      ) : null}
    </div>
  );
}

interface ModalValidacaoProps {
  live: Live;
  resultados: Record<string, LiveResultado>;
  operadorasList: { slug: string; nome: string }[];
  escoposVisiveis: EscoposVisiveis;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function ModalValidacao({
  live,
  resultados,
  operadorasList,
  escoposVisiveis,
  onClose,
  onSaved,
}: ModalValidacaoProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const existing = resultados[live.id];
  const [status, setStatus] = useState<LiveStatus>("realizada");
  const [operadoraSlug, setOperadoraSlug] = useState(live.operadora_slug ?? "");
  const [observacao, setObservacao] = useState(live.observacao ?? "");
  const [horarioReal, setHorarioReal] = useState(live.horario?.slice(0, 5) ?? "");
  const [duracaoHoras, setDuracaoHoras] = useState(existing?.duracao_horas ?? 0);
  const [duracaoMin, setDuracaoMin] = useState(existing?.duracao_min ?? 0);
  const [mediaViews, setMediaViews] = useState(existing?.media_views ?? 0);
  const [maxViews, setMaxViews] = useState(existing?.max_views ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      containerRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [live.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const showResultFields = status === "realizada";

  async function handleSave() {
    setError("");
    if (!operadoraSlug?.trim())
      return setError("Selecione a operadora. É obrigatório para salvar a validação (realizada ou não realizada).");
    if (showResultFields) {
      if (duracaoHoras === 0 && duracaoMin === 0)
        return setError("Informe a duração da live.");
      if (maxViews < mediaViews)
        return setError("Máximo não pode ser menor que a média.");
    }

    setSaving(true);
    const liveUpdate: Record<string, unknown> = {
      status,
      observacao: observacao || null,
      operadora_slug: operadoraSlug.trim(),
    };
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
    onClose();
    await onSaved();
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-validacao-title"
        style={{
          background: brand.blockBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 20,
          padding: "clamp(16px, 4vw, 28px)",
          width: "100%",
          maxWidth: 480,
          maxHeight: "90dvh",
          overflowY: "auto",
          outline: "none",
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: -28,
            zIndex: 2,
            marginTop: -28,
            marginLeft: -28,
            marginRight: -28,
            marginBottom: 6,
            paddingTop: 28,
            paddingLeft: 28,
            paddingRight: 28,
            paddingBottom: 16,
            background: t.cardBg,
            borderBottom: `1px solid ${t.cardBorder}`,
            boxShadow: t.isDark ? "0 8px 16px rgba(0,0,0,0.35)" : "0 8px 16px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: brand.primaryIconBg,
              border: brand.primaryIconBorder,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: brand.primaryIconColor,
            }}>
              <CheckCircle size={13} aria-hidden="true" />
            </span>
            <h2 id="modal-validacao-title" style={{ margin: 0, fontSize: 15, fontWeight: 800, color: brand.primary, fontFamily: FONT_TITLE, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Validar Live
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar modal" title="Fechar modal" style={{ background: "none", border: "none", cursor: "pointer", color: t.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 4, flexShrink: 0 }}>
            <X size={22} strokeWidth={2.75} aria-hidden="true" />
          </button>
        </div>

        <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, marginBottom: 20 }}>
          {live.influencer_name} · {fmtData(live.data)} {live.horario?.slice(0, 5)}
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              background: `${BRAND.vermelho}18`,
              border: `1px solid ${BRAND.vermelho}44`,
              color: BRAND.vermelho,
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 14,
              fontFamily: FONT.body,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Fechar erro"
              style={{ background: "none", border: "none", cursor: "pointer", color: BRAND.vermelho, display: "flex", flexShrink: 0 }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        <div style={row}>
          <label style={labelStyle}>Status da Live</label>
          <div style={{ display: "flex", gap: 10 }}>
            {STATUS_OPTS.map(opt => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={status === opt.value}
                onClick={() => setStatus(opt.value)}
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

        {status === "nao_realizada" && (
          <div style={{
            background: `${BRAND.amarelo}12`,
            border: `1px solid ${BRAND.amarelo}35`,
            color: BRAND.amarelo,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            marginBottom: 14,
            fontFamily: FONT.body,
          }}>
            Live marcada como Não Realizada — nenhum resultado será registrado.
          </div>
        )}

        {operadorasList.length > 0 && (
          <div style={row}>
            <label style={labelStyle}>
              Operadora
              <CampoObrigatorioMark />
            </label>
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
              Obrigatório para salvar. Em lives realizadas, o Financeiro usa a operadora no cálculo de pagamentos.
            </span>
          </div>
        )}

        <div style={row}>
          <label style={labelStyle}>Observação</label>
          <textarea value={observacao} onChange={e => setObservacao(e.target.value)}
            rows={3} placeholder="Comentários sobre a live..."
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
        </div>

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
              <label style={labelStyle}>
                Duração
                <CampoObrigatorioMark />
              </label>
              <div className="app-grid-2-tight" style={{ gap: 10 }}>
                <div>
                  <input
                    aria-label="Duração em horas"
                    type="number"
                    min={0}
                    max={24}
                    value={duracaoHoras}
                    onChange={e => setDuracaoHoras(Math.max(0, Math.min(24, Number(e.target.value) || 0)))}
                    style={inputStyle}
                    placeholder="0"
                  />
                  <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>horas</span>
                </div>
                <div>
                  <input
                    aria-label="Duração em minutos"
                    type="number"
                    min={0}
                    max={59}
                    value={duracaoMin}
                    onChange={e => setDuracaoMin(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                    style={inputStyle}
                    placeholder="0"
                  />
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

            <div style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              padding: "10px 12px", borderRadius: 10, marginBottom: 16,
              background: `${BRAND.azul}0d`,
              border: `1px solid ${BRAND.azul}30`,
            }}>
              <Info size={13} color={BRAND.azul} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.5 }}>
                Salvar irá marcar a live como <strong style={{ color: BRAND.verde }}>Realizada</strong> automaticamente.
              </span>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            width: "100%", padding: 13, borderRadius: 10, border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
            background: ctaGradient(brand),
            color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.body,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" />
              Salvando...
            </>
          ) : (
            <>
              <Check size={14} aria-hidden="true" />
              Salvar Validação
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Resultados() {
  const { theme: t, isDark } = useApp();
  const brand = useDashboardBrand();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, podeVerOperadora, escoposVisiveis, operadoraSlugsForcado } = useDashboardFiltros();
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
  const [excluindo,         setExcluindo]         = useState<Live | null>(null);

  const influencerListVisiveis = useMemo(
    () => influencerList.filter((i) => podeVerInfluencer(i.id)),
    [influencerList, podeVerInfluencer]
  );
  const showInfluencerName = influencerListVisiveis.length > 1;

  const loadData = useCallback(async () => {
    setLoading(true);
    const hojeLocal = todayISOLocal();
    const agora = Date.now();
    let q = supabase
      .from("lives")
      .select("*, profiles!lives_influencer_id_fkey(name)")
      .lte("data", hojeLocal)
      .eq("status", "agendada")
      .order("data", { ascending: false })
      .order("horario", { ascending: true });
    if (operadoraSlugsForcado?.length) q = q.in("operadora_slug", operadoraSlugsForcado);
    const { data: livesData } = await q;

    if (livesData) {
      const mapped = livesData.map((l: { profiles?: { name: string }; [k: string]: unknown }) => ({ ...l, influencer_name: l.profiles?.name })) as Live[];
      const visiveis = mapped
        .filter((l) => podeVerInfluencer(l.influencer_id))
        .filter((l) => agora - parseLiveLocal(l.data, l.horario).getTime() > RESULTADOS_JANELA_MS);
      setLives(visiveis);

      const ids = visiveis.map((l) => l.id);
      if (ids.length > 0) {
        const resData = await fetchLiveResultadosBatched(ids, async (chunk) =>
          await supabase.from("live_resultados").select(LIVE_RESULTADO_COLS).in("live_id", chunk),
        );
        const map: Record<string, LiveResultado> = {};
        resData.forEach((r) => {
          map[(r as LiveResultado).live_id] = r as LiveResultado;
        });
        setResultados(map);
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
  }, [podeVerInfluencer, operadoraSlugsForcado]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    supabase.from("profiles").select("id, name").in("role", [...ROLES_PARIDADE_INFLUENCER])
      .then(({ data }) => { if (data) setInfluencerList(data); });
  }, []);

  useEffect(() => {
    supabase.from("operadoras").select("slug, nome").eq("ativo", true).order("nome")
      .then(({ data }) => { if (data) setOperadorasList(data); });
  }, []);

  const livesFiltered = useMemo(() => {
    let out = lives;
    if (filterInfluencers.length > 0)
      out = out.filter((l) => filterInfluencers.includes(l.influencer_id));
    if (operadoraSlugsForcado?.length)
      out = out.filter((l) => l.operadora_slug && operadoraSlugsForcado.includes(l.operadora_slug));
    else if (filterOperadora && filterOperadora !== "todas")
      out = out.filter((l) => l.operadora_slug === filterOperadora);
    return out;
  }, [lives, filterInfluencers, filterOperadora, operadoraSlugsForcado]);

  function handleLiveDeleted(deleted: Live) {
    if (modal?.id === deleted.id) setModal(null);
    void loadData();
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      <DashboardPageHeader
        icon={<PageMenuIcon pageKey="resultados" />}
        title={getPageMenuLabel("resultados")}
        subtitle="Valide lives encerradas (após 5 h do horário agendado): status, duração, views e operadora."
        brand={brand}
        t={t}
        right={
          showFiltroInfluencer || showFiltroOperadora ? undefined : (
            <AjudaContextualAcoes pageKey="resultados" />
          )
        }
      />

      {/* ── FILTROS (padrão Dashboards) ── */}
      {(showFiltroInfluencer || showFiltroOperadora) && (
        <div style={getFilterBarWrapperStyle(brand, t)}>
            <div className="app-filter-bar-tabs-cta">
            <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
            <div className="app-filter-bar-tabs-cta__tabs" style={getFilterBarRowStyle()}>
              {showFiltroInfluencer && influencerListVisiveis.length > 0 && (
                <FiltroInfluencerSelect
                  mode="multiple"
                  value={filterInfluencers}
                  onChange={setFilterInfluencers}
                  influencers={influencerListVisiveis}
                />
              )}
              {showFiltroOperadora && operadorasList.length > 0 && (
                <FiltroOperadoraSelect
                  pill
                  minWidth={200}
                  value={filterOperadora}
                  onChange={setFilterOperadora}
                  operadoras={operadorasList}
                  podeVerOperadora={podeVerOperadora}
                />
              )}
            </div>
            <div className="app-filter-bar-tabs-cta__actions">
              <AjudaContextualAcoes pageKey="resultados" />
            </div>
            </div>
        </div>
      )}

      {/* ── CONTEÚDO ── */}
      {loading ? (
        <div
          role="status"
          aria-label="Carregando resultados de lives"
          style={{ textAlign: "center", padding: 60, color: t.textMuted, fontFamily: FONT.body, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Loader2 size={20} className="app-lucide-spin" style={{ color: "var(--brand-primary, #7c3aed)" }} aria-hidden="true" />
        </div>
      ) : livesFiltered.length === 0 ? (
        <div style={{ ...getPageContentBoxStyle(brand, t), padding: 48, textAlign: "center", color: t.textMuted }}>
          <CheckCircle size={24} style={{ marginBottom: 8, color: BRAND.verde }} aria-hidden="true" />
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
            <AlertTriangle size={15} aria-hidden="true" />
            {livesFiltered.length} live{livesFiltered.length !== 1 ? "s" : ""} aguardando validação
          </div>
          {livesFiltered.map(l => (
            <LiveCard
              key={l.id}
              live={l}
              brand={brand}
              t={t}
              isDark={isDark}
              perm={perm}
              podeVerInfluencer={podeVerInfluencer}
              showInfluencerName={showInfluencerName}
              nomeCompletos={nomeCompletos}
              excluindo={excluindo}
              setExcluindo={setExcluindo}
              onValidar={setModal}
              onLiveDeleted={handleLiveDeleted}
            />
          ))}
        </>
      )}

      {modal && (
        <ModalValidacao
          key={modal.id}
          live={modal}
          resultados={resultados}
          operadorasList={operadorasList}
          escoposVisiveis={escoposVisiveis}
          onClose={() => setModal(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
