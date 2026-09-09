import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { listPrestadoresGpShuffler, type CtPrestadorOpt } from "../../../lib/escalaControleTurno";
import { registrarFeedbackSolicitacoes } from "../../../lib/rhSolicitacoesFeedback";
import {
  RH_SOLICITACAO_FEEDBACK_RECOMENDACAO_OPTIONS,
} from "../../../lib/rhSolicitacoesConstants";
import type { RhSolicitacaoFeedbackRecomendacao } from "../../../types/rhSolicitacao";

type Brand = ReturnType<typeof useDashboardBrand>;

function grupoTimePrestador(time: string): "gp" | "shuffler" | "" {
  const n = time.toLowerCase();
  if (n.includes("shuffler")) return "shuffler";
  if (n.includes("game presenter")) return "gp";
  return "";
}

export interface ModalRegistrarFeedbackProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  t: Theme;
  brand: Brand;
}

export function ModalRegistrarFeedback({ open, onClose, onSaved, t, brand }: ModalRegistrarFeedbackProps) {
  const [timeFiltro, setTimeFiltro] = useState<"" | "gp" | "shuffler">("");
  const [prestadorId, setPrestadorId] = useState("");
  const [recomendacao, setRecomendacao] = useState<"" | RhSolicitacaoFeedbackRecomendacao>("");
  const [observacao, setObservacao] = useState("");
  const [prestadores, setPrestadores] = useState<CtPrestadorOpt[]>([]);
  const [loadingPrest, setLoadingPrest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTimeFiltro("");
    setPrestadorId("");
    setRecomendacao("");
    setObservacao("");
    setErr(null);
    setSaving(false);
    setLoadingPrest(true);
    void listPrestadoresGpShuffler()
      .then((list) => setPrestadores(list))
      .catch((e) => {
        console.error("[ModalRegistrarFeedback]", e);
        setPrestadores([]);
      })
      .finally(() => setLoadingPrest(false));
  }, [open]);

  const prestadoresFiltrados = useMemo(() => {
    if (!timeFiltro) return [];
    return prestadores.filter((p) => grupoTimePrestador(p.time) === timeFiltro);
  }, [prestadores, timeFiltro]);

  if (!open) return null;

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 13,
    boxSizing: "border-box",
  };

  async function confirmar() {
    setErr(null);
    if (!timeFiltro) {
      setErr("Selecione o time.");
      return;
    }
    if (!prestadorId) {
      setErr("Selecione o prestador.");
      return;
    }
    if (!recomendacao) {
      setErr("Selecione a recomendação.");
      return;
    }
    if (!observacao.trim()) {
      setErr("Informe a observação.");
      return;
    }
    setSaving(true);
    const res = await registrarFeedbackSolicitacoes({
      prestadorId,
      recomendacao,
      observacao: observacao.trim(),
    });
    setSaving(false);
    if (!res.ok) {
      setErr("Não foi possível registrar o feedback. Se o problema persistir, entre em contato com o suporte.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={520} zIndex={1100}>
      <ModalHeader title="Registrar Feedback" onClose={onClose} />
      <div style={{ padding: "0 20px 20px", fontFamily: FONT.body }}>
        {err ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginBottom: 12 }}>
            {err}
          </div>
        ) : null}

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6 }}>
            Time
            <CampoObrigatorioMark />
          </span>
          <select
            value={timeFiltro}
            onChange={(e) => {
              setTimeFiltro(e.target.value as "" | "gp" | "shuffler");
              setPrestadorId("");
            }}
            aria-label="Time"
            aria-required
            style={inputStyle}
          >
            <option value="">Selecione…</option>
            <option value="gp">Game Presenter</option>
            <option value="shuffler">Shuffler</option>
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6 }}>
            Prestador
            <CampoObrigatorioMark />
          </span>
          <select
            value={prestadorId}
            onChange={(e) => setPrestadorId(e.target.value)}
            aria-label="Prestador"
            aria-required
            disabled={!timeFiltro || loadingPrest}
            style={inputStyle}
          >
            <option value="">
              {!timeFiltro ? "Selecione o time…" : loadingPrest ? "Carregando…" : "Selecione…"}
            </option>
            {prestadoresFiltrados.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6 }}>
            Recomendação
            <CampoObrigatorioMark />
          </span>
          <select
            value={recomendacao}
            onChange={(e) => setRecomendacao(e.target.value as "" | RhSolicitacaoFeedbackRecomendacao)}
            aria-label="Recomendação"
            aria-required
            style={inputStyle}
          >
            <option value="">Selecione…</option>
            {RH_SOLICITACAO_FEEDBACK_RECOMENDACAO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6 }}>
            Observação
            <CampoObrigatorioMark />
          </span>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={5}
            aria-label="Observação"
            aria-required
            placeholder="Descreva o ocorrido e argumentos para aplicação"
            style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={saving || loadingPrest}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: getCtaCriarGradient(brand),
              color: "#fff",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden />
                Registrando…
              </>
            ) : (
              "Registrar"
            )}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
