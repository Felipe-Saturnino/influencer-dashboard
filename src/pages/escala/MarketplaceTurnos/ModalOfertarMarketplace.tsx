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
  type DiaOfertavelMarketplace,
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
  "Nenhuma escala aprovada encontrada para os próximos meses. Assim que for aprovada, os seus dias aparecem aqui.";

const MSG_ANTECEDENCIA_24H =
  "Apenas turnos com início a pelo menos 4h da publicação (horário do turno ofertado ou desejado).";

const MSG_MULTI_DIAS = "Você pode marcar vários dias — cada dia gera uma oferta separada no mural.";

type Props = {
  open: boolean;
  onClose: () => void;
  onCriada: () => void;
  contexto: MarketplaceMeuContexto | null;
  /** Células de todos os meses com escala aprovada (não só o mês do carrossel). */
  grade: MarketplaceMinhaGrade;
  diasReservados: ReadonlySet<string>;
};

export function ModalOfertarMarketplace({
  open,
  onClose,
  onCriada,
  contexto,
  grade,
  diasReservados,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  const [tipo, setTipo] = useState<TipoOfertaMarketplace>("venda_turno");
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>([]);
  const [turnoPorDia, setTurnoPorDia] = useState<Record<string, string>>({});
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTipo("venda_turno");
    setDiasSelecionados([]);
    setTurnoPorDia({});
    setObservacao("");
    setErro(null);
    setGravando(false);
  }, [open]);

  useEffect(() => {
    setDiasSelecionados([]);
    setTurnoPorDia({});
    setErro(null);
  }, [tipo]);

  const ehFolga = tipo === "venda_folga";
  /** Troca continua com um único dia — o aceitante escolhe o dia que entrega em troca. */
  const multiDias = tipo !== "oferta_troca";

  const dias = useMemo(
    () =>
      diasOfertaveisMarketplace(tipo, grade.valorPorIso, {
        horario: contexto?.horario,
        operadora: contexto?.operadora,
        areaKey: contexto?.areaKey,
      }).filter((dia) => !diasReservados.has(dia.iso)),
    [tipo, grade.valorPorIso, contexto, diasReservados],
  );

  /** Turnos elegíveis (4h + 12h) por dia de folga — cada dia tem a sua lista. */
  const turnosPorDiaFolga = useMemo(() => {
    const out = new Map<string, string[]>();
    if (!ehFolga || !contexto) return out;
    for (const dia of dias) {
      out.set(
        dia.iso,
        turnosOfertaveisNaFolgaMarketplace(
          dia.iso,
          grade.valorPorIso,
          contexto.horario,
          contexto.operadora,
          new Date(),
          contexto.areaKey,
        ),
      );
    }
    return out;
  }, [ehFolga, contexto, dias, grade.valorPorIso]);

  if (!open) return null;

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

  const turnoSelectStyle: CSSProperties = {
    ...inputStyle,
    width: "auto",
    minWidth: 150,
    padding: "6px 10px",
    fontSize: 13,
  };

  function alternarDia(dia: DiaOfertavelMarketplace) {
    setErro(null);
    if (!multiDias) {
      setDiasSelecionados((prev) => (prev[0] === dia.iso ? [] : [dia.iso]));
      return;
    }
    setDiasSelecionados((prev) => {
      if (prev.includes(dia.iso)) return prev.filter((iso) => iso !== dia.iso);
      return [...prev, dia.iso].sort();
    });
    if (!ehFolga) return;
    setTurnoPorDia((prev) => {
      if (prev[dia.iso]) return prev;
      const turnos = turnosPorDiaFolga.get(dia.iso) ?? [];
      if (turnos.length !== 1) return prev;
      return { ...prev, [dia.iso]: turnos[0] };
    });
  }

  function definirTurnoDia(iso: string, turno: string) {
    setErro(null);
    setTurnoPorDia((prev) => ({ ...prev, [iso]: turno }));
  }

  function validar(): string | null {
    if (!contexto?.funcionarioId) {
      return "Não encontramos o seu cadastro de prestador de estúdio. Entre em contato com o suporte.";
    }
    if (!grade.aprovada) return MSG_SEM_ESCALA_APROVADA;
    if (diasSelecionados.length === 0) {
      return multiDias ? "Selecione ao menos um dia para ofertar." : "Selecione o dia da oferta.";
    }
    if (ehFolga) {
      for (const iso of diasSelecionados) {
        const turnos = turnosPorDiaFolga.get(iso) ?? [];
        if (turnos.length === 0) {
          return "Nenhum turno respeita as 4h de antecedência e o intervalo mínimo de 12h em um dos dias selecionados.";
        }
        if (!turnoPorDia[iso]) return "Selecione o turno que pretende trabalhar em cada dia marcado.";
      }
    }
    return null;
  }

  async function confirmar() {
    const v = validar();
    if (v) {
      setErro(v);
      return;
    }
    setGravando(true);
    setErro(null);

    const obs = observacao.trim() || null;
    const publicados: string[] = [];
    const falhas: { iso: string; error: string }[] = [];

    for (const iso of diasSelecionados) {
      const dia = dias.find((d) => d.iso === iso);
      if (!dia) {
        falhas.push({ iso, error: "not_found" });
        continue;
      }
      const res = await criarOfertaMarketplace({
        tipo,
        diaIso: dia.iso,
        valorCelula: dia.valorCelula,
        turnoLabel: ehFolga ? (turnoPorDia[iso] ?? "") : dia.turno,
        observacao: obs,
      });
      if (res.ok) publicados.push(iso);
      else falhas.push({ iso, error: res.error });
    }

    setGravando(false);

    if (publicados.length > 0) onCriada();

    if (falhas.length === 0) {
      onClose();
      return;
    }

    const motivo = mensagemErroOfertaMarketplace(falhas[0].error);
    if (publicados.length === 0) {
      setErro(motivo);
      return;
    }
    setDiasSelecionados(falhas.map((f) => f.iso));
    setErro(
      `Publicamos ${publicados.length} de ${publicados.length + falhas.length} ofertas. ` +
        `Dias não publicados: ${falhas.map((f) => labelDiaCurtoBr(f.iso)).join(", ")}. ${motivo}`,
    );
  }

  const textoAjudaDias = !grade.aprovada
    ? MSG_SEM_ESCALA_APROVADA
    : semDias
      ? ehFolga
        ? "Sem folgas na escala aprovada com turno desejado a pelo menos 4h e 12h de intervalo."
        : "Sem dias escalados na escala aprovada com início do turno a pelo menos 4h."
      : multiDias
        ? `${MSG_MULTI_DIAS} ${MSG_ANTECEDENCIA_24H}`
        : MSG_ANTECEDENCIA_24H;

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
          <span style={labelStyle} id="mkt-ofertar-dias-label">
            {ehFolga ? (multiDias ? "Dias de folga" : "Dia de folga") : multiDias ? "Dias do turno" : "Dia do turno"}
            <CampoObrigatorioMark />
          </span>
          {semDias ? null : (
            <div
              role="group"
              aria-labelledby="mkt-ofertar-dias-label"
              style={{
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 10,
                background: t.inputBg,
                padding: 6,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {dias.map((dia) => {
                const marcado = diasSelecionados.includes(dia.iso);
                const turnos = turnosPorDiaFolga.get(dia.iso) ?? [];
                return (
                  <div
                    key={dia.iso}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      padding: "6px 8px",
                      borderRadius: 8,
                      background: marcado
                        ? "color-mix(in srgb, var(--brand-action, #7c3aed) 12%, transparent)"
                        : "transparent",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type={multiDias ? "checkbox" : "radio"}
                        name={multiDias ? undefined : "mkt-ofertar-dia"}
                        checked={marcado}
                        onChange={() => alternarDia(dia)}
                        style={{ accentColor: brand.accent, cursor: "pointer" }}
                      />
                      {dia.label}
                    </label>
                    {ehFolga && marcado ? (
                      <select
                        aria-label={`Turno que pretende trabalhar em ${dia.label}`}
                        value={turnoPorDia[dia.iso] ?? ""}
                        onChange={(e) => definirTurnoDia(dia.iso, e.target.value)}
                        disabled={turnos.length === 0}
                        style={turnoSelectStyle}
                      >
                        <option value="">Selecione o turno…</option>
                        {turnos.map((turno) => (
                          <option key={turno} value={turno}>
                            {turno}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          <p style={{ margin: "6px 0 0", fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
            {textoAjudaDias}
          </p>
          {ehFolga && !semDias ? (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
              Cada dia tem os seus turnos: só aparecem os que respeitam 4h de antecedência e 12h de
              intervalo em relação ao seu último e ao próximo turno.
            </p>
          ) : null}
        </div>

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
          {multiDias ? (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
              A mesma observação é usada em todos os dias marcados.
            </p>
          ) : null}
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
            ) : diasSelecionados.length > 1 ? (
              `Publicar ${diasSelecionados.length} ofertas`
            ) : (
              "Publicar oferta"
            )}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

/** `2026-07-05` → `05/07` (lista de dias não publicados na mensagem de erro). */
function labelDiaCurtoBr(iso: string): string {
  const [, mo, d] = iso.slice(0, 10).split("-");
  if (!mo || !d) return iso;
  return `${d}/${mo}`;
}
