import { useState } from "react";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { CampoUploadArquivos } from "../../../components/CampoUploadArquivos";
import {
  MODAL_FORM_FOOTER_STYLE,
  MODAL_FORM_SCROLL_BODY_STYLE,
  MODAL_FORM_SHELL_STYLE,
  ModalBase,
  ModalHeader,
} from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import {
  ACADEMY_CRONOGRAMA_ARQUIVO_ACCEPT,
  ACADEMY_CRONOGRAMA_ARQUIVO_HINT,
  ACADEMY_CRONOGRAMA_MATERIAL_TIPO_LABEL,
} from "../../../lib/academyCronogramaConstants";
import type { AcademyMaterial, AcademyMaterialTipo, AcademyTrilha } from "../../../lib/academyCronogramaTypes";
import {
  botaoArquivarStyle,
  botaoPrimarioStyle,
  botaoSecundarioStyle,
  campoInputStyle,
  campoLabelStyle,
  campoTextareaStyle,
} from "./cronogramaFormStyles";

type Props = {
  initial: AcademyMaterial | null;
  trilhas: AcademyTrilha[];
  trilhaIdsIniciais: string[];
  saving: boolean;
  erro: string | null;
  onClose: () => void;
  onSave: (payload: {
    titulo: string;
    tipo: AcademyMaterialTipo;
    introducao: string;
    trilhaIds: string[];
    file: File | null;
  }) => void;
  onArquivar?: () => void;
};

export function ModalMaterialForm({
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
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [tipo, setTipo] = useState<AcademyMaterialTipo>(initial?.tipo ?? "pdf");
  const [introducao, setIntroducao] = useState(initial?.introducao ?? "");
  const [trilhaIds, setTrilhaIds] = useState<string[]>(trilhaIdsIniciais);
  const [file, setFile] = useState<File | null>(null);
  const [localErro, setLocalErro] = useState<string | null>(null);
  const publicados = trilhas.filter((tr) => tr.status === "publicado");

  return (
    <ModalBase maxWidth={560} onClose={onClose} panelOverflow="hidden">
      <div style={MODAL_FORM_SHELL_STYLE}>
        <ModalHeader title={editar ? "Editar material" : "Novo material"} onClose={onClose} />
        <p style={{ margin: "-8px 0 12px", fontSize: 13, color: t.textMuted }}>
          Arquivo da aula. O prestador lê na turma — não no Portal da Academy.
        </p>
        <div style={MODAL_FORM_SCROLL_BODY_STYLE}>
          <label style={campoLabelStyle(t)}>
            Título <CampoObrigatorioMark />
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Roleta — técnica de giro" style={{ ...campoInputStyle(t), marginTop: 6 }} />
          </label>
          <div>
            <div style={campoLabelStyle(t)}>Trilhas</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {publicados.length === 0 ? (
                <p style={{ fontSize: 13, color: t.textMuted }}>Nenhuma trilha publicada.</p>
              ) : (
                publicados.map((tr) => (
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
                ))
              )}
            </div>
          </div>
          <label style={campoLabelStyle(t)}>
            Tipo <CampoObrigatorioMark />
            <select value={tipo} onChange={(e) => setTipo(e.target.value as AcademyMaterialTipo)} style={{ ...campoInputStyle(t), marginTop: 6 }}>
              {(Object.keys(ACADEMY_CRONOGRAMA_MATERIAL_TIPO_LABEL) as AcademyMaterialTipo[]).map((k) => (
                <option key={k} value={k}>
                  {ACADEMY_CRONOGRAMA_MATERIAL_TIPO_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label style={campoLabelStyle(t)}>
            Introdução <CampoObrigatorioMark />
            <textarea
              value={introducao}
              onChange={(e) => setIntroducao(e.target.value)}
              placeholder="Resumo do que o prestador vai estudar neste material."
              style={{ ...campoTextareaStyle(t), marginTop: 6 }}
            />
          </label>
          <CampoUploadArquivos
            id="cronograma-material-arquivo"
            label="Arquivo"
            buttonLabel="Adicionar arquivo"
            accept={ACADEMY_CRONOGRAMA_ARQUIVO_ACCEPT}
            multiple={false}
            items={
              file
                ? [{ key: file.name, label: file.name, pendente: true, file }]
                : initial?.arquivo_nome
                  ? [{ key: initial.arquivo_nome, label: initial.arquivo_nome }]
                  : []
            }
            onAdd={(files) => setFile(files[0] ?? null)}
            onRemove={() => setFile(null)}
            t={t}
            hint={ACADEMY_CRONOGRAMA_ARQUIVO_HINT}
            emptyLabel="Nenhum arquivo selecionado"
          />
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
                if (!titulo.trim() || !introducao.trim()) {
                  setLocalErro("Preencha os campos obrigatórios.");
                  return;
                }
                if (!editar && !file && !initial?.arquivo_storage_path) {
                  setLocalErro("Adicione o arquivo do material.");
                  return;
                }
                setLocalErro(null);
                onSave({ titulo: titulo.trim(), tipo, introducao: introducao.trim(), trilhaIds, file });
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
