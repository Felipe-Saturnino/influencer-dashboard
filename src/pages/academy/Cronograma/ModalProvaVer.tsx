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
import { FONT } from "../../../constants/theme";
import { useApp } from "../../../context/AppContext";
import { fetchAcademyCronogramaHistorico } from "../../../lib/academyCronogramaDb";
import type { AcademyCronogramaHistorico, AcademyProva, AcademyTrilha } from "../../../lib/academyCronogramaTypes";
import { labelStatusCatalogo, nomesVinculados, trilhasDaProva } from "../../../lib/academyCronogramaUi";
import { FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../lib/filterBarStyles";
import { CronogramaHistoricoLista } from "./CronogramaHistoricoLista";
import { botaoSecundarioStyle, campoInputStyle, campoLabelStyle } from "./cronogramaFormStyles";

type Aba = "dados" | "hist";
const ABAS: Aba[] = ["dados", "hist"];

type Props = {
  prova: AcademyProva;
  trilhas: AcademyTrilha[];
  trilhaProvas: { trilha_id: string; prova_id: string }[];
  onClose: () => void;
};

export function ModalProvaVer({ prova, trilhas, trilhaProvas, onClose }: Props) {
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
    void fetchAcademyCronogramaHistorico("prova", prova.id)
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
  }, [aba, prova.id]);

  return (
    <ModalBase maxWidth={760} onClose={onClose} panelOverflow="hidden">
      <div style={MODAL_FORM_SHELL_STYLE}>
        <ModalHeader title="Ver prova" onClose={onClose} />
        <p style={{ margin: "-8px 0 12px", fontSize: 13, color: t.textMuted }}>Somente leitura.</p>
        <div
          role="tablist"
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ABAS, setAba, (k) => `tab-ver-prova-${k}`)}
        >
          <FiltroBarTabButton id="tab-ver-prova-dados" active={aba === "dados"} icon={<BookOpen {...FILTRO_BAR_TAB_ICON_PROPS} />} onClick={() => setAba("dados")}>
            Dados da Prova
          </FiltroBarTabButton>
          <FiltroBarTabButton id="tab-ver-prova-hist" active={aba === "hist"} icon={<History {...FILTRO_BAR_TAB_ICON_PROPS} />} onClick={() => setAba("hist")}>
            Histórico
          </FiltroBarTabButton>
        </div>
        <div style={MODAL_FORM_SCROLL_BODY_STYLE}>
          <ModalTabPanel active={aba === "dados"} id="panel-ver-prova-dados" labelledBy="tab-ver-prova-dados">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={campoLabelStyle(t)}>
                Nome da prova
                <input readOnly value={prova.nome} style={{ ...campoInputStyle(t, true), marginTop: 6 }} />
              </label>
              <label style={campoLabelStyle(t)}>
                Trilhas
                <input
                  readOnly
                  value={nomesVinculados(trilhasDaProva(prova.id, trilhas, trilhaProvas).map((tr) => tr.nome))}
                  style={{ ...campoInputStyle(t, true), marginTop: 6 }}
                />
              </label>
              <label style={campoLabelStyle(t)}>
                Nota mínima
                <input readOnly value={`${prova.nota_minima}%`} style={{ ...campoInputStyle(t, true), marginTop: 6 }} />
              </label>
              <label style={campoLabelStyle(t)}>
                Status
                <input readOnly value={labelStatusCatalogo(prova.status)} style={{ ...campoInputStyle(t, true), marginTop: 6 }} />
              </label>
            </div>
            <p style={{ margin: "16px 0 10px", fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--brand-primary, #7c3aed)", fontFamily: FONT.body }}>
              Questões
            </p>
            {prova.questoes.length === 0 ? (
              <p style={{ fontSize: 13, color: t.textMuted }}>Nenhuma questão cadastrada.</p>
            ) : (
              prova.questoes.map((q, i) => (
                <div key={`${q.t}-${i}`} style={{ marginBottom: 14, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 8 }}>{`${i + 1}. ${q.t}`}</div>
                  {q.opts.map((opt, oi) => (
                    <div key={oi} style={{ fontSize: 13, color: oi === q.ok ? "var(--brand-success, #22c55e)" : t.text, marginBottom: 4 }}>
                      {String.fromCharCode(65 + oi)}) {opt}
                      {oi === q.ok ? " — gabarito" : ""}
                    </div>
                  ))}
                </div>
              ))
            )}
          </ModalTabPanel>
          <ModalTabPanel active={aba === "hist"} id="panel-ver-prova-hist" labelledBy="tab-ver-prova-hist">
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
