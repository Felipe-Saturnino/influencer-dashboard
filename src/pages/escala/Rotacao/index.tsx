import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, Table2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import {
  DashboardPageHeader,
  FiltroBarTabButton,
  FiltroEstudioSelect,
  FiltroHojeButton,
  FiltroTurnoSelect,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
  SectionTitle,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { getFilterBarRowStyle } from "../../../lib/filterBarStyles";
import { getPageContentBoxStyle, getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { ESTUDIO_FILTRO_TODOS_VALUE } from "../../../components/FiltroEstudioSelect";
import {
  carregarContextoRotacaoDia,
  carregarRotacaoPublicada,
  corMesaPorTipoJogo,
  diaIsoLocal,
  formatDiaRotacaoLabel,
  gerarPatternRotacao,
  gerarSlotsRotacao,
  listarEstudiosAtivosRotacao,
  publicarRotacao,
  ROTACAO_MODELOS,
  ROTACAO_TURNO_OPCOES,
  shiftDiaIso,
  slotMinutosPermitido,
  sugerirModeloN,
  type RotacaoContextoDia,
  type RotacaoGpPool,
  type RotacaoModeloN,
  type RotacaoPublicada,
  type RotacaoTurnoKey,
} from "../../../lib/escalaRotacao";

const SUBTITULO =
  "Gere e consulte a rotação de Game Presenters nas mesas por turno e estúdio.";

type PreviaState = {
  slots: string[];
  gps: RotacaoGpPool[];
  faltosos: RotacaoGpPool[];
  matrix: string[][];
  modeloN: number;
  slotMin: number;
  mesaTipo: Record<string, string>;
};

function CellValor({
  valor,
  mesaTipo,
}: {
  valor: string;
  mesaTipo: Record<string, string>;
}) {
  if (valor === "B") {
    return (
      <span
        style={{
          display: "inline-flex",
          padding: "3px 7px",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 11,
          background: "color-mix(in srgb, #f59e0b 18%, transparent)",
          color: "#b45309",
          border: "1px solid color-mix(in srgb, #f59e0b 40%, transparent)",
        }}
      >
        B
      </span>
    );
  }
  if (valor === "F") {
    return (
      <span
        style={{
          display: "inline-flex",
          padding: "3px 7px",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 11,
          background: "color-mix(in srgb, #e84025 15%, transparent)",
          color: "#e84025",
          border: "1px solid color-mix(in srgb, #e84025 35%, transparent)",
        }}
      >
        F
      </span>
    );
  }
  if (!valor || valor === "—") return <span style={{ color: "#6b7280" }}>—</span>;
  const cor = corMesaPorTipoJogo(mesaTipo[valor] ?? "");
  return (
    <span
      title={valor}
      style={{
        display: "inline-flex",
        padding: "3px 7px",
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 11,
        background: `color-mix(in srgb, ${cor} 15%, transparent)`,
        color: cor,
        border: `1px solid color-mix(in srgb, ${cor} 35%, transparent)`,
      }}
    >
      {valor}
    </span>
  );
}

function GradeRotacao({
  slots,
  gps,
  faltosos,
  matrix,
  mesaTipo,
  dataTable,
  t,
}: {
  slots: string[];
  gps: { nomeExibicao: string; nickname: string }[];
  faltosos: { nomeExibicao: string; nickname: string }[];
  matrix: string[][];
  mesaTipo: Record<string, string>;
  dataTable: ReturnType<typeof useDataTableBlock>;
  t: { cardBorder: string };
}) {
  return (
    <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
      <table style={getDataTableStyle({ minWidth: 720 })}>
        <caption style={{ display: "none" }}>Rotação por slot e Game Presenter</caption>
        <thead>
          <tr>
            <th
              scope="colgroup"
              colSpan={2}
              style={{ ...dataTable.thHeaderSticky, textAlign: "center", left: 0 }}
            >
              Game Presenter
            </th>
            {slots.map((s) => (
              <th key={s} scope="col" style={dataTable.thHeader} rowSpan={2}>
                {s}
              </th>
            ))}
          </tr>
          <tr>
            <th scope="col" style={{ ...dataTable.thHeaderSticky, left: 0, minWidth: 140 }}>
              Nome
            </th>
            <th
              scope="col"
              style={{
                ...dataTable.thHeaderSticky,
                left: 140,
                minWidth: 100,
                boxShadow: "2px 0 4px rgba(0,0,0,.06)",
              }}
            >
              Nickname
            </th>
          </tr>
        </thead>
        <tbody>
          {gps.map((g, i) => (
            <tr key={`gp-${i}`} style={{ background: dataTable.zebraRow(i) }}>
              <td style={{ ...dataTable.tdSticky, textAlign: "left", left: 0 }} title={g.nomeExibicao}>
                {g.nomeExibicao}
              </td>
              <td
                style={{
                  ...dataTable.tdSticky,
                  left: 140,
                  boxShadow: "2px 0 4px rgba(0,0,0,.06)",
                }}
              >
                {g.nickname}
              </td>
              {(matrix[i] ?? []).map((v, si) => (
                <td key={si} style={dataTable.tdCenter}>
                  <CellValor valor={v} mesaTipo={mesaTipo} />
                </td>
              ))}
            </tr>
          ))}
          {faltosos.map((g, i) => (
            <tr key={`f-${i}`} style={{ background: dataTable.zebraRow(gps.length + i) }}>
              <td style={{ ...dataTable.tdSticky, textAlign: "left", left: 0 }}>{g.nomeExibicao}</td>
              <td
                style={{
                  ...dataTable.tdSticky,
                  left: 140,
                  boxShadow: "2px 0 4px rgba(0,0,0,.06)",
                }}
              >
                {g.nickname}
              </td>
              {slots.map((s) => (
                <td key={s} style={dataTable.tdCenter}>
                  <CellValor valor="F" mesaTipo={mesaTipo} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 10, borderTop: `1px solid ${t.cardBorder}`, paddingTop: 10 }}>
        B = Break · F = Falta · IDs = mesa_identificacao (Gestão de Mesas)
      </div>
    </div>
  );
}

export default function EscalaRotacaoPage() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_rotacao");
  const dataTable = useDataTableBlock();
  const [aba, setAba] = useRouteTab("escala_rotacao", "gerar", ["gerar", "atual"] as const);

  const hojeIso = useMemo(() => diaIsoLocal(new Date()), []);
  const [diaIso, setDiaIso] = useState(hojeIso);
  const [turno, setTurno] = useState<RotacaoTurnoKey>("noite");
  const [estudio, setEstudio] = useState(ESTUDIO_FILTRO_TODOS_VALUE);
  const [estudios, setEstudios] = useState<{ slug: string; nome: string }[]>([]);

  const [ctx, setCtx] = useState<RotacaoContextoDia | null>(null);
  const [pool, setPool] = useState<RotacaoGpPool[]>([]);
  const [loadingCtx, setLoadingCtx] = useState(false);
  const [erroCtx, setErroCtx] = useState<string | null>(null);

  const [modeloN, setModeloN] = useState<RotacaoModeloN>(7);
  const [slotMin, setSlotMin] = useState(30);
  const [previa, setPrevia] = useState<PreviaState | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [erroPub, setErroPub] = useState<string | null>(null);

  const [publicada, setPublicada] = useState<RotacaoPublicada | null>(null);
  const [loadingPub, setLoadingPub] = useState(false);
  const [erroPubLoad, setErroPubLoad] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const pageBox = getPageContentBoxStyle(brand, t);
  const estudioOk = estudio !== ESTUDIO_FILTRO_TODOS_VALUE && estudio !== "";

  useEffect(() => {
    if (perm.canView === "nao") return;
    void listarEstudiosAtivosRotacao().then((list) => {
      setEstudios(list);
      if (list.length === 1 && list[0]) setEstudio(list[0].slug);
    });
  }, [perm.canView]);

  const carregarCtx = useCallback(async () => {
    if (!estudioOk) {
      setCtx(null);
      setPool([]);
      setPrevia(null);
      return;
    }
    setLoadingCtx(true);
    setErroCtx(null);
    setPrevia(null);
    const res = await carregarContextoRotacaoDia({
      diaIso,
      turno,
      estudioSlug: estudio,
    });
    setLoadingCtx(false);
    if (!res.ok) {
      setErroCtx(res.erro);
      setCtx(null);
      setPool([]);
      return;
    }
    setCtx(res.data);
    setPool(res.data.gps.map((g) => ({ ...g })));
    const sug = sugerirModeloN(res.data.gps.length);
    setModeloN(sug);
    setSlotMin(slotMinutosPermitido(sug, 30));
  }, [diaIso, turno, estudio, estudioOk]);

  const carregarPub = useCallback(async () => {
    if (!estudioOk) {
      setPublicada(null);
      return;
    }
    setLoadingPub(true);
    setErroPubLoad(null);
    const res = await carregarRotacaoPublicada({
      diaIso,
      turno,
      estudioSlug: estudio,
    });
    setLoadingPub(false);
    if (!res.ok) {
      setErroPubLoad(res.erro);
      setPublicada(null);
      return;
    }
    setPublicada(res.data);
  }, [diaIso, turno, estudio, estudioOk]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void carregarCtx();
    void carregarPub();
  }, [perm.loading, perm.canView, carregarCtx, carregarPub]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const elegiveis = useMemo(() => pool.filter((g) => !g.falta), [pool]);
  const faltasCount = pool.length - elegiveis.length;

  const mesaTipoMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const mesa of ctx?.mesas ?? []) {
      if (mesa.mesaIdentificacao) m[mesa.mesaIdentificacao] = mesa.tipoJogo;
    }
    return m;
  }, [ctx]);

  const onModeloChange = (n: RotacaoModeloN) => {
    setModeloN(n);
    setSlotMin(slotMinutosPermitido(n, slotMin));
    setPrevia(null);
  };

  const handleGerar = () => {
    if (!ctx || !estudioOk) return;
    setErroPub(null);
    if (elegiveis.length < modeloN) {
      setErroPub(
        `Elegíveis (${elegiveis.length}) insuficientes para o modelo de ${modeloN} Game Presenters.`,
      );
      return;
    }
    if (!ctx.mesas.length) {
      setErroPub("Este estúdio não tem mesas cadastradas em Gestão de Mesas.");
      return;
    }
    const step = slotMinutosPermitido(modeloN, slotMin);
    const slots = gerarSlotsRotacao(ctx.turnoInicio, ctx.turnoFim, step);
    const used = elegiveis.slice(0, modeloN);
    const ids = ctx.mesas.map((m) => m.mesaIdentificacao).filter(Boolean);
    const matrix = gerarPatternRotacao(ids, modeloN, slots.length);
    setPrevia({
      slots,
      gps: used,
      faltosos: pool.filter((g) => g.falta),
      matrix,
      modeloN,
      slotMin: step,
      mesaTipo: mesaTipoMap,
    });
    setToast(`Prévia gerada · ${used.length} GPs · ${slots.length} slots de ${step} min`);
  };

  const handlePublicar = async () => {
    if (!ctx || !previa || !perm.canCriarOk) return;
    setPublicando(true);
    setErroPub(null);
    const celulas: {
      funcionario_id: string;
      nome_exibicao: string;
      nickname: string;
      linha_ordem: number;
      slot_inicio: string;
      valor: string;
    }[] = [];
    previa.gps.forEach((g, i) => {
      previa.slots.forEach((slot, si) => {
        celulas.push({
          funcionario_id: g.funcionarioId,
          nome_exibicao: g.nomeExibicao,
          nickname: g.nickname === "—" ? "" : g.nickname,
          linha_ordem: i,
          slot_inicio: slot,
          valor: previa.matrix[i]?.[si] ?? "—",
        });
      });
    });
    previa.faltosos.forEach((g, i) => {
      previa.slots.forEach((slot) => {
        celulas.push({
          funcionario_id: g.funcionarioId,
          nome_exibicao: g.nomeExibicao,
          nickname: g.nickname === "—" ? "" : g.nickname,
          linha_ordem: previa.gps.length + i,
          slot_inicio: slot,
          valor: "F",
        });
      });
    });
    const res = await publicarRotacao({
      diaIso,
      turno,
      estudioSlug: ctx.estudioSlug,
      estudioNome: ctx.estudioNome,
      modeloN: previa.modeloN,
      slotMinutos: previa.slotMin,
      turnoInicio: ctx.turnoInicio,
      turnoFim: ctx.turnoFim,
      celulas,
    });
    setPublicando(false);
    if (!res.ok) {
      setErroPub(res.erro);
      return;
    }
    setToast("Rotação publicada.");
    setAba("atual");
    void carregarPub();
  };

  if (perm.loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          <Loader2
            size={24}
            className="app-lucide-spin"
            color="var(--brand-primary, #7c3aed)"
            aria-hidden
            style={{ marginBottom: 12 }}
          />
          <div style={{ fontSize: 13 }}>Carregando…</div>
        </div>
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const tabs = [
    { id: "gerar" as const, label: "Gerar Rotação" },
    { id: "atual" as const, label: "Rotação Atual" },
  ];

  return (
    <div className="app-page-shell app-page-shell--pb64">
      <DashboardPageHeader
        brand={brand}
        t={t}
        icon={<PageMenuIcon pageKey="escala_rotacao" />}
        title={getPageMenuLabel("escala_rotacao")}
        subtitle={SUBTITULO}
      />

      <div style={getPageFilterBoxStyle(brand, t)}>
        <div style={getFilterBarRowStyle()}>
          <button
            type="button"
            aria-label="Dia anterior"
            style={getCarouselBtnNavStyle(t, false)}
            onClick={() => setDiaIso((d) => shiftDiaIso(d, -1))}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <span style={getCarouselPeriodLabelStyle(t, { minWidth: 180 })}>
            {formatDiaRotacaoLabel(diaIso)}
          </span>
          <button
            type="button"
            aria-label="Próximo dia"
            style={getCarouselBtnNavStyle(t, false)}
            onClick={() => setDiaIso((d) => shiftDiaIso(d, 1))}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
          <FiltroHojeButton active={diaIso === hojeIso} onClick={() => setDiaIso(hojeIso)} />
        </div>
        <div style={{ ...getFilterBarRowStyle(), marginTop: 10 }}>
          <FiltroTurnoSelect
            value={turno}
            onChange={(v) => setTurno(v as RotacaoTurnoKey)}
            options={ROTACAO_TURNO_OPCOES}
            showTodasOption={false}
            pill
          />
          <FiltroEstudioSelect
            value={estudio}
            onChange={setEstudio}
            estudios={estudios}
            pill
          />
        </div>
        <div
          role="tablist"
          aria-label="Abas da Rotação"
          style={{
            ...getFilterBarRowStyle(),
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${t.cardBorder}`,
          }}
          onKeyDown={(e) =>
            onFiltroBarTabsKeyDown(
              e,
              tabs.map((x) => x.id),
              (id) => setAba(id),
              (k) => `tab-rotacao-${k}`,
            )
          }
        >
          <FiltroBarTabButton
            id="tab-rotacao-gerar"
            active={aba === "gerar"}
            aria-controls="panel-rotacao-gerar"
            onClick={() => setAba("gerar")}
            icon={<Sparkles {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Gerar Rotação
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-rotacao-atual"
            active={aba === "atual"}
            aria-controls="panel-rotacao-atual"
            onClick={() => setAba("atual")}
            icon={<Table2 {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Rotação Atual
          </FiltroBarTabButton>
        </div>
      </div>

      {aba === "gerar" && (
        <div id="panel-rotacao-gerar" role="tabpanel" aria-labelledby="tab-rotacao-gerar">
          {!estudioOk ? (
            <div style={pageBox}>
              <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                Selecione um estúdio para gerar a rotação.
              </div>
            </div>
          ) : loadingCtx ? (
            <div style={pageBox}>
              <div style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body, padding: 24 }}>
                <Loader2 size={20} className="app-lucide-spin" aria-hidden /> Carregando…
              </div>
            </div>
          ) : (
            <>
              <div style={pageBox}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                  <SectionTitle sub="Escala aprovada 4×2 + Staff + Gestão de Mesas">
                    Pool do turno
                  </SectionTitle>
                  {perm.canCriarOk && (
                    <CtaCriarButton onClick={handleGerar}>Gerar prévia</CtaCriarButton>
                  )}
                </div>

                {erroCtx && (
                  <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginBottom: 12, fontFamily: FONT.body }}>
                    {erroCtx}
                  </div>
                )}

                {ctx && !ctx.escalaAprovada && (
                  <div
                    style={{
                      background: "color-mix(in srgb, #f59e0b 12%, transparent)",
                      border: "1px solid #f59e0b55",
                      color: "#92400e",
                      borderRadius: 10,
                      padding: "10px 14px",
                      marginBottom: 12,
                      fontSize: 12,
                      fontFamily: FONT.body,
                    }}
                  >
                    A escala de Game Presenter do mês ainda não está aprovada em Gestão de Escala. O pool fica vazio até a aprovação.
                  </div>
                )}

                {ctx && (
                  <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12, fontFamily: FONT.body }}>
                    Escala GP <strong style={{ color: t.text }}>4×2</strong>
                    {" · "}
                    {ctx.turnoLabel} · <strong style={{ color: t.text }}>{ctx.horarioTexto}</strong>
                    {" · "}
                    {ctx.estudioNome}
                    {" · "}
                    {ctx.mesas.length} mesa(s)
                  </div>
                )}

                <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 14 }}>
                  {[
                    { l: "Escalados", v: String(pool.length) },
                    { l: "Faltas", v: String(faltasCount), c: "#e84025" },
                    { l: "Elegíveis (N)", v: String(elegiveis.length) },
                    { l: "Horário 4×2", v: ctx?.horarioTexto ?? "—", sm: true },
                  ].map((k) => (
                    <div
                      key={k.l}
                      style={{
                        background: t.inputBg,
                        border: `1px solid ${t.cardBorder}`,
                        borderRadius: 12,
                        padding: "12px 14px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>
                        {k.l}
                      </div>
                      <div style={{ fontSize: k.sm ? 13 : 22, fontWeight: 800, color: k.c ?? brand.primary, fontFamily: FONT.body }}>
                        {k.v}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  {pool.length === 0 ? (
                    <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                      Nenhum Game Presenter escalado neste turno/estúdio.
                    </span>
                  ) : (
                    pool.map((g) => (
                      <button
                        key={g.funcionarioId}
                        type="button"
                        title={g.falta ? "Clique para marcar como elegível" : "Clique para marcar falta"}
                        onClick={() => {
                          setPool((prev) =>
                            prev.map((x) =>
                              x.funcionarioId === g.funcionarioId ? { ...x, falta: !x.falta } : x,
                            ),
                          );
                          setPrevia(null);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 999,
                          border: `1px solid ${g.falta ? "rgba(232,64,37,0.4)" : t.cardBorder}`,
                          background: t.inputBg,
                          fontSize: 12,
                          fontFamily: FONT.body,
                          cursor: "pointer",
                          opacity: g.falta ? 0.55 : 1,
                          textDecoration: g.falta ? "line-through" : "none",
                          color: t.text,
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: g.falta ? "#e84025" : "#22c55e",
                          }}
                        />
                        {g.nickname}
                        <span style={{ opacity: 0.65 }}>({g.nomeExibicao})</span>
                        {g.falta ? " · Falta" : ""}
                      </button>
                    ))
                  )}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
                  <div style={{ minWidth: 180 }}>
                    <label style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 4, fontFamily: FONT.body }}>
                      Modelo de rotação <span style={{ color: "#e84025" }}>*</span>
                    </label>
                    <select
                      value={modeloN}
                      onChange={(e) => onModeloChange(Number(e.target.value) as RotacaoModeloN)}
                      style={{
                        width: "100%",
                        padding: "9px 10px",
                        borderRadius: 8,
                        border: `1px solid ${t.cardBorder}`,
                        background: t.inputBg,
                        fontFamily: FONT.body,
                        color: t.text,
                      }}
                    >
                      {ROTACAO_MODELOS.map((n) => (
                        <option key={n} value={n}>
                          {n} Game Presenters
                        </option>
                      ))}
                    </select>
                  </div>
                  {(modeloN === 5 || modeloN === 6) && (
                    <div style={{ minWidth: 180 }}>
                      <label style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 4, fontFamily: FONT.body }}>
                        Duração por mesa <span style={{ color: "#e84025" }}>*</span>
                      </label>
                      <select
                        value={slotMin}
                        onChange={(e) => {
                          setSlotMin(Number(e.target.value));
                          setPrevia(null);
                        }}
                        style={{
                          width: "100%",
                          padding: "9px 10px",
                          borderRadius: 8,
                          border: `1px solid ${t.cardBorder}`,
                          background: t.inputBg,
                          fontFamily: FONT.body,
                          color: t.text,
                        }}
                      >
                        <option value={20}>20 minutos</option>
                        <option value={30}>30 minutos</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div style={pageBox}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                  <SectionTitle
                    sub={
                      previa
                        ? `${formatDiaRotacaoLabel(diaIso)} · ${ctx?.turnoLabel ?? ""} · ${ctx?.estudioNome ?? ""} · ${previa.modeloN} GPs · ${previa.slotMin} min`
                        : "gere para ver a grade"
                    }
                  >
                    Pré-visualização
                  </SectionTitle>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={!previa}
                      onClick={handleGerar}
                      style={{
                        padding: "10px 20px",
                        borderRadius: 10,
                        border: `1px solid color-mix(in srgb, var(--brand-primary, #7c3aed) 40%, transparent)`,
                        background: t.cardBg,
                        color: brand.primary,
                        fontWeight: 700,
                        fontFamily: FONT.body,
                        cursor: previa ? "pointer" : "not-allowed",
                        opacity: previa ? 1 : 0.5,
                      }}
                    >
                      Regenerar
                    </button>
                    {perm.canCriarOk && (
                      <button
                        type="button"
                        disabled={!previa || publicando}
                        onClick={() => void handlePublicar()}
                        style={{
                          padding: "10px 20px",
                          borderRadius: 10,
                          border: 0,
                          background: "linear-gradient(135deg, #4a2082, #1e36f8)",
                          color: "#fff",
                          fontWeight: 700,
                          fontFamily: FONT.body,
                          cursor: previa && !publicando ? "pointer" : "not-allowed",
                          opacity: previa && !publicando ? 1 : 0.5,
                        }}
                      >
                        {publicando ? "Publicando…" : "Publicar"}
                      </button>
                    )}
                  </div>
                </div>

                {erroPub && (
                  <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginBottom: 12, fontFamily: FONT.body }}>
                    {erroPub}
                  </div>
                )}

                {!previa ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    Sem prévia. Ajuste o pool e clique em <strong>Gerar prévia</strong>.
                  </div>
                ) : (
                  <GradeRotacao
                    slots={previa.slots}
                    gps={previa.gps}
                    faltosos={previa.faltosos}
                    matrix={previa.matrix}
                    mesaTipo={previa.mesaTipo}
                    dataTable={dataTable}
                    t={t}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {aba === "atual" && (
        <div id="panel-rotacao-atual" role="tabpanel" aria-labelledby="tab-rotacao-atual">
          <div style={pageBox}>
            <SectionTitle
              sub={`${formatDiaRotacaoLabel(diaIso)} · ${ROTACAO_TURNO_OPCOES.find((x) => x.value === turno)?.label ?? ""} · ${estudioOk ? (estudios.find((e) => e.slug === estudio)?.nome ?? estudio) : "Todos Estúdios"}`}
            >
              Rotação publicada
            </SectionTitle>

            {!estudioOk ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                Selecione um estúdio para consultar a rotação publicada.
              </div>
            ) : loadingPub ? (
              <div style={{ textAlign: "center", color: t.textMuted, fontFamily: FONT.body, padding: 24 }}>
                <Loader2 size={20} className="app-lucide-spin" aria-hidden /> Carregando…
              </div>
            ) : erroPubLoad ? (
              <div role="alert" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
                {erroPubLoad}
              </div>
            ) : !publicada ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                Sem rotação para o período selecionado.
              </div>
            ) : (
              <GradeRotacao
                slots={publicada.slots}
                gps={publicada.gps}
                faltosos={publicada.faltosos}
                matrix={publicada.matrix}
                mesaTipo={mesaTipoMap}
                dataTable={dataTable}
                t={t}
              />
            )}
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#1a1228",
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: FONT.body,
            zIndex: 30,
            maxWidth: 340,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
