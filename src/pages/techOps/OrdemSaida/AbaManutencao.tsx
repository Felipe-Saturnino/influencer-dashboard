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
import type { EstoqueFornecedorRow } from "../../../lib/techOpsEstoque";
import {
  formatCodigoOrdemSaida,
  formatDataBrOs,
  formatSolicitanteOs,
  labelStatusOrdemSaida,
  ordemVisivelNoMes,
  OS_STATUS_COLOR,
  type OrdemSaidaRow,
  type OrdemSaidaStatus,
  type OsItemDisponivel,
  type OsModalContexto,
} from "../../../lib/techOpsOrdemSaida";
import { getOrdemSaidaPermissoesUi } from "../../../lib/techOpsOrdemSaidaPermissoes";
import { BadgeOs, CelulaItensOs, VazioOs } from "./ordemSaidaUi";
import { ModalNovaOsManutencao } from "./ModaisOrdemSaida";
import { ModalAprovarOs, ModalVerOs } from "./ModalVerOs";
import { ModalAtualizarOs } from "./ModalAtualizarOs";

type StatusFiltro = "" | OrdemSaidaStatus;

function passaFiltros(
  r: OrdemSaidaRow,
  mesKey: string,
  historico: boolean,
  statusFiltro: StatusFiltro,
  busca: string,
): boolean {
  if (r.tipo !== "manutencao") return false;
  if (!ordemVisivelNoMes(r, mesKey, historico)) return false;
  if (statusFiltro && r.status !== statusFiltro) return false;
  const codigo = formatCodigoOrdemSaida(r.tipo, r.competencia, r.codigo_num);
  return textoContemBuscaEmAlgum(
    busca,
    codigo,
    r.fornecedor_razao_social ?? "",
    formatSolicitanteOs(r.solicitante_nome, r.solicitante_time),
    ...r.itens.map((i) => i.label_snapshot),
    labelStatusOrdemSaida(r.status, r.tipo),
  );
}

function labelEquipamento(r: OrdemSaidaRow): string {
  if (r.itens.length === 0) return "—";
  if (r.itens.length === 1) return r.itens[0].label_snapshot;
  return `${r.itens.length} itens`;
}

export function AbaManutencao({
  rows,
  loading,
  busca,
  statusFiltro,
  mesKey,
  historico,
  estudioNomePorSlug,
  fornecedores,
  itensManutencao,
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
  fornecedores: EstoqueFornecedorRow[];
  itensManutencao: OsItemDisponivel[];
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
  const [verInfo, setVerInfo] = useState<{ row: OrdemSaidaRow; contexto: OsModalContexto } | null>(null);
  const [aprovarInfo, setAprovarInfo] = useState<{ row: OrdemSaidaRow; contexto: OsModalContexto } | null>(null);
  const [updInfo, setUpdInfo] = useState<{ row: OrdemSaidaRow; contexto: OsModalContexto } | null>(null);
  const permissoesPagina = getOrdemSaidaPermissoesUi(perm, user);

  const base = useMemo(
    () => rows.filter((r) => passaFiltros(r, mesKey, historico, statusFiltro, busca)),
    [rows, mesKey, historico, statusFiltro, busca],
  );

  const abertas = useMemo(
    () => base.filter((r) => r.status === "solicitada" || r.status === "aberta"),
    [base],
  );
  const encerradas = useMemo(
    () => base.filter((r) => r.status === "concluida" || r.status === "cancelada"),
    [base],
  );

  function acoes(r: OrdemSaidaRow, contexto: OsModalContexto, soVer: boolean) {
    const permissoesRow = getOrdemSaidaPermissoesUi(perm, user, r);
    return (
      <div style={{ display: "inline-flex", gap: 4, justifyContent: "center" }}>
        <BtnIconeAcaoLinha label={tooltipAcao("Ver O.S.")} onClick={() => setVerInfo({ row: r, contexto })}>
          <Eye size={13} aria-hidden />
        </BtnIconeAcaoLinha>
        {permissoesRow.podeAprovar && r.status === "solicitada" ? (
          <BtnIconeAcaoLinha
            label={tooltipAcao("Aprovar O.S.")}
            onClick={() => setAprovarInfo({ row: r, contexto })}
          >
            <Check size={13} aria-hidden />
          </BtnIconeAcaoLinha>
        ) : null}
        {!soVer &&
        permissoesRow.podeAtualizar &&
        r.status !== "concluida" &&
        r.status !== "cancelada" ? (
          <BtnIconeAcaoLinha
            label={tooltipAcao("Atualizar O.S.")}
            onClick={() => setUpdInfo({ row: r, contexto })}
          >
            <RefreshCw size={13} aria-hidden />
          </BtnIconeAcaoLinha>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div style={pageBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <SectionTitle sub="Equipamentos enviados a fornecedores para manutenção">
            Ordens em Aberto
          </SectionTitle>
          {permissoesPagina.podeNovaOs ? (
            <CtaCriarButton onClick={() => setNovoAberto(true)}>Nova O.S. Manutenção</CtaCriarButton>
          ) : null}
        </div>
        {loading ? (
          <VazioOs>Carregando…</VazioOs>
        ) : abertas.length === 0 ? (
          <VazioOs>Nenhuma ordem encontrada.</VazioOs>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 900 })}>
              <caption style={{ display: "none" }}>Ordens de manutenção em aberto</caption>
              <thead>
                <tr>
                  {(
                    [
                      "Código",
                      "Fornecedor",
                      "Saída",
                      "Previsão de Retorno",
                      "Equipamento",
                      "Solicitante",
                      "Status",
                      "Ações",
                    ] as const
                  ).map((h) => (
                    <th key={h} scope="col" style={dataTable.thHeader}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {abertas.map((r, i) => {
                  const codigo = formatCodigoOrdemSaida(r.tipo, r.competencia, r.codigo_num);
                  return (
                    <tr key={r.id} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={{ ...dataTable.tdCenter, fontWeight: 700 }}>{codigo}</td>
                      <td style={dataTable.tdCenter}>{r.fornecedor_razao_social || "—"}</td>
                      <td style={dataTable.tdCenter}>{formatDataBrOs(r.data_saida)}</td>
                      <td style={dataTable.tdCenter}>
                        {r.sem_retorno ? "Sem previsão" : formatDataBrOs(r.data_retorno)}
                      </td>
                      <td style={dataTable.tdCenter}>
                        <CelulaItensOs itens={r.itens} labelOverride={labelEquipamento(r)} />
                      </td>
                      <td style={dataTable.tdCenter}>
                        {formatSolicitanteOs(r.solicitante_nome, r.solicitante_time)}
                      </td>
                      <td style={dataTable.tdCenter}>
                        <span style={{ display: "inline-flex", justifyContent: "center" }}>
                          <BadgeOs
                            label={labelStatusOrdemSaida(r.status, r.tipo)}
                            cor={OS_STATUS_COLOR[r.status]}
                          />
                        </span>
                      </td>
                      <td style={dataTable.tdCenter}>{acoes(r, "manutencao_abertas", false)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={pageBox}>
        <SectionTitle sub="Manutenções concluídas ou canceladas">Ordens Encerradas</SectionTitle>
        {loading ? (
          <VazioOs>Carregando…</VazioOs>
        ) : encerradas.length === 0 ? (
          <VazioOs>Nenhuma ordem encontrada.</VazioOs>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 820 })}>
              <caption style={{ display: "none" }}>Ordens de manutenção encerradas</caption>
              <thead>
                <tr>
                  {(
                    [
                      "Código",
                      "Equipamento",
                      "Saída Realizada",
                      "Retorno Realizado",
                      "Fornecedor",
                      "Status",
                      "Ações",
                    ] as const
                  ).map((h) => (
                    <th key={h} scope="col" style={dataTable.thHeader}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {encerradas.map((r, i) => {
                  const codigo = formatCodigoOrdemSaida(r.tipo, r.competencia, r.codigo_num);
                  return (
                    <tr key={r.id} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={{ ...dataTable.tdCenter, fontWeight: 700 }}>{codigo}</td>
                      <td style={dataTable.tdCenter}>
                        <CelulaItensOs itens={r.itens} labelOverride={labelEquipamento(r)} />
                      </td>
                      <td style={dataTable.tdCenter}>{formatDataBrOs(r.data_saida_realizada)}</td>
                      <td style={dataTable.tdCenter}>{formatDataBrOs(r.data_retorno_realizada)}</td>
                      <td style={dataTable.tdCenter}>{r.fornecedor_razao_social || "—"}</td>
                      <td style={dataTable.tdCenter}>
                        <span style={{ display: "inline-flex", justifyContent: "center" }}>
                          <BadgeOs
                            label={labelStatusOrdemSaida(r.status, r.tipo)}
                            cor={OS_STATUS_COLOR[r.status]}
                          />
                        </span>
                      </td>
                      <td style={dataTable.tdCenter}>{acoes(r, "manutencao_encerradas", true)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {novoAberto ? (
        <ModalNovaOsManutencao
          rows={rows}
          fornecedores={fornecedores}
          itensDisponiveis={itensManutencao}
          competenciaPreview={competenciaPreview}
          userName={userName}
          onClose={() => setNovoAberto(false)}
          onCriado={onReload}
        />
      ) : null}
      {verInfo ? (
        <ModalVerOs
          row={verInfo.row}
          contexto={verInfo.contexto}
          estudioNomePorSlug={estudioNomePorSlug}
          onClose={() => setVerInfo(null)}
        />
      ) : null}
      {aprovarInfo &&
      aprovarInfo.row.status === "solicitada" &&
      getOrdemSaidaPermissoesUi(perm, user, aprovarInfo.row).podeAprovar ? (
        <ModalAprovarOs
          row={aprovarInfo.row}
          contexto={aprovarInfo.contexto}
          estudioNomePorSlug={estudioNomePorSlug}
          userName={userName}
          onClose={() => setAprovarInfo(null)}
          onAtualizado={onReload}
        />
      ) : null}
      {updInfo &&
      updInfo.row.status !== "concluida" &&
      updInfo.row.status !== "cancelada" &&
      getOrdemSaidaPermissoesUi(perm, user, updInfo.row).podeAtualizar ? (
        <ModalAtualizarOs
          row={updInfo.row}
          contexto={updInfo.contexto}
          userName={userName}
          fornecedores={fornecedores}
          itensDisponiveis={itensManutencao}
          onClose={() => setUpdInfo(null)}
          onAtualizado={onReload}
        />
      ) : null}
    </>
  );
}
