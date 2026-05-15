import { useMemo, useState } from "react";
import { List, MoreHorizontal, Store } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { DashboardPageHeader, SectionTitle } from "../../../components/dashboard";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
import {
  ESCALA_ACAO_TIPO_OPCOES_MINHAS,
  ESCALA_ACAO_TIPO_OPCOES_TODAS,
  ESCALA_TIME_OPCOES,
  OFERTA_STATUS_LABEL,
  RH_CALENDARIO_ACAO_LABEL_FORMAL,
  type EscalaAcaoFiltro,
  type EscalaTimeFiltro,
  type LinhaOfertaMarketplace,
  type OfertaStatusUi,
} from "../../../lib/escalaTurnosUiConstants";
import type { RhCalendarioAcaoTipo } from "../../../lib/rhCalendarioAcaoHelpers";
import { MesCarrosselPeriodo, mesReferenciaInicialCarrossel, type MesRef } from "../components/MesCarrosselPeriodo";

const MOCK_OFERTAS: LinhaOfertaMarketplace[] = [];

function inicioFimMesUtc(ano: number, mes0: number): { ini: string; fim: string } {
  const ini = new Date(Date.UTC(ano, mes0, 1));
  const fim = new Date(Date.UTC(ano, mes0 + 1, 0));
  const p2 = (n: number) => String(n).padStart(2, "0");
  return {
    ini: `${ini.getUTCFullYear()}-${p2(ini.getUTCMonth() + 1)}-${p2(ini.getUTCDate())}`,
    fim: `${fim.getUTCFullYear()}-${p2(fim.getUTCMonth() + 1)}-${p2(fim.getUTCDate())}`,
  };
}

function dataIsoNoMes(dataIso: string, ano: number, mes0: number): boolean {
  const s = dataIso.slice(0, 10);
  const { ini, fim } = inicioFimMesUtc(ano, mes0);
  return s >= ini && s <= fim;
}

function passaFiltroTipo(row: LinhaOfertaMarketplace, filtro: EscalaAcaoFiltro): boolean {
  if (filtro === "todos") return true;
  return row.tipo === filtro;
}

function passaFiltroTime(row: LinhaOfertaMarketplace, filtro: EscalaTimeFiltro): boolean {
  if (filtro === "todos") return true;
  return row.timeKey === filtro;
}

function filtrarPorMesRef(rows: LinhaOfertaMarketplace[], ref: MesRef): LinhaOfertaMarketplace[] {
  return rows.filter((r) => dataIsoNoMes(r.dataOfertaIso, ref.ano, ref.mes0));
}

export default function EscalaMarketplaceTurnosPage() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_marketplace_turnos");

  const hoje = useMemo(() => new Date(), []);
  const [refMes, setRefMes] = useState<MesRef>(() => mesReferenciaInicialCarrossel(hoje));
  const [aba, setAba] = useState<"todas" | "minhas">("todas");
  const [filtroTipoTodas, setFiltroTipoTodas] = useState<EscalaAcaoFiltro>("todos");
  const [filtroTimeTodas, setFiltroTimeTodas] = useState<EscalaTimeFiltro>("todos");
  const [filtroTipoMinhas, setFiltroTipoMinhas] = useState<Exclude<EscalaAcaoFiltro, "todos">>("venda_turno");

  const linhasMes = useMemo(() => filtrarPorMesRef(MOCK_OFERTAS, refMes), [refMes]);

  const linhasVendasTodas = useMemo(() => {
    return linhasMes.filter(
      (r) =>
        (r.tipo === "venda_turno" || r.tipo === "venda_folga") &&
        passaFiltroTipo(r, filtroTipoTodas) &&
        passaFiltroTime(r, filtroTimeTodas),
    );
  }, [linhasMes, filtroTipoTodas, filtroTimeTodas]);

  const linhasTrocaTodas = useMemo(() => {
    return linhasMes.filter(
      (r) => r.tipo === "oferta_troca" && passaFiltroTipo(r, filtroTipoTodas) && passaFiltroTime(r, filtroTimeTodas),
    );
  }, [linhasMes, filtroTipoTodas, filtroTimeTodas]);

  const minhasBase = useMemo(() => {
    return linhasMes.filter((r) => passaFiltroTipo(r, filtroTipoMinhas));
  }, [linhasMes, filtroTipoMinhas]);

  const porStatus = (s: OfertaStatusUi) => minhasBase.filter((r) => r.status === s);

  const selectStyle = {
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    minWidth: 160,
    cursor: "pointer" as const,
  };

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ padding: 24, color: t.textMuted, fontFamily: FONT.body }}>
        Carregando…
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const blocoFiltrosCard = (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        background: brand.blockBg,
        padding: "14px 18px",
        marginBottom: 18,
        display: "flex",
        flexWrap: "wrap",
        gap: 14,
        alignItems: "center",
      }}
    >
      <MesCarrosselPeriodo value={refMes} onChange={setRefMes} t={t} brand={brand} />
      {aba === "todas" && (
        <>
          <select
            aria-label="Filtrar por tipo de ação"
            value={filtroTipoTodas}
            onChange={(e) => setFiltroTipoTodas(e.target.value as EscalaAcaoFiltro)}
            style={selectStyle}
          >
            {ESCALA_ACAO_TIPO_OPCOES_TODAS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por time"
            value={filtroTimeTodas}
            onChange={(e) => setFiltroTimeTodas(e.target.value as EscalaTimeFiltro)}
            style={selectStyle}
          >
            {ESCALA_TIME_OPCOES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </>
      )}
      {aba === "minhas" && (
        <>
          <select
            aria-label="Filtrar por tipo de ação"
            value={filtroTipoMinhas}
            onChange={(e) => setFiltroTipoMinhas(e.target.value as Exclude<EscalaAcaoFiltro, "todos">)}
            style={selectStyle}
          >
            {ESCALA_ACAO_TIPO_OPCOES_MINHAS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: FONT.body,
              cursor: "pointer",
              color: "#fff",
              background: brand.useBrand
                ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
                : "linear-gradient(135deg, #4a2082, #1e36f8)",
            }}
          >
            Ofertar
          </button>
        </>
      )}
    </div>
  );

  function renderTabelaVendas(rows: LinhaOfertaMarketplace[]) {
    if (rows.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Sem dados para o período selecionado.
        </div>
      );
    }
    return (
      <div className="app-table-wrap">
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <caption style={{ display: "none" }}>Ofertas de vendas de turno ou folga</caption>
          <thead>
            <tr>
              {["Data da Oferta", "Tipo de Ação", "Turno da Oferta", "Operadora", "Ofertante", "Ações"].map((h) => (
                <th key={h} scope="col" style={getThStyle(t)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.dataOfertaIso}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {RH_CALENDARIO_ACAO_LABEL_FORMAL[r.tipo as RhCalendarioAcaoTipo] ?? r.tipo}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoOferta}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.operadora}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.ofertante}</td>
                <td style={getTdStyle(t, { textAlign: "center", background: zebraStripe(i) })}>
                  <button
                    type="button"
                    aria-label="Ações da oferta"
                    style={{
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg,
                      borderRadius: 8,
                      padding: 6,
                      cursor: "pointer",
                      color: t.text,
                    }}
                  >
                    <MoreHorizontal size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabelaTrocaTodas(rows: LinhaOfertaMarketplace[]) {
    if (rows.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Sem dados para o período selecionado.
        </div>
      );
    }
    const headers = [
      "Data da Oferta",
      "Turno da Oferta",
      "Operadora",
      "Ofertante",
      "Data de Interesse",
      "Turno de Interesse",
      "Ações",
    ];
    return (
      <div className="app-table-wrap">
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <caption style={{ display: "none" }}>Ofertas de troca</caption>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} scope="col" style={getThStyle(t)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.dataOfertaIso}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoOferta}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.operadora}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.ofertante}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {r.dataInteresseIso ?? "—"}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoInteresse ?? "—"}</td>
                <td style={getTdStyle(t, { textAlign: "center", background: zebraStripe(i) })}>
                  <button
                    type="button"
                    aria-label="Ações da oferta"
                    style={{
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg,
                      borderRadius: 8,
                      padding: 6,
                      cursor: "pointer",
                      color: t.text,
                    }}
                  >
                    <MoreHorizontal size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabelaMinhasComTipo(
    rows: LinhaOfertaMarketplace[],
    variant: "interessado" | "em_analise" | "aberto",
  ) {
    if (rows.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Sem dados para o período selecionado.
        </div>
      );
    }
    const headers =
      variant === "interessado"
        ? [
            "Data da Oferta",
            "Tipo de Ação",
            "Turno da Oferta",
            "Operadora",
            "Data de Interesse",
            "Turno de Interesse",
            "Comprador",
            "Ações",
          ]
        : variant === "em_analise"
          ? [
              "Data da Oferta",
              "Tipo de Ação",
              "Turno da Oferta",
              "Operadora",
              "Data de Interesse",
              "Turno de Interesse",
              "Comprador",
              "Status",
              "Ações",
            ]
          : [
              "Data da Oferta",
              "Tipo de Ação",
              "Turno da Oferta",
              "Operadora",
              "Data de Interesse",
              "Turno de Interesse",
              "Ações",
            ];
    return (
      <div className="app-table-wrap">
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <caption style={{ display: "none" }}>Minhas ofertas</caption>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} scope="col" style={getThStyle(t)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.dataOfertaIso}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {RH_CALENDARIO_ACAO_LABEL_FORMAL[r.tipo as RhCalendarioAcaoTipo] ?? r.tipo}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoOferta}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.operadora}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {r.dataInteresseIso ?? "—"}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoInteresse ?? "—"}</td>
                {variant !== "aberto" && (
                  <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.comprador ?? "—"}</td>
                )}
                {variant === "em_analise" && (
                  <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                    {r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}
                  </td>
                )}
                <td style={getTdStyle(t, { textAlign: "center", background: zebraStripe(i) })}>
                  <button
                    type="button"
                    aria-label="Ações da oferta"
                    style={{
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg,
                      borderRadius: 8,
                      padding: 6,
                      cursor: "pointer",
                      color: t.text,
                    }}
                  >
                    <MoreHorizontal size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabelaEncerradas(rows: LinhaOfertaMarketplace[]) {
    if (rows.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Sem dados para o período selecionado.
        </div>
      );
    }
    const cols = [
      "Data da Oferta",
      "Tipo de Ação",
      "Turno da Oferta",
      "Operadora",
      "Data de Interesse",
      "Turno de Interesse",
      "Comprador",
      "Status",
    ];
    return (
      <div className="app-table-wrap">
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <caption style={{ display: "none" }}>Ofertas encerradas</caption>
          <thead>
            <tr>
              {cols.map((h) => (
                <th key={h} scope="col" style={getThStyle(t)}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.dataOfertaIso}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {RH_CALENDARIO_ACAO_LABEL_FORMAL[r.tipo as RhCalendarioAcaoTipo] ?? r.tipo}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoOferta}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.operadora}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {r.dataInteresseIso ?? "—"}
                </td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.turnoInteresse ?? "—"}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.comprador ?? "—"}</td>
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                  {r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <DashboardPageHeader
        icon={<Store size={14} aria-hidden="true" />}
        title="Marketplace de Turnos"
        subtitle="Consulte ofertas de venda e troca de turnos, e acompanhe as suas próprias ofertas."
        brand={brand}
        t={t}
      />

      <div role="tablist" aria-label="Vista do marketplace" style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          role="tab"
          id="tab-mkt-todas"
          aria-selected={aba === "todas"}
          aria-controls="panel-mkt-todas"
          onClick={() => setAba("todas")}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            border: `1px solid ${aba === "todas" ? brand.accent : t.cardBorder}`,
            background:
              aba === "todas"
                ? brand.accent.startsWith("var(")
                  ? "color-mix(in srgb, var(--brand-action, #7c3aed) 14%, transparent)"
                  : `${String(brand.accent)}20`
                : t.inputBg,
            color: aba === "todas" ? brand.accent : t.textMuted,
            fontSize: 13,
            fontWeight: aba === "todas" ? 800 : 600,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Todas as Ofertas
        </button>
        <button
          type="button"
          role="tab"
          id="tab-mkt-minhas"
          aria-selected={aba === "minhas"}
          aria-controls="panel-mkt-minhas"
          onClick={() => setAba("minhas")}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            border: `1px solid ${aba === "minhas" ? brand.accent : t.cardBorder}`,
            background:
              aba === "minhas"
                ? brand.accent.startsWith("var(")
                  ? "color-mix(in srgb, var(--brand-action, #7c3aed) 14%, transparent)"
                  : `${String(brand.accent)}20`
                : t.inputBg,
            color: aba === "minhas" ? brand.accent : t.textMuted,
            fontSize: 13,
            fontWeight: aba === "minhas" ? 800 : 600,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Minhas Ofertas
        </button>
      </div>

      {aba === "todas" && (
        <div role="tabpanel" id="panel-mkt-todas" aria-labelledby="tab-mkt-todas">
          {blocoFiltrosCard}
          <SectionTitle icon={<List size={14} aria-hidden="true" />}>Ofertas de Vendas</SectionTitle>
          {renderTabelaVendas(linhasVendasTodas)}
          <div style={{ height: 22 }} />
          <SectionTitle icon={<List size={14} aria-hidden="true" />}>Ofertas de Troca</SectionTitle>
          {renderTabelaTrocaTodas(linhasTrocaTodas)}
        </div>
      )}

      {aba === "minhas" && (
        <div role="tabpanel" id="panel-mkt-minhas" aria-labelledby="tab-mkt-minhas">
          {blocoFiltrosCard}
          <SectionTitle icon={<List size={14} aria-hidden="true" />} sub="status Interessado">
            Ofertas em análise
          </SectionTitle>
          {renderTabelaMinhasComTipo(porStatus("interessado"), "interessado")}
          <div style={{ height: 22 }} />
          <SectionTitle icon={<List size={14} aria-hidden="true" />} sub="status Em análise">
            Ofertas em aprovação
          </SectionTitle>
          {renderTabelaMinhasComTipo(porStatus("em_analise"), "em_analise")}
          <div style={{ height: 22 }} />
          <SectionTitle icon={<List size={14} aria-hidden="true" />} sub="status Aberto">
            Ofertas abertas
          </SectionTitle>
          {renderTabelaMinhasComTipo(porStatus("aberto"), "aberto")}
          <div style={{ height: 22 }} />
          <SectionTitle icon={<List size={14} aria-hidden="true" />} sub="Aprovada ou Recusada">
            Ofertas encerradas
          </SectionTitle>
          {renderTabelaEncerradas(minhasBase.filter((r) => r.status === "aprovada" || r.status === "recusada"))}
        </div>
      )}
    </div>
  );
}
