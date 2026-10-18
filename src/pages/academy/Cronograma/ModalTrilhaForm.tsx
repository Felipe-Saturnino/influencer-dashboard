import { BookOpen, FileText } from "lucide-react";
import { useState } from "react";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { FiltroBarTabButton } from "../../../components/dashboard";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import {
  MODAL_FORM_FOOTER_STYLE,
  MODAL_FORM_SCROLL_BODY_STYLE,
  MODAL_FORM_SHELL_STYLE,
  ModalBase,
  ModalHeader,
} from "../../../components/OperacoesModal";
import { useApp } from "../../../context/AppContext";
import {
  ACADEMY_CRONOGRAMA_JOGOS,
  ACADEMY_CRONOGRAMA_TRILHA_TIPO_LABEL,
} from "../../../lib/academyCronogramaConstants";
import type { AcademyMaterial, AcademyTrilha, AcademyTrilhaTipo } from "../../../lib/academyCronogramaTypes";
import { FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../lib/filterBarStyles";
import {
  botaoArquivarStyle,
  botaoPrimarioStyle,
  botaoSecundarioStyle,
  campoInputStyle,
  campoLabelStyle,
  campoTextareaStyle,
} from "./cronogramaFormStyles";

type Aba = "dados" | "mats";
const ABAS: Aba[] = ["dados", "mats"];

type Props = {
  initial: AcademyTrilha | null;
  materiais: AcademyMaterial[];
  materialIdsIniciais: string[];
  saving: boolean;
  erro: string | null;
  onClose: () => void;
  onSave: (payload: {
    nome: string;
    tipo: AcademyTrilhaTipo;
    jogo: string | null;
    descricao: string;
    materialIds: string[];
  }) => void;
  onArquivar?: () => void;
};

export function ModalTrilhaForm({
  initial,
  materiais,
  materialIdsIniciais,
  saving,
  erro,
  onClose,
  onSave,
  onArquivar,
}: Props) {
  const { theme: t } = useApp();
  const editar = Boolean(initial);
  const [aba, setAba] = useState<Aba>("dados");
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [tipo, setTipo] = useState<AcademyTrilhaTipo>(initial?.tipo ?? "institucional");
  const [jogo, setJogo] = useState(initial?.jogo ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [materialIds, setMaterialIds] = useState<string[]>(materialIdsIniciais);
  const [localErro, setLocalErro] = useState<string | null>(null);
  const publicados = materiais.filter((m) => m.status === "publicado");

  return (
    <ModalBase maxWidth={editar ? 760 : 520} onClose={onClose} panelOverflow="hidden">
      <div style={MODAL_FORM_SHELL_STYLE}>
        <ModalHeader title={editar ? "Editar trilha" : "Nova trilha"} onClose={onClose} />
        <p style={{ margin: "-8px 0 12px", fontSize: 13, color: t.textMuted }}>
          {editar ? "Altera os dados e os vínculos de materiais." : "Cria o módulo. Depois você liga materiais, provas e encaixa no cronograma."}
        </p>
        {editar ? (
          <div
            role="tablist"
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}
            onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ABAS, setAba, (k) => `tab-edit-trilha-${k}`)}
          >
            <FiltroBarTabButton id="tab-edit-trilha-dados" active={aba === "dados"} icon={<BookOpen {...FILTRO_BAR_TAB_ICON_PROPS} />} onClick={() => setAba("dados")}>
              Dados da Trilha
            </FiltroBarTabButton>
            <FiltroBarTabButton id="tab-edit-trilha-mats" active={aba === "mats"} icon={<FileText {...FILTRO_BAR_TAB_ICON_PROPS} />} onClick={() => setAba("mats")}>
              Materiais
            </FiltroBarTabButton>
          </div>
        ) : null}
        <div style={MODAL_FORM_SCROLL_BODY_STYLE}>
          <ModalTabPanel active={!editar || aba === "dados"} id="panel-edit-trilha-dados" labelledBy="tab-edit-trilha-dados">
            <label style={campoLabelStyle(t)}>
              Nome da trilha <CampoObrigatorioMark />
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Roleta — incidentes" style={{ ...campoInputStyle(t), marginTop: 6 }} />
            </label>
            <label style={campoLabelStyle(t)}>
              Tipo <CampoObrigatorioMark />
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as AcademyTrilhaTipo)}
                style={{ ...campoInputStyle(t), marginTop: 6 }}
              >
                {(Object.keys(ACADEMY_CRONOGRAMA_TRILHA_TIPO_LABEL) as AcademyTrilhaTipo[]).map((k) => (
                  <option key={k} value={k}>
                    {ACADEMY_CRONOGRAMA_TRILHA_TIPO_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            {tipo === "jogo" ? (
              <label style={campoLabelStyle(t)}>
                Jogo <CampoObrigatorioMark />
                <select value={jogo} onChange={(e) => setJogo(e.target.value)} style={{ ...campoInputStyle(t), marginTop: 6 }}>
                  <option value="">—</option>
                  {ACADEMY_CRONOGRAMA_JOGOS.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label style={campoLabelStyle(t)}>
              Descrição <CampoObrigatorioMark />
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que esta trilha cobre." style={{ ...campoTextareaStyle(t), marginTop: 6 }} />
            </label>
          </ModalTabPanel>
          {editar ? (
            <ModalTabPanel active={aba === "mats"} id="panel-edit-trilha-mats" labelledBy="tab-edit-trilha-mats">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {publicados.length === 0 ? (
                  <p style={{ fontSize: 13, color: t.textMuted }}>Nenhum material publicado no catálogo.</p>
                ) : (
                  publicados.map((m) => (
                    <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: t.text }}>
                      <input
                        type="checkbox"
                        checked={materialIds.includes(m.id)}
                        onChange={() =>
                          setMaterialIds((prev) => (prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]))
                        }
                      />
                      {m.titulo}
                    </label>
                  ))
                )}
              </div>
            </ModalTabPanel>
          ) : null}
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
                if (!nome.trim() || !descricao.trim()) {
                  setLocalErro("Preencha os campos obrigatórios.");
                  return;
                }
                if (tipo === "jogo" && !jogo.trim()) {
                  setLocalErro("Selecione o jogo da trilha.");
                  return;
                }
                setLocalErro(null);
                onSave({
                  nome: nome.trim(),
                  tipo,
                  jogo: tipo === "jogo" ? jogo : null,
                  descricao: descricao.trim(),
                  materialIds: editar ? materialIds : [],
                });
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
