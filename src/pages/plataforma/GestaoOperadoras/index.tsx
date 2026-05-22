import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { validarBrandguide } from "../../../lib/brandguideValidation";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BRAND_SEMANTIC as BRAND, FONT, FONT_TITLE } from "../../../constants/theme";
import { Operadora } from "../../../types";
import { Pencil, AlertCircle, Upload, Check, Trash2, Building2, Loader2 } from "lucide-react";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader, ModalConfirmDelete } from "../../../components/OperacoesModal";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import { compareAtivoBoolean, compareLocaleTexto } from "../../../lib/classificacaoSort";
import { getThStyle, getTdStyle, getTdNumStyle, zebraStripe } from "../../../lib/tableStyles";
import { GestaoUsuariosLoading, SalvarCtaContent } from "../GestaoUsuarios/gestaoUsuariosUi";
import {
  ctaGradientSalvar,
  handleGestaoTabsArrowKeyDown,
  tabAtivaPrincipalStyle,
} from "../GestaoUsuarios/gestaoUsuariosHelpers";

const MSG_SEM_PERMISSAO = "Você não tem permissão para visualizar esta página.";
const ERRO_EXCLUIR_OPERADORA =
  "Não foi possível excluir a operadora. Verifique vínculos ou tente desativar em vez de excluir.";
const ERRO_SALVAR_OPERADORA = "Não foi possível salvar. Verifique os dados e tente novamente.";
const ERRO_UPLOAD_LOGO = "Não foi possível enviar o logo.";
const ERRO_UPLOAD_FONTE = "Não foi possível enviar a fonte.";

function tableRowHoverBg(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function GestaoOperadoras() {
  const { theme: t } = useApp();
  const dashBrand = useDashboardBrand();
  const perm = usePermission("gestao_operadoras");
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Operadora | null>(null);
  type OpSortCol = "slug" | "nome" | "status" | "criada";
  const [sortOp, setSortOp] = useState<{ col: OpSortCol; dir: SortDir }>({ col: "status", dir: "asc" });
  const [operadoraParaExcluir, setOperadoraParaExcluir] = useState<Operadora | null>(null);
  const [excluindoOperadora, setExcluindoOperadora] = useState(false);
  const [erroExcluirOperadora, setErroExcluirOperadora] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("operadoras").select("*").order("nome");
    setOperadoras(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const operadorasOrdenadas = useMemo(() => {
    const arr = [...operadoras];
    const { col, dir } = sortOp;
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "slug":
          c = compareLocaleTexto(a.slug, b.slug, dir);
          break;
        case "nome":
          c = compareLocaleTexto(a.nome ?? "", b.nome ?? "", dir);
          break;
        case "status":
          c = compareAtivoBoolean(!!a.ativo, !!b.ativo, dir);
          break;
        case "criada":
          c = compareLocaleTexto(a.criado_em ?? "", b.criado_em ?? "", dir);
          break;
        default:
          c = 0;
      }
      if (c !== 0) return c;
      return compareLocaleTexto(a.nome ?? "", b.nome ?? "", "asc");
    });
    return arr;
  }, [operadoras, sortOp]);
  const ativas = operadoras.filter((o) => o.ativo).length;
  const contadorLabel = operadoras.length === 1 ? "1 operadora cadastrada" : `${operadoras.length} operadoras cadastradas`;
  const thStyle = getThStyle(t);
  const ctaNovaBg = dashBrand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`;

  if (perm.loading) {
    return (
      <div className="app-page-shell">
        <GestaoUsuariosLoading />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        {MSG_SEM_PERMISSAO}
      </div>
    );
  }

  const mostrarColunaAcoes = perm.canEditarOk || perm.canExcluirOk;

  const confirmarExcluirOperadora = async () => {
    if (!operadoraParaExcluir?.slug) return;
    setErroExcluirOperadora(null);
    setExcluindoOperadora(true);
    try {
      const { error } = await supabase.from("operadoras").delete().eq("slug", operadoraParaExcluir.slug);
      if (error) throw error;
      setOperadoraParaExcluir(null);
      await carregar();
    } catch (e: unknown) {
      const fk =
        e instanceof Error && /foreign key|violates|referência/i.test(e.message);
      if (fk) {
        setErroExcluirOperadora(
          "Não é possível excluir: existem registros vinculados a esta operadora (mesas, RH, figurinos, etc.). Remova ou altere esses vínculos antes, ou desative a operadora em Editar.",
        );
      } else {
        console.error(e);
        setErroExcluirOperadora(ERRO_EXCLUIR_OPERADORA);
      }
    } finally {
      setExcluindoOperadora(false);
    }
  };

  return (
    <div className="app-page-shell">

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24 }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: dashBrand.primaryIconBg,
          border: dashBrand.primaryIconBorder,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: dashBrand.primaryIconColor,
          flexShrink: 0, marginTop: 3,
        }}>
          <Building2 size={14} aria-hidden="true" />
        </span>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: dashBrand.primary, fontFamily: FONT_TITLE, margin: 0, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Gestão de Operadoras
          </h1>
          <p style={{ color: t.textMuted, marginTop: 5, fontFamily: FONT.body, fontSize: 13, margin: "5px 0 0" }}>
            Gerencie operadoras parceiras, identidade visual e configurações de integração.
          </p>
        </div>
      </div>

      {/* ─── Cards de resumo ─────────────────────────────────────────────────── */}
      <div className="app-grid-kpi-3" style={{ marginBottom: 24 }}>
        {[
          { label: "Total", valor: loading ? "—" : operadoras.length, cor: BRAND.roxoVivo },
          { label: "Ativas", valor: loading ? "—" : ativas, cor: "#059669" },
          { label: "Inativas", valor: loading ? "—" : operadoras.length - ativas, cor: BRAND.cinza },
        ].map((c) => (
          <div key={c.label} style={{
            background: t.cardBg, border: `1px solid ${t.cardBorder}`,
            borderLeft: `3px solid ${c.cor}`,
            borderRadius: 18, padding: "16px 20px",
            boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body, marginBottom: 6 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.cor, fontFamily: FONT_TITLE, lineHeight: 1 }}>
              {c.valor}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Tabela ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: t.cardBg, border: `1px solid ${t.cardBorder}`,
        borderRadius: 18,
        boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
        overflow: "hidden",
      }}>
        {/* Header da tabela */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 16px" }}>
          <span style={{ fontFamily: FONT.body, fontSize: 13, color: t.textMuted }}>{contadorLabel}</span>
          {perm.canCriarOk && (
            <button
              type="button"
              onClick={() => { setEditando(null); setModalOpen(true); }}
              style={{
                background: ctaNovaBg,
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
              + Nova Operadora
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
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Loader2 size={20} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden="true" />
            Carregando…
          </div>
        ) : operadoras.length === 0 ? (
          <div style={{ padding: "48px 20px", color: t.textMuted, fontFamily: FONT.body, textAlign: "center" }}>Nenhuma operadora cadastrada.</div>
        ) : (
          <div className="app-table-wrap">
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden" }}>
            <caption style={{ display: "none" }}>Lista de operadoras cadastradas</caption>
            <thead>
              <tr>
                <SortTableTh<OpSortCol>
                  label="Slug"
                  col="slug"
                  sortCol={sortOp.col}
                  sortDir={sortOp.dir}
                  thStyle={thStyle}
                  align="left"
                  onSort={(c) =>
                    setSortOp((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<OpSortCol>
                  label="Nome"
                  col="nome"
                  sortCol={sortOp.col}
                  sortDir={sortOp.dir}
                  thStyle={thStyle}
                  align="left"
                  onSort={(c) =>
                    setSortOp((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<OpSortCol>
                  label="Status"
                  col="status"
                  sortCol={sortOp.col}
                  sortDir={sortOp.dir}
                  thStyle={thStyle}
                  align="left"
                  onSort={(col) =>
                    setSortOp((s) => ({
                      col,
                      dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                <SortTableTh<OpSortCol>
                  label="Criada em"
                  col="criada"
                  sortCol={sortOp.col}
                  sortDir={sortOp.dir}
                  thStyle={thStyle}
                  align="left"
                  onSort={(c) =>
                    setSortOp((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                {mostrarColunaAcoes && (
                  <th scope="col" style={{ ...thStyle, textAlign: "right" }}>
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {operadorasOrdenadas.map((op, idx) => {
                const zebra = zebraStripe(idx);
                return (
                <tr
                  key={op.slug}
                  style={{ background: zebra }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = tableRowHoverBg(t.isDark);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = zebra;
                  }}
                >
                  <td style={getTdStyle(t)}>
                    <code style={{
                      background: `${BRAND.roxoVivo}18`, borderRadius: 6,
                      padding: "3px 9px", fontSize: 12,
                      color: BRAND.roxoVivo, fontFamily: "monospace",
                      border: `1px solid ${BRAND.roxoVivo}33`,
                    }}>
                      {op.slug}
                    </code>
                  </td>
                  <td style={{ ...getTdStyle(t), fontWeight: 600 }}>{op.nome}</td>
                  <td style={getTdStyle(t)}>
                    <span style={{
                      background: op.ativo ? "#05966922" : "#6b728022",
                      color: op.ativo ? "#059669" : "#6b7280",
                      border: `1px solid ${op.ativo ? "#05966944" : "#6b728044"}`,
                      borderRadius: 6, padding: "3px 10px",
                      fontSize: 12, fontWeight: 600, fontFamily: FONT.body,
                    }}>
                      {op.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td style={{ ...getTdStyle(t), color: t.textMuted, fontSize: 12 }}>
                    {op.criado_em ? new Date(op.criado_em).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  {mostrarColunaAcoes && (
                    <td style={{ ...getTdStyle(t), textAlign: "right" }}>
                      <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
                        {perm.canEditarOk ? (
                          <button
                            type="button"
                            aria-label={`Editar operadora ${op.nome ?? op.slug}`}
                            title={`Editar operadora ${op.nome ?? op.slug}`}
                            onClick={() => { setEditando(op); setModalOpen(true); }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 32,
                              height: 32,
                              background: "transparent",
                              border: `1px solid ${t.cardBorder}`,
                              borderRadius: 10,
                              cursor: "pointer",
                              color: t.text,
                            }}
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </button>
                        ) : null}
                        {perm.canExcluirOk ? (
                          <button
                            type="button"
                            aria-label={`Excluir operadora ${op.nome ?? op.slug}`}
                            title={`Excluir operadora ${op.nome ?? op.slug}`}
                            onClick={() => {
                              setErroExcluirOperadora(null);
                              setOperadoraParaExcluir(op);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 32,
                              height: 32,
                              background: "transparent",
                              border: `1px solid ${BRAND.vermelho}66`,
                              borderRadius: 10,
                              cursor: "pointer",
                              color: BRAND.vermelho,
                            }}
                          >
                            <Trash2 size={14} aria-hidden="true" />
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
        )}
      </div>

      {modalOpen && (
        <ModalOperadora
          key={editando?.slug ?? "nova"}
          editando={editando}
          onClose={() => setModalOpen(false)}
          onSalvo={carregar}
        />
      )}

      {operadoraParaExcluir ? (
        <ModalConfirmDelete
          texto={`Excluir permanentemente a operadora «${operadoraParaExcluir.nome ?? operadoraParaExcluir.slug}» (${operadoraParaExcluir.slug})? Só é possível se não houver dados vinculados no sistema.`}
          onCancel={() => {
            if (!excluindoOperadora) {
              setErroExcluirOperadora(null);
              setOperadoraParaExcluir(null);
            }
          }}
          onConfirm={() => {
            void confirmarExcluirOperadora();
          }}
          loading={excluindoOperadora}
          error={erroExcluirOperadora}
          zIndex={1001}
        />
      ) : null}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
type ModalTabId = "dados" | "brand" | "operacoes";

type MesaCadastroResumo = {
  tipo_jogo: string;
  nome_mesa: string;
  numero_mesa: string | null;
  mesa_identificacao: string;
  mesa_identificacao_operadora: string | null;
};

function timeDbToInput(v: string | null | undefined): string {
  if (!v || typeof v !== "string") return "";
  const m = v.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : v.slice(0, 5);
}

function normHex6(s: string): string | null {
  const x = s.trim();
  if (!x) return null;
  return /^#[0-9a-fA-F]{6}$/.test(x) ? x.toLowerCase() : null;
}

function ModalOperadora({
  editando,
  onClose,
  onSalvo,
}: {
  editando: Operadora | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t } = useApp();
  const dashBrand = useDashboardBrand();
  const nomeInputRef = useRef<HTMLInputElement>(null);
  const isNova = !editando;
  const [aba, setAba] = useState<ModalTabId>("dados");
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [slug, setSlug] = useState(editando?.slug ?? "");
  const [ativo, setAtivo] = useState(editando?.ativo ?? false);
  const [brandAction, setBrandAction] = useState(editando?.brand_action ?? "");
  const [brandContrast, setBrandContrast] = useState(editando?.brand_contrast ?? "");
  const [brandBg, setBrandBg] = useState(editando?.brand_bg ?? "");
  const [brandText, setBrandText] = useState(editando?.brand_text ?? "");
  const [brandAvisos, setBrandAvisos] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState(editando?.logo_url ?? "");
  const [fontUrl, setFontUrl] = useState(editando?.font_url ?? "");
  const [turnoManha, setTurnoManha] = useState(() => timeDbToInput(editando?.turno_manha_inicio));
  const [turnoTarde, setTurnoTarde] = useState(() => timeDbToInput(editando?.turno_tarde_inicio));
  const [turnoNoite, setTurnoNoite] = useState(() => timeDbToInput(editando?.turno_noite_inicio));
  const [mesas, setMesas] = useState<MesaCadastroResumo[]>([]);
  const [mesasLoading, setMesasLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFont, setUploadingFont] = useState(false);
  const [erro, setErro] = useState("");

  const brandObrigatorio = isNova || ativo;
  const storageSlug = (editando?.slug ?? slug).trim();

  useEffect(() => {
    const id = window.setTimeout(() => nomeInputRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!editando) {
      setSlug(
        nome
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
      );
    }
  }, [nome, editando]);

  useEffect(() => {
    if (!editando?.slug) {
      setMesas([]);
      return;
    }
    let cancelled = false;
    setMesasLoading(true);
    void supabase
      .from("mesas_spin_cadastro")
      .select("tipo_jogo, nome_mesa, numero_mesa, mesa_identificacao, mesa_identificacao_operadora")
      .eq("operadora_slug", editando.slug)
      .order("nome_mesa")
      .then(({ data, error }) => {
        if (cancelled) return;
        setMesasLoading(false);
        if (error || !data) setMesas([]);
        else setMesas(data as MesaCadastroResumo[]);
      });
    return () => {
      cancelled = true;
    };
  }, [editando?.slug]);

  const BUCKET = "operadoras-brand";

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storageSlug) {
      setErro("Informe o nome para gerar o identificador antes de enviar o logo.");
      e.target.value = "";
      return;
    }
    setUploadingLogo(true);
    setErro("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${storageSlug}/logo.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setLogoUrl(`${publicUrl}?v=${Date.now()}`);
    } catch (err) {
      console.error(err);
      setErro(ERRO_UPLOAD_LOGO);
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const FONT_MIME: Record<string, string> = {
    woff2: "font/woff2",
    woff: "font/woff",
    ttf: "font/ttf",
    otf: "font/otf",
  };

  const handleUploadFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storageSlug) {
      setErro("Informe o nome para gerar o identificador antes de enviar a fonte.");
      e.target.value = "";
      return;
    }
    setUploadingFont(true);
    setErro("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "woff2";
      const path = `${storageSlug}/font.${ext}`;
      const contentType = FONT_MIME[ext] ?? "font/woff2";
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setFontUrl(publicUrl);
    } catch (err) {
      console.error(err);
      setErro(ERRO_UPLOAD_FONTE);
    } finally {
      setUploadingFont(false);
      e.target.value = "";
    }
  };

  const salvar = async () => {
    setErro("");
    if (!nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }
    if (!slug.trim()) {
      setErro("Informe um nome para gerar o identificador interno.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(slug)) {
      setErro("Identificador inválido. Use apenas letras minúsculas, números e underscore.");
      return;
    }

    const logoTrim = logoUrl.trim();
    const fontTrim = fontUrl.trim();
    const tm = turnoManha.trim();
    const tt = turnoTarde.trim();
    const tn = turnoNoite.trim();

    setSalvando(true);
    try {
      if (isNova) {
        const ha = normHex6(brandAction);
        const hc = normHex6(brandContrast);
        const hb = normHex6(brandBg);
        const ht = normHex6(brandText);
        if (!ha || !hc || !hb || !ht) {
          setErro("Preencha as quatro cores do brandguide em formato #RRGGBB.");
          setSalvando(false);
          return;
        }
        if (!logoTrim) {
          setErro("Logo é obrigatório.");
          setSalvando(false);
          return;
        }
        const v = validarBrandguide({
          action: ha,
          contrast: hc,
          bg: hb,
          text: ht,
        });
        setBrandAvisos(v.warnings);
        const { data: existe } = await supabase.from("operadoras").select("slug").eq("slug", slug).maybeSingle();
        if (existe) {
          setErro("Este identificador já está em uso. Tente um nome diferente.");
          setSalvando(false);
          return;
        }
        const { error } = await supabase.from("operadoras").insert({
          slug,
          nome: nome.trim(),
          ativo: false,
          brand_action: v.action,
          brand_contrast: v.contrast,
          brand_bg: v.bg,
          brand_text: v.text,
          logo_url: logoTrim,
          font_url: fontTrim || null,
        });
        if (error) throw error;
      } else {
        if (ativo) {
          if (mesasLoading) {
            setErro("Aguarde a verificação das mesas cadastradas antes de salvar.");
            setSalvando(false);
            return;
          }
          if (mesas.length === 0) {
            setErro("Só é possível definir o status como Ativa quando existir pelo menos uma mesa registrada para esta operadora.");
            setSalvando(false);
            return;
          }
        }
        let brandPayload: Record<string, string | null>;
        if (ativo) {
          const ha = normHex6(brandAction);
          const hc = normHex6(brandContrast);
          const hb = normHex6(brandBg);
          const ht = normHex6(brandText);
          if (!ha || !hc || !hb || !ht) {
            setErro("Com status Ativa, todas as cores do brandguide são obrigatórias (#RRGGBB).");
            setSalvando(false);
            return;
          }
          if (!logoTrim) {
            setErro("Com status Ativa, o logo é obrigatório.");
            setSalvando(false);
            return;
          }
          if (!tm || !tt || !tn) {
            setErro("Com status Ativa, informe o horário de início dos três turnos.");
            setSalvando(false);
            return;
          }
          const v = validarBrandguide({
            action: ha,
            contrast: hc,
            bg: hb,
            text: ht,
          });
          setBrandAvisos(v.warnings);
          brandPayload = {
            brand_action: v.action,
            brand_contrast: v.contrast,
            brand_bg: v.bg,
            brand_text: v.text,
            logo_url: logoTrim,
            font_url: fontTrim || null,
          };
        } else {
          setBrandAvisos([]);
          const nullable = (s: string) => {
            const x = s.trim();
            if (!x) return null;
            const h = normHex6(x);
            return h === null ? "bad" : h;
          };
          const a = nullable(brandAction);
          const c = nullable(brandContrast);
          const b = nullable(brandBg);
          const tx = nullable(brandText);
          if (a === "bad" || c === "bad" || b === "bad" || tx === "bad") {
            setErro("Use #RRGGBB para as cores preenchidas ou deixe em branco com operadora inativa.");
            setSalvando(false);
            return;
          }
          brandPayload = {
            brand_action: a,
            brand_contrast: c,
            brand_bg: b,
            brand_text: tx,
            logo_url: logoTrim || null,
            font_url: fontTrim || null,
          };
        }

        const turnoPayload =
          ativo
            ? { turno_manha_inicio: tm, turno_tarde_inicio: tt, turno_noite_inicio: tn }
            : {
                turno_manha_inicio: tm || null,
                turno_tarde_inicio: tt || null,
                turno_noite_inicio: tn || null,
              };

        const { error } = await supabase
          .from("operadoras")
          .update({ nome: nome.trim(), ativo, ...brandPayload, ...turnoPayload })
          .eq("slug", editando.slug);
        if (error) throw error;
      }
      onSalvo();
      onClose();
    } catch (e: unknown) {
      console.error(e);
      setErro(ERRO_SALVAR_OPERADORA);
    } finally {
      setSalvando(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: t.inputBg ?? t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 10, padding: "10px 14px", color: t.text,
    fontFamily: FONT.body, fontSize: 14, boxSizing: "border-box",
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: FONT.body, fontSize: 11,
    fontWeight: 700, color: t.textMuted, marginBottom: 6,
    textTransform: "uppercase", letterSpacing: "1px",
  };
  const fieldStyle: React.CSSProperties = { marginBottom: 18 };
  const tryClose = () => { if (!salvando) onClose(); };

  const tabs = useMemo(
    (): { id: ModalTabId; label: string }[] =>
      isNova
        ? [
            { id: "dados", label: "Dados cadastrais" },
            { id: "brand", label: "Brandguide" },
          ]
        : [
            { id: "dados", label: "Dados cadastrais" },
            { id: "brand", label: "Brandguide" },
            { id: "operacoes", label: "Operações" },
          ],
    [isNova],
  );

  const tabIds = useMemo(() => tabs.map((x) => x.id), [tabs]);

  const tabBtn = (id: ModalTabId, label: string) => {
    const sel = aba === id;
    const tabStyle = tabAtivaPrincipalStyle(sel, t.cardBorder, t.inputBg ?? t.bg);
    return (
      <button
        key={id}
        type="button"
        role="tab"
        id={`tab-op-${id}`}
        tabIndex={sel ? 0 : -1}
        aria-selected={sel}
        aria-controls={`panel-op-${id}`}
        onClick={() => setAba(id)}
        onKeyDown={(e) => handleGestaoTabsArrowKeyDown(e, tabIds, id, setAba, "tab-op-")}
        style={{
          padding: "8px 14px",
          borderRadius: 10,
          border: tabStyle.border,
          background: tabStyle.background,
          color: sel ? tabStyle.color : t.textMuted,
          fontFamily: FONT.body,
          fontSize: 12,
          fontWeight: tabStyle.fontWeight,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };

  const slugInputStyle: React.CSSProperties = {
    ...inputStyle,
    opacity: 0.85,
    cursor: "not-allowed",
    fontFamily: "monospace",
    color: BRAND.roxoVivo,
    fontSize: 13,
  };

  const brandGrid = (
    <div style={{ ...fieldStyle, marginBottom: 0, padding: 16, background: t.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", borderRadius: 12, border: `1px solid ${t.cardBorder}`, maxHeight: 420, overflowY: "auto" }}>
      <div className="app-grid-2-tight">
        <div>
          <label style={{ ...labelStyle, fontSize: 10 }}>
            Cor de ação
            {brandObrigatorio ? <CampoObrigatorioMark /> : null}
          </label>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body, lineHeight: 1.35 }}>
            CTAs, títulos, item ativo no menu. Alto contraste sobre o fundo.
          </div>
          <input type="color" value={brandAction || "#7c3aed"} onChange={(e) => setBrandAction(e.target.value)}
            style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
          <input type="text" value={brandAction} onChange={(e) => setBrandAction(e.target.value)} placeholder="#7c3aed"
            style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: 10 }}>
            Cor de contraste
            {brandObrigatorio ? <CampoObrigatorioMark /> : null}
          </label>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body, lineHeight: 1.35 }}>
            Comparativos e destaque secundário — deve ser distinta da cor de ação.
          </div>
          <input type="color" value={brandContrast || "#1e36f8"} onChange={(e) => setBrandContrast(e.target.value)}
            style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
          <input type="text" value={brandContrast} onChange={(e) => setBrandContrast(e.target.value)} placeholder="#1e36f8"
            style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: 10 }}>
            Fundo
            {brandObrigatorio ? <CampoObrigatorioMark /> : null}
          </label>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body, lineHeight: 1.35 }}>
            Background da aplicação (modo operador escuro).
          </div>
          <input type="color" value={brandBg || "#0f0f1a"} onChange={(e) => setBrandBg(e.target.value)}
            style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
          <input type="text" value={brandBg} onChange={(e) => setBrandBg(e.target.value)} placeholder="#0f0f1a"
            style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: 10 }}>
            Texto
            {brandObrigatorio ? <CampoObrigatorioMark /> : null}
          </label>
          <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body, lineHeight: 1.35 }}>
            Texto principal e ícones estruturais (derivados de contraste no app).
          </div>
          <input type="color" value={brandText || "#ffffff"} onChange={(e) => setBrandText(e.target.value)}
            style={{ width: "100%", height: 36, border: `1px solid ${t.cardBorder}`, borderRadius: 8, cursor: "pointer" }} />
          <input type="text" value={brandText} onChange={(e) => setBrandText(e.target.value)} placeholder="#ffffff"
            style={{ ...inputStyle, marginTop: 6, fontSize: 12 }} />
        </div>
        {brandAvisos.length > 0 && (
          <div style={{ gridColumn: "1 / -1", fontSize: 11, color: BRAND.amarelo, fontFamily: FONT.body, lineHeight: 1.45, padding: "8px 10px", borderRadius: 8, border: `1px solid ${BRAND.amarelo}55`, background: `${BRAND.amarelo}14` }}>
            {brandAvisos.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ ...labelStyle, fontSize: 10 }}>
            Logo
            {brandObrigatorio ? <CampoObrigatorioMark /> : null}
          </label>
          <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="URL ou envie um arquivo"
            style={inputStyle} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
              background: t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: `1px solid ${t.cardBorder}`,
              borderRadius: 8, cursor: uploadingLogo ? "not-allowed" : "pointer",
              fontSize: 12, fontFamily: FONT.body, color: t.text,
            }}>
              <Upload size={14} aria-hidden="true" />
              {uploadingLogo ? "Enviando..." : "Enviar logo (PNG, JPG, SVG)"}
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden disabled={uploadingLogo} onChange={handleUploadLogo} />
            </label>
            {logoUrl ? (
              <a href={logoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: BRAND.roxoVivo }}>Ver</a>
            ) : null}
          </div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ ...labelStyle, fontSize: 10 }}>Fonte customizada</label>
          <input type="url" value={fontUrl} onChange={(e) => setFontUrl(e.target.value)} placeholder="URL ou envie .woff2, .woff, .ttf, .otf"
            style={inputStyle} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
              background: t.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: `1px solid ${t.cardBorder}`,
              borderRadius: 8, cursor: uploadingFont ? "not-allowed" : "pointer",
              fontSize: 12, fontFamily: FONT.body, color: t.text,
            }}>
              <Upload size={14} aria-hidden="true" />
              {uploadingFont ? "Enviando..." : "Enviar fonte (WOFF2, WOFF, TTF, OTF)"}
              <input type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" hidden disabled={uploadingFont} onChange={handleUploadFont} />
            </label>
            {fontUrl ? (
              <a href={fontUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: BRAND.roxoVivo }}>Ver</a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  const thM = getThStyle(t);
  const tdM = getTdStyle(t);
  const tdNum = getTdNumStyle(t);

  return (
    <ModalBase maxWidth={isNova ? 520 : 720} onClose={tryClose}>
      <ModalHeader
        title={editando ? "Editar Operadora" : "Nova Operadora"}
        onClose={tryClose}
      />

      <div role="tablist" aria-label="Seções do cadastro da operadora" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {tabs.map((x) => tabBtn(x.id, x.label))}
      </div>

      {aba === "dados" && (
        <div role="tabpanel" id="panel-op-dados" aria-labelledby="tab-op-dados" tabIndex={0}>
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
              placeholder="Ex: Blaze"
              aria-label="Nome da operadora"
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Identificador interno
              <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 6, fontSize: 10 }}>(não editável)</span>
            </label>
            <input
              style={slugInputStyle}
              value={slug}
              readOnly
              placeholder="Será gerado a partir do nome"
              aria-label="Identificador interno gerado automaticamente"
            />
          </div>

          {isNova ? (
            <div style={{ ...fieldStyle, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ ...labelStyle, margin: 0 }}>Status</span>
              <span
                style={{
                  border: `1px solid #6b728044`,
                  background: "#6b728022",
                  color: "#6b7280",
                  borderRadius: 10, padding: "6px 16px",
                  fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
                }}
              >
                Inativa
              </span>
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                Novas operadoras são criadas como inativas até as mesas desta operadora serem cadastradas.
              </span>
            </div>
          ) : (
            <div style={{ ...fieldStyle, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label style={{ ...labelStyle, margin: 0 }}>Status</label>
              <button
                type="button"
                aria-pressed={ativo}
                title={
                  !ativo && (mesasLoading || mesas.length === 0)
                    ? "Cadastre pelo menos uma mesa para esta operadora (Gestão de Mesas) antes de ativar."
                    : undefined
                }
                onClick={() => {
                  setErro("");
                  if (ativo) {
                    setAtivo(false);
                    return;
                  }
                  if (mesasLoading) {
                    setErro("Aguarde a verificação das mesas cadastradas.");
                    return;
                  }
                  if (mesas.length === 0) {
                    setErro("Só é possível ativar quando existir pelo menos uma mesa registrada para esta operadora.");
                    return;
                  }
                  setAtivo(true);
                }}
                style={{
                  border: `1px solid ${ativo ? "#05966966" : t.cardBorder}`,
                  background: ativo ? "#05966922" : "transparent",
                  color: ativo ? "#059669" : t.textMuted,
                  borderRadius: 10, padding: "6px 16px", cursor: "pointer",
                  fontFamily: FONT.body, fontSize: 13, fontWeight: 600,
                  display: "inline-flex", alignItems: "center", gap: 6,
                  opacity: !ativo && (mesasLoading || mesas.length === 0) ? 0.65 : 1,
                }}
              >
                {ativo && <Check size={13} aria-hidden="true" />}
                {ativo ? "Ativa" : "Inativa"}
              </button>
              {!ativo && mesas.length === 0 && !mesasLoading && (
                <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, maxWidth: 420, lineHeight: 1.45 }}>
                  Cadastre pelo menos uma mesa em Gestão de Mesas para poder marcar como Ativa.
                </span>
              )}
              {!ativo && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: BRAND.roxoVivo, fontFamily: FONT.body }}>
                  <AlertCircle size={13} aria-hidden="true" /> Vínculos existentes não são removidos
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {aba === "brand" && (
        <div role="tabpanel" id="panel-op-brand" aria-labelledby="tab-op-brand" tabIndex={0}>
          {brandGrid}
        </div>
      )}

      {!isNova && aba === "operacoes" && (
        <div role="tabpanel" id="panel-op-operacoes" aria-labelledby="tab-op-operacoes" tabIndex={0}>
          <div style={{ ...labelStyle, marginBottom: 10, textTransform: "none", letterSpacing: "0.04em", fontSize: 12, color: t.text }}>
            Horário de turno dos dealers
          </div>
          <div className="app-grid-2-tight" style={{ marginBottom: 24 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Turno da manhã — horário de início
                {ativo ? <CampoObrigatorioMark /> : null}
              </label>
              <input
                type="time"
                value={turnoManha}
                onChange={(e) => setTurnoManha(e.target.value)}
                style={inputStyle}
                aria-label="Horário de início do turno da manhã"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>
                Turno da tarde — horário de início
                {ativo ? <CampoObrigatorioMark /> : null}
              </label>
              <input
                type="time"
                value={turnoTarde}
                onChange={(e) => setTurnoTarde(e.target.value)}
                style={inputStyle}
                aria-label="Horário de início do turno da tarde"
              />
            </div>
            <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>
                Turno da noite — horário de início
                {ativo ? <CampoObrigatorioMark /> : null}
              </label>
              <input
                type="time"
                value={turnoNoite}
                onChange={(e) => setTurnoNoite(e.target.value)}
                style={inputStyle}
                aria-label="Horário de início do turno da noite"
              />
            </div>
          </div>

          <div style={{ ...labelStyle, marginBottom: 10, textTransform: "none", letterSpacing: "0.04em", fontSize: 12, color: t.text }}>
            Mesas em operação
          </div>
          {mesasLoading ? (
            <div style={{ padding: 20, color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>Carregando mesas...</div>
          ) : mesas.length === 0 ? (
            <div style={{ padding: "16px 0", color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
              Nenhuma mesa cadastrada para esta operadora.
            </div>
          ) : (
            <div className="app-table-wrap">
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden" }}>
                <caption style={{ display: "none" }}>
                  Mesas em operação cadastradas para esta operadora
                </caption>
                <thead>
                  <tr>
                    <th scope="col" style={{ ...thM, textAlign: "left" }}>Jogo</th>
                    <th scope="col" style={{ ...thM, textAlign: "left" }}>Nome da mesa</th>
                    <th scope="col" style={{ ...thM, textAlign: "right" }}>Nº mesa</th>
                    <th scope="col" style={{ ...thM, textAlign: "left" }}>ID Spin</th>
                    <th scope="col" style={{ ...thM, textAlign: "left" }}>ID operadora</th>
                  </tr>
                </thead>
                <tbody>
                  {mesas.map((m, i) => (
                    <tr key={`${m.mesa_identificacao}-${i}`} style={{ background: zebraStripe(i) }}>
                      <td style={{ ...tdM, textAlign: "left" }}>{m.tipo_jogo}</td>
                      <td style={{ ...tdM, textAlign: "left", fontWeight: 600 }}>{m.nome_mesa}</td>
                      <td style={{ ...tdNum }}>{m.numero_mesa ?? "—"}</td>
                      <td style={{ ...tdM, textAlign: "left", fontFamily: "monospace", fontSize: 12 }}>{m.mesa_identificacao}</td>
                      <td style={{ ...tdM, textAlign: "left", fontFamily: "monospace", fontSize: 12 }}>
                        {m.mesa_identificacao_operadora?.trim() ? m.mesa_identificacao_operadora : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {erro && (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, background: `${BRAND.vermelho}18`, border: `1px solid ${BRAND.vermelho}44`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: BRAND.vermelho, marginTop: 16, marginBottom: 8, fontFamily: FONT.body }}>
          <AlertCircle size={14} aria-hidden="true" /> {erro}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <button
          type="button"
          onClick={tryClose}
          style={{ background: "transparent", border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: "9px 18px", cursor: "pointer", fontFamily: FONT.body, fontSize: 13, color: t.text }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: ctaGradientSalvar(dashBrand, salvando, BRAND.cinza),
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "9px 20px",
            cursor: salvando ? "not-allowed" : "pointer",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 700,
            opacity: salvando ? 0.85 : 1,
          }}
        >
          <SalvarCtaContent
            salvando={salvando}
            label={editando ? "Salvar alterações" : "Criar operadora"}
          />
        </button>
      </div>
    </ModalBase>
  );
}
