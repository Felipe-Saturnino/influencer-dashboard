import { useState } from "react";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import {
  MODAL_FORM_FOOTER_STYLE,
  MODAL_FORM_SCROLL_BODY_STYLE,
  MODAL_FORM_SHELL_STYLE,
  ModalBase,
  ModalHeader,
} from "../../../components/OperacoesModal";
import { FONT } from "../../../constants/theme";
import { useApp } from "../../../context/AppContext";
import type { AcademyProva, AcademyProvaQuestao, AcademyTrilha } from "../../../lib/academyCronogramaTypes";
import { provaValidaParaPublicar, questaoVazia } from "../../../lib/academyCronogramaUi";
import {
  botaoArquivarStyle,
  botaoPrimarioStyle,
  botaoSecundarioStyle,
  campoInputStyle,
  campoLabelStyle,
} from "./cronogramaFormStyles";

type Props = {
  initial: AcademyProva | null;
  trilhas: AcademyTrilha[];
  trilhaIdsIniciais: string[];
  saving: boolean;
  erro: string | null;
  onClose: () => void;
  onSave: (payload: { nome: string; notaMinima: number; questoes: AcademyProvaQuestao[]; trilhaIds: string[] }) => void;
  onArquivar?: () => void;
};

export function ModalProvaForm({
  initial,
  trilhas,
  trilhaIdsIniciais,
  saving,
  erro,
  onClose,
  onSave,
  onArquivar,
}: Props) {
  const { theme: t } = useApp();
  const editar = Boolean(initial);
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [nota, setNota] = useState(initial ? String(initial.nota_minima) : "70");
  const [trilhaIds, setTrilhaIds] = useState<string[]>(trilhaIdsIniciais);
  const [questoes, setQuestoes] = useState<AcademyProvaQuestao[]>(initial?.questoes.length ? initial.questoes : []);
  const [localErro, setLocalErro] = useState<string | null>(null);
  const publicados = trilhas.filter((tr) => tr.status === "publicado");

  function atualizarQuestao(index: number, next: AcademyProvaQuestao) {
    setQuestoes((prev) => prev.map((q, i) => (i === index ? next : q)));
  }

  return (
    <ModalBase maxWidth={760} onClose={onClose} panelOverflow="hidden">
      <div style={MODAL_FORM_SHELL_STYLE}>
        <ModalHeader title={editar ? "Editar prova" : "Nova prova"} onClose={onClose} />
        <p style={{ margin: "-8px 0 12px", fontSize: 13, color: t.textMuted }}>
          Múltipla escolha. Publicar exige todos os campos e ao menos uma questão com gabarito.
        </p>
        <div style={MODAL_FORM_SCROLL_BODY_STYLE}>
          <label style={campoLabelStyle(t)}>
            Nome da prova <CampoObrigatorioMark />
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Roleta — regras" style={{ ...campoInputStyle(t), marginTop: 6 }} />
          </label>
          <div>
            <div style={campoLabelStyle(t)}>Trilhas</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {publicados.map((tr) => (
                <label key={tr.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: t.text }}>
                  <input
                    type="checkbox"
                    checked={trilhaIds.includes(tr.id)}
                    onChange={() =>
                      setTrilhaIds((prev) => (prev.includes(tr.id) ? prev.filter((id) => id !== tr.id) : [...prev, tr.id]))
                    }
                  />
                  {tr.nome}
                </label>
              ))}
            </div>
          </div>
          <label style={campoLabelStyle(t)}>
            Nota mínima (%) <CampoObrigatorioMark />
            <input type="number" min={0} max={100} value={nota} onChange={(e) => setNota(e.target.value)} style={{ ...campoInputStyle(t), marginTop: 6, maxWidth: 140 }} />
          </label>
          <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--brand-primary, #7c3aed)", fontFamily: FONT.body }}>
            Questões{" "}
            <span style={{ fontSize: 11, fontWeight: 400, color: t.textMuted, textTransform: "none" }}>
              — {questoes.length === 0 ? "nenhuma ainda" : `${questoes.length} ${questoes.length === 1 ? "questão" : "questões"}`}
            </span>
          </p>
          {questoes.map((q, i) => (
            <div key={i} style={{ padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}` }}>
              <label style={campoLabelStyle(t)}>
                Enunciado <CampoObrigatorioMark />
                <input
                  value={q.t}
                  onChange={(e) => atualizarQuestao(i, { ...q, t: e.target.value })}
                  style={{ ...campoInputStyle(t), marginTop: 6 }}
                />
              </label>
              {q.opts.map((opt, oi) => (
                <label key={oi} style={{ ...campoLabelStyle(t), display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <input
                    type="radio"
                    name={`gabarito-${i}`}
                    checked={q.ok === oi}
                    onChange={() => atualizarQuestao(i, { ...q, ok: oi as 0 | 1 | 2 | 3 })}
                  />
                  <span style={{ width: 18 }}>{String.fromCharCode(65 + oi)}</span>
                  <input
                    value={opt}
                    onChange={(e) => {
                      const opts: AcademyProvaQuestao["opts"] = [...q.opts];
                      opts[oi] = e.target.value;
                      atualizarQuestao(i, { ...q, opts });
                    }}
                    style={{ ...campoInputStyle(t), flex: 1 }}
                  />
                </label>
              ))}
              <button
                type="button"
                onClick={() => setQuestoes((prev) => prev.filter((_, idx) => idx !== i))}
                style={{ ...botaoSecundarioStyle(t), marginTop: 10 }}
              >
                Remover questão
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setQuestoes((prev) => [...prev, questaoVazia()])} style={botaoSecundarioStyle(t)}>
            Nova questão
          </button>
        </div>
        <div style={{ ...MODAL_FORM_FOOTER_STYLE, justifyContent: "space-between" }}>
          {editar && onArquivar ? (
            <button type="button" disabled={saving} style={botaoArquivarStyle(saving)} onClick={onArquivar}>
              {initial?.status === "arquivado" ? "Publicar" : "Arquivar"}
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <p role="alert" style={{ margin: 0, fontSize: 12, color: "#e84025" }}>
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
                const notaN = Number(nota);
                if (!nome.trim() || !Number.isInteger(notaN) || notaN < 0 || notaN > 100) {
                  setLocalErro("Preencha o nome e a nota mínima (0 a 100).");
                  return;
                }
                if (!provaValidaParaPublicar(questoes)) {
                  setLocalErro("Inclua ao menos uma questão com enunciado, quatro opções e gabarito.");
                  return;
                }
                setLocalErro(null);
                onSave({ nome: nome.trim(), notaMinima: notaN, questoes, trilhaIds });
              }}
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </ModalBase>
  );
}
