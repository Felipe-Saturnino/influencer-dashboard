import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import {
  fetchEquipamentosLimpezaNoLocal,
  labelCampoEquipamentoLimpeza,
  mensagemVazioEquipamentoLimpeza,
  registrarLimpezaItensAlocados,
  type EquipamentoLimpezaOption,
} from "../../../lib/techOpsItensAlocados";
import { CampoCardAlocado } from "./itensAlocadosUi";

export function ModalRegistrarLimpeza({
  localLabel,
  localChave,
  mesaId,
  autorNome,
  autorUserId,
  onClose,
  onSalvo,
}: {
  localLabel: string;
  localChave: string;
  mesaId: string | null;
  autorNome: string;
  autorUserId: string | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [equipamentos, setEquipamentos] = useState<EquipamentoLimpezaOption[]>([]);
  const [equipamentoId, setEquipamentoId] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const campoLabel = labelCampoEquipamentoLimpeza(localChave);
  const selecionado = equipamentos.find((e) => e.id === equipamentoId) ?? null;

  useEffect(() => {
    let cancel = false;
    setCarregando(true);
    setErro(null);
    void (async () => {
      try {
        const lista = await fetchEquipamentosLimpezaNoLocal(localChave);
        if (cancel) return;
        setEquipamentos(lista);
        setEquipamentoId(lista.length === 1 ? lista[0].id : "");
      } catch (e) {
        console.error("Itens Alocados: falha ao carregar equipamentos para limpeza", e);
        if (!cancel) {
          setEquipamentos([]);
          setEquipamentoId("");
          setErro("Não foi possível carregar os equipamentos. Se o problema persistir, entre em contato com o suporte.");
        }
      } finally {
        if (!cancel) setCarregando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [localChave]);

  const inputStyle = {
    width: "100%" as const,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
  };

  async function registrar() {
    if (!equipamentoId) {
      setErro(`Selecione ${campoLabel.toLowerCase()}.`);
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await registrarLimpezaItensAlocados({
        localChave,
        mesaId,
        equipamentoId,
        responsavelNome: autorNome,
        responsavelUserId: autorUserId,
      });
      onSalvo();
      onClose();
    } catch (e) {
      console.error("Itens Alocados: falha ao registrar limpeza", e);
      setErro("Não foi possível registrar a limpeza. Se o problema persistir, entre em contato com o suporte.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ModalBase onClose={onClose} maxWidth={520}>
      <ModalHeader title="Registrar Limpeza" onClose={onClose} />
      <p style={{ margin: "-12px 0 16px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{localLabel}</p>

      {erro ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
          {erro}
        </div>
      ) : null}

      {carregando ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "32px 0", color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
          <Loader2 size={18} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
          Carregando…
        </div>
      ) : equipamentos.length === 0 ? (
        <p style={{ margin: 0, padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {mensagemVazioEquipamentoLimpeza(localChave)}
        </p>
      ) : equipamentos.length === 1 && selecionado ? (
        <CampoCardAlocado label={campoLabel} value={selecionado.label} />
      ) : (
        <div>
          <label
            htmlFor="reg-limpeza-equipamento"
            style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}
          >
            {campoLabel}
          </label>
          <select
            id="reg-limpeza-equipamento"
            aria-label={campoLabel}
            value={equipamentoId}
            onChange={(e) => setEquipamentoId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Selecione…</option>
            {equipamentos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {!carregando && equipamentos.length > 0 ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button
            type="button"
            onClick={() => void registrar()}
            disabled={salvando || !equipamentoId}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: salvando || !equipamentoId ? "not-allowed" : "pointer",
              opacity: salvando || !equipamentoId ? 0.7 : 1,
              background: getCtaCriarGradient(brand),
            }}
          >
            {salvando ? "Registrando…" : "Registrar"}
          </button>
        </div>
      ) : null}
    </ModalBase>
  );
}
