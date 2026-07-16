import { useMemo, useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { FONT } from "../../../constants/theme";
import { SectionTitle, SortTableTh, CtaCriarButton, type SortDir } from "../../../components/dashboard";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import type { Permissoes } from "../../../hooks/usePermission";
import {
  formatCnpjEstoque,
  type EstoqueFornecedorContatoRow,
  type EstoqueFornecedorRow,
} from "../../../lib/techOpsEstoque";
import { BadgeEstoque, CampoLeituraEstoque, VazioEstoque } from "./estoqueUi";
import { ModalVerEstoque } from "./ModalVerEstoque";
import { ModalNovoFornecedorEstoque } from "./ModaisNovoEstoque";
import { ModalEditarFornecedorEstoque } from "./ModaisEditarEstoque";

type SortCol = "empresa" | "tipo" | "status";

const COR_ATIVO = "#22c55e";
const COR_INATIVO = "#6b7280";

export function AbaFornecedores({
  rows,
  loading,
  busca,
  perm,
  onReload,
}: {
  rows: EstoqueFornecedorRow[];
  loading: boolean;
  busca: string;
  perm: Permissoes;
  onReload: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "empresa", dir: "asc" });
  const [novoAberto, setNovoAberto] = useState(false);
  const [verRow, setVerRow] = useState<EstoqueFornecedorRow | null>(null);
  const [editRow, setEditRow] = useState<EstoqueFornecedorRow | null>(null);
  const [contatoAberto, setContatoAberto] = useState<EstoqueFornecedorContatoRow | null>(null);

  const pageBox = getPageContentBoxStyle(brand, t);

  const filtrados = useMemo(() => {
    const lista = rows.filter((r) =>
      textoContemBuscaEmAlgum(busca, r.razao_social, r.cnpj, r.tipo, ...r.contatos.map((c) => c.nome)),
    );
    const dir = sort.dir;
    return [...lista].sort((a, b) => {
      switch (sort.col) {
        case "empresa":
          return compareLocaleTexto(a.razao_social, b.razao_social, dir);
        case "tipo":
          return compareLocaleTexto(a.tipo, b.tipo, dir);
        case "status":
          return compareLocaleTexto(a.ativo ? "Ativo" : "Inativo", b.ativo ? "Ativo" : "Inativo", dir);
        default:
          return 0;
      }
    });
  }, [rows, busca, sort]);

  function onSort(col: SortCol) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));
  }

  return (
    <>
      <div style={pageBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <SectionTitle sub="Fornecedores cadastrados e contatos">Catálogo</SectionTitle>
          {perm.canCriarOk ? (
            <CtaCriarButton onClick={() => setNovoAberto(true)}>Novo Fornecedor</CtaCriarButton>
          ) : null}
        </div>
        {loading ? (
          <VazioEstoque>Carregando…</VazioEstoque>
        ) : filtrados.length === 0 ? (
          <VazioEstoque>Nenhum fornecedor encontrado.</VazioEstoque>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 720 })}>
              <caption style={{ display: "none" }}>Catálogo de fornecedores</caption>
              <thead>
                <tr>
                  <SortTableTh label="Empresa" col="empresa" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Tipo" col="tipo" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <th scope="col" style={dataTable.thHeader}>
                    Contato
                  </th>
                  <SortTableTh label="Status" col="status" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <th scope="col" style={dataTable.thHeader}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{ background: dataTable.zebraRow(i) }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = dataTable.totalRowBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = dataTable.zebraRow(i);
                    }}
                  >
                    <td
                      style={{ ...dataTable.tdCenter, fontWeight: 700 }}
                      title={formatCnpjEstoque(r.cnpj)}
                    >
                      {r.razao_social}
                    </td>
                    <td style={dataTable.tdCenter}>{r.tipo}</td>
                    <td style={dataTable.tdCenter}>
                      {r.contatos.length === 0 ? (
                        "—"
                      ) : (
                        <span style={{ display: "inline-flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                          {r.contatos.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setContatoAberto(c)}
                              title={tooltipAcao("Ver Contato")}
                              aria-label={tooltipAcao("Ver Contato")}
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                fontSize: 13,
                                fontFamily: FONT.body,
                                color: "var(--brand-primary, #7c3aed)",
                                fontWeight: 600,
                                textDecoration: "underline",
                                textUnderlineOffset: 3,
                              }}
                            >
                              {c.nome}
                            </button>
                          ))}
                        </span>
                      )}
                    </td>
                    <td style={dataTable.tdCenter}>
                      <span style={{ display: "flex", justifyContent: "center" }}>
                        <BadgeEstoque
                          label={r.ativo ? "Ativo" : "Inativo"}
                          cor={r.ativo ? COR_ATIVO : COR_INATIVO}
                        />
                      </span>
                    </td>
                    <td style={dataTable.tdCenter}>
                      <span style={{ display: "inline-flex", gap: 6 }}>
                        <BtnIconeAcaoLinha label={tooltipAcao("Ver Fornecedor")} onClick={() => setVerRow(r)}>
                          <Eye size={13} aria-hidden />
                        </BtnIconeAcaoLinha>
                        {perm.canEditarOk ? (
                          <BtnIconeAcaoLinha label={tooltipAcao("Editar Fornecedor")} onClick={() => setEditRow(r)}>
                            <Pencil size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {novoAberto ? <ModalNovoFornecedorEstoque onClose={() => setNovoAberto(false)} onCriado={onReload} /> : null}

      {editRow ? (
        <ModalEditarFornecedorEstoque row={editRow} onClose={() => setEditRow(null)} onSalvo={onReload} />
      ) : null}

      {verRow ? (
        <ModalVerEstoque
          titulo={verRow.tipo}
          subtitulo={`${verRow.razao_social} — ${formatCnpjEstoque(verRow.cnpj)}`}
          primeiraAbaLabel="Contatos"
          entidadeTipo="fornecedor"
          entidadeId={verRow.id}
          onClose={() => setVerRow(null)}
          primeiraAbaConteudo={
            verRow.contatos.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  padding: "20px 0",
                  textAlign: "center",
                }}
              >
                Nenhum contato cadastrado.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {verRow.contatos.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      border: `1px solid ${t.cardBorder}`,
                      borderRadius: 12,
                      padding: 14,
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <CampoLeituraEstoque label="Nome" valor={c.nome || "—"} />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                      <CampoLeituraEstoque label="Telefone" valor={c.telefone || "—"} />
                      <CampoLeituraEstoque label="E-mail" valor={c.email || "—"} />
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        />
      ) : null}

      {contatoAberto ? (
        <ModalBase onClose={() => setContatoAberto(null)} maxWidth={420}>
          <ModalHeader title={contatoAberto.nome} onClose={() => setContatoAberto(null)} />
          <div style={{ display: "grid", gap: 14 }}>
            <CampoLeituraEstoque label="Nome do Contato" valor={contatoAberto.nome || "—"} />
            <CampoLeituraEstoque label="Telefone" valor={contatoAberto.telefone || "—"} />
            <CampoLeituraEstoque label="E-mail" valor={contatoAberto.email || "—"} />
          </div>
        </ModalBase>
      ) : null}
    </>
  );
}
