import { useState } from "react";
import { Eye } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { formatDataHoraEstoque, type LimpezaRow, type ManutencaoRegRow } from "../../../lib/techOpsItensAlocados";
import { SectionTitle, CtaCriarButton } from "../../../components/dashboard";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { FONT } from "../../../constants/theme";

function ModalEmBreve({ title, onClose }: { title: string; onClose: () => void }) {
  const { theme: t } = useApp();
  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title={title} onClose={onClose} />
      <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body, paddingBottom: 8 }}>
        Conteúdo deste modal será definido na próxima etapa.
      </p>
    </ModalBase>
  );
}

export function AbaManutencaoPainel({
  limpezas,
  manutencoes,
  loading,
  podeCriar,
}: {
  limpezas: LimpezaRow[];
  manutencoes: ManutencaoRegRow[];
  loading: boolean;
  podeCriar: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);

  const [modal, setModal] = useState<string | null>(null);

  return (
    <>
      <div style={pageBox}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <SectionTitle sub="registros de limpeza">Limpeza</SectionTitle>
          {podeCriar ? (
            <CtaCriarButton onClick={() => setModal("reg-limpeza")}>Registrar Limpeza</CtaCriarButton>
          ) : null}
        </div>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Carregando…
          </div>
        ) : limpezas.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Nenhum registro de limpeza neste local e mês.
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 720 })}>
              <caption style={{ display: "none" }}>Registros de limpeza</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>
                    Data da Limpeza
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Equipamento
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Mesa
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Responsável
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {limpezas.map((r, i) => (
                  <tr key={r.id} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdCenter}>{formatDataHoraEstoque(r.data_hora)}</td>
                    <td style={dataTable.tdCenter}>{r.equipamento_label}</td>
                    <td style={dataTable.tdCenter}>{r.mesa_label}</td>
                    <td style={dataTable.tdCenter}>{r.responsavel_nome}</td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <BtnIconeAcaoLinha label={tooltipAcao("Ver")} onClick={() => setModal("ver-limpeza")}>
                          <Eye size={13} aria-hidden />
                        </BtnIconeAcaoLinha>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={pageBox}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <SectionTitle sub="registros de manutenção">Manutenção</SectionTitle>
          {podeCriar ? (
            <CtaCriarButton onClick={() => setModal("reg-manut")}>Registrar Manutenção</CtaCriarButton>
          ) : null}
        </div>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Carregando…
          </div>
        ) : manutencoes.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Nenhum registro de manutenção neste local e mês.
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 800 })}>
              <caption style={{ display: "none" }}>Registros de manutenção</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>
                    Data da Manutenção
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Equipamento
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Mesa
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Tipo
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Responsável
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {manutencoes.map((r, i) => (
                  <tr key={r.id} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdCenter}>{formatDataHoraEstoque(r.data_hora)}</td>
                    <td style={dataTable.tdCenter}>{r.equipamento_label}</td>
                    <td style={dataTable.tdCenter}>{r.mesa_label}</td>
                    <td style={dataTable.tdCenter}>{r.tipo}</td>
                    <td style={dataTable.tdCenter}>{r.responsavel_nome}</td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <BtnIconeAcaoLinha label={tooltipAcao("Ver")} onClick={() => setModal("ver-manut")}>
                          <Eye size={13} aria-hidden />
                        </BtnIconeAcaoLinha>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal === "reg-limpeza" ? <ModalEmBreve title="Registrar Limpeza" onClose={() => setModal(null)} /> : null}
      {modal === "reg-manut" ? <ModalEmBreve title="Registrar Manutenção" onClose={() => setModal(null)} /> : null}
      {modal === "ver-limpeza" ? <ModalEmBreve title="Ver Limpeza" onClose={() => setModal(null)} /> : null}
      {modal === "ver-manut" ? <ModalEmBreve title="Ver Manutenção" onClose={() => setModal(null)} /> : null}
    </>
  );
}
