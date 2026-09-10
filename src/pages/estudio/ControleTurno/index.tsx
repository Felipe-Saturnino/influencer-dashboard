import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardPen,
  RotateCw,
  UsersRound,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import {
  DashboardPageHeader,
  FiltroBarTabButton,
  FiltroHojeButton,
  FiltroTurnoSelect,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
  TURNO_FILTRO_MANHA_TARDE_NOITE,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes, type AjudaContextualTutorial } from "../../../components/AjudaContextualAcoes";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { getFilterBarRowStyle } from "../../../lib/filterBarStyles";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { diaIsoLocal, formatDiaRotacaoLabel, shiftDiaIso } from "../../../lib/escalaRotacao";
import { CONTROLE_TURNO_ABAS, CONTROLE_TURNO_SUBTITULO, type ControleTurnoAba, type ControleTurnoTurno } from "./types";
import { AbaEscala } from "./AbaEscala";
import { AbaRotacao } from "./AbaRotacao";
import { AbaRelatorio } from "./AbaRelatorio";
import AbaNotificacoes from "./AbaNotificacoes";

const TUTORIAL_CTX_APROVACAO_ESCALA: AjudaContextualTutorial = {
  id: "controle-turno-aprovacao-escala",
  urlSlug: "ControleTurnoAprovacaoEscala",
  titulo: "Aprovação de Escala de Turno",
  descricao: "Registrar falta, saída antecipada, hora adicional ou horário e aprovar os dias.",
};

const TUTORIAL_CTX_ROTACAO: AjudaContextualTutorial = {
  id: "controle-turno-rotacao",
  urlSlug: "ControleTurnoRotacao",
  titulo: "Gerar Rotação",
  descricao: "Gerar prévia, incluir liderança, protocolo 20 min, mover estúdio/linhas e publicar.",
};

const TUTORIAL_CTX_RELATORIO: AjudaContextualTutorial = {
  id: "controle-turno-relatorio",
  urlSlug: "ControleTurnoRelatorio",
  titulo: "Relatório de Turno",
  descricao: "Gerar rascunho, publicar e consultar relatórios dos turnos.",
};

const TUTORIAL_CTX_NOTIFICACOES: AjudaContextualTutorial = {
  id: "controle-turno-notificacoes",
  urlSlug: "ControleTurnoNotificacoes",
  titulo: "Notificação",
  descricao: "Registrar e acompanhar fechamentos, ausências, feedbacks e manutenções.",
};

const TAB_META: Record<
  ControleTurnoAba,
  { label: string; icon: typeof UsersRound }
> = {
  escala: { label: "Escala do Turno", icon: UsersRound },
  rotacao: { label: "Rotação", icon: RotateCw },
  relatorio: { label: "Relatório de Turno", icon: ClipboardPen },
  notificacoes: { label: "Notificações", icon: Bell },
};

const SEARCH_PLACEHOLDER: Record<ControleTurnoAba, string> = {
  escala: "Pesquisar por Nome ou Nickname...",
  rotacao: "Pesquisar na rotação...",
  relatorio: "Pesquisar por Relator ou palavras-chave...",
  notificacoes: "Pesquisar mesa, prestador ou palavra-chave...",
};

export default function EscalaControleTurnoPage() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_controle_turno");
  const [aba, setAba] = useRouteTab(
    "escala_controle_turno",
    "escala",
    CONTROLE_TURNO_ABAS,
  );
  const [diaIso, setDiaIso] = useState(() => diaIsoLocal(new Date()));
  const [turno, setTurno] = useState<ControleTurnoTurno>("manha");
  const [busca, setBusca] = useState("");
  /** Monta cada aba na 1ª visita e mantém montada — evita refetch/perda de estado ao trocar de aba. */
  const [abasMontadas, setAbasMontadas] = useState<Record<ControleTurnoAba, boolean>>({
    escala: true,
    rotacao: false,
    relatorio: false,
    notificacoes: false,
  });

  useEffect(() => {
    setAbasMontadas((prev) => (prev[aba] ? prev : { ...prev, [aba]: true }));
  }, [aba]);

  const esconderTurno = aba === "relatorio" || aba === "notificacoes";
  const mostrarBusca = aba === "escala" || aba === "relatorio" || aba === "notificacoes";

  const hojeIso = diaIsoLocal(new Date());
  /** Futuro: só até amanhã (hoje + 1). Passado: sem limite. */
  const diaMaxIso = shiftDiaIso(hojeIso, 1);
  const podeAvancarDia = diaIso < diaMaxIso;
  const filtroHojeAtivo = diaIso === hojeIso;

  const tabIds = useMemo(
    () => CONTROLE_TURNO_ABAS.map((k) => `tab-controle-turno-${k}`),
    [],
  );

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div className="app-page-shell app-page-shell--pb64">
      <DashboardPageHeader
        brand={brand}
        t={t}
        icon={<PageMenuIcon pageKey="escala_controle_turno" />}
        title={getPageMenuLabel("escala_controle_turno")}
        subtitle={CONTROLE_TURNO_SUBTITULO}
      />

      <div style={getPageFilterBoxStyle(brand, t)}>
        <div
          style={{
            ...getFilterBarRowStyle(),
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div aria-hidden style={{ width: 1, flex: "0 0 auto" }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
              flex: 1,
            }}
          >
            <button
              type="button"
              aria-label="Dia anterior"
              onClick={() => setDiaIso((d) => shiftDiaIso(d, -1))}
              style={getCarouselBtnNavStyle(t, false)}
            >
              <ChevronLeft size={14} aria-hidden />
            </button>
            <span style={getCarouselPeriodLabelStyle(t, { minWidth: 140 })}>
              {formatDiaRotacaoLabel(diaIso)}
            </span>
            <button
              type="button"
              aria-label="Próximo dia"
              disabled={!podeAvancarDia}
              onClick={() => {
                if (!podeAvancarDia) return;
                setDiaIso((d) => shiftDiaIso(d, 1));
              }}
              style={getCarouselBtnNavStyle(t, !podeAvancarDia)}
            >
              <ChevronRight size={14} aria-hidden />
            </button>
            <FiltroHojeButton
              active={filtroHojeAtivo}
              onClick={() => setDiaIso(hojeIso)}
            />
            {!esconderTurno ? (
              <FiltroTurnoSelect
                value={turno}
                onChange={(v) => setTurno(v as ControleTurnoTurno)}
                options={TURNO_FILTRO_MANHA_TARDE_NOITE}
                showTodasOption={false}
                pill
                minWidth={160}
                highlightWhenFiltered={false}
              />
            ) : null}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", flex: "0 0 auto" }}>
            <AjudaContextualAcoes
              pageKey="escala_controle_turno"
              tutorial={
                aba === "escala"
                  ? TUTORIAL_CTX_APROVACAO_ESCALA
                  : aba === "rotacao"
                    ? TUTORIAL_CTX_ROTACAO
                    : aba === "relatorio"
                      ? TUTORIAL_CTX_RELATORIO
                      : aba === "notificacoes"
                        ? TUTORIAL_CTX_NOTIFICACOES
                        : null
              }
            />
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Abas do Controle de Turno"
          onKeyDown={(e) =>
            onFiltroBarTabsKeyDown(e, [...CONTROLE_TURNO_ABAS], setAba, (k) => `tab-controle-turno-${k}`)
          }
          style={{
            ...getFilterBarRowStyle(),
            justifyContent: "center",
            width: "100%",
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${t.cardBorder}`,
          }}
        >
          {CONTROLE_TURNO_ABAS.map((k, i) => {
            const Icon = TAB_META[k].icon;
            return (
              <FiltroBarTabButton
                key={k}
                id={tabIds[i]}
                active={aba === k}
                aria-controls={`panel-controle-turno-${k}`}
                onClick={() => {
                  setAba(k);
                  setBusca("");
                }}
                icon={<Icon {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                {TAB_META[k].label}
              </FiltroBarTabButton>
            );
          })}
        </div>

        {mostrarBusca ? (
          <div style={{ ...getFilterBarRowStyle(), justifyContent: "center", width: "100%", marginTop: 12 }}>
            <div style={{ width: "100%", maxWidth: 480 }}>
              <BarraPesquisaPagina
                value={busca}
                onChange={setBusca}
                placeholder={SEARCH_PLACEHOLDER[aba]}
                aria-label={SEARCH_PLACEHOLDER[aba].replace(/\.\.\.$/, "")}
              />
            </div>
          </div>
        ) : null}
      </div>

      {abasMontadas.escala ? (
        <div
          role="tabpanel"
          id="panel-controle-turno-escala"
          aria-labelledby="tab-controle-turno-escala"
          hidden={aba !== "escala"}
        >
          <AbaEscala diaIso={diaIso} turno={turno} busca={busca} />
        </div>
      ) : null}
      {abasMontadas.rotacao ? (
        <div
          role="tabpanel"
          id="panel-controle-turno-rotacao"
          aria-labelledby="tab-controle-turno-rotacao"
          hidden={aba !== "rotacao"}
        >
          <AbaRotacao diaIso={diaIso} turno={turno} />
        </div>
      ) : null}
      {abasMontadas.relatorio ? (
        <div
          role="tabpanel"
          id="panel-controle-turno-relatorio"
          aria-labelledby="tab-controle-turno-relatorio"
          hidden={aba !== "relatorio"}
        >
          <AbaRelatorio diaIso={diaIso} busca={busca} />
        </div>
      ) : null}
      {abasMontadas.notificacoes ? (
        <div
          role="tabpanel"
          id="panel-controle-turno-notificacoes"
          aria-labelledby="tab-controle-turno-notificacoes"
          hidden={aba !== "notificacoes"}
        >
          <AbaNotificacoes diaIso={diaIso} busca={busca} />
        </div>
      ) : null}
    </div>
  );
}
