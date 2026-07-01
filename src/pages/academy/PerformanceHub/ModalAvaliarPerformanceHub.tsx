import { useMemo, useState } from "react";
import { BarChart3, ClipboardList, Image, MessageSquare, NotebookPen, TableProperties } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import {
  FILTRO_BAR_TAB_ICON_PROPS,
  FiltroBarTabButton,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import type {
  PerformanceHubAvaliacao,
  PerformanceHubMesaTipo,
  PerformanceHubScoringConfig,
} from "../../../lib/academyPerformanceHubTypes";
import {
  ESCALA_NOTA_MAX,
  calcularNotaDimensao,
  calcularNotaTotal,
  criteriosMesaPorTipo,
  formatNotaPerformanceHub,
} from "../../../lib/academyPerformanceHubScoring";

type ModalTab = "dados" | "comunicacao" | "imagem" | "mesa" | "consideracoes";

type ResultadoNotas = {
  notaComunicacao: number | null;
  notaImagem: number | null;
  notaMesa: number | null;
  notaTotal: number | null;
};

type Props = {
  avaliacao: PerformanceHubAvaliacao;
  config: PerformanceHubScoringConfig;
  onClose: () => void;
  onSalvar: (payload: ResultadoNotas) => void;
  onConcluir: (payload: ResultadoNotas) => void;
};

type NotasPorSlug = Record<string, number | null>;

const TABS: { key: ModalTab; label: string; icon: typeof BarChart3 }[] = [
  { key: "dados", label: "Dados", icon: ClipboardList },
  { key: "comunicacao", label: "Comunicação", icon: MessageSquare },
  { key: "imagem", label: "Imagem", icon: Image },
  { key: "mesa", label: "Mesa", icon: TableProperties },
  { key: "consideracoes", label: "Considerações", icon: NotebookPen },
];

export function ModalAvaliarPerformanceHub({
  avaliacao,
  config,
  onClose,
  onSalvar,
  onConcluir,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [aba, setAba] = useState<ModalTab>("dados");
  const [mesaTipo, setMesaTipo] = useState<PerformanceHubMesaTipo>("cartas");
  const [notasComunicacao, setNotasComunicacao] = useState<NotasPorSlug>(() => mapNotas(config.comunicacao.criterios));
  const [notasImagem, setNotasImagem] = useState<NotasPorSlug>(() => mapNotas(config.imagem.criterios));
  const [notasMesa, setNotasMesa] = useState<NotasPorSlug>(() => mapNotas(config.mesa.criterios));
  const [consideracoes, setConsideracoes] = useState("");

  const mesaCriterios = useMemo(() => criteriosMesaPorTipo(config, mesaTipo), [config, mesaTipo]);

  const resultado = useMemo(() => {
    const notaComunicacao = calcularNotaDimensao(
      config.comunicacao.criterios.map((c) => ({ nota: notasComunicacao[c.slug] ?? Number.NaN, peso: c.peso })),
    );
    const notaImagem = calcularNotaDimensao(
      config.imagem.criterios.map((c) => ({ nota: notasImagem[c.slug] ?? Number.NaN, peso: c.peso })),
    );
    const notaMesa = calcularNotaDimensao(
      mesaCriterios.map((c) => ({ nota: notasMesa[c.slug] ?? Number.NaN, peso: c.peso })),
    );
    const notaTotal = calcularNotaTotal(
      { comunicacao: notaComunicacao, imagem: notaImagem, mesa: notaMesa },
      config,
    );
    return { notaComunicacao, notaImagem, notaMesa, notaTotal };
  }, [config, notasComunicacao, notasImagem, notasMesa, mesaCriterios]);

  function renderCriterios(
    criterios: { slug: string; label: string }[],
    notas: NotasPorSlug,
    onChange: (slug: string, value: number | null) => void,
  ) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        {criterios.map((criterio) => (
          <label
            key={criterio.slug}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 10,
              alignItems: "center",
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 10,
              background: t.inputBg,
              padding: "10px 12px",
            }}
          >
            <span style={{ fontSize: 13, color: t.text }}>{criterio.label}</span>
            <input
              type="number"
              min={0}
              max={ESCALA_NOTA_MAX}
              step={0.1}
              value={notas[criterio.slug] ?? ""}
              placeholder="0-10"
              onChange={(e) => onChange(criterio.slug, parseNota(e.target.value))}
              style={{
                width: 96,
                textAlign: "center",
                padding: "8px 10px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.cardBg,
                color: t.text,
                fontSize: 12,
                fontFamily: FONT.body,
              }}
              aria-label={`Nota para ${criterio.label}`}
            />
          </label>
        ))}
      </div>
    );
  }

  return (
    <ModalBase maxWidth={900} onClose={onClose}>
      <ModalHeader title={`Avaliar Performance - ${avaliacao.avaliadoNome}`} onClose={onClose} />

      <div
        role="tablist"
        aria-label="Abas da avaliação de performance"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, TABS.map((t) => t.key), setAba, (k) => `tab-modal-performance-${k}`)}
      >
        {TABS.map((tab) => {
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
        <div style={{ display: "grid", gap: 12 }}>
          <div style={infoCardStyle(t)}>
            <strong>Avaliado:</strong> {avaliacao.avaliadoNome}
          </div>
          <div style={infoCardStyle(t)}>
            <strong>Avaliador:</strong> {avaliacao.avaliadorNome}
          </div>
          <div style={infoCardStyle(t)}>
            <strong>Data da avaliação:</strong> {avaliacao.data}
          </div>
          <div style={{ ...infoCardStyle(t), display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span>
              <strong>Tipo de mesa:</strong>
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {(["cartas", "roleta"] as PerformanceHubMesaTipo[]).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setMesaTipo(tipo)}
                  style={{
                    borderRadius: 10,
                    border: `1px solid ${mesaTipo === tipo ? brand.accent : t.cardBorder}`,
                    background: mesaTipo === tipo ? "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)" : t.inputBg,
                    color: mesaTipo === tipo ? brand.accent : t.textMuted,
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {tipo === "cartas" ? "Cartas" : "Roleta"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ModalTabPanel>

      <ModalTabPanel active={aba === "comunicacao"} id="panel-modal-performance-comunicacao" labelledBy="tab-modal-performance-comunicacao">
        {renderCriterios(config.comunicacao.criterios, notasComunicacao, (slug, value) =>
          setNotasComunicacao((prev) => ({ ...prev, [slug]: value })))}
      </ModalTabPanel>

      <ModalTabPanel active={aba === "imagem"} id="panel-modal-performance-imagem" labelledBy="tab-modal-performance-imagem">
        {renderCriterios(config.imagem.criterios, notasImagem, (slug, value) =>
          setNotasImagem((prev) => ({ ...prev, [slug]: value })))}
      </ModalTabPanel>

      <ModalTabPanel active={aba === "mesa"} id="panel-modal-performance-mesa" labelledBy="tab-modal-performance-mesa">
        {renderCriterios(mesaCriterios, notasMesa, (slug, value) =>
          setNotasMesa((prev) => ({ ...prev, [slug]: value })))}
      </ModalTabPanel>

      <ModalTabPanel active={aba === "consideracoes"} id="panel-modal-performance-consideracoes" labelledBy="tab-modal-performance-consideracoes">
        <label style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6 }}>
          Comentários do Performance Coach
        </label>
        <textarea
          value={consideracoes}
          onChange={(e) => setConsideracoes(e.target.value)}
          rows={6}
          style={{
            width: "100%",
            borderRadius: 12,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontFamily: FONT.body,
            fontSize: 13,
            padding: 12,
            resize: "vertical",
            boxSizing: "border-box",
          }}
          placeholder="Registre orientações, destaques e pontos de atenção..."
          aria-label="Considerações da avaliação"
        />
      </ModalTabPanel>

      <div
        style={{
          marginTop: 14,
          borderTop: `1px solid ${t.cardBorder}`,
          paddingTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 2, fontSize: 12, color: t.textMuted }}>
          <span>Comunicação: {formatNotaPerformanceHub(resultado.notaComunicacao)}</span>
          <span>Imagem: {formatNotaPerformanceHub(resultado.notaImagem)}</span>
          <span>Mesa: {formatNotaPerformanceHub(resultado.notaMesa)}</span>
          <strong style={{ color: t.text }}>Nota Final: {formatNotaPerformanceHub(resultado.notaTotal)}</strong>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => onSalvar(resultado)}
            style={{
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              padding: "10px 14px",
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => onConcluir(resultado)}
            style={{
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, var(--brand-primary, #4a2082), var(--brand-secondary, #1e36f8))",
              color: "#fff",
              padding: "10px 14px",
              cursor: "pointer",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Salvar e concluir
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

function mapNotas(criterios: { slug: string }[]): NotasPorSlug {
  return criterios.reduce<NotasPorSlug>((acc, c) => {
    acc[c.slug] = null;
    return acc;
  }, {});
}

function parseNota(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  if (parsed < 0) return 0;
  if (parsed > ESCALA_NOTA_MAX) return ESCALA_NOTA_MAX;
  return parsed;
}

function infoCardStyle(t: ReturnType<typeof useApp>["theme"]) {
  return {
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    padding: "10px 12px",
    fontSize: 13,
    color: t.text,
  };
}
