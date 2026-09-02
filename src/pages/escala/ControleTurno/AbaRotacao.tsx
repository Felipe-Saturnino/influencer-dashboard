import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { SectionTitle } from "../../../components/dashboard";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import {
  FILTRO_STATUS_SEMANTICO_PILL,
  getFiltroStatusSemanticoPillStyle,
} from "../../../lib/filterBarStyles";
import { labelHorarioTurnoStaffPorValor } from "../../../lib/rhStaffHorarioTurno";
import {
  anexarCheckinRotacao,
  carregarContextoRotacaoDia,
  corMesaRotacao,
  diaIsoLocal,
  gerarGradeRotacao,
  gerarSlotsRotacao,
  indiceProximoSlotRotacao,
  labelCargoLiderancaRotacao,
  labelsMesasRotacao,
  liderancaCompativelComTurnoRotacao,
  listarEstudiosAtivosRotacao,
  mapaCoresMesasRotacao,
  publicarRotacao,
  salvarRascunhoRotacao,
  type RotacaoCelulaPayload,
  type RotacaoContextoDia,
  type RotacaoGpPool,
  type RotacaoTurnoKey,
} from "../../../lib/escalaRotacao";
import { formatDiaBr, labelTurnoCurto } from "./helpers";
import type { ControleTurnoTurno } from "./types";

type EstudioOpt = { slug: string; nome: string };

type PreviaState = {
  slots: string[];
  gps: RotacaoGpPool[];
  faltosos: RotacaoGpPool[];
  matrix: string[][];
  modeloN: number;
  slotMin: number;
};

function turnoParaRotacao(turno: ControleTurnoTurno): RotacaoTurnoKey {
  return turno;
}

type Props = {
  diaIso: string;
  turno: ControleTurnoTurno;
};

export function AbaRotacao({ diaIso, turno }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_controle_turno");
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const turnoKey = turnoParaRotacao(turno);
  const hojeIso = useMemo(() => diaIsoLocal(new Date()), []);
  const podeGerar = perm.canCriarOk;
  const podeLideranca = perm.canCriarOk || perm.canEditarOk;

  const [estudios, setEstudios] = useState<EstudioOpt[]>([]);
  const [estudio, setEstudio] = useState("");
  const [loadingEstudios, setLoadingEstudios] = useState(true);

  const [ctx, setCtx] = useState<RotacaoContextoDia | null>(null);
  const [pool, setPool] = useState<RotacaoGpPool[]>([]);
  const [poolSl, setPoolSl] = useState<RotacaoGpPool[]>([]);
  const [liderancasDia, setLiderancasDia] = useState<RotacaoGpPool[]>([]);
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [erroCtx, setErroCtx] = useState<string | null>(null);

  const [slotMin, setSlotMin] = useState(30);
  const [previa, setPrevia] = useState<PreviaState | null>(null);
  const [painelLideranca, setPainelLideranca] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [erroPub, setErroPub] = useState<string | null>(null);
  const [bannerPub, setBannerPub] = useState<string | null>(null);

  const loadGen = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void listarEstudiosAtivosRotacao().then((list) => {
      if (cancelled) return;
      setEstudios(list);
      setEstudio((atual) => {
        if (atual && list.some((e) => e.slug === atual)) return atual;
        return list[0]?.slug ?? "";
      });
      setLoadingEstudios(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const carregarCtx = useCallback(async () => {
    const gen = ++loadGen.current;
    if (!estudio) {
      setCtx(null);
      setPool([]);
      setPoolSl([]);
      setLiderancasDia([]);
      setPainelLideranca(false);
      setPrevia(null);
      setLoadingCtx(false);
      return;
    }
    setLoadingCtx(true);
    setErroCtx(null);
    setPrevia(null);
    setBannerPub(null);
    setErroPub(null);
    setPainelLideranca(false);
    const res = await carregarContextoRotacaoDia({
      diaIso,
      turno: turnoKey,
      estudioSlug: estudio,
    });
    if (gen !== loadGen.current) return;
    if (!res.ok) {
      setLoadingCtx(false);
      setErroCtx(res.erro);
      setCtx(null);
      setPool([]);
      setPoolSl([]);
      setLiderancasDia([]);
      return;
    }
    const todos = [...res.data.gps, ...res.data.shiftLeads, ...res.data.liderancas];
    const comCheckin = await anexarCheckinRotacao(diaIso, todos);
    if (gen !== loadGen.current) return;
    const byId = new Map(comCheckin.map((p) => [p.funcionarioId, p]));
    setCtx(res.data);
    setPool(res.data.gps.map((g) => ({ ...(byId.get(g.funcionarioId) ?? g), isShiftLead: false })));
    setPoolSl(res.data.shiftLeads.map((g) => ({ ...(byId.get(g.funcionarioId) ?? g), isShiftLead: true })));
    setLiderancasDia(
      res.data.liderancas.map((g) => ({ ...(byId.get(g.funcionarioId) ?? g), isShiftLead: true })),
    );
    setSlotMin(30);
    setLoadingCtx(false);
  }, [diaIso, turnoKey, estudio]);

  useEffect(() => {
    void carregarCtx();
  }, [carregarCtx]);

  const liderancasCompativeis = useMemo(() => {
    const idsNoPool = new Set(poolSl.map((g) => g.funcionarioId));
    return liderancasDia.filter(
      (g) =>
        !idsNoPool.has(g.funcionarioId) &&
        liderancaCompativelComTurnoRotacao(turnoKey, {
          horarioTurno: g.horarioTurno,
          gradeValor: g.gradeValor,
        }),
    );
  }, [liderancasDia, poolSl, turnoKey]);

  const mesaTipoMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const mesa of ctx?.mesas ?? []) {
      if (mesa.numeroMesa) m[mesa.numeroMesa] = mesa.tipoJogo;
    }
    return m;
  }, [ctx]);

  const mesaCoresMap = useMemo(() => mapaCoresMesasRotacao(ctx?.mesas ?? []), [ctx]);

  const kpis = useMemo(() => {
    const nao = pool.filter((g) => g.chegou === false).length;
    const disp = pool.filter((g) => g.chegou === true).length;
    return { mesas: ctx?.mesas.length ?? 0, escalados: pool.length, nao, disp };
  }, [pool, ctx]);

  const montarGrade = useCallback(
    (opts: {
      slot: number;
      gpsPool: RotacaoGpPool[];
      slPool: RotacaoGpPool[];
      preservarPassado: boolean;
    }): PreviaState | null => {
      if (!ctx) return null;
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
      };
    },
    [ctx, previa, diaIso, hojeIso],
  );

  const persistirRascunho = (state: PreviaState) => {
    if (!ctx) return;
    const celulas: RotacaoCelulaPayload[] = state.gps.flatMap((g, i) =>
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
      turno: turnoKey,
      estudioSlug: ctx.estudioSlug,
      estudioNome: ctx.estudioNome,
      modeloN: state.modeloN,
      slotMinutos: state.slotMin,
      turnoInicio: ctx.turnoInicio,
      turnoFim: ctx.turnoFim,
      celulas,
    }).then((r) => {
      if (!r.ok) {
        setErroPub("Prévia gerada, mas não foi possível salvar o rascunho.");
      }
    });
  };

  const aplicarPrevia = (state: PreviaState | null) => {
    if (!state) return;
    setPrevia(state);
    setSlotMin(state.slotMin);
    persistirRascunho(state);
  };

  const handleGerar = (preservarPassado = false) => {
    aplicarPrevia(
      montarGrade({
        slot: slotMin,
        gpsPool: pool,
        slPool: poolSl,
        preservarPassado,
      }),
    );
  };

  const handleAviso20 = () => {
    setSlotMin(20);
    aplicarPrevia(
      montarGrade({
        slot: 20,
        gpsPool: pool,
        slPool: poolSl,
        preservarPassado: Boolean(previa),
      }),
    );
  };

  const handleIncluirLideranca = (pessoa: RotacaoGpPool) => {
    if (poolSl.some((g) => g.funcionarioId === pessoa.funcionarioId)) return;
    const nextSl = [...poolSl, { ...pessoa, falta: false, isShiftLead: true }];
    setPoolSl(nextSl);
    setPainelLideranca(false);
    const state = montarGrade({
      slot: slotMin,
      gpsPool: pool,
      slPool: nextSl,
      preservarPassado: Boolean(previa),
    });
    if (!state) return;
    aplicarPrevia(state);
  };

  const handlePublicar = async () => {
    if (!ctx || !previa || !podeGerar) return;
    setPublicando(true);
    setErroPub(null);
    const celulas: RotacaoCelulaPayload[] = [];
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
      turno: turnoKey,
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
    const est = ctx.estudioNome || estudio;
    setBannerPub(`Rotação publicada — ${formatDiaBr(diaIso)} · ${labelTurnoCurto(turno)} · ${est}.`);
  };

  const subPool = `${labelTurnoCurto(turno)} · Escala Aprovada e Check-in`;
  const estNome = ctx?.estudioNome || estudios.find((e) => e.slug === estudio)?.nome || "";
  const subPrevia = previa
    ? `${formatDiaBr(diaIso)} · ${labelTurnoCurto(turno)} · ${estNome} · ${previa.modeloN} GPs · ${previa.slotMin} min`
    : "gere para ver a grade";

  const ghostBtn: CSSProperties = {
    padding: "10px 18px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: FONT.body,
    cursor: "pointer",
  };

  const loading = loadingEstudios || loadingCtx;
  const slots = previa?.slots ?? [];

  return (
    <>
      <div style={pageBox}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 14,
            justifyContent: "flex-start",
            width: "100%",
          }}
        >
          {estudios.map((e) => {
            const active = estudio === e.slug;
            const sem = brand.accent ?? brand.primary;
            const st = getFiltroStatusSemanticoPillStyle(t, active, sem);
            return (
              <button
                key={e.slug}
                type="button"
                aria-pressed={active}
                onClick={() => setEstudio(e.slug)}
                style={{
                  ...FILTRO_STATUS_SEMANTICO_PILL,
                  display: "inline-flex",
                  alignItems: "center",
                  border: st.border,
                  background: st.background,
                  color: st.color,
                  fontWeight: st.fontWeight,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                {e.nome}
              </button>
            );
          })}
        </div>

        <BlocoHead
          title="Pool do turno"
          sub={subPool}
          actions={
            <>
              {podeLideranca ? (
                <button
                  type="button"
                  style={ghostBtn}
                  disabled={!ctx || loading}
                  aria-expanded={painelLideranca}
                  aria-controls="painel-incluir-lideranca"
                  onClick={() => setPainelLideranca((v) => !v)}
                >
                  Incluir Liderança
                </button>
              ) : null}
              {podeGerar ? (
                <CtaCriarButton disabled={!ctx || loading} onClick={() => handleGerar(false)}>
                  Gerar prévia
                </CtaCriarButton>
              ) : null}
            </>
          }
        />

        {erroCtx ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
            {erroCtx}
          </div>
        ) : null}

        {ctx && !ctx.escalaAprovada ? (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 14px",
              borderRadius: 10,
              background: "color-mix(in srgb, #f59e0b 12%, transparent)",
              border: "1px solid #f59e0b55",
              color: "#92400e",
              fontSize: 12,
              fontFamily: FONT.body,
            }}
          >
            A escala de Game Presenter do mês ainda não está aprovada em Escala Estúdio. O pool fica vazio até a aprovação.
          </div>
        ) : null}

        {painelLideranca ? (
          <div
            id="painel-incluir-lideranca"
            role="region"
            aria-label="Incluir liderança na rotação"
            style={{
              marginBottom: 14,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(245,158,11,0.35)",
              background: "color-mix(in srgb, #f59e0b 10%, transparent)",
              color: "#92400e",
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Shift Leaders e Service Managers escalados no dia · horário compatível com o turno
            </div>
            {liderancasCompativeis.length === 0 ? (
              <div style={{ fontSize: 13, color: t.textMuted }}>
                Nenhuma liderança disponível para este turno. Confira a Escala Estúdio (Shift Leader / Service Manager) e o
                horário cadastrado.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {liderancasCompativeis.map((l) => (
                  <button
                    key={l.funcionarioId}
                    type="button"
                    onClick={() => handleIncluirLideranca(l)}
                    style={{
                      ...ghostBtn,
                      textAlign: "left",
                      borderColor: "#f59e0b55",
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{l.nickname}</span>
                    <span style={{ color: t.textMuted }}> ({l.nomeExibicao})</span>
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      {labelCargoLiderancaRotacao(l.cargoLideranca)}
                      {l.horarioTurno ? ` · ${labelHorarioTurnoStaffPorValor(l.horarioTurno)}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
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
        ) : (
          <>
            <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 14 }}>
              <KpiMini label="Mesas" value={kpis.mesas} t={t} />
              <KpiMini label="Escalados" value={kpis.escalados} t={t} />
              <KpiMini label="Não chegaram" value={kpis.nao} t={t} cor="#e84025" />
              <KpiMini label="Disponíveis" value={kpis.disp} t={t} cor="#22c55e" />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {!estudio ? (
                <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                  Nenhum estúdio ativo para gerar a rotação.
                </span>
              ) : pool.length === 0 && poolSl.length === 0 ? (
                <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                  Nenhum Game Presenter escalado neste turno/estúdio.
                </span>
              ) : (
                <>
                  {pool.map((g) => (
                    <PoolChip
                      key={g.funcionarioId}
                      gp={g}
                      t={t}
                      onToggleFalta={() => {
                        setPool((prev) =>
                          prev.map((x) => (x.funcionarioId === g.funcionarioId ? { ...x, falta: !x.falta } : x)),
                        );
                        setPrevia(null);
                      }}
                    />
                  ))}
                  {poolSl.map((g) => (
                    <PoolChip
                      key={`sl-${g.funcionarioId}`}
                      gp={g}
                      t={t}
                      reserva
                      onToggleFalta={() => {
                        setPoolSl((prev) =>
                          prev.map((x) => (x.funcionarioId === g.funcionarioId ? { ...x, falta: !x.falta } : x)),
                        );
                        setPrevia(null);
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div style={pageBox}>
        <BlocoHead
          title="Pré-visualização"
          sub={subPrevia}
          actions={
            <>
              <button
                type="button"
                disabled={!ctx || loading}
                style={{
                  ...ghostBtn,
                  borderColor: "rgba(245,158,11,0.45)",
                  background: "color-mix(in srgb, #f59e0b 12%, transparent)",
                  color: "#b45309",
                  cursor: !ctx || loading ? "not-allowed" : "pointer",
                  opacity: !ctx || loading ? 0.5 : 1,
                }}
                onClick={handleAviso20}
              >
                Aviso — intervalo 20 min
              </button>
              <button
                type="button"
                style={{
                  ...ghostBtn,
                  cursor: previa ? "pointer" : "not-allowed",
                  opacity: previa ? 1 : 0.5,
                }}
                disabled={!previa}
                onClick={() => handleGerar(true)}
              >
                Regenerar
              </button>
              {podeGerar ? (
                <CtaCriarButton
                  disabled={!previa}
                  loading={publicando}
                  loadingLabel="Publicando…"
                  onClick={() => void handlePublicar()}
                >
                  Publicar
                </CtaCriarButton>
              ) : null}
            </>
          }
        />

        {bannerPub ? (
          <div
            role="status"
            style={{
              marginBottom: 12,
              padding: "10px 14px",
              borderRadius: 10,
              background: "color-mix(in srgb, #22c55e 12%, transparent)",
              border: "1px solid rgba(34,197,94,0.35)",
              color: "#166534",
              fontSize: 13,
              fontFamily: FONT.body,
            }}
          >
            {bannerPub}
          </div>
        ) : null}

        {erroPub ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
            {erroPub}
          </div>
        ) : null}

        {!previa ? (
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              color: t.textMuted,
              fontSize: 13,
              fontFamily: FONT.body,
            }}
          >
            Sem prévia. Ajuste o pool e clique em <strong style={{ color: t.text }}>Gerar prévia</strong>.
          </div>
        ) : (
          <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 720 })}>
              <caption style={{ display: "none" }}>Pré-visualização da rotação por equipe e slot</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeaderSticky}>
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
                {previa.gps.map((g, i) => (
                  <tr key={g.funcionarioId} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdSticky()}>
                      <div style={{ fontWeight: 700, fontSize: 13, fontFamily: FONT.body }}>
                        {g.nomeExibicao}
                        {g.isShiftLead ? (
                          <span
                            style={{
                              marginLeft: 6,
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
                      <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>{g.nickname}</div>
                    </td>
                    {(previa.matrix[i] ?? []).map((valor, ci) => (
                      <td key={ci} style={dataTable.tdCenter}>
                        <CelulaPill
                          valor={valor}
                          cor={mesaCoresMap[valor] ?? corMesaRotacao(mesaTipoMap[valor] ?? "", valor)}
                          t={t}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {previa.faltosos.map((g, i) => {
                  const rowIndex = previa.gps.length + i;
                  return (
                    <tr key={`f-${g.funcionarioId}`} style={{ background: dataTable.zebraRow(rowIndex) }}>
                      <td style={dataTable.tdSticky()}>
                        <div style={{ fontWeight: 700, fontSize: 13, fontFamily: FONT.body }}>{g.nomeExibicao}</div>
                        <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>{g.nickname}</div>
                      </td>
                      {slots.map((s) => (
                        <td key={s} style={dataTable.tdCenter}>
                          <CelulaPill valor="X" t={t} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function BlocoHead({
  title,
  sub,
  actions,
}: {
  title: string;
  sub: string;
  actions: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 14,
      }}
    >
      <SectionTitle sub={sub} compact>
        {title}
      </SectionTitle>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{actions}</div>
    </div>
  );
}

function KpiMini({
  label,
  value,
  t,
  cor,
}: {
  label: string;
  value: number;
  t: ReturnType<typeof useApp>["theme"];
  cor?: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${t.cardBorder}`,
        background: t.inputBg,
      }}
    >
      <div
        style={{
          margin: "0 0 4px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 700,
          fontSize: 11,
          color: t.textMuted,
          fontFamily: FONT.body,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor ?? t.text, fontFamily: FONT.body }}>{value}</div>
    </div>
  );
}

function PoolChip({
  gp,
  t,
  reserva,
  onToggleFalta,
}: {
  gp: RotacaoGpPool;
  t: ReturnType<typeof useApp>["theme"];
  reserva?: boolean;
  onToggleFalta: () => void;
}) {
  const badgeOk = gp.chegou === true;
  const showBadge = gp.chegou === true || gp.chegou === false;
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${gp.falta ? "rgba(232,64,37,0.35)" : reserva ? "#a78bfa66" : t.cardBorder}`,
        background: reserva && !gp.falta ? "color-mix(in srgb, #a78bfa 12%, transparent)" : t.inputBg,
        minWidth: 180,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          onClick={onToggleFalta}
          style={{
            border: 0,
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            fontFamily: FONT.body,
            fontSize: 13,
            color: t.text,
            textDecoration: gp.falta ? "line-through" : "none",
            textAlign: "left",
          }}
          title={
            reserva
              ? gp.falta
                ? "Incluir Shift Lead na reserva"
                : "Tirar Shift Lead da reserva"
              : gp.falta
                ? "Marcar como elegível"
                : "Marcar falta"
          }
        >
          <span style={{ fontWeight: 700 }}>{reserva ? `SL · ${gp.nickname}` : gp.nickname}</span>
          <span style={{ color: t.textMuted }}> ({gp.nomeExibicao})</span>
          {gp.falta ? (reserva ? " · Fora" : " · Falta") : reserva ? " · Reserva" : ""}
        </button>
        {showBadge ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 20,
              border: `1px solid ${badgeOk ? "#22c55e44" : "#e8402544"}`,
              background: `${badgeOk ? "#22c55e" : "#e84025"}22`,
              color: badgeOk ? "#22c55e" : "#e84025",
              fontFamily: FONT.body,
            }}
          >
            {badgeOk ? "Chegou" : "Não chegou"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CelulaPill({ valor, cor, t }: { valor: string; cor?: string; t: ReturnType<typeof useApp>["theme"] }) {
  if (valor === "Break" || valor === "B") {
    return (
      <span
        style={{
          display: "inline-flex",
          padding: "4px 10px",
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 700,
          background: "color-mix(in srgb, #6b7280 15%, transparent)",
          color: t.textMuted,
          border: `1px solid ${t.cardBorder}`,
          fontFamily: FONT.body,
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
          padding: "4px 10px",
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 700,
          background: "color-mix(in srgb, #e84025 15%, transparent)",
          color: "#e84025",
          border: "1px solid rgba(232,64,37,0.35)",
          fontFamily: FONT.body,
        }}
      >
        X
      </span>
    );
  }
  if (!valor || valor === "—") {
    return <span style={{ color: "#6b7280", fontFamily: FONT.body }}>—</span>;
  }
  const c = cor ?? "#6b7280";
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 10px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        background: `color-mix(in srgb, ${c} 18%, transparent)`,
        color: c,
        border: `1px solid color-mix(in srgb, ${c} 40%, transparent)`,
        fontFamily: FONT.body,
      }}
    >
      {valor}
    </span>
  );
}
