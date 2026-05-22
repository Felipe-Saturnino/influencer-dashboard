import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, MoreHorizontal } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { DashboardPageHeader, SectionTitle } from "../../../components/dashboard";
import FiltroEntidadeMultiSelect from "../../../components/FiltroEntidadeMultiSelect";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
import {
  ESCALA_ACAO_TIPO_OPCOES_TODAS,
  ESCALA_TIME_OPCOES,
  ESCALA_TIME_SLUG_PARA_ROTULO_CALENDARIO,
  OFERTA_STATUS_LABEL,
  RH_CALENDARIO_ACAO_LABEL_FORMAL,
  type EscalaAcaoFiltro,
  type EscalaTimeFiltro,
  type LinhaOfertaMarketplace,
} from "../../../lib/escalaTurnosUiConstants";
import type { RhCalendarioAcaoTipo } from "../../../lib/rhCalendarioAcaoHelpers";
import {
  getMesesDisponiveisEscalaCarrossel,
  idxMesInicialEscalaCarrossel,
} from "../../../lib/escalaMesCarrosselOverviewStyle";
import { MesCarrosselPeriodo } from "../components/MesCarrosselPeriodo";
import { supabase } from "../../../lib/supabase";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import {
  normalizarSelecaoUnica,
  TREINAMENTO_FILTRO_ID,
  normalizarNomeCalFiltro,
  timeRowPorRotuloCanonica,
  prestadorAtendeFiltroTime,
  type StaffTimeRow,
} from "../../../lib/rhCalendarioStaffFiltroHelpers";
import { buscarRhFuncionarioAtivoPorEmailLogin } from "../../../lib/rhFuncionarioLoginMatch";
import { BRAND } from "../../../lib/dashboardConstants";

const MOCK_SOLICITACOES: LinhaOfertaMarketplace[] = [];

const MSG_VAZIO_SOLICITACOES = "Sem solicitações para os filtros selecionados.";

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

function filtrarPorMesEscala(rows: LinhaOfertaMarketplace[], ano: number, mes0: number): LinhaOfertaMarketplace[] {
  return rows.filter((r) => dataIsoNoMes(r.dataOfertaIso, ano, mes0));
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
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_solicitacoes");
  const soProprios = !perm.loading && perm.canView === "proprios";

  const [times, setTimes] = useState<StaffTimeRow[]>([]);
  const [prestadores, setPrestadores] = useState<RhFuncionario[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [erroStaff, setErroStaff] = useState<string | null>(null);
  const [treinamentoGerenciaId, setTreinamentoGerenciaId] = useState<string | null>(null);
  const [treinamentoTimeIdsList, setTreinamentoTimeIdsList] = useState<string[]>([]);

  const hoje = useMemo(() => new Date(), []);
  const mesesDisponiveis = useMemo(() => getMesesDisponiveisEscalaCarrossel(hoje), [hoje]);
  const [idxMes, setIdxMes] = useState(() => idxMesInicialEscalaCarrossel(getMesesDisponiveisEscalaCarrossel(new Date()), new Date()));

  useEffect(() => {
    setIdxMes((i) => Math.min(Math.max(0, i), Math.max(0, mesesDisponiveis.length - 1)));
  }, [mesesDisponiveis.length]);

  const [aba, setAba] = useState<"aberto" | "arquivadas">("aberto");
  const [filtroTipo, setFiltroTipo] = useState<EscalaAcaoFiltro>("todos");
  const [filtroTime, setFiltroTime] = useState<EscalaTimeFiltro>("todos");
  const [filtroStaffIds, setFiltroStaffIds] = useState<string[]>([]);

  const carregarTimes = useCallback(async () => {
    setErroStaff(null);
    const { data, error } = await supabase.rpc("rh_staff_times_filtrados");
    if (error) {
      setErroStaff("Não foi possível carregar os times de staff.");
      setTimes([]);
      return;
    }
    setTimes((data ?? []) as StaffTimeRow[]);
  }, []);

  const timeIds = useMemo(() => times.map((x) => x.id), [times]);
  const treinamentoTimeIds = useMemo(() => new Set(treinamentoTimeIdsList), [treinamentoTimeIdsList]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    if (perm.canView !== "sim" && perm.canView !== "proprios") return;
    if (perm.canView === "proprios") {
      setTimes([]);
      setErroStaff(null);
      return;
    }
    setLoadingStaff(true);
    void carregarTimes().finally(() => setLoadingStaff(false));
  }, [perm.loading, perm.canView, carregarTimes]);

  useEffect(() => {
    if (perm.loading || perm.canView !== "proprios") return;
    if (!user?.email?.trim()) {
      setPrestadores([]);
      setLoadingStaff(false);
      return;
    }
    let cancelled = false;
    setLoadingStaff(true);
    void (async () => {
      const row = await buscarRhFuncionarioAtivoPorEmailLogin(user.email!);
      if (cancelled) return;
      if (row) {
        setPrestadores([row]);
        setErroStaff(null);
      } else {
        setPrestadores([]);
        setErroStaff(null);
      }
      setLoadingStaff(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView, user?.email]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("rh_org_gerencias")
        .select("id, nome")
        .eq("status", "ativo")
        .ilike("nome", "%treinamento%");
      if (cancelled) return;
      if (error || !data?.length) {
        setTreinamentoGerenciaId(null);
        return;
      }
      const exato = data.find((r: { nome: string }) => normalizarNomeCalFiltro(r.nome) === "treinamento");
      setTreinamentoGerenciaId(exato?.id ?? data[0]!.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    if (perm.canView === "proprios") return;
    let cancelled = false;
    void (async () => {
      const idsStaff = times.map((x) => x.id);
      const merged = new Map<string, RhFuncionario>();

      if (idsStaff.length > 0) {
        const { data, error } = await supabase
          .from("rh_funcionarios")
          .select("*")
          .in("org_time_id", idsStaff)
          .in("status", ["ativo", "indisponivel"])
          .order("nome", { ascending: true });
        if (!cancelled && !error) (data ?? []).forEach((p: RhFuncionario) => merged.set(p.id, p));
      }

      let ttIdsLocal: string[] = [];
      if (treinamentoGerenciaId) {
        const { data: tt } = await supabase
          .from("rh_org_times")
          .select("id")
          .eq("gerencia_id", treinamentoGerenciaId)
          .eq("status", "ativo");
        ttIdsLocal = (tt ?? []).map((r: { id: string }) => r.id);
        if (!cancelled) setTreinamentoTimeIdsList(ttIdsLocal);

        let q = supabase
          .from("rh_funcionarios")
          .select("*")
          .in("status", ["ativo", "indisponivel"])
          .order("nome", { ascending: true });
        if (ttIdsLocal.length > 0) {
          q = q.or(`org_gerencia_id.eq.${treinamentoGerenciaId},org_time_id.in.(${ttIdsLocal.join(",")})`);
        } else {
          q = q.eq("org_gerencia_id", treinamentoGerenciaId);
        }
        const { data: d2, error: e2 } = await q;
        if (!cancelled && !e2) (d2 ?? []).forEach((p: RhFuncionario) => merged.set(p.id, p));
      } else if (!cancelled) {
        setTreinamentoTimeIdsList([]);
      }

      if (!cancelled) {
        setPrestadores(
          [...merged.values()].sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR")),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView, times, treinamentoGerenciaId]);

  const filtroTimeCompIds = useMemo(() => {
    if (filtroTime === "todos") return [];
    if (filtroTime === "treinamento") return [TREINAMENTO_FILTRO_ID];
    const rotulo = ESCALA_TIME_SLUG_PARA_ROTULO_CALENDARIO[filtroTime];
    const row = timeRowPorRotuloCanonica(times, rotulo);
    return row ? [row.id] : [];
  }, [filtroTime, times]);

  const filtroTimeIdsReais = useMemo(() => {
    const allowed = new Set(timeIds);
    return new Set(filtroTimeCompIds.filter((id) => id !== TREINAMENTO_FILTRO_ID && allowed.has(id)));
  }, [filtroTimeCompIds, timeIds]);

  const treinamentoSelecionado = filtroTimeCompIds.includes(TREINAMENTO_FILTRO_ID);
  const filtroTimeAtivo = filtroTime !== "todos";

  const staffMultiselectItems = useMemo(() => {
    const opts = {
      filtroAtivo: filtroTimeAtivo,
      filtroTimeIdsReais,
      treinamentoSelecionado,
      treinamentoGerenciaId,
      treinamentoTimeIds,
    };
    return prestadores
      .filter((p) => prestadorAtendeFiltroTime(p, opts))
      .map((p) => ({ id: p.id, name: (p.nome ?? "").trim() || "—" }));
  }, [prestadores, filtroTimeAtivo, filtroTimeIdsReais, treinamentoSelecionado, treinamentoGerenciaId, treinamentoTimeIds]);

  useEffect(() => {
    if (prestadores.length === 0 || !filtroTimeAtivo) return;
    const opts = {
      filtroAtivo: true,
      filtroTimeIdsReais,
      treinamentoSelecionado,
      treinamentoGerenciaId,
      treinamentoTimeIds,
    };
    setFiltroStaffIds((prev) => {
      if (prev.length === 0) return prev;
      const allowedStaff = new Set(prestadores.filter((p) => prestadorAtendeFiltroTime(p, opts)).map((p) => p.id));
      const next = prev.filter((id) => allowedStaff.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [prestadores, filtroTimeAtivo, filtroTimeIdsReais, treinamentoSelecionado, treinamentoGerenciaId, treinamentoTimeIds, filtroTimeCompIds]);

  useEffect(() => {
    const allowedIds = new Set(staffMultiselectItems.map((x) => x.id));
    setFiltroStaffIds((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) => allowedIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [staffMultiselectItems]);

  const linhasBase = MOCK_SOLICITACOES;

  const staffFiltroId = filtroStaffIds[0];

  const linhasAberto = useMemo(() => {
    return linhasBase.filter(
      (r) =>
        r.status === "em_analise" &&
        passaFiltroTipo(r, filtroTipo) &&
        passaFiltroTime(r, filtroTime) &&
        (!staffFiltroId || r.solicitanteStaffId === staffFiltroId),
    );
  }, [linhasBase, filtroTipo, filtroTime, staffFiltroId]);

  const linhasArquivadas = useMemo(() => {
    const m = mesesDisponiveis[idxMes];
    const noMes = m ? filtrarPorMesEscala(linhasBase, m.ano, m.mes) : [];
    return noMes.filter(
      (r) =>
        (r.status === "cancelada" || r.status === "aprovada" || r.status === "recusada") &&
        passaFiltroTipo(r, filtroTipo) &&
        passaFiltroTime(r, filtroTime) &&
        (!staffFiltroId || r.solicitanteStaffId === staffFiltroId),
    );
  }, [linhasBase, mesesDisponiveis, idxMes, filtroTipo, filtroTime, staffFiltroId]);

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
          {MSG_VAZIO_SOLICITACOES}
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

  const blocoStaff = loadingStaff ? (
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
      <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color="var(--brand-primary, #7c3aed)" />
      {soProprios ? "Carregando…" : "Carregando staff…"}
    </span>
  ) : erroStaff ? (
    <span style={{ color: BRAND.vermelho, fontSize: 12, fontFamily: FONT.body }}>{erroStaff}</span>
  ) : (
    <div style={{ flex: "1 1 260px", minWidth: 220 }}>
      <FiltroEntidadeMultiSelect
        selected={filtroStaffIds}
        onChange={(ids) => setFiltroStaffIds(normalizarSelecaoUnica(filtroStaffIds, ids))}
        items={staffMultiselectItems}
        t={t}
        triggerEmptyLabel="Staff"
        ariaFilterPrefix="Filtrar por staff"
        listboxAriaLabel="Selecionar membro do staff"
        enableSearch
        searchPlaceholder="Pesquisar prestador…"
      />
    </div>
  );

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
          setFiltroStaffIds([]);
        }}
        style={selectStyle}
      >
        {ESCALA_TIME_OPCOES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {blocoStaff}
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
            <MesCarrosselPeriodo
              mesesDisponiveis={mesesDisponiveis}
              idxMes={idxMes}
              onIdxMesChange={setIdxMes}
              t={t}
              brand={{ blockBg: brand.blockBg, cardBorder: t.cardBorder }}
            />
            {blocoFiltrosComum}
          </div>
          <SectionTitle icon={<ClipboardList size={14} aria-hidden="true" />}>Solicitações</SectionTitle>
          {renderTabelaSolicitacoes(linhasArquivadas, true)}
        </div>
      )}
    </div>
  );
}
