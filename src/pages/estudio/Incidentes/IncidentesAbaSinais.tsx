import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Activity, Clock, Loader2, Timer } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import {
  FiltroEntidadeBarSelect,
  KpiCard,
  SectionTitle,
  SortTableTh,
  type SortDir,
} from "../../../components/dashboard";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { getFilterBarRowStyle } from "../../../lib/filterBarStyles";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { formatDataIsoBr, labelPrestadorIncidente } from "../../../lib/estudioIncidentesHelpers";
import { fetchSmSinaisPeriodo, fetchStaffFiltroSinaisSm } from "../../../lib/smSinaisFetch";
import type { SmSinalRow, SmSinalStaffOption } from "../../../lib/smSinaisTypes";
import {
  agregarSinaisPorDia,
  calcularKpisSinais,
  fmtDuracaoMs,
  kpiMsParaComparativo,
  labelRelatorSinal,
  labelSmAtendente,
  type SmSinalDiaAgg,
} from "../../../lib/smSinaisHelpers";

const ERRO_CARREGAR =
  "Não foi possível carregar os sinais. Se o problema persistir, entre em contato com o suporte.";

type SortCol = "data" | "sinais" | "tmaTotal" | "tmaAtend" | "tmaRes";

function sortDias(rows: SmSinalDiaAgg[], col: SortCol, dir: SortDir): SmSinalDiaAgg[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (col) {
      case "data":
        return compareLocaleTexto(a.diaBrt, b.diaBrt, dir);
      case "sinais":
        return compareNumber(a.sinais, b.sinais, dir);
      case "tmaTotal":
        return compareNumber(a.tmaTotalMs ?? -1, b.tmaTotalMs ?? -1, dir);
      case "tmaAtend":
        return compareNumber(a.tmaAtendimentoMs ?? -1, b.tmaAtendimentoMs ?? -1, dir);
      case "tmaRes":
        return compareNumber(a.tmaResolucaoMs ?? -1, b.tmaResolucaoMs ?? -1, dir);
      default:
        return 0;
    }
  });
  return copy;
}

export function useIncidentesAbaSinais(opts: {
  periodoAtual: { inicio: string; fim: string };
  periodoAnterior: { inicio: string; fim: string } | null;
  historico: boolean;
  estudioFiltro: string;
  isProprios: boolean;
  meusIds: string[];
  active: boolean;
}): { filterBar: ReactNode; panel: ReactNode } {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();

  const [busca, setBusca] = useState("");
  const [staffFiltroId, setStaffFiltroId] = useState("");
  const [relatorFiltroId, setRelatorFiltroId] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "data", dir: "desc" });

  const [rowsAtual, setRowsAtual] = useState<SmSinalRow[]>([]);
  const [rowsAnterior, setRowsAnterior] = useState<SmSinalRow[]>([]);
  const [staffOptions, setStaffOptions] = useState<SmSinalStaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!opts.active) return;
    setErro(null);
    try {
      const [atual, anterior] = await Promise.all([
        fetchSmSinaisPeriodo({ dataIni: opts.periodoAtual.inicio, dataFim: opts.periodoAtual.fim }),
        opts.periodoAnterior
          ? fetchSmSinaisPeriodo({
              dataIni: opts.periodoAnterior.inicio,
              dataFim: opts.periodoAnterior.fim,
            })
          : Promise.resolve([] as SmSinalRow[]),
      ]);
      setRowsAtual(atual);
      setRowsAnterior(anterior);
    } catch (e) {
      console.error("Sinais: falha ao carregar período", e);
      setErro(ERRO_CARREGAR);
    } finally {
      setLoading(false);
    }
  }, [opts.active, opts.periodoAtual, opts.periodoAnterior]);

  useEffect(() => {
    if (!opts.active) return;
    setLoading(true);
    void carregar();
  }, [opts.active, carregar]);

  useEffect(() => {
    if (!opts.active) return;
    let cancel = false;
    void (async () => {
      try {
        const staff = await fetchStaffFiltroSinaisSm();
        if (!cancel) setStaffOptions(staff);
      } catch (e) {
        console.error("Sinais: falha ao carregar staff SM", e);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [opts.active]);

  const relatoresOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rowsAtual) {
      const nome = labelRelatorSinal(r);
      if (!nome || nome === "—") continue;
      const id = r.creator_funcionario_id?.trim() || `nome:${nome}`;
      if (!map.has(id)) map.set(id, nome);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [rowsAtual]);

  const aplicarFiltros = useCallback(
    (rows: SmSinalRow[]) =>
      rows.filter((r) => {
        if (opts.estudioFiltro !== "todos" && r.estudio_slug !== opts.estudioFiltro) return false;
        if (staffFiltroId && r.resolver_funcionario_id !== staffFiltroId) return false;
        if (relatorFiltroId) {
          const key = r.creator_funcionario_id?.trim() || `nome:${labelRelatorSinal(r)}`;
          if (key !== relatorFiltroId) return false;
        }
        if (opts.isProprios) {
          const cid = r.creator_funcionario_id;
          const rid = r.resolver_funcionario_id;
          const ok = (cid && opts.meusIds.includes(cid)) || (rid && opts.meusIds.includes(rid));
          if (!ok) return false;
        }
        return true;
      }),
    [opts.estudioFiltro, staffFiltroId, relatorFiltroId, opts.isProprios, opts.meusIds],
  );

  const rowsAtualEscopo = useMemo(() => aplicarFiltros(rowsAtual), [rowsAtual, aplicarFiltros]);
  const rowsAnteriorEscopo = useMemo(() => aplicarFiltros(rowsAnterior), [rowsAnterior, aplicarFiltros]);

  const rowsBusca = useMemo(
    () =>
      rowsAtualEscopo.filter((r) =>
        textoContemBuscaEmAlgum(
          busca,
          r.signal_id,
          r.signal_type,
          r.table_id,
          r.estudio_slug ?? "",
          labelSmAtendente(r),
          labelRelatorSinal(r),
        ),
      ),
    [rowsAtualEscopo, busca],
  );

  const kpiAtual = useMemo(() => calcularKpisSinais(rowsBusca), [rowsBusca]);
  const kpiAnterior = useMemo(() => {
    const ant = rowsAnteriorEscopo.filter((r) =>
      textoContemBuscaEmAlgum(
        busca,
        r.signal_id,
        r.signal_type,
        r.table_id,
        r.estudio_slug ?? "",
        labelSmAtendente(r),
        labelRelatorSinal(r),
      ),
    );
    return calcularKpisSinais(ant);
  }, [rowsAnteriorEscopo, busca]);

  const rowsTabela = useMemo(
    () => sortDias(agregarSinaisPorDia(rowsBusca), sort.col, sort.dir),
    [rowsBusca, sort],
  );

  function onSort(col: SortCol) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }));
  }

  function th(col: SortCol, label: string, style?: CSSProperties) {
    return (
      <SortTableTh
        key={col}
        col={col}
        label={label}
        sortCol={sort.col}
        sortDir={sort.dir}
        onSort={onSort}
        thStyle={style ?? dataTable.thHeader}
        align="center"
      />
    );
  }

  const filterBar = (
    <div style={{ ...getFilterBarRowStyle(), marginTop: 10 }}>
      <BarraPesquisaPagina
        value={busca}
        onChange={setBusca}
        placeholder={PAGE_SEARCH.sinais}
        aria-label="Buscar sinais por ID, motivo, mesa, SM ou relator"
        wrapperStyle={{ flex: "1 1 260px", maxWidth: 420 }}
      />
      {!opts.isProprios ? (
        <FiltroEntidadeBarSelect
          mode="single"
          selected={staffFiltroId ? [staffFiltroId] : []}
          onChange={(v) => setStaffFiltroId(v[0] ?? "")}
          items={staffOptions.map((s) => ({
            id: s.id,
            name: labelPrestadorIncidente(s.nome, s.nickname),
          }))}
          icon={FilterBarIcons.staff}
          triggerEmptyLabel="Todos Staff"
          ariaFilterPrefix="Filtrar por staff"
          listboxAriaLabel="Staff"
        />
      ) : null}
      {!opts.isProprios ? (
        <FiltroEntidadeBarSelect
          mode="single"
          selected={relatorFiltroId ? [relatorFiltroId] : []}
          onChange={(v) => setRelatorFiltroId(v[0] ?? "")}
          items={relatoresOptions}
          icon={FilterBarIcons.influencer}
          triggerEmptyLabel="Todos Relatores"
          ariaFilterPrefix="Filtrar por relator"
          listboxAriaLabel="Relatores"
        />
      ) : null}
    </div>
  );

  let panel: ReactNode;
  if (loading) {
    panel = (
      <div
        id="panel-incidentes-sinais"
        role="tabpanel"
        aria-labelledby="tab-incidentes-sinais"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280 }}
      >
        <div style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          <Loader2
            size={24}
            className="app-lucide-spin"
            color="var(--brand-primary, #7c3aed)"
            aria-hidden="true"
            style={{ marginBottom: 12 }}
          />
          <div style={{ fontSize: 13 }}>Carregando…</div>
        </div>
      </div>
    );
  } else if (erro) {
    panel = (
      <div id="panel-incidentes-sinais" role="tabpanel" aria-labelledby="tab-incidentes-sinais">
        <div
          role="alert"
          aria-live="polite"
          style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, padding: "20px 0", textAlign: "center" }}
        >
          {erro}
        </div>
      </div>
    );
  } else {
    panel = (
      <div id="panel-incidentes-sinais" role="tabpanel" aria-labelledby="tab-incidentes-sinais">
        <div style={getPageContentBoxStyle(brand, t)}>
          <SectionTitle>KPIs Consolidados</SectionTitle>
          <div className="app-grid-kpi-4">
            <KpiCard
              label="Totais de Sinais"
              value={kpiAtual.total.toLocaleString("pt-BR")}
              icon={<Activity size={16} aria-hidden />}
              accentColor="#a78bfa"
              atual={kpiAtual.total}
              anterior={kpiAnterior.total}
              isHistorico={opts.historico}
            />
            <KpiCard
              label="TMA Total"
              value={fmtDuracaoMs(kpiAtual.tmaTotalMs)}
              icon={<Timer size={16} aria-hidden />}
              accentColor="#1e36f8"
              atual={kpiMsParaComparativo(kpiAtual.tmaTotalMs)}
              anterior={kpiMsParaComparativo(kpiAnterior.tmaTotalMs)}
              isHistorico={opts.historico}
              isInverso
            />
            <KpiCard
              label="TMA de Atendimento"
              value={fmtDuracaoMs(kpiAtual.tmaAtendimentoMs)}
              icon={<Clock size={16} aria-hidden />}
              accentColor="#f59e0b"
              atual={kpiMsParaComparativo(kpiAtual.tmaAtendimentoMs)}
              anterior={kpiMsParaComparativo(kpiAnterior.tmaAtendimentoMs)}
              isHistorico={opts.historico}
              isInverso
            />
            <KpiCard
              label="TMA de Resolução"
              value={fmtDuracaoMs(kpiAtual.tmaResolucaoMs)}
              icon={<Timer size={16} aria-hidden />}
              accentColor="#22c55e"
              atual={kpiMsParaComparativo(kpiAtual.tmaResolucaoMs)}
              anterior={kpiMsParaComparativo(kpiAnterior.tmaResolucaoMs)}
              isHistorico={opts.historico}
              isInverso
            />
          </div>
        </div>

        <div style={getPageContentBoxStyle(brand, t)}>
          <SectionTitle sub="dia a dia">Detalhamento Diário</SectionTitle>
          {rowsTabela.length === 0 ? (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: t.textMuted,
                fontSize: 13,
                fontFamily: FONT.body,
              }}
            >
              Sem dados para o período selecionado.
            </div>
          ) : (
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 640 })}>
                <caption style={{ display: "none" }}>Sinais e TMA por dia America/Sao_Paulo</caption>
                <thead>
                  <tr>
                    {th("data", "Data", dataTable.thHeaderSticky)}
                    {th("sinais", "Sinais")}
                    {th("tmaTotal", "TMA Total")}
                    {th("tmaAtend", "TMA de Atendimento")}
                    {th("tmaRes", "TMA de Resolução")}
                  </tr>
                </thead>
                <tbody>
                  {rowsTabela.map((row, i) => (
                    <tr key={row.diaBrt} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdSticky({ rowIndex: i, fontWeight: 600 })}>
                        {formatDataIsoBr(row.diaBrt)}
                      </td>
                      <td style={dataTable.tdCenter}>{row.sinais.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(row.tmaTotalMs)}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(row.tmaAtendimentoMs)}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(row.tmaResolucaoMs)}</td>
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

  return { filterBar, panel };
}
