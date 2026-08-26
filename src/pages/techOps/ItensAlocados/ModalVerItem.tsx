import { useState } from "react";
import { FileText, MapPin } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { formatDataHoraEstoque, type ItemAlocadoSetRow } from "../../../lib/techOpsItensAlocados";
import { CampoCardAlocado, ROW2_ALOCADO } from "./itensAlocadosUi";

type AbaVer = "dados" | "alocacao";

export function ModalVerItemAlocado({ item, onClose }: { item: ItemAlocadoSetRow; onClose: () => void }) {
  const { theme: t } = useApp();
  const [aba, setAba] = useState<AbaVer>("dados");

  const tabs = [
    { id: "dados" as const, label: "Dados do Item", icon: <FileText {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "alocacao" as const, label: "Alocação", icon: <MapPin {...FILTRO_BAR_TAB_ICON_PROPS} /> },
  ];

  return (
    <ModalBase onClose={onClose} maxWidth={720}>
      <ModalHeader title={item.nome} onClose={onClose} />
      <p style={{ margin: "-12px 0 16px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
        {item.codigo} — {item.categoria}
      </p>

      <div
        role="tablist"
        aria-label={`Detalhes — ${item.nome}`}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
        onKeyDown={(e) =>
          onFiltroBarTabsKeyDown(
            e,
            tabs.map((tb) => tb.id),
            setAba,
            (k) => `tab-ver-ia-${k}`,
          )
        }
      >
        {tabs.map((tb) => (
          <FiltroBarTabButton
            key={tb.id}
            id={`tab-ver-ia-${tb.id}`}
            active={aba === tb.id}
            aria-controls={`panel-ver-ia-${tb.id}`}
            onClick={() => setAba(tb.id)}
            icon={tb.icon}
          >
            {tb.label}
          </FiltroBarTabButton>
        ))}
      </div>

      <ModalTabPanel active={aba === "dados"} id="panel-ver-ia-dados" labelledBy="tab-ver-ia-dados">
        <div style={{ display: "grid", gap: 14 }}>
          {item.entidade_tipo === "jogo" ? (
            <div style={ROW2_ALOCADO}>
              <CampoCardAlocado label="Quantidade em Estoque" value={item.qtd_estoque.toLocaleString("pt-BR")} />
              <CampoCardAlocado label="Quantidade em Uso" value={item.qtd_uso_local.toLocaleString("pt-BR")} />
            </div>
          ) : item.entidade_tipo === "item" ? (
            <>
              <div style={ROW2_ALOCADO}>
                <CampoCardAlocado label="Marca" value={item.marca} />
                <CampoCardAlocado label="Modelo" value={item.modelo} />
              </div>
              <div style={ROW2_ALOCADO}>
                <CampoCardAlocado label="Quantidade em Estoque" value={item.qtd_estoque.toLocaleString("pt-BR")} />
                <CampoCardAlocado label="Quantidade em Uso" value={item.qtd_uso_local.toLocaleString("pt-BR")} />
              </div>
              <div style={ROW2_ALOCADO}>
                <CampoCardAlocado
                  label="Valor Unitário"
                  value={item.valor_unitario != null ? fmtBRL(item.valor_unitario) : "—"}
                />
                <CampoCardAlocado
                  label="Valor do Estoque"
                  value={
                    item.valor_unitario != null ? fmtBRL(item.valor_unitario * item.qtd_estoque) : "—"
                  }
                />
              </div>
            </>
          ) : (
            <>
              <div style={ROW2_ALOCADO}>
                <CampoCardAlocado label="Número de Série" value={item.numero_serie} />
                <CampoCardAlocado label="Marca" value={item.marca} />
              </div>
              <div style={ROW2_ALOCADO}>
                <CampoCardAlocado label="Modelo" value={item.modelo} />
                <CampoCardAlocado label="Valor" value={item.valor != null ? fmtBRL(item.valor) : "—"} />
              </div>
              <div style={ROW2_ALOCADO}>
                <CampoCardAlocado label="Quantidade em Estoque" value={item.qtd_estoque.toLocaleString("pt-BR")} />
                <CampoCardAlocado label="Quantidade em Uso" value={item.qtd_uso_local.toLocaleString("pt-BR")} />
              </div>
            </>
          )}
        </div>
      </ModalTabPanel>

      <ModalTabPanel active={aba === "alocacao"} id="panel-ver-ia-alocacao" labelledBy="tab-ver-ia-alocacao">
        {item.alocacoes.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Nenhuma alocação registrada.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {item.alocacoes.map((os) => (
              <div
                key={`${os.ordem_id}-${os.codigo_os}`}
                style={{
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  background: t.inputBg,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "var(--brand-primary, #7c3aed)",
                    marginBottom: 10,
                    fontFamily: FONT.body,
                  }}
                >
                  {os.codigo_os} · Qtd {os.quantidade}
                </div>
                <div style={ROW2_ALOCADO}>
                  <CampoCardAlocado label="Data/hora de Atribuição" value={formatDataHoraEstoque(os.data_hora)} />
                  <CampoCardAlocado label="Usuário que atribuiu" value={os.usuario} />
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalTabPanel>
    </ModalBase>
  );
}
