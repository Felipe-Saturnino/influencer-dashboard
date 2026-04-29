import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { BRAND, FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { verificarElegibilidadeAgendaLive } from "../../../lib/influencerAgendaGate";
import { Live, Plataforma } from "../../../types";
import ModalBloqueioAgendaLive from "./ModalBloqueioAgendaLive";
import { X, Trash2, Lock, Video, Loader2 } from "lucide-react";

import { PLATAFORMAS, PLAT_COLOR, PLAT_LINK_KEY } from "../../../constants/platforms";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { PlatLogo } from "../../../components/PlatLogo";

function dateToISOLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayISOLocal(): string {
  return dateToISOLocal(new Date());
}

function tomorrowISOLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return dateToISOLocal(d);
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Props {
  live?:   Live;
  onClose: () => void;
  onSave:  () => void;
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
export default function ModalLive({ live, onClose, onSave }: Props) {
  const { theme: t, user, isDark, setActivePage } = useApp();
  const brand = useDashboardBrand();
  const { podeVerInfluencer } = useDashboardFiltros();
  const perm = usePermission("agenda");
  const isInfluencer = user?.role === "influencer";
  const isEdit       = !!live;
  const isAdminOuGestor = user?.role === "admin" || user?.role === "gestor";
  const exigeAgendarSoDiaSeguinte = user?.role === "influencer" || user?.role === "operador";
  const statusValidado = live?.status === "realizada" || live?.status === "nao_realizada";
  // Apenas Admin e Gestor podem editar/excluir lives com status realizada ou não realizada
  const podeEditar   = isEdit && perm.canEditarOk && (!statusValidado || isAdminOuGestor);
  const podeExcluir  = isEdit && perm.canExcluirOk && (!statusValidado || isAdminOuGestor);
  const podeCriar    = !isEdit && perm.canCriarOk;
  const somenteLeitura = isEdit && !podeEditar;
  // Apenas Admin e Gestor podem criar/editar lives em períodos anteriores (data/hora no passado)
  const podeAlterarPeriodoAnterior = isAdminOuGestor;

  const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    influencer_id: live?.influencer_id ?? (user?.role === "influencer" ? user?.id ?? "" : ""),
    data:          live?.data          ?? "",
    horario:       live?.horario       ?? "",
    plataforma:    (live?.plataforma    ?? "Twitch") as Plataforma,
    link:          live?.link          ?? "",
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [confirm, setConfirm] = useState(false);
  const [perfilLinks,        setPerfilLinks]        = useState<Record<string, string>>({});
  const [linkAutoPreenchido, setLinkAutoPreenchido] = useState(false);
  const [bloqueioAgenda, setBloqueioAgenda] = useState<{
    perfilIncompleto: boolean;
    faltaPlaybook: boolean;
  } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      panelRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [live?.id, isEdit]);

  useEffect(() => {
    if (!isInfluencer) {
      supabase.from("profiles").select("id, name").eq("role", "influencer").then(({ data }) => {
        if (data) setInfluencers(data.filter((i: { id: string }) => podeVerInfluencer(i.id)));
      });
    }
  }, [isInfluencer, podeVerInfluencer]);

  useEffect(() => {
    if (!form.influencer_id) {
      setPerfilLinks({});
      setForm(f => ({ ...f, link: "" }));
      setLinkAutoPreenchido(false);
      return;
    }
    supabase.from("influencer_perfil").select("link_twitch, link_youtube, link_instagram, link_tiktok, link_kick, link_discord, link_whatsapp, link_telegram").eq("id", form.influencer_id).single()
      .then(({ data }) => setPerfilLinks((data as Record<string, string>) ?? {}));
  }, [form.influencer_id]);

  useEffect(() => {
    if (!form.influencer_id || Object.keys(perfilLinks).length === 0) return;
    const linkKey = PLAT_LINK_KEY[form.plataforma];
    const linkDoPerfil = (perfilLinks[linkKey] ?? "").trim();
    setForm(f => ({ ...f, link: linkDoPerfil }));
    setLinkAutoPreenchido(!!linkDoPerfil);
  }, [form.plataforma, form.influencer_id, perfilLinks]);

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === "link") setLinkAutoPreenchido(false);
  };

  async function handleSave() {
    setError("");
    if (!form.data)   return setError("Informe a data.");
    if (!form.horario) return setError("Informe o horário.");
    if (!isInfluencer && influencers.length > 0 && !form.influencer_id) return setError("Selecione um influencer.");

    const targetInfluencerId = isInfluencer ? (user?.id ?? "") : (form.influencer_id ?? "");
    if (!isEdit) {
      if (!targetInfluencerId) return setError("Selecione um influencer.");
      const gate = await verificarElegibilidadeAgendaLive(targetInfluencerId);
      if (gate.perfilIncompleto || gate.faltaPlaybook) {
        setBloqueioAgenda(gate);
        return;
      }
    }

    if (!form.link.trim()) return setError("Informe o link da live na plataforma selecionada.");

    if (exigeAgendarSoDiaSeguinte && form.data < tomorrowISOLocal()) {
      return setError("Influencers e operadores só podem agendar lives a partir de amanhã (não é permitido agendar para hoje).");
    }

    // Apenas Admin e Gestor podem criar/editar lives em períodos anteriores
    const dataHoraLive = new Date(`${form.data}T${form.horario}`);
    if (dataHoraLive < new Date() && !podeAlterarPeriodoAnterior) {
      return setError("Apenas Admin e Gestor podem criar ou editar lives em períodos anteriores (data/hora no passado).");
    }

    setSaving(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();

    let operadoraSlugInfluencer: string | null = null;
    if (!isEdit && isInfluencer && user?.id) {
      const { data: opRows } = await supabase
        .from("influencer_operadoras")
        .select("operadora_slug")
        .eq("influencer_id", user.id)
        .eq("ativo", true)
        .order("operadora_slug");
      if (opRows?.length) operadoraSlugInfluencer = (opRows[0] as { operadora_slug: string }).operadora_slug;
    }

    const payload: Record<string, unknown> = {
      data:          form.data,
      horario:       form.horario,
      plataforma:    form.plataforma,
      link:          form.link.trim(),
      influencer_id: isInfluencer ? user?.id : form.influencer_id || undefined,
    };
    if (operadoraSlugInfluencer) payload.operadora_slug = operadoraSlugInfluencer;
    if (isEdit) {
      // Na edição, não alterar status — definido em Resultados, editável em Feedback
    } else {
      (payload as Record<string, unknown>).status = "agendada";
      (payload as Record<string, unknown>).created_by = authUser?.id ?? null;
    }

    if (isEdit) {
      const { error: err } = await supabase.from("lives").update(payload).eq("id", live!.id);
      if (err) { setSaving(false); setError(err.message); return; }
    } else {
      const { error: err } = await supabase.from("lives").insert(payload).select("id").single();
      if (err) { setSaving(false); setError(err.message); return; }
    }

    setSaving(false);
    onSave();
  }

  async function handleDelete() {
    setSaving(true);
    await supabase.from("lives").delete().eq("id", live!.id);
    setSaving(false);
    onSave();
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
  const showReqMark = !somenteLeitura && (podeCriar || podeEditar);

  return (
    <>
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-live-title"
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 20,
          padding: "clamp(16px, 4vw, 28px)",
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          outline: "none",
        }}
      >

        {/* Cabeçalho */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: brand.primaryIconBg,
              border: brand.primaryIconBorder,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: brand.primaryIconColor,
            }}>
              <Video size={14} aria-hidden="true" />
            </span>
            <h2 id="modal-live-title" style={{ margin: 0, fontSize: 15, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {isEdit ? "Editar Live" : "Nova Live"}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Mensagem de erro */}
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

        {/* Bloqueio: apenas Admin/Gestor podem editar lives realizadas ou não realizadas */}
        {isEdit && statusValidado && !isAdminOuGestor && (
          <div style={{ background: `${BRAND.amarelo}18`, border: `1px solid ${BRAND.amarelo}44`, color: BRAND.amarelo, borderRadius: 10, padding: "10px 14px", fontSize: 12, marginBottom: 14, fontFamily: FONT.body, display: "flex", alignItems: "flex-start", gap: 6 }}>
            <Lock size={12} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Apenas Admin e Gestor podem editar ou excluir lives com status realizada ou não realizada.</span>
          </div>
        )}

        {/* Influencer */}
        {!isInfluencer && influencers.length > 0 && (
          <div style={row}>
            <label style={labelStyle}>
              Influencer
              {showReqMark ? <CampoObrigatorioMark /> : null}
            </label>
            <select
              value={form.influencer_id}
                onChange={e => {
                  if (!somenteLeitura) {
                    setForm(f => ({ ...f, influencer_id: e.target.value, link: "" }));
                    setLinkAutoPreenchido(false);
                  }
                }}
              disabled={somenteLeitura}
              style={inputStyle}
            >
              <option value="">Selecione...</option>
              {[...influencers].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-BR")).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        )}

        {/* Data e horário */}
        <div className="app-grid-2-tight" style={{ ...row, gap: 10 }}>
          <div>
            <label style={labelStyle}>
              Data
              {showReqMark ? <CampoObrigatorioMark /> : null}
            </label>
            <input
              type="date"
              value={form.data}
              onChange={e => !somenteLeitura && set("data", e.target.value)}
              readOnly={somenteLeitura}
              min={
                podeAlterarPeriodoAnterior
                  ? undefined
                  : exigeAgendarSoDiaSeguinte
                    ? tomorrowISOLocal()
                    : todayISOLocal()
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>
              Horário
              {showReqMark ? <CampoObrigatorioMark /> : null}
            </label>
            <input
              type="time"
              value={form.horario}
              onChange={e => !somenteLeitura && set("horario", e.target.value)}
              readOnly={somenteLeitura}
              style={inputStyle}
            />
          </div>
        </div>
        {exigeAgendarSoDiaSeguinte && (podeCriar || podeEditar) && (
          <p style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginTop: 4, marginBottom: 0 }}>
            Como influencer ou operador, a data da live deve ser a partir de amanhã — não é permitido agendar para o dia de hoje.
          </p>
        )}
        {!exigeAgendarSoDiaSeguinte && !podeAlterarPeriodoAnterior && (podeCriar || podeEditar) && (
          <p style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginTop: 4, marginBottom: 0 }}>
            Apenas Admin e Gestor podem criar ou editar lives em datas/horários passados.
          </p>
        )}
        {/* Plataforma — com logos SVG */}
        <div style={row}>
          <label style={labelStyle}>
            Plataforma
            {showReqMark ? <CampoObrigatorioMark /> : null}
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PLATAFORMAS.map(p => {
              const selected = form.plataforma === p;
              return (
                <button
                  key={p} type="button"
                  onClick={() => !somenteLeitura && set("plataforma", p)}
                  disabled={somenteLeitura}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "7px 14px", borderRadius: 20,
                    border: `1.5px solid ${selected ? PLAT_COLOR[p] : t.cardBorder}`,
                    background: selected ? `${PLAT_COLOR[p]}22` : (t.inputBg ?? t.cardBg),
                    color: selected ? PLAT_COLOR[p] : t.textMuted,
                    fontSize: 12, fontWeight: 600, cursor: somenteLeitura ? "default" : "pointer",
                    fontFamily: FONT.body, opacity: somenteLeitura ? 0.8 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  <PlatLogo plataforma={p} size={14} isDark={isDark ?? false} />
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Link */}
        <div style={row}>
          <label style={labelStyle}>
            Link {form.plataforma}
            {showReqMark ? <CampoObrigatorioMark /> : null}
          </label>
          <input
            value={form.link}
            onChange={e => { if (!somenteLeitura) { set("link", e.target.value); setError(""); } }}
            readOnly={somenteLeitura}
            style={{
              ...inputStyle,
              borderColor: error.includes("link") ? BRAND.vermelho : linkAutoPreenchido ? brand.primary : (t.inputBorder ?? t.cardBorder),
            }}
            placeholder={`https://${form.plataforma.toLowerCase()}.com/...`}
          />
          {linkAutoPreenchido ? (
            <span style={{ fontSize: 11, color: brand.primary, fontFamily: FONT.body, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              Pré-preenchido com o link do perfil do influencer.
            </span>
          ) : (
            <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginTop: 4, display: "block" }}>
              Obrigatório para salvar a live.
            </span>
          )}
        </div>

        {/* Botões de ação */}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          {podeExcluir && (
            <button
              type="button"
              onClick={() => {
                if (!confirm) { setConfirm(true); return; }
                void handleDelete();
                setConfirm(false);
              }}
              onBlur={() => {
                window.setTimeout(() => setConfirm(false), 180);
              }}
              disabled={saving}
              style={{
                flex: 1, padding: 12, borderRadius: 10,
                border: `1px solid ${confirm ? "none" : `${BRAND.vermelho}`}`,
                background: confirm ? BRAND.vermelho : `${BRAND.vermelho}11`,
                color: confirm ? "#fff" : BRAND.vermelho,
                fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                fontFamily: FONT.body,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all 0.15s",
              }}
            >
              {!confirm && <Trash2 size={14} aria-hidden="true" />}
              {confirm ? "Confirmar exclusão?" : "Excluir"}
            </button>
          )}
          {(podeCriar || podeEditar) && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              style={{
                flex: 2, padding: 12, borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, var(--brand-action, #4a2082), var(--brand-contrast, #1e36f8))",
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1, fontFamily: FONT.body,
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
                  <Video size={14} aria-hidden="true" />
                  {isEdit ? "Salvar Alterações" : "Criar Live"}
                </>
              )}
            </button>
          )}
          {!podeCriar && !podeEditar && !podeExcluir && (
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body }}
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>

    <ModalBloqueioAgendaLive
      open={bloqueioAgenda !== null}
      onClose={() => setBloqueioAgenda(null)}
      perfilIncompleto={bloqueioAgenda?.perfilIncompleto ?? false}
      faltaPlaybook={bloqueioAgenda?.faltaPlaybook ?? false}
      segundaPessoa={isInfluencer}
      onIrInfluencers={() => {
        setBloqueioAgenda(null);
        onClose();
        setActivePage("influencers");
      }}
      onIrPlaybook={() => {
        setBloqueioAgenda(null);
        onClose();
        setActivePage("playbook_influencers");
      }}
    />
    </>
  );
}
