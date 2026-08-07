import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { FileText, History, Loader2, MessageCircle } from "lucide-react";
import { ModalBase } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../components/dashboard";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { supabase } from "../../../lib/supabase";
import {
  CS_ATENDIMENTO_ATUACAO_LABEL,
  CS_ATENDIMENTO_CONTA_INSTAGRAM,
  CS_ATENDIMENTO_HISTORICO_LABEL,
  CS_ATENDIMENTO_INSTAGRAM_POST_TIPO_LABEL,
  CS_ATENDIMENTO_ORIGEM_EMAIL,
  CS_ATENDIMENTO_ORIGEM_INSTAGRAM_COMENTARIO,
  CS_ATENDIMENTO_ORIGEM_INSTAGRAM_DM,
  CS_ATENDIMENTO_STATUS_CORES,
  csAtuacaoExigeEmpresa,
  fmtDataChamado,
  isCsChamadoOrigemInstagram,
  labelStatusChamado,
  opcoesStatusAtender,
} from "../../../lib/csAtendimentoConstants";
import { assuntoEmail, solicitanteEmail, solicitanteInstagram } from "../../../lib/csAtendimentoTableColumns";
import { carregarMensagensChamado, unwrapCsEmbed } from "../../../lib/csAtendimentoHelpers";
import type { CsChamadoHistoricoRow, CsChamadoMensagemRow, CsChamadoRow, CsChamadoStatus } from "../../../types/csAtendimento";
import { CsChamadoEmailAnexosBloco } from "./CsChamadoEmailAnexosBloco";
import { CsChamadoInstagramComposerBloco } from "./CsChamadoInstagramComposerBloco";
import { CsChamadoInstagramThreadBloco } from "./CsChamadoInstagramThreadBloco";

type Brand = ReturnType<typeof useDashboardBrand>;

function LinhaInfo({ label, valor, t }: { label: string; valor: string; t: Theme }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: t.textMuted,
          textTransform: "uppercase",
          marginBottom: 4,
          fontFamily: FONT.body,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, color: t.text, lineHeight: 1.45, whiteSpace: "pre-wrap", fontFamily: FONT.body }}>{valor}</div>
    </div>
  );
}

function badgeStatus(status: CsChamadoRow["status"]) {
  const cor = CS_ATENDIMENTO_STATUS_CORES[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 20,
        background: `${cor}22`,
        color: cor,
        border: `1px solid ${cor}44`,
        whiteSpace: "nowrap",
      }}
    >
      {labelStatusChamado(status)}
    </span>
  );
}

function tituloModal(row: CsChamadoRow): string {
  if (row.origem === CS_ATENDIMENTO_ORIGEM_EMAIL) {
    return `${row.protocolo} - ${assuntoEmail(row)}`;
  }
  if (isCsChamadoOrigemInstagram(row.origem)) {
    return `${row.protocolo} - ${solicitanteInstagram(row)}`;
  }
  return `${row.protocolo} - ${row.nome_completo}`;
}

function nomeAtendenteModal(row: CsChamadoRow): string {
  return unwrapCsEmbed(row.atendente)?.name?.trim() || "—";
}

function corpoDadosChamadoSite(row: CsChamadoRow, t: Theme) {
  const exibirEmpresa = csAtuacaoExigeEmpresa(row.atuacao);
  return (
    <>
      <LinhaInfo label="Nome Completo" valor={row.nome_completo} t={t} />
      <LinhaInfo label="Número do Telefone" valor={row.telefone?.trim() || "—"} t={t} />
      <LinhaInfo label="E-mail" valor={row.email} t={t} />
      <LinhaInfo label="Atuação" valor={CS_ATENDIMENTO_ATUACAO_LABEL[row.atuacao]} t={t} />
      {exibirEmpresa ? <LinhaInfo label="Empresa" valor={row.empresa?.trim() || "—"} t={t} /> : null}
      <LinhaInfo label="Mensagem" valor={row.mensagem.trim() || "—"} t={t} />
    </>
  );
}

function corpoDadosChamadoEmail(row: CsChamadoRow, t: Theme) {
  return (
    <>
      <LinhaInfo label="Remetente" valor={solicitanteEmail(row)} t={t} />
      <LinhaInfo label="Assunto" valor={assuntoEmail(row)} t={t} />
      <LinhaInfo label="Data de Recebimento" valor={fmtDataChamado(row.created_at)} t={t} />
      <LinhaInfo label="Corpo do E-mail" valor={row.mensagem.trim() || "—"} t={t} />
      <CsChamadoEmailAnexosBloco anexos={row.anexos} t={t} />
    </>
  );
}

function corpoDadosChamado(row: CsChamadoRow, t: Theme) {
  if (row.origem === CS_ATENDIMENTO_ORIGEM_EMAIL) {
    return corpoDadosChamadoEmail(row, t);
  }
  return corpoDadosChamadoSite(row, t);
}

function labelPostTipo(tipo: string | null | undefined): string {
  if (!tipo?.trim()) return "—";
  return CS_ATENDIMENTO_INSTAGRAM_POST_TIPO_LABEL[tipo] ?? tipo;
}

function corpoVerInstagramDm(row: CsChamadoRow, t: Theme, mensagens: CsChamadoMensagemRow[], loadingMensagens: boolean) {
  return (
    <>
      <LinhaInfo label="Instagram" valor={solicitanteInstagram(row)} t={t} />
      <LinhaInfo label="Conta Spin" valor={CS_ATENDIMENTO_CONTA_INSTAGRAM} t={t} />
      <LinhaInfo label="Data de abertura" valor={fmtDataChamado(row.created_at)} t={t} />
      <LinhaInfo label="Atendente" valor={nomeAtendenteModal(row)} t={t} />
      <LinhaInfo label="Última mensagem do usuário" valor={fmtDataChamado(row.ultima_mensagem_usuario_em)} t={t} />
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: t.textMuted,
          textTransform: "uppercase",
          margin: "16px 0 8px",
          fontFamily: FONT.body,
        }}
      >
        Conversa
      </div>
      <CsChamadoInstagramThreadBloco mensagens={mensagens} loading={loadingMensagens} t={t} />
      <CsChamadoInstagramComposerBloco variant="dm" t={t} />
    </>
  );
}

function corpoVerInstagramComentario(row: CsChamadoRow, t: Theme) {
  const caption = row.instagram_post_caption?.trim() || "—";
  return (
    <>
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg,
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>Post</div>
        <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
          {labelPostTipo(row.instagram_post_tipo)} · {CS_ATENDIMENTO_CONTA_INSTAGRAM}
        </div>
        <div style={{ fontSize: 13, color: t.text, lineHeight: 1.45, whiteSpace: "pre-wrap", fontFamily: FONT.body }}>{caption}</div>
      </div>
      <LinhaInfo label="Solicitante" valor={solicitanteInstagram(row)} t={t} />
      <LinhaInfo label="Data de abertura" valor={fmtDataChamado(row.created_at)} t={t} />
      <LinhaInfo label="Comentário" valor={row.mensagem.trim() || "—"} t={t} />
      <CsChamadoInstagramComposerBloco variant="comentario" t={t} />
    </>
  );
}

function BlocoHistorico({ item, t }: { item: CsChamadoHistoricoRow; t: Theme }) {
  const label = CS_ATENDIMENTO_HISTORICO_LABEL[item.tipo_acao] ?? item.tipo_acao;
  const usuario = item.tipo_acao === "abertura" ? item.usuario_nome : item.usuario_nome?.trim() || "—";

  return (
    <div style={{ padding: "14px 0", borderBottom: `1px solid ${t.cardBorder}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
        {label} — {fmtDataChamado(item.created_at)}
      </div>
      <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>{usuario}</div>
      {item.anotacao?.trim() ? (
        <div
          style={{
            fontSize: 13,
            color: t.text,
            marginTop: 8,
            padding: "10px 12px",
            background: t.inputBg,
            borderRadius: 8,
            border: `1px solid ${t.cardBorder}`,
            whiteSpace: "pre-wrap",
            fontFamily: FONT.body,
          }}
        >
          {item.anotacao}
        </div>
      ) : null}
    </div>
  );
}

export interface ModalVerChamadoProps {
  open: boolean;
  onClose: () => void;
  row: CsChamadoRow | null;
  historico: CsChamadoHistoricoRow[];
  loadingHistorico: boolean;
  t: Theme;
}

export function ModalVerChamado({ open, onClose, row, historico, loadingHistorico, t }: ModalVerChamadoProps) {
  const isDm = row?.origem === CS_ATENDIMENTO_ORIGEM_INSTAGRAM_DM;
  const isComent = row?.origem === CS_ATENDIMENTO_ORIGEM_INSTAGRAM_COMENTARIO;
  const isInstagram = isCsChamadoOrigemInstagram(row?.origem ?? CS_ATENDIMENTO_ORIGEM_EMAIL);

  const [aba, setAba] = useState<"dados" | "historico" | "conversa" | "comentario">("dados");
  const [mensagens, setMensagens] = useState<CsChamadoMensagemRow[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    if (isDm) setAba("conversa");
    else if (isComent) setAba("comentario");
    else setAba("dados");
  }, [open, row, isDm, isComent]);

  useEffect(() => {
    if (!open || !row || !isDm) {
      setMensagens([]);
      return;
    }
    setLoadingMensagens(true);
    void carregarMensagensChamado(row.id).then((rows) => {
      setMensagens(rows);
      setLoadingMensagens(false);
    });
  }, [open, row, isDm]);

  if (!open || !row) return null;

  const tabs = isDm
    ? (["conversa", "historico"] as const)
    : isComent
      ? (["comentario", "historico"] as const)
      : (["dados", "historico"] as const);

  const abaAtiva = isInstagram ? (aba === "historico" ? "historico" : isDm ? "conversa" : "comentario") : aba;

  return (
    <ModalBase onClose={onClose} maxWidth={isInstagram ? 720 : 640}>
      <div style={{ padding: "16px 20px 0", borderBottom: `1px solid ${t.cardBorder}` }}>
        <h2
          id="modal-ver-chamado-title"
          style={{
            fontFamily: FONT.body,
            fontSize: 16,
            fontWeight: 800,
            color: t.text,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {tituloModal(row)}
        </h2>
        <div style={{ marginTop: 6, marginBottom: 12 }}>{badgeStatus(row.status)}</div>
      </div>

      <div
        role="tablist"
        aria-label="Seções do chamado"
        style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, padding: "12px 20px 0" }}
        onKeyDown={(e) =>
          onFiltroBarTabsKeyDown(e, [...tabs], (k) => setAba(k as typeof aba), (k) => `tab-ver-chamado-${k}`)
        }
      >
        {isDm ? (
          <FiltroBarTabButton
            id="tab-ver-chamado-conversa"
            active={abaAtiva === "conversa"}
            aria-controls="panel-ver-chamado-conversa"
            onClick={() => setAba("conversa")}
            icon={<MessageCircle {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Conversa
          </FiltroBarTabButton>
        ) : isComent ? (
          <FiltroBarTabButton
            id="tab-ver-chamado-comentario"
            active={abaAtiva === "comentario"}
            aria-controls="panel-ver-chamado-comentario"
            onClick={() => setAba("comentario")}
            icon={<MessageCircle {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Comentário
          </FiltroBarTabButton>
        ) : (
          <FiltroBarTabButton
            id="tab-ver-chamado-dados"
            active={abaAtiva === "dados"}
            aria-controls="panel-ver-chamado-dados"
            onClick={() => setAba("dados")}
            icon={<FileText {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            {row.origem === CS_ATENDIMENTO_ORIGEM_EMAIL ? "Dados do E-mail" : "Dados do Chamado"}
          </FiltroBarTabButton>
        )}
        <FiltroBarTabButton
          id="tab-ver-chamado-historico"
          active={abaAtiva === "historico"}
          aria-controls="panel-ver-chamado-historico"
          onClick={() => setAba("historico")}
          icon={<History {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Histórico interno
        </FiltroBarTabButton>
      </div>

      {isDm ? (
        <ModalTabPanel active={abaAtiva === "conversa"} id="panel-ver-chamado-conversa" labelledBy="tab-ver-chamado-conversa">
          <div style={{ padding: "0 20px 20px" }}>{corpoVerInstagramDm(row, t, mensagens, loadingMensagens)}</div>
        </ModalTabPanel>
      ) : isComent ? (
        <ModalTabPanel active={abaAtiva === "comentario"} id="panel-ver-chamado-comentario" labelledBy="tab-ver-chamado-comentario">
          <div style={{ padding: "0 20px 20px" }}>{corpoVerInstagramComentario(row, t)}</div>
        </ModalTabPanel>
      ) : (
        <ModalTabPanel active={abaAtiva === "dados"} id="panel-ver-chamado-dados" labelledBy="tab-ver-chamado-dados">
          <div style={{ padding: "0 20px 20px" }}>{corpoDadosChamado(row, t)}</div>
        </ModalTabPanel>
      )}

      <ModalTabPanel active={abaAtiva === "historico"} id="panel-ver-chamado-historico" labelledBy="tab-ver-chamado-historico">
        <div style={{ padding: "0 20px 20px" }}>
          {loadingHistorico ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
              <Loader2 className="app-lucide-spin" size={20} color="var(--brand-primary, #7c3aed)" aria-hidden />
              <div style={{ fontSize: 13, marginTop: 8 }}>Carregando…</div>
            </div>
          ) : historico.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Nenhum registro no histórico.
            </div>
          ) : (
            historico.map((h) => <BlocoHistorico key={h.id} item={h} t={t} />)
          )}
        </div>
      </ModalTabPanel>

      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 20px 20px" }}>
        
      </div>
    </ModalBase>
  );
}

export interface ModalAtenderChamadoProps {
  open: boolean;
  onClose: () => void;
  row: CsChamadoRow | null;
  historico: CsChamadoHistoricoRow[];
  loadingHistorico: boolean;
  t: Theme;
  brand: Brand;
  onSaved: () => void;
}

export function ModalAtenderChamado({
  open,
  onClose,
  row,
  historico,
  loadingHistorico,
  t,
  brand,
  onSaved,
}: ModalAtenderChamadoProps) {
  const [statusDraft, setStatusDraft] = useState<CsChamadoStatus>("em_andamento");
  const [anotacao, setAnotacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const opcoesStatus = useMemo(() => (row ? opcoesStatusAtender(row.status) : []), [row]);

  const anotacoesHistorico = useMemo(
    () =>
      historico.filter(
        (h) => h.tipo_acao === "anotacao" || h.tipo_acao === "inicio_atendimento" || h.tipo_acao === "arquivamento",
      ),
    [historico],
  );

  useEffect(() => {
    if (open && row) {
      const opts = opcoesStatusAtender(row.status);
      setStatusDraft((opts[0]?.value as CsChamadoStatus) ?? row.status);
      setAnotacao("");
      setErr(null);
    }
  }, [open, row]);

  if (!open || !row) return null;

  const statusAlterado = statusDraft !== row.status;
  const isInstagram = isCsChamadoOrigemInstagram(row.origem);

  async function salvar() {
    if (!row) return;
    setErr(null);
    if (statusAlterado && !anotacao.trim()) {
      setErr("Informe uma anotação ao alterar o status do chamado.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("cs_chamado_atender", {
      p_chamado_id: row.id,
      p_status_novo: statusDraft,
      p_anotacao: anotacao.trim(),
    });
    setSaving(false);
    if (error) {
      const msg = error.message?.includes("anotação")
        ? "Informe uma anotação ao alterar o status do chamado."
        : "Não foi possível salvar o atendimento. Se o problema persistir, entre em contato com o suporte.";
      setErr(msg);
      console.error("[ModalAtenderChamado]", error);
      return;
    }
    onSaved();
    onClose();
  }

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 13,
    boxSizing: "border-box",
  };

  return (
    <ModalBase onClose={onClose} maxWidth={isInstagram ? 720 : 640} zIndex={1100}>
      <div style={{ padding: "16px 20px 0", borderBottom: `1px solid ${t.cardBorder}` }}>
        <h2
          id="modal-atender-chamado-title"
          style={{
            fontFamily: FONT.body,
            fontSize: 16,
            fontWeight: 800,
            color: t.text,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {tituloModal(row)}
        </h2>
        <div style={{ marginTop: 6, marginBottom: 12 }}>{badgeStatus(row.status)}</div>
      </div>

      {err ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, margin: "12px 20px 0" }}>
          {err}
        </div>
      ) : null}

      <div style={{ padding: "16px 20px 20px" }}>
        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
            Status
          </span>
          <select
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value as CsChamadoStatus)}
            aria-label="Status do chamado"
            style={inputStyle}
          >
            {opcoesStatus.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
            Nova anotação
          </span>
          <textarea
            value={anotacao}
            onChange={(e) => setAnotacao(e.target.value)}
            aria-label="Nova anotação"
            placeholder="Descreva o que foi feito neste atendimento..."
            style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
          />
        </label>

        {isInstagram ? <CsChamadoInstagramComposerBloco variant="atender" t={t} /> : null}

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: t.textMuted,
            margin: "18px 0 10px",
            fontFamily: FONT.body,
          }}
        >
          Histórico de Anotações
        </div>

        {loadingHistorico ? (
          <div style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Carregando…</div>
        ) : anotacoesHistorico.length === 0 ? (
          <div style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Nenhuma anotação registrada.</div>
        ) : (
          anotacoesHistorico.map((h) => (
            <div key={h.id} style={{ padding: "10px 0", borderBottom: `1px solid ${t.cardBorder}` }}>
              <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
                {fmtDataChamado(h.created_at)} — {h.usuario_nome}
              </div>
              {h.anotacao?.trim() ? (
                <div style={{ fontSize: 13, color: t.text, marginTop: 4, fontFamily: FONT.body, whiteSpace: "pre-wrap" }}>
                  {h.anotacao}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "0 20px 20px" }}>
        
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={saving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 700,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden />
              Salvando…
            </>
          ) : (
            "Salvar alterações"
          )}
        </button>
      </div>
    </ModalBase>
  );
}
