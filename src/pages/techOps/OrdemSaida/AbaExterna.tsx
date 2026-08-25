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
import { ModalNovaOsExterna } from "./ModaisOrdemSaida";
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

  const futuras = useMemo(() => base.filter((r) => r.status === "solicitada"), [base]);
  const abertas = useMemo(() => base.filter((r) => r.status === "aberta"), [base]);
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
          <SectionTitle compact sub="Saídas externas ainda não realizadas">Ordens Futuras</SectionTitle>
          {permissoesPagina.podeNovaOs ? (
            <CtaCriarButton onClick={() => setNovoAberto(true)} style={{ flexShrink: 0 }}>
              Nova O.S. Externa
            </CtaCriarButton>
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
                      <td style={dataTable.tdCenter}>{acoes(r, "externa_futuras", false)}</td>
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
                      <td style={dataTable.tdCenter}>{acoes(r, "externa_abertas", false)}</td>
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
                      <td style={dataTable.tdCenter}>{acoes(r, "externa_encerradas", true)}</td>
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
          itensDisponiveis={itensDisponiveis}
          onClose={() => setUpdInfo(null)}
          onAtualizado={onReload}
        />
      ) : null}
    </>
  );
}
