import { useMemo, useState } from "react";
import { Clock, Eye } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { formatDataHoraEstoque, type ItemAlocadoSetRow, type ItemAlocadoStatus } from "../../../lib/techOpsItensAlocados";
import { SectionTitle, CtaCriarButton, SortTableTh, type SortDir } from "../../../components/dashboard";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { FONT } from "../../../constants/theme";
import { BadgeStatusAlocado, KpiSetCard } from "./itensAlocadosUi";
import { ModalChecklistItensAlocados } from "./ModalChecklist";
import { ModalVerItemAlocado } from "./ModalVerItem";
import { ModalHistoricoItemAlocado } from "./ModalHistorico";

type KpiFiltro = "" | "set" | "verificar" | "manutencao";
type SortCol = "codigo" | "nome" | "categoria" | "quantidade" | "status" | "alocacao";

export function AbaSet({
  itens,
  loading,
  localLabel,
  localChave,
  mesaId,
  autorNome,
  estudioNomePorSlug,
  podeCriar,
  onReload,
}: {
  itens: ItemAlocadoSetRow[];
  loading: boolean;
  localLabel: string;
  localChave: string;
  mesaId: string | null;
  autorNome: string;
  estudioNomePorSlug: Record<string, string>;
  podeCriar: boolean;
  onReload: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);

  const [kpi, setKpi] = useState<KpiFiltro>("");
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "alocacao", dir: "desc" });
  const [checklistAberto, setChecklistAberto] = useState(false);
  const [verItem, setVerItem] = useState<ItemAlocadoSetRow | null>(null);
  const [histItem, setHistItem] = useState<ItemAlocadoSetRow | null>(null);

  const kpis = useMemo(() => {
    const total = itens.length;
    const verificar = itens.filter((i) => i.status === "verificar").length;
    const manutencao = itens.filter((i) => i.status === "manutencao").length;
    return { total, verificar, manutencao };
  }, [itens]);

  const filtrados = useMemo(() => {
    let list = [...itens];
    if (kpi === "verificar") list = list.filter((i) => i.status === "verificar");
    if (kpi === "manutencao") list = list.filter((i) => i.status === "manutencao");
    const dir = sort.dir;
    list.sort((a, b) => {
      let c = 0;
      if (sort.col === "codigo") c = compareLocaleTexto(a.codigo, b.codigo, dir);
      else if (sort.col === "nome") c = compareLocaleTexto(a.nome, b.nome, dir);
      else if (sort.col === "categoria") c = compareLocaleTexto(a.categoria, b.categoria, dir);
      else if (sort.col === "quantidade") c = compareNumber(a.quantidade, b.quantidade, dir);
      else if (sort.col === "status") c = compareLocaleTexto(a.status, b.status, dir);
      else c = compareLocaleTexto(a.alocacao_data ?? "", b.alocacao_data ?? "", dir);
      return c;
    });
    return list;
  }, [itens, kpi, sort]);

  function onSort(col: string) {
    const c = col as SortCol;
    setSort((prev) => (prev.col === c ? { col: c, dir: prev.dir === "asc" ? "desc" : "asc" } : { col: c, dir: "asc" }));
  }

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="clique em um card para filtrar por status">Consolidado</SectionTitle>
        <div className="app-grid-kpi-3" style={{ gap: 12 }}>
          <KpiSetCard
            label="Itens do Set"
            valor={kpis.total}
            color="var(--brand-primary, #7c3aed)"
            active={kpi === "set" || kpi === ""}
            onClick={() => setKpi(kpi === "set" ? "" : "set")}
          />
          <KpiSetCard
            label="Itens em Verificação"
            valor={kpis.verificar}
            color="#f59e0b"
            active={kpi === "verificar"}
            onClick={() => setKpi(kpi === "verificar" ? "" : "verificar")}
          />
          <KpiSetCard
            label="Itens em Manutenção"
            valor={kpis.manutencao}
            color="#d97706"
            active={kpi === "manutencao"}
            onClick={() => setKpi(kpi === "manutencao" ? "" : "manutencao")}
          />
        </div>
      </div>

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
          <SectionTitle compact sub={`itens em ${localLabel}`}>Itens</SectionTitle>
          {podeCriar ? (
            <CtaCriarButton onClick={() => setChecklistAberto(true)} style={{ flexShrink: 0 }}>
              Checklist
            </CtaCriarButton>
          ) : null}
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Carregando…
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Nenhum item alocado neste local.
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 920 })}>
              <caption style={{ display: "none" }}>Itens alocados no local</caption>
              <thead>
                <tr>
                  <SortTableTh label="Código" col="codigo" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Nome" col="nome" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Categoria" col="categoria" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <th scope="col" style={dataTable.thHeader}>
                    Modelo / Marca
                  </th>
                  <SortTableTh label="Quantidade" col="quantidade" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Status" col="status" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Alocação" col="alocacao" sortCol={sort.col} sortDir={sort.dir} onSort={onSort} thStyle={dataTable.thHeader} align="center" />
                  <th scope="col" style={dataTable.thHeader}>
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r, i) => (
                  <tr key={`${r.entidade_tipo}:${r.entidade_id}`} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={{ ...dataTable.tdCenter, fontWeight: 600 }}>{r.codigo}</td>
                    <td style={dataTable.tdCenter}>{r.nome}</td>
                    <td style={dataTable.tdCenter}>{r.categoria}</td>
                    <td style={dataTable.tdCenter}>{r.modelo_marca}</td>
                    <td style={dataTable.tdCenter}>{r.quantidade}</td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <BadgeStatusAlocado status={r.status as ItemAlocadoStatus} />
                      </div>
                    </td>
                    <td style={dataTable.tdCenter}>
                      {r.alocacao_data ? formatDataHoraEstoque(r.alocacao_data).split(" ")[0] : "—"}
                    </td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                        <BtnIconeAcaoLinha label={tooltipAcao("Ver")} onClick={() => setVerItem(r)}>
                          <Eye size={13} aria-hidden />
                        </BtnIconeAcaoLinha>
                        <BtnIconeAcaoLinha label={tooltipAcao("Histórico")} onClick={() => setHistItem(r)}>
                          <Clock size={13} aria-hidden />
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

      {checklistAberto ? (
        <ModalChecklistItensAlocados
          localLabel={localLabel}
          localChave={localChave}
          mesaId={mesaId}
          itens={itens}
          autorNome={autorNome}
          onClose={() => setChecklistAberto(false)}
          onSalvo={onReload}
        />
      ) : null}
      {verItem ? <ModalVerItemAlocado item={verItem} onClose={() => setVerItem(null)} /> : null}
      {histItem ? (
        <ModalHistoricoItemAlocado
          item={histItem}
          estudioNomePorSlug={estudioNomePorSlug}
          onClose={() => setHistItem(null)}
        />
      ) : null}
    </>
  );
}
