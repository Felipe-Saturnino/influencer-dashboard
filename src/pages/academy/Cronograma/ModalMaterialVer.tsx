import { BookOpen, History } from "lucide-react";
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
import { abrirAssetAssinadoEmNovaAba } from "../../../lib/abrirAssetAssinadoEmNovaAba";
import { ACADEMY_CRONOGRAMA_MATERIAL_TIPO_LABEL } from "../../../lib/academyCronogramaConstants";
import { fetchAcademyCronogramaHistorico, urlAssinadaMaterialCronograma } from "../../../lib/academyCronogramaDb";
import type { AcademyCronogramaHistorico, AcademyMaterial, AcademyTrilha } from "../../../lib/academyCronogramaTypes";
import { labelOuVazio, labelStatusCatalogo, nomesVinculados, trilhasDoMaterial } from "../../../lib/academyCronogramaUi";
import { FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../lib/filterBarStyles";
import { CronogramaHistoricoLista } from "./CronogramaHistoricoLista";
import { botaoPrimarioStyle, botaoSecundarioStyle, campoInputStyle, campoLabelStyle, campoTextareaStyle } from "./cronogramaFormStyles";

type Aba = "dados" | "hist";
const ABAS: Aba[] = ["dados", "hist"];

type Props = {
  material: AcademyMaterial;
  trilhas: AcademyTrilha[];
  trilhaMateriais: { trilha_id: string; material_id: string }[];
  onClose: () => void;
};

export function ModalMaterialVer({ material, trilhas, trilhaMateriais, onClose }: Props) {
  const { theme: t } = useApp();
  const [aba, setAba] = useState<Aba>("dados");
  const [hist, setHist] = useState<AcademyCronogramaHistorico[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histErro, setHistErro] = useState<string | null>(null);

  useEffect(() => {
    if (aba !== "hist") return;
    let alive = true;
    setHistLoading(true);
    setHistErro(null);
    void fetchAcademyCronogramaHistorico("material", material.id)
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
  }, [aba, material.id]);

  return (
    <ModalBase maxWidth={560} onClose={onClose} panelOverflow="hidden">
      <div style={MODAL_FORM_SHELL_STYLE}>
        <ModalHeader title="Ver material" onClose={onClose} />
        <p style={{ margin: "-8px 0 12px", fontSize: 13, color: t.textMuted }}>Somente leitura.</p>
        <div
          role="tablist"
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ABAS, setAba, (k) => `tab-ver-mat-${k}`)}
        >
          <FiltroBarTabButton id="tab-ver-mat-dados" active={aba === "dados"} icon={<BookOpen {...FILTRO_BAR_TAB_ICON_PROPS} />} onClick={() => setAba("dados")}>
            Dados do Material
          </FiltroBarTabButton>
          <FiltroBarTabButton id="tab-ver-mat-hist" active={aba === "hist"} icon={<History {...FILTRO_BAR_TAB_ICON_PROPS} />} onClick={() => setAba("hist")}>
            Histórico
          </FiltroBarTabButton>
        </div>
        <div style={MODAL_FORM_SCROLL_BODY_STYLE}>
          <ModalTabPanel active={aba === "dados"} id="panel-ver-mat-dados" labelledBy="tab-ver-mat-dados">
            <label style={campoLabelStyle(t)}>
              Título
              <input readOnly value={material.titulo} style={{ ...campoInputStyle(t, true), marginTop: 6 }} />
            </label>
            <label style={campoLabelStyle(t)}>
              Trilhas
              <input
                readOnly
                value={nomesVinculados(trilhasDoMaterial(material.id, trilhas, trilhaMateriais).map((tr) => tr.nome))}
                style={{ ...campoInputStyle(t, true), marginTop: 6 }}
              />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={campoLabelStyle(t)}>
                Tipo
                <input readOnly value={ACADEMY_CRONOGRAMA_MATERIAL_TIPO_LABEL[material.tipo]} style={{ ...campoInputStyle(t, true), marginTop: 6 }} />
              </label>
              <label style={campoLabelStyle(t)}>
                Status
                <input readOnly value={labelStatusCatalogo(material.status)} style={{ ...campoInputStyle(t, true), marginTop: 6 }} />
              </label>
            </div>
            <label style={campoLabelStyle(t)}>
              Introdução
              <textarea readOnly value={material.introducao} style={{ ...campoTextareaStyle(t, true), marginTop: 6 }} />
            </label>
            <label style={campoLabelStyle(t)}>
              Arquivo
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input readOnly value={labelOuVazio(material.arquivo_nome)} style={campoInputStyle(t, true)} />
                <button
                  type="button"
                  disabled={!material.arquivo_storage_path}
                  style={botaoPrimarioStyle(!material.arquivo_storage_path)}
                  onClick={() => {
                    const path = material.arquivo_storage_path;
                    if (!path) return;
                    void abrirAssetAssinadoEmNovaAba(() => urlAssinadaMaterialCronograma(path));
                  }}
                >
                  Baixar
                </button>
              </div>
            </label>
          </ModalTabPanel>
          <ModalTabPanel active={aba === "hist"} id="panel-ver-mat-hist" labelledBy="tab-ver-mat-hist">
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
