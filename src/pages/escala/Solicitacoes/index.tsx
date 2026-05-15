import { useMemo, useState } from "react";
import { ClipboardList, MoreHorizontal } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { DashboardPageHeader, SectionTitle } from "../../../components/dashboard";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
import {
  ESCALA_ACAO_TIPO_OPCOES_TODAS,
  ESCALA_TIME_OPCOES,
  OFERTA_STATUS_LABEL,
  RH_CALENDARIO_ACAO_LABEL_FORMAL,
  type EscalaAcaoFiltro,
  type EscalaTimeFiltro,
  type LinhaOfertaMarketplace,
} from "../../../lib/escalaTurnosUiConstants";
import type { RhCalendarioAcaoTipo } from "../../../lib/rhCalendarioAcaoHelpers";
import { MesCarrosselPeriodo, mesReferenciaInicialCarrossel, type MesRef } from "../components/MesCarrosselPeriodo";

const MOCK_SOLICITACOES: LinhaOfertaMarketplace[] = [];

const MOCK_STAFF: { id: string; nome: string; time: EscalaTimeFiltro }[] = [
  { id: "s1", nome: "Ana Costa", time: "customer_service" },
  { id: "s2", nome: "Bruno Silva", time: "customer_service" },
  { id: "s3", nome: "Carla Mendes", time: "game_presenter" },
  { id: "s4", nome: "Diego Ramos", time: "shift_leader" },
];

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

export default function EscalaSolicitacoesPage() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_solicitacoes");

  const hoje = useMemo(() => new Date(), []);
  const [aba, setAba] = useState<"aberto" | "arquivadas">("aberto");
  const [refMesArq, setRefMesArq] = useState<MesRef>(() => mesReferenciaInicialCarrossel(hoje));
  const [filtroTipo, setFiltroTipo] = useState<EscalaAcaoFiltro>("todos");
  const [filtroTime, setFiltroTime] = useState<EscalaTimeFiltro>("todos");
  const [buscaStaff, setBuscaStaff] = useState("");
  const [staffId, setStaffId] = useState<string>("");

  const staffFiltrado = useMemo(() => {
    const q = buscaStaff.trim().toLowerCase();
    return MOCK_STAFF.filter((s) => {
      if (filtroTime !== "todos" && s.time !== filtroTime) return false;
      if (q && !s.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [buscaStaff, filtroTime]);

  const linhasBase = MOCK_SOLICITACOES;

  const linhasAberto = useMemo(() => {
    return linhasBase.filter(
      (r) =>
        r.status === "em_analise" &&
        passaFiltroTipo(r, filtroTipo) &&
        passaFiltroTime(r, filtroTime) &&
        (!staffId || r.solicitanteStaffId === staffId),
    );
  }, [linhasBase, filtroTipo, filtroTime, staffId]);

  const linhasArquivadas = useMemo(() => {
    return linhasBase.filter(
      (r) =>
        (r.status === "cancelada" || r.status === "aprovada" || r.status === "recusada") &&
        dataIsoNoMes(r.dataOfertaIso, refMesArq.ano, refMesArq.mes0) &&
        passaFiltroTipo(r, filtroTipo) &&
        passaFiltroTime(r, filtroTime) &&
        (!staffId || r.solicitanteStaffId === staffId),
    );
  }, [linhasBase, refMesArq, filtroTipo, filtroTime, staffId]);

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

  function renderTabelaSolicitacoes(rows: LinhaOfertaMarketplace[], comStatus: boolean) {
    if (rows.length === 0) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Sem dados para o período selecionado.
        </div>
      );
    }
    const headers = [
      "Data da Oferta",
      "Tipo de Ação",
      "Turno da Oferta",
      "Operadora",
      "Data de Interesse",
      "Turno de Interesse",
      "Comprador",
      ...(comStatus ? (["Status"] as const) : []),
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
          <caption style={{ display: "none" }}>Solicitações</caption>
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
                <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>{r.comprador ?? "—"}</td>
                {comStatus && (
                  <td style={getTdStyle(t, { textAlign: "left", background: zebraStripe(i) })}>
                    {r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}
                  </td>
                )}
                <td style={getTdStyle(t, { textAlign: "center", background: zebraStripe(i) })}>
                  <button
                    type="button"
                    aria-label="Ações da solicitação"
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

  const blocoFiltrosComum = (
    <>
      <select
        aria-label="Filtrar por tipo de ação"
        value={filtroTipo}
        onChange={(e) => setFiltroTipo(e.target.value as EscalaAcaoFiltro)}
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
        value={filtroTime}
        onChange={(e) => {
          setFiltroTime(e.target.value as EscalaTimeFiltro);
          setStaffId("");
        }}
        style={selectStyle}
      >
        {ESCALA_TIME_OPCOES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div style={{ flex: "1 1 220px", minWidth: 200 }}>
        <label htmlFor="escala-sol-staff-busca" style={{ display: "block", fontSize: 11, color: t.textMuted, marginBottom: 6 }}>
          Pesquisar staff por nome
        </label>
        <input
          id="escala-sol-staff-busca"
          type="search"
          value={buscaStaff}
          onChange={(e) => setBuscaStaff(e.target.value)}
          placeholder="Nome…"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "8px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontSize: 13,
            fontFamily: FONT.body,
            marginBottom: 8,
          }}
        />
        <div
          role="listbox"
          aria-label="Selecionar colaborador"
          style={{
            maxHeight: 140,
            overflowY: "auto",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
          }}
        >
          <button
            type="button"
            role="option"
            aria-selected={staffId === ""}
            onClick={() => setStaffId("")}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 12px",
              border: "none",
              borderBottom: `1px solid ${t.cardBorder}`,
              background: staffId === "" ? "color-mix(in srgb, var(--brand-action, #7c3aed) 10%, transparent)" : "transparent",
              color: t.text,
              fontSize: 13,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
          >
            Todos
          </button>
          {staffFiltrado.map((s) => (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={staffId === s.id}
              onClick={() => setStaffId(s.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                border: "none",
                borderBottom: `1px solid ${t.cardBorder}`,
                background: staffId === s.id ? "color-mix(in srgb, var(--brand-action, #7c3aed) 10%, transparent)" : "transparent",
                color: t.text,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              {s.nome}
            </button>
          ))}
        </div>
      </div>
    </>
  );

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

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <DashboardPageHeader
        icon={<ClipboardList size={14} aria-hidden="true" />}
        title="Solicitações"
        subtitle="Acompanhe solicitações em aberto e o histórico arquivado por período, time e colaborador."
        brand={brand}
        t={t}
      />

      <div role="tablist" aria-label="Estado das solicitações" style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          role="tab"
          id="tab-sol-aberto"
          aria-selected={aba === "aberto"}
          aria-controls="panel-sol-aberto"
          onClick={() => setAba("aberto")}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            border: `1px solid ${aba === "aberto" ? brand.accent : t.cardBorder}`,
            background:
              aba === "aberto"
                ? brand.accent.startsWith("var(")
                  ? "color-mix(in srgb, var(--brand-action, #7c3aed) 14%, transparent)"
                  : `${String(brand.accent)}20`
                : t.inputBg,
            color: aba === "aberto" ? brand.accent : t.textMuted,
            fontSize: 13,
            fontWeight: aba === "aberto" ? 800 : 600,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Solicitações em Aberto
        </button>
        <button
          type="button"
          role="tab"
          id="tab-sol-arq"
          aria-selected={aba === "arquivadas"}
          aria-controls="panel-sol-arq"
          onClick={() => setAba("arquivadas")}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            border: `1px solid ${aba === "arquivadas" ? brand.accent : t.cardBorder}`,
            background:
              aba === "arquivadas"
                ? brand.accent.startsWith("var(")
                  ? "color-mix(in srgb, var(--brand-action, #7c3aed) 14%, transparent)"
                  : `${String(brand.accent)}20`
                : t.inputBg,
            color: aba === "arquivadas" ? brand.accent : t.textMuted,
            fontSize: 13,
            fontWeight: aba === "arquivadas" ? 800 : 600,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Solicitações Arquivadas
        </button>
      </div>

      {aba === "aberto" && (
        <div role="tabpanel" id="panel-sol-aberto" aria-labelledby="tab-sol-aberto">
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
              alignItems: "flex-end",
            }}
          >
            {blocoFiltrosComum}
          </div>
          <SectionTitle icon={<ClipboardList size={14} aria-hidden="true" />}>Solicitações</SectionTitle>
          {renderTabelaSolicitacoes(linhasAberto, false)}
        </div>
      )}

      {aba === "arquivadas" && (
        <div role="tabpanel" id="panel-sol-arq" aria-labelledby="tab-sol-arq">
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
            <MesCarrosselPeriodo value={refMesArq} onChange={setRefMesArq} t={t} brand={brand} />
            {blocoFiltrosComum}
          </div>
          <SectionTitle icon={<ClipboardList size={14} aria-hidden="true" />}>Solicitações</SectionTitle>
          {renderTabelaSolicitacoes(linhasArquivadas, true)}
        </div>
      )}
    </div>
  );
}
