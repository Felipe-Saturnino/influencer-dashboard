import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Eye, History, Loader2, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { getFilterBarRowStyle, getFilterBarWrapperStyle } from "../../../lib/filterBarStyles";
import { getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles";
import { FiltroBarCampoSelect, FiltroEntidadeBarSelect, FiltroHistoricoButton } from "../../../components/dashboard";
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
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";

function ctaGradient(brand: ReturnType<typeof useDashboardBrand>): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))";
}

type MesDenunciaEntry = { value: string; label: string };

/** Primeiro mês do canal: maio/2026 — carrossel do mês atual para trás. */
function buildMesesDenuncias(): MesDenunciaEntry[] {
  const minStart = new Date(2026, 4, 1);
  const now = new Date();
  const out: MesDenunciaEntry[] = [];
  let d = new Date(now.getFullYear(), now.getMonth(), 1);
  while (d >= minStart) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const value = `${y}-${m}`;
    const raw = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    out.push({ value, label: raw.charAt(0).toUpperCase() + raw.slice(1) });
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  }
  return out;
}

const DENUNCIA_TIPO_FILTRO_ITENS = TIPOS_DENUNCIA.map((item) => ({
  id: item.key,
  name: item.titulo,
}));

const KPI_STATUS_CORES: Record<DenunciaStatusDb, string> = {
  relatado: "var(--brand-primary, #7c3aed)",
  em_avaliacao: "#f59e0b",
  procedente: "#22c55e",
  nao_procedente: "#e84025",
};

const KPI_STATUS_LABEL: Record<DenunciaStatusDb, string> = {
  relatado: "RELATADO",
  em_avaliacao: "EM AVALIAÇÃO",
  procedente: "PROCEDENTE",
  nao_procedente: "NÃO PROCEDENTE",
};

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

  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [idxMes, setIdxMes] = useState(0);
  const [modoHistorico, setModoHistorico] = useState(false);
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

  const meses = useMemo(() => buildMesesDenuncias(), []);
  const filtroPeriodoLista = modoHistorico ? "historico" : (meses[idxMes]?.value ?? meses[0]?.value ?? "historico");
  const carouselPrimeiro = idxMes <= 0;
  const carouselUltimo = idxMes >= meses.length - 1;
  const labelCarrossel = modoHistorico ? "Todo o período" : (meses[idxMes]?.label ?? "—");

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
      if (filtroPeriodoLista !== "historico") {
        const { start, end } = rangeForMonth(filtroPeriodoLista);
        q = q.gte("created_at", start).lte("created_at", end);
      }
      const { count } = await q;
      next[s] = count ?? 0;
    }
    setKpis(next);
  }, [filtroPeriodoLista]);

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

  const filterBarSection = (withTopBorder: boolean): CSSProperties => ({
    ...getFilterBarRowStyle(),
    width: "100%",
    ...(withTopBorder
      ? { paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }
      : {}),
  });

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
  const kpiSkeletonStyle: CSSProperties = {
    height: 28,
    width: "65%",
    borderRadius: 8,
    background: t.isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
  };

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
        icon={<PageMenuIcon pageKey="rh_central_denuncias" />}
        title={getPageMenuLabel("rh_central_denuncias")}
        subtitle="Canal de denúncias Spin"
      />

      <div style={getFilterBarWrapperStyle(brand, t)}>
          <div style={filterBarSection(false)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <button
                type="button"
                aria-label="Mês anterior"
                disabled={carouselPrimeiro || modoHistorico}
                onClick={() => setIdxMes((i) => Math.max(0, i - 1))}
                style={getCarouselBtnNavStyle(t, carouselPrimeiro || modoHistorico)}
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
              <span style={getCarouselPeriodLabelStyle(t)}>{labelCarrossel}</span>
              <button
                type="button"
                aria-label="Próximo mês"
                disabled={carouselUltimo || modoHistorico}
                onClick={() => setIdxMes((i) => Math.min(meses.length - 1, i + 1))}
                style={getCarouselBtnNavStyle(t, carouselUltimo || modoHistorico)}
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>

            <FiltroHistoricoButton active={modoHistorico} onClick={() => setModoHistorico((h) => !h)} />

            <FiltroEntidadeBarSelect
              selected={filtroTipos}
              onChange={(ids) => setFiltroTipos(ids as TipoDenunciaKey[])}
              items={DENUNCIA_TIPO_FILTRO_ITENS}
              icon={<TriangleAlert size={15} strokeWidth={2} aria-hidden="true" />}
              triggerEmptyLabel="Todos Tipos"
              ariaFilterPrefix="Tipos de denúncia"
              listboxAriaLabel="Tipos de denúncia"
              enableSearch
            />

            <FiltroBarCampoSelect
              id="filtro-status-denuncia"
              value={filtroStatus}
              onChange={setFiltroStatus}
              options={STATUS_OPTIONS}
              icon={FilterBarIcons.status}
              ariaLabel="Status da denúncia"
              todasValue="todos"
              todasLabel="Todos Status"
            />
          </div>

          <div style={filterBarSection(true)}>
            <BarraPesquisaPagina
              id="busca-relato"
              value={busca}
              onChange={setBusca}
              placeholder={PAGE_SEARCH.denuncias}
              aria-label="Pesquisar denúncias por palavras-chave no relato"
              wrapperStyle={{ width: "100%", flex: "1 1 280px", maxWidth: "100%" }}
            />
          </div>
        </div>

      {/* Bloco 2 — KPIs por status (mesmo período do filtro acima) */}
      <div className="app-grid-kpi-4" style={{ ...getPageKpiSectionGapStyle(), width: "100%", gap: 14 }}>
        {STATUS_OPTIONS.map((s) => {
          const color = KPI_STATUS_CORES[s.value];
          const valor = kpis[s.value];
          const labelKpi = KPI_STATUS_LABEL[s.value];
          return (
            <div
              key={s.value}
              aria-label={loading ? labelKpi : `${labelKpi}: ${valor}`}
              style={{
                borderRadius: 14,
                border: `1px solid ${t.cardBorder}`,
                borderLeft: `3px solid ${color}`,
                background: brand.blockBg,
                padding: "16px 18px",
                boxShadow: cardShadow,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {labelKpi}
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color,
                  fontFamily: FONT_TITLE,
                  marginTop: 6,
                  minHeight: 32,
                  display: "flex",
                  alignItems: "center",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {loading ? <div style={kpiSkeletonStyle} aria-hidden /> : valor}
              </div>
            </div>
          );
        })}
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
