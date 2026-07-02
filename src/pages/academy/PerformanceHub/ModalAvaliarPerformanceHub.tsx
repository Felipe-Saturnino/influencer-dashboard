import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ClipboardList, Image, MessageSquare, NotebookPen, TableProperties } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import {
  FILTRO_BAR_TAB_ICON_PROPS,
  FiltroBarTabButton,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import type {
  PerformanceHubAvaliacao,
  PerformanceHubCriterioResposta,
  PerformanceHubJogoKey,
  PerformanceHubModalModo,
  PerformanceHubScoringConfig,
  PerformanceHubTipoAvaliacao,
  PerformanceHubTurno,
} from "../../../lib/academyPerformanceHubTypes";
import {
  ESCALA_NOTA_MAX,
  calcularNotaDimensao,
  calcularNotaTotal,
  criteriosMesaPorTipo,
  formatNotaPerformanceHub,
  formatPesoPerformanceHub,
} from "../../../lib/academyPerformanceHubScoring";
import {
  PERFORMANCE_HUB_JOGOS_META,
  PERFORMANCE_HUB_TURNOS,
} from "../../../lib/academyPerformanceHubDadosCatalog";
import type {
  PerformanceHubDadosPrefill,
  PerformanceHubEstudioCadastro,
  PerformanceHubMesaCadastro,
} from "../../../lib/academyPerformanceHubCadastroPrefill";
import {
  avaliacaoTemDadosSalvos,
  jogosDisponiveisModalPerformanceHub,
  mesasDoEstudioJogoNoCatalogo,
} from "../../../lib/academyPerformanceHubCadastroPrefill";
import { getGameTagChipStyle } from "../../../lib/gameIdentityColors";
import { GAME_IDENTITY_ICONS } from "../../../lib/gameIdentityIcons";

type ModalTab = "dados" | "comunicacao" | "imagem" | "mesa" | "consideracoes";

export type PerformanceHubAvaliacaoFormPayload = {
  tipoAvaliacao: PerformanceHubTipoAvaliacao;
  turno: PerformanceHubTurno;
  estudioId: string;
  jogo: PerformanceHubJogoKey | null;
  mesaId: string | null;
  pontosFortes: string;
  pontosDesenvolver: string;
  criterios: Record<string, PerformanceHubCriterioResposta>;
  notaComunicacao: number | null;
  notaImagem: number | null;
  notaMesa: number | null;
  notaTotal: number | null;
  videoUrl: string | null;
  videoNome: string | null;
};

type Props = {
  avaliacao: PerformanceHubAvaliacao;
  config: PerformanceHubScoringConfig;
  modo: PerformanceHubModalModo;
  estudios: PerformanceHubEstudioCadastro[];
  mesas: PerformanceHubMesaCadastro[];
  getPrefill: (staffId?: string | null, nome?: string | null) => PerformanceHubDadosPrefill | null;
  onClose: () => void;
  onSalvar: (payload: PerformanceHubAvaliacaoFormPayload) => void;
  onConcluir: (payload: PerformanceHubAvaliacaoFormPayload) => void;
};

type RespostasPorSlug = Record<string, PerformanceHubCriterioResposta>;

const TABS: { key: ModalTab; label: string; icon: typeof BarChart3 }[] = [
  { key: "dados", label: "Dados da Avaliação", icon: ClipboardList },
  { key: "comunicacao", label: "Comunicação", icon: MessageSquare },
  { key: "imagem", label: "Imagem", icon: Image },
  { key: "mesa", label: "Mesa", icon: TableProperties },
  { key: "consideracoes", label: "Considerações", icon: NotebookPen },
];

const TIPO_AVALIACAO_OPTIONS: { value: PerformanceHubTipoAvaliacao; label: string }[] = [
  { value: "performance_coach", label: "Avaliação de Performance Coach" },
  { value: "extra", label: "Avaliação Extra" },
];

function mapRespostas(criterios: { slug: string }[], existentes?: Record<string, PerformanceHubCriterioResposta>): RespostasPorSlug {
  return criterios.reduce<RespostasPorSlug>((acc, c) => {
    acc[c.slug] = existentes?.[c.slug] ?? { nota: null, comentario: "" };
    return acc;
  }, {});
}

function horaFormatada(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ModalAvaliarPerformanceHub({
  avaliacao,
  config,
  modo,
  estudios,
  mesas,
  getPrefill,
  onClose,
  onSalvar,
  onConcluir,
}: Props) {
  const { theme: t, isDark } = useApp();
  const brand = useDashboardBrand();
  const somenteLeitura = modo === "ver";
  const videoInputRef = useRef<HTMLInputElement>(null);

  const prefillAtual = getPrefill(avaliacao.avaliadoStaffId, avaliacao.avaliadoNome);

  const [aba, setAba] = useState<ModalTab>("dados");
  const [tipoAvaliacao, setTipoAvaliacao] = useState<PerformanceHubTipoAvaliacao | "">(
    avaliacao.tipoAvaliacao ?? "",
  );
  const [turno, setTurno] = useState<PerformanceHubTurno>(
    avaliacao.turno ?? prefillAtual?.turno ?? "Manhã",
  );
  const [estudioId, setEstudioId] = useState(
    avaliacao.estudioId ?? prefillAtual?.estudioId ?? estudios[0]?.slug ?? "",
  );
  const [jogo, setJogo] = useState<PerformanceHubJogoKey | "">(avaliacao.jogo ?? prefillAtual?.jogo ?? "");
  const [mesaId, setMesaId] = useState<string>(avaliacao.mesaId ?? prefillAtual?.mesaId ?? "");
  const [videoNome, setVideoNome] = useState(avaliacao.videoNome ?? "");
  const [videoUrlLocal, setVideoUrlLocal] = useState(avaliacao.videoUrl ?? "");
  const [pontosFortes, setPontosFortes] = useState(avaliacao.pontosFortes ?? "");
  const [pontosDesenvolver, setPontosDesenvolver] = useState(avaliacao.pontosDesenvolver ?? "");
  const [respostasComunicacao, setRespostasComunicacao] = useState<RespostasPorSlug>(() =>
    mapRespostas(config.comunicacao.criterios, avaliacao.criterios),
  );
  const [respostasImagem, setRespostasImagem] = useState<RespostasPorSlug>(() =>
    mapRespostas(config.imagem.criterios, avaliacao.criterios),
  );
  const [respostasMesa, setRespostasMesa] = useState<RespostasPorSlug>(() =>
    mapRespostas(config.mesa.criterios, avaliacao.criterios),
  );
  const [erros, setErros] = useState<string[]>([]);
  const [statusRascunho, setStatusRascunho] = useState("");
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());

  const jogoMeta = jogo ? PERFORMANCE_HUB_JOGOS_META[jogo] : null;
  const mesaTipo = jogoMeta?.mesaTipo ?? "cartas";
  const mesaCriterios = useMemo(() => criteriosMesaPorTipo(config, mesaTipo), [config, mesaTipo]);
  const jogosStaff = useMemo(
    () => getPrefill(avaliacao.avaliadoStaffId, avaliacao.avaliadoNome)?.jogosStaff ?? [],
    [avaliacao.avaliadoStaffId, avaliacao.avaliadoNome, getPrefill],
  );
  const jogosDisponiveis = useMemo(
    () => (estudioId ? jogosDisponiveisModalPerformanceHub(estudioId, mesas, jogosStaff) : []),
    [estudioId, mesas, jogosStaff],
  );
  const mesasDisponiveis = useMemo(
    () => mesasDoEstudioJogoNoCatalogo(estudioId, jogo, mesas),
    [estudioId, jogo, mesas],
  );
  const showMesaTab = Boolean(jogoMeta);

  useEffect(() => {
    if (avaliacaoTemDadosSalvos(avaliacao)) return;
    const prefill = getPrefill(avaliacao.avaliadoStaffId, avaliacao.avaliadoNome);
    if (!prefill) return;
    if (prefill.turno) setTurno(prefill.turno);
    if (prefill.estudioId) setEstudioId(prefill.estudioId);
    if (prefill.jogo) setJogo(prefill.jogo);
    if (prefill.mesaId) setMesaId(prefill.mesaId);
  }, [avaliacao, getPrefill]);

  useEffect(() => {
    if (jogo && !jogosDisponiveis.includes(jogo)) {
      setJogo("");
      setMesaId("");
    }
  }, [estudioId, jogosDisponiveis, jogo]);

  useEffect(() => {
    if (jogo && mesasDisponiveis.length > 0 && (mesaId === "" || !mesasDisponiveis.includes(mesaId))) {
      setMesaId(mesasDisponiveis[0]!);
    }
    if (jogo && mesasDisponiveis.length === 0) setMesaId("");
  }, [jogo, mesasDisponiveis, mesaId]);

  useEffect(() => {
    if (!jogo && jogosDisponiveis.length > 0 && !avaliacao.jogo) {
      setJogo(jogosDisponiveis[0]!);
    }
  }, [jogosDisponiveis, jogo, avaliacao.jogo]);

  const resultado = useMemo(() => {
    const notaComunicacao = calcularNotaDimensao(
      config.comunicacao.criterios.map((c) => ({
        nota: respostasComunicacao[c.slug]?.nota ?? Number.NaN,
        peso: c.peso,
      })),
    );
    const notaImagem = calcularNotaDimensao(
      config.imagem.criterios.map((c) => ({
        nota: respostasImagem[c.slug]?.nota ?? Number.NaN,
        peso: c.peso,
      })),
    );
    const notaMesa = calcularNotaDimensao(
      mesaCriterios.map((c) => ({
        nota: respostasMesa[c.slug]?.nota ?? Number.NaN,
        peso: c.peso,
      })),
    );
    const notaTotal = calcularNotaTotal({ comunicacao: notaComunicacao, imagem: notaImagem, mesa: notaMesa }, config);
    return { notaComunicacao, notaImagem, notaMesa, notaTotal };
  }, [config, respostasComunicacao, respostasImagem, respostasMesa, mesaCriterios]);

  function montarPayload(): PerformanceHubAvaliacaoFormPayload {
    const criterios: Record<string, PerformanceHubCriterioResposta> = {
      ...respostasComunicacao,
      ...respostasImagem,
      ...respostasMesa,
    };
    return {
      tipoAvaliacao: (tipoAvaliacao || "performance_coach") as PerformanceHubTipoAvaliacao,
      turno,
      estudioId,
      jogo: jogo || null,
      mesaId: mesaId.trim() || null,
      pontosFortes: pontosFortes.trim(),
      pontosDesenvolver: pontosDesenvolver.trim(),
      criterios,
      ...resultado,
      videoUrl: videoUrlLocal || null,
      videoNome: videoNome || null,
    };
  }

  function validarConcluir(): string[] {
    const lista: string[] = [];
    const invalid = new Set<string>();

    if (!tipoAvaliacao) {
      lista.push("Selecione o tipo de avaliação.");
      invalid.add("tipoAvaliacao");
    }

    if (tipoAvaliacao !== "performance_coach") return lista;

    if (!turno) {
      lista.push("Preencha todos os campos em Dados da Avaliação.");
      invalid.add("turno");
    }
    if (!estudioId) {
      lista.push("Preencha todos os campos em Dados da Avaliação.");
      invalid.add("estudioId");
    }
    if (!jogo) {
      lista.push("Preencha todos os campos em Dados da Avaliação.");
      invalid.add("jogo");
    }
    if (mesaId === "") {
      lista.push("Preencha todos os campos em Dados da Avaliação.");
      invalid.add("mesaId");
    }
    if (!videoNome && !videoUrlLocal) {
      lista.push("Envie o vídeo da avaliação.");
      invalid.add("video");
    }

    const validarCriterios = (prefix: string, criterios: { slug: string; label: string }[], respostas: RespostasPorSlug) => {
      for (const c of criterios) {
        const r = respostas[c.slug];
        if (r?.nota == null) {
          lista.push("Preencha todas as notas dos critérios.");
          invalid.add(`${prefix}-${c.slug}-nota`);
        }
        if (!r?.comentario?.trim()) {
          lista.push("Preencha todos os comentários dos critérios.");
          invalid.add(`${prefix}-${c.slug}-comentario`);
        }
      }
    };

    validarCriterios("com", config.comunicacao.criterios, respostasComunicacao);
    validarCriterios("img", config.imagem.criterios, respostasImagem);
    if (showMesaTab) validarCriterios("mesa", mesaCriterios, respostasMesa);

    if (!pontosFortes.trim()) {
      lista.push("Preencha Pontos Fortes e Pontos a Desenvolver.");
      invalid.add("pontosFortes");
    }
    if (!pontosDesenvolver.trim()) {
      lista.push("Preencha Pontos Fortes e Pontos a Desenvolver.");
      invalid.add("pontosDesenvolver");
    }

    setInvalidFields(invalid);
    return [...new Set(lista)];
  }

  function handleSalvarRascunho() {
    setErros([]);
    setInvalidFields(new Set());
    onSalvar(montarPayload());
    setStatusRascunho(`Rascunho salvo às ${horaFormatada()} — você pode continuar depois.`);
  }

  function handleConcluir() {
    const lista = validarConcluir();
    if (lista.length > 0) {
      setErros(lista);
      setStatusRascunho("");
      return;
    }
    setErros([]);
    onConcluir(montarPayload());
  }

  function handleVideoChange(file: File | null) {
    if (!file) {
      setVideoNome("");
      setVideoUrlLocal("");
      return;
    }
    setVideoNome(file.name);
    setVideoUrlLocal(URL.createObjectURL(file));
    setInvalidFields((prev) => {
      const next = new Set(prev);
      next.delete("video");
      return next;
    });
  }

  function renderCriterios(
    prefix: string,
    criterios: { slug: string; label: string; peso: number }[],
    respostas: RespostasPorSlug,
    onChange: (slug: string, patch: Partial<PerformanceHubCriterioResposta>) => void,
  ) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {criterios.map((criterio) => {
          const resposta = respostas[criterio.slug] ?? { nota: null, comentario: "" };
          const notaInvalid = invalidFields.has(`${prefix}-${criterio.slug}-nota`);
          const comentInvalid = invalidFields.has(`${prefix}-${criterio.slug}-comentario`);
          return (
            <div
              key={criterio.slug}
              style={{
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 12,
                background: t.inputBg,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{criterio.label}</span>
                <span style={{ fontSize: 11, color: t.textMuted }}>Peso {formatPesoPerformanceHub(criterio.peso)}</span>
              </div>
              <div className="app-grid-2-tight" style={{ gap: 10 }}>
                <div>
                  <label htmlFor={`${prefix}-${criterio.slug}-nota`} style={labelStyle(t)}>
                    Nota (0–{ESCALA_NOTA_MAX})
                    {!somenteLeitura ? <CampoObrigatorioMark /> : null}
                  </label>
                  <select
                    id={`${prefix}-${criterio.slug}-nota`}
                    value={resposta.nota ?? ""}
                    disabled={somenteLeitura}
                    onChange={(e) =>
                      onChange(criterio.slug, {
                        nota: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    style={{
                      ...fieldStyle(t),
                      borderColor: notaInvalid ? "#e84025" : t.cardBorder,
                    }}
                    aria-label={`Nota para ${criterio.label}`}
                  >
                    <option value="">Selecione...</option>
                    {Array.from({ length: ESCALA_NOTA_MAX + 1 }, (_, i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor={`${prefix}-${criterio.slug}-coment`} style={labelStyle(t)}>
                    Comentário
                    {!somenteLeitura ? <CampoObrigatorioMark /> : null}
                  </label>
                  <textarea
                    id={`${prefix}-${criterio.slug}-coment`}
                    rows={2}
                    value={resposta.comentario}
                    disabled={somenteLeitura}
                    onChange={(e) => onChange(criterio.slug, { comentario: e.target.value })}
                    placeholder={`Observações sobre ${criterio.label.toLowerCase()}...`}
                    style={{
                      ...textareaStyle(t),
                      borderColor: comentInvalid ? "#e84025" : t.cardBorder,
                    }}
                    aria-label={`Comentário sobre ${criterio.label}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const tabsVisiveis = TABS.filter((tab) => tab.key !== "mesa" || showMesaTab);

  return (
    <ModalBase maxWidth={920} onClose={onClose}>
      <ModalHeader
        title={`${avaliacao.avaliadoNome} · ${avaliacao.data}`}
        onClose={onClose}
      />
      <p style={{ margin: "0 0 14px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
        Avaliador {avaliacao.avaliadorNome}
      </p>

      <div style={{ marginBottom: 14 }}>
        <label htmlFor="tipoAvaliacao" style={labelStyle(t)}>
          Tipo de Avaliação
          {!somenteLeitura ? <CampoObrigatorioMark /> : null}
        </label>
        <select
          id="tipoAvaliacao"
          value={tipoAvaliacao}
          disabled={somenteLeitura}
          onChange={(e) => {
            setTipoAvaliacao(e.target.value as PerformanceHubTipoAvaliacao | "");
            setErros([]);
          }}
          style={{
            ...fieldStyle(t),
            borderColor: invalidFields.has("tipoAvaliacao") ? "#e84025" : t.cardBorder,
          }}
          aria-label="Tipo de avaliação"
        >
          <option value="">Selecione...</option>
          {TIPO_AVALIACAO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {tipoAvaliacao === "extra" ? (
        <div
          style={{
            borderRadius: 12,
            border: `1px dashed ${t.cardBorder}`,
            padding: 20,
            textAlign: "center",
            color: t.textMuted,
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          Fluxo de <strong style={{ color: t.text }}>Avaliação Extra</strong> — em definição no handoff de produto.
        </div>
      ) : null}

      {tipoAvaliacao === "performance_coach" ? (
        <>
          {!somenteLeitura ? (
            <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 12, fontFamily: FONT.body }}>
              Os campos preenchidos permanecem salvos ao trocar de aba. <strong>Salvar</strong> grava rascunho;{" "}
              <strong>Concluir</strong> exige todos os campos obrigatórios (<CampoObrigatorioMark />).
            </p>
          ) : null}

          <div
            role="tablist"
            aria-label="Abas da avaliação de performance"
            style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
            onKeyDown={(e) =>
              onFiltroBarTabsKeyDown(
                e,
                tabsVisiveis.map((tab) => tab.key),
                setAba,
                (k) => `tab-modal-performance-${k}`,
              )
            }
          >
            {tabsVisiveis.map((tab) => {
              const Icon = tab.icon;
              return (
                <FiltroBarTabButton
                  key={tab.key}
                  id={`tab-modal-performance-${tab.key}`}
                  active={aba === tab.key}
                  aria-controls={`panel-modal-performance-${tab.key}`}
                  onClick={() => setAba(tab.key)}
                  icon={<Icon {...FILTRO_BAR_TAB_ICON_PROPS} />}
                >
                  {tab.label}
                </FiltroBarTabButton>
              );
            })}
          </div>

          <ModalTabPanel active={aba === "dados"} id="panel-modal-performance-dados" labelledBy="tab-modal-performance-dados">
            <div className="app-grid-2-tight" style={{ gap: 12 }}>
              <div>
                <label htmlFor="modalTurno" style={labelStyle(t)}>
                  Turno
                  {!somenteLeitura ? <CampoObrigatorioMark /> : null}
                </label>
                <select
                  id="modalTurno"
                  value={turno}
                  disabled={somenteLeitura}
                  onChange={(e) => setTurno(e.target.value as PerformanceHubTurno)}
                  style={{
                    ...fieldStyle(t),
                    borderColor: invalidFields.has("turno") ? "#e84025" : t.cardBorder,
                  }}
                  aria-label="Turno"
                >
                  {PERFORMANCE_HUB_TURNOS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="modalEstudio" style={labelStyle(t)}>
                  Estúdio
                  {!somenteLeitura ? <CampoObrigatorioMark /> : null}
                </label>
                <select
                  id="modalEstudio"
                  value={estudioId}
                  disabled={somenteLeitura}
                  onChange={(e) => setEstudioId(e.target.value)}
                  style={{
                    ...fieldStyle(t),
                    borderColor: invalidFields.has("estudioId") ? "#e84025" : t.cardBorder,
                  }}
                  aria-label="Estúdio"
                >
                  {estudios.map((est) => (
                    <option key={est.slug} value={est.slug}>
                      {est.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="modalJogo" style={{ ...labelStyle(t), display: "flex", alignItems: "center", gap: 8 }}>
                  <span>
                    Jogo
                    {!somenteLeitura ? <CampoObrigatorioMark /> : null}
                  </span>
                  {jogoMeta ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        ...chipFromGame(jogoMeta.gameKey, isDark ?? false),
                      }}
                    >
                      {GAME_IDENTITY_ICONS[jogoMeta.gameKey]}
                      {jogoMeta.label}
                    </span>
                  ) : null}
                </label>
                <select
                  id="modalJogo"
                  value={jogo}
                  disabled={somenteLeitura}
                  onChange={(e) => setJogo(e.target.value as PerformanceHubJogoKey)}
                  style={{
                    ...fieldStyle(t),
                    borderColor: invalidFields.has("jogo") ? "#e84025" : t.cardBorder,
                  }}
                  aria-label="Jogo"
                >
                  <option value="">Selecione...</option>
                  {jogosDisponiveis.map((key) => (
                    <option key={key} value={key}>
                      {PERFORMANCE_HUB_JOGOS_META[key].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="modalMesa" style={labelStyle(t)}>
                  Mesa
                  {!somenteLeitura ? <CampoObrigatorioMark /> : null}
                </label>
                <select
                  id="modalMesa"
                  value={mesaId}
                  disabled={somenteLeitura || mesasDisponiveis.length === 0}
                  onChange={(e) => setMesaId(e.target.value)}
                  style={{
                    ...fieldStyle(t),
                    borderColor: invalidFields.has("mesaId") ? "#e84025" : t.cardBorder,
                  }}
                  aria-label="Mesa"
                >
                  <option value="">Selecione...</option>
                  {mesasDisponiveis.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: 11, color: t.textMuted, marginTop: 6, fontFamily: FONT.body }}>
                  Número da mesa (ID Spin) — cadastro em Gestão de Estúdios → Mesas.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label htmlFor="modalVideo" style={labelStyle(t)}>
                Vídeo da avaliação
                {!somenteLeitura ? <CampoObrigatorioMark /> : null}
              </label>
              {somenteLeitura && videoUrlLocal ? (
                <a
                  href={videoUrlLocal}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: brand.primary, fontSize: 13, fontWeight: 600, fontFamily: FONT.body }}
                >
                  Assistir
                </a>
              ) : (
                <>
                  <input
                    ref={videoInputRef}
                    id="modalVideo"
                    type="file"
                    accept="video/*"
                    disabled={somenteLeitura}
                    onChange={(e) => handleVideoChange(e.target.files?.[0] ?? null)}
                    style={{
                      width: "100%",
                      fontSize: 13,
                      fontFamily: FONT.body,
                      color: t.text,
                    }}
                    aria-label="Enviar vídeo da avaliação"
                  />
                  {videoNome ? (
                    <p style={{ fontSize: 12, color: t.text, marginTop: 6, fontFamily: FONT.body }}>{videoNome}</p>
                  ) : null}
                  <p style={{ fontSize: 11, color: t.textMuted, marginTop: 6, fontFamily: FONT.body }}>
                    Envie a gravação da sessão avaliada (formatos de vídeo comuns).
                  </p>
                </>
              )}
            </div>
          </ModalTabPanel>

          <ModalTabPanel
            active={aba === "comunicacao"}
            id="panel-modal-performance-comunicacao"
            labelledBy="tab-modal-performance-comunicacao"
          >
            {renderCriterios("com", config.comunicacao.criterios, respostasComunicacao, (slug, patch) =>
              setRespostasComunicacao((prev) => ({ ...prev, [slug]: { ...prev[slug], ...patch } })),
            )}
          </ModalTabPanel>

          <ModalTabPanel active={aba === "imagem"} id="panel-modal-performance-imagem" labelledBy="tab-modal-performance-imagem">
            {renderCriterios("img", config.imagem.criterios, respostasImagem, (slug, patch) =>
              setRespostasImagem((prev) => ({ ...prev, [slug]: { ...prev[slug], ...patch } })),
            )}
          </ModalTabPanel>

          {showMesaTab ? (
            <ModalTabPanel active={aba === "mesa"} id="panel-modal-performance-mesa" labelledBy="tab-modal-performance-mesa">
              {renderCriterios("mesa", mesaCriterios, respostasMesa, (slug, patch) =>
                setRespostasMesa((prev) => ({ ...prev, [slug]: { ...prev[slug], ...patch } })),
              )}
            </ModalTabPanel>
          ) : null}

          <ModalTabPanel
            active={aba === "consideracoes"}
            id="panel-modal-performance-consideracoes"
            labelledBy="tab-modal-performance-consideracoes"
          >
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label htmlFor="pontosFortes" style={labelStyle(t)}>
                  Pontos Fortes
                  {!somenteLeitura ? <CampoObrigatorioMark /> : null}
                </label>
                <textarea
                  id="pontosFortes"
                  rows={4}
                  value={pontosFortes}
                  disabled={somenteLeitura}
                  onChange={(e) => setPontosFortes(e.target.value)}
                  placeholder="Descreva os principais pontos fortes observados..."
                  style={{
                    ...textareaStyle(t),
                    borderColor: invalidFields.has("pontosFortes") ? "#e84025" : t.cardBorder,
                  }}
                  aria-label="Pontos fortes"
                />
              </div>
              <div>
                <label htmlFor="pontosDesenvolver" style={labelStyle(t)}>
                  Pontos a Desenvolver
                  {!somenteLeitura ? <CampoObrigatorioMark /> : null}
                </label>
                <textarea
                  id="pontosDesenvolver"
                  rows={4}
                  value={pontosDesenvolver}
                  disabled={somenteLeitura}
                  onChange={(e) => setPontosDesenvolver(e.target.value)}
                  placeholder="Descreva oportunidades de melhoria e desenvolvimento..."
                  style={{
                    ...textareaStyle(t),
                    borderColor: invalidFields.has("pontosDesenvolver") ? "#e84025" : t.cardBorder,
                  }}
                  aria-label="Pontos a desenvolver"
                />
              </div>
            </div>
          </ModalTabPanel>
        </>
      ) : null}

      {erros.length > 0 ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginTop: 12 }}>
          {erros.map((msg) => (
            <div key={msg}>{msg}</div>
          ))}
        </div>
      ) : null}

      {tipoAvaliacao ? (
        <div
          style={{
            marginTop: 14,
            borderTop: `1px solid ${t.cardBorder}`,
            paddingTop: 12,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 4, fontSize: 12, fontFamily: FONT.body }}>
            {tipoAvaliacao === "performance_coach" ? (
              <>
                <span style={{ color: t.textMuted }}>Comunicação: {formatNotaPerformanceHub(resultado.notaComunicacao)}</span>
                <span style={{ color: t.textMuted }}>Imagem: {formatNotaPerformanceHub(resultado.notaImagem)}</span>
                <span style={{ color: t.textMuted }}>Mesa: {formatNotaPerformanceHub(resultado.notaMesa)}</span>
                <strong style={{ color: t.text }}>Nota Final: {formatNotaPerformanceHub(resultado.notaTotal)}</strong>
              </>
            ) : null}
            {statusRascunho ? <span style={{ color: "#22c55e" }}>{statusRascunho}</span> : null}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={onClose} style={btnSecundario(t)}>
              Cancelar
            </button>
            {!somenteLeitura && tipoAvaliacao === "performance_coach" ? (
              <>
                <button type="button" onClick={handleSalvarRascunho} style={btnSecundario(t)}>
                  Salvar
                </button>
                <button type="button" onClick={handleConcluir} style={btnPrimario()}>
                  Concluir
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </ModalBase>
  );
}

function chipFromGame(gameKey: PerformanceHubJogoKey, isDark: boolean) {
  const chip = getGameTagChipStyle(gameKey, isDark);
  return {
    background: chip.bg,
    border: `1px solid ${chip.border}`,
    color: chip.color,
  };
}

function labelStyle(t: ReturnType<typeof useApp>["theme"]) {
  return {
    display: "block",
    fontSize: 12,
    color: t.textMuted,
    marginBottom: 6,
    fontFamily: FONT.body,
  } as const;
}

function fieldStyle(t: ReturnType<typeof useApp>["theme"]) {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    boxSizing: "border-box" as const,
  };
}

function textareaStyle(t: ReturnType<typeof useApp>["theme"]) {
  return {
    ...fieldStyle(t),
    resize: "vertical" as const,
    minHeight: 72,
  };
}

function btnSecundario(t: ReturnType<typeof useApp>["theme"]) {
  return {
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    padding: "10px 18px",
    cursor: "pointer",
    fontFamily: FONT.body,
    fontSize: 13,
    fontWeight: 700,
  };
}

function btnPrimario() {
  return {
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, var(--brand-primary, #4a2082), var(--brand-secondary, #1e36f8))",
    color: "#fff",
    padding: "10px 18px",
    cursor: "pointer",
    fontFamily: FONT.body,
    fontSize: 13,
    fontWeight: 700,
  };
}
