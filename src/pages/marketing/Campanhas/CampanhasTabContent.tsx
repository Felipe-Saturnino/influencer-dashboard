import { useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { Campanha } from "../../../types";
import { Pencil, Loader2 } from "lucide-react";
import { ModalConfirmExcluirPadrao } from "../../../components/OperacoesModal";
import { BtnExcluirLinha } from "../../../components/BtnExcluirLinha";
import { descricaoModalExcluirItem, tooltipExcluir } from "../../../lib/excluirItemUi";
import { SectionTitle, SortTableTh, type SortDir } from "../../../components/dashboard";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { compareAtivoBoolean, compareLocaleTexto } from "../../../lib/classificacaoSort";
import { getPageContentBoxStyle, getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles";
import { useState } from "react";
import { ModalCampanha } from "./ModalCampanha";

const COR = {
  cinza: "#6b7280",
} as const;

const MSG_ERRO_EXCLUIR =
  "Não foi possível excluir a campanha. Se o problema persistir, entre em contato com o suporte.";

type CampSortCol = "nome" | "operadora" | "classificacao" | "criada";

interface CampanhasTabContentProps {
  campanhas: Campanha[];
  operadoras: { slug: string; nome: string }[];
  loading: boolean;
  onRecarregar: () => void | Promise<void>;
}

export function CampanhasTabContent({
  campanhas,
  operadoras,
  loading,
  onRecarregar,
}: CampanhasTabContentProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("campanhas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Campanha | null>(null);
  const [sortCamp, setSortCamp] = useState<{ col: CampSortCol; dir: SortDir }>({
    col: "classificacao",
    dir: "desc",
  });
  const [campanhaParaExcluir, setCampanhaParaExcluir] = useState<Campanha | null>(null);
  const [excluindoCampanha, setExcluindoCampanha] = useState(false);
  const [erroExcluirCampanha, setErroExcluirCampanha] = useState<string | null>(null);

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
  const dataTable = useDataTableBlock();
  const mostrarColunaAcoes = perm.canEditarOk || perm.canExcluirOk;
  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
  const contentBox = getPageContentBoxStyle(brand, t, { overflow: "hidden" });

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
      await onRecarregar();
    } catch (e: unknown) {
      console.error("[Campanhas] Erro ao excluir:", e);
      setErroExcluirCampanha(MSG_ERRO_EXCLUIR);
    } finally {
      setExcluindoCampanha(false);
    }
  };

  return (
    <>
      <div className="app-grid-kpi-3" style={{ ...getPageKpiSectionGapStyle(), width: "100%", gap: 14 }}>
        {[
          { label: "TOTAL", valor: campanhas.length, cor: "var(--brand-primary, #7c3aed)" },
          { label: "ATIVAS", valor: ativas, cor: "#22c55e" },
          { label: "INATIVAS", valor: campanhas.length - ativas, cor: COR.cinza },
        ].map((c) => (
          <div
            key={c.label}
            aria-label={`${c.label}: ${c.valor}`}
            style={{
              borderRadius: 14,
              border: `1px solid ${t.cardBorder}`,
              borderLeft: `3px solid ${c.cor}`,
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
              {c.label}
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: c.cor,
                fontFamily: FONT_TITLE,
                marginTop: 6,
              }}
            >
              {c.valor}
            </div>
          </div>
        ))}
      </div>

      <div style={contentBox}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SectionTitle compact>Campanhas cadastradas</SectionTitle>
          {perm.canCriarOk ? (
            <CtaCriarButton
              type="button"
              onClick={() => {
                setEditando(null);
                setModalOpen(true);
              }}
            >
              Nova Campanha
            </CtaCriarButton>
          ) : null}
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "40px 0",
              color: t.textMuted,
              fontFamily: FONT.body,
            }}
          >
            <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            Carregando…
          </div>
        ) : campanhas.length === 0 ? (
          <div
            style={{
              padding: "48px 0",
              color: t.textMuted,
              fontFamily: FONT.body,
              textAlign: "center",
            }}
          >
            Nenhuma campanha cadastrada. Crie campanhas e mapeie UTMs na Gestão de Links.
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle()}>
              <caption style={{ display: "none" }}>Campanhas cadastradas</caption>
              <thead>
                <tr>
                  <SortTableTh<CampSortCol>
                    label="Nome"
                    col="nome"
                    sortCol={sortCamp.col}
                    sortDir={sortCamp.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
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
                    thStyle={dataTable.thHeader}
                    align="center"
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
                    thStyle={dataTable.thHeader}
                    align="center"
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
                    thStyle={dataTable.thHeader}
                    align="center"
                    onSort={(c) =>
                      setSortCamp((s) => ({
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
                {campanhasOrdenadas.map((c, idx) => {
                  const zebraBg = dataTable.zebraRow(idx);
                  return (
                    <tr
                      key={c.id}
                      style={{ background: zebraBg }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = t.isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.02)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = zebraBg;
                      }}
                    >
                      <td style={{ ...dataTable.tdCenter, fontWeight: 600 }}>{c.nome}</td>
                      <td style={dataTable.tdCenter}>
                        {operadoras.find((o) => o.slug === c.operadora_slug)?.nome ??
                          c.operadora_slug ??
                          "—"}
                      </td>
                      <td style={dataTable.tdCenter}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
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
                      <td style={{ ...dataTable.tdCenter, color: t.textMuted, fontSize: 12 }}>
                        {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      {mostrarColunaAcoes && (
                        <td style={dataTable.tdCenter}>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
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
                              <BtnExcluirLinha
                                labelAcao={tooltipExcluir("campanha")}
                                onClick={() => {
                                  setErroExcluirCampanha(null);
                                  setCampanhaParaExcluir(c);
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
        <ModalCampanha
          editando={editando}
          operadoras={operadoras}
          onClose={() => setModalOpen(false)}
          onSalvo={() => {
            void onRecarregar();
          }}
        />
      )}

      {campanhaParaExcluir ? (
        <ModalConfirmExcluirPadrao
          descricaoItem={descricaoModalExcluirItem(
            "a campanha",
            campanhaParaExcluir.nome,
            "(os vínculos na Gestão de Links serão desfeitos)",
          )}
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
    </>
  );
}
