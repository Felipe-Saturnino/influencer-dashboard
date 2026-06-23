import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Mail, RefreshCw, XCircle } from "lucide-react";
import { SortTableTh } from "../../../components/dashboard";
import { BRAND_SEMANTIC as BRAND, FONT } from "../../../constants/theme";
import type { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { AcaoCtaContent } from "./statusTecnicoUi";
import type {
  IntegracaoSortCol,
  StatusIntegracaoRow,
  StatusIntegracaoTableHeaders,
} from "./statusTecnicoIntegracaoTypes";

type DataTableBlock = ReturnType<typeof useDataTableBlock>;

export function StatusIntegracaoTable({
  caption,
  rows,
  headers,
  sortIntegracao,
  onSortChange,
  mostrarColunaAcao,
  dataTable,
  t,
  formatarHora,
  tableRowHoverBg,
  btnAcao,
  syncExecutando,
  syncSocialExecutando,
  syncSpinRssExecutando,
  syncComercialSpaExecutando,
  syncComercialDominioExecutando,
  syncComercialCnpjExecutando,
  emailEnviando,
  emailAgendaEnviando,
  canEditarOk,
  onConfirmarSync,
  onConfirmarEmail,
}: {
  caption: string;
  rows: StatusIntegracaoRow[];
  headers: StatusIntegracaoTableHeaders;
  sortIntegracao: { col: IntegracaoSortCol; dir: import("../../../components/dashboard").SortDir };
  onSortChange: (col: IntegracaoSortCol) => void;
  mostrarColunaAcao: boolean;
  dataTable: DataTableBlock;
  t: { isDark?: boolean; text: string; textMuted: string };
  formatarHora: (iso: string) => string;
  tableRowHoverBg: (isDark: boolean) => string;
  btnAcao: (disabled: boolean) => CSSProperties;
  syncExecutando: boolean;
  syncSocialExecutando: boolean;
  syncSpinRssExecutando: boolean;
  syncComercialSpaExecutando: boolean;
  syncComercialDominioExecutando: boolean;
  syncComercialCnpjExecutando: boolean;
  emailEnviando: boolean;
  emailAgendaEnviando: boolean;
  canEditarOk: boolean;
  onConfirmarSync: (tipo: "cda" | "social" | "spin_rss" | "comercial_spa" | "comercial_dominio" | "comercial_cnpj") => void;
  onConfirmarEmail: (tipo: "diretoria" | "agenda") => void;
}) {
  const handleSort = (col: IntegracaoSortCol) => {
    onSortChange(col);
  };

  const renderAcao = (row: StatusIntegracaoRow): ReactNode => {
    const isCda = row.syncTipo === "cda";
    const isSocial = row.syncTipo === "social";
    const isSpinRss = row.syncTipo === "spin_rss";
    const isComercialSpa = row.syncTipo === "comercial_spa";
    const isComercialDominio = row.syncTipo === "comercial_dominio";
    const isComercialCnpj = row.syncTipo === "comercial_cnpj";
    const isEmailDir = row.syncTipo === "email";
    const isEmailAgenda = row.syncTipo === "email_agenda";
    const syncExecutandoRow = isCda
      ? syncExecutando
      : isSocial
        ? syncSocialExecutando
        : isSpinRss
          ? syncSpinRssExecutando
          : isComercialSpa
            ? syncComercialSpaExecutando
            : isComercialDominio
              ? syncComercialDominioExecutando
              : isComercialCnpj
                ? syncComercialCnpjExecutando
            : false;

    if (isCda || isSocial || isSpinRss || isComercialSpa || isComercialDominio || isComercialCnpj) {
      return (
        <button
          type="button"
          onClick={() =>
            onConfirmarSync(
              isCda
                ? "cda"
                : isSocial
                  ? "social"
                  : isComercialSpa
                    ? "comercial_spa"
                    : isComercialDominio
                      ? "comercial_dominio"
                      : isComercialCnpj
                        ? "comercial_cnpj"
                      : "spin_rss",
            )
          }
          disabled={syncExecutandoRow || !canEditarOk}
          style={btnAcao(syncExecutandoRow)}
        >
          <AcaoCtaContent
            executando={syncExecutandoRow}
            label="Sync"
            labelExecutando="Sincronizando..."
            icon={<RefreshCw size={13} aria-hidden="true" />}
          />
        </button>
      );
    }

    if (isEmailDir) {
      return (
        <button
          type="button"
          onClick={() => onConfirmarEmail("diretoria")}
          disabled={emailEnviando || !canEditarOk}
          style={btnAcao(emailEnviando)}
        >
          <AcaoCtaContent
            executando={emailEnviando}
            label="Enviar"
            labelExecutando="Enviando..."
            icon={<Mail size={13} aria-hidden="true" />}
          />
        </button>
      );
    }

    if (isEmailAgenda) {
      return (
        <button
          type="button"
          onClick={() => onConfirmarEmail("agenda")}
          disabled={emailAgendaEnviando || !canEditarOk}
          style={btnAcao(emailAgendaEnviando)}
        >
          <AcaoCtaContent
            executando={emailAgendaEnviando}
            label="Enviar"
            labelExecutando="Enviando..."
            icon={<Mail size={13} aria-hidden="true" />}
          />
        </button>
      );
    }

    return <span style={{ color: t.textMuted, fontFamily: FONT.body }}>—</span>;
  };

  return (
    <div className="app-table-wrap" style={getDataTableWrapStyle()}>
      <table style={getDataTableStyle()}>
        <caption style={{ display: "none" }}>{caption}</caption>
        <thead>
          <tr>
            <SortTableTh<IntegracaoSortCol>
              label={headers.col1}
              col="integracao"
              sortCol={sortIntegracao.col}
              sortDir={sortIntegracao.dir}
              thStyle={dataTable.thHeader}
              align="center"
              onSort={handleSort}
            />
            <SortTableTh<IntegracaoSortCol>
              label={headers.col2}
              col="ultimoSync"
              sortCol={sortIntegracao.col}
              sortDir={sortIntegracao.dir}
              thStyle={dataTable.thHeader}
              align="center"
              onSort={handleSort}
            />
            <SortTableTh<IntegracaoSortCol>
              label={headers.col3}
              col="registros"
              sortCol={sortIntegracao.col}
              sortDir={sortIntegracao.dir}
              thStyle={dataTable.thHeader}
              align="center"
              onSort={handleSort}
            />
            <SortTableTh<IntegracaoSortCol>
              label="Erros"
              col="erros"
              sortCol={sortIntegracao.col}
              sortDir={sortIntegracao.dir}
              thStyle={dataTable.thHeader}
              align="center"
              onSort={handleSort}
            />
            <SortTableTh<IntegracaoSortCol>
              label="Status"
              col="status"
              sortCol={sortIntegracao.col}
              sortDir={sortIntegracao.dir}
              thStyle={dataTable.thHeader}
              align="center"
              onSort={handleSort}
            />
            {mostrarColunaAcao && (
              <th scope="col" style={dataTable.thHeader}>
                Ação
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const zebra = dataTable.zebraRow(idx);
            const { status } = row;
            return (
              <tr
                key={row.slug}
                style={{ background: zebra }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = tableRowHoverBg(!!t.isDark);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = zebra;
                }}
              >
                <td style={dataTable.tdCenter}>{row.nome}</td>
                <td style={dataTable.tdCenter}>{row.ultimoSync ? formatarHora(row.ultimoSync) : "—"}</td>
                <td style={dataTable.tdCenter}>{row.registrosHoje.toLocaleString("pt-BR")}</td>
                <td style={dataTable.tdCenter}>{row.erros}</td>
                <td style={dataTable.tdCenter}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background:
                        status === "ok"
                          ? `${BRAND.verde}18`
                          : status === "warning"
                            ? `${BRAND.amarelo}18`
                            : `${BRAND.vermelho}18`,
                      color: status === "ok" ? BRAND.verde : status === "warning" ? BRAND.amarelo : BRAND.vermelho,
                      borderRadius: 8,
                      padding: "4px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      border: `1px solid ${status === "ok" ? `${BRAND.verde}44` : status === "warning" ? `${BRAND.amarelo}44` : `${BRAND.vermelho}44`}`,
                    }}
                  >
                    {status === "ok" && <CheckCircle2 size={13} aria-hidden="true" />}
                    {status === "warning" && <AlertTriangle size={13} aria-hidden="true" />}
                    {status === "falha" && <XCircle size={13} aria-hidden="true" />}
                    {status === "ok" ? "OK" : status === "warning" ? "Atenção" : "Falha"}
                  </span>
                </td>
                {mostrarColunaAcao && <td style={dataTable.tdCenter}>{renderAcao(row)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
