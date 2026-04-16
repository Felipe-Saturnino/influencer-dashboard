import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, ScanLine, Shirt, Wrench, XCircle } from "lucide-react";
import { GiShield } from "react-icons/gi";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
import { baixarEtiquetaFigurinoPdf } from "../../../lib/rhFigurinoEtiquetaPdf";
import { PageHeader } from "../../../components/PageHeader";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import type { Operadora } from "../../../types";
import type {
  RhFigurinoEmprestimo,
  RhFigurinoPeca,
  RhFigurinoStatus,
  RhFigurinoStatusHist,
  RhReturnCondition,
} from "./types";
import { BarcodeBlock } from "./BarcodeBlock";
import { ScannerPanel } from "./ScannerPanel";

import { CATEGORIAS, TAMANHOS, emptyMsgAba, labelAba, labelStatusPeca } from "./figurinosConstants";

type Aba = RhFigurinoStatus;

function ctaGradient(brand: ReturnType<typeof useDashboardBrand>): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))";
}

function fmtDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function actorLabel(user: { name: string; email: string } | null): string {
  if (!user) return "—";
  return (user.name || "").trim() || user.email;
}

export default function FigurinosPage() {
  const { theme: t, user, podeVerOperadora } = useApp();
  const brand = useDashboardBrand();
  const { showFiltroOperadora, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("rh_figurinos");

  const [pecas, setPecas] = useState<RhFigurinoPeca[]>([]);
  const [empPorItem, setEmpPorItem] = useState<Record<string, RhFigurinoEmprestimo>>({});
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<Aba>("available");
  const [filtroOp, setFiltroOp] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [filtroTam, setFiltroTam] = useState<string>("todas");

  const [modalCadastro, setModalCadastro] = useState(false);
  const [modalScanner, setModalScanner] = useState(false);
  const [pecaNova, setPecaNova] = useState<RhFigurinoPeca | null>(null);
  const [detalhe, setDetalhe] = useState<RhFigurinoPeca | null>(null);
  const [histEmp, setHistEmp] = useState<RhFigurinoEmprestimo[]>([]);
  const [histStatus, setHistStatus] = useState<RhFigurinoStatusHist[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const [empPeca, setEmpPeca] = useState<RhFigurinoPeca | null>(null);
  const [devPeca, setDevPeca] = useState<RhFigurinoPeca | null>(null);
  const [avisoPeca, setAvisoPeca] = useState<RhFigurinoPeca | null>(null);

  const [manutPeca, setManutPeca] = useState<RhFigurinoPeca | null>(null);
  const [descPeca, setDescPeca] = useState<RhFigurinoPeca | null>(null);
  const [concluirManutPeca, setConcluirManutPeca] = useState<RhFigurinoPeca | null>(null);

  const [erroGlobal, setErroGlobal] = useState<string | null>(null);

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroGlobal(null);
    let q = supabase.from("rh_figurino_pecas").select("*").order("created_at", { ascending: false });
    if (user?.role === "operador" && operadoraSlugsForcado?.length) {
      q = q.in("operadora_slug", operadoraSlugsForcado);
    }
    const [pr, er, or] = await Promise.all([
      q,
      supabase.from("rh_figurino_emprestimos").select("*").eq("status", "active").limit(500),
      supabase.from("operadoras").select("slug, nome, brand_action").order("nome").eq("ativo", true),
    ]);
    if (pr.error) setErroGlobal(pr.error.message);
    setPecas((pr.data ?? []) as RhFigurinoPeca[]);
    const emps = (er.data ?? []) as RhFigurinoEmprestimo[];
    const map: Record<string, RhFigurinoEmprestimo> = {};
    emps.forEach((e) => {
      map[e.item_id] = e;
    });
    setEmpPorItem(map);
    setOperadoras((or.data ?? []) as Operadora[]);
    setLoading(false);
  }, [user?.role, operadoraSlugsForcado]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (user?.role === "operador" && operadoraSlugsForcado?.length === 1) {
      setFiltroOp(operadoraSlugsForcado[0]);
    }
  }, [user?.role, operadoraSlugsForcado]);

  const operadoraNome = useCallback(
    (slug: string) => operadoras.find((o) => o.slug === slug)?.nome ?? slug,
    [operadoras],
  );

  const pecasFiltradas = useMemo(() => {
    const b = busca.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    return pecas.filter((p) => {
      if (p.status !== aba) return false;
      if (filtroOp !== "todas" && p.operadora_slug !== filtroOp) return false;
      if (filtroCat !== "todas" && p.category !== filtroCat) return false;
      if (filtroTam !== "todas" && p.size !== filtroTam) return false;
      if (!b) return true;
      const hay = `${p.code} ${p.name} ${p.operadora_slug} ${p.barcode}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "");
      return hay.includes(b);
    });
  }, [pecas, aba, filtroOp, filtroCat, filtroTam, busca]);

  const kpis = useMemo(() => {
    const tot = pecas.length;
    const av = pecas.filter((p) => p.status === "available").length;
    const bo = pecas.filter((p) => p.status === "borrowed").length;
    const ma = pecas.filter((p) => p.status === "maintenance").length;
    return { tot, av, bo, ma };
  }, [pecas]);

  const abrirDetalhe = async (p: RhFigurinoPeca) => {
    setDetalhe(p);
    setLoadingHist(true);
    const [e1, e2] = await Promise.all([
      supabase
        .from("rh_figurino_emprestimos")
        .select("*")
        .eq("item_id", p.id)
        .order("loaned_at", { ascending: false })
        .limit(80),
      supabase
        .from("rh_figurino_status_history")
        .select("*")
        .eq("item_id", p.id)
        .order("changed_at", { ascending: false })
        .limit(80),
    ]);
    setHistEmp((e1.data ?? []) as RhFigurinoEmprestimo[]);
    setHistStatus((e2.data ?? []) as RhFigurinoStatusHist[]);
    setLoadingHist(false);
  };

  const resolverCodigo = async (texto: string): Promise<RhFigurinoPeca | null> => {
    const raw = texto.trim();
    if (!raw) return null;
    const byBar = await supabase.from("rh_figurino_pecas").select("*").eq("barcode", raw).maybeSingle();
    if (byBar.data) return byBar.data as RhFigurinoPeca;
    const upper = raw.toUpperCase();
    const byCode = await supabase.from("rh_figurino_pecas").select("*").eq("code", upper).maybeSingle();
    if (byCode.data) return byCode.data as RhFigurinoPeca;
    return null;
  };

  const onScanOuManual = async (texto: string) => {
    setErroGlobal(null);
    const p = await resolverCodigo(texto);
    if (!p) {
      setErroGlobal("Código não reconhecido. Verifique se a peça foi cadastrada ou tente digitar o código manualmente.");
      return;
    }
    if (p.status === "maintenance" || p.status === "discarded") {
      setAvisoPeca(p);
      return;
    }
    if (p.status === "available") {
      setEmpPeca(p);
      setModalScanner(false);
      return;
    }
    if (p.status === "borrowed") {
      setDevPeca(p);
      setModalScanner(false);
    }
  };

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  const podeCriar = perm.canCriarOk;
  const podeEditar = perm.canEditarOk;

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<Shirt size={14} aria-hidden />}
        title="Figurinos"
        subtitle="Controle de peças, etiquetas, empréstimos e devoluções por operadora."
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                setErroGlobal(null);
                setModalScanner(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <ScanLine size={16} aria-hidden />
              Bipar código
            </button>
            {podeCriar ? (
              <button
                type="button"
                onClick={() => {
                  setErroGlobal(null);
                  setModalCadastro(true);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: ctaGradient(brand),
                  color: "#fff",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Plus size={16} aria-hidden />
                Cadastrar peça
              </button>
            ) : null}
          </div>
        }
      />

      {erroGlobal ? (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 14,
            background: "rgba(232,64,37,0.12)",
            border: "1px solid rgba(232,64,37,0.35)",
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          <AlertCircle size={14} aria-hidden />
          {erroGlobal}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Total de peças", value: kpis.tot, cor: t.text },
          { label: "Disponíveis", value: kpis.av, cor: "#22c55e" },
          { label: "Emprestadas", value: kpis.bo, cor: "#f59e0b" },
          { label: "Em manutenção", value: kpis.ma, cor: "#a78bfa" },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              borderRadius: 14,
              border: `1px solid ${t.cardBorder}`,
              background: brand.blockBg,
              padding: "16px 18px",
              boxShadow: cardShadow,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, letterSpacing: "0.06em" }}>
              {k.label.toUpperCase()}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.cor, fontFamily: FONT_TITLE, marginTop: 6 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            borderRadius: 14,
            border: brand.primaryTransparentBorder,
            background: brand.primaryTransparentBg,
            padding: "12px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {showFiltroOperadora ? (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    display: "flex",
                    alignItems: "center",
                    pointerEvents: "none",
                    color: t.textMuted,
                  }}
                >
                  <GiShield size={13} aria-hidden />
                </span>
                <select
                  value={filtroOp}
                  onChange={(e) => setFiltroOp(e.target.value)}
                  aria-label="Filtrar por operadora"
                  style={{
                    padding: "6px 14px 6px 30px",
                    borderRadius: 999,
                    border: `1px solid ${filtroOp !== "todas" ? brand.accent : t.cardBorder}`,
                    background:
                      filtroOp !== "todas"
                        ? brand.useBrand
                          ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                          : "#4a208222"
                        : (t.inputBg ?? t.cardBg),
                    color: filtroOp !== "todas" ? brand.accent : t.textMuted,
                    fontSize: 13,
                    fontWeight: filtroOp !== "todas" ? 700 : 400,
                    fontFamily: FONT.body,
                    cursor: "pointer",
                    outline: "none",
                    appearance: "none",
                  }}
                >
                  <option value="todas">Todas as operadoras</option>
                  {operadoras
                    .filter((o) => podeVerOperadora(o.slug))
                    .map((o) => (
                      <option key={o.slug} value={o.slug}>
                        {o.nome}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, código ou barcode…"
              aria-label="Buscar peças"
              style={{
                minWidth: 200,
                flex: "1 1 200px",
                maxWidth: 360,
                padding: "8px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
                fontSize: 13,
              }}
            />
            <select
              value={filtroCat}
              onChange={(e) => setFiltroCat(e.target.value)}
              aria-label="Filtrar por categoria"
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.textMuted,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              <option value="todas">Todas as categorias</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filtroTam}
              onChange={(e) => setFiltroTam(e.target.value)}
              aria-label="Filtrar por tamanho"
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.textMuted,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              <option value="todas">Todos os tamanhos</option>
              {TAMANHOS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Status do inventário" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["available", "borrowed", "maintenance", "discarded"] as Aba[]).map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={aba === a}
            id={`tab-fig-${a}`}
            aria-controls={`panel-fig-${a}`}
            onClick={() => setAba(a)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              border: `1px solid ${aba === a ? brand.accent : t.cardBorder}`,
              background:
                aba === a
                  ? brand.useBrand
                    ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                    : "rgba(124,58,237,0.15)"
                  : "transparent",
              color: aba === a ? brand.accent : t.textMuted,
              fontWeight: aba === a ? 700 : 500,
            }}
          >
            {labelAba(a)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-fig-${aba}`} aria-labelledby={`tab-fig-${aba}`}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280, gap: 10, color: t.textMuted }}>
            <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            <span style={{ fontFamily: FONT.body, fontSize: 13 }}>Carregando…</span>
          </div>
        ) : pecasFiltradas.length === 0 ? (
          <div style={{ padding: "36px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            {emptyMsgAba(aba)}
          </div>
        ) : (
          <div className="app-table-wrap">
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                borderRadius: 14,
                overflow: "hidden",
                border: `1px solid ${t.cardBorder}`,
              }}
            >
              <caption style={{ display: "none" }}>Inventário de figurinos — {labelAba(aba)}</caption>
              <thead>
                <tr>
                  {aba === "available" ? (
                    <>
                      <th scope="col" style={getThStyle(t)}>
                        Código
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Nome
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Categoria
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Tam.
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Operadora
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Condição
                      </th>
                      <th scope="col" style={{ ...getThStyle(t), textAlign: "right" }}>
                        Ações
                      </th>
                    </>
                  ) : null}
                  {aba === "borrowed" ? (
                    <>
                      <th scope="col" style={getThStyle(t)}>
                        Código
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Nome
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Tam.
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Emprestado para
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Data
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Por
                      </th>
                      <th scope="col" style={{ ...getThStyle(t), textAlign: "right" }}>
                        Ações
                      </th>
                    </>
                  ) : null}
                  {aba === "maintenance" ? (
                    <>
                      <th scope="col" style={getThStyle(t)}>
                        Código
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Nome
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Tam.
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Motivo
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Entrada
                      </th>
                      <th scope="col" style={{ ...getThStyle(t), textAlign: "right" }}>
                        Ações
                      </th>
                    </>
                  ) : null}
                  {aba === "discarded" ? (
                    <>
                      <th scope="col" style={getThStyle(t)}>
                        Código
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Nome
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Tam.
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Data descarte
                      </th>
                      <th scope="col" style={getThStyle(t)}>
                        Motivo
                      </th>
                      <th scope="col" style={{ ...getThStyle(t), textAlign: "right" }}>
                        Ações
                      </th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pecasFiltradas.map((p, i) => {
                  const emp = empPorItem[p.id];
                  const zebra = { background: zebraStripe(i) };
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${t.cardBorder}`, ...zebra }}>
                      {aba === "available" ? (
                        <>
                          <td style={getTdStyle(t)}>{p.code}</td>
                          <td style={{ ...getTdStyle(t), maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }} title={p.name}>
                            {p.name}
                          </td>
                          <td style={getTdStyle(t)}>{p.category}</td>
                          <td style={getTdStyle(t)}>{p.size}</td>
                          <td style={getTdStyle(t)}>{operadoraNome(p.operadora_slug)}</td>
                          <td style={getTdStyle(t)}>{p.condition === "good" ? "Boa" : p.condition === "damaged" ? "Avariada" : "Limpeza"}</td>
                          <td style={{ ...getTdStyle(t), textAlign: "right", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              onClick={() => void abrirDetalhe(p)}
                              style={{
                                padding: "4px 10px",
                                marginRight: 6,
                                borderRadius: 8,
                                border: `1px solid ${t.cardBorder}`,
                                background: "transparent",
                                color: brand.accent,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: FONT.body,
                              }}
                            >
                              Detalhes
                            </button>
                            {podeEditar ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEmpPeca(p)}
                                  style={{
                                    padding: "4px 10px",
                                    marginRight: 6,
                                    borderRadius: 8,
                                    border: `1px solid rgba(34,197,94,0.35)`,
                                    background: "rgba(34,197,94,0.12)",
                                    color: "#22c55e",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontFamily: FONT.body,
                                  }}
                                >
                                  Emprestar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setManutPeca(p)}
                                  style={{
                                    padding: "4px 10px",
                                    marginRight: 6,
                                    borderRadius: 8,
                                    border: `1px solid rgba(167,139,250,0.4)`,
                                    background: "rgba(167,139,250,0.12)",
                                    color: "#a78bfa",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontFamily: FONT.body,
                                  }}
                                >
                                  Manutenção
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDescPeca(p)}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    border: "1px solid rgba(107,114,128,0.45)",
                                    background: "rgba(107,114,128,0.1)",
                                    color: "#6b7280",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontFamily: FONT.body,
                                  }}
                                >
                                  Descartar
                                </button>
                              </>
                            ) : null}
                          </td>
                        </>
                      ) : null}
                      {aba === "borrowed" ? (
                        <>
                          <td style={getTdStyle(t)}>{p.code}</td>
                          <td style={{ ...getTdStyle(t), maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={p.name}>
                            {p.name}
                          </td>
                          <td style={getTdStyle(t)}>{p.size}</td>
                          <td style={getTdStyle(t)}>{emp?.borrower_name ?? "—"}</td>
                          <td style={getTdStyle(t)}>{fmtDataHora(emp?.loaned_at)}</td>
                          <td style={getTdStyle(t)}>{emp?.loaned_by ?? "—"}</td>
                          <td style={{ ...getTdStyle(t), textAlign: "right", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              onClick={() => void abrirDetalhe(p)}
                              style={{
                                padding: "4px 10px",
                                marginRight: 6,
                                borderRadius: 8,
                                border: `1px solid ${t.cardBorder}`,
                                background: "transparent",
                                color: brand.accent,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: FONT.body,
                              }}
                            >
                              Detalhes
                            </button>
                            {podeEditar ? (
                              <button
                                type="button"
                                onClick={() => setDevPeca(p)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  border: `1px solid rgba(245,158,11,0.4)`,
                                  background: "rgba(245,158,11,0.12)",
                                  color: "#f59e0b",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  fontFamily: FONT.body,
                                }}
                              >
                                Devolver
                              </button>
                            ) : null}
                          </td>
                        </>
                      ) : null}
                      {aba === "maintenance" ? (
                        <>
                          <td style={getTdStyle(t)}>{p.code}</td>
                          <td style={{ ...getTdStyle(t), maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={p.name}>
                            {p.name}
                          </td>
                          <td style={getTdStyle(t)}>{p.size}</td>
                          <td style={{ ...getTdStyle(t), maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }} title={p.maintenance_reason ?? ""}>
                            {p.maintenance_reason ?? "—"}
                          </td>
                          <td style={getTdStyle(t)}>{fmtDataHora(p.maintenance_entered_at)}</td>
                          <td style={{ ...getTdStyle(t), textAlign: "right", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              onClick={() => void abrirDetalhe(p)}
                              style={{
                                padding: "4px 10px",
                                marginRight: 6,
                                borderRadius: 8,
                                border: `1px solid ${t.cardBorder}`,
                                background: "transparent",
                                color: brand.accent,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: FONT.body,
                              }}
                            >
                              Detalhes
                            </button>
                            {podeEditar ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setConcluirManutPeca(p)}
                                  style={{
                                    padding: "4px 10px",
                                    marginRight: 6,
                                    borderRadius: 8,
                                    border: `1px solid rgba(34,197,94,0.35)`,
                                    background: "rgba(34,197,94,0.12)",
                                    color: "#22c55e",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontFamily: FONT.body,
                                  }}
                                >
                                  Disponibilizar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDescPeca(p)}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: 8,
                                    border: "1px solid rgba(107,114,128,0.45)",
                                    background: "rgba(107,114,128,0.1)",
                                    color: "#6b7280",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    fontFamily: FONT.body,
                                  }}
                                >
                                  Descartar
                                </button>
                              </>
                            ) : null}
                          </td>
                        </>
                      ) : null}
                      {aba === "discarded" ? (
                        <>
                          <td style={getTdStyle(t)}>{p.code}</td>
                          <td style={{ ...getTdStyle(t), maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }} title={p.name}>
                            {p.name}
                          </td>
                          <td style={getTdStyle(t)}>{p.size}</td>
                          <td style={getTdStyle(t)}>{fmtDataHora(p.discarded_at)}</td>
                          <td style={{ ...getTdStyle(t), maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }} title={p.discard_reason ?? ""}>
                            {p.discard_reason ?? "—"}
                          </td>
                          <td style={{ ...getTdStyle(t), textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => void abrirDetalhe(p)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 8,
                                border: `1px solid ${t.cardBorder}`,
                                background: "transparent",
                                color: brand.accent,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: FONT.body,
                              }}
                            >
                              Detalhes
                            </button>
                          </td>
                        </>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalCadastro ? (
        <ModalCadastroPeca
          onClose={() => setModalCadastro(false)}
          operadoras={operadoras}
          podeVerOperadora={podeVerOperadora}
          operadoraSlugsForcado={operadoraSlugsForcado}
          actor={actorLabel(user)}
          onCreated={(row) => {
            setPecaNova(row);
            setModalCadastro(false);
            void carregar();
          }}
        />
      ) : null}

      {pecaNova ? (
        <ModalSucessoCadastro
          peca={pecaNova}
          operadoraNome={operadoraNome(pecaNova.operadora_slug)}
          onClose={() => setPecaNova(null)}
        />
      ) : null}

      {modalScanner ? (
        <ModalScanner
          onClose={() => setModalScanner(false)}
          onSubmitManual={onScanOuManual}
          onDetect={onScanOuManual}
        />
      ) : null}

      {empPeca ? (
        <ModalEmprestimo
          peca={empPeca}
          actor={actorLabel(user)}
          onClose={() => setEmpPeca(null)}
          onOk={async () => {
            setEmpPeca(null);
            await carregar();
          }}
        />
      ) : null}

      {devPeca ? (
        <ModalDevolucao
          peca={devPeca}
          emprestimo={empPorItem[devPeca.id]}
          actor={actorLabel(user)}
          onClose={() => setDevPeca(null)}
          onOk={async () => {
            setDevPeca(null);
            await carregar();
          }}
        />
      ) : null}

      {avisoPeca ? (
        <ModalBase onClose={() => setAvisoPeca(null)} maxWidth={420}>
          <ModalHeader title="Peça indisponível para empréstimo/devolução" onClose={() => setAvisoPeca(null)} />
          <p style={{ fontFamily: FONT.body, fontSize: 14, color: t.text, lineHeight: 1.5, margin: "0 0 12px" }}>
            {avisoPeca.name} ({avisoPeca.code}) está como <strong>{labelStatusPeca(avisoPeca.status)}</strong>.
          </p>
          <button
            type="button"
            onClick={() => {
              setAvisoPeca(null);
              void abrirDetalhe(avisoPeca);
            }}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: ctaGradient(brand),
              color: "#fff",
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Ver detalhes
          </button>
        </ModalBase>
      ) : null}

      {manutPeca ? (
        <ModalMotivo
          titulo="Enviar para manutenção"
          label="Motivo"
          confirmLabel="Confirmar"
          onClose={() => setManutPeca(null)}
          onConfirm={async (motivo) => {
            const { error } = await supabase.rpc("rh_figurino_enviar_manutencao", {
              p_item_id: manutPeca.id,
              p_motivo: motivo,
              p_actor: actorLabel(user),
            });
            if (error) throw new Error(error.message);
            setManutPeca(null);
            await carregar();
          }}
        />
      ) : null}

      {descPeca ? (
        <ModalMotivo
          titulo="Descartar peça"
          label="Motivo do descarte"
          confirmLabel="Descartar"
          destructive
          onClose={() => setDescPeca(null)}
          onConfirm={async (motivo) => {
            const { error } = await supabase.rpc("rh_figurino_descartar", {
              p_item_id: descPeca.id,
              p_motivo: motivo,
              p_actor: actorLabel(user),
            });
            if (error) throw new Error(error.message);
            setDescPeca(null);
            await carregar();
          }}
        />
      ) : null}

      {concluirManutPeca ? (
        <ModalBase onClose={() => setConcluirManutPeca(null)} maxWidth={400}>
          <ModalHeader title="Disponibilizar peça" onClose={() => setConcluirManutPeca(null)} />
          <p style={{ fontFamily: FONT.body, fontSize: 14, color: t.text, marginBottom: 16 }}>
            Confirma que a manutenção de <strong>{concluirManutPeca.code}</strong> foi concluída e a peça volta ao estoque disponível?
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setConcluirManutPeca(null)}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                color: t.textMuted,
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                const { error } = await supabase.rpc("rh_figurino_concluir_manutencao", {
                  p_item_id: concluirManutPeca.id,
                  p_actor: actorLabel(user),
                });
                if (error) setErroGlobal(error.message);
                else {
                  setConcluirManutPeca(null);
                  await carregar();
                }
              }}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                border: "none",
                background: ctaGradient(brand),
                color: "#fff",
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              Confirmar
            </button>
          </div>
        </ModalBase>
      ) : null}

      {detalhe ? (
        <ModalDetalhe
          peca={detalhe}
          operadoraNome={operadoraNome(detalhe.operadora_slug)}
          histEmp={histEmp}
          histStatus={histStatus}
          loadingHist={loadingHist}
          empAtivo={empPorItem[detalhe.id]}
          podeEditar={podeEditar}
          onClose={() => setDetalhe(null)}
          onEmprestar={() => {
            setDetalhe(null);
            setEmpPeca(detalhe);
          }}
          onDevolver={() => {
            setDetalhe(null);
            setDevPeca(detalhe);
          }}
          onManutencao={() => {
            setDetalhe(null);
            setManutPeca(detalhe);
          }}
          onConcluirManut={() => {
            setDetalhe(null);
            setConcluirManutPeca(detalhe);
          }}
          onDescartar={() => {
            setDetalhe(null);
            setDescPeca(detalhe);
          }}
        />
      ) : null}
    </div>
  );
}

function ModalCadastroPeca({
  onClose,
  operadoras,
  podeVerOperadora,
  operadoraSlugsForcado,
  actor,
  onCreated,
}: {
  onClose: () => void;
  operadoras: Operadora[];
  podeVerOperadora: (s: string) => boolean;
  operadoraSlugsForcado: string[] | null;
  actor: string;
  onCreated: (row: RhFigurinoPeca) => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [op, setOp] = useState<string>(() => {
    if (operadoraSlugsForcado?.length === 1) return operadoraSlugsForcado[0];
    return "";
  });
  const [nome, setNome] = useState("");
  const [cat, setCat] = useState<string>(CATEGORIAS[0]);
  const [tam, setTam] = useState<string>(TAMANHOS[3]);
  const [cor, setCor] = useState("");
  const [desc, setDesc] = useState("");
  const [dataCompra, setDataCompra] = useState("");
  const [preco, setPreco] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const salvar = async () => {
    setErr(null);
    if (!op) {
      setErr("Selecione a operadora.");
      return;
    }
    if (!nome.trim()) {
      setErr("Informe o nome da peça.");
      return;
    }
    setLoading(true);
    const precoNum = preco.trim() === "" ? null : Number(preco.replace(/\./g, "").replace(",", "."));
    const { data, error } = await supabase.rpc("rh_figurino_criar_peca", {
      p_operadora_slug: op,
      p_name: nome.trim(),
      p_category: cat,
      p_size: tam,
      p_color: cor,
      p_description: desc,
      p_purchase_date: dataCompra.trim() === "" ? null : dataCompra,
      p_purchase_price: precoNum !== null && !Number.isFinite(precoNum) ? null : precoNum,
      p_actor: actor,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onCreated(data as RhFigurinoPeca);
  };

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title="Cadastrar peça" onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          Operadora *
          <select
            value={op}
            onChange={(e) => setOp(e.target.value)}
            required
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg ?? t.cardBg,
              color: t.text,
              fontFamily: FONT.body,
            }}
          >
            <option value="">Selecione…</option>
            {operadoras
              .filter((o) => podeVerOperadora(o.slug))
              .map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.nome}
                </option>
              ))}
          </select>
        </label>
        <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          Nome da peça *
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg ?? t.cardBg,
              color: t.text,
              fontFamily: FONT.body,
            }}
          />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Categoria *
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
              }}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Tamanho *
            <select
              value={tam}
              onChange={(e) => setTam(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
              }}
            >
              {TAMANHOS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          Cor
          <input
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg ?? t.cardBg,
              color: t.text,
              fontFamily: FONT.body,
            }}
          />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Data de compra
            <input
              type="date"
              value={dataCompra}
              onChange={(e) => setDataCompra(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
              }}
            />
          </label>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Valor (R$)
            <input
              inputMode="decimal"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              placeholder="0,00"
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
              }}
            />
          </label>
        </div>
        <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          Observações
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg ?? t.cardBg,
              color: t.text,
              fontFamily: FONT.body,
              resize: "vertical",
            }}
          />
        </label>
        {err ? (
          <div role="alert" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
            {err}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.textMuted,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void salvar()}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: "none",
              background: ctaGradient(brand),
              color: "#fff",
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

function ModalSucessoCadastro({
  peca,
  operadoraNome,
  onClose,
}: {
  peca: RhFigurinoPeca;
  operadoraNome: string;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [pdfLoading, setPdfLoading] = useState(false);

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title="Peça cadastrada" onClose={onClose} />
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            padding: "12px 16px",
            borderRadius: 12,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            marginBottom: 14,
          }}
        >
          <BarcodeBlock value={peca.barcode} />
        </div>
        <p style={{ fontFamily: FONT_TITLE, fontSize: 20, fontWeight: 800, color: brand.primary, margin: "8px 0" }}>{peca.code}</p>
        <p style={{ fontFamily: FONT.body, fontSize: 14, color: t.text, margin: "4px 0 16px" }}>
          {peca.name} · {peca.size} · {operadoraNome}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            disabled={pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              try {
                await baixarEtiquetaFigurinoPdf(peca, operadoraNome);
              } finally {
                setPdfLoading(false);
              }
            }}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: ctaGradient(brand),
              color: "#fff",
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: pdfLoading ? "not-allowed" : "pointer",
            }}
          >
            {pdfLoading ? "Gerando PDF…" : "Baixar etiqueta (PDF)"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: "transparent",
              color: t.textMuted,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

function ModalScanner({
  onClose,
  onSubmitManual,
  onDetect,
}: {
  onClose: () => void;
  onSubmitManual: (t: string) => void | Promise<void>;
  onDetect: (t: string) => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const [manual, setManual] = useState("");

  return (
    <ModalBase onClose={onClose} maxWidth={520}>
      <ModalHeader title="Bipar código" onClose={onClose} />
      <ScannerPanel onDetect={(txt) => void onDetect(txt)} />
      <form
        style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmitManual(manual);
        }}
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Digite o código ou barcode"
          aria-label="Digite o código manualmente"
          style={{
            flex: "1 1 200px",
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontFamily: FONT.body,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Buscar
        </button>
      </form>
    </ModalBase>
  );
}

function ModalEmprestimo({
  peca,
  actor,
  onClose,
  onOk,
}: {
  peca: RhFigurinoPeca;
  actor: string;
  onClose: () => void;
  onOk: () => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [nome, setNome] = useState("");
  const [ref, setRef] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, []);

  const confirmar = async () => {
    setErr(null);
    if (!nome.trim()) {
      setErr("Informe o nome de quem retira a peça.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("rh_figurino_registrar_emprestimo", {
      p_item_id: peca.id,
      p_borrower_name: nome.trim(),
      p_borrower_ref: ref.trim(),
      p_actor: actor,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    await onOk();
  };

  return (
    <ModalBase onClose={onClose} maxWidth={440}>
      <ModalHeader title="Registrar empréstimo" onClose={onClose} />
      <div
        style={{
          padding: 12,
          borderRadius: 12,
          border: `1px solid ${t.cardBorder}`,
          marginBottom: 14,
          fontFamily: FONT.body,
          fontSize: 13,
          color: t.text,
        }}
      >
        <strong>{peca.code}</strong> — {peca.name}
        <div style={{ marginTop: 6, color: t.textMuted, fontSize: 12 }}>
          {peca.category} · {peca.size}
        </div>
        <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <CheckCircle2 size={14} color="#22c55e" aria-hidden />
          <span style={{ color: "#22c55e", fontWeight: 700 }}>Disponível</span>
        </div>
      </div>
      <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 10 }}>
        Nome completo *
        <input
          ref={inputRef}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontFamily: FONT.body,
          }}
        />
      </label>
      <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 10 }}>
        Matrícula / ID (opcional)
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontFamily: FONT.body,
          }}
        />
      </label>
      <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12, fontFamily: FONT.body }}>
        Registrado por: <strong style={{ color: t.text }}>{actor}</strong>
        <br />
        Data/hora: <strong style={{ color: t.text }}>{fmtDataHora(new Date().toISOString())}</strong>
      </div>
      {err ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 10 }}>
          {err}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void confirmar()}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: ctaGradient(brand),
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? "Salvando…" : "Confirmar empréstimo"}
        </button>
      </div>
    </ModalBase>
  );
}

function ModalDevolucao({
  peca,
  emprestimo,
  actor,
  onClose,
  onOk,
}: {
  peca: RhFigurinoPeca;
  emprestimo: RhFigurinoEmprestimo | undefined;
  actor: string;
  onClose: () => void;
  onOk: () => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [cond, setCond] = useState<RhReturnCondition>("good");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const confirmar = async () => {
    setErr(null);
    if (cond !== "good" && !notes.trim()) {
      setErr("Descreva o ocorrido nas observações.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("rh_figurino_registrar_devolucao", {
      p_item_id: peca.id,
      p_return_condition: cond,
      p_notes: notes.trim(),
      p_actor: actor,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    await onOk();
  };

  const opts: { key: RhReturnCondition; label: string; cor: string; Icon: typeof CheckCircle2 }[] = [
    { key: "good", label: "Boa condição", cor: "#22c55e", Icon: CheckCircle2 },
    { key: "needs_cleaning", label: "Precisa de limpeza", cor: "#f59e0b", Icon: Wrench },
    { key: "damaged", label: "Avariada", cor: "#e84025", Icon: XCircle },
  ];

  return (
    <ModalBase onClose={onClose} maxWidth={460}>
      <ModalHeader title="Registrar devolução" onClose={onClose} />
      <div
        style={{
          padding: 12,
          borderRadius: 12,
          border: `1px solid ${t.cardBorder}`,
          marginBottom: 14,
          fontFamily: FONT.body,
          fontSize: 13,
          color: t.text,
        }}
      >
        <strong>{peca.code}</strong> — {peca.name}
        <div style={{ marginTop: 8, color: "#f59e0b", fontWeight: 700 }}>Emprestada</div>
        {emprestimo ? (
          <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted }}>
            Para: <strong style={{ color: t.text }}>{emprestimo.borrower_name}</strong>
            <br />
            Em: {fmtDataHora(emprestimo.loaned_at)}
            <br />
            Por: {emprestimo.loaned_by}
          </div>
        ) : (
          <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted }}>Dados do empréstimo não encontrados.</div>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 8, fontFamily: FONT.body }}>
        Condição na devolução
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {opts.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={cond === o.key}
            onClick={() => setCond(o.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${cond === o.key ? o.cor : t.cardBorder}`,
              background: cond === o.key ? `${o.cor}18` : "transparent",
              color: cond === o.key ? o.cor : t.textMuted,
              fontWeight: cond === o.key ? 700 : 500,
              fontFamily: FONT.body,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <o.Icon size={16} aria-hidden />
            {o.label}
          </button>
        ))}
      </div>
      <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 12 }}>
        Observações {cond !== "good" ? "(obrigatório)" : ""}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontFamily: FONT.body,
            resize: "vertical",
          }}
        />
      </label>
      <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12, fontFamily: FONT.body }}>
        Registrado por: <strong style={{ color: t.text }}>{actor}</strong>
      </div>
      {err ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 10 }}>
          {err}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void confirmar()}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: ctaGradient(brand),
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? "Salvando…" : "Confirmar devolução"}
        </button>
      </div>
    </ModalBase>
  );
}

function ModalMotivo({
  titulo,
  label,
  confirmLabel,
  destructive,
  onClose,
  onConfirm,
}: {
  titulo: string;
  label: string;
  confirmLabel: string;
  destructive?: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
}) {
  const { theme: t } = useApp();
  const [motivo, setMotivo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <ModalBase onClose={onClose} maxWidth={420}>
      <ModalHeader title={titulo} onClose={onClose} />
      <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 12 }}>
        {label} *
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg ?? t.cardBg,
            color: t.text,
            fontFamily: FONT.body,
            resize: "vertical",
          }}
        />
      </label>
      {err ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 10 }}>
          {err}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setErr(null);
            if (!motivo.trim()) {
              setErr("Preencha o motivo.");
              return;
            }
            setLoading(true);
            try {
              await onConfirm(motivo.trim());
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Erro ao salvar.");
            } finally {
              setLoading(false);
            }
          }}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: destructive ? "#ef4444" : `linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))`,
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? "Aguarde…" : confirmLabel}
        </button>
      </div>
    </ModalBase>
  );
}

function ModalDetalhe({
  peca,
  operadoraNome,
  histEmp,
  histStatus,
  loadingHist,
  empAtivo,
  podeEditar,
  onClose,
  onEmprestar,
  onDevolver,
  onManutencao,
  onConcluirManut,
  onDescartar,
}: {
  peca: RhFigurinoPeca;
  operadoraNome: string;
  histEmp: RhFigurinoEmprestimo[];
  histStatus: RhFigurinoStatusHist[];
  loadingHist: boolean;
  empAtivo: RhFigurinoEmprestimo | undefined;
  podeEditar: boolean;
  onClose: () => void;
  onEmprestar: () => void;
  onDevolver: () => void;
  onManutencao: () => void;
  onConcluirManut: () => void;
  onDescartar: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [pdfLoading, setPdfLoading] = useState(false);

  return (
    <ModalBase onClose={onClose} maxWidth={560}>
      <ModalHeader title={peca.code} onClose={onClose} />
      <div style={{ fontFamily: FONT.body, fontSize: 13, color: t.text, marginBottom: 12 }}>
        <strong>{peca.name}</strong>
        <div style={{ color: t.textMuted, marginTop: 6 }}>
          {peca.category} · {peca.size}
          {peca.color ? ` · ${peca.color}` : ""}
        </div>
        <div style={{ marginTop: 6 }}>Operadora: {operadoraNome}</div>
        <div style={{ marginTop: 6 }}>
          Status: <strong>{labelStatusPeca(peca.status)}</strong>
        </div>
        {peca.purchase_price != null ? <div style={{ marginTop: 6 }}>Valor compra: {fmtBRL(Number(peca.purchase_price))}</div> : null}
        {peca.description ? (
          <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted }}>{peca.description}</div>
        ) : null}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          disabled={pdfLoading}
          onClick={async () => {
            setPdfLoading(true);
            try {
              await baixarEtiquetaFigurinoPdf(peca, operadoraNome);
            } finally {
              setPdfLoading(false);
            }
          }}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
            color: t.text,
          }}
        >
          {pdfLoading ? "PDF…" : "Baixar etiqueta"}
        </button>
        {podeEditar && peca.status === "available" ? (
          <>
            <button
              type="button"
              onClick={onEmprestar}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: `1px solid rgba(34,197,94,0.35)`,
                background: "rgba(34,197,94,0.12)",
                color: "#22c55e",
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              Emprestar
            </button>
            <button
              type="button"
              onClick={onManutencao}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: `1px solid rgba(167,139,250,0.4)`,
                background: "rgba(167,139,250,0.12)",
                color: "#a78bfa",
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              Manutenção
            </button>
            <button
              type="button"
              onClick={onDescartar}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(107,114,128,0.45)",
                background: "rgba(107,114,128,0.1)",
                color: "#6b7280",
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              Descartar
            </button>
          </>
        ) : null}
        {podeEditar && peca.status === "borrowed" ? (
          <button
            type="button"
            onClick={onDevolver}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: `1px solid rgba(245,158,11,0.4)`,
              background: "rgba(245,158,11,0.12)",
              color: "#f59e0b",
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Devolver
          </button>
        ) : null}
        {podeEditar && peca.status === "maintenance" ? (
          <>
            <button
              type="button"
              onClick={onConcluirManut}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: `1px solid rgba(34,197,94,0.35)`,
                background: "rgba(34,197,94,0.12)",
                color: "#22c55e",
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              Disponibilizar
            </button>
            <button
              type="button"
              onClick={onDescartar}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(107,114,128,0.45)",
                background: "rgba(107,114,128,0.1)",
                color: "#6b7280",
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              Descartar
            </button>
          </>
        ) : null}
      </div>
      <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}>
        <BarcodeBlock value={peca.barcode} />
      </div>
      {empAtivo ? (
        <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 12 }}>
          Empréstimo ativo: <strong style={{ color: t.text }}>{empAtivo.borrower_name}</strong> desde {fmtDataHora(empAtivo.loaned_at)}
        </p>
      ) : null}
      <h3 style={{ fontSize: 13, fontWeight: 800, color: brand.primary, fontFamily: FONT_TITLE, margin: "16px 0 8px" }}>
        HISTÓRICO DE EMPRÉSTIMOS
      </h3>
      {loadingHist ? (
        <Loader2 className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" size={18} aria-hidden />
      ) : (
        <div className="app-table-wrap">
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 12, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
            <caption style={{ display: "none" }}>Empréstimos da peça</caption>
            <thead>
              <tr>
                <th scope="col" style={getThStyle(t)}>
                  De/Para
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Empréstimo
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Devolução
                </th>
              </tr>
            </thead>
            <tbody>
              {histEmp.map((e, i) => (
                <tr key={e.id} style={{ background: zebraStripe(i), borderBottom: `1px solid ${t.cardBorder}` }}>
                  <td style={getTdStyle(t)}>
                    {e.borrower_name}
                    {e.borrower_ref ? ` (${e.borrower_ref})` : ""}
                  </td>
                  <td style={getTdStyle(t)}>{fmtDataHora(e.loaned_at)}</td>
                  <td style={getTdStyle(t)}>{e.returned_at ? fmtDataHora(e.returned_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h3 style={{ fontSize: 13, fontWeight: 800, color: brand.primary, fontFamily: FONT_TITLE, margin: "16px 0 8px" }}>
        HISTÓRICO DE STATUS
      </h3>
      {loadingHist ? null : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: FONT.body, fontSize: 12, color: t.textMuted }}>
          {histStatus.map((h) => (
            <li key={h.id} style={{ padding: "8px 0", borderBottom: `1px solid ${t.cardBorder}` }}>
              <strong style={{ color: t.text }}>{fmtDataHora(h.changed_at)}</strong> — {h.previous_status ?? "—"} → {h.new_status}
              {h.notes ? ` · ${h.notes}` : ""}
              <div>Por {h.changed_by}</div>
            </li>
          ))}
        </ul>
      )}
    </ModalBase>
  );
}
