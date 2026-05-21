import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
import { Campanha } from "../../../types";
import { Pencil, AlertCircle, Trash2, Megaphone, Loader2 } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { BlocoLabel } from "../../../components/BlocoLabel";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader, ModalConfirmDelete } from "../../../components/OperacoesModal";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import { compareAtivoBoolean, compareLocaleTexto } from "../../../lib/classificacaoSort";

const COR = {
  vermelho: "#e84025",
  verde: "#22c55e",
  cinza: "#6b7280",
} as const;

function ctaGradient(useBrand: boolean): string {
  return useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, #4a2082, #1e36f8)";
}

const MSG_ERRO_SALVAR = "Não foi possível salvar a campanha. Se o problema persistir, contate o suporte.";
const MSG_ERRO_EXCLUIR = "Não foi possível excluir a campanha. Se o problema persistir, contate o suporte.";

export default function Campanhas() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("campanhas");
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [operadoras, setOperadoras] = useState<{ slug: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Campanha | null>(null);
  type CampSortCol = "nome" | "operadora" | "classificacao" | "criada";
  const [sortCamp, setSortCamp] = useState<{ col: CampSortCol; dir: SortDir }>({ col: "classificacao", dir: "desc" });
  const [campanhaParaExcluir, setCampanhaParaExcluir] = useState<Campanha | null>(null);
  const [excluindoCampanha, setExcluindoCampanha] = useState(false);
  const [erroExcluirCampanha, setErroExcluirCampanha] = useState<string | null>(null);

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

  const th = getThStyle(t);
  const td = getTdStyle(t);
  const mostrarColunaAcoes = perm.canEditarOk || perm.canExcluirOk;

  const confirmarExcluirCampanha = async () => {
    if (!campanhaParaExcluir?.id) return;
    setErroExcluirCampanha(null);
    setExcluindoCampanha(true);
    try {
      const { error: errAlias } = await supabase
        .from("utm_aliases")
        .update({ campanha_id: null })
        .eq("campanha_id", campanhaParaExcluir.id);
      if (errAlias) throw errAlias;
      const { error } = await supabase.from("campanhas").delete().eq("id", campanhaParaExcluir.id);
      if (error) throw error;
      setCampanhaParaExcluir(null);
      await carregar();
    } catch (e: unknown) {
      console.error("[Campanhas] Erro ao excluir:", e);
      setErroExcluirCampanha(MSG_ERRO_EXCLUIR);
    } finally {
      setExcluindoCampanha(false);
    }
  };

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<Megaphone size={14} aria-hidden />}
        title="Campanhas"
        subtitle="Cadastre campanhas de mídias sociais. UTMs mapeados na Gestão de Links alimentam o Dashboard de Mídias (funil e performance)."
      />

      <div className="app-grid-kpi-3" style={{ marginBottom: 24 }}>
        {[
          { label: "Total", valor: campanhas.length, cor: brand.accent },
          { label: "Ativas", valor: ativas, cor: "#059669" },
          { label: "Inativas", valor: campanhas.length - ativas, cor: COR.cinza },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              background: brand.blockBg,
              border: `1px solid ${t.cardBorder}`,
              borderTop: `3px solid ${c.cor}`,
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
              type="button"
              onClick={() => {
                setEditando(null);
                setModalOpen(true);
              }}
              style={{
                background: ctaGradient(brand.useBrand),
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "40px 20px",
              color: t.textMuted,
              fontFamily: FONT.body,
            }}
          >
            <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            Carregando campanhas...
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
          <div className="app-table-wrap">
            <div style={{ borderRadius: 14, border: `1px solid ${t.cardBorder}`, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <caption
                  style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: "hidden",
                    clip: "rect(0,0,0,0)",
                    whiteSpace: "nowrap",
                    border: 0,
                  }}
                >
                  Campanhas cadastradas
                </caption>
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
                    {mostrarColunaAcoes && <th scope="col" style={th}>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {campanhasOrdenadas.map((c, idx) => {
                    const zebraBg = zebraStripe(idx);
                    return (
                      <tr
                        key={c.id}
                        style={{ background: zebraBg }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = zebraBg;
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
                        {mostrarColunaAcoes && (
                          <td style={td}>
                            <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                              {perm.canEditarOk ? (
                                <button
                                  type="button"
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
                                  <Pencil size={13} aria-hidden /> Editar
                                </button>
                              ) : null}
                              {perm.canExcluirOk ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setErroExcluirCampanha(null);
                                    setCampanhaParaExcluir(c);
                                  }}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    background: "transparent",
                                    border: `1px solid ${COR.vermelho}66`,
                                    borderRadius: 10,
                                    padding: "6px 14px",
                                    cursor: "pointer",
                                    fontFamily: FONT.body,
                                    fontSize: 12,
                                    color: COR.vermelho,
                                    fontWeight: 600,
                                  }}
                                >
                                  <Trash2 size={13} aria-hidden /> Excluir
                                </button>
                              ) : null}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <ModalCampanha
          editando={editando}
          operadoras={operadoras}
          onClose={() => setModalOpen(false)}
          onSalvo={carregar}
        />
      )}

      {campanhaParaExcluir ? (
        <ModalConfirmDelete
          texto={`Excluir permanentemente a campanha «${campanhaParaExcluir.nome}»? Os vínculos desta campanha na Gestão de Links serão desfeitos.`}
          onCancel={() => {
            if (!excluindoCampanha) {
              setErroExcluirCampanha(null);
              setCampanhaParaExcluir(null);
            }
          }}
          onConfirm={() => {
            void confirmarExcluirCampanha();
          }}
          loading={excluindoCampanha}
          error={erroExcluirCampanha}
          zIndex={1001}
        />
      ) : null}
    </div>
  );
}

interface ModalCampanhaProps {
  editando: Campanha | null;
  operadoras: { slug: string; nome: string }[];
  onClose: () => void;
  onSalvo: () => void;
}

function ModalCampanha({ editando, operadoras, onClose, onSalvo }: ModalCampanhaProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
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
      console.error("[Campanhas] Erro ao salvar:", e);
      setErro(MSG_ERRO_SALVAR);
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
  const accentActive = brand.accent;

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
              { val: false as const, label: "Inativa", cor: COR.cinza },
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
                color: accentActive,
                fontFamily: FONT.body,
              }}
            >
              <AlertCircle size={13} aria-hidden /> UTMs mapeados permanecem vinculados
            </div>
          )}
        </div>
      )}

      {erro ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: `${COR.vermelho}18`,
            border: `1px solid ${COR.vermelho}44`,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            color: COR.vermelho,
            marginBottom: 16,
            fontFamily: FONT.body,
          }}
        >
          <AlertCircle size={14} aria-hidden /> {erro}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button
          type="button"
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
          type="button"
          onClick={() => void salvar()}
          disabled={salvando}
          style={{
            background: ctaGradient(brand.useBrand),
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
