import type { CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import { FONT } from "../../../constants/theme";
import { MSG_SEM_DADOS_PERIODO } from "../../../lib/dashboardConstants";
import {
  GAME_IDENTITY_HEX,
  getGameMesaTituloStripStyle,
} from "../../../lib/gameIdentityColors";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import type { useApp } from "../../../context/AppContext";
import type { createDataTableBlockStyles } from "../../../lib/dataTableStyles";
import { LABEL_FUTEBOL_BRASILEIRO, type LinhaMesaPorDia } from "./overviewSpinLogic";
import { OverviewSpinMesaDiaTabela } from "./OverviewSpinMesaDiaTabela";

type Brand = ReturnType<typeof useDashboardBrand>;
type Theme = ReturnType<typeof useApp>["theme"];
type DataTable = ReturnType<typeof createDataTableBlockStyles>;

export type OverviewSpinDadosPorMesaProps = {
  /** Aba Estúdio Network: Blackjack + Roleta em cima; Speed Baccarat + Futebol embaixo. Sem Comparativo de mesa. */
  layoutNetwork: boolean;
  state: "loading" | "empty" | "ready";
  emptyMessage?: string;
  colTempo: "Data" | "Mês";
  mesSelecionadoLabel: string;
  linhasBlackjack: LinhaMesaPorDia[];
  linhasSpeedBaccarat: LinhaMesaPorDia[];
  linhasRoleta: LinhaMesaPorDia[];
  linhasFutebolBrasileiro: LinhaMesaPorDia[];
  exibirFutebol: boolean;
  contentBox: CSSProperties;
  dataTable: DataTable;
  brand: Brand;
  t: Theme;
};

export function OverviewSpinDadosPorMesa({
  layoutNetwork,
  state,
  emptyMessage = MSG_SEM_DADOS_PERIODO,
  colTempo,
  mesSelecionadoLabel,
  linhasBlackjack,
  linhasSpeedBaccarat,
  linhasRoleta,
  linhasFutebolBrasileiro,
  exibirFutebol,
  contentBox,
  dataTable,
  brand,
  t,
}: OverviewSpinDadosPorMesaProps) {
  const sub = layoutNetwork
    ? "Blackjack, Roleta, Baccarat e Futebol Brasileiro"
    : "Baccarat, Roleta e Futebol Brasileiro";

  const tituloBlackjack = getGameMesaTituloStripStyle(GAME_IDENTITY_HEX.blackjack, {
    fontFamily: FONT.body,
  });
  const tituloSpeedBaccarat = getGameMesaTituloStripStyle(GAME_IDENTITY_HEX.baccarat, {
    fontFamily: FONT.body,
  });
  const tituloRoleta = getGameMesaTituloStripStyle(GAME_IDENTITY_HEX.roleta, {
    fontFamily: FONT.body,
  });
  const tituloFutebol = getGameMesaTituloStripStyle(GAME_IDENTITY_HEX.futebol_brasileiro, {
    fontFamily: FONT.body,
    marginTop: layoutNetwork ? 0 : 14,
  });

  return (
    <div style={contentBox}>
      <SectionTitle sub={sub}>Dados por mesa</SectionTitle>

      {state === "loading" ? (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: t.textMuted,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
          <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      ) : state === "empty" ? (
        <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          {emptyMessage}
        </div>
      ) : layoutNetwork ? (
        <>
          <div className="app-conversao-funil-duo">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={tituloBlackjack}>Blackjack</div>
              <OverviewSpinMesaDiaTabela
                linhas={linhasBlackjack}
                colTempo={colTempo}
                tituloTabela="Blackjack"
                mesSelecionadoLabel={mesSelecionadoLabel}
                dataTable={dataTable}
                brand={brand}
                t={t}
              />
            </div>
            <div
              className="app-conversao-funil-divider"
              style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={tituloRoleta}>Roleta</div>
              <OverviewSpinMesaDiaTabela
                linhas={linhasRoleta}
                colTempo={colTempo}
                tituloTabela="Roleta"
                mesSelecionadoLabel={mesSelecionadoLabel}
                dataTable={dataTable}
                brand={brand}
                t={t}
              />
            </div>
          </div>
          <div className="app-conversao-funil-duo" style={{ marginTop: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={tituloSpeedBaccarat}>Speed Baccarat</div>
              <OverviewSpinMesaDiaTabela
                linhas={linhasSpeedBaccarat}
                colTempo={colTempo}
                tituloTabela="Speed Baccarat"
                mesSelecionadoLabel={mesSelecionadoLabel}
                dataTable={dataTable}
                brand={brand}
                t={t}
              />
            </div>
            {exibirFutebol ? (
              <>
                <div
                  className="app-conversao-funil-divider"
                  style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={tituloFutebol}>{LABEL_FUTEBOL_BRASILEIRO}</div>
                  <OverviewSpinMesaDiaTabela
                    linhas={linhasFutebolBrasileiro}
                    colTempo={colTempo}
                    tituloTabela={LABEL_FUTEBOL_BRASILEIRO}
                    mesSelecionadoLabel={mesSelecionadoLabel}
                    dataTable={dataTable}
                    brand={brand}
                    t={t}
                  />
                </div>
              </>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="app-conversao-funil-duo">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={tituloSpeedBaccarat}>Speed Baccarat</div>
              <OverviewSpinMesaDiaTabela
                linhas={linhasSpeedBaccarat}
                colTempo={colTempo}
                tituloTabela="Speed Baccarat"
                mesSelecionadoLabel={mesSelecionadoLabel}
                dataTable={dataTable}
                brand={brand}
                t={t}
              />
            </div>
            <div
              className="app-conversao-funil-divider"
              style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={tituloRoleta}>Roleta</div>
              <OverviewSpinMesaDiaTabela
                linhas={linhasRoleta}
                colTempo={colTempo}
                tituloTabela="Roleta"
                mesSelecionadoLabel={mesSelecionadoLabel}
                dataTable={dataTable}
                brand={brand}
                t={t}
              />
            </div>
          </div>
          {exibirFutebol ? (
            <div style={{ marginTop: 4 }}>
              <div style={tituloFutebol}>{LABEL_FUTEBOL_BRASILEIRO}</div>
              <OverviewSpinMesaDiaTabela
                linhas={linhasFutebolBrasileiro}
                colTempo={colTempo}
                tituloTabela={LABEL_FUTEBOL_BRASILEIRO}
                mesSelecionadoLabel={mesSelecionadoLabel}
                dataTable={dataTable}
                brand={brand}
                t={t}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
