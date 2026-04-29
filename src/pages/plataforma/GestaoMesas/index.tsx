import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT, FONT_TITLE } from "../../../constants/theme";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
import { Pencil, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { GiRoundTable } from "react-icons/gi";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import { ModalBase, ModalHeader, ModalConfirmDelete } from "../../../components/OperacoesModal";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";

const TIPOS_JOGO = ["Blackjack", "Roleta", "Baccarat", "Poker", "Game Show", "Outro"] as const;

type MesaSpinCadastroRow = {
  id: string;
  operadora_slug: string;
  nome_mesa: string;
  tipo_jogo: string;
  numero_mesa: string | null;
  mesa_identificacao: string;
  created_at: string;
  updated_at: string;
  /** PostgREST pode devolver objeto ou array de 1 elemento conforme hint da FK. */
  operadoras: { nome: string } | { nome: string }[] | null;
};

function nomeOperadoraJoin(row: MesaSpinCadastroRow): string | undefined {
  const o = row.operadoras;
  if (o == null) return undefined;
  if (Array.isArray(o)) return o[0]?.nome;
  return o.nome;
}

export default function GestaoMesas() {
  const { theme: t, user } = useApp();
  const dashBrand = useDashboardBrand();
  const perm = usePermission("gestao_mesas");
  const [rows, setRows] = useState<MesaSpinCadastroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<MesaSpinCadastroRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MesaSpinCadastroRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  type MesaSortCol = "operadora" | "nome" | "tipo" | "numero" | "ident";
  const [sortMesa, setSortMesa] = useState<{ col: MesaSortCol; dir: SortDir }>({ col: "tipo", dir: "asc" });

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mesas_spin_cadastro")
      .select("id, operadora_slug, nome_mesa, tipo_jogo, numero_mesa, mesa_identificacao, created_at, updated_at, operadoras(nome)")
      .order("operadora_slug", { ascending: true })
      .order("nome_mesa", { ascending: true });
    if (error) {
      setRows([]);
    } else {
      setRows((data ?? []) as unknown as MesaSpinCadastroRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const operadorasOpcoes = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      const nome = nomeOperadoraJoin(r) ?? r.operadora_slug;
      m.set(r.operadora_slug, nome);
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [rows]);

  const rowsFiltradas = useMemo(() => {
    let out = rows;
    if (filtroOperadora !== "todas") out = out.filter((r) => r.operadora_slug === filtroOperadora);
    return out;
  }, [rows, filtroOperadora]);

  const rowsOrdenadas = useMemo(() => {
    const arr = [...rowsFiltradas];
    const { col, dir } = sortMesa;
    const nomeOp = (r: MesaSpinCadastroRow) => (nomeOperadoraJoin(r) ?? r.operadora_slug ?? "").toLowerCase();
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "operadora":
          c = compareLocaleTexto(nomeOp(a), nomeOp(b), dir);
          break;
        case "nome":
          c = compareLocaleTexto((a.nome_mesa ?? "").trim(), (b.nome_mesa ?? "").trim(), dir);
          break;
        case "tipo":
          c = compareLocaleTexto((a.tipo_jogo ?? "").trim(), (b.tipo_jogo ?? "").trim(), dir);
          break;
        case "numero":
          c = compareLocaleTexto((a.numero_mesa ?? "").trim(), (b.numero_mesa ?? "").trim(), dir);
          break;
        case "ident":
          c = compareLocaleTexto((a.mesa_identificacao ?? "").trim(), (b.mesa_identificacao ?? "").trim(), dir);
          break;
        default:
          c = 0;
      }
      if (c !== 0) return c;
      return compareLocaleTexto((a.nome_mesa ?? "").trim(), (b.nome_mesa ?? "").trim(), "asc");
    });
    return arr;
  }, [rowsFiltradas, sortMesa]);

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ fontFamily: FONT.body, color: t.textMuted, textAlign: "center", padding: 24 }}>
        Você não tem permissão para visualizar a Gestão de Mesas.
      </div>
    );
  }

  const card: React.CSSProperties = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)",
  };

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 24 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: dashBrand.primaryIconBg,
            border: dashBrand.primaryIconBorder,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: dashBrand.primaryIconColor,
            flexShrink: 0,
            marginTop: 3,
          }}
        >
          <GiRoundTable size={14} aria-hidden />
        </span>
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: dashBrand.primary,
              fontFamily: FONT_TITLE,
              margin: 0,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            Gestão de Mesas
          </h1>
          <p style={{ color: t.textMuted, marginTop: 5, fontFamily: FONT.body, fontSize: 13, margin: "5px 0 0", maxWidth: 560, lineHeight: 1.45 }}>
            Cadastro de mesas por operadora.
          </p>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: t.textMuted }}>
            <span style={{ fontWeight: 600 }}>Filtrar por operadora</span>
            <select
              aria-label="Filtrar por operadora"
              value={filtroOperadora}
              onChange={(e) => setFiltroOperadora(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                color: t.text,
                fontFamily: FONT.body,
                fontSize: 13,
                minWidth: 200,
              }}
            >
              <option value="todas">Todas</option>
              {operadorasOpcoes.map(([slug, nome]) => (
                <option key={slug} value={slug}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
          {perm.canCriarOk && (
            <button
              type="button"
              onClick={() => {
                setEditando(null);
                setModalOpen(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: dashBrand.useBrand
                  ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
                  : "linear-gradient(135deg, #4a2082, #1e36f8)",
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
              <Plus size={16} strokeWidth={2} aria-hidden />
              Nova mesa
            </button>
          )}
        </div>
      </div>

      <div style={card}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <Loader2 size={20} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            <span>Carregando…</span>
          </div>
        ) : rowsFiltradas.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            {rows.length === 0
              ? "Nenhuma mesa cadastrada."
              : filtroOperadora !== "todas"
                ? "Nenhuma mesa para o filtro selecionado."
                : "Nenhuma mesa cadastrada."}
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
              }}
            >
              <caption style={{ display: "none" }}>Cadastro de mesas por operadora</caption>
              <thead>
                <tr>
                  <SortTableTh<MesaSortCol>
                    label="Operadora"
                    col="operadora"
                    sortCol={sortMesa.col}
                    sortDir={sortMesa.dir}
                    thStyle={getThStyle(t)}
                    align="left"
                    onSort={(c) =>
                      setSortMesa((s) => ({
                        col: c,
                        dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                  <SortTableTh<MesaSortCol>
                    label="Nome da mesa"
                    col="nome"
                    sortCol={sortMesa.col}
                    sortDir={sortMesa.dir}
                    thStyle={getThStyle(t)}
                    align="left"
                    onSort={(c) =>
                      setSortMesa((s) => ({
                        col: c,
                        dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                  <SortTableTh<MesaSortCol>
                    label="Jogo"
                    col="tipo"
                    sortCol={sortMesa.col}
                    sortDir={sortMesa.dir}
                    thStyle={getThStyle(t)}
                    align="left"
                    onSort={(col) =>
                      setSortMesa((s) => ({
                        col,
                        dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                  <SortTableTh<MesaSortCol>
                    label="Nº mesa"
                    col="numero"
                    sortCol={sortMesa.col}
                    sortDir={sortMesa.dir}
                    thStyle={getThStyle(t, { textAlign: "right" })}
                    align="right"
                    onSort={(c) =>
                      setSortMesa((s) => ({
                        col: c,
                        dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                  <SortTableTh<MesaSortCol>
                    label="Identificação"
                    col="ident"
                    sortCol={sortMesa.col}
                    sortDir={sortMesa.dir}
                    thStyle={getThStyle(t)}
                    align="left"
                    onSort={(c) =>
                      setSortMesa((s) => ({
                        col: c,
                        dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  />
                  {(perm.canEditarOk || perm.canExcluirOk) && (
                    <th scope="col" style={getThStyle(t, { textAlign: "right" })}>
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rowsOrdenadas.map((r, i) => (
                  <tr key={r.id} style={{ background: zebraStripe(i) }}>
                    <td style={getTdStyle(t)} title={r.operadora_slug}>
                      {nomeOperadoraJoin(r) ?? r.operadora_slug}
                    </td>
                    <td style={{ ...getTdStyle(t), fontWeight: 600 }}>{r.nome_mesa}</td>
                    <td style={getTdStyle(t)}>{r.tipo_jogo}</td>
                    <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {r.numero_mesa?.trim() ? r.numero_mesa : "—"}
                    </td>
                    <td style={{ ...getTdStyle(t), maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }} title={r.mesa_identificacao}>
                      {r.mesa_identificacao}
                    </td>
                    {(perm.canEditarOk || perm.canExcluirOk) && (
                      <td style={{ ...getTdStyle(t), textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {perm.canEditarOk && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditando(r);
                                setModalOpen(true);
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                background: "transparent",
                                border: `1px solid ${t.cardBorder}`,
                                borderRadius: 10,
                                padding: "6px 12px",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 600,
                                color: t.text,
                                fontFamily: FONT.body,
                              }}
                            >
                              <Pencil size={13} aria-hidden />
                              Editar
                            </button>
                          )}
                          {perm.canExcluirOk && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(r);
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                background: "transparent",
                                border: `1px solid rgba(232,64,37,0.35)`,
                                borderRadius: 10,
                                padding: "6px 12px",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#e84025",
                                fontFamily: FONT.body,
                              }}
                            >
                              <Trash2 size={13} aria-hidden />
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <ModalMesa
          key={editando?.id ?? "nova"}
          t={t}
          dashBrand={dashBrand}
          editando={editando}
          userRole={user?.role ?? null}
          onClose={() => setModalOpen(false)}
          onSalvo={() => {
            void carregar();
          }}
        />
      )}

      {deleteTarget && (
        <ModalConfirmDelete
          zIndex={1100}
          texto={`Remover a mesa «${deleteTarget.nome_mesa}» (${deleteTarget.mesa_identificacao})? Esta ação não pode ser desfeita.`}
          onCancel={() => {
            if (!deleteLoading) setDeleteTarget(null);
          }}
          onConfirm={async () => {
            setDeleteError(null);
            setDeleteLoading(true);
            const { error } = await supabase.from("mesas_spin_cadastro").delete().eq("id", deleteTarget.id);
            setDeleteLoading(false);
            if (error) {
              setDeleteError(error.message || "Não foi possível excluir.");
              return;
            }
            setDeleteTarget(null);
            void carregar();
          }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}
    </div>
  );
}

function tipoJogoInitial(edit: MesaSpinCadastroRow | null): { preset: string; outro: string } {
  if (!edit?.tipo_jogo) return { preset: "Blackjack", outro: "" };
  const tj = edit.tipo_jogo.trim();
  if ((TIPOS_JOGO as readonly string[]).includes(tj)) return { preset: tj, outro: "" };
  return { preset: "Outro", outro: tj };
}

function ModalMesa({
  t,
  dashBrand,
  editando,
  userRole,
  onClose,
  onSalvo,
}: {
  t: ReturnType<typeof useApp>["theme"];
  dashBrand: ReturnType<typeof useDashboardBrand>;
  editando: MesaSpinCadastroRow | null;
  userRole: string | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const baseId = useId();
  const ini = tipoJogoInitial(editando);
  const [operadoras, setOperadoras] = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraSlug, setOperadoraSlug] = useState(editando?.operadora_slug ?? "");
  const [nomeMesa, setNomeMesa] = useState(editando?.nome_mesa ?? "");
  const [tipoJogo, setTipoJogo] = useState(ini.preset);
  const [tipoJogoOutro, setTipoJogoOutro] = useState(ini.outro);
  const [numeroMesa, setNumeroMesa] = useState(editando?.numero_mesa ?? "");
  const [mesaIdentificacao, setMesaIdentificacao] = useState(editando?.mesa_identificacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("operadoras")
      .select("slug, nome")
      .order("nome")
      .then(({ data }) => {
        if (!cancelled) setOperadoras(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tipoJogoEfetivo = tipoJogo === "Outro" ? tipoJogoOutro.trim() : tipoJogo;

  const salvar = async () => {
    setErro(null);
    if (!operadoraSlug.trim()) {
      setErro("Selecione a operadora.");
      return;
    }
    if (!nomeMesa.trim()) {
      setErro("Informe o nome da mesa.");
      return;
    }
    if (!tipoJogoEfetivo) {
      setErro("Informe o tipo de jogo.");
      return;
    }
    if (!numeroMesa.trim()) {
      setErro("Informe o número da mesa.");
      return;
    }
    if (!mesaIdentificacao.trim()) {
      setErro("Informe a identificação da mesa (Table ID).");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        operadora_slug: operadoraSlug.trim(),
        nome_mesa: nomeMesa.trim(),
        tipo_jogo: tipoJogoEfetivo,
        numero_mesa: numeroMesa.trim(),
        mesa_identificacao: mesaIdentificacao.trim(),
      };
      if (editando) {
        const { error } = await supabase.from("mesas_spin_cadastro").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mesas_spin_cadastro").insert(payload);
        if (error) throw error;
      }
      onSalvo();
      onClose();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Erro ao salvar.";
      setErro(msg.includes("duplicate") || msg.includes("ux_mesas") ? "Já existe uma mesa com esta identificação para a operadora." : msg);
    } finally {
      setSalvando(false);
    }
  };

  const tryClose = () => {
    if (!salvando) onClose();
  };

  const desabilitaOperadora = Boolean(editando) && userRole !== "admin" && userRole !== "gestor";

  return (
    <ModalBase maxWidth={480} onClose={tryClose}>
      <ModalHeader title={editando ? "Editar mesa" : "Nova mesa"} onClose={tryClose} />
      {erro && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 12,
            background: "rgba(232,64,37,0.12)",
            border: "1px solid rgba(232,64,37,0.35)",
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} color="#e84025" aria-hidden />
          {erro}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label htmlFor={`${baseId}-op`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Operadora
            <CampoObrigatorioMark />
          </label>
          <select
            id={`${baseId}-op`}
            aria-label="Operadora (obrigatório)"
            value={operadoraSlug}
            disabled={desabilitaOperadora}
            onChange={(e) => setOperadoraSlug(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: desabilitaOperadora ? t.cardBg : t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          >
            <option value="">Selecione…</option>
            {operadoras.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${baseId}-nome`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Nome da mesa
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-nome`}
            type="text"
            value={nomeMesa}
            onChange={(e) => setNomeMesa(e.target.value)}
            placeholder="Ex.: Blackjack VIP"
            aria-label="Nome da mesa (obrigatório)"
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          />
        </div>
        <div>
          <label htmlFor={`${baseId}-tipo`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Tipo de jogo
            <CampoObrigatorioMark />
          </label>
          <select
            id={`${baseId}-tipo`}
            aria-label="Tipo de jogo (obrigatório)"
            value={(TIPOS_JOGO as readonly string[]).includes(tipoJogo) ? tipoJogo : "Outro"}
            onChange={(e) => setTipoJogo(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          >
            {TIPOS_JOGO.map((tj) => (
              <option key={tj} value={tj}>
                {tj}
              </option>
            ))}
          </select>
          {tipoJogo === "Outro" && (
            <>
              <label htmlFor={`${baseId}-tipo-outro`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginTop: 10, marginBottom: 6 }}>
                Especificar tipo
                <CampoObrigatorioMark />
              </label>
              <input
                id={`${baseId}-tipo-outro`}
                type="text"
                value={tipoJogoOutro}
                onChange={(e) => {
                  setTipoJogoOutro(e.target.value);
                }}
                placeholder="Descreva o tipo de jogo"
                aria-label="Especificar tipo de jogo (obrigatório)"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontFamily: FONT.body,
                  fontSize: 13,
                }}
              />
            </>
          )}
        </div>
        <div>
          <label htmlFor={`${baseId}-num`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Número da mesa
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-num`}
            type="text"
            value={numeroMesa}
            onChange={(e) => setNumeroMesa(e.target.value)}
            placeholder="Ex.: 01"
            aria-label="Número da mesa (obrigatório)"
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          />
        </div>
        <div>
          <label htmlFor={`${baseId}-id`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Identificação da mesa (Table ID)
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-id`}
            type="text"
            value={mesaIdentificacao}
            onChange={(e) => setMesaIdentificacao(e.target.value)}
            disabled={Boolean(editando)}
            placeholder="Identificador único no fornecedor"
            aria-label="Identificação da mesa Table ID (obrigatório)"
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: editando ? t.cardBg : t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          />
          {editando && (
            <p style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.4 }}>
              A identificação não pode ser alterada. Exclua e crie novamente se o ID estiver incorreto.
            </p>
          )}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <button
          type="button"
          onClick={tryClose}
          disabled={salvando}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: "transparent",
            color: t.text,
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 600,
            cursor: salvando ? "not-allowed" : "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={salvando}
          style={{
            padding: "9px 20px",
            borderRadius: 10,
            border: "none",
            background: dashBrand.useBrand
              ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
              : "linear-gradient(135deg, #4a2082, #1e36f8)",
            color: "#fff",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 700,
            cursor: salvando ? "not-allowed" : "pointer",
            opacity: salvando ? 0.85 : 1,
          }}
        >
          {salvando ? "Salvando…" : editando ? "Salvar" : "Cadastrar"}
        </button>
      </div>
    </ModalBase>
  );
}
