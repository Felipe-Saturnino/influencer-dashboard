import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
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

type TaxasSortCol = "nome" | "acessos" | "acessoReg" | "registros" | "regFtd" | "ftds";

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

function fmtPct(num: number, den: number): string {
  if (den <= 0) return "—";
  return `${((num / den) * 100).toFixed(1)}%`;
}

export default function DashboardConversao() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const sf = useAfiliadosFiltrosOptional();
  const historico = sf?.historico ?? false;
  const ranking = useMemo(() => sf?.ranking ?? [], [sf?.ranking]);
  const metricasPorAfiliado = sf?.metricasPorAfiliado ?? {};
  const dataTable = useDataTableBlock();
  const [sort, setSort] = useState<{ col: TaxasSortCol; dir: SortDir }>({ col: "ftds", dir: "desc" });
  const [ladoA, setLadoA] = useState("");
  const [ladoB, setLadoB] = useState("");

  const card = getPageContentBoxStyle(brand, t);
  const afiliadoOpts = (sf?.afiliadoOptions ?? []).map((a) => ({ value: a.id, label: a.nome }));

  const metA = ladoA ? metricasPorAfiliado[ladoA] : undefined;
  const metB = ladoB ? metricasPorAfiliado[ladoB] : undefined;

  const taxasOrdenadas = useMemo(() => {
    const list = ranking.map((r) => ({
      ...r,
      acessoReg: r.acessos > 0 ? (r.registros / r.acessos) * 100 : -1,
      regFtd: r.registros > 0 ? (r.ftds / r.registros) * 100 : -1,
    }));
    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let cmp = 0;
      switch (sort.col) {
        case "nome":
          cmp = a.nome.localeCompare(b.nome, "pt-BR");
          break;
        case "acessos":
          cmp = a.acessos - b.acessos;
          break;
        case "acessoReg":
          cmp = a.acessoReg - b.acessoReg;
          break;
        case "registros":
          cmp = a.registros - b.registros;
          break;
        case "regFtd":
          cmp = a.regFtd - b.regFtd;
          break;
        case "ftds":
          cmp = a.ftds - b.ftds;
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return list;
  }, [ranking, sort]);

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
            <FunilAfiliados
              acessos={metA?.acessos ?? 0}
              registros={metA?.registros ?? 0}
              ftds={metA?.ftds ?? 0}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 8, textAlign: "center", fontFamily: FONT.body }}>
              Afiliado B
            </div>
            <FunilAfiliados
              acessos={metB?.acessos ?? 0}
              registros={metB?.registros ?? 0}
              ftds={metB?.ftds ?? 0}
            />
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 0 }}>
        <SectionTitle sub={historico ? "acumulado" : undefined}>Comparativo de Taxas</SectionTitle>
        {taxasOrdenadas.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            {MSG_SEM_DADOS_FILTRO}
          </div>
        ) : (
          <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 720 })}>
              <caption style={{ display: "none" }}>Comparativo de taxas por afiliado</caption>
              <thead>
                <tr>
                  <TaxasThSort col="nome" label="Afiliado" sort={sort} setSort={setSort} thStyle={dataTable.thHeaderSticky} />
                  <TaxasThSort col="acessos" label="Acessos" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                  <TaxasThSort col="acessoReg" label="Acesso→Reg" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                  <TaxasThSort col="registros" label="Registros" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                  <TaxasThSort col="regFtd" label="Reg→FTD" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                  <TaxasThSort col="ftds" label="FTD" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                </tr>
              </thead>
              <tbody>
                {taxasOrdenadas.map((r, i) => (
                  <tr key={r.afiliado_id} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdSticky({ rowIndex: i })}>{r.nome}</td>
                    <td style={dataTable.tdCenter}>{r.acessos.toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>{fmtPct(r.registros, r.acessos)}</td>
                    <td style={dataTable.tdCenter}>{r.registros.toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>{fmtPct(r.ftds, r.registros)}</td>
                    <td style={dataTable.tdCenter}>{r.ftds.toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
