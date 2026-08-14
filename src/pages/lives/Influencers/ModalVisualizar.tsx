import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Building2, ExternalLink, Eye, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { BRAND, FONT_TITLE } from "../../../lib/dashboardConstants";
import type { Operadora } from "../../../types";
import { PLAT_COLOR } from "../../../constants/platforms";
import { PlatLogo } from "../../../components/PlatLogo";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { InfluencerModalTabs, SensitiveField, StatusBadge } from "./influencerUiComponents";
import type { Influencer, Perfil } from "./influencerTypes";

export function ModalVisualizar({ influencer, operadorasList, onClose, isDark }: {
  influencer: Influencer; operadorasList: Operadora[]; onClose: () => void; isDark?: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const containerRef = useRef<HTMLDivElement>(null);
  const p = influencer.perfil;
  const [tab, setTab] = useState<"cadastral" | "canais" | "financeiro" | "operadoras" | "historico">("cadastral");

  useEffect(() => {
    const id = window.setTimeout(() => containerRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, []);

  const tabs = [
    { key: "cadastral"   as const, label: "Cadastral"  },
    { key: "canais"      as const, label: "Canais"     },
    { key: "financeiro"  as const, label: "Financeiro" },
    { key: "operadoras"  as const, label: "Operadoras" },
    { key: "historico"   as const, label: "Histórico" },
  ];

  function fmtTs(iso?: string | null) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return "—";
    }
  }

  const labelStyle: CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "1.1px",
    textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body,
  };
  const row: CSSProperties = { marginBottom: 14 };
  const val = (v?: string | number) => (
    <span style={{ fontSize: "13px", color: v ? t.text : t.textMuted, fontFamily: FONT.body }}>
      {v || "—"}
    </span>
  );

  return (
    <div className="app-modal-overlay-pad" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-visualizar-title"
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
              <h2 id="modal-visualizar-title" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.03em" }}>
                {p?.nome_artistico || influencer.name}
              </h2>
              {p?.status && <StatusBadge value={p.status} onChange={() => {}} readonly />}
            </div>
            <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>{influencer.email}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar modal" title="Fechar modal" style={{ background: "none", border: "none", cursor: "pointer", color: t.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 4, flexShrink: 0 }}>
            <X size={22} strokeWidth={2.75} aria-hidden="true" />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: brand.useBrand ? brand.primaryTransparentBg : `${BRAND.azul}0d`, border: brand.useBrand ? brand.primaryTransparentBorder : `1px solid ${BRAND.azul}30`, fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 18 }}>
          <Eye size={13} aria-hidden="true" style={{ color: brand.primary, flexShrink: 0 }} />
          <span>Modo visualização — somente leitura. Dados sensíveis protegidos.</span>
        </div>

        <InfluencerModalTabs tabs={tabs} tab={tab} setTab={setTab} tabIdPrefix="inf-viz-tab-" panelIdPrefix="inf-viz-panel-" />

        {tab === "cadastral" && (
          <>
            <div style={row}><label style={labelStyle}>Nome Completo</label>{val(p?.nome_completo)}</div>
            <div style={row}><label style={labelStyle}>Nome Artístico</label>{val(p?.nome_artistico ?? influencer.name)}</div>
            <div style={row}><label style={labelStyle}>E-mail</label>{val(influencer.email)}</div>
            <div style={row}><label style={labelStyle}>Telefone</label>{val(p?.telefone)}</div>
            <div style={row}>
              <SensitiveField value={p?.cpf} label="CPF" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
            </div>
          </>
        )}

        {tab === "canais" && (
          <div style={row}>
            <label style={labelStyle}>Plataformas Ativas</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(p?.canais ?? []).length === 0 ? (
                <span style={{ color: t.textMuted, fontSize: "13px", fontFamily: FONT.body }}>—</span>
              ) : (
                (p?.canais ?? []).map((c) => {
                  const link = p?.[`link_${c.toLowerCase()}` as keyof Perfil] as string;
                  const inner = (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 20, border: `2px solid ${PLAT_COLOR[c]}`, background: `${PLAT_COLOR[c]}18`, color: PLAT_COLOR[c], fontSize: 12, fontWeight: 700, fontFamily: FONT.body, lineHeight: 1 }}>
                      <PlatLogo plataforma={c} size={13} isDark={isDark ?? false} />
                      <span style={{ display: "inline-flex", alignItems: "center" }}>{c}</span>
                      {link && <ExternalLink size={10} aria-hidden="true" style={{ opacity: 0.7 }} />}
                    </span>
                  );
                  return link ? (
                    <a
                      key={c}
                      href={link.startsWith("http") ? link : `https://${link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Ver canal ${c} do influencer (abre em nova aba)`}
                      style={{ textDecoration: "none" }}
                    >
                      {inner}
                    </a>
                  ) : <span key={c}>{inner}</span>;
                })
              )}
            </div>
          </div>
        )}

        {tab === "financeiro" && (
          <>
            <div style={row}><label style={labelStyle}>Cachê por Hora</label>{val(p?.cache_hora ? fmtBRL(p.cache_hora) : "")}</div>
            <div style={row}>
              <SensitiveField value={p?.chave_pix} label="Chave PIX" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
            </div>
            <div style={row}>
              <SensitiveField value={p?.banco} label="Banco" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
            </div>
            <div className="app-grid-2-tight" style={{ ...row, gap: 12 }}>
              <SensitiveField value={p?.agencia} label="Agência" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
              <SensitiveField value={p?.conta} label="Conta" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
            </div>
          </>
        )}

        {tab === "operadoras" && (
          <>
            {operadorasList.length === 0 ? (
              <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Nenhuma operadora cadastrada na plataforma.</p>
            ) : (
              operadorasList.map((op) => {
                const vinculo = influencer.operadoras?.find((o) => o.operadora_slug === op.slug);
                const ativo = !!vinculo?.ativo;
                const id = vinculo?.id_operadora;
                const opColor = op.brand_action?.trim() || "var(--brand-primary, #7c3aed)";
                return (
                  <div key={op.slug} style={{ marginBottom: 14, padding: 14, borderRadius: 12, border: `1px solid ${ativo ? `color-mix(in srgb, ${opColor} 40%, transparent)` : t.cardBorder}`, background: ativo ? `color-mix(in srgb, ${opColor} 12%, transparent)` : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                        <Building2 size={13} aria-hidden="true" style={{ color: opColor }} /> {op.nome}
                      </span>
                      <span style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${ativo ? `color-mix(in srgb, ${opColor} 45%, transparent)` : t.cardBorder}`, background: ativo ? `color-mix(in srgb, ${opColor} 22%, transparent)` : (t.inputBg ?? t.cardBg), color: ativo ? opColor : t.textMuted, fontSize: 11, fontWeight: 700, fontFamily: FONT.body }}>
                        {ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    {ativo && id && <div style={{ marginTop: "8px", fontSize: "13px", color: t.text, fontFamily: FONT.body }}>ID: {id}</div>}
                  </div>
                );
              })
            )}
          </>
        )}

        {tab === "historico" && (
          <>
            <div style={row}><label style={labelStyle}>Data de criação (cadastro)</label>{val(fmtTs(p?.created_at))}</div>
            <div style={row}><label style={labelStyle}>Data da última atualização</label>{val(fmtTs(p?.updated_at))}</div>
            <div style={row}><label style={labelStyle}>Data da última alteração de status</label>{val(fmtTs(p?.status_alterado_em))}</div>
            <p style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, margin: 0, lineHeight: 1.45 }}>
              As datas vêm do cadastro do influencer. A alteração de status é registrada a partir desta versão do sistema.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Modal Editar ─────────────────────────────────────────────────────────────
