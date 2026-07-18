import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Check, FileText, History, MessageSquareText, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import { formatDataHoraEstoque } from "../../../lib/techOpsEstoque";
import {
  aprovarOrdemSaida,
  cancelarOrdemSaida,
  fetchAnotacoesOrdemSaida,
  fetchHistoricoOrdemSaida,
  formatCodigoOrdemSaida,
  formatDataBrOs,
  formatSolicitanteOs,
  labelLocalOs,
  labelStatusOrdemSaida,
  montarTimelineAnotacoesOs,
  subtituloModalOs,
  type OrdemSaidaAnotacaoRow,
  type OrdemSaidaItemRow,
  type OrdemSaidaRow,
  type OsModalContexto,
} from "../../../lib/techOpsOrdemSaida";
import { CampoLeitura, ErroInline, getOsInputStyle, getOsLabelStyle, OS_FORM_GRID } from "./ordemSaidaUi";

type AbaVer = "dados" | "anotacoes" | "historico";

const ERRO_CARREGAR =
  "Não foi possível carregar as informações. Se o problema persistir, entre em contato com o suporte.";

type CampoDef = { label: string; valor: ReactNode };

/** Monta os campos de leitura da aba Dados conforme o contexto do modal. */
function camposDadosOs(row: OrdemSaidaRow, contexto: OsModalContexto, estudioNomePorSlug: Record<string, string>): {
  campos: CampoDef[];
  itensLabel: string;
} {
  switch (contexto) {
    case "interna":
      return {
        campos: [
          { label: "Origem", valor: labelLocalOs(row.origem_chave, estudioNomePorSlug) },
          { label: "Saída", valor: formatDataBrOs(row.data_saida) },
          { label: "Destino", valor: labelLocalOs(row.destino_chave, estudioNomePorSlug) },
          { label: "Retorno", valor: row.sem_retorno ? "Sem retorno" : formatDataBrOs(row.data_retorno) },
        ],
        itensLabel: "Itens",
      };
    case "externa_futuras":
      return {
        campos: [
          { label: "Destino", valor: row.destino_texto || "—" },
          { label: "Previsão de Saída", valor: formatDataBrOs(row.data_saida) },
          { label: "Previsão de Retorno", valor: formatDataBrOs(row.data_retorno) },
        ],
        itensLabel: "Itens",
      };
    case "externa_abertas":
      return {
        campos: [
          { label: "Destino", valor: row.destino_texto || "—" },
          { label: "Previsão de Saída", valor: formatDataBrOs(row.data_saida) },
          { label: "Saída Realizada", valor: formatDataBrOs(row.data_saida_realizada) },
          { label: "Previsão de Retorno", valor: formatDataBrOs(row.data_retorno) },
        ],
        itensLabel: "Itens",
      };
    case "externa_encerradas":
      return {
        campos: [
          { label: "Destino", valor: row.destino_texto || "—" },
          { label: "Previsão de Saída", valor: formatDataBrOs(row.data_saida) },
          { label: "Saída Realizada", valor: formatDataBrOs(row.data_saida_realizada) },
          { label: "Previsão de Retorno", valor: formatDataBrOs(row.data_retorno) },
          { label: "Retorno Realizado", valor: formatDataBrOs(row.data_retorno_realizada) },
        ],
        itensLabel: "Itens",
      };
    case "manutencao_abertas":
      return {
        campos: [
          { label: "Destino", valor: row.fornecedor_razao_social || "—" },
          { label: "Saída", valor: formatDataBrOs(row.data_saida) },
          { label: "Previsão de Retorno", valor: row.sem_retorno ? "Sem previsão" : formatDataBrOs(row.data_retorno) },
        ],
        itensLabel: "Equipamento",
      };
    case "manutencao_encerradas":
      return {
        campos: [
          { label: "Destino", valor: row.fornecedor_razao_social || "—" },
          { label: "Saída realizada", valor: formatDataBrOs(row.data_saida_realizada) },
          { label: "Retorno Realizado", valor: formatDataBrOs(row.data_retorno_realizada) },
        ],
        itensLabel: "Equipamento",
      };
    default:
      return { campos: [], itensLabel: "Itens" };
  }
}

function BlocoRotuloOs({ children }: { children: ReactNode }) {
  const { theme: t } = useApp();
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: t.textMuted,
        marginBottom: 8,
        fontFamily: FONT.body,
      }}
    >
      {children}
    </div>
  );
}

function BlocoItensOs({ titulo, itens }: { titulo: string; itens: OrdemSaidaItemRow[] }) {
  const { theme: t } = useApp();
  const cardItemStyle: CSSProperties = {
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: "12px 14px",
    fontFamily: FONT.body,
  };
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <BlocoRotuloOs>{titulo}</BlocoRotuloOs>
      {itens.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: t.textMuted,
            fontFamily: FONT.body,
            textAlign: "center",
            padding: "16px 0",
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
          }}
        >
          Nenhum item nesta ordem.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {itens.map((it) => (
            <div key={it.id} style={cardItemStyle}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{it.label_snapshot}</div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>Quantidade: {it.quantidade}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuadroDestacadoOs({ titulo, cor, children }: { titulo: string; cor: string; children: ReactNode }) {
  const { theme: t } = useApp();
  return (
    <div
      style={{
        border: `1px solid color-mix(in srgb, ${cor} 35%, ${t.cardBorder})`,
        background: `color-mix(in srgb, ${cor} 8%, transparent)`,
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: cor,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 10,
          fontFamily: FONT.body,
        }}
      >
        {titulo}
      </div>
      <div style={OS_FORM_GRID}>{children}</div>
    </div>
  );
}

function PainelDadosOs({
  row,
  contexto,
  estudioNomePorSlug,
}: {
  row: OrdemSaidaRow;
  contexto: OsModalContexto;
  estudioNomePorSlug: Record<string, string>;
}) {
  const { campos, itensLabel } = camposDadosOs(row, contexto, estudioNomePorSlug);
  const mostrarCancelamento = row.status === "cancelada";
  const mostrarConclusao = contexto === "interna" && row.status === "concluida" && !row.sem_retorno;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={OS_FORM_GRID}>
        {campos.map((c) => (
          <CampoLeitura key={c.label} label={c.label} valor={c.valor} />
        ))}
        <BlocoItensOs titulo={itensLabel} itens={row.itens} />
      </div>

      {mostrarCancelamento ? (
        <QuadroDestacadoOs titulo="Cancelamento" cor="#e84025">
          <CampoLeitura label="Usuário que cancelou" valor={row.cancelado_por_nome || "—"} />
          <CampoLeitura
            label="Data/Hora"
            valor={row.cancelado_em ? formatDataHoraEstoque(row.cancelado_em) : "—"}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <CampoLeitura label="Motivo do Cancelamento" valor={row.motivo_cancelamento || "—"} />
          </div>
        </QuadroDestacadoOs>
      ) : null}

      {mostrarConclusao ? (
        <QuadroDestacadoOs titulo="Conclusão" cor="#22c55e">
          <CampoLeitura label="Usuário que concluiu" valor={row.concluido_por_nome || "—"} />
          <CampoLeitura
            label="Data/Hora"
            valor={row.concluido_em ? formatDataHoraEstoque(row.concluido_em) : "—"}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <CampoLeitura label="Observações do Retorno" valor={row.observacoes_retorno || "—"} />
          </div>
        </QuadroDestacadoOs>
      ) : null}
    </div>
  );
}

export function ModalVerOs({
  row,
  contexto,
  estudioNomePorSlug,
  onClose,
  aprovacao,
}: {
  row: OrdemSaidaRow;
  contexto: OsModalContexto;
  estudioNomePorSlug: Record<string, string>;
  onClose: () => void;
  aprovacao?: {
    userName: string;
    onAtualizado: () => void;
  };
}) {
  const { theme: t } = useApp();
  const [aba, setAba] = useState<AbaVer>("dados");
  const [anotacoes, setAnotacoes] = useState<OrdemSaidaAnotacaoRow[]>([]);
  const [historico, setHistorico] = useState<
    { id: string; acao: string; detalhe: string | null; autor_nome: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoading(true);
      setErro(null);
      try {
        const [an, hi] = await Promise.all([
          fetchAnotacoesOrdemSaida(row.id),
          fetchHistoricoOrdemSaida(row.id),
        ]);
        if (cancel) return;
        setAnotacoes(an);
        setHistorico(hi);
      } catch (e) {
        console.error("Ordem de Saída: falha ao carregar anotações/histórico", e);
        if (!cancel) setErro(ERRO_CARREGAR);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [row.id]);

  const codigo = formatCodigoOrdemSaida(row.tipo, row.competencia, row.codigo_num);
  const subtitulo = aprovacao
    ? `${labelStatusOrdemSaida(row.status, row.tipo)} - ${formatSolicitanteOs(row.solicitante_nome, row.solicitante_time)}`
    : subtituloModalOs(row);
  const timelineAnotacoes = montarTimelineAnotacoesOs(row, anotacoes);

  const tabs: { id: AbaVer; label: string; icon: ReactNode }[] = [
    { id: "dados", label: "Dados da OS", icon: <FileText {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "anotacoes", label: "Anotações", icon: <MessageSquareText {...FILTRO_BAR_TAB_ICON_PROPS} /> },
    { id: "historico", label: "Histórico", icon: <History {...FILTRO_BAR_TAB_ICON_PROPS} /> },
  ];

  const cardItemStyle: CSSProperties = {
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 12,
    padding: "12px 14px",
    fontFamily: FONT.body,
  };
  const metaStyle: CSSProperties = {
    fontSize: 11,
    color: t.textMuted,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  };

  async function aprovar() {
    if (!aprovacao || row.status !== "solicitada") return;
    setSaving(true);
    setErroAcao(null);
    try {
      await aprovarOrdemSaida({ row, autorNome: aprovacao.userName });
      aprovacao.onAtualizado();
      onClose();
    } catch (e) {
      console.error("Ordem de Saída: falha ao aprovar", e);
      setErroAcao("Não foi possível aprovar a ordem. Se o problema persistir, entre em contato com o suporte.");
      setSaving(false);
    }
  }

  async function recusar() {
    if (!aprovacao || row.status !== "solicitada") return;
    if (!motivo.trim()) {
      setErroAcao("Informe o Motivo do Cancelamento.");
      return;
    }
    setSaving(true);
    setErroAcao(null);
    try {
      await cancelarOrdemSaida({ row, motivo, autorNome: aprovacao.userName });
      aprovacao.onAtualizado();
      onClose();
    } catch (e) {
      console.error("Ordem de Saída: falha ao recusar", e);
      setErroAcao("Não foi possível recusar a ordem. Se o problema persistir, entre em contato com o suporte.");
      setSaving(false);
    }
  }

  return (
    <ModalBase onClose={onClose} maxWidth={640}>
      <ModalHeader title={codigo} onClose={onClose} />
      <p style={{ margin: "-12px 0 16px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{subtitulo}</p>

      <div
        role="tablist"
        aria-label="Detalhes da ordem"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
        onKeyDown={(e) =>
          onFiltroBarTabsKeyDown(
            e,
            tabs.map((tb) => tb.id),
            setAba,
            (k) => `tab-ver-os-${k}`,
          )
        }
      >
        {tabs.map((tb) => (
          <FiltroBarTabButton
            key={tb.id}
            id={`tab-ver-os-${tb.id}`}
            active={aba === tb.id}
            aria-controls={`panel-ver-os-${tb.id}`}
            onClick={() => setAba(tb.id)}
            icon={tb.icon}
          >
            {tb.label}
          </FiltroBarTabButton>
        ))}
      </div>

      <ModalTabPanel active={aba === "dados"} id="panel-ver-os-dados" labelledBy="tab-ver-os-dados">
        <PainelDadosOs row={row} contexto={contexto} estudioNomePorSlug={estudioNomePorSlug} />
      </ModalTabPanel>

      <ModalTabPanel active={aba === "anotacoes"} id="panel-ver-os-anotacoes" labelledBy="tab-ver-os-anotacoes">
        {erro ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
            {erro}
          </div>
        ) : loading ? (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Carregando…</div>
        ) : timelineAnotacoes.length === 0 ? (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, padding: "20px 0", textAlign: "center" }}>
            Nenhuma anotação registrada.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {timelineAnotacoes.map((a) => (
              <div key={a.id} style={cardItemStyle}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 4 }}>{a.titulo}</div>
                <div style={{ fontSize: 13, color: t.text, whiteSpace: "pre-wrap", marginBottom: 8 }}>{a.texto}</div>
                <div style={metaStyle}>
                  <span>{a.autor_nome || "—"}</span>
                  <span>{formatDataHoraEstoque(a.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalTabPanel>

      <ModalTabPanel active={aba === "historico"} id="panel-ver-os-historico" labelledBy="tab-ver-os-historico">
        {erro ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
            {erro}
          </div>
        ) : loading ? (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Carregando…</div>
        ) : historico.length === 0 ? (
          <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, padding: "20px 0", textAlign: "center" }}>
            Nenhuma ação registrada.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {historico.map((h) => (
              <div key={h.id} style={cardItemStyle}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 4 }}>{h.acao}</div>
                {h.detalhe ? (
                  <div style={{ fontSize: 12, color: t.textMuted, whiteSpace: "pre-wrap", marginBottom: 8 }}>
                    {h.detalhe}
                  </div>
                ) : null}
                <div style={metaStyle}>
                  <span>{h.autor_nome || "—"}</span>
                  <span>{formatDataHoraEstoque(h.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalTabPanel>

      {aprovacao && row.status === "solicitada" ? (
        <div style={{ marginTop: 18 }}>
          {recusando ? (
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="os-aprovar-motivo" style={getOsLabelStyle(t)}>
                Motivo do Cancelamento
              </label>
              <textarea
                id="os-aprovar-motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={4}
                style={{ ...getOsInputStyle(t), resize: "vertical" }}
              />
            </div>
          ) : null}
          <ErroInline>{erroAcao}</ErroInline>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                if (recusando) void recusar();
                else setRecusando(true);
              }}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                borderRadius: 10,
                border: "1px solid rgba(232,64,37,0.35)",
                background: "transparent",
                color: "#e84025",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              <X size={14} aria-hidden />
              {recusando ? "Confirmar Recusa" : "Recusar"}
            </button>
            <button
              type="button"
              onClick={() => void aprovar()}
              disabled={saving || recusando}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: "#22c55e",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: FONT.body,
                cursor: saving || recusando ? "not-allowed" : "pointer",
                opacity: saving || recusando ? 0.65 : 1,
              }}
            >
              <Check size={14} aria-hidden />
              {saving && !recusando ? "Aprovando…" : "Aprovar"}
            </button>
          </div>
        </div>
      ) : null}
    </ModalBase>
  );
}

export function ModalAprovarOs(props: {
  row: OrdemSaidaRow;
  contexto: OsModalContexto;
  estudioNomePorSlug: Record<string, string>;
  userName: string;
  onClose: () => void;
  onAtualizado: () => void;
}) {
  return (
    <ModalVerOs
      row={props.row}
      contexto={props.contexto}
      estudioNomePorSlug={props.estudioNomePorSlug}
      onClose={props.onClose}
      aprovacao={{ userName: props.userName, onAtualizado: props.onAtualizado }}
    />
  );
}
