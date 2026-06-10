import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { BRAND_SEMANTIC as BRAND, FONT, FONT_TITLE } from "../../../constants/theme";
import { Operadora } from "../../../types";
import { Pencil, Loader2 } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { ModalConfirmExcluirPadrao } from "../../../components/OperacoesModal";
import { BtnExcluirLinha } from "../../../components/BtnExcluirLinha";
import { descricaoBotaoExcluir, descricaoModalExcluirItem } from "../../../lib/excluirItemUi";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import { compareAtivoBoolean, compareLocaleTexto } from "../../../lib/classificacaoSort";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { GestaoUsuariosLoading } from "../GestaoUsuarios/gestaoUsuariosUi";
import { getPageContentBoxStyle, getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles";

const MSG_SEM_PERMISSAO = "Você não tem permissão para visualizar esta página.";
const ERRO_EXCLUIR_OPERADORA =
  "Não foi possível excluir a operadora. Verifique vínculos ou tente desativar em vez de excluir.";

import { tableRowHoverBg } from "./gestaoOperadorasUi";
import { ModalOperadora } from "./ModalOperadora";

export default function GestaoOperadoras() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
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
  const [buscaOperadora, setBuscaOperadora] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("operadoras").select("*").order("nome");
    setOperadoras(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const operadorasFiltradas = useMemo(() => {
    const q = buscaOperadora.trim().toLowerCase();
    if (!q) return operadoras;
    return operadoras.filter((o) => (o.nome ?? "").toLowerCase().includes(q));
  }, [operadoras, buscaOperadora]);

  const operadorasOrdenadas = useMemo(() => {
    const arr = [...operadorasFiltradas];
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
  }, [operadorasFiltradas, sortOp]);
  const ativas = operadoras.filter((o) => o.ativo).length;
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

      <PageHeader
        icon={<PageMenuIcon pageKey="gestao_operadoras" />}
        title={getPageMenuLabel("gestao_operadoras")}
        subtitle="Gerencie operadoras parceiras, identidade visual e configurações de integração."
      />

      {/* ─── Cards de resumo ─────────────────────────────────────────────────── */}
      <div className="app-grid-kpi-3" style={getPageKpiSectionGapStyle()}>
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

      <div style={getPageContentBoxStyle(brand, t)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <SectionTitle compact>Operadoras</SectionTitle>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <BarraPesquisaPagina
              value={buscaOperadora}
              onChange={setBuscaOperadora}
              placeholder={PAGE_SEARCH.operadoraNome}
              aria-label="Buscar por nome de operadora"
              wrapperStyle={{ flex: "1 1 240px", minWidth: 200, maxWidth: 480 }}
            />
            {perm.canCriarOk ? (
              <CtaCriarButton
                type="button"
                onClick={() => {
                  setEditando(null);
                  setModalOpen(true);
                }}
                style={{ flexShrink: 0 }}
              >
                Nova Operadora
              </CtaCriarButton>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div
            style={{
              padding: "40px 0",
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
          <div style={{ padding: "48px 0", color: t.textMuted, fontFamily: FONT.body, textAlign: "center" }}>Nenhuma operadora cadastrada.</div>
        ) : operadorasOrdenadas.length === 0 ? (
          <div style={{ padding: "48px 0", color: t.textMuted, fontFamily: FONT.body, textAlign: "center" }}>Nenhuma operadora encontrada.</div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle()}>
            <caption style={{ display: "none" }}>Lista de operadoras cadastradas</caption>
            <thead>
              <tr>
                <SortTableTh<OpSortCol>
                  label="Slug"
                  col="slug"
                  sortCol={sortOp.col}
                  sortDir={sortOp.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
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
                  thStyle={dataTable.thHeader}
                  align="center"
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
                  thStyle={dataTable.thHeader}
                  align="center"
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
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={(c) =>
                    setSortOp((s) => ({
                      col: c,
                      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
                    }))
                  }
                />
                {mostrarColunaAcoes && (
                  <th scope="col" style={dataTable.thHeader}>
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {operadorasOrdenadas.map((op, idx) => {
                const zebra = dataTable.zebraRow(idx);
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
                  <td style={dataTable.tdCenter}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <code style={{
                        background: `${BRAND.roxoVivo}18`, borderRadius: 6,
                        padding: "3px 9px", fontSize: 12,
                        color: BRAND.roxoVivo, fontFamily: "monospace",
                        border: `1px solid ${BRAND.roxoVivo}33`,
                      }}>
                        {op.slug}
                      </code>
                    </div>
                  </td>
                  <td style={{ ...dataTable.tdCenter, fontWeight: 600 }}>{op.nome}</td>
                  <td style={dataTable.tdCenter}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <span style={{
                        background: op.ativo ? "#05966922" : "#6b728022",
                        color: op.ativo ? "#059669" : "#6b7280",
                        border: `1px solid ${op.ativo ? "#05966944" : "#6b728044"}`,
                        borderRadius: 6, padding: "3px 10px",
                        fontSize: 12, fontWeight: 600, fontFamily: FONT.body,
                      }}>
                        {op.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...dataTable.tdCenter, color: t.textMuted, fontSize: 12 }}>
                    {op.criado_em ? new Date(op.criado_em).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  {mostrarColunaAcoes && (
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "center" }}>
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
                          <BtnExcluirLinha
                            descricaoItem={descricaoBotaoExcluir("operadora", op.nome ?? op.slug)}
                            onClick={() => {
                              setErroExcluirOperadora(null);
                              setOperadoraParaExcluir(op);
                            }}
                          />
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
        <ModalConfirmExcluirPadrao
          descricaoItem={descricaoModalExcluirItem(
            "a operadora",
            operadoraParaExcluir.nome ?? operadoraParaExcluir.slug,
            `(${operadoraParaExcluir.slug})`,
          )}
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

