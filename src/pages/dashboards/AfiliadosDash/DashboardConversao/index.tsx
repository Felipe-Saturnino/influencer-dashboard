import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useAfiliadosFiltrosOptional } from "../AfiliadosFiltrosContext";
import { FunilAfiliados } from "../FunilAfiliados";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT } from "../../../../constants/theme";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { MSG_SEM_DADOS_FILTRO } from "../../../../lib/dashboardConstants";
import { SectionTitle, SortTableTh, SelectComIcone, type SortDir } from "../../../../components/dashboard";
import { useDataTableBlock } from "../../../../hooks/useDataTableBlock";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../../lib/dataTableStyles";
import { FilterBarIcons } from "../../../../lib/filterBarIconCatalog";

type TaxasSortCol = "nome" | "acessos" | "acessoReg" | "registros" | "regFtd" | "ftds" | "acao";

function TaxasThSort({
  col,
  label,
  sort,
  setSort,
  thStyle,
}: {
  col: TaxasSortCol;
  label: string;
  sort: { col: TaxasSortCol; dir: SortDir };
  setSort: Dispatch<SetStateAction<{ col: TaxasSortCol; dir: SortDir }>>;
  thStyle: React.CSSProperties;
}) {
  return (
    <SortTableTh
      col={col}
      label={label}
      sortCol={sort.col}
      sortDir={sort.dir}
      thStyle={thStyle}
      align="center"
      onSort={(c) =>
        setSort((s) => ({
          col: c,
          dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
        }))
      }
    />
  );
}

export default function DashboardConversao() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const sf = useAfiliadosFiltrosOptional();
  const historico = sf?.historico ?? false;
  const dataTable = useDataTableBlock();
  const [sort, setSort] = useState<{ col: TaxasSortCol; dir: SortDir }>({ col: "ftds", dir: "desc" });
  const [ladoA, setLadoA] = useState("");
  const [ladoB, setLadoB] = useState("");

  useEffect(() => {
    sf?.setIsLoading(false);
  }, [sf]);

  const card = getPageContentBoxStyle(brand, t);
  const afiliadoOpts = (sf?.afiliadoOptions ?? []).map((a) => ({ value: a.id, label: a.nome }));

  return (
    <div className="app-page-shell" style={{ paddingTop: 0 }}>
      <div style={card}>
        <SectionTitle sub={historico ? "acumulado" : undefined}>Comparativo de Funil</SectionTitle>

        <div
          className="app-conversao-vs-row"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <SelectComIcone
            label="Afiliado A"
            icon={FilterBarIcons.afiliado}
            value={ladoA}
            onChange={setLadoA}
            pill={false}
            minWidth={200}
          >
            <option value="">Selecionar afiliado A</option>
            {afiliadoOpts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectComIcone>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              fontFamily: FONT.body,
              color: "var(--brand-action, #7c3aed)",
              border: "1px solid color-mix(in srgb, var(--brand-action, #7c3aed) 35%, transparent)",
              background: "color-mix(in srgb, var(--brand-action, #7c3aed) 10%, transparent)",
              borderRadius: 8,
              padding: "6px 10px",
            }}
          >
            VS
          </span>
          <SelectComIcone
            label="Afiliado B"
            icon={FilterBarIcons.afiliado}
            value={ladoB}
            onChange={setLadoB}
            pill={false}
            minWidth={200}
          >
            <option value="">Selecionar afiliado B</option>
            {afiliadoOpts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectComIcone>
        </div>

        <div
          className="app-conversao-funil-duo"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 8, textAlign: "center", fontFamily: FONT.body }}>
              Afiliado A
            </div>
            <FunilAfiliados />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 8, textAlign: "center", fontFamily: FONT.body }}>
              Afiliado B
            </div>
            <FunilAfiliados />
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 0 }}>
        <SectionTitle sub={historico ? "acumulado" : undefined}>Comparativo de Taxas</SectionTitle>
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {MSG_SEM_DADOS_FILTRO}
        </div>
        <div className="app-table-wrap" style={{ ...getDataTableWrapStyle(), opacity: 0.55, pointerEvents: "none" }} aria-hidden>
          <table style={getDataTableStyle({ minWidth: 720 })}>
            <caption style={{ display: "none" }}>Comparativo de taxas por afiliado — estrutura de colunas</caption>
            <thead>
              <tr>
                <TaxasThSort col="nome" label="Afiliado" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <TaxasThSort col="acessos" label="Acessos" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <TaxasThSort col="acessoReg" label="Acesso→Reg" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <TaxasThSort col="registros" label="Registros" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <TaxasThSort col="regFtd" label="Reg→FTD" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <TaxasThSort col="ftds" label="FTD" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <TaxasThSort col="acao" label="Ação" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
              </tr>
            </thead>
          </table>
        </div>
      </div>
    </div>
  );
}
