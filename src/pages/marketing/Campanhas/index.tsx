import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { Campanha } from "../../../types";
import { Pencil, AlertCircle } from "lucide-react";
import { GiMegaphone } from "react-icons/gi";
import { PageHeader } from "../../../components/PageHeader";
import { BlocoLabel } from "../../../components/BlocoLabel";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import { compareAtivoBoolean, compareLocaleTexto } from "../../../lib/classificacaoSort";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
  vermelho: "#e84025",
  verde: "#22c55e",
  cinza: "#6b7280",
} as const;

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Campanhas() {
  const { theme: t, isDark } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("campanhas");
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [operadoras, setOperadoras] = useState<{ slug: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Campanha | null>(null);
  type CampSortCol = "nome" | "operadora" | "classificacao" | "criada";
  const [sortCamp, setSortCamp] = useState<{ col: CampSortCol; dir: SortDir }>({ col: "classificacao", dir: "desc" });

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("campanhas").select("*").order("nome");
    setCampanhas(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    supabase.from("operadoras").select("slug, nome").order("nome").then(({ data }) =>
      setOperadoras(data ?? [])
    );
  }, []);

  const campanhasOrdenadas = useMemo(() => {
    const arr = [...campanhas];
    const { col, dir } = sortCamp;
    const nomeOp = (c: Campanha) =>
      (operadoras.find((o) => o.slug === c.operadora_slug)?.nome ?? c.operadora_slug ?? "").toLowerCase();
    arr.sort((a, b) => {
      let c0 = 0;
      switch (col) {
        case "nome":
          c0 = compareLocaleTexto(a.nome, b.nome, dir);
          break;
        case "operadora":
          c0 = compareLocaleTexto(nomeOp(a), nomeOp(b), dir);
          break;
        case "classificacao":
          c0 = compareAtivoBoolean(!!a.ativo, !!b.ativo, dir);
          break;
        case "criada":
          c0 = compareLocaleTexto(a.created_at ?? "", b.created_at ?? "", dir);
          break;
        default:
          c0 = 0;
      }
      if (c0 !== 0) return c0;
      return compareLocaleTexto(a.nome, b.nome, "asc");
    });
    return arr;
  }, [campanhas, sortCamp, operadoras]);
  const ativas = campanhas.filter((c) => c.ativo).length;
  const contadorLabel =
    campanhas.length === 1
      ? "1 campanha cadastrada"
      : `${campanhas.length} campanhas cadastradas`;

  // ─── Estilos de tabela ───────────────────────────────────────────────────
  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "10px 16px",
    color: t.textMuted,
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: FONT.body,
    background: brand.useBrand ? "color-mix(in srgb, var(--brand-secondary) 12%, transparent)" : "rgba(74,32,130,0.10)",
    borderBottom: `1px solid ${t.cardBorder}`,
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "12px 16px",
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 13,
    verticalAlign: "middle",
    borderBottom: `1px solid ${t.cardBorder}`,
  };

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar Campanhas.
      </div>
    );
  }

  const cardShadow = isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<GiMegaphone size={14} aria-hidden />}
        title="Campanhas"
        subtitle="Cadastre campanhas de mídias sociais. UTMs mapeados na Gestão de Links alimentam o Dashboard de Mídias (funil e performance)."
      />

      {/* ─── Cards de resumo ─────────────────────────────────────────────────── */}
      <div className="app-grid-kpi-3" style={{ marginBottom: 24 }}>
        {[
          { label: "Total", valor: campanhas.length, cor: brand.accent },
          { label: "Ativas", valor: ativas, cor: "#059669" },
          { label: "Inativas", valor: campanhas.length - ativas, cor: BRAND.cinza },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              background: brand.blockBg,
              border: `1px solid ${t.cardBorder}`,
              borderLeft: `3px solid ${c.cor}`,
              borderRadius: 18,
              padding: "16px 20px",
              boxShadow: cardShadow,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: t.textMuted,
                fontFamily: FONT.body,
                marginBottom: 6,
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: c.cor,
                fontFamily: FONT_TITLE,
                lineHeight: 1,
              }}
            >
              {c.valor}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Tabela ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: brand.blockBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 18,
          boxShadow: cardShadow,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 20px 0" }}>
          <BlocoLabel label="Campanhas cadastradas" />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px 16px",
          }}
        >
          <span style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted }}>
            {contadorLabel}
          </span>
          {perm.canCriarOk && (
            <button
              onClick={() => {
                setEditando(null);
                setModalOpen(true);
              }}
              style={{
                background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "9px 18px",
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              + Nova Campanha
            </button>
          )}
        </div>

        {loading ? (
          <div
            style={{
              padding: "40px 20px",
              color: t.textMuted,
              fontFamily: FONT.body,
              textAlign: "center",
            }}
          >
            Carregando...
          </div>
        ) : campanhas.length === 0 ? (
          <div
            style={{
              padding: "48px 20px",
              color: t.textMuted,
              fontFamily: FONT.body,
              textAlign: "center",
            }}
          >
            Nenhuma campanha cadastrada. Crie campanhas e mapeie UTMs na Gestão de Links.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <SortTableTh<CampSortCol>
                  label="Nome"
                  col="nome"
                  sortCol={sortCamp.col}
                  sortDir={sortCamp.dir}
                  thStyle={th}
                  align="left"
                  onSort={(c) =>
                    setSortCamp((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<CampSortCol>
                  label="Operadora"
                  col="operadora"
                  sortCol={sortCamp.col}
                  sortDir={sortCamp.dir}
                  thStyle={th}
                  align="left"
                  onSort={(c) =>
                    setSortCamp((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<CampSortCol>
                  label="Status"
                  col="classificacao"
                  sortCol={sortCamp.col}
                  sortDir={sortCamp.dir}
                  thStyle={th}
                  align="left"
                  onSort={(col) =>
                    setSortCamp((s) => ({
                      col,
                      dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<CampSortCol>
                  label="Criada em"
                  col="criada"
                  sortCol={sortCamp.col}
                  sortDir={sortCamp.dir}
                  thStyle={th}
                  align="left"
                  onSort={(c) =>
                    setSortCamp((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                {perm.canEditarOk && <th scope="col" style={th}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {campanhasOrdenadas.map((c, idx) => {
                const zebra = idx % 2 === 1 ? (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)") : "transparent";
                return (
                <tr
                  key={c.id}
                  style={{ background: zebra }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = zebra;
                  }}
                >
                  <td style={{ ...td, fontWeight: 600 }}>{c.nome}</td>
                  <td style={td}>
                    {operadoras.find((o) => o.slug === c.operadora_slug)?.nome ?? c.operadora_slug ?? "—"}
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        background: c.ativo ? "#05966922" : "#6b728022",
                        color: c.ativo ? "#059669" : "#6b7280",
                        border: `1px solid ${c.ativo ? "#05966944" : "#6b728044"}`,
                        borderRadius: 6,
                        padding: "3px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: FONT.body,
                      }}
                    >
                      {c.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td style={{ ...td, color: t.textMuted, fontSize: 12 }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  {perm.canEditarOk && (
                    <td style={td}>
                      <button
                        onClick={() => {
                          setEditando(c);
                          setModalOpen(true);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: "transparent",
                          border: `1px solid ${t.cardBorder}`,
                          borderRadius: 10,
                          padding: "6px 14px",
                          cursor: "pointer",
                          fontFamily: FONT.body,
                          fontSize: 12,
                          color: t.text,
                          fontWeight: 600,
                        }}
                      >
                        <Pencil size={13} /> Editar
                      </button>
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <ModalCampanha
          t={t}
          brand={brand}
          editando={editando}
          operadoras={operadoras}
          onClose={() => setModalOpen(false)}
          onSalvo={carregar}
        />
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  t: ReturnType<typeof useApp>["theme"];
  brand: ReturnType<typeof useDashboardBrand>;
  editando: Campanha | null;
  operadoras: { slug: string; nome: string }[];
  onClose: () => void;
  onSalvo: () => void;
}

function ModalCampanha({ t, brand, editando, operadoras, onClose, onSalvo }: ModalProps) {
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [operadoraSlug, setOperadoraSlug] = useState(editando?.operadora_slug ?? "");
  const [ativo, setAtivo] = useState(editando?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const nomeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => nomeInputRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, []);

  const salvar = async () => {
    setErro("");
    if (!nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        nome: nome.trim(),
        operadora_slug: operadoraSlug || null,
        ativo,
        updated_at: new Date().toISOString(),
      };
      if (editando) {
        const { error } = await supabase
          .from("campanhas")
          .update(payload)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("campanhas").insert(payload);
        if (error) throw error;
      }
      onSalvo();
      onClose();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: t.inputBg ?? t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 10,
    padding: "10px 14px",
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: FONT.body,
    fontSize: 11,
    fontWeight: 700,
    color: t.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "1px",
  };
  const fieldStyle: React.CSSProperties = { marginBottom: 18 };

  return (
    <ModalBase onClose={() => { if (!salvando) onClose(); }} maxWidth={460}>
      <ModalHeader
        title={editando ? "Editar campanha" : "Nova campanha"}
        onClose={() => { if (!salvando) onClose(); }}
      />

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Nome
            <CampoObrigatorioMark />
          </label>
          <input
            ref={nomeInputRef}
            style={inputStyle}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Black Friday, Lançamento Produto X"
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Operadora (opcional)</label>
          <select
            value={operadoraSlug}
            onChange={(e) => setOperadoraSlug(e.target.value)}
            style={{
              ...inputStyle,
              cursor: "pointer",
            }}
          >
            <option value="">Todas / Nenhuma</option>
            {[...operadoras].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((op) => (
              <option key={op.slug} value={op.slug}>
                {op.nome}
              </option>
            ))}
          </select>
        </div>

        {editando && (
          <div style={{ ...fieldStyle, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label style={{ ...labelStyle, margin: 0 }}>Status</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { val: true as const, label: "Ativa", cor: "#059669" },
                { val: false as const, label: "Inativa", cor: BRAND.cinza },
              ].map(({ val, label, cor }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={ativo === val}
                  onClick={() => setAtivo(val)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 10,
                    fontWeight: 600,
                    fontFamily: FONT.body,
                    fontSize: 13,
                    cursor: "pointer",
                    border: `1px solid ${ativo === val ? cor : t.cardBorder}`,
                    background: ativo === val ? `${cor}22` : "transparent",
                    color: ativo === val ? cor : t.textMuted,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {!ativo && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: BRAND.roxoVivo,
                  fontFamily: FONT.body,
                }}
              >
                <AlertCircle size={13} /> UTMs mapeados permanecem vinculados
              </div>
            )}
          </div>
        )}

        {erro && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: `${BRAND.vermelho}18`,
              border: `1px solid ${BRAND.vermelho}44`,
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              color: BRAND.vermelho,
              marginBottom: 16,
              fontFamily: FONT.body,
            }}
          >
            <AlertCircle size={14} /> {erro}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button
            onClick={() => {
              if (!salvando) onClose();
            }}
            style={{
              background: "transparent",
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 10,
              padding: "9px 18px",
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              color: t.text,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            style={{
              background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "9px 20px",
              cursor: salvando ? "not-allowed" : "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
              opacity: salvando ? 0.7 : 1,
            }}
          >
            {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar campanha"}
          </button>
        </div>
    </ModalBase>
  );
}
