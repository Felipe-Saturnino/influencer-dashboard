import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Building2, Loader2, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { BRAND, FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import type { Operadora, Role } from "../../../types";
import { PLATAFORMAS, PLAT_COLOR, type Plataforma } from "../../../constants/platforms";
import { ROLES_STAFF_OPERACOES_LIVES } from "../../../lib/staffRoles";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { CurrencyInput } from "../../../components/CurrencyInput";
import { PlatLogo } from "../../../components/PlatLogo";
import { InfluencerModalTabs, StatusBadge } from "./influencerUiComponents";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import { emptyPerfil, type Influencer, type Perfil } from "./influencerTypes";

type OperadorasFormState = Record<string, { ativo: boolean; id_operadora: string }>;

export function ModalPerfil({ influencer, operadorasList, onClose, onSaved, isDark }: {
  influencer: Influencer; operadorasList: Operadora[]; onClose: () => void; onSaved: () => void; isDark?: boolean;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const containerRef = useRef<HTMLDivElement>(null);
  const existing = influencer.perfil;
  const ctaSalvar = "linear-gradient(135deg, var(--brand-primary, #4a2082), var(--brand-secondary, #1e36f8))";

  useEffect(() => {
    const id = window.setTimeout(() => containerRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Status e Cachê somente Gestores e Admin podem alterar
  const podeAlterarStatusCache =
    !!user?.role && ROLES_STAFF_OPERACOES_LIVES.includes(user.role as Role);

  const inicialOperadoras: OperadorasFormState = {};
  operadorasList.forEach((o) => {
    const v = influencer.operadoras?.find((vinc) => vinc.operadora_slug === o.slug);
    inicialOperadoras[o.slug] = v
      ? { ativo: !!v.ativo, id_operadora: v.id_operadora ?? "" }
      : { ativo: false, id_operadora: "" };
  });

  const [editNomeCompleto, setEditNomeCompleto] = useState(influencer.perfil?.nome_completo ?? "");
  const [form,           setForm]           = useState<Perfil>(existing ?? emptyPerfil(influencer.id));
  const [operadorasForm, setOperadorasForm] = useState<OperadorasFormState>(inicialOperadoras);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");
  const [tab,            setTab]            = useState<"cadastral" | "canais" | "financeiro" | "operadoras">("cadastral");

  const set = (key: keyof Perfil, val: Perfil[keyof Perfil]) => setForm((f) => ({ ...f, [key]: val }));

  const setOp = (slug: string, patch: Partial<{ ativo: boolean; id_operadora: string }>) => {
    setOperadorasForm((prev) => {
      const cur = prev[slug] ?? { ativo: false, id_operadora: "" };
      return { ...prev, [slug]: { ...cur, ...patch } };
    });
  };

  const toggleCanal = (c: Plataforma) => {
    const cur = form.canais ?? [];
    set("canais", cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]);
  };

  async function handleSave() {
    setError("");

    const temCanalSemLink = (form.canais ?? []).some((c) => {
      const link = form[`link_${c.toLowerCase()}` as keyof Perfil] as string;
      return !link?.trim();
    });
    if (temCanalSemLink) return setError("Preencha o link de cada canal selecionado.");

    const opsAtivas = Object.entries(operadorasForm).filter(([_, st]) => st.ativo);
    const temOpSemId = opsAtivas.some(([_, st]) => !st.id_operadora?.trim());
    if (temOpSemId) return setError("Preencha o ID de cada operadora ativa.");

    setSaving(true);

    if (form.nome_artistico?.trim()) {
      await supabase.from("profiles").update({ name: form.nome_artistico.trim() }).eq("id", influencer.id);
    }

    const payload: Perfil & { nome_completo: string; updated_at: string; status_alterado_em?: string } = {
      ...form,
      nome_completo: editNomeCompleto.trim(),
      updated_at: new Date().toISOString(),
    };
    // Impede alteração de status e cache por usuários sem permissão (backend defense)
    if (!podeAlterarStatusCache && existing) {
      payload.status = existing.status ?? "ativo";
      payload.cache_hora = existing.cache_hora ?? 0;
    } else if (existing && (payload.cache_hora == null || Number.isNaN(Number(payload.cache_hora)))) {
      payload.cache_hora = existing.cache_hora ?? 0;
    }
    if (existing && podeAlterarStatusCache && form.status !== existing.status) {
      payload.status_alterado_em = new Date().toISOString();
    }
    const { error: err } = existing
      ? await supabase.from("influencer_perfil").update(payload).eq("id", influencer.id)
      : await supabase.from("influencer_perfil").insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }

    const slugsGeridos = new Set(operadorasList.map((o) => o.slug));
    for (const slug of slugsGeridos) {
      const st = operadorasForm[slug] ?? { ativo: false, id_operadora: "" };
      await supabase.from("influencer_operadoras").delete().eq("influencer_id", influencer.id).eq("operadora_slug", slug);
      if (st.ativo && st.id_operadora?.trim()) {
        await supabase.from("influencer_operadoras").insert({
          influencer_id: influencer.id,
          operadora_slug: slug,
          id_operadora: st.id_operadora.trim(),
          ativo: true,
        });
      }
    }

    setSaving(false);
    onSaved();
  }

  const inputStyle: CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    borderRadius: 10, border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg, color: t.text,
    fontSize: 13, fontFamily: FONT.body, outline: "none",
  };
  const labelStyle: CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "1.1px",
    textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body,
  };
  const row: CSSProperties = { marginBottom: 14 };
  const tabs = [
    { key: "cadastral"   as const, label: "Cadastral"  },
    { key: "canais"      as const, label: "Canais"     },
    { key: "financeiro"  as const, label: "Financeiro" },
    { key: "operadoras"  as const, label: "Operadoras" },
  ];

  return (
    <div className="app-modal-overlay-pad" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-perfil-title"
        style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "90dvh", overflowY: "auto" }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            position: "sticky",
            top: -28,
            zIndex: 2,
            marginTop: -28,
            marginLeft: -28,
            marginRight: -28,
            marginBottom: 18,
            paddingTop: 28,
            paddingLeft: 28,
            paddingRight: 28,
            paddingBottom: 16,
            background: brand.blockBg,
            borderBottom: `1px solid ${t.cardBorder}`,
            boxShadow: t.isDark ? "0 8px 16px rgba(0,0,0,0.35)" : "0 8px 16px rgba(0,0,0,0.06)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "4px" }}>
              <h2 id="modal-perfil-title" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.03em" }}>
                {form.nome_artistico?.trim() || influencer.name}
              </h2>
              <StatusBadge value={form.status ?? "ativo"} onChange={(v) => set("status", v)} readonly={!podeAlterarStatusCache} />
            </div>
            <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>{influencer.email}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar modal" title="Fechar modal" style={{ background: "none", border: "none", cursor: "pointer", color: t.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 4, flexShrink: 0 }}>
            <X size={22} strokeWidth={2.75} aria-hidden="true" />
          </button>
        </div>

        <InfluencerModalTabs tabs={tabs} tab={tab} setTab={setTab} tabIdPrefix="inf-edit-tab-" panelIdPrefix="inf-edit-panel-" />

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
            <button type="button" onClick={() => setError("")} aria-label="Fechar erro" style={{ background: "none", border: "none", cursor: "pointer", color: BRAND.vermelho, display: "flex", flexShrink: 0 }}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        <ModalTabPanel active={tab === "cadastral"} id="inf-edit-panel-cadastral" labelledBy="inf-edit-tab-cadastral">
            <div style={row}>
              <label style={labelStyle}>Nome Artístico</label>
              <input value={form.nome_artistico ?? ""} onChange={(e) => set("nome_artistico", e.target.value)} style={inputStyle} placeholder="Ex: NeryXLS" />
            </div>
            <div style={row}>
              <label style={labelStyle}>Nome Completo</label>
              <input value={editNomeCompleto} onChange={(e) => setEditNomeCompleto(e.target.value)} style={inputStyle} placeholder="Nome completo (nome real)" />
            </div>
            <div style={row}>
              <label style={labelStyle}>E-mail</label>
              <input value={influencer.email} disabled style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
            <div style={row}>
              <label style={labelStyle}>Telefone</label>
              <input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} style={inputStyle} placeholder="(11) 99999-9999" />
            </div>
            <div style={row}>
              <label style={labelStyle}>CPF <span style={{ fontSize: 9, color: BRAND.vermelho, fontWeight: 400 }}>(dado sensível)</span></label>
              <input value={form.cpf ?? ""} onChange={(e) => set("cpf", e.target.value)} style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.1em" }} placeholder="000.000.000-00" />
            </div>
        </ModalTabPanel>

        <ModalTabPanel active={tab === "canais"} id="inf-edit-panel-canais" labelledBy="inf-edit-tab-canais">
            <div style={row}>
              <label style={labelStyle}>Plataformas Ativas</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PLATAFORMAS.map((p) => {
                  const ativo = (form.canais ?? []).includes(p);
                  return (
                    <button key={p} type="button" onClick={() => toggleCanal(p)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 20, cursor: "pointer", border: `2px solid ${ativo ? PLAT_COLOR[p] : t.cardBorder}`, background: ativo ? `${PLAT_COLOR[p]}22` : (t.inputBg ?? t.cardBg), color: ativo ? PLAT_COLOR[p] : t.textMuted, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, lineHeight: 1 }}>
                      <PlatLogo plataforma={p} size={13} isDark={isDark ?? false} />
                      <span style={{ display: "inline-flex", alignItems: "center" }}>{p}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {(form.canais ?? []).map((c) => {
              const linkKey = `link_${c.toLowerCase()}` as keyof Perfil;
              return (
                <div key={c} style={row}>
                  <label style={labelStyle}>
                    Link {c}
                    <CampoObrigatorioMark />
                  </label>
                  <input value={(form[linkKey] as string) ?? ""} onChange={(e) => set(linkKey, e.target.value)} style={inputStyle} placeholder={`https://${c.toLowerCase()}.com/seu-canal`} />
                </div>
              );
            })}
            {(form.canais ?? []).length === 0 && (
              <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Selecione ao menos uma plataforma acima.</p>
            )}
        </ModalTabPanel>

        <ModalTabPanel active={tab === "financeiro"} id="inf-edit-panel-financeiro" labelledBy="inf-edit-tab-financeiro">
            <div style={row}>
              <label style={labelStyle}>Cachê por Hora (R$) {!podeAlterarStatusCache && <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 400 }}>(somente Gestor/Admin)</span>}</label>
              <CurrencyInput value={form.cache_hora ?? 0} onChange={(v) => set("cache_hora", Math.max(0, v))} style={inputStyle} disabled={!podeAlterarStatusCache} />
            </div>
            {[
              { key: "chave_pix" as keyof Perfil, label: "Chave PIX", placeholder: "CPF, e-mail, telefone ou chave aleatória" },
              { key: "banco"     as keyof Perfil, label: "Banco",     placeholder: "Ex: Nubank, Itaú, Bradesco" },
            ].map(({ key, label, placeholder }) => (
              <div key={key as string} style={row}>
                <label style={labelStyle}>{label} <span style={{ fontSize: 9, color: BRAND.vermelho, fontWeight: 400 }}>(dado sensível)</span></label>
                <input value={(form[key] as string) ?? ""} onChange={(e) => set(key, e.target.value)} style={inputStyle} placeholder={placeholder} />
              </div>
            ))}
            <div className="app-grid-2-tight" style={{ ...row, gap: 12 }}>
              {[
                { key: "agencia" as keyof Perfil, label: "Agência", placeholder: "0000" },
                { key: "conta"   as keyof Perfil, label: "Conta",   placeholder: "00000-0" },
              ].map(({ key, label, placeholder }) => (
                <div key={key as string}>
                  <label style={labelStyle}>{label} <span style={{ fontSize: 9, color: BRAND.vermelho, fontWeight: 400 }}>(sensível)</span></label>
                  <input value={(form[key] as string) ?? ""} onChange={(e) => set(key, e.target.value)} style={inputStyle} placeholder={placeholder} />
                </div>
              ))}
            </div>
        </ModalTabPanel>

        <ModalTabPanel active={tab === "operadoras"} id="inf-edit-panel-operadoras" labelledBy="inf-edit-tab-operadoras">
            {operadorasList.length === 0 ? (
              <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Nenhuma operadora cadastrada. Acesse Gestão de Operadoras primeiro.</p>
            ) : (
              operadorasList.map((op) => {
                const st = operadorasForm[op.slug] ?? { ativo: false, id_operadora: "" };
                const ativo = st.ativo;
                const opColor = op.brand_action?.trim() || "var(--brand-primary, #7c3aed)";
                return (
                  <div key={op.slug} style={{ ...row, padding: 14, borderRadius: 12, border: `1px solid ${ativo ? `color-mix(in srgb, ${opColor} 40%, transparent)` : t.cardBorder}`, background: ativo ? `color-mix(in srgb, ${opColor} 12%, transparent)` : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ativo ? 12 : 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                        <Building2 size={13} aria-hidden="true" style={{ color: opColor }} /> {op.nome}
                      </span>
                      <button type="button" onClick={() => setOp(op.slug, { ativo: !ativo })}
                        style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${ativo ? `color-mix(in srgb, ${opColor} 45%, transparent)` : t.cardBorder}`, background: ativo ? `color-mix(in srgb, ${opColor} 22%, transparent)` : (t.inputBg ?? t.cardBg), color: ativo ? opColor : t.textMuted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
                        {ativo ? "Ativo" : "Inativo"}
                      </button>
                    </div>
                    {ativo && (
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body }}>
                          ID {op.nome}
                          <CampoObrigatorioMark />
                        </label>
                        <input
                          value={st.id_operadora}
                          onChange={(e) => setOp(op.slug, { id_operadora: e.target.value })}
                          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.text, fontSize: 13, fontFamily: FONT.body, outline: "none" }}
                          placeholder={`ID do influencer na ${op.nome}`}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
        </ModalTabPanel>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            width: "100%", marginTop: 8, padding: 13, borderRadius: 10, border: "none",
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            background: ctaSalvar, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.body,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" />
              Salvando…
            </>
          ) : (
            "Salvar Perfil"
          )}
        </button>
      </div>
    </div>
  );
}
