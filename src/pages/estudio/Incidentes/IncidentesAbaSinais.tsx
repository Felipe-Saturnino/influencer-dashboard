import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Activity, Clock, Loader2, Timer } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
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
import { formatDataIsoBr, labelPrestadorIncidente } from "../../../lib/estudioIncidentesHelpers";
import { tableRowHoverBg } from "../../plataforma/GestaoMesas/gestaoMesasUi";
import { fetchSmSinaisResumoPeriodo, fetchStaffFiltroSinaisSm } from "../../../lib/smSinaisFetch";
import type { SmSinalResumoRow, SmSinalStaffOption } from "../../../lib/smSinaisTypes";
import {
  agregarResumoPorDia,
  calcularKpisResumo,
  chaveRelatorResumo,
  fmtDuracaoMs,
  kpiMsParaComparativo,
  labelRelatorResumo,
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

  const [staffFiltroId, setStaffFiltroId] = useState("");
  const [relatorFiltroId, setRelatorFiltroId] = useState("");
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "data", dir: "desc" });

  const [rowsAtual, setRowsAtual] = useState<SmSinalResumoRow[]>([]);
  const [rowsAnterior, setRowsAnterior] = useState<SmSinalResumoRow[]>([]);
  const [staffOptions, setStaffOptions] = useState<SmSinalStaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMoM, setLoadingMoM] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!opts.active) return;
    let cancel = false;
    setErro(null);
    setLoading(true);
    setLoadingMoM(false);
    void (async () => {
      try {
        const atual = await fetchSmSinaisResumoPeriodo({
          dataIni: opts.periodoAtual.inicio,
          dataFim: opts.periodoAtual.fim,
        });
        if (cancel) return;
        setRowsAtual(atual);
        setLoading(false);
        if (!opts.periodoAnterior) {
          setRowsAnterior([]);
          return;
        }
        setLoadingMoM(true);
        try {
          const anterior = await fetchSmSinaisResumoPeriodo({
            dataIni: opts.periodoAnterior.inicio,
            dataFim: opts.periodoAnterior.fim,
          });
          if (!cancel) setRowsAnterior(anterior);
        } catch (eMom) {
          console.error("Sinais: falha ao carregar mês anterior", eMom);
          if (!cancel) setRowsAnterior([]);
        }
      } catch (e) {
        if (cancel) return;
        console.error("Sinais: falha ao carregar período", e);
        setErro(ERRO_CARREGAR);
        setLoading(false);
      } finally {
        if (!cancel) setLoadingMoM(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [opts.active, opts.periodoAtual, opts.periodoAnterior, reload]);

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
      const nome = labelRelatorResumo(r);
      if (!nome || nome === "—") continue;
      const id = chaveRelatorResumo(r);
      if (!id || map.has(id)) continue;
      map.set(id, nome);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [rowsAtual]);

  const aplicarFiltros = useCallback(
    (rows: SmSinalResumoRow[]) =>
      rows.filter((r) => {
        if (opts.estudioFiltro !== "todos" && (r.estudio_slug || "") !== opts.estudioFiltro) return false;
        if (staffFiltroId && r.resolver_funcionario_id !== staffFiltroId) return false;
        if (relatorFiltroId && chaveRelatorResumo(r) !== relatorFiltroId) return false;
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

  const kpiAtual = useMemo(() => calcularKpisResumo(rowsAtualEscopo), [rowsAtualEscopo]);
  const kpiAnterior = useMemo(() => calcularKpisResumo(rowsAnteriorEscopo), [rowsAnteriorEscopo]);

  const rowsTabela = useMemo(
    () => sortDias(agregarResumoPorDia(rowsAtualEscopo), sort.col, sort.dir),
    [rowsAtualEscopo, sort],
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

  const filterBar =
    opts.isProprios && !loadingMoM ? null : (
    <div style={{ ...getFilterBarRowStyle(), marginTop: 10, width: "100%" }}>
      {!opts.isProprios ? (
        <>
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
        </>
      ) : null}
      {loadingMoM ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: t.textMuted,
            fontSize: 12,
            fontFamily: FONT.body,
          }}
        >
          <Clock size={12} aria-hidden />
          Carregando…
        </span>
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
          style={{
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
            padding: "20px 0",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>{erro}</span>
          <button
            type="button"
            onClick={() => setReload((n) => n + 1)}
            style={{
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid rgba(232,64,37,0.35)",
              background: "transparent",
              color: "#e84025",
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
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
              formatAnterior={(s) => fmtDuracaoMs(s * 1000)}
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
              formatAnterior={(s) => fmtDuracaoMs(s * 1000)}
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
              formatAnterior={(s) => fmtDuracaoMs(s * 1000)}
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
                  {rowsTabela.map((row, i) => {
                    const zebra = dataTable.zebraRow(i);
                    return (
                    <tr
                      key={row.diaBrt}
                      style={{ background: zebra }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = tableRowHoverBg(t.isDark);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = zebra;
                      }}
                    >
                      <td style={dataTable.tdSticky({ rowIndex: i, fontWeight: 600 })}>
                        {formatDataIsoBr(row.diaBrt)}
                      </td>
                      <td style={dataTable.tdCenter}>{row.sinais.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(row.tmaTotalMs)}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(row.tmaAtendimentoMs)}</td>
                      <td style={dataTable.tdCenter}>{fmtDuracaoMs(row.tmaResolucaoMs)}</td>
                    </tr>
                    );
                  })}
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
