import { useMemo, useState } from "react";
import { Eye, RefreshCw } from "lucide-react";
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
  formatSolicitanteOs,
  labelStatusOrdemSaida,
  ordemVisivelNoMes,
  OS_STATUS_COLOR,
  type OrdemSaidaRow,
  type OrdemSaidaStatus,
  type OsItemDisponivel,
} from "../../../lib/techOpsOrdemSaida";
import { BadgeOs, CelulaItensOs, VazioOs } from "./ordemSaidaUi";
import { ModalAtualizarOs, ModalNovaOsExterna, ModalVerOs } from "./ModaisOrdemSaida";

type StatusFiltro = "" | OrdemSaidaStatus;

function passaFiltros(
  r: OrdemSaidaRow,
  mesKey: string,
  historico: boolean,
  statusFiltro: StatusFiltro,
  busca: string,
): boolean {
  if (r.tipo !== "externa") return false;
  if (!ordemVisivelNoMes(r, mesKey, historico)) return false;
  if (statusFiltro && r.status !== statusFiltro) return false;
  const codigo = formatCodigoOrdemSaida(r.tipo, r.competencia, r.codigo_num);
  return textoContemBuscaEmAlgum(
    busca,
    codigo,
    r.destino_texto ?? "",
    formatSolicitanteOs(r.solicitante_nome, r.solicitante_time),
    labelStatusOrdemSaida(r.status, r.tipo),
  );
}

export function AbaExterna({
  rows,
  loading,
  busca,
  statusFiltro,
  mesKey,
  historico,
  estudioNomePorSlug,
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
  itensDisponiveis: OsItemDisponivel[];
  competenciaPreview: string;
  perm: Permissoes;
  onReload: () => void;
  userName: string;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const [novoAberto, setNovoAberto] = useState(false);
  const [verRow, setVerRow] = useState<OrdemSaidaRow | null>(null);
  const [updRow, setUpdRow] = useState<OrdemSaidaRow | null>(null);

  const base = useMemo(
    () => rows.filter((r) => passaFiltros(r, mesKey, historico, statusFiltro, busca)),
    [rows, mesKey, historico, statusFiltro, busca],
  );

  const futuras = useMemo(() => base.filter((r) => r.status === "solicitada"), [base]);
  const abertas = useMemo(() => base.filter((r) => r.status === "aberta"), [base]);
  const encerradas = useMemo(
    () => base.filter((r) => r.status === "concluida" || r.status === "cancelada"),
    [base],
  );

  function acoes(r: OrdemSaidaRow, soVer: boolean) {
    return (
      <div style={{ display: "inline-flex", gap: 4, justifyContent: "center" }}>
        <BtnIconeAcaoLinha label={tooltipAcao("Ver O.S.")} onClick={() => setVerRow(r)}>
          <Eye size={13} aria-hidden />
        </BtnIconeAcaoLinha>
        {!soVer && perm.canEditarOk ? (
          <BtnIconeAcaoLinha label={tooltipAcao("Atualizar O.S.")} onClick={() => setUpdRow(r)}>
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
          <SectionTitle sub="Saídas externas ainda não realizadas">Ordens Futuras</SectionTitle>
          {perm.canCriarOk ? (
            <CtaCriarButton onClick={() => setNovoAberto(true)}>Nova O.S. Externa</CtaCriarButton>
          ) : null}
        </div>
        {loading ? (
          <VazioOs>Carregando…</VazioOs>
        ) : futuras.length === 0 ? (
          <VazioOs>Nenhuma ordem encontrada.</VazioOs>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 880 })}>
              <caption style={{ display: "none" }}>Ordens externas futuras</caption>
              <thead>
                <tr>
                  {(
                    [
                      "Código",
                      "Destino",
                      "Previsão de Saída",
                      "Previsão de Retorno",
                      "Itens",
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
                {futuras.map((r, i) => {
                  const codigo = formatCodigoOrdemSaida(r.tipo, r.competencia, r.codigo_num);
                  return (
                    <tr key={r.id} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={{ ...dataTable.tdCenter, fontWeight: 700 }}>{codigo}</td>
                      <td style={dataTable.tdCenter}>{r.destino_texto || "—"}</td>
                      <td style={dataTable.tdCenter}>{formatDataBrOs(r.data_saida)}</td>
                      <td style={dataTable.tdCenter}>
                        {r.sem_retorno ? "Sem retorno" : formatDataBrOs(r.data_retorno)}
                      </td>
                      <td style={dataTable.tdCenter}>
                        <CelulaItensOs itens={r.itens} />
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
                      <td style={dataTable.tdCenter}>{acoes(r, false)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={pageBox}>
        <SectionTitle sub="Saída realizada — aguardando retorno">Ordens em Aberto</SectionTitle>
        {loading ? (
          <VazioOs>Carregando…</VazioOs>
        ) : abertas.length === 0 ? (
          <VazioOs>Nenhuma ordem encontrada.</VazioOs>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 880 })}>
              <caption style={{ display: "none" }}>Ordens externas em aberto</caption>
              <thead>
                <tr>
                  {(
                    [
                      "Código",
                      "Destino",
                      "Saída Realizada",
                      "Previsão de Retorno",
                      "Itens",
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
                      <td style={dataTable.tdCenter}>{r.destino_texto || "—"}</td>
                      <td style={dataTable.tdCenter}>
                        {formatDataBrOs(r.data_saida_realizada ?? r.data_saida)}
                      </td>
                      <td style={dataTable.tdCenter}>
                        {r.sem_retorno ? "Sem retorno" : formatDataBrOs(r.data_retorno)}
                      </td>
                      <td style={dataTable.tdCenter}>
                        <CelulaItensOs itens={r.itens} />
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
                      <td style={dataTable.tdCenter}>{acoes(r, false)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={pageBox}>
        <SectionTitle sub="Retorno realizado ou ordem cancelada">Ordens Encerradas</SectionTitle>
        {loading ? (
          <VazioOs>Carregando…</VazioOs>
        ) : encerradas.length === 0 ? (
          <VazioOs>Nenhuma ordem encontrada.</VazioOs>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 720 })}>
              <caption style={{ display: "none" }}>Ordens externas encerradas</caption>
              <thead>
                <tr>
                  {(
                    ["Código", "Saída Realizada", "Retorno Realizado", "Solicitante", "Status", "Ações"] as const
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
                      <td style={dataTable.tdCenter}>{formatDataBrOs(r.data_saida_realizada)}</td>
                      <td style={dataTable.tdCenter}>{formatDataBrOs(r.data_retorno_realizada)}</td>
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
                      <td style={dataTable.tdCenter}>{acoes(r, true)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {novoAberto ? (
        <ModalNovaOsExterna
          rows={rows}
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
          estudioNomePorSlug={estudioNomePorSlug}
          onClose={() => setVerRow(null)}
        />
      ) : null}
      {updRow ? (
        <ModalAtualizarOs
          row={updRow}
          userName={userName}
          onClose={() => setUpdRow(null)}
          onAtualizado={onReload}
        />
      ) : null}
    </>
  );
}
