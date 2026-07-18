import { useMemo, useState } from "react";
import { Check, Eye, RefreshCw } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { SectionTitle, CtaCriarButton } from "../../../components/dashboard";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import type { Permissoes } from "../../../hooks/usePermission";
import {
  formatCodigoOrdemSaida,
  formatDataBrOs,
  labelLocalOs,
  labelStatusOrdemSaida,
  ordemVisivelNoMes,
  OS_STATUS_COLOR,
  type OrdemSaidaRow,
  type OrdemSaidaStatus,
  type OsItemDisponivel,
} from "../../../lib/techOpsOrdemSaida";
import { getOrdemSaidaPermissoesUi } from "../../../lib/techOpsOrdemSaidaPermissoes";
import { BadgeOs, CelulaItensOs, VazioOs } from "./ordemSaidaUi";
import { ModalNovaOsInterna } from "./ModaisOrdemSaida";
import { ModalAprovarOs, ModalVerOs } from "./ModalVerOs";
import { ModalAtualizarOs } from "./ModalAtualizarOs";

type LocalOption = { chave: string; label: string };
type StatusFiltro = "" | OrdemSaidaStatus;

export function AbaInterna({
  rows,
  loading,
  busca,
  statusFiltro,
  mesKey,
  historico,
  estudioNomePorSlug,
  locaisOptions,
  itensDisponiveis,
  competenciaPreview,
  perm,
  onReload,
  userName,
}: {
  rows: OrdemSaidaRow[];
  loading: boolean;
  busca: string;
  statusFiltro: StatusFiltro;
  mesKey: string;
  historico: boolean;
  estudioNomePorSlug: Record<string, string>;
  locaisOptions: LocalOption[];
  itensDisponiveis: OsItemDisponivel[];
  competenciaPreview: string;
  perm: Permissoes;
  onReload: () => void;
  userName: string;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const [novoAberto, setNovoAberto] = useState(false);
  const [verRow, setVerRow] = useState<OrdemSaidaRow | null>(null);
  const [aprovarRow, setAprovarRow] = useState<OrdemSaidaRow | null>(null);
  const [updRow, setUpdRow] = useState<OrdemSaidaRow | null>(null);
  const permissoesPagina = getOrdemSaidaPermissoesUi(perm, user);

  const filtrados = useMemo(() => {
    return rows.filter((r) => {
      if (r.tipo !== "interna") return false;
      if (!ordemVisivelNoMes(r, mesKey, historico)) return false;
      if (statusFiltro && r.status !== statusFiltro) return false;
      const codigo = formatCodigoOrdemSaida(r.tipo, r.competencia, r.codigo_num);
      const origem = labelLocalOs(r.origem_chave, estudioNomePorSlug);
      const destino = labelLocalOs(r.destino_chave, estudioNomePorSlug);
      return textoContemBuscaEmAlgum(
        busca,
        codigo,
        origem,
        destino,
        r.responsavel_nome,
        r.solicitante_nome,
        labelStatusOrdemSaida(r.status, r.tipo),
      );
    });
  }, [rows, mesKey, historico, statusFiltro, busca, estudioNomePorSlug]);

  return (
    <>
      <div style={pageBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <SectionTitle sub="Movimentações internas">Listagem</SectionTitle>
          {permissoesPagina.podeNovaOs ? (
            <CtaCriarButton onClick={() => setNovoAberto(true)}>Nova O.S. Interna</CtaCriarButton>
          ) : null}
        </div>
        {loading ? (
          <VazioOs>Carregando…</VazioOs>
        ) : filtrados.length === 0 ? (
          <VazioOs>Nenhuma ordem encontrada.</VazioOs>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 920 })}>
              <caption style={{ display: "none" }}>Ordens de saída internas</caption>
              <thead>
                <tr>
                  {(
                    ["Código", "Origem", "Saída", "Destino", "Retorno", "Itens", "Responsável", "Status", "Ações"] as const
                  ).map((h) => (
                    <th key={h} scope="col" style={dataTable.thHeader}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r, i) => {
                  const codigo = formatCodigoOrdemSaida(r.tipo, r.competencia, r.codigo_num);
                  const retorno = r.sem_retorno ? "Sem retorno" : formatDataBrOs(r.data_retorno);
                  const permissoesRow = getOrdemSaidaPermissoesUi(perm, user, r);
                  return (
                    <tr key={r.id} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={{ ...dataTable.tdCenter, fontWeight: 700 }}>{codigo}</td>
                      <td style={dataTable.tdCenter}>{labelLocalOs(r.origem_chave, estudioNomePorSlug)}</td>
                      <td style={dataTable.tdCenter}>{formatDataBrOs(r.data_saida)}</td>
                      <td style={dataTable.tdCenter}>{labelLocalOs(r.destino_chave, estudioNomePorSlug)}</td>
                      <td style={dataTable.tdCenter}>{retorno}</td>
                      <td style={dataTable.tdCenter}>
                        <CelulaItensOs itens={r.itens} />
                      </td>
                      <td style={dataTable.tdCenter}>{r.responsavel_nome || "—"}</td>
                      <td style={dataTable.tdCenter}>
                        <span style={{ display: "inline-flex", justifyContent: "center" }}>
                          <BadgeOs
                            label={labelStatusOrdemSaida(r.status, r.tipo)}
                            cor={OS_STATUS_COLOR[r.status]}
                          />
                        </span>
                      </td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "inline-flex", gap: 4, justifyContent: "center" }}>
                          <BtnIconeAcaoLinha label={tooltipAcao("Ver O.S.")} onClick={() => setVerRow(r)}>
                            <Eye size={13} aria-hidden />
                          </BtnIconeAcaoLinha>
                          {permissoesRow.podeAprovar && r.status === "solicitada" ? (
                            <BtnIconeAcaoLinha label={tooltipAcao("Aprovar O.S.")} onClick={() => setAprovarRow(r)}>
                              <Check size={13} aria-hidden />
                            </BtnIconeAcaoLinha>
                          ) : null}
                          {permissoesRow.podeAtualizar &&
                          r.status !== "concluida" &&
                          r.status !== "cancelada" ? (
                            <BtnIconeAcaoLinha label={tooltipAcao("Atualizar O.S.")} onClick={() => setUpdRow(r)}>
                              <RefreshCw size={13} aria-hidden />
                            </BtnIconeAcaoLinha>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {novoAberto ? (
        <ModalNovaOsInterna
          rows={rows}
          locaisOptions={locaisOptions}
          itensDisponiveis={itensDisponiveis}
          competenciaPreview={competenciaPreview}
          userName={userName}
          onClose={() => setNovoAberto(false)}
          onCriado={onReload}
        />
      ) : null}
      {verRow ? (
        <ModalVerOs
          row={verRow}
          contexto="interna"
          estudioNomePorSlug={estudioNomePorSlug}
          onClose={() => setVerRow(null)}
        />
      ) : null}
      {aprovarRow &&
      aprovarRow.status === "solicitada" &&
      getOrdemSaidaPermissoesUi(perm, user, aprovarRow).podeAprovar ? (
        <ModalAprovarOs
          row={aprovarRow}
          contexto="interna"
          estudioNomePorSlug={estudioNomePorSlug}
          userName={userName}
          onClose={() => setAprovarRow(null)}
          onAtualizado={onReload}
        />
      ) : null}
      {updRow &&
      updRow.status !== "concluida" &&
      updRow.status !== "cancelada" &&
      getOrdemSaidaPermissoesUi(perm, user, updRow).podeAtualizar ? (
        <ModalAtualizarOs
          row={updRow}
          contexto="interna"
          userName={userName}
          estudioNomePorSlug={estudioNomePorSlug}
          locaisOptions={locaisOptions}
          itensDisponiveis={itensDisponiveis}
          onClose={() => setUpdRow(null)}
          onAtualizado={onReload}
        />
      ) : null}
    </>
  );
}
