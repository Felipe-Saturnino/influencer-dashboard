import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import {
  turnoOperacionalValorGrade,
  valorCelulaEhFolgaOperacional,
} from "../../../lib/rhCalendarioAcaoHelpers";
import {
  aceitarOfertaMarketplace,
  diasOfertaveisMarketplace,
  gapEntreTurnosOk,
  mensagemErroOfertaMarketplace,
  type MarketplaceMeuContexto,
  type MarketplaceMinhaGrade,
} from "../../../lib/escalaMarketplace";
import {
  RH_CALENDARIO_ACAO_LABEL_FORMAL,
  type LinhaOfertaMarketplace,
} from "../../../lib/escalaTurnosUiConstants";
import type { RhCalendarioAcaoTipo } from "../../../lib/rhCalendarioAcaoHelpers";

const MSG_GAP_12H = "É necessário respeitar o intervalo mínimo de 12h entre turnos.";

type Props = {
  oferta: LinhaOfertaMarketplace | null;
  onClose: () => void;
  onAceita: () => void;
  contexto: MarketplaceMeuContexto | null;
  grade: MarketplaceMinhaGrade;
  diasReservados: ReadonlySet<string>;
};

export function ModalAceitarOfertaMarketplace({
  oferta,
  onClose,
  onAceita,
  contexto,
  grade,
  diasReservados,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  const [diaTrocaIso, setDiaTrocaIso] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  useEffect(() => {
    setDiaTrocaIso("");
    setErro(null);
    setGravando(false);
  }, [oferta?.id]);

  const ehTroca = oferta?.tipo === "oferta_troca";
  const ehVendaFolga = oferta?.tipo === "venda_folga";

  const diasTroca = useMemo(() => {
    if (!ehTroca || !oferta || !contexto) return [];
    return diasOfertaveisMarketplace("oferta_troca", grade.valorPorIso, {
      horario: contexto.horario,
      operadora: contexto.operadora,
    }).filter((dia) => {
      if (dia.iso === oferta.dataOfertaIso || diasReservados.has(dia.iso)) return false;
      const gradeComDiaLiberado = new Map(grade.valorPorIso);
      gradeComDiaLiberado.set(dia.iso, "Folga");
      return gapEntreTurnosOk({
        diaIso: oferta.dataOfertaIso,
        turnoNome: oferta.turnoOferta,
        valorPorIso: gradeComDiaLiberado,
        horario: contexto.horario,
        operadora: contexto.operadora,
      });
    });
  }, [ehTroca, oferta, contexto, grade.valorPorIso, diasReservados]);

  if (!oferta) return null;

  const minhaCelulaNoDia = (grade.valorPorIso.get(oferta.dataOfertaIso) ?? "").trim();
  const meuTurnoNoDia = minhaCelulaNoDia ? turnoOperacionalValorGrade(minhaCelulaNoDia) : null;

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 14,
    fontFamily: FONT.body,
  };

  /** Grade com o dia entregue na troca liberado — o turno deixa de contar no gap. */
  function gradeComDiaEntregueLiberado(diaEntregueIso: string): Map<string, string> {
    const copia = new Map(grade.valorPorIso);
    copia.set(diaEntregueIso, "Folga");
    return copia;
  }

  function validar(): string | null {
    if (!contexto?.funcionarioId) {
      return "Não encontramos o seu cadastro de prestador de estúdio. Entre em contato com o suporte.";
    }
    if (oferta!.souOfertante) return "Você não pode aceitar a sua própria oferta.";
    if (oferta!.mesmoTime === false) {
      return "O aceite só é permitido entre prestadores do mesmo time.";
    }

    if (ehVendaFolga) {
      if (!meuTurnoNoDia) {
        return "Você precisa estar escalado neste dia para aceitar esta oferta.";
      }
      if (meuTurnoNoDia && oferta!.turnoOferta && meuTurnoNoDia !== oferta!.turnoOferta) {
        return "O turno oferecido não é o mesmo do seu turno neste dia.";
      }
      return null;
    }

    if (minhaCelulaNoDia && !valorCelulaEhFolgaOperacional(minhaCelulaNoDia)) {
      return "Você já tem turno neste dia.";
    }

    if (ehTroca) {
      if (!diaTrocaIso) return "Selecione o dia que você oferece em troca.";
      const okGap = gapEntreTurnosOk({
        diaIso: oferta!.dataOfertaIso,
        turnoNome: oferta!.turnoOferta,
        valorPorIso: gradeComDiaEntregueLiberado(diaTrocaIso),
        horario: contexto.horario,
        operadora: contexto.operadora,
      });
      return okGap ? null : MSG_GAP_12H;
    }

    const okGap = gapEntreTurnosOk({
      diaIso: oferta!.dataOfertaIso,
      turnoNome: oferta!.turnoOferta,
      valorPorIso: grade.valorPorIso,
      horario: contexto.horario,
      operadora: contexto.operadora,
    });
    return okGap ? null : MSG_GAP_12H;
  }

  async function confirmar() {
    const v = validar();
    if (v) {
      setErro(v);
      return;
    }
    setGravando(true);
    setErro(null);

    const diaTroca = ehTroca ? diaTrocaIso : null;
    const valorTroca = ehTroca
      ? (diasTroca.find((d) => d.iso === diaTrocaIso)?.valorCelula ?? null)
      : null;

    const res = await aceitarOfertaMarketplace(oferta!.id, diaTroca, valorTroca);
    setGravando(false);
    if (!res.ok) {
      setErro(mensagemErroOfertaMarketplace(res.error));
      return;
    }
    onAceita();
    onClose();
  }

  const linhaResumo = (rotulo: string, valor: string) => (
    <div style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.6 }}>
      <span style={{ color: t.textMuted, minWidth: 108 }}>{rotulo}</span>
      <span style={{ fontWeight: 600 }}>{valor}</span>
    </div>
  );

  return (
    <ModalBase maxWidth={520} onClose={onClose} zIndex={1140}>
      <ModalHeader title={ehTroca ? "Propor troca" : "Aceitar oferta"} onClose={onClose} />
      <div style={{ padding: "4px 4px 0", fontFamily: FONT.body, color: t.text }}>
        <div
          style={{
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 14,
          }}
        >
          {linhaResumo(
            "Tipo",
            RH_CALENDARIO_ACAO_LABEL_FORMAL[oferta.tipo as RhCalendarioAcaoTipo] ?? oferta.tipo,
          )}
          {linhaResumo("Dia", oferta.dataOfertaIso)}
          {linhaResumo("Turno", oferta.turnoOferta)}
          {linhaResumo("Ofertante", oferta.ofertante)}
          {oferta.observacao ? linhaResumo("Observação", oferta.observacao) : null}
        </div>

        {ehVendaFolga ? (
          <p style={{ margin: "0 0 14px", fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>
            Ao aceitar, {oferta.ofertante} fica com Compra - {oferta.turnoOferta} e você fica com
            Venda na escala.
          </p>
        ) : ehTroca ? (
          <div style={{ marginBottom: 14 }}>
            <label
              style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}
              htmlFor="mkt-aceitar-dia-troca"
            >
              Dia que você oferece em troca
              <CampoObrigatorioMark />
            </label>
            <select
              id="mkt-aceitar-dia-troca"
              aria-label="Dia que você oferece em troca"
              value={diaTrocaIso}
              onChange={(e) => setDiaTrocaIso(e.target.value)}
              disabled={diasTroca.length === 0}
              style={inputStyle}
            >
              <option value="">Selecione…</option>
              {diasTroca.map((d) => (
                <option key={d.iso} value={d.iso}>
                  {d.label}
                </option>
              ))}
            </select>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
              {diasTroca.length === 0
                ? "Sem turnos futuros disponíveis na sua escala para oferecer em troca."
                : "O dia escolhido deve ser um turno da sua escala e respeitar o intervalo mínimo de 12h. A troca só será aplicada após a aprovação do ofertante."}
            </p>
          </div>
        ) : (
          <p style={{ margin: "0 0 14px", fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>
            Ao aceitar, você assume este turno e fica com Compra - {oferta.turnoOferta} na escala.
          </p>
        )}

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
            disabled={gravando || (ehTroca && diasTroca.length === 0)}
            onClick={() => void confirmar()}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: `1px solid ${brand.accent}`,
              background: brand.accent,
              color: "#fff",
              fontWeight: 700,
              cursor: gravando ? "not-allowed" : "pointer",
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
              ehTroca ? "Enviar proposta" : "Aceitar oferta"
            )}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
