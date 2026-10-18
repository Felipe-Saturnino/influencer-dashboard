import { useCallback, useEffect, useState } from "react";
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
  labelLocalMesaIncidente,
  labelPrestadorIncidente,
  labelTipoJogoIncidente,
  timeAlvoLabel,
} from "../../../lib/estudioIncidentesHelpers";

type AbaVer = "dados" | "descricao";

const ERRO_CARREGAR_ANEXOS =
  "Não foi possível carregar os anexos. Se o problema persistir, entre em contato com o suporte.";

function Campo({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: string;
  /** Ocupa a linha inteira do grid (ex.: ID da Rodada longo). */
  fullWidth?: boolean;
}) {
  const { theme: t } = useApp();
  return (
    <div style={{ minWidth: 0, ...(fullWidth ? { gridColumn: "1 / -1" } : null) }}>
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
      <div
        style={{
          fontSize: 13,
          color: t.text,
          fontFamily: FONT.body,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

const row2 = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
} as const;

const row3 = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
} as const;

export function ModalVerIncidente({
  incidente,
  prestadorNickname,
  relatorLabel,
  ocultarPrestadorTimeRelator,
  onClose,
}: {
  incidente: EstudioIncidenteRow;
  /** Nickname do staff (Gestão de Staff), se conhecido. */
  prestadorNickname?: string | null;
  /** Relator exibido — preferir nickname de Gestão de Staff. */
  relatorLabel?: string | null;
  ocultarPrestadorTimeRelator: boolean;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [aba, setAba] = useState<AbaVer>("dados");
  const [anexos, setAnexos] = useState<(EstudioIncidenteAnexoRow & { url: string | null })[]>([]);
  const [loadingAnexos, setLoadingAnexos] = useState(true);
  const [erroAnexos, setErroAnexos] = useState<string | null>(null);
  const [anexosReload, setAnexosReload] = useState(0);

  const carregarAnexos = useCallback(async (cancelRef: { current: boolean }) => {
    setLoadingAnexos(true);
    setErroAnexos(null);
    try {
      const rows = await fetchEstudioIncidenteAnexos(incidente.id);
      if (cancelRef.current) return;
      const comUrl = await Promise.all(
        rows.map(async (a) => ({ ...a, url: await urlAssinadaAnexoIncidente(a.storage_path) })),
      );
      if (cancelRef.current) return;
      setAnexos(comUrl);
    } catch (e) {
      console.error("Incidentes: falha ao carregar anexos", e);
      if (!cancelRef.current) setErroAnexos(ERRO_CARREGAR_ANEXOS);
    } finally {
      if (!cancelRef.current) setLoadingAnexos(false);
    }
  }, [incidente.id]);

  useEffect(() => {
    const cancelRef = { current: false };
    void carregarAnexos(cancelRef);
    return () => {
      cancelRef.current = true;
    };
  }, [carregarAnexos, anexosReload]);

  const categoriaCor = INCIDENTE_CATEGORIA_META[incidente.incidente]?.color ?? t.textMuted;
  const isShuffler = incidente.time_alvo === "shuf";

  const tabs: { id: AbaVer; label: string }[] = [
    { id: "dados", label: "Dados do Incidente" },
    { id: "descricao", label: "Descrição" },
  ];

  const prestadorLabel = labelPrestadorIncidente(incidente.prestador_nome, prestadorNickname, "nome-nick");

  return (
    <ModalBase onClose={onClose} maxWidth={720}>
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
        <div style={{ display: "grid", gap: 14 }}>
          {ocultarPrestadorTimeRelator ? (
            <Campo label="Abertura de Incidente" value={formatDataHoraIncidente(incidente.created_at)} fullWidth />
          ) : (
            <div style={row2}>
              <Campo label="Abertura de Incidente" value={formatDataHoraIncidente(incidente.created_at)} />
              <Campo label="Relator" value={(relatorLabel ?? "").trim() || incidente.relator_nome} />
            </div>
          )}
          <div style={row2}>
            <Campo label="Data da Rodada" value={formatDataIsoBr(incidente.data_rodada)} />
            <Campo label="Hora da Rodada" value={formatHoraRodada(incidente.hora_rodada)} />
          </div>
          <Campo label="ID da Rodada" value={incidente.id_rodada} fullWidth />
          <div style={row2}>
            <Campo label="Mesa" value={incidente.mesa_label} />
            <Campo label="Jogo" value={labelTipoJogoIncidente(incidente.jogo)} />
          </div>
          {ocultarPrestadorTimeRelator ? null : (
            <div style={row2}>
              <Campo label="Prestador" value={prestadorLabel} />
              <Campo label="Time" value={timeAlvoLabel(incidente.time_alvo)} />
            </div>
          )}
        </div>
      </ModalTabPanel>

      <ModalTabPanel
        active={aba === "descricao"}
        id="panel-ver-incidente-descricao"
        labelledBy="tab-ver-incidente-descricao"
      >
        <div style={{ display: "grid", gap: 14 }}>
          {isShuffler ? (
            <div style={row3}>
              <Campo label="Resolução" value={incidente.resolucao} />
              <Campo label="Payout necessário" value={incidente.payout_necessario ? "SIM" : "NÃO"} />
              <Campo label="Local do Shoe" value={labelLocalMesaIncidente(incidente.local_mesa)} />
            </div>
          ) : (
            <div style={row2}>
              <Campo label="Resolução" value={incidente.resolucao} />
              <Campo label="Payout necessário" value={incidente.payout_necessario ? "SIM" : "NÃO"} />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
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
                overflowWrap: "anywhere",
                wordBreak: "break-word",
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
              <div
                role="alert"
                aria-live="polite"
                style={{
                  color: "#e84025",
                  fontSize: 12,
                  fontFamily: FONT.body,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span>{erroAnexos}</span>
                <button
                  type="button"
                  onClick={() => setAnexosReload((n) => n + 1)}
                  style={{
                    fontFamily: FONT.body,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "6px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(232,64,37,0.35)",
                    background: "transparent",
                    color: "#e84025",
                    cursor: "pointer",
                  }}
                >
                  Tentar de novo
                </button>
              </div>
            ) : loadingAnexos ? (
              <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Carregando…</div>
            ) : anexos.length === 0 ? (
              <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                Nenhum anexo registrado.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {anexos.map((a, idx) => {
                  const rotulo = `Arquivo ${idx + 1}`;
                  return a.url ? (
                    <a
                      key={a.id}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      title={a.file_name}
                      aria-label={`${rotulo} — ${a.file_name}`}
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
                      {rotulo}
                    </a>
                  ) : (
                    <div
                      key={a.id}
                      title={a.file_name}
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
                      {rotulo}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ModalTabPanel>
    </ModalBase>
  );
}
