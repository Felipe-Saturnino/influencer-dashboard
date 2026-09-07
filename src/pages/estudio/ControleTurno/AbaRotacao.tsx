import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { GripVertical, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { SectionTitle } from "../../../components/dashboard";
import { getPageContentBoxRadius, getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { labelHorarioTurnoStaffPorValor } from "../../../lib/rhStaffHorarioTurno";
import {
  alocarEstudioRotacao,
  anexarCheckinRotacao,
  aplicarLimitesDisponibilidadeNaMatrixRotacao,
  carregarContextoRotacaoDia,
  carregarRotacaoPublicada,
  corMesaRotacao,
  diaIsoLocal,
  disponivelPorSlotPessoaRotacao,
  filtrarPoolRotacaoPorPresencaCt,
  gerarGradeRotacao,
  gerarSlotsRotacao,
  indiceProximoSlotRotacao,
  labelCargoLiderancaRotacao,
  labelsMesasRotacao,
  limparAlocacaoRotacao,
  listarEstudiosAtivosRotacao,
  mapaCoresMesasRotacao,
  publicarRotacao,
  salvarRascunhoRotacao,
  trocarPessoasLinhasPreviaRotacao,
  turnoAnteriorRotacao,
  type RotacaoCelulaPayload,
  type RotacaoContextoDia,
  type RotacaoGpPool,
  type RotacaoPublicada,
  type RotacaoTurnoKey,
} from "../../../lib/escalaRotacao";
import { listPresencaDiaTurno, type CtPresencaRow } from "../../../lib/escalaControleTurno";
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

type FaseBloco = "idle" | "previa" | "publicada";

type BlocoEstudioState = {
  slug: string;
  nome: string;
  loading: boolean;
  erro: string | null;
  ctx: RotacaoContextoDia | null;
  pool: RotacaoGpPool[];
  poolSl: RotacaoGpPool[];
  liderancasDia: RotacaoGpPool[];
  fase: FaseBloco;
  slotMin: number;
  previa: PreviaState | null;
  publicada: RotacaoPublicada | null;
  painelLideranca: boolean;
  erroAcao: string | null;
  publicando: boolean;
  bannerOk: string | null;
};

function turnoParaRotacao(turno: ControleTurnoTurno): RotacaoTurnoKey {
  return turno;
}

function blocoVazio(slug: string, nome: string): BlocoEstudioState {
  return {
    slug,
    nome,
    loading: true,
    erro: null,
    ctx: null,
    pool: [],
    poolSl: [],
    liderancasDia: [],
    fase: "idle",
    slotMin: 30,
    previa: null,
    publicada: null,
    painelLideranca: false,
    erroAcao: null,
    publicando: false,
    bannerOk: null,
  };
}

function kpisDoPool(
  pool: RotacaoGpPool[],
  presencaAtual: Map<string, CtPresencaRow>,
  presencaAnterior: Map<string, CtPresencaRow>,
) {
  const nao = pool.filter((g) => g.chegou === false).length;
  const disp = pool.filter((g) => g.chegou === true).length;
  const horasAdicionais = pool.filter((g) => {
    const atual = presencaAtual.get(g.funcionarioId);
    if (atual?.status === "hora_adicional") return true;
    return presencaAnterior.get(g.funcionarioId)?.status === "hora_adicional";
  }).length;
  return { escalados: pool.length, nao, horasAdicionais, disp };
}

type Props = {
  diaIso: string;
  turno: ControleTurnoTurno;
};

export function AbaRotacao({ diaIso, turno }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_controle_turno");
  const pageBox = getPageContentBoxStyle(brand, t);
  const turnoKey = turnoParaRotacao(turno);
  const hojeIso = useMemo(() => diaIsoLocal(new Date()), []);
  const podeGerar = perm.canCriarOk;
  const podeLideranca = perm.canCriarOk || perm.canEditarOk;

  const [estudios, setEstudios] = useState<EstudioOpt[]>([]);
  const [blocos, setBlocos] = useState<Record<string, BlocoEstudioState>>({});
  const [loadingLista, setLoadingLista] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [presencaAtualMap, setPresencaAtualMap] = useState<Map<string, CtPresencaRow>>(new Map());
  const [presencaAntMap, setPresencaAntMap] = useState<Map<string, CtPresencaRow>>(new Map());
  const [movendoId, setMovendoId] = useState<string | null>(null);

  const loadGen = useRef(0);

  const patchBloco = useCallback((slug: string, patch: Partial<BlocoEstudioState>) => {
    setBlocos((prev) => {
      const cur = prev[slug];
      if (!cur) return prev;
      return { ...prev, [slug]: { ...cur, ...patch } };
    });
  }, []);

  const carregarBloco = useCallback(
    async (
      est: EstudioOpt,
      gen: number,
      presencaAtual: CtPresencaRow[],
      presencaAnt: CtPresencaRow[],
    ) => {
      const ant = turnoAnteriorRotacao(diaIso, turnoKey);
      let res: Awaited<ReturnType<typeof carregarContextoRotacaoDia>>;
      let resAnt: Awaited<ReturnType<typeof carregarContextoRotacaoDia>>;
      let pub: Awaited<ReturnType<typeof carregarRotacaoPublicada>>;
      try {
        [res, resAnt, pub] = await Promise.all([
          carregarContextoRotacaoDia({
            diaIso,
            turno: turnoKey,
            estudioSlug: est.slug,
          }),
          carregarContextoRotacaoDia({
            diaIso: ant.diaIso,
            turno: ant.turno,
            estudioSlug: est.slug,
          }),
          carregarRotacaoPublicada({
            diaIso,
            turno: turnoKey,
            estudioSlug: est.slug,
          }),
        ]);
      } catch (e) {
        console.error(e);
        if (gen !== loadGen.current) return;
        patchBloco(est.slug, {
          loading: false,
          erro: "Não foi possível carregar a rotação. Se o problema persistir, entre em contato com o suporte.",
          ctx: null,
          pool: [],
          poolSl: [],
          liderancasDia: [],
          fase: "idle",
          previa: null,
          publicada: null,
        });
        return;
      }

      if (gen !== loadGen.current) return;

      if (!res.ok) {
        patchBloco(est.slug, {
          loading: false,
          erro: res.erro,
          ctx: null,
          pool: [],
          poolSl: [],
          liderancasDia: [],
          fase: "idle",
          previa: null,
          publicada: null,
        });
        return;
      }

      const gpsFiltrados = filtrarPoolRotacaoPorPresencaCt({
        gps: res.data.gps,
        presencaAtual,
        presencaAnterior: presencaAnt,
        gpsTurnoAnteriorMesmoEstudio: resAnt.ok ? resAnt.data.gps : [],
      });

      const todos = [...gpsFiltrados, ...res.data.liderancas];
      const comCheckin = await anexarCheckinRotacao(diaIso, todos);
      if (gen !== loadGen.current) return;
      const byId = new Map(comCheckin.map((p) => [p.funcionarioId, p]));
      const limById = new Map(
        gpsFiltrados
          .filter((g) => g.saidaLimiteHhmm)
          .map((g) => [g.funcionarioId, g.saidaLimiteHhmm!] as const),
      );

      const pool = gpsFiltrados.map((g) => {
        const base = byId.get(g.funcionarioId) ?? g;
        return {
          ...base,
          isShiftLead: false,
          saidaLimiteHhmm: limById.get(g.funcionarioId) ?? g.saidaLimiteHhmm,
        };
      });

      const liderancasDia = res.data.liderancas.map((g) => ({
        ...(byId.get(g.funcionarioId) ?? g),
        isShiftLead: true,
      }));

      const publicada = pub.ok ? pub.data : null;
      const fase: FaseBloco = publicada ? "publicada" : "idle";

      patchBloco(est.slug, {
        loading: false,
        erro: pub.ok ? null : pub.erro,
        ctx: res.data,
        pool,
        poolSl: [],
        liderancasDia,
        fase,
        slotMin: publicada?.slotMinutos === 20 ? 20 : 30,
        previa: null,
        publicada,
        painelLideranca: false,
        erroAcao: null,
        bannerOk: null,
        publicando: false,
      });
    },
    [diaIso, turnoKey, patchBloco],
  );

  const carregarTudo = useCallback(async () => {
    const gen = ++loadGen.current;
    setErroGeral(null);
    setLoadingLista(true);

    let list: EstudioOpt[];
    try {
      list = await listarEstudiosAtivosRotacao();
    } catch (e) {
      console.error(e);
      if (gen !== loadGen.current) return;
      setLoadingLista(false);
      setErroGeral(
        "Não foi possível carregar os estúdios. Se o problema persistir, entre em contato com o suporte.",
      );
      setEstudios([]);
      setBlocos({});
      return;
    }

    if (gen !== loadGen.current) return;
    setEstudios(list);
    setBlocos(Object.fromEntries(list.map((e) => [e.slug, blocoVazio(e.slug, e.nome)])));
    setLoadingLista(false);

    const ant = turnoAnteriorRotacao(diaIso, turnoKey);
    let presencaAtual: CtPresencaRow[];
    let presencaAnt: CtPresencaRow[];
    try {
      [presencaAtual, presencaAnt] = await Promise.all([
        listPresencaDiaTurno(diaIso, turnoKey),
        listPresencaDiaTurno(ant.diaIso, ant.turno),
      ]);
    } catch (e) {
      console.error(e);
      if (gen !== loadGen.current) return;
      setErroGeral(
        "Não foi possível carregar a presença do turno. Se o problema persistir, entre em contato com o suporte.",
      );
      return;
    }

    if (gen !== loadGen.current) return;
    setPresencaAtualMap(new Map(presencaAtual.map((r) => [r.id, r])));
    setPresencaAntMap(new Map(presencaAnt.map((r) => [r.id, r])));

    await Promise.all(list.map((e) => carregarBloco(e, gen, presencaAtual, presencaAnt)));
  }, [diaIso, turnoKey, carregarBloco]);

  useEffect(() => {
    void carregarTudo();
  }, [carregarTudo]);

  const montarGrade = useCallback(
    (opts: {
      ctx: RotacaoContextoDia;
      slot: number;
      gpsPool: RotacaoGpPool[];
      slPool: RotacaoGpPool[];
      preservarPassado: boolean;
      previaAtual: PreviaState | null;
      setErro: (msg: string | null) => void;
    }): PreviaState | null => {
      const { ctx } = opts;
      opts.setErro(null);
      const usedGps = opts.gpsPool.filter((g) => !g.falta);
      const usedSl = opts.slPool.filter((g) => !g.falta);
      const numeros = labelsMesasRotacao(ctx.mesas);
      if (!numeros.length) {
        opts.setErro("Este estúdio não tem mesas com Número da Mesa cadastrado em Gestão de Mesas.");
        return null;
      }
      if (usedGps.length + usedSl.length < numeros.length) {
        opts.setErro(
          `Pessoas insuficientes (${usedGps.length} GPs + ${usedSl.length} liderança) para cobrir ${numeros.length} mesa(s).`,
        );
        return null;
      }
      const step = opts.slot === 20 ? 20 : 30;
      const slots = gerarSlotsRotacao(ctx.turnoInicio, ctx.turnoFim, step);
      let fromSlot = 0;
      let matrixBase: string[][] | undefined;
      const previa = opts.previaAtual;
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
        gps: usedGps.map((g) => ({
          funcionarioId: g.funcionarioId,
          isShiftLead: false,
          disponivelPorSlot: disponivelPorSlotPessoaRotacao(slots, g, ctx.turnoInicio),
        })),
        shiftLeads: usedSl.map((g) => ({
          funcionarioId: g.funcionarioId,
          isShiftLead: true,
          disponivelPorSlot: disponivelPorSlotPessoaRotacao(
            slots,
            { ...g, isShiftLead: true },
            ctx.turnoInicio,
          ),
        })),
        nSlots: slots.length,
        slotMinutos: step,
        fromSlotIndex: fromSlot > 0 ? fromSlot : undefined,
        matrixBase,
      });
      if (!gerado.ok) {
        opts.setErro(gerado.erro);
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
      const matrix = aplicarLimitesDisponibilidadeNaMatrixRotacao(
        slots,
        gerado.matrix,
        linhas,
        ctx.turnoInicio,
      );
      return {
        slots,
        gps: linhas,
        faltosos: [...opts.gpsPool.filter((g) => g.falta), ...opts.slPool.filter((g) => g.falta)],
        matrix,
        modeloN: usedGps.length,
        slotMin: step,
      };
    },
    [diaIso, hojeIso],
  );

  const persistirRascunho = (ctx: RotacaoContextoDia, state: PreviaState) => {
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
        patchBloco(ctx.estudioSlug, {
          erroAcao: "Prévia gerada, mas não foi possível salvar o rascunho.",
        });
      }
    });
  };

  const handleGerar = (slug: string) => {
    const b = blocos[slug];
    if (!b?.ctx || !podeGerar) return;
    const state = montarGrade({
      ctx: b.ctx,
      slot: b.slotMin,
      gpsPool: b.pool,
      slPool: b.poolSl,
      preservarPassado: false,
      previaAtual: b.previa,
      setErro: (msg) => patchBloco(slug, { erroAcao: msg }),
    });
    if (!state) return;
    persistirRascunho(b.ctx, state);
    patchBloco(slug, {
      fase: "previa",
      previa: state,
      slotMin: state.slotMin,
      painelLideranca: false,
      erroAcao: null,
      bannerOk: null,
    });
  };

  const handleToggleSlot = (slug: string) => {
    const b = blocos[slug];
    if (!b?.ctx || b.fase !== "previa") return;
    const atual = b.previa?.slotMin ?? b.slotMin;
    const alvo = atual === 20 ? 30 : 20;
    const state = montarGrade({
      ctx: b.ctx,
      slot: alvo,
      gpsPool: b.pool,
      slPool: b.poolSl,
      preservarPassado: Boolean(b.previa),
      previaAtual: b.previa,
      setErro: (msg) => patchBloco(slug, { erroAcao: msg }),
    });
    if (!state) return;
    persistirRascunho(b.ctx, state);
    patchBloco(slug, {
      slotMin: state.slotMin,
      previa: state,
      erroAcao: null,
    });
  };

  const handleIncluirLideranca = (slug: string, pessoa: RotacaoGpPool) => {
    const b = blocos[slug];
    if (!b?.ctx || b.fase !== "previa") return;
    if (b.poolSl.some((g) => g.funcionarioId === pessoa.funcionarioId)) return;
    const nextSl = [
      ...b.poolSl,
      {
        ...pessoa,
        falta: false,
        isShiftLead: true,
        cargoLideranca: pessoa.cargoLideranca ?? "shift_leader",
      },
    ];
    const state = montarGrade({
      ctx: b.ctx,
      slot: b.slotMin,
      gpsPool: b.pool,
      slPool: nextSl,
      preservarPassado: false,
      previaAtual: b.previa,
      setErro: (msg) => patchBloco(slug, { erroAcao: msg }),
    });
    if (!state) {
      patchBloco(slug, { poolSl: nextSl, painelLideranca: false });
      return;
    }
    persistirRascunho(b.ctx, state);
    patchBloco(slug, {
      poolSl: nextSl,
      painelLideranca: false,
      previa: state,
      slotMin: state.slotMin,
      erroAcao: null,
    });
  };

  const handleMover = async (origemSlug: string, funcionarioId: string, destinoSlug: string) => {
    if (!destinoSlug) return;
    setMovendoId(funcionarioId);
    patchBloco(origemSlug, { erroAcao: null });
    const res = await alocarEstudioRotacao({
      diaIso,
      turno: turnoKey,
      funcionarioId,
      estudioSlug: destinoSlug,
    });
    setMovendoId(null);
    if (!res.ok) {
      patchBloco(origemSlug, { erroAcao: res.erro });
      return;
    }
    void carregarTudo();
  };

  const handleRestaurar = async (slug: string, funcionarioId: string) => {
    setMovendoId(funcionarioId);
    patchBloco(slug, { erroAcao: null });
    const res = await limparAlocacaoRotacao({ diaIso, turno: turnoKey, funcionarioId });
    setMovendoId(null);
    if (!res.ok) {
      patchBloco(slug, { erroAcao: res.erro });
      return;
    }
    void carregarTudo();
  };

  const handleTrocarLinhas = (slug: string, fromIndex: number, toIndex: number) => {
    const b = blocos[slug];
    if (!b?.previa || !b.ctx || !podeLideranca || b.fase !== "previa") return;
    const trocado = trocarPessoasLinhasPreviaRotacao({
      gps: b.previa.gps,
      matrix: b.previa.matrix,
      fromIndex,
      toIndex,
      slots: b.previa.slots,
      turnoInicio: b.ctx.turnoInicio,
    });
    if (!trocado) return;
    const next: PreviaState = {
      ...b.previa,
      gps: trocado.gps,
      matrix: trocado.matrix,
    };
    persistirRascunho(b.ctx, next);
    patchBloco(slug, { previa: next });
  };

  const handlePublicar = async (slug: string) => {
    const b = blocos[slug];
    if (!b?.ctx || !b.previa || !podeGerar) return;
    patchBloco(slug, { publicando: true, erroAcao: null });
    const celulas: RotacaoCelulaPayload[] = [];
    b.previa.gps.forEach((g, i) => {
      b.previa!.slots.forEach((slot, si) => {
        celulas.push({
          funcionario_id: g.funcionarioId,
          nome_exibicao: g.nomeExibicao,
          nickname: g.nickname === "—" ? "" : g.nickname,
          linha_ordem: i,
          slot_inicio: slot,
          valor: b.previa!.matrix[i]?.[si] ?? "—",
        });
      });
    });
    b.previa.faltosos.forEach((g, i) => {
      b.previa!.slots.forEach((slot) => {
        celulas.push({
          funcionario_id: g.funcionarioId,
          nome_exibicao: g.nomeExibicao,
          nickname: g.nickname === "—" ? "" : g.nickname,
          linha_ordem: b.previa!.gps.length + i,
          slot_inicio: slot,
          valor: "X",
        });
      });
    });
    const res = await publicarRotacao({
      diaIso,
      turno: turnoKey,
      estudioSlug: b.ctx.estudioSlug,
      estudioNome: b.ctx.estudioNome,
      modeloN: b.previa.modeloN,
      slotMinutos: b.previa.slotMin,
      turnoInicio: b.ctx.turnoInicio,
      turnoFim: b.ctx.turnoFim,
      celulas,
    });
    if (!res.ok) {
      patchBloco(slug, { publicando: false, erroAcao: res.erro });
      return;
    }
    const pub = await carregarRotacaoPublicada({
      diaIso,
      turno: turnoKey,
      estudioSlug: slug,
    });
    patchBloco(slug, {
      publicando: false,
      fase: "publicada",
      previa: null,
      painelLideranca: false,
      publicada: pub.ok ? pub.data : null,
      bannerOk: `Rotação publicada — ${formatDiaBr(diaIso)} · ${labelTurnoCurto(turno)} · ${b.nome}.`,
    });
  };

  const handleRegenerar = (slug: string) => {
    patchBloco(slug, {
      fase: "idle",
      previa: null,
      slotMin: 30,
      poolSl: [],
      painelLideranca: false,
      erroAcao: null,
      bannerOk: null,
    });
  };

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

  const loadingInicial = loadingLista || (estudios.length > 0 && Object.keys(blocos).length === 0);

  if (loadingInicial) {
    return (
      <div style={pageBox}>
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
      </div>
    );
  }

  if (erroGeral) {
    return (
      <div style={pageBox}>
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
          {erroGeral}
        </div>
      </div>
    );
  }

  if (estudios.length === 0) {
    return (
      <div style={pageBox}>
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Nenhum estúdio ativo para gerar a rotação.
        </div>
      </div>
    );
  }

  return (
    <>
      {estudios.map((est) => {
        const b = blocos[est.slug] ?? blocoVazio(est.slug, est.nome);
        const kpis = kpisDoPool(b.pool, presencaAtualMap, presencaAntMap);
        const destinos = estudios.filter((e) => e.slug !== est.slug);
        return (
          <BlocoRotacaoEstudio
            key={est.slug}
            pageBox={pageBox}
            ghostBtn={ghostBtn}
            t={t}
            brand={brand}
            diaIso={diaIso}
            turno={turno}
            bloco={b}
            kpis={kpis}
            destinos={destinos}
            podeGerar={podeGerar}
            podeLideranca={podeLideranca}
            movendoId={movendoId}
            onGerar={() => handleGerar(est.slug)}
            onToggleSlot={() => handleToggleSlot(est.slug)}
            onTogglePainelLideranca={() =>
              patchBloco(est.slug, { painelLideranca: !b.painelLideranca })
            }
            onIncluirLideranca={(p) => handleIncluirLideranca(est.slug, p)}
            onPublicar={() => void handlePublicar(est.slug)}
            onRegenerar={() => handleRegenerar(est.slug)}
            onToggleFaltaGp={(id) => {
              patchBloco(est.slug, {
                pool: b.pool.map((x) =>
                  x.funcionarioId === id ? { ...x, falta: !x.falta } : x,
                ),
                fase: b.fase === "previa" ? "idle" : b.fase,
                previa: null,
                painelLideranca: false,
              });
            }}
            onToggleFaltaSl={(id) => {
              patchBloco(est.slug, {
                poolSl: b.poolSl.map((x) =>
                  x.funcionarioId === id ? { ...x, falta: !x.falta } : x,
                ),
                fase: b.fase === "previa" ? "idle" : b.fase,
                previa: null,
              });
            }}
            onMover={(fid, dest) => void handleMover(est.slug, fid, dest)}
            onRestaurar={(fid) => void handleRestaurar(est.slug, fid)}
            onTrocarLinhas={(from, to) => handleTrocarLinhas(est.slug, from, to)}
          />
        );
      })}
    </>
  );
}

function BlocoRotacaoEstudio({
  pageBox,
  ghostBtn,
  t,
  brand,
  diaIso,
  turno,
  bloco,
  kpis,
  destinos,
  podeGerar,
  podeLideranca,
  movendoId,
  onGerar,
  onToggleSlot,
  onTogglePainelLideranca,
  onIncluirLideranca,
  onPublicar,
  onRegenerar,
  onToggleFaltaGp,
  onToggleFaltaSl,
  onMover,
  onRestaurar,
  onTrocarLinhas,
}: {
  pageBox: CSSProperties;
  ghostBtn: CSSProperties;
  t: ReturnType<typeof useApp>["theme"];
  brand: ReturnType<typeof useDashboardBrand>;
  diaIso: string;
  turno: ControleTurnoTurno;
  bloco: BlocoEstudioState;
  kpis: { escalados: number; nao: number; horasAdicionais: number; disp: number };
  destinos: EstudioOpt[];
  podeGerar: boolean;
  podeLideranca: boolean;
  movendoId: string | null;
  onGerar: () => void;
  onToggleSlot: () => void;
  onTogglePainelLideranca: () => void;
  onIncluirLideranca: (p: RotacaoGpPool) => void;
  onPublicar: () => void;
  onRegenerar: () => void;
  onToggleFaltaGp: (id: string) => void;
  onToggleFaltaSl: (id: string) => void;
  onMover: (funcionarioId: string, destinoSlug: string) => void;
  onRestaurar: (funcionarioId: string) => void;
  onTrocarLinhas: (from: number, to: number) => void;
}) {
  const dataTable = useDataTableBlock();
  const [dragLinhaIdx, setDragLinhaIdx] = useState<number | null>(null);
  const [dropLinhaIdx, setDropLinhaIdx] = useState<number | null>(null);

  const liderancasCompativeis = useMemo(() => {
    const idsNoPool = new Set(bloco.poolSl.map((g) => g.funcionarioId));
    return bloco.liderancasDia.filter((g) => !idsNoPool.has(g.funcionarioId));
  }, [bloco.liderancasDia, bloco.poolSl]);

  const mesaTipoMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const mesa of bloco.ctx?.mesas ?? []) {
      if (mesa.numeroMesa) m[mesa.numeroMesa] = mesa.tipoJogo;
    }
    return m;
  }, [bloco.ctx]);

  const mesaCoresMap = useMemo(() => mapaCoresMesasRotacao(bloco.ctx?.mesas ?? []), [bloco.ctx]);

  const slotAtual = bloco.previa?.slotMin ?? bloco.publicada?.slotMinutos ?? bloco.slotMin;
  const slotAlvo = slotAtual === 20 ? 30 : 20;

  const subPool = `${labelTurnoCurto(turno)} · consolidado do estúdio`;

  const gradeSlots =
    bloco.fase === "publicada"
      ? (bloco.publicada?.slots ?? [])
      : (bloco.previa?.slots ?? []);
  const gradeGps =
    bloco.fase === "publicada"
      ? (bloco.publicada?.gps ?? []).map((g) => ({
          funcionarioId: g.funcionarioId,
          nomeExibicao: g.nomeExibicao,
          nickname: g.nickname,
          isShiftLead: false as boolean | undefined,
        }))
      : (bloco.previa?.gps ?? []);
  const gradeMatrix =
    bloco.fase === "publicada" ? (bloco.publicada?.matrix ?? []) : (bloco.previa?.matrix ?? []);
  const gradeFaltosos =
    bloco.fase === "publicada" ? (bloco.publicada?.faltosos ?? []) : (bloco.previa?.faltosos ?? []);

  const subGrade =
    bloco.fase === "publicada" && bloco.publicada
      ? `${formatDiaBr(diaIso)} · ${labelTurnoCurto(turno)} · ${bloco.nome} · ${bloco.publicada.modeloN} GPs · ${bloco.publicada.slotMinutos} min`
      : bloco.fase === "previa" && bloco.previa
        ? `${formatDiaBr(diaIso)} · ${labelTurnoCurto(turno)} · ${bloco.nome} · ${bloco.previa.modeloN} GPs · ${bloco.previa.slotMin} min`
        : "";

  const actions =
    bloco.fase === "idle" ? (
      podeGerar ? (
        <CtaCriarButton disabled={bloco.loading || !bloco.ctx} onClick={onGerar}>
          Gerar prévia
        </CtaCriarButton>
      ) : null
    ) : bloco.fase === "previa" ? (
      <>
        {podeLideranca ? (
          <button
            type="button"
            style={ghostBtn}
            disabled={bloco.loading || !bloco.ctx}
            aria-expanded={bloco.painelLideranca}
            aria-controls={`painel-incluir-lideranca-${bloco.slug}`}
            onClick={onTogglePainelLideranca}
          >
            Incluir Liderança
          </button>
        ) : null}
        <button
          type="button"
          disabled={bloco.loading || !bloco.ctx}
          style={{
            ...ghostBtn,
            borderColor: "rgba(245,158,11,0.45)",
            background: "color-mix(in srgb, #f59e0b 12%, transparent)",
            color: "#f59e0b",
            cursor: bloco.loading || !bloco.ctx ? "not-allowed" : "pointer",
            opacity: bloco.loading || !bloco.ctx ? 0.5 : 1,
          }}
          onClick={onToggleSlot}
          aria-label={`Alternar para rotação de ${slotAlvo} min`}
          title={`Alternar para rotação de ${slotAlvo} min`}
        >
          {`Rotação de ${slotAlvo}min`}
        </button>
        {podeGerar ? (
          <CtaCriarButton
            disabled={!bloco.previa}
            loading={bloco.publicando}
            loadingLabel="Publicando…"
            onClick={onPublicar}
          >
            Publicar
          </CtaCriarButton>
        ) : null}
      </>
    ) : (
      <button type="button" style={ghostBtn} onClick={onRegenerar}>
        Regenerar
      </button>
    );

  return (
    <div style={pageBox}>
      <BlocoHead title={`Pool do turno ${bloco.nome}`} sub={subPool} actions={actions} />

      {bloco.erro ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
          {bloco.erro}
        </div>
      ) : null}

      {bloco.erroAcao ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
          {bloco.erroAcao}
        </div>
      ) : null}

      {bloco.bannerOk ? (
        <div
          role="status"
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 10,
            background: "color-mix(in srgb, #22c55e 12%, transparent)",
            border: "1px solid rgba(34,197,94,0.35)",
            color: "#22c55e",
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          {bloco.bannerOk}
        </div>
      ) : null}

      {bloco.ctx && !bloco.ctx.escalaAprovada ? (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            borderRadius: 10,
            background: "color-mix(in srgb, #f59e0b 12%, transparent)",
            border: "1px solid #f59e0b55",
            color: "#f59e0b",
            fontSize: 12,
            fontFamily: FONT.body,
          }}
        >
          A escala de Game Presenter do mês ainda não está aprovada em Escala Estúdio. O pool fica vazio até a
          aprovação.
        </div>
      ) : null}

      {bloco.fase === "previa" && bloco.painelLideranca ? (
        <div
          id={`painel-incluir-lideranca-${bloco.slug}`}
          role="region"
          aria-label="Incluir liderança na rotação"
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid rgba(245,158,11,0.35)",
            background: "color-mix(in srgb, #f59e0b 10%, transparent)",
            color: "#f59e0b",
            fontFamily: FONT.body,
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Shift Leaders e Service Managers escalados no dia — disponíveis em qualquer turno
          </div>
          {liderancasCompativeis.length === 0 ? (
            <div style={{ fontSize: 13, color: t.textMuted }}>
              Nenhuma liderança disponível. Confira se há Shift Leader ou Service Manager com escala aprovada
              (Manhã, Tarde ou Noite) neste dia na Escala Estúdio.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {liderancasCompativeis.map((l) => (
                <button
                  key={l.funcionarioId}
                  type="button"
                  onClick={() => onIncluirLideranca(l)}
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

      {bloco.loading ? (
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
            <KpiMini label="Escalados" value={kpis.escalados} t={t} brand={brand} />
            <KpiMini label="Não Chegaram" value={kpis.nao} t={t} brand={brand} cor="#e84025" />
            <KpiMini label="Horas Adicionais" value={kpis.horasAdicionais} t={t} brand={brand} cor="#a78bfa" />
            <KpiMini label="Disponíveis" value={kpis.disp} t={t} brand={brand} cor="#22c55e" />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {bloco.pool.length === 0 && bloco.poolSl.length === 0 ? (
              <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                Nenhum Game Presenter escalado neste turno/estúdio.
              </span>
            ) : (
              <>
                {bloco.pool.map((g) => (
                  <PoolChip
                    key={g.funcionarioId}
                    gp={g}
                    t={t}
                    brandPrimary={brand.primary}
                    estudiosDestino={destinos}
                    movendo={movendoId === g.funcionarioId}
                    podeMover={podeLideranca && bloco.fase !== "publicada"}
                    onToggleFalta={() => onToggleFaltaGp(g.funcionarioId)}
                    onMover={(dest) => onMover(g.funcionarioId, dest)}
                    onRestaurar={
                      g.alocacaoOrigem === "manual" ? () => onRestaurar(g.funcionarioId) : undefined
                    }
                  />
                ))}
                {bloco.poolSl.map((g) => (
                  <PoolChip
                    key={`sl-${g.funcionarioId}`}
                    gp={g}
                    t={t}
                    reserva
                    onToggleFalta={() => onToggleFaltaSl(g.funcionarioId)}
                  />
                ))}
              </>
            )}
          </div>

          {(bloco.fase === "previa" || bloco.fase === "publicada") && gradeSlots.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                <div style={{ fontFamily: FONT.body }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: t.textMuted,
                    }}
                  >
                    {bloco.fase === "publicada" ? "Rotação publicada" : "Pré-visualização"}
                  </span>
                  {subGrade ? (
                    <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 6 }}>— {subGrade}</span>
                  ) : null}
                </div>
                {bloco.fase === "publicada" ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 20,
                      background: "color-mix(in srgb, #22c55e 14%, transparent)",
                      color: "#22c55e",
                      border: "1px solid rgba(34,197,94,0.35)",
                      fontFamily: FONT.body,
                    }}
                  >
                    Publicada
                  </span>
                ) : null}
              </div>

              <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
                <table style={getDataTableStyle({ minWidth: 720 })}>
                  <caption style={{ display: "none" }}>
                    Rotação por equipe e slot — {bloco.nome}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" style={dataTable.thHeaderSticky}>
                        Equipe
                      </th>
                      {gradeSlots.map((s) => (
                        <th key={s} scope="col" style={dataTable.thHeader}>
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gradeGps.map((g, i) => {
                      const podeDrag = bloco.fase === "previa" && podeLideranca;
                      const isDropTarget =
                        dropLinhaIdx === i && dragLinhaIdx !== null && dragLinhaIdx !== i;
                      const isDragging = dragLinhaIdx === i;
                      return (
                        <tr
                          key={g.funcionarioId}
                          style={{
                            background: isDropTarget
                              ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)"
                              : dataTable.zebraRow(i),
                            opacity: isDragging ? 0.55 : 1,
                          }}
                        >
                          <td
                            style={{
                              ...dataTable.tdSticky(),
                              textAlign: "center",
                              cursor: podeDrag ? "grab" : undefined,
                              outline: isDropTarget
                                ? "2px solid var(--brand-primary, #7c3aed)"
                                : undefined,
                              outlineOffset: -2,
                            }}
                            draggable={podeDrag}
                            onDragStart={(e) => {
                              if (!podeDrag) return;
                              setDragLinhaIdx(i);
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", String(i));
                            }}
                            onDragEnd={() => {
                              setDragLinhaIdx(null);
                              setDropLinhaIdx(null);
                            }}
                            onDragOver={(e) => {
                              if (!podeDrag || dragLinhaIdx === null) return;
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              if (dropLinhaIdx !== i) setDropLinhaIdx(i);
                            }}
                            onDragLeave={() => {
                              if (dropLinhaIdx === i) setDropLinhaIdx(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const raw = e.dataTransfer.getData("text/plain");
                              const from = Number.parseInt(raw, 10);
                              setDragLinhaIdx(null);
                              setDropLinhaIdx(null);
                              if (!Number.isFinite(from)) return;
                              onTrocarLinhas(from, i);
                            }}
                            title={
                              podeDrag
                                ? "Arraste para trocar a sequência de mesas com outro prestador"
                                : undefined
                            }
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                width: "100%",
                                textAlign: "center",
                              }}
                            >
                              {podeDrag ? (
                                <GripVertical
                                  size={14}
                                  aria-hidden
                                  style={{ flexShrink: 0, color: t.textMuted, opacity: 0.7 }}
                                />
                              ) : null}
                              <div style={{ minWidth: 0, textAlign: "center" }}>
                                <div style={{ fontWeight: 700, fontSize: 13, fontFamily: FONT.body }}>
                                  {g.nomeExibicao}
                                  {"isShiftLead" in g && g.isShiftLead ? (
                                    <span
                                      style={{
                                        marginLeft: 6,
                                        fontSize: 10,
                                        fontWeight: 800,
                                        letterSpacing: "0.04em",
                                        textTransform: "uppercase",
                                        padding: "2px 6px",
                                        borderRadius: 6,
                                        background: "color-mix(in srgb, #a78bfa 18%, transparent)",
                                        color: "#a78bfa",
                                        border: "1px solid #a78bfa55",
                                      }}
                                    >
                                      SL
                                    </span>
                                  ) : null}
                                </div>
                                <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
                                  {g.nickname}
                                </div>
                              </div>
                            </div>
                          </td>
                          {(gradeMatrix[i] ?? []).map((valor, ci) => (
                            <td key={ci} style={dataTable.tdCenter}>
                              <CelulaPill
                                valor={valor}
                                cor={mesaCoresMap[valor] ?? corMesaRotacao(mesaTipoMap[valor] ?? "", valor)}
                                t={t}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {gradeFaltosos.map((g, i) => {
                      const rowIndex = gradeGps.length + i;
                      return (
                        <tr key={`f-${g.funcionarioId}`} style={{ background: dataTable.zebraRow(rowIndex) }}>
                          <td style={{ ...dataTable.tdSticky(), textAlign: "center" }}>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ fontWeight: 700, fontSize: 13, fontFamily: FONT.body }}>
                                {g.nomeExibicao}
                              </div>
                              <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
                                {g.nickname}
                              </div>
                            </div>
                          </td>
                          {gradeSlots.map((s) => (
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
            </div>
          ) : null}
        </>
      )}
    </div>
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
  brand,
  cor,
}: {
  label: string;
  value: number;
  t: ReturnType<typeof useApp>["theme"];
  brand: ReturnType<typeof useDashboardBrand>;
  cor?: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "12px 14px",
        borderRadius: getPageContentBoxRadius(t.isDark),
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
          fontSize: 10,
          color: t.textMuted,
          fontFamily: FONT.body,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: cor ?? brand.primary,
          fontFamily: FONT.body,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PoolChip({
  gp,
  t,
  reserva,
  brandPrimary,
  estudiosDestino,
  movendo,
  podeMover,
  onToggleFalta,
  onMover,
  onRestaurar,
}: {
  gp: RotacaoGpPool;
  t: ReturnType<typeof useApp>["theme"];
  reserva?: boolean;
  brandPrimary?: string;
  estudiosDestino?: EstudioOpt[];
  movendo?: boolean;
  podeMover?: boolean;
  onToggleFalta: () => void;
  onMover?: (destinoSlug: string) => void;
  onRestaurar?: () => void;
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
      {!reserva && podeMover && onMover && (estudiosDestino?.length ?? 0) > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
          <select
            aria-label={`Mover ${gp.nomeExibicao} de estúdio`}
            disabled={movendo}
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              e.target.value = "";
              if (v) onMover(v);
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
            {estudiosDestino!.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.nome}
              </option>
            ))}
          </select>
          {onRestaurar ? (
            <button
              type="button"
              disabled={movendo}
              onClick={onRestaurar}
              style={{
                fontSize: 11,
                border: 0,
                background: "transparent",
                color: brandPrimary ?? "var(--brand-primary, #7c3aed)",
                cursor: movendo ? "not-allowed" : "pointer",
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
  const hex = cor ?? "#6b7280";
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 10px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        background: `color-mix(in srgb, ${hex} 18%, transparent)`,
        color: hex,
        border: `1px solid color-mix(in srgb, ${hex} 40%, transparent)`,
        fontFamily: FONT.body,
      }}
    >
      {valor}
    </span>
  );
}
