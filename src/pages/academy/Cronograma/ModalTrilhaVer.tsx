import { useEffect, useState } from "react";
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
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import {
  ACADEMY_CRONOGRAMA_MATERIAL_TIPO_LABEL,
  ACADEMY_CRONOGRAMA_TRILHA_TIPO_LABEL,
} from "../../../lib/academyCronogramaConstants";
import { fetchAcademyCronogramaHistorico } from "../../../lib/academyCronogramaDb";
import type {
  AcademyCronograma,
  AcademyCronogramaHistorico,
  AcademyCronogramaItem,
  AcademyMaterial,
  AcademyProva,
  AcademyTrilha,
} from "../../../lib/academyCronogramaTypes";
import {
  cronogramasDaTrilha,
  labelOuVazio,
  labelStatusCatalogo,
  materiaisDaTrilha,
  nomesVinculados,
  provasDaTrilha,
} from "../../../lib/academyCronogramaUi";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../lib/filterBarStyles";
import { BookOpen, ClipboardList, FileText, History } from "lucide-react";
import { CronogramaHistoricoLista } from "./CronogramaHistoricoLista";
import { botaoSecundarioStyle, campoInputStyle, campoLabelStyle, campoTextareaStyle } from "./cronogramaFormStyles";

type Aba = "dados" | "mats" | "provas" | "hist";
const ABAS: Aba[] = ["dados", "mats", "provas", "hist"];

type Props = {
  trilha: AcademyTrilha;
  cronogramas: AcademyCronograma[];
  itens: AcademyCronogramaItem[];
  materiais: AcademyMaterial[];
  provas: AcademyProva[];
  trilhaMateriais: { trilha_id: string; material_id: string }[];
  trilhaProvas: { trilha_id: string; prova_id: string }[];
  onClose: () => void;
};

export function ModalTrilhaVer({
  trilha,
  cronogramas,
  itens,
  materiais,
  provas,
  trilhaMateriais,
  trilhaProvas,
  onClose,
}: Props) {
  const { theme: t } = useApp();
  const dt = useDataTableBlock();
  const [aba, setAba] = useState<Aba>("dados");
  const [hist, setHist] = useState<AcademyCronogramaHistorico[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histErro, setHistErro] = useState<string | null>(null);
  const mats = materiaisDaTrilha(trilha.id, materiais, trilhaMateriais);
  const prs = provasDaTrilha(trilha.id, provas, trilhaProvas);

  useEffect(() => {
    if (aba !== "hist") return;
    let alive = true;
    setHistLoading(true);
    setHistErro(null);
    void fetchAcademyCronogramaHistorico("trilha", trilha.id)
      .then((rows) => {
        if (alive) setHist(rows);
      })
      .catch((e: unknown) => {
        if (alive) setHistErro(e instanceof Error ? e.message : "Não foi possível carregar o histórico.");
      })
      .finally(() => {
        if (alive) setHistLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [aba, trilha.id]);

  return (
    <ModalBase maxWidth={760} onClose={onClose} panelOverflow="hidden">
      <div style={MODAL_FORM_SHELL_STYLE}>
        <ModalHeader title="Ver trilha" onClose={onClose} />
        <p style={{ margin: "-8px 0 12px", fontSize: 13, color: t.textMuted }}>Somente leitura.</p>
        <div
          role="tablist"
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ABAS, setAba, (k) => `tab-ver-trilha-${k}`)}
        >
          <FiltroBarTabButton id="tab-ver-trilha-dados" active={aba === "dados"} icon={<BookOpen {...FILTRO_BAR_TAB_ICON_PROPS} />} onClick={() => setAba("dados")}>
            Dados da Trilha
          </FiltroBarTabButton>
          <FiltroBarTabButton id="tab-ver-trilha-mats" active={aba === "mats"} icon={<FileText {...FILTRO_BAR_TAB_ICON_PROPS} />} onClick={() => setAba("mats")}>
            Materiais
          </FiltroBarTabButton>
          <FiltroBarTabButton id="tab-ver-trilha-provas" active={aba === "provas"} icon={<ClipboardList {...FILTRO_BAR_TAB_ICON_PROPS} />} onClick={() => setAba("provas")}>
            Provas
          </FiltroBarTabButton>
          <FiltroBarTabButton id="tab-ver-trilha-hist" active={aba === "hist"} icon={<History {...FILTRO_BAR_TAB_ICON_PROPS} />} onClick={() => setAba("hist")}>
            Histórico
          </FiltroBarTabButton>
        </div>
        <div style={MODAL_FORM_SCROLL_BODY_STYLE}>
          <ModalTabPanel active={aba === "dados"} id="panel-ver-trilha-dados" labelledBy="tab-ver-trilha-dados">
            <label style={campoLabelStyle(t)}>
              Nome da trilha
              <input readOnly value={trilha.nome} style={{ ...campoInputStyle(t, true), marginTop: 6 }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={campoLabelStyle(t)}>
                Tipo
                <input readOnly value={ACADEMY_CRONOGRAMA_TRILHA_TIPO_LABEL[trilha.tipo]} style={{ ...campoInputStyle(t, true), marginTop: 6 }} />
              </label>
              <label style={campoLabelStyle(t)}>
                Status
                <input readOnly value={labelStatusCatalogo(trilha.status)} style={{ ...campoInputStyle(t, true), marginTop: 6 }} />
              </label>
            </div>
            <label style={campoLabelStyle(t)}>
              Descrição
              <textarea readOnly value={trilha.descricao} style={{ ...campoTextareaStyle(t, true), marginTop: 6 }} />
            </label>
            <label style={campoLabelStyle(t)}>
              Cronogramas utilizados
              <input
                readOnly
                value={nomesVinculados(cronogramasDaTrilha(trilha.id, cronogramas, itens).map((c) => c.nome))}
                style={{ ...campoInputStyle(t, true), marginTop: 6 }}
              />
            </label>
          </ModalTabPanel>
          <ModalTabPanel active={aba === "mats"} id="panel-ver-trilha-mats" labelledBy="tab-ver-trilha-mats">
            <div className="app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle()}>
                <thead>
                  <tr>
                    <th style={dt.thHeader}>Nome do material</th>
                    <th style={dt.thHeader}>Tipo do material</th>
                    <th style={dt.thHeader}>Introdução</th>
                  </tr>
                </thead>
                <tbody>
                  {mats.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ ...dt.tdCenter, color: t.textMuted }}>
                        {labelOuVazio("")}
                      </td>
                    </tr>
                  ) : (
                    mats.map((m, i) => (
                      <tr key={m.id} style={{ background: dt.zebraRow(i) }}>
                        <td style={dt.tdCenter}>{m.titulo}</td>
                        <td style={dt.tdCenter}>{ACADEMY_CRONOGRAMA_MATERIAL_TIPO_LABEL[m.tipo]}</td>
                        <td style={dt.tdCenter}>{labelOuVazio(m.introducao)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ModalTabPanel>
          <ModalTabPanel active={aba === "provas"} id="panel-ver-trilha-provas" labelledBy="tab-ver-trilha-provas">
            <div className="app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle()}>
                <thead>
                  <tr>
                    <th style={dt.thHeader}>Nome da prova</th>
                    <th style={dt.thHeader}>Quantidade de questões</th>
                    <th style={dt.thHeader}>Nota mínima</th>
                  </tr>
                </thead>
                <tbody>
                  {prs.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ ...dt.tdCenter, color: t.textMuted }}>
                        {labelOuVazio("")}
                      </td>
                    </tr>
                  ) : (
                    prs.map((p, i) => (
                      <tr key={p.id} style={{ background: dt.zebraRow(i) }}>
                        <td style={dt.tdCenter}>{p.nome}</td>
                        <td style={dt.tdCenter}>{p.questoes.length}</td>
                        <td style={dt.tdCenter}>{`${p.nota_minima}%`}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ModalTabPanel>
          <ModalTabPanel active={aba === "hist"} id="panel-ver-trilha-hist" labelledBy="tab-ver-trilha-hist">
            <CronogramaHistoricoLista t={t} linhas={hist} loading={histLoading} erro={histErro} />
          </ModalTabPanel>
        </div>
        <div style={MODAL_FORM_FOOTER_STYLE}>
          <button type="button" onClick={onClose} style={botaoSecundarioStyle(t)}>
            Fechar
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
