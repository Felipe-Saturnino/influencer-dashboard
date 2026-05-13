import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Eye, History, Loader2, Pencil, Search, Shield, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import {
  STATUS_OPTIONS,
  STORAGE_BUCKET,
  statusLabel,
  tipoLabel,
  type DenunciaStatusDb,
  type TipoDenunciaKey,
  TIPOS_DENUNCIA,
} from "../../../lib/canalDenunciasSpin";
import type { DenunciaListRow, AnexoRow } from "./types";
import { ModalVerDenuncia, ModalHistoricoDenuncia } from "./ModalsVerHist";
import { ModalAtenderDenuncia, ModalConfirmarExclusao } from "./ModalsAtender";
import { PageHeader } from "../../../components/PageHeader";

function ctaGradient(brand: ReturnType<typeof useDashboardBrand>): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))";
}

function monthKeys(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [{ value: "historico", label: "Histórico (todos)" }];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const value = `${y}-${m}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    out.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return out;
}

function rangeForMonth(ym: string): { start: string; end: string } {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function CentralDenunciasSpin() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_central_denuncias");

  const [periodoConsolidado, setPeriodoConsolidado] = useState("historico");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroPeriodoLista, setFiltroPeriodoLista] = useState("historico");
  const [filtroTipos, setFiltroTipos] = useState<TipoDenunciaKey[]>([]);
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<DenunciaListRow[]>([]);
  const [anexosPorDenuncia, setAnexosPorDenuncia] = useState<Record<string, AnexoRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Record<DenunciaStatusDb, number>>({
    relatado: 0,
    em_avaliacao: 0,
    procedente: 0,
    nao_procedente: 0,
  });

  const [modalVer, setModalVer] = useState<DenunciaListRow | null>(null);
  const [modalAtender, setModalAtender] = useState<DenunciaListRow | null>(null);
  const [modalHist, setModalHist] = useState<DenunciaListRow | null>(null);
  const [delRow, setDelRow] = useState<DenunciaListRow | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const meses = useMemo(() => monthKeys(), []);

  const fetchKpis = useCallback(async () => {
    const stats: DenunciaStatusDb[] = ["relatado", "em_avaliacao", "procedente", "nao_procedente"];
    const next: Record<DenunciaStatusDb, number> = {
      relatado: 0,
      em_avaliacao: 0,
      procedente: 0,
      nao_procedente: 0,
    };
    for (const s of stats) {
      let q = supabase.from("canal_denuncias_spin").select("id", { count: "exact", head: true }).eq("status", s);
      if (periodoConsolidado !== "historico") {
        const { start, end } = rangeForMonth(periodoConsolidado);
        q = q.gte("created_at", start).lte("created_at", end);
      }
      const { count } = await q;
      next[s] = count ?? 0;
    }
    setKpis(next);
  }, [periodoConsolidado]);

  const fetchLista = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("canal_denuncias_spin")
      .select("id, protocolo, created_at, status, tipos_denuncia, tipo_outro_descricao, relato, deseja_identificar, nome, email, telefone, descricao_resolucao")
      .order("created_at", { ascending: false });

    if (filtroPeriodoLista !== "historico") {
      const { start, end } = rangeForMonth(filtroPeriodoLista);
      q = q.gte("created_at", start).lte("created_at", end);
    }
    if (filtroStatus !== "todos") {
      q = q.eq("status", filtroStatus);
    }
    if (filtroTipos.length > 0) {
      q = q.overlaps("tipos_denuncia", filtroTipos);
    }
    const kw = busca.trim().replace(/[%_]/g, " ");
    if (kw) {
      q = q.ilike("relato", `%${kw}%`);
    }

    const { data, error } = await q;
    if (error) {
      setLista([]);
      setAnexosPorDenuncia({});
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as DenunciaListRow[];
    setLista(rows);
    if (rows.length === 0) {
      setAnexosPorDenuncia({});
      setLoading(false);
      return;
    }
    const ids = rows.map((r) => r.id);
    const { data: ax } = await supabase.from("canal_denuncia_anexos").select("*").in("denuncia_id", ids);
    const map: Record<string, AnexoRow[]> = {};
    for (const id of ids) map[id] = [];
    for (const a of (ax ?? []) as AnexoRow[]) {
      if (!map[a.denuncia_id]) map[a.denuncia_id] = [];
      map[a.denuncia_id].push(a);
    }
    setAnexosPorDenuncia(map);
    setLoading(false);
  }, [filtroPeriodoLista, filtroStatus, filtroTipos, busca]);

  useEffect(() => {
    void fetchKpis();
  }, [fetchKpis]);

  useEffect(() => {
    if (perm.canView === "sim" || perm.canView === "proprios") void fetchLista();
  }, [fetchLista, perm.canView]);

  async function downloadAnexo(a: AnexoRow) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(a.storage_path, 3600);
    if (error || !data?.signedUrl) return;
    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = a.file_name;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  }

  async function confirmarExclusao() {
    if (!delRow) return;
    setDelLoading(true);
    const { data: ax } = await supabase.from("canal_denuncia_anexos").select("storage_path").eq("denuncia_id", delRow.id);
    const paths = (ax ?? []).map((r) => (r as { storage_path: string }).storage_path).filter(Boolean);
    if (paths.length) {
      await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    }
    const { error } = await supabase.from("canal_denuncias_spin").delete().eq("id", delRow.id);
    setDelLoading(false);
    if (!error) {
      setDelRow(null);
      void fetchLista();
      void fetchKpis();
    }
  }

  function toggleTipoFiltro(k: TipoDenunciaKey) {
    setFiltroTipos((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  if (perm.loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ verticalAlign: "middle" }} />{" "}
        Carregando...
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<Shield size={22} aria-hidden />}
        title="Central de Denúncias"
        subtitle="Canal de denúncias Spin — tratamento interno"
      />

      {/* Bloco 1 — Filtros */}
      <section style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12, alignItems: "flex-end" }}>
          <FiltroSelect
            label="Status"
            value={filtroStatus}
            onChange={setFiltroStatus}
            t={t}
            options={[
              { v: "todos", l: "Todos" },
              ...STATUS_OPTIONS.map((s) => ({ v: s.value, l: s.label })),
            ]}
          />
          <FiltroSelect
            label="Período (lista)"
            value={filtroPeriodoLista}
            onChange={setFiltroPeriodoLista}
            t={t}
            options={meses.map((m) => ({ v: m.value, l: m.label }))}
          />
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: 6 }}>Tipo (contém)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                type="button"
                aria-pressed={filtroTipos.length === 0}
                onClick={() => setFiltroTipos([])}
                style={chip(filtroTipos.length === 0, t)}
              >
                Todos
              </button>
              {TIPOS_DENUNCIA.map((tp) => {
                const on = filtroTipos.includes(tp.key);
                return (
                  <button key={tp.key} type="button" aria-pressed={on} onClick={() => toggleTipoFiltro(tp.key)} style={chip(on, t)}>
                    {tp.key === "outro" ? "Outro" : tp.label.slice(0, 28) + (tp.label.length > 28 ? "…" : "")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <label htmlFor="busca-relato" style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase" }}>
              Busca no relato
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input
                id="busca-relato"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void fetchLista()}
                placeholder="Palavras-chave…"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontFamily: FONT.body,
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={() => void fetchLista()}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: ctaGradient(brand),
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: FONT.body,
                  fontWeight: 600,
                }}
              >
                <Search size={16} aria-hidden />
                Filtrar
              </button>
            </div>
          </div>
          <FiltroSelect
            label="Período (consolidados)"
            value={periodoConsolidado}
            onChange={setPeriodoConsolidado}
            t={t}
            options={meses.map((m) => ({ v: m.value, l: m.label }))}
          />
        </div>
      </section>

      {/* Bloco 2 — só período consolidado */}
      <div className="app-grid-kpi-4" style={{ marginBottom: 24 }}>
        {STATUS_OPTIONS.map((s) => (
          <div
            key={s.value}
            style={{
              padding: "16px 18px",
              borderRadius: 14,
              border: `1px solid ${t.cardBorder}`,
              background: t.cardBg,
              boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
            }}
          >
            <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: t.text, fontVariantNumeric: "tabular-nums", fontFamily: FONT.body }}>
              {kpis[s.value]}
            </div>
          </div>
        ))}
      </div>

      {/* Bloco 3 — cards */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden /> Carregando...
        </div>
      ) : lista.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Sem dados para o período selecionado.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {lista.map((row) => {
            const ax = anexosPorDenuncia[row.id] ?? [];
            const nForm = ax.filter((a) => !a.anotacao_id).length;
            const relPreview = row.relato.length > 220 ? `${row.relato.slice(0, 220)}…` : row.relato;
            return (
              <div
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 14,
                  padding: "16px 18px",
                  borderRadius: 14,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.cardBg,
                  alignItems: "start",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, color: t.text, fontFamily: FONT.body }}>{row.protocolo}</span>
                    <span style={{ fontSize: 12, color: t.textMuted }}>{fmtDt(row.created_at)}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "rgba(124,58,237,0.15)",
                        color: "var(--brand-primary, #7c3aed)",
                      }}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>
                    {row.tipos_denuncia.map((k) => tipoLabel(k)).join(" · ")}
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: t.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{relPreview}</p>
                  <div style={{ marginTop: 10, fontSize: 13, color: t.textMuted }}>
                    {nForm > 0 ? `Há ${nForm} arquivo(s) anexo(s)` : "Sem anexos no formulário"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  {perm.canEditarOk ? (
                    <Btn icone={<Pencil size={16} aria-hidden />} label="Atender" onClick={() => setModalAtender(row)} t={t} grad={ctaGradient(brand)} />
                  ) : null}
                  <Btn icone={<Eye size={16} aria-hidden />} label="Ver" onClick={() => setModalVer(row)} t={t} />
                  <Btn icone={<History size={16} aria-hidden />} label="Histórico" onClick={() => setModalHist(row)} t={t} />
                  {perm.canExcluirOk ? (
                    <Btn icone={<Trash2 size={16} aria-hidden />} label="Excluir" onClick={() => setDelRow(row)} t={t} danger />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalVerDenuncia
        open={!!modalVer}
        onClose={() => setModalVer(null)}
        row={modalVer}
        t={t}
        anexos={modalVer ? anexosPorDenuncia[modalVer.id] ?? [] : []}
        onDownload={downloadAnexo}
        canDownload={perm.canEditarOk}
      />
      <ModalAtenderDenuncia
        open={!!modalAtender}
        onClose={() => setModalAtender(null)}
        row={modalAtender}
        t={t}
        anexos={modalAtender ? anexosPorDenuncia[modalAtender.id] ?? [] : []}
        onSaved={() => {
          void fetchLista();
          void fetchKpis();
        }}
        onDownload={downloadAnexo}
        canDownload={perm.canEditarOk}
      />
      <ModalHistoricoDenuncia
        open={!!modalHist}
        onClose={() => setModalHist(null)}
        denunciaId={modalHist?.id ?? null}
        protocolo={modalHist?.protocolo ?? ""}
        t={t}
      />
      <ModalConfirmarExclusao
        open={!!delRow}
        onClose={() => setDelRow(null)}
        protocolo={delRow?.protocolo ?? ""}
        t={t}
        onConfirm={() => void confirmarExclusao()}
        loading={delLoading}
      />
    </div>
  );
}

function fmtDt(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function chip(on: boolean, t: ReturnType<typeof useApp>["theme"]) {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${on ? "var(--brand-primary, #7c3aed)" : t.cardBorder}`,
    background: on ? "rgba(124,58,237,0.12)" : t.inputBg,
    color: t.text,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT.body,
  } as const;
}

function FiltroSelect({
  label,
  value,
  onChange,
  options,
  t,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
  t: ReturnType<typeof useApp>["theme"];
}) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg,
          color: t.text,
          fontFamily: FONT.body,
          fontSize: 13,
          minWidth: 180,
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
}

function Btn({
  label,
  onClick,
  icone,
  t,
  grad,
  danger,
}: {
  label: string;
  onClick: () => void;
  icone: ReactNode;
  t: ReturnType<typeof useApp>["theme"];
  grad?: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 10,
        border: `1px solid ${danger ? "rgba(232,64,37,0.5)" : grad ? "transparent" : t.cardBorder}`,
        background: danger ? "rgba(232,64,37,0.12)" : grad ?? t.inputBg,
        backgroundImage: grad ? grad : undefined,
        color: grad ? "#fff" : danger ? "#e84025" : t.text,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: FONT.body,
        whiteSpace: "nowrap",
      }}
    >
      {icone}
      {label}
    </button>
  );
}
