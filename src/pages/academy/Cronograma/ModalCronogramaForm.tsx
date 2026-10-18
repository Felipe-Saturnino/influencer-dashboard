import { useState } from "react";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import {
  MODAL_FORM_FOOTER_STYLE,
  MODAL_FORM_SCROLL_BODY_STYLE,
  MODAL_FORM_SHELL_STYLE,
  ModalBase,
  ModalHeader,
} from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import type { AcademyCronograma } from "../../../lib/academyCronogramaTypes";
import { botaoPrimarioStyle, botaoSecundarioStyle, campoInputStyle, campoLabelStyle, campoTextareaStyle } from "./cronogramaFormStyles";

type Props = {
  initial: AcademyCronograma | null;
  saving: boolean;
  erro: string | null;
  onClose: () => void;
  onSave: (payload: { nome: string; descricao: string; duracaoDias: number }) => void;
};

export function ModalCronogramaForm({ initial, saving, erro, onClose, onSave }: Props) {
  const { theme: t } = useApp();
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [duracao, setDuracao] = useState(initial ? String(initial.duracao_dias) : "");
  const [localErro, setLocalErro] = useState<string | null>(null);
  const editar = Boolean(initial);

  return (
    <ModalBase maxWidth={520} onClose={onClose} panelOverflow="hidden">
      <div style={MODAL_FORM_SHELL_STYLE}>
        <ModalHeader title={editar ? "Editar cronograma" : "Novo cronograma"} onClose={onClose} />
        <p style={{ margin: "-8px 0 12px", fontSize: 13, color: t.textMuted }}>
          {editar
            ? "Altera o nome, a descrição e a duração prevista."
            : "Cria o currículo — sem trilhas ainda. Você monta a sequência logo em seguida, em Ordem das trilhas."}
        </p>
        <div style={MODAL_FORM_SCROLL_BODY_STYLE}>
          <label style={campoLabelStyle(t)}>
            Nome do cronograma <CampoObrigatorioMark />
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Onboarding de Dealer VIP"
              style={{ ...campoInputStyle(t), marginTop: 6 }}
            />
          </label>
          <label style={campoLabelStyle(t)}>
            Descrição
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Pra que serve esse cronograma, quem ele atende…"
              style={{ ...campoTextareaStyle(t), marginTop: 6 }}
            />
          </label>
          <label style={campoLabelStyle(t)}>
            Duração prevista <CampoObrigatorioMark />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <input
                type="number"
                min={1}
                step={1}
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
                placeholder="15"
                style={{ ...campoInputStyle(t), maxWidth: 120 }}
              />
              <span style={{ fontSize: 13, color: t.textMuted }}>dias</span>
            </div>
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
            disabled={saving}
            style={botaoPrimarioStyle(saving)}
            onClick={() => {
              const nomeOk = nome.trim();
              const dias = Number(duracao);
              if (!nomeOk) {
                setLocalErro("Informe o nome do cronograma.");
                return;
              }
              if (!Number.isInteger(dias) || dias < 1) {
                setLocalErro("Informe a duração prevista em dias.");
                return;
              }
              setLocalErro(null);
              onSave({ nome: nomeOk, descricao: descricao.trim(), duracaoDias: dias });
            }}
          >
            {saving ? "Salvando…" : editar ? "Salvar" : "Criar cronograma"}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
