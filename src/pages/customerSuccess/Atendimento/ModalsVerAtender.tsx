import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { FileText, History, Loader2 } from "lucide-react";
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
  CS_ATENDIMENTO_HISTORICO_LABEL,
  CS_ATENDIMENTO_ORIGEM_EMAIL,
  CS_ATENDIMENTO_STATUS_CORES,
  csAtuacaoExigeEmpresa,
  fmtDataChamado,
  labelStatusChamado,
  opcoesStatusAtender,
} from "../../../lib/csAtendimentoConstants";
import { assuntoEmail, solicitanteEmail } from "../../../lib/csAtendimentoTableColumns";
import type { CsChamadoHistoricoRow, CsChamadoRow, CsChamadoStatus } from "../../../types/csAtendimento";
import { CsChamadoEmailAnexosBloco } from "./CsChamadoEmailAnexosBloco";

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
  return `${row.protocolo} - ${row.nome_completo}`;
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
  const [aba, setAba] = useState<"dados" | "historico">("dados");

  useEffect(() => {
    if (open) setAba("dados");
  }, [open, row?.id]);

  if (!open || !row) return null;

  const tabs = ["dados", "historico"] as const;

  return (
    <ModalBase onClose={onClose} maxWidth={640}>
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
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, [...tabs], setAba, (k) => `tab-ver-chamado-${k}`)}
      >
        <FiltroBarTabButton
          id="tab-ver-chamado-dados"
          active={aba === "dados"}
          aria-controls="panel-ver-chamado-dados"
          onClick={() => setAba("dados")}
          icon={<FileText {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          {row.origem === CS_ATENDIMENTO_ORIGEM_EMAIL ? "Dados do E-mail" : "Dados do Chamado"}
        </FiltroBarTabButton>
        <FiltroBarTabButton
          id="tab-ver-chamado-historico"
          active={aba === "historico"}
          aria-controls="panel-ver-chamado-historico"
          onClick={() => setAba("historico")}
          icon={<History {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Histórico
        </FiltroBarTabButton>
      </div>

      <ModalTabPanel active={aba === "dados"} id="panel-ver-chamado-dados" labelledBy="tab-ver-chamado-dados">
        <div style={{ padding: "0 20px 20px" }}>{corpoDadosChamado(row, t)}</div>
      </ModalTabPanel>

      <ModalTabPanel active={aba === "historico"} id="panel-ver-chamado-historico" labelledBy="tab-ver-chamado-historico">
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
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Fechar
        </button>
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
    <ModalBase onClose={onClose} maxWidth={640} zIndex={1100}>
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
          onClick={onClose}
          disabled={saving}
          style={{
            padding: "10px 18px",
            border: "none",
            background: "transparent",
            color: t.textMuted,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 13,
            fontFamily: FONT.body,
          }}
        >
          Cancelar
        </button>
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
