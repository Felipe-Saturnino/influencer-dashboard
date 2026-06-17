import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { FiltroBarTabButton } from "../../../components/dashboard"
import { onFiltroBarTabsKeyDown } from "../../../lib/filterBarStyles"
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles"
import { useDataTableBlock } from "../../../hooks/useDataTableBlock"
import { baixarEtiquetaFigurinoPdf } from "../../../lib/rhFigurinoEtiquetaPdf"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { FONT } from "../../../constants/theme"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles"
import { type RhFigurinoEmprestimo, type RhFigurinoPeca, type RhFigurinoStatusHist } from "./types";
import { labelStatusHistorico, labelStatusPeca, labelTipoRetirada } from "./figurinosConstants"
import { ctaButtonContent, fmtDataHora, fmtDataSóDia, labelCondicaoPeca, tableRowHoverBg } from "./figurinosPageHelpers"
import {
  DETALHE_ABAS,
  DETALHE_TAB_ICONS,
  DETALHE_TAB_LABELS,
  type AbaDetalheFig,
} from "./figurinosModalShared"
import { BarcodeBlock } from "./BarcodeBlock"

export function ModalDetalhe({
  peca,
  estudiosTexto,
  histStatus,
  histErro,
  loadingHist,
  empAtivo,
  podeEditar,
  onClose,
  onRetirada,
  onDevolver,
  onManutencao,
  onConcluirManut,
  onDescartar,
}: {
  peca: RhFigurinoPeca;
  estudiosTexto: string;
  histStatus: RhFigurinoStatusHist[];
  histErro: string | null;
  loadingHist: boolean;
  empAtivo: RhFigurinoEmprestimo | undefined;
  podeEditar: boolean;
  onClose: () => void;
  onRetirada: () => void;
  onDevolver: () => void;
  onManutencao: () => void;
  onConcluirManut: () => void;
  onDescartar: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [abaDet, setAbaDet] = useState<AbaDetalheFig>("detalhes");

  const registroCadastro = useMemo(() => {
    if (!histStatus.length) return null;
    const asc = [...histStatus].sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
    return asc.find((h) => h.previous_status == null) ?? asc[0] ?? null;
  }, [histStatus]);

  const linhaLeitura = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "8px 0", borderBottom: `1px solid ${t.cardBorder}` }}>
      <span style={{ color: t.textMuted, fontSize: 12, fontFamily: FONT.body }}>{label}</span>
      <span style={{ color: t.text, fontSize: 13, fontWeight: 600, textAlign: "right", fontFamily: FONT.body }}>{value}</span>
    </div>
  );

  return (
    <ModalBase onClose={onClose} maxWidth={640}>
      <ModalHeader title={peca.code} onClose={onClose} />
      <div
        role="tablist"
        aria-label="Seções do detalhe"
        style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, DETALHE_ABAS, setAbaDet, (a) => `tab-fig-detalhe-${a}`)}
      >
        {DETALHE_ABAS.map((a) => (
          <FiltroBarTabButton
            key={a}
            id={`tab-fig-detalhe-${a}`}
            active={abaDet === a}
            aria-controls={`panel-fig-detalhe-${a}`}
            onClick={() => setAbaDet(a)}
            icon={DETALHE_TAB_ICONS[a]}
          >
            {DETALHE_TAB_LABELS[a]}
          </FiltroBarTabButton>
        ))}
      </div>

      {abaDet === "detalhes" ? (
        <div role="tabpanel" id="panel-fig-detalhe-detalhes" aria-labelledby="tab-fig-detalhe-detalhes" tabIndex={0}>
          <div style={{ marginBottom: 16 }}>
            {linhaLeitura("Estúdio", estudiosTexto)}
            {linhaLeitura("Categoria", peca.category)}
            {linhaLeitura("Tamanho", peca.size)}
            {linhaLeitura("Data de aquisição", fmtDataSóDia(peca.purchase_date))}
            {linhaLeitura("Condição", labelCondicaoPeca(peca.condition))}
            {linhaLeitura("Status", labelStatusPeca(peca.status))}
          </div>
          {empAtivo ? (
            <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 14px" }}>
              Retirada ativa ({labelTipoRetirada(empAtivo.withdrawal_type)}):{" "}
              <strong style={{ color: t.text }}>{empAtivo.borrower_name}</strong> desde {fmtDataHora(empAtivo.loaned_at)}
            </p>
          ) : null}
          <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <BarcodeBlock value={peca.barcode} />
            <button
              type="button"
              disabled={pdfLoading}
              onClick={async () => {
                setPdfLoading(true);
                try {
                  await baixarEtiquetaFigurinoPdf(peca, estudiosTexto);
                } finally {
                  setPdfLoading(false);
                }
              }}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: getCtaCriarGradient(brand),
                color: "#fff",
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: pdfLoading ? "not-allowed" : "pointer",
              }}
            >
              {ctaButtonContent(pdfLoading, "Baixar etiqueta", "Gerando…")}
            </button>
          </div>
          <div
            style={{
              fontSize: 12,
              color: t.textMuted,
              fontFamily: FONT.body,
              paddingTop: 12,
              borderTop: `1px solid ${t.cardBorder}`,
            }}
          >
            Cadastrado por <strong style={{ color: t.text }}>{registroCadastro?.changed_by ?? "—"}</strong>
            {" · "}
            {registroCadastro ? fmtDataHora(registroCadastro.changed_at) : fmtDataHora(peca.created_at)}
          </div>
          {podeEditar ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
              {peca.status === "available" ? (
                <>
                  <button
                    type="button"
                    onClick={onRetirada}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: `1px solid rgba(34,197,94,0.35)`,
                      background: "rgba(34,197,94,0.12)",
                      color: "#22c55e",
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                    }}
                  >
                    Retirada
                  </button>
                  <button
                    type="button"
                    onClick={onManutencao}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: `1px solid rgba(167,139,250,0.4)`,
                      background: "rgba(167,139,250,0.12)",
                      color: "#a78bfa",
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                    }}
                  >
                    Manutenção
                  </button>
                </>
              ) : null}
              {peca.status === "borrowed" ? (
                <button
                  type="button"
                  onClick={onDevolver}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: `1px solid rgba(245,158,11,0.4)`,
                    background: "rgba(245,158,11,0.12)",
                    color: "#f59e0b",
                    fontWeight: 700,
                    fontFamily: FONT.body,
                    cursor: "pointer",
                  }}
                >
                  Devolução
                </button>
              ) : null}
              {peca.status === "maintenance" ? (
                <>
                  <button
                    type="button"
                    onClick={onConcluirManut}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: `1px solid rgba(34,197,94,0.35)`,
                      background: "rgba(34,197,94,0.12)",
                      color: "#22c55e",
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                    }}
                  >
                    Disponibilizar
                  </button>
                  <button
                    type="button"
                    onClick={onDescartar}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(107,114,128,0.45)",
                      background: "rgba(107,114,128,0.1)",
                      color: "#6b7280",
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                    }}
                  >
                    Descartar
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div role="tabpanel" id="panel-fig-detalhe-historico" aria-labelledby="tab-fig-detalhe-historico" tabIndex={0}>
          {loadingHist ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "24px 0", color: t.textMuted }}>
              <Loader2 className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" size={18} aria-hidden />
              <span style={{ fontFamily: FONT.body, fontSize: 13 }}>Carregando histórico…</span>
            </div>
          ) : histErro ? (
            <div role="alert" aria-live="polite" style={{ padding: "24px 0", textAlign: "center", color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
              {histErro}
            </div>
          ) : histStatus.length === 0 ? (
            <div style={{ padding: "28px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Sem histórico de alterações de status.
            </div>
          ) : (
            <div className="app-table-wrap" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle()}>
                <caption style={{ display: "none" }}>Histórico de alterações de status da peça</caption>
                <thead>
                  <tr>
                    <th scope="col" style={dataTable.thHeader}>
                      Data/Hora
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      Status
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      Registrado por
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...histStatus]
                    .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
                    .map((h, i) => {
                      const zebra = dataTable.zebraRow(i);
                      return (
                      <tr
                        key={h.id}
                        style={{ background: zebra }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = tableRowHoverBg(t.isDark);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = zebra;
                        }}
                      >
                        <td style={dataTable.tdCenter}>{fmtDataHora(h.changed_at)}</td>
                        <td style={dataTable.tdCenter}>
                          {labelStatusHistorico(h.previous_status)} → {labelStatusHistorico(h.new_status)}
                        </td>
                        <td style={dataTable.tdCenter}>{h.changed_by}</td>
                      </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </ModalBase>
  );
}
