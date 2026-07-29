import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import {
  criarOfertaMarketplace,
  diasOfertaveisMarketplace,
  mensagemErroOfertaMarketplace,
  turnosOfertaveisNaFolgaMarketplace,
  type MarketplaceMeuContexto,
  type MarketplaceMinhaGrade,
  type TipoOfertaMarketplace,
} from "../../../lib/escalaMarketplace";

const TIPOS_PUBLICAVEIS: { value: TipoOfertaMarketplace; label: string; ajuda: string }[] = [
  {
    value: "venda_turno",
    label: "Venda de Turno",
    ajuda: "Você deixa o turno e um colega de folga assume o seu lugar.",
  },
  {
    value: "venda_folga",
    label: "Venda de Folga",
    ajuda: "Você está de folga e se oferece para trabalhar; quem aceita é o colega escalado no turno.",
  },
  {
    value: "oferta_troca",
    label: "Oferta de Troca",
    ajuda: "Você entrega este turno e assume, em troca, um dia de quem aceitar.",
  },
];

const MSG_SEM_ESCALA_APROVADA =
  "A escala deste mês ainda não está aprovada. Assim que for aprovada, os seus dias aparecem aqui.";

const MSG_ANTECEDENCIA_24H = "Apenas dias com ao menos 24h de antecedência.";

type Props = {
  open: boolean;
  onClose: () => void;
  onCriada: () => void;
  contexto: MarketplaceMeuContexto | null;
  grade: MarketplaceMinhaGrade;
  /** Rótulo do mês em foco no carrossel — orienta o prestador sobre a janela dos dias listados. */
  labelMes: string;
};

export function ModalOfertarMarketplace({
  open,
  onClose,
  onCriada,
  contexto,
  grade,
  labelMes,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  const [tipo, setTipo] = useState<TipoOfertaMarketplace>("venda_turno");
  const [diaIso, setDiaIso] = useState("");
  const [turnoFolga, setTurnoFolga] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTipo("venda_turno");
    setDiaIso("");
    setTurnoFolga("");
    setObservacao("");
    setErro(null);
    setGravando(false);
  }, [open]);

  useEffect(() => {
    setDiaIso("");
    setTurnoFolga("");
    setErro(null);
  }, [tipo]);

  const dias = useMemo(
    () => diasOfertaveisMarketplace(tipo, grade.valorPorIso),
    [tipo, grade.valorPorIso],
  );

  const turnosFolga = useMemo(() => {
    if (tipo !== "venda_folga" || !diaIso || !contexto) return [];
    return turnosOfertaveisNaFolgaMarketplace(
      diaIso,
      grade.valorPorIso,
      contexto.horario,
      contexto.operadora,
    );
  }, [tipo, diaIso, contexto, grade.valorPorIso]);

  if (!open) return null;

  const diaSelecionado = dias.find((d) => d.iso === diaIso) ?? null;
  const tipoAtual = TIPOS_PUBLICAVEIS.find((o) => o.value === tipo)!;
  const semDias = dias.length === 0;

  const inputStyle: CSSProperties = {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 14,
    fontFamily: FONT.body,
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
  };

  function validar(): string | null {
    if (!contexto?.funcionarioId) {
      return "Não encontramos o seu cadastro de prestador de estúdio. Entre em contato com o suporte.";
    }
    if (!grade.aprovada) return MSG_SEM_ESCALA_APROVADA;
    if (!diaIso || !diaSelecionado) return "Selecione o dia da oferta.";
    if (tipo === "venda_folga") {
      if (turnosFolga.length === 0) {
        return "Nenhum turno respeita o intervalo mínimo de 12h entre turnos neste dia de folga.";
      }
      if (!turnoFolga) return "Selecione o turno que pretende trabalhar.";
    }
    return null;
  }

  async function confirmar() {
    const v = validar();
    if (v) {
      setErro(v);
      return;
    }
    const dia = diaSelecionado!;
    setGravando(true);
    setErro(null);

    const res = await criarOfertaMarketplace({
      tipo,
      diaIso: dia.iso,
      valorCelula: dia.valorCelula,
      turnoLabel: tipo === "venda_folga" ? turnoFolga : dia.turno,
      observacao: observacao.trim() || null,
    });

    setGravando(false);
    if (!res.ok) {
      setErro(mensagemErroOfertaMarketplace(res.error));
      return;
    }
    onCriada();
    onClose();
  }

  return (
    <ModalBase maxWidth={520} onClose={onClose} zIndex={1140}>
      <ModalHeader title="Ofertar" onClose={onClose} />
      <div style={{ padding: "4px 4px 0", fontFamily: FONT.body, color: t.text }}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle} htmlFor="mkt-ofertar-tipo">
            Tipo de oferta
            <CampoObrigatorioMark />
          </label>
          <select
            id="mkt-ofertar-tipo"
            aria-label="Tipo de oferta"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoOfertaMarketplace)}
            style={inputStyle}
          >
            {TIPOS_PUBLICAVEIS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
            {tipoAtual.ajuda}
          </p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle} htmlFor="mkt-ofertar-dia">
            {tipo === "venda_folga" ? "Dia de folga" : "Dia do turno"}
            <CampoObrigatorioMark />
          </label>
          <select
            id="mkt-ofertar-dia"
            aria-label={tipo === "venda_folga" ? "Dia de folga" : "Dia do turno"}
            value={diaIso}
            onChange={(e) => setDiaIso(e.target.value)}
            disabled={semDias}
            style={inputStyle}
          >
            <option value="">Selecione…</option>
            {dias.map((d) => (
              <option key={d.iso} value={d.iso}>
                {d.label}
              </option>
            ))}
          </select>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
            {!grade.aprovada
              ? MSG_SEM_ESCALA_APROVADA
              : semDias
                ? tipo === "venda_folga"
                  ? `Sem folgas em ${labelMes} com ao menos 24h de antecedência.`
                  : `Sem dias escalados em ${labelMes} com ao menos 24h de antecedência.`
                : MSG_ANTECEDENCIA_24H}
          </p>
        </div>

        {tipo === "venda_folga" ? (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="mkt-ofertar-turno">
              Turno que pretende trabalhar
              <CampoObrigatorioMark />
            </label>
            <select
              id="mkt-ofertar-turno"
              aria-label="Turno que pretende trabalhar"
              value={turnoFolga}
              onChange={(e) => setTurnoFolga(e.target.value)}
              disabled={!diaIso || turnosFolga.length === 0}
              style={inputStyle}
            >
              <option value="">Selecione…</option>
              {turnosFolga.map((turno) => (
                <option key={turno} value={turno}>
                  {turno}
                </option>
              ))}
            </select>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
              {!diaIso
                ? "Escolha primeiro o dia de folga."
                : turnosFolga.length === 0
                  ? "Nenhum turno respeita o intervalo mínimo de 12h entre turnos neste dia."
                  : "Apenas turnos com 12h de intervalo em relação ao seu último turno e ao próximo."}
            </p>
          </div>
        ) : null}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle} htmlFor="mkt-ofertar-obs">
            Observação
          </label>
          <textarea
            id="mkt-ofertar-obs"
            aria-label="Observação da oferta"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            placeholder="Contexto que ajude quem for aceitar"
            style={{ ...inputStyle, resize: "vertical", minHeight: 72, lineHeight: 1.45 }}
          />
        </div>

        {erro ? (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#e84025" }} role="alert" aria-live="polite">
            {erro}
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            marginTop: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: "transparent",
              color: t.text,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONT.body,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={gravando || semDias}
            onClick={() => void confirmar()}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: `1px solid ${brand.accent}`,
              background: brand.accent,
              color: "#fff",
              fontWeight: 700,
              cursor: gravando || semDias ? "not-allowed" : "pointer",
              fontFamily: FONT.body,
              opacity: gravando ? 0.7 : 1,
            }}
          >
            {gravando ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color="#fff" />
                Salvando…
              </span>
            ) : (
              "Publicar oferta"
            )}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
