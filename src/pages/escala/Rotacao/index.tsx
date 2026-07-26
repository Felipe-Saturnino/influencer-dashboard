import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
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
import { labelHorarioTurnoStaffPorValor } from "../../../lib/rhStaffHorarioTurno";
import {
  alocarEstudioRotacao,
  anexarCheckinRotacao,
  carregarContextoRotacaoDia,
  carregarRotacaoPublicada,
  corMesaRotacao,
  diaIsoLocal,
  formatDiaRotacaoLabel,
  gerarGradeRotacao,
  labelCargoLiderancaRotacao,
  labelsMesasRotacao,
  gerarSlotsRotacao,
  indiceProximoSlotRotacao,
  liderancaCompativelComTurnoRotacao,
  limparAlocacaoRotacao,
  listarEstudiosAtivosRotacao,
  mapaCoresMesasRotacao,
  publicarRotacao,
  ROTACAO_TURNO_OPCOES,
  salvarRascunhoRotacao,
  shiftDiaIso,
  type RotacaoContextoDia,
  type RotacaoGpPool,
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

const avisoBtnStyle = (t: { cardBorder: string; inputBg: string; text: string }, disabled?: boolean): CSSProperties => ({
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid color-mix(in srgb, #f59e0b 45%, transparent)",
  background: "color-mix(in srgb, #f59e0b 12%, transparent)",
  color: "#92400e",
  fontWeight: 700,
  fontSize: 12,
  fontFamily: FONT.body,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
});

function CellValor({
  valor,
  mesaTipo,
  mesaCores,
}: {
  valor: string;
  mesaTipo: Record<string, string>;
  mesaCores: Record<string, string>;
}) {
  if (valor === "Break" || valor === "B") {
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
        Break
      </span>
    );
  }
  if (valor === "X" || valor === "F") {
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
        X
      </span>
    );
  }
  if (!valor || valor === "—") return <span style={{ color: "#6b7280" }}>—</span>;
  const cor = mesaCores[valor] ?? corMesaRotacao(mesaTipo[valor] ?? "", valor);
  return (
    <span
      title={valor}
      style={{
        display: "inline-flex",
        padding: "3px 7px",
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 11,
        background: `color-mix(in srgb, ${cor} 18%, transparent)`,
        color: cor,
        border: `1px solid color-mix(in srgb, ${cor} 40%, transparent)`,
      }}
    >
      {valor}
    </span>
  );
}

const STICKY_GP_W = 168;

function BadgeCheckin({ chegou }: { chegou?: boolean | null }) {
  if (chegou === true) {
    return (
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          padding: "2px 6px",
          borderRadius: 6,
          background: "color-mix(in srgb, #22c55e 18%, transparent)",
          color: "#15803d",
          border: "1px solid #22c55e55",
          flexShrink: 0,
        }}
      >
        Chegou
      </span>
    );
  }
  if (chegou === false) {
    return (
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          padding: "2px 6px",
          borderRadius: 6,
          background: "color-mix(in srgb, #e84025 15%, transparent)",
          color: "#e84025",
          border: "1px solid #e8402544",
          flexShrink: 0,
        }}
      >
        Não chegou
      </span>
    );
  }
  return null;
}

function CelulaGpIdentidade({
  nome,
  nickname,
  textMuted,
  style,
  isShiftLead,
}: {
  nome: string;
  nickname: string;
  textMuted: string;
  style: CSSProperties;
  isShiftLead?: boolean;
}) {
  const nick = nickname.trim() && nickname !== "—" ? nickname : null;
  return (
    <td style={style} title={nick ? `${nome} · ${nick}` : nome}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, maxWidth: "100%" }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: 13,
              fontFamily: FONT.body,
              lineHeight: 1.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {nome}
          </span>
          {isShiftLead ? (
            <span
              style={{
                flexShrink: 0,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: 6,
                background: "color-mix(in srgb, #a78bfa 18%, transparent)",
                color: "#7c3aed",
                border: "1px solid #a78bfa55",
              }}
            >
              SL
            </span>
          ) : null}
        </div>
        {nick ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              fontFamily: FONT.body,
              color: textMuted,
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {nick}
          </span>
        ) : null}
      </div>
    </td>
  );
}

function GradeRotacao({
  slots,
  gps,
  faltosos,
  matrix,
  mesaTipo,
  mesaCores,
  dataTable,
  t,
}: {
  slots: string[];
  gps: { nomeExibicao: string; nickname: string; isShiftLead?: boolean }[];
  faltosos: { nomeExibicao: string; nickname: string }[];
  matrix: string[][];
  mesaTipo: Record<string, string>;
  mesaCores: Record<string, string>;
  dataTable: ReturnType<typeof useDataTableBlock>;
  t: { textMuted: string };
}) {
  const estiloStickyGp = (rowIndex: number): CSSProperties => ({
    ...dataTable.tdSticky({ rowIndex, minWidth: STICKY_GP_W }),
    left: 0,
    width: STICKY_GP_W,
    maxWidth: STICKY_GP_W,
    textAlign: "left",
    verticalAlign: "middle",
    padding: "8px 12px",
    zIndex: 3,
  });

  return (
    <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
      <table style={getDataTableStyle({ minWidth: 720 })}>
        <caption style={{ display: "none" }}>Rotação por slot e Game Presenter</caption>
        <thead>
          <tr>
            <th
              scope="col"
              style={{
                ...dataTable.thHeaderSticky,
                left: 0,
                width: STICKY_GP_W,
                minWidth: STICKY_GP_W,
                maxWidth: STICKY_GP_W,
                textAlign: "left",
                zIndex: 5,
                padding: "10px 12px",
              }}
            >
              Equipe
            </th>
            {slots.map((s) => (
              <th key={s} scope="col" style={dataTable.thHeader}>
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gps.map((g, i) => (
            <tr key={`gp-${i}`} style={{ background: dataTable.zebraRow(i) }}>
              <CelulaGpIdentidade
                nome={g.nomeExibicao}
                nickname={g.nickname}
                textMuted={t.textMuted}
                style={estiloStickyGp(i)}
                isShiftLead={g.isShiftLead}
              />
              {(matrix[i] ?? []).map((v, si) => (
                <td key={si} style={dataTable.tdCenter}>
                  <CellValor valor={v} mesaTipo={mesaTipo} mesaCores={mesaCores} />
                </td>
              ))}
            </tr>
          ))}
          {faltosos.map((g, i) => {
            const rowIndex = gps.length + i;
            return (
              <tr key={`f-${i}`} style={{ background: dataTable.zebraRow(rowIndex) }}>
                <CelulaGpIdentidade
                  nome={g.nomeExibicao}
                  nickname={g.nickname}
                  textMuted={t.textMuted}
                  style={estiloStickyGp(rowIndex)}
                />
                {slots.map((s) => (
                  <td key={s} style={dataTable.tdCenter}>
                    <CellValor valor="X" mesaTipo={mesaTipo} mesaCores={mesaCores} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
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
  const [poolSl, setPoolSl] = useState<RotacaoGpPool[]>([]);
  const [poolOutros, setPoolOutros] = useState<RotacaoGpPool[]>([]);
  const [liderancasDia, setLiderancasDia] = useState<RotacaoGpPool[]>([]);
  const [painelLiderancaAberto, setPainelLiderancaAberto] = useState(false);
  const [loadingCtx, setLoadingCtx] = useState(false);
  const [erroCtx, setErroCtx] = useState<string | null>(null);
  const [movendoId, setMovendoId] = useState<string | null>(null);

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
      setPoolSl([]);
      setPoolOutros([]);
      setLiderancasDia([]);
      setPainelLiderancaAberto(false);
      setPrevia(null);
      return;
    }
    setLoadingCtx(true);
    setErroCtx(null);
    setPrevia(null);
    setPainelLiderancaAberto(false);
    const res = await carregarContextoRotacaoDia({
      diaIso,
      turno,
      estudioSlug: estudio,
    });
    if (!res.ok) {
      setLoadingCtx(false);
      setErroCtx(res.erro);
      setCtx(null);
      setPool([]);
      setPoolSl([]);
      setPoolOutros([]);
      setLiderancasDia([]);
      return;
    }
    const todos = [
      ...res.data.gps,
      ...res.data.shiftLeads,
      ...res.data.gpsOutros,
      ...res.data.liderancas,
    ];
    const comCheckin = await anexarCheckinRotacao(diaIso, todos);
    const byId = new Map(comCheckin.map((p) => [p.funcionarioId, p]));
    setCtx(res.data);
    setPool(res.data.gps.map((g) => ({ ...(byId.get(g.funcionarioId) ?? g), isShiftLead: false })));
    setPoolSl(res.data.shiftLeads.map((g) => ({ ...(byId.get(g.funcionarioId) ?? g), isShiftLead: true })));
    setPoolOutros(res.data.gpsOutros.map((g) => ({ ...(byId.get(g.funcionarioId) ?? g), isShiftLead: false })));
    setLiderancasDia(
      res.data.liderancas.map((g) => ({ ...(byId.get(g.funcionarioId) ?? g), isShiftLead: true })),
    );
    setSlotMin(30);
    setLoadingCtx(false);
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
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const naoChegaram = useMemo(() => pool.filter((g) => g.chegou === false).length, [pool]);
  const disponiveis = useMemo(() => pool.filter((g) => g.chegou === true).length, [pool]);

  const liderancasCompativeis = useMemo(() => {
    const idsNoPool = new Set(poolSl.map((g) => g.funcionarioId));
    return liderancasDia.filter(
      (g) =>
        !idsNoPool.has(g.funcionarioId) &&
        liderancaCompativelComTurnoRotacao(turno, {
          horarioTurno: g.horarioTurno,
          gradeValor: g.gradeValor,
        }),
    );
  }, [liderancasDia, poolSl, turno]);

  const turnoLabelFiltro =
    ROTACAO_TURNO_OPCOES.find((x) => x.value === turno)?.label ?? ctx?.turnoLabel ?? "—";

  const mesaTipoMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const mesa of ctx?.mesas ?? []) {
      if (mesa.numeroMesa) m[mesa.numeroMesa] = mesa.tipoJogo;
    }
    return m;
  }, [ctx]);

  const mesaCoresMap = useMemo(() => mapaCoresMesasRotacao(ctx?.mesas ?? []), [ctx]);

  const estudiosDestino = useMemo(
    () => estudios.filter((e) => e.slug !== estudio),
    [estudios, estudio],
  );

  const candidatosReingresso = useMemo(() => {
    if (!previa) return [];
    const idsNaGrade = new Set(previa.gps.map((g) => g.funcionarioId));
    return pool.filter(
      (g) => g.chegou === true && (g.falta || !idsNaGrade.has(g.funcionarioId)),
    );
  }, [previa, pool]);

  const montarGrade = useCallback(
    (opts: {
      slot: number;
      gpsPool: RotacaoGpPool[];
      slPool: RotacaoGpPool[];
      preservarPassado: boolean;
    }): PreviaState | null => {
      if (!ctx || !estudioOk) return null;
      setErroPub(null);
      const usedGps = opts.gpsPool.filter((g) => !g.falta);
      const usedSl = opts.slPool.filter((g) => !g.falta);
      const numeros = labelsMesasRotacao(ctx.mesas);
      if (!numeros.length) {
        setErroPub("Este estúdio não tem mesas com Número da Mesa cadastrado em Gestão de Mesas.");
        return null;
      }
      if (usedGps.length + usedSl.length < numeros.length) {
        setErroPub(
          `Pessoas insuficientes (${usedGps.length} GPs + ${usedSl.length} Shift Lead) para cobrir ${numeros.length} mesa(s).`,
        );
        return null;
      }
      const step = opts.slot === 20 ? 20 : 30;
      const slots = gerarSlotsRotacao(ctx.turnoInicio, ctx.turnoFim, step);
      let fromSlot = 0;
      let matrixBase: string[][] | undefined;
      if (opts.preservarPassado && previa && diaIso === hojeIso && previa.slots.length === slots.length) {
        fromSlot = indiceProximoSlotRotacao(slots);
        if (fromSlot > 0) {
          // Alinha linhas da matrixBase aos ids atuais
          const baseById = new Map(previa.gps.map((g, i) => [g.funcionarioId, previa.matrix[i] ?? []]));
          const pessoasOrdem = [
            ...usedGps.map((g) => g.funcionarioId),
            ...usedSl.map((g) => g.funcionarioId),
          ];
          matrixBase = pessoasOrdem.map((id) => {
            const row = baseById.get(id);
            if (row) return [...row];
            return Array.from({ length: slots.length }, () => "Break");
          });
        }
      }
      const gerado = gerarGradeRotacao({
        mesasLabels: numeros,
        gps: usedGps.map((g) => ({ funcionarioId: g.funcionarioId, isShiftLead: false })),
        shiftLeads: usedSl.map((g) => ({ funcionarioId: g.funcionarioId, isShiftLead: true })),
        nSlots: slots.length,
        slotMinutos: step,
        fromSlotIndex: fromSlot > 0 ? fromSlot : undefined,
        matrixBase,
      });
      if (!gerado.ok) {
        setErroPub(gerado.erro);
        return null;
      }
      const porId = new Map<string, RotacaoGpPool>();
      for (const g of usedGps) porId.set(g.funcionarioId, g);
      for (const g of usedSl) porId.set(g.funcionarioId, g);
      const linhas = gerado.pessoas.map((p) => {
        const base = porId.get(p.funcionarioId);
        return (
          base ?? {
            funcionarioId: p.funcionarioId,
            nomeCompleto: "—",
            nomeExibicao: "—",
            nickname: "—",
            falta: false,
            isShiftLead: p.isShiftLead,
          }
        );
      });
      return {
        slots,
        gps: linhas,
        faltosos: [...opts.gpsPool.filter((g) => g.falta), ...opts.slPool.filter((g) => g.falta)],
        matrix: gerado.matrix,
        modeloN: usedGps.length,
        slotMin: step,
        mesaTipo: mesaTipoMap,
      };
    },
    [ctx, estudioOk, previa, diaIso, hojeIso, mesaTipoMap],
  );

  const persistirRascunho = (state: PreviaState) => {
    if (!ctx) return;
    const celulas = state.gps.flatMap((g, i) =>
      state.slots.map((slot, si) => ({
        funcionario_id: g.funcionarioId,
        nome_exibicao: g.nomeExibicao,
        nickname: g.nickname === "—" ? "" : g.nickname,
        linha_ordem: i,
        slot_inicio: slot,
        valor: state.matrix[i]?.[si] ?? "Break",
      })),
    );
    void salvarRascunhoRotacao({
      diaIso,
      turno,
      estudioSlug: ctx.estudioSlug,
      estudioNome: ctx.estudioNome,
      modeloN: state.modeloN,
      slotMinutos: state.slotMin,
      turnoInicio: ctx.turnoInicio,
      turnoFim: ctx.turnoFim,
      celulas,
    }).then((r) => {
      if (!r.ok) setToast("Prévia gerada, mas não foi possível salvar o rascunho.");
    });
  };

  const handleGerar = (preservarPassado = false) => {
    const state = montarGrade({
      slot: slotMin,
      gpsPool: pool,
      slPool: poolSl,
      preservarPassado,
    });
    if (!state) return;
    setPrevia(state);
    setSlotMin(state.slotMin);
    persistirRascunho(state);
    const slEmMesa = state.gps.reduce((acc, g, i) => {
      if (!g.isShiftLead) return acc;
      return acc + (state.matrix[i] ?? []).filter((v) => v !== "Break").length;
    }, 0);
    setToast(
      slEmMesa > 0
        ? `Prévia gerada · ${state.modeloN} GPs · Shift Lead cobriu ${slEmMesa} slot(s) · ${state.slots.length} horários · ${state.slotMin} min`
        : `Prévia gerada · ${state.modeloN} GPs · ${state.slots.length} slots de ${state.slotMin} min`,
    );
  };

  const handleAviso20 = () => {
    setSlotMin(20);
    const state = montarGrade({
      slot: 20,
      gpsPool: pool,
      slPool: poolSl,
      preservarPassado: Boolean(previa),
    });
    if (!state) return;
    setPrevia(state);
    persistirRascunho(state);
    setToast("Aviso aplicado: intervalo de 20 min.");
  };

  const handleIncluirLideranca = (pessoa: RotacaoGpPool) => {
    if (poolSl.some((g) => g.funcionarioId === pessoa.funcionarioId)) {
      setToast("Esta liderança já está na reserva.");
      return;
    }
    const nextSl = [
      ...poolSl,
      {
        ...pessoa,
        falta: false,
        isShiftLead: true,
      },
    ];
    setPoolSl(nextSl);
    setPainelLiderancaAberto(false);
    const state = montarGrade({
      slot: slotMin,
      gpsPool: pool,
      slPool: nextSl,
      preservarPassado: Boolean(previa),
    });
    if (!state) {
      setToast("Liderança incluída na reserva. Ajuste o pool e gere a prévia.");
      return;
    }
    setPrevia(state);
    persistirRascunho(state);
    setToast(`${labelCargoLiderancaRotacao(pessoa.cargoLideranca)} incluída na rotação.`);
  };

  const handleIncluirReingresso = (fid: string) => {
    const nextPool = pool.map((g) => (g.funcionarioId === fid ? { ...g, falta: false } : g));
    setPool(nextPool);
    const state = montarGrade({
      slot: slotMin,
      gpsPool: nextPool,
      slPool: poolSl,
      preservarPassado: true,
    });
    if (!state) return;
    setPrevia(state);
    persistirRascunho(state);
    setToast("Prestador incluído a partir do próximo slot.");
  };

  const handleMover = async (funcionarioId: string, destinoSlug: string) => {
    if (!destinoSlug) return;
    setMovendoId(funcionarioId);
    const res = await alocarEstudioRotacao({
      diaIso,
      turno,
      funcionarioId,
      estudioSlug: destinoSlug,
    });
    setMovendoId(null);
    if (!res.ok) {
      setErroPub(res.erro);
      return;
    }
    setToast("Alocação atualizada — o prestador passa o turno inteiro no estúdio de destino.");
    void carregarCtx();
  };

  const handleTrazer = async (funcionarioId: string) => {
    if (!estudioOk) return;
    setMovendoId(funcionarioId);
    const res = await alocarEstudioRotacao({
      diaIso,
      turno,
      funcionarioId,
      estudioSlug: estudio,
    });
    setMovendoId(null);
    if (!res.ok) {
      setErroPub(res.erro);
      return;
    }
    setToast("Prestador trazido para este estúdio no turno.");
    void carregarCtx();
  };

  const handleRestaurar = async (funcionarioId: string) => {
    setMovendoId(funcionarioId);
    const res = await limparAlocacaoRotacao({ diaIso, turno, funcionarioId });
    setMovendoId(null);
    if (!res.ok) {
      setErroPub(res.erro);
      return;
    }
    setToast("Estúdio restaurado conforme a Staff.");
    void carregarCtx();
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
          valor: "X",
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

  const chipBase = (falta: boolean, accent?: string): CSSProperties => ({
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 12,
    border: `1px solid ${falta ? "rgba(232,64,37,0.4)" : accent ?? t.cardBorder}`,
    background: accent && !falta ? `color-mix(in srgb, ${accent} 12%, transparent)` : t.inputBg,
    fontSize: 12,
    fontFamily: FONT.body,
    color: t.text,
    opacity: falta ? 0.55 : 1,
    maxWidth: 280,
  });

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
          <FiltroEstudioSelect value={estudio} onChange={setEstudio} estudios={estudios} pill />
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
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14, alignItems: "flex-start" }}>
                  <SectionTitle sub={`Escala Aprovada e Check-in do turno ${turnoLabelFiltro}`}>
                    Pool do turno
                  </SectionTitle>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(perm.canCriarOk || perm.canEditarOk) && (
                      <button
                        type="button"
                        aria-expanded={painelLiderancaAberto}
                        aria-controls="painel-incluir-lideranca"
                        disabled={!ctx}
                        onClick={() => setPainelLiderancaAberto((v) => !v)}
                        style={avisoBtnStyle(t, !ctx)}
                      >
                        Incluir Liderança
                      </button>
                    )}
                    {perm.canCriarOk && (
                      <CtaCriarButton onClick={() => handleGerar(false)}>Gerar prévia</CtaCriarButton>
                    )}
                  </div>
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
                    A escala de Game Presenter do mês ainda não está aprovada em Escala Estúdio. O pool fica vazio até a aprovação.
                  </div>
                )}

                {painelLiderancaAberto && (
                  <div
                    id="painel-incluir-lideranca"
                    role="region"
                    aria-label="Incluir liderança na rotação"
                    style={{
                      marginBottom: 14,
                      padding: 14,
                      borderRadius: 12,
                      border: "1px solid color-mix(in srgb, #f59e0b 40%, transparent)",
                      background: "color-mix(in srgb, #f59e0b 8%, transparent)",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, fontFamily: FONT.body, color: "#92400e" }}>
                      Shift Leaders e Service Managers escalados no dia · horário compatível com {turnoLabelFiltro} (08h–20h / 20h–08h)
                    </div>
                    {liderancasCompativeis.length === 0 ? (
                      <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                        Nenhuma liderança disponível para este turno. Confira a Escala Estúdio (Shift Leader / Service Manager) e o horário cadastrado.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {liderancasCompativeis.map((g) => (
                          <button
                            key={`lid-${g.funcionarioId}`}
                            type="button"
                            onClick={() => handleIncluirLideranca(g)}
                            style={{
                              display: "inline-flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: 4,
                              padding: "8px 12px",
                              borderRadius: 12,
                              border: "1px solid #a78bfa66",
                              background: t.cardBg,
                              cursor: "pointer",
                              fontFamily: FONT.body,
                              color: t.text,
                              textAlign: "left",
                            }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 700 }}>
                              {g.nickname} <span style={{ opacity: 0.65, fontWeight: 500 }}>({g.nomeExibicao})</span>
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              {labelCargoLiderancaRotacao(g.cargoLideranca)}
                              {g.horarioTurno ? ` · ${labelHorarioTurnoStaffPorValor(g.horarioTurno)}` : ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div
                  className="app-grid-kpi-4"
                  style={{ gap: 12, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}
                >
                  {[
                    { l: "Mesas", v: String(ctx?.mesas.length ?? 0) },
                    { l: "Escalados", v: String(pool.length) },
                    { l: "Não chegaram", v: String(naoChegaram), c: naoChegaram > 0 ? "#e84025" : undefined },
                    { l: "Disponíveis", v: String(disponiveis), c: disponiveis > 0 ? "#22c55e" : undefined },
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
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: t.textMuted,
                          marginBottom: 4,
                        }}
                      >
                        {k.l}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: k.c ?? brand.primary, fontFamily: FONT.body }}>
                        {k.v}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                  {pool.length === 0 ? (
                    <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                      Nenhum Game Presenter escalado neste turno/estúdio.
                    </span>
                  ) : (
                    pool.map((g) => (
                      <div key={g.funcionarioId} style={chipBase(g.falta)}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                          <button
                            type="button"
                            title={g.falta ? "Marcar como elegível" : "Marcar falta"}
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
                              border: 0,
                              background: "transparent",
                              padding: 0,
                              cursor: "pointer",
                              fontFamily: FONT.body,
                              fontSize: 12,
                              color: t.text,
                              textDecoration: g.falta ? "line-through" : "none",
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
                          <BadgeCheckin chegou={g.chegou} />
                        </div>
                        {perm.canEditarOk || perm.canCriarOk ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                            <select
                              aria-label={`Mover ${g.nomeExibicao} de estúdio`}
                              disabled={movendoId === g.funcionarioId || estudiosDestino.length === 0}
                              defaultValue=""
                              onChange={(e) => {
                                const v = e.target.value;
                                e.target.value = "";
                                if (v) void handleMover(g.funcionarioId, v);
                              }}
                              style={{
                                fontSize: 11,
                                padding: "4px 8px",
                                borderRadius: 8,
                                border: `1px solid ${t.cardBorder}`,
                                background: t.cardBg,
                                color: t.text,
                                fontFamily: FONT.body,
                                maxWidth: 160,
                              }}
                            >
                              <option value="">Mover estúdio…</option>
                              {estudiosDestino.map((e) => (
                                <option key={e.slug} value={e.slug}>
                                  {e.nome}
                                </option>
                              ))}
                            </select>
                            {g.alocacaoOrigem === "manual" ? (
                              <button
                                type="button"
                                disabled={movendoId === g.funcionarioId}
                                onClick={() => void handleRestaurar(g.funcionarioId)}
                                style={{
                                  fontSize: 11,
                                  border: 0,
                                  background: "transparent",
                                  color: brand.primary,
                                  cursor: "pointer",
                                  fontFamily: FONT.body,
                                  fontWeight: 600,
                                  padding: 0,
                                }}
                              >
                                Restaurar estúdio
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                  {poolSl.map((g) => (
                    <div key={`sl-${g.funcionarioId}`} style={chipBase(g.falta, "#a78bfa")}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                        <button
                          type="button"
                          title={g.falta ? "Incluir Shift Lead na reserva" : "Tirar Shift Lead da reserva"}
                          onClick={() => {
                            setPoolSl((prev) =>
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
                            border: 0,
                            background: "transparent",
                            padding: 0,
                            cursor: "pointer",
                            fontFamily: FONT.body,
                            fontSize: 12,
                            color: t.text,
                            textDecoration: g.falta ? "line-through" : "none",
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: g.falta ? "#e84025" : "#a78bfa",
                            }}
                          />
                          SL · {g.nickname}
                          <span style={{ opacity: 0.65 }}>({g.nomeExibicao})</span>
                          {g.falta ? " · Fora" : " · Reserva"}
                        </button>
                        <BadgeCheckin chegou={g.chegou} />
                      </div>
                    </div>
                  ))}
                </div>

                {poolOutros.length > 0 && (perm.canCriarOk || perm.canEditarOk) ? (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, fontFamily: FONT.body, color: t.textMuted }}>
                      Trazer de outro estúdio
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {poolOutros.map((g) => (
                        <div
                          key={`out-${g.funcionarioId}`}
                          style={{
                            ...chipBase(false),
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span>
                            {g.nickname} <span style={{ opacity: 0.65 }}>({g.nomeExibicao})</span>
                            {g.estudioEfetivo ? (
                              <span style={{ opacity: 0.55, marginLeft: 4 }}>· {g.estudioEfetivo}</span>
                            ) : null}
                          </span>
                          <BadgeCheckin chegou={g.chegou} />
                          <button
                            type="button"
                            disabled={movendoId === g.funcionarioId}
                            onClick={() => void handleTrazer(g.funcionarioId)}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "4px 10px",
                              borderRadius: 8,
                              border: `1px solid ${t.cardBorder}`,
                              background: t.cardBg,
                              color: brand.primary,
                              cursor: "pointer",
                              fontFamily: FONT.body,
                            }}
                          >
                            Trazer
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
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
                      disabled={!ctx}
                      onClick={handleAviso20}
                      style={avisoBtnStyle(t, !ctx)}
                    >
                      Aviso — intervalo 20 min
                    </button>
                    <button
                      type="button"
                      disabled={!previa}
                      onClick={() => handleGerar(true)}
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

                {candidatosReingresso.length > 0 ? (
                  <div
                    style={{
                      background: "color-mix(in srgb, #22c55e 10%, transparent)",
                      border: "1px solid #22c55e44",
                      borderRadius: 10,
                      padding: "10px 14px",
                      marginBottom: 12,
                      fontSize: 12,
                      fontFamily: FONT.body,
                    }}
                  >
                    Chegada no meio do turno — incluir a partir do próximo slot:
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {candidatosReingresso.map((g) => (
                        <button
                          key={`re-${g.funcionarioId}`}
                          type="button"
                          onClick={() => handleIncluirReingresso(g.funcionarioId)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "1px solid #22c55e66",
                            background: t.cardBg,
                            color: "#15803d",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            fontFamily: FONT.body,
                          }}
                        >
                          Incluir na rotação · {g.nickname}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

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
                    mesaCores={mesaCoresMap}
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
                mesaCores={mesaCoresMap}
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
            maxWidth: 360,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
