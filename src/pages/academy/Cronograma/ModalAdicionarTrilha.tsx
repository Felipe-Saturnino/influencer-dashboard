import { useMemo, useState } from "react";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import {
  MODAL_FORM_FOOTER_STYLE,
  MODAL_FORM_SCROLL_BODY_STYLE,
  MODAL_FORM_SHELL_STYLE,
  ModalBase,
  ModalHeader,
} from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import type { AcademyTrilha } from "../../../lib/academyCronogramaTypes";
import { botaoPrimarioStyle, botaoSecundarioStyle, campoInputStyle, campoLabelStyle } from "./cronogramaFormStyles";

type Props = {
  trilhas: AcademyTrilha[];
  jaNoCronograma: string[];
  saving: boolean;
  erro: string | null;
  onClose: () => void;
  onAdd: (trilhaId: string) => void;
};

export function ModalAdicionarTrilha({ trilhas, jaNoCronograma, saving, erro, onClose, onAdd }: Props) {
  const { theme: t } = useApp();
  const disponiveis = useMemo(
    () =>
      trilhas
        .filter((tr) => tr.status === "publicado" && !jaNoCronograma.includes(tr.id))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [trilhas, jaNoCronograma],
  );
  const [trilhaId, setTrilhaId] = useState(disponiveis[0]?.id ?? "");
  const [localErro, setLocalErro] = useState<string | null>(null);

  return (
    <ModalBase maxWidth={480} onClose={onClose} panelOverflow="hidden">
      <div style={MODAL_FORM_SHELL_STYLE}>
        <ModalHeader title="Adicionar trilha" onClose={onClose} />
        <p style={{ margin: "-8px 0 12px", fontSize: 13, color: t.textMuted }}>
          Escolhe um módulo do catálogo que ainda não está neste cronograma. Entra no final da ordem — depois você sobe
          ou desce o card.
        </p>
        <div style={MODAL_FORM_SCROLL_BODY_STYLE}>
          <label style={campoLabelStyle(t)}>
            Trilha <CampoObrigatorioMark />
            <select
              value={trilhaId}
              onChange={(e) => setTrilhaId(e.target.value)}
              style={{ ...campoInputStyle(t), marginTop: 6 }}
            >
              {disponiveis.length === 0 ? <option value="">Nenhuma trilha disponível</option> : null}
              {disponiveis.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={MODAL_FORM_FOOTER_STYLE}>
          <p role="alert" style={{ flex: 1, margin: 0, fontSize: 12, color: "#e84025" }}>
            {localErro || erro}
          </p>
          <button type="button" onClick={onClose} style={botaoSecundarioStyle(t, saving)}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || !trilhaId}
            style={botaoPrimarioStyle(saving || !trilhaId)}
            onClick={() => {
              if (!trilhaId) {
                setLocalErro("Selecione uma trilha.");
                return;
              }
              setLocalErro(null);
              onAdd(trilhaId);
            }}
          >
            {saving ? "Adicionando…" : "Adicionar"}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
