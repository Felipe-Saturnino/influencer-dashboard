import { useEffect, useState } from "react";
import { FileText, MessageSquareText, Paperclip } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import {
  fetchEstudioIncidenteAnexos,
  urlAssinadaAnexoIncidente,
} from "../../../lib/estudioIncidentesFetch";
import { INCIDENTE_CATEGORIA_META } from "../../../lib/estudioIncidentesTypes";
import type { EstudioIncidenteAnexoRow, EstudioIncidenteRow } from "../../../lib/estudioIncidentesTypes";
import {
  formatDataHoraIncidente,
  formatDataIsoBr,
  formatHoraRodada,
  incidenteCategoriaLabel,
  labelTipoJogoIncidente,
  timeAlvoLabel,
} from "../../../lib/estudioIncidentesHelpers";

type AbaVer = "dados" | "descricao";

const ERRO_CARREGAR_ANEXOS =
  "Não foi possível carregar os anexos. Se o problema persistir, entre em contato com o suporte.";

function Campo({ label, value }: { label: string; value: string }) {
  const { theme: t } = useApp();
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.06em",
          color: t.textMuted,
          fontFamily: FONT.body,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: t.text, fontFamily: FONT.body }}>{value || "—"}</div>
    </div>
  );
}

export function ModalVerIncidente({
  incidente,
  ocultarPrestadorTimeRelator,
  onClose,
}: {
  incidente: EstudioIncidenteRow;
  ocultarPrestadorTimeRelator: boolean;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [aba, setAba] = useState<AbaVer>("dados");
  const [anexos, setAnexos] = useState<(EstudioIncidenteAnexoRow & { url: string | null })[]>([]);
  const [loadingAnexos, setLoadingAnexos] = useState(true);
  const [erroAnexos, setErroAnexos] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoadingAnexos(true);
      setErroAnexos(null);
      try {
        const rows = await fetchEstudioIncidenteAnexos(incidente.id);
        if (cancel) return;
        const comUrl = await Promise.all(
          rows.map(async (a) => ({ ...a, url: await urlAssinadaAnexoIncidente(a.storage_path) })),
        );
        if (cancel) return;
        setAnexos(comUrl);
      } catch (e) {
        console.error("Incidentes: falha ao carregar anexos", e);
        if (!cancel) setErroAnexos(ERRO_CARREGAR_ANEXOS);
      } finally {
        if (!cancel) setLoadingAnexos(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [incidente.id]);

  const categoriaCor = INCIDENTE_CATEGORIA_META[incidente.incidente]?.color ?? t.textMuted;

  const tabs: { id: AbaVer; label: string }[] = [
    { id: "dados", label: "Dados do Incidente" },
    { id: "descricao", label: "Descrição" },
  ];

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
  } as const;

  return (
    <ModalBase onClose={onClose} maxWidth={640}>
      <ModalHeader title={incidente.protocolo} onClose={onClose} />
      <p
        style={{
          margin: "-14px 0 16px",
          fontSize: 12,
          fontWeight: 700,
          color: categoriaCor,
          fontFamily: FONT.body,
        }}
      >
        {incidenteCategoriaLabel(incidente.incidente)} — {incidente.tipo}
      </p>

      <div
        role="tablist"
        aria-label={`Detalhes — ${incidente.protocolo}`}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
        onKeyDown={(e) =>
          onFiltroBarTabsKeyDown(
            e,
            tabs.map((tb) => tb.id),
            setAba,
            (k) => `tab-ver-incidente-${k}`,
          )
        }
      >
        {tabs.map((tb) => (
          <FiltroBarTabButton
            key={tb.id}
            id={`tab-ver-incidente-${tb.id}`}
            active={aba === tb.id}
            aria-controls={`panel-ver-incidente-${tb.id}`}
            onClick={() => setAba(tb.id)}
            icon={
              tb.id === "dados" ? (
                <FileText {...FILTRO_BAR_TAB_ICON_PROPS} />
              ) : (
                <MessageSquareText {...FILTRO_BAR_TAB_ICON_PROPS} />
              )
            }
          >
            {tb.label}
          </FiltroBarTabButton>
        ))}
      </div>

      <ModalTabPanel active={aba === "dados"} id="panel-ver-incidente-dados" labelledBy="tab-ver-incidente-dados">
        <div style={gridStyle}>
          <Campo label="Data/Hora" value={formatDataHoraIncidente(incidente.ocorrido_em)} />
          {!ocultarPrestadorTimeRelator && <Campo label="Prestador" value={incidente.prestador_nome} />}
          {!ocultarPrestadorTimeRelator && <Campo label="Time" value={timeAlvoLabel(incidente.time_alvo)} />}
          <Campo label="Jogo" value={labelTipoJogoIncidente(incidente.jogo)} />
          <Campo label="Mesa" value={incidente.mesa_label} />
          {!ocultarPrestadorTimeRelator && <Campo label="Relator" value={incidente.relator_nome} />}
          <Campo label="ID da Rodada" value={incidente.id_rodada} />
          <Campo label="Data da Rodada" value={formatDataIsoBr(incidente.data_rodada)} />
          <Campo label="Hora da Rodada" value={formatHoraRodada(incidente.hora_rodada)} />
        </div>
      </ModalTabPanel>

      <ModalTabPanel
        active={aba === "descricao"}
        id="panel-ver-incidente-descricao"
        labelledBy="tab-ver-incidente-descricao"
      >
        <div style={{ display: "grid", gap: 14 }}>
          <div style={gridStyle}>
            <Campo label="Resolução" value={incidente.resolucao} />
            <Campo label="Payout necessário" value={incidente.payout_necessario ? "SIM" : "NÃO"} />
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
                color: t.textMuted,
                fontFamily: FONT.body,
                marginBottom: 3,
              }}
            >
              Descrição
            </div>
            <div
              style={{
                fontSize: 13,
                color: t.text,
                fontFamily: FONT.body,
                whiteSpace: "pre-wrap" as const,
              }}
            >
              {incidente.descricao || "—"}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
                color: t.textMuted,
                fontFamily: FONT.body,
                marginBottom: 6,
              }}
            >
              Anexos
            </div>
            {erroAnexos ? (
              <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
                {erroAnexos}
              </div>
            ) : loadingAnexos ? (
              <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Carregando…</div>
            ) : anexos.length === 0 ? (
              <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                Nenhum anexo registrado.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {anexos.map((a) =>
                  a.url ? (
                    <a
                      key={a.id}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: brand.primary,
                        fontFamily: FONT.body,
                      }}
                    >
                      <Paperclip size={12} aria-hidden />
                      {a.file_name}
                    </a>
                  ) : (
                    <div
                      key={a.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: t.textMuted,
                        fontFamily: FONT.body,
                      }}
                    >
                      <Paperclip size={12} aria-hidden />
                      {a.file_name}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </ModalTabPanel>
    </ModalBase>
  );
}
