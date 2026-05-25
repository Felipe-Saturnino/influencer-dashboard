import { useState, useEffect, useCallback, type ReactNode, type CSSProperties } from "react";
import { X, Loader2, Eye, EyeOff, Download, FileText, MessageSquare } from "lucide-react";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../components/dashboard";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import type { Theme } from "../../../constants/theme";
import { statusLabel, tipoLabel, type DenunciaStatusDb } from "../../../lib/canalDenunciasSpin";
import type { DenunciaListRow, AnexoRow } from "./types";

const MODAL_MAX = "90dvh" as const;

function useEscClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);
}

function fmtDt(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

const blurSensivel: CSSProperties = {
  filter: "blur(7px)",
  userSelect: "none",
};

function LinhaInfo({ label, valor, t }: { label: string; valor: string; t: Theme }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: t.text, lineHeight: 1.45 }}>{valor}</div>
    </div>
  );
}

export function ModalVerDenuncia({
  open,
  onClose,
  row,
  t,
  anexos,
  onDownload,
  canDownload,
}: {
  open: boolean;
  onClose: () => void;
  row: DenunciaListRow | null;
  t: Theme;
  anexos: AnexoRow[];
  onDownload: (a: AnexoRow) => void;
  canDownload: boolean;
}) {
  const [aba, setAba] = useState<"dados" | "relato">("dados");
  const [exibirSensiveis, setExibirSensiveis] = useState(false);
  useEscClose(open, onClose);

  useEffect(() => {
    if (open) {
      setAba("dados");
      setExibirSensiveis(false);
    }
  }, [open, row?.id]);

  if (!open || !row) return null;

  const tiposTxt = row.tipos_denuncia.map((k) => tipoLabel(k)).join("; ");
  const relatoAnexos = anexos.filter((x) => !x.anotacao_id);
  const temIdent = row.deseja_identificar && Boolean((row.nome ?? "").trim() || (row.email ?? "").trim() || (row.telefone ?? "").trim());

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2001, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <button type="button" aria-label="Fechar" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer" }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-ver-titulo"
        style={{
          position: "relative",
          width: "min(560px, 100%)",
          maxHeight: MODAL_MAX,
          overflowY: "auto",
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 16,
          boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
          fontFamily: FONT.body,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            padding: "18px 20px",
            borderBottom: `1px solid ${t.cardBorder}`,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <h2
              id="modal-ver-titulo"
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 900,
                color: t.text,
                fontFamily: FONT_TITLE,
              }}
            >
              {row.protocolo}
            </h2>
            {temIdent ? (
              <button
                type="button"
                onClick={() => setExibirSensiveis(!exibirSensiveis)}
                aria-label={exibirSensiveis ? "Ocultar dados sensíveis" : "Exibir dados sensíveis"}
                title={exibirSensiveis ? "Ocultar" : "Ver"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.textMuted,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {exibirSensiveis ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                {exibirSensiveis ? "Ocultar" : "Ver"}
              </button>
            ) : null}
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 4, flexShrink: 0 }}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <div
          role="tablist"
          aria-label="Seções da denúncia"
          style={{ padding: "12px 20px 0", display: "flex", gap: 8 }}
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ["dados", "relato"] as const, setAba, (k) => `tab-ver-den-${k}`)}
        >
          <FiltroBarTabButton
            id="tab-ver-den-dados"
            active={aba === "dados"}
            onClick={() => setAba("dados")}
            icon={<FileText {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Dados da denúncia
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-ver-den-relato"
            active={aba === "relato"}
            onClick={() => setAba("relato")}
            icon={<MessageSquare {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Relato da denúncia
          </FiltroBarTabButton>
        </div>
        <div style={{ padding: "16px 20px 22px" }}>
          {aba === "dados" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <LinhaInfo label="Data/hora da denúncia" valor={fmtDt(row.created_at)} t={t} />
              <LinhaInfo label="Status" valor={statusLabel(row.status)} t={t} />
              <LinhaInfo label="Tipo de denúncia" valor={tiposTxt} t={t} />
              {temIdent ? (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: 10 }}>Identificação</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Nome</div>
                      <div
                        style={{
                          fontSize: 14,
                          color: t.text,
                          lineHeight: 1.45,
                          ...(exibirSensiveis ? {} : blurSensivel),
                        }}
                      >
                        {row.nome?.trim() ? row.nome : "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: 4 }}>E-mail</div>
                      <div
                        style={{
                          fontSize: 14,
                          color: t.text,
                          lineHeight: 1.45,
                          wordBreak: "break-all",
                          ...(exibirSensiveis ? {} : blurSensivel),
                        }}
                      >
                        {row.email?.trim() ? row.email : "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Telefone</div>
                      <div
                        style={{
                          fontSize: 14,
                          color: t.text,
                          lineHeight: 1.45,
                          ...(exibirSensiveis ? {} : blurSensivel),
                        }}
                      >
                        {row.telefone?.trim() ? row.telefone : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          {aba === "relato" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: 6 }}>Relato</div>
                <div style={{ fontSize: 14, color: t.text, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{row.relato}</div>
              </div>
              {relatoAnexos.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Anexos</div>
                  <ul style={{ margin: 0, paddingLeft: 18, color: t.text }}>
                    {relatoAnexos.map((a) => (
                      <li key={a.id} style={{ marginBottom: 6, fontSize: 13 }}>
                        {a.file_name}
                        {canDownload ? (
                          <button
                            type="button"
                            onClick={() => onDownload(a)}
                            style={{
                              marginLeft: 10,
                              padding: "4px 8px",
                              fontSize: 12,
                              borderRadius: 8,
                              border: `1px solid ${t.cardBorder}`,
                              background: t.inputBg,
                              cursor: "pointer",
                              color: t.text,
                              fontFamily: FONT.body,
                            }}
                          >
                            <Download size={12} style={{ verticalAlign: "middle", marginRight: 4 }} aria-hidden />
                            Baixar
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ModalHistoricoDenuncia({
  open,
  onClose,
  denunciaId,
  protocolo,
  t,
}: {
  open: boolean;
  onClose: () => void;
  denunciaId: string | null;
  protocolo: string;
  t: Theme;
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<{ sortAt: string; node: ReactNode }[]>([]);
  useEscClose(open, onClose);

  const load = useCallback(async () => {
    if (!denunciaId) return;
    setLoading(true);
    const [hRes, nRes] = await Promise.all([
      supabase
        .from("canal_denuncia_status_historico")
        .select("id, status_anterior, status_novo, descricao_resolucao, changed_at, changed_by")
        .eq("denuncia_id", denunciaId)
        .order("changed_at", { ascending: false }),
      supabase
        .from("canal_denuncia_anotacoes")
        .select("id, texto, created_at, created_by")
        .eq("denuncia_id", denunciaId)
        .order("created_at", { ascending: false }),
    ]);
    const hRows = hRes.data ?? [];
    const nRows = nRes.data ?? [];
    const uids = [...new Set([...hRows.map((r) => r.changed_by), ...nRows.map((r) => r.created_by)].filter(Boolean))] as string[];
    const nameMap: Record<string, string> = {};
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", uids);
      (profs ?? []).forEach((p) => {
        nameMap[p.id] = p.name ?? "—";
      });
    }
    const merged: { sortAt: string; node: ReactNode }[] = [];
    for (const h of hRows) {
      const who = h.changed_by ? nameMap[h.changed_by] ?? "—" : "—";
      merged.push({
        sortAt: h.changed_at,
        node: (
          <div
            key={`h-${h.id}`}
            style={{
              padding: 14,
              borderRadius: 12,
              border: `1px solid ${t.cardBorder}`,
              background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>
              {fmtDt(h.changed_at)} · {who}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>Alteração de status</div>
            <div style={{ fontSize: 13, color: t.text }}>
              {h.status_anterior ? `${statusLabel(h.status_anterior as DenunciaStatusDb)} → ` : ""}
              {statusLabel(h.status_novo as DenunciaStatusDb)}
            </div>
            {h.descricao_resolucao ? (
              <div style={{ fontSize: 13, color: t.text, marginTop: 8, whiteSpace: "pre-wrap" }}>{h.descricao_resolucao}</div>
            ) : null}
          </div>
        ),
      });
    }
    for (const n of nRows) {
      const who = nameMap[n.created_by] ?? "—";
      merged.push({
        sortAt: n.created_at,
        node: (
          <div
            key={`n-${n.id}`}
            style={{
              padding: 14,
              borderRadius: 12,
              border: `1px solid ${t.cardBorder}`,
              background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>
              {fmtDt(n.created_at)} · {who}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>Anotação</div>
            <div style={{ fontSize: 13, color: t.text, whiteSpace: "pre-wrap" }}>{n.texto}</div>
          </div>
        ),
      });
    }
    merged.sort((a, b) => (a.sortAt < b.sortAt ? 1 : a.sortAt > b.sortAt ? -1 : 0));
    setItems(merged);
    setLoading(false);
  }, [denunciaId, t.cardBorder, t.isDark, t.text, t.textMuted]);

  useEffect(() => {
    if (open && denunciaId) void load();
  }, [open, denunciaId, load]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2001, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <button type="button" aria-label="Fechar" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer" }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-hist-titulo"
        style={{
          position: "relative",
          width: "min(520px, 100%)",
          maxHeight: MODAL_MAX,
          overflowY: "auto",
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 16,
          fontFamily: FONT.body,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", padding: "18px 20px", borderBottom: `1px solid ${t.cardBorder}` }}>
          <h2 id="modal-hist-titulo" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>
            {protocolo}
          </h2>
          <button type="button" aria-label="Fechar" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
              <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{items.map((x, i) => <div key={i}>{x.node}</div>)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
