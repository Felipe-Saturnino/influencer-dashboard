import { useState, useEffect, useCallback } from "react";
import { X, Loader2, FileText, StickyNote } from "lucide-react";
import { CampoUploadArquivos } from "../../../components/CampoUploadArquivos";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../components/dashboard";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { STORAGE_BUCKET, sanitizeStorageFileName, tipoLabel, type DenunciaStatusDb } from "../../../lib/canalDenunciasSpin";
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

function LinhaInfo({ label, valor, t }: { label: string; valor: string; t: Theme }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: t.text, lineHeight: 1.45 }}>{valor}</div>
    </div>
  );
}

export function ModalAtenderDenuncia({
  open,
  onClose,
  row,
  t,
  anexos,
  onSaved,
  onDownload,
  canDownload,
}: {
  open: boolean;
  onClose: () => void;
  row: DenunciaListRow | null;
  t: Theme;
  anexos: AnexoRow[];
  onSaved: () => void;
  onDownload: (a: AnexoRow) => void;
  canDownload: boolean;
}) {
  const [aba, setAba] = useState<"dados" | "anotacoes">("dados");
  const [statusDraft, setStatusDraft] = useState<DenunciaStatusDb>("relatado");
  const [resolucaoDraft, setResolucaoDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [notaFiles, setNotaFiles] = useState<{ id: string; file: File }[]>([]);
  const [notaSaving, setNotaSaving] = useState(false);
  const [notas, setNotas] = useState<{ id: string; texto: string; created_at: string; created_by: string; autor: string; anexos: AnexoRow[] }[]>([]);
  useEscClose(open, onClose);

  const finalStatuses: DenunciaStatusDb[] = ["procedente", "nao_procedente"];
  const showResolucao = finalStatuses.includes(statusDraft);

  const loadNotas = useCallback(async () => {
    if (!row?.id) return;
    const { data: notes } = await supabase
      .from("canal_denuncia_anotacoes")
      .select("id, texto, created_at, created_by")
      .eq("denuncia_id", row.id)
      .order("created_at", { ascending: true });
    const { data: ax } = await supabase.from("canal_denuncia_anexos").select("*").eq("denuncia_id", row.id).not("anotacao_id", "is", null);
    const nlist = notes ?? [];
    const uids = [...new Set(nlist.map((n) => n.created_by))];
    const nm: Record<string, string> = {};
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", uids);
      (profs ?? []).forEach((p) => {
        nm[p.id] = p.name ?? "—";
      });
    }
    const axList = (ax ?? []) as AnexoRow[];
    setNotas(
      nlist.map((n) => ({
        ...n,
        autor: nm[n.created_by] ?? "—",
        anexos: axList.filter((a) => a.anotacao_id === n.id),
      })),
    );
  }, [row?.id]);

  useEffect(() => {
    if (open && row) {
      setAba("dados");
      setStatusDraft(row.status);
      setResolucaoDraft(row.descricao_resolucao ?? "");
      setErr(null);
      void loadNotas();
    }
  }, [open, row, loadNotas]);

  useEffect(() => {
    if (!showResolucao) setResolucaoDraft("");
  }, [showResolucao]);

  async function salvarStatus() {
    if (!row) return;
    setErr(null);
    if (finalStatuses.includes(statusDraft) && !resolucaoDraft.trim()) {
      setErr("Preencha a descrição da resolução para status Procedente ou Não procedente.");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      status: statusDraft,
      descricao_resolucao: finalStatuses.includes(statusDraft) ? resolucaoDraft.trim() : null,
    };
    const { error } = await supabase.from("canal_denuncias_spin").update(payload).eq("id", row.id);
    setSaving(false);
    if (error) {
      setErr("Não foi possível salvar. Tente novamente.");
      return;
    }
    onSaved();
    onClose();
  }

  async function registrarNota() {
    if (!row) return;
    const txt = notaTexto.trim();
    if (!txt) {
      setErr("Digite o texto da anotação.");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    setNotaSaving(true);
    setErr(null);
    const { data: ins, error: insErr } = await supabase
      .from("canal_denuncia_anotacoes")
      .insert({ denuncia_id: row.id, texto: txt, created_by: uid })
      .select("id")
      .single();
    if (insErr || !ins) {
      setErr("Falha ao registrar anotação.");
      setNotaSaving(false);
      return;
    }
    const aid = ins.id as string;
    if (notaFiles.length > 0) {
      for (let i = 0; i < notaFiles.length; i++) {
        const f = notaFiles[i].file;
        const safe = sanitizeStorageFileName(f.name);
        const path = `${row.id}/${aid}/${Date.now()}_${i}_${safe}`;
        const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, f, { contentType: f.type || undefined });
        if (upErr) {
          setErr("Anotação salva, mas falhou o envio de um anexo.");
          setNotaSaving(false);
          setNotaTexto("");
          setNotaFiles([]);
          void loadNotas();
          onSaved();
          return;
        }
        await supabase.from("canal_denuncia_anexos").insert({
          denuncia_id: row.id,
          anotacao_id: aid,
          storage_path: path,
          file_name: f.name,
          content_type: f.type || null,
          file_size: f.size,
        });
      }
    }
    setNotaTexto("");
    setNotaFiles([]);
    setNotaSaving(false);
    void loadNotas();
    onSaved();
  }

  if (!open || !row) return null;
  const relatoAnexos = anexos.filter((x) => !x.anotacao_id);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2001, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <button type="button" aria-label="Fechar modal" title="Fechar modal" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer" }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-atender-titulo"
        style={{
          position: "relative",
          width: "min(600px, 100%)",
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
          <h2 id="modal-atender-titulo" style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>
            {row.protocolo}
          </h2>
          <button type="button" aria-label="Fechar modal" title="Fechar modal" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted }}>
            <X size={20} />
          </button>
        </div>
        <div
          role="tablist"
          aria-label="Seções do atendimento"
          style={{ padding: "12px 20px 0", display: "flex", gap: 8 }}
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ["dados", "anotacoes"] as const, setAba, (k) => `tab-atender-den-${k}`)}
        >
          <FiltroBarTabButton
            id="tab-atender-den-dados"
            active={aba === "dados"}
            onClick={() => setAba("dados")}
            icon={<FileText {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Dados da denúncia
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-atender-den-anotacoes"
            active={aba === "anotacoes"}
            onClick={() => setAba("anotacoes")}
            icon={<StickyNote {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Anotações
          </FiltroBarTabButton>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {aba === "dados" && (
            <>
              <LinhaInfo label="Data/hora da denúncia" valor={fmtDt(row.created_at)} t={t} />
              <div style={{ marginTop: 14 }}>
                <label htmlFor="st-atender" style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>
                  Status da denúncia
                </label>
                <select
                  id="st-atender"
                  value={statusDraft}
                  onChange={(e) => {
                    const v = e.target.value as DenunciaStatusDb;
                    setStatusDraft(v);
                    if (v === "relatado" || v === "em_avaliacao") setResolucaoDraft("");
                  }}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg,
                    color: t.text,
                    fontFamily: FONT.body,
                    fontSize: 14,
                  }}
                >
                  <option value="relatado">Relatado</option>
                  <option value="em_avaliacao">Em avaliação</option>
                  <option value="procedente">Procedente</option>
                  <option value="nao_procedente">Não procedente</option>
                </select>
              </div>
              {showResolucao && (
                <div style={{ marginTop: 14 }}>
                  <label htmlFor="res-atender" style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>
                    Descrição da resolução
                  </label>
                  <textarea
                    id="res-atender"
                    value={resolucaoDraft}
                    onChange={(e) => setResolucaoDraft(e.target.value)}
                    placeholder="Esta informação será disponibilizada ao relator"
                    rows={5}
                    style={{
                      marginTop: 8,
                      width: "100%",
                      boxSizing: "border-box",
                      padding: 12,
                      borderRadius: 10,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg,
                      color: t.text,
                      fontFamily: FONT.body,
                      fontSize: 14,
                      resize: "vertical",
                    }}
                  />
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                <LinhaInfo label="Tipo de denúncia" valor={row.tipos_denuncia.map((k) => tipoLabel(k)).join("; ")} t={t} />
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: 6 }}>Relato</div>
                <div style={{ fontSize: 14, color: t.text, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{row.relato}</div>
              </div>
              {relatoAnexos.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Anexos</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {relatoAnexos.map((a) => (
                      <li key={a.id} style={{ fontSize: 13, color: t.text, marginBottom: 6 }}>
                        {a.file_name}
                        {canDownload ? (
                          <button type="button" onClick={() => onDownload(a)} style={{ marginLeft: 8, fontSize: 12, cursor: "pointer", fontFamily: FONT.body }}>
                            Baixar
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {aba === "anotacoes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, width: "100%" }}>
                <label htmlFor="nota-nova" style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>
                  Nova anotação
                </label>
                <textarea
                  id="nota-nova"
                  value={notaTexto}
                  onChange={(e) => setNotaTexto(e.target.value)}
                  rows={5}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 12,
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg,
                    color: t.text,
                    fontFamily: FONT.body,
                    resize: "vertical",
                  }}
                />
                <div style={{ marginTop: 10 }}>
                  <CampoUploadArquivos
                    id="nota-anexo"
                    label="Anexos"
                    buttonLabel="Adicionar anexos"
                    multiple
                    items={notaFiles.map((nf) => ({
                      key: nf.id,
                      label: nf.file.name,
                      pendente: true,
                    }))}
                    onAdd={(files) =>
                      setNotaFiles((prev) => [
                        ...prev,
                        ...files.map((file) => ({ id: crypto.randomUUID(), file })),
                      ])
                    }
                    onRemove={(key) => setNotaFiles((prev) => prev.filter((nf) => nf.id !== key))}
                    disabled={notaSaving}
                    t={t}
                    pendingHint="Anexos serão enviados ao registrar a anotação."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void registrarNota()}
                  disabled={notaSaving}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "none",
                    background: "var(--brand-primary, #7c3aed)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: notaSaving ? "wait" : "pointer",
                    fontFamily: FONT.body,
                  }}
                >
                  {notaSaving ? "Salvando…" : "Registrar anotação"}
                </button>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: 10 }}>Histórico de anotações</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {notas.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        border: `1px solid ${t.cardBorder}`,
                        background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                      }}
                    >
                      <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>
                        {fmtDt(n.created_at)} · {n.autor}
                      </div>
                      <div style={{ fontSize: 14, color: t.text, whiteSpace: "pre-wrap" }}>{n.texto}</div>
                      {n.anexos.length > 0 && (
                        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
                          {n.anexos.map((ax) => (
                            <li key={ax.id}>
                              {ax.file_name}
                              {canDownload ? (
                                <button type="button" onClick={() => onDownload(ax)} style={{ marginLeft: 8, cursor: "pointer", fontSize: 12, fontFamily: FONT.body }}>
                                  Baixar
                                </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {err && (
          <div role="alert" style={{ padding: "0 20px 12px", color: "#e84025", fontSize: 13 }}>
            {err}
          </div>
        )}

        <div style={{ padding: "12px 20px 20px", borderTop: `1px solid ${t.cardBorder}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: "transparent",
              color: t.text,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => void salvarStatus()}
            disabled={saving}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, var(--brand-primary, #7c3aed), var(--brand-secondary, #1e36f8))",
              color: "#fff",
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: saving ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {saving ? <Loader2 className="app-lucide-spin" size={18} color="#fff" aria-hidden /> : null}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
