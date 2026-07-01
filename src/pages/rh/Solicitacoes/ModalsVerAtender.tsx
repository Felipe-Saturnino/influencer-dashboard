import { useEffect, useState, type CSSProperties } from "react";
import { FileText, Loader2, Pencil } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../components/dashboard";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { urlAssinadaAtestadoPresencaCalendario } from "../../../lib/rhCalendarioPresencaAtestadoFiles";
import { supabase } from "../../../lib/supabase";
import type { RhSolicitacaoAbonoRemunerado, RhSolicitacaoStatus } from "../../../types/rhSolicitacao";
import {
  fmtDataSolicitacao,
  fmtDataCurta,
  fmtPeriodoAtestadoSolicitacao,
  labelAbonoRemunerado,
  labelStatusSolicitacao,
  labelTipoSolicitacao,
  RH_SOLICITACAO_ABONO_OPCOES,
  RH_SOLICITACAO_STATUS_CORES,
  RH_SOLICITACAO_STATUS_OPTIONS,
} from "../../../lib/rhSolicitacoesConstants";
import type { RhSolicitacaoRow } from "../../../types/rhSolicitacao";

type Brand = ReturnType<typeof useDashboardBrand>;

function unwrapEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

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

function LinhaAnexo({
  storagePath,
  fileName,
  t,
}: {
  storagePath: string | null | undefined;
  fileName: string | null | undefined;
  t: Theme;
}) {
  const [abrindo, setAbrindo] = useState(false);

  const label = fileName?.trim() || "Anexo";
  const temArquivo = Boolean(storagePath?.trim());

  async function abrirAnexo() {
    if (!storagePath?.trim() || abrindo) return;
    setAbrindo(true);
    const url = await urlAssinadaAtestadoPresencaCalendario(storagePath);
    setAbrindo(false);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

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
        Anexo
      </div>
      {temArquivo ? (
        <button
          type="button"
          onClick={() => void abrirAnexo()}
          disabled={abrindo}
          aria-label={`Abrir anexo ${label} em nova aba`}
          title={`Abrir anexo ${label} em nova aba`}
          style={{
            padding: 0,
            border: "none",
            background: "transparent",
            color: "var(--brand-primary, #7c3aed)",
            fontFamily: FONT.body,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "underline",
            cursor: abrindo ? "wait" : "pointer",
          }}
        >
          {abrindo ? "Carregando…" : label}
        </button>
      ) : (
        <div style={{ fontSize: 14, color: t.text, fontFamily: FONT.body }}>—</div>
      )}
    </div>
  );
}

function badgeStatus(status: RhSolicitacaoRow["status"]) {
  const cor = RH_SOLICITACAO_STATUS_CORES[status];
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
      {labelStatusSolicitacao(status)}
    </span>
  );
}

function nomeSolicitante(row: RhSolicitacaoRow): string {
  const s = unwrapEmbed(row.solicitante);
  return s?.nome?.trim() || "—";
}

function tituloVaga(row: RhSolicitacaoRow): string {
  const v = unwrapEmbed(row.vaga);
  return v?.titulo?.trim() || "—";
}

function turnoReuniaoRh(row: RhSolicitacaoRow): string {
  const acao = unwrapEmbed(row.calendario_acao);
  const turno = acao?.payload?.turno?.trim();
  return turno || "—";
}

function corpoDetalhes(row: RhSolicitacaoRow, t: Theme) {
  return (
    <>
      <LinhaInfo label="Data da solicitação" valor={fmtDataSolicitacao(row.created_at)} t={t} />
      <LinhaInfo label="Solicitante" valor={nomeSolicitante(row)} t={t} />
      <LinhaInfo label="Tipo de solicitação" valor={labelTipoSolicitacao(row.tipo)} t={t} />
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
          Status
        </div>
        {badgeStatus(row.status)}
      </div>
      {row.tipo === "reuniao_rh" ? (
        <>
          <LinhaInfo label="Data da reunião" valor={fmtDataCurta(row.reuniao_dia_iso)} t={t} />
          <LinhaInfo label="Turno" valor={turnoReuniaoRh(row)} t={t} />
          <LinhaInfo label="Motivo da reunião" valor={row.descricao.trim() || "—"} t={t} />
        </>
      ) : (
        <LinhaInfo label="Descrição" valor={row.descricao.trim() || "—"} t={t} />
      )}
      {row.tipo === "atestado" ? (
        <>
          <LinhaInfo
            label="Período do atestado"
            valor={fmtPeriodoAtestadoSolicitacao(row.atestado_inicio, row.atestado_fim)}
            t={t}
          />
          <LinhaAnexo storagePath={row.atestado_storage_path} fileName={row.atestado_file_name} t={t} />
        </>
      ) : null}
      {row.tipo === "vagas" ? <LinhaInfo label="Vaga" valor={tituloVaga(row)} t={t} /> : null}
      {row.observacao_rh?.trim() ? <LinhaInfo label="Observação do RH" valor={row.observacao_rh} t={t} /> : null}
      {row.status === "aprovado" && row.tipo === "atestado" && row.abono_remunerado ? (
        <LinhaInfo label="Abono remunerado?" valor={labelAbonoRemunerado(row.abono_remunerado)} t={t} />
      ) : null}
      {row.atendido_em ? <LinhaInfo label="Atendida em" valor={fmtDataSolicitacao(row.atendido_em)} t={t} /> : null}
    </>
  );
}

export interface ModalVerSolicitacaoProps {
  open: boolean;
  onClose: () => void;
  row: RhSolicitacaoRow | null;
  t: Theme;
}

export function ModalVerSolicitacao({ open, onClose, row, t }: ModalVerSolicitacaoProps) {
  if (!open || !row) return null;

  return (
    <ModalBase onClose={onClose} maxWidth={560}>
      <ModalHeader title="Ver solicitação" onClose={onClose} />
      <div style={{ padding: "0 20px 20px" }}>{corpoDetalhes(row, t)}</div>
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

export interface ModalAtenderSolicitacaoProps {
  open: boolean;
  onClose: () => void;
  row: RhSolicitacaoRow | null;
  t: Theme;
  brand: Brand;
  onSaved: () => void;
}

export function ModalAtenderSolicitacao({ open, onClose, row, t, brand, onSaved }: ModalAtenderSolicitacaoProps) {
  const [aba, setAba] = useState<"dados" | "atendimento">("dados");
  const [statusDraft, setStatusDraft] = useState<RhSolicitacaoStatus>("em_analise");
  const [observacao, setObservacao] = useState("");
  const [abonoRemunerado, setAbonoRemunerado] = useState<RhSolicitacaoAbonoRemunerado | "">("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open && row) {
      setAba("dados");
      setStatusDraft(row.status);
      setObservacao(row.observacao_rh ?? "");
      setAbonoRemunerado(row.abono_remunerado ?? "");
      setErr(null);
    }
  }, [open, row]);

  if (!open || !row) return null;

  const tabs = ["dados", "atendimento"] as const;
  const statusAlterado = statusDraft !== row.status;
  const statusAprovado = statusDraft === "aprovado";

  async function salvar() {
    if (!row) return;
    setErr(null);
    if (statusAlterado && !observacao.trim()) {
      setErr("Informe a observação do RH ao alterar o status.");
      return;
    }
    if (statusAprovado && row.tipo === "atestado" && !abonoRemunerado) {
      setErr("Informe se há abono remunerado.");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    const { error } = await supabase
      .from("rh_solicitacoes")
      .update({
        status: statusDraft,
        observacao_rh: observacao.trim() || null,
        motivo_rejeicao: null,
        abono_remunerado: statusAprovado && row.tipo === "atestado" ? abonoRemunerado : null,
        atendido_em: new Date().toISOString(),
        atendido_por: uid,
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      setErr("Não foi possível salvar o atendimento. Se o problema persistir, entre em contato com o suporte.");
      console.error("[ModalAtenderSolicitacao]", error);
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
    <ModalBase onClose={onClose} maxWidth={560} zIndex={1100}>
      <ModalHeader title="Atender solicitação" onClose={onClose} />
      <div
        role="tablist"
        aria-label="Seções do atendimento"
        style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, padding: "0 20px 12px" }}
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, [...tabs], setAba, (k) => `tab-atender-sol-${k}`)}
      >
        <FiltroBarTabButton
          id="tab-atender-sol-dados"
          active={aba === "dados"}
          aria-controls="panel-atender-sol-dados"
          onClick={() => setAba("dados")}
          icon={<FileText {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Dados
        </FiltroBarTabButton>
        <FiltroBarTabButton
          id="tab-atender-sol-atendimento"
          active={aba === "atendimento"}
          aria-controls="panel-atender-sol-atendimento"
          onClick={() => setAba("atendimento")}
          icon={<Pencil {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Atendimento
        </FiltroBarTabButton>
      </div>

      {err ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, margin: "0 20px 12px" }}>
          {err}
        </div>
      ) : null}

      <ModalTabPanel active={aba === "dados"} id="panel-atender-sol-dados" labelledBy="tab-atender-sol-dados">
        <div style={{ padding: "0 20px 20px" }}>{corpoDetalhes(row, t)}</div>
      </ModalTabPanel>

      <ModalTabPanel active={aba === "atendimento"} id="panel-atender-sol-atendimento" labelledBy="tab-atender-sol-atendimento">
        <div style={{ padding: "0 20px 20px" }}>
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
              Status
            </span>
            <select
              value={statusDraft}
              onChange={(e) => {
                const next = e.target.value as RhSolicitacaoStatus;
                setStatusDraft(next);
                if (next !== "aprovado") setAbonoRemunerado("");
              }}
              aria-label="Status da solicitação"
              style={inputStyle}
            >
              {RH_SOLICITACAO_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {statusAprovado && row.tipo === "atestado" ? (
            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
                Abono remunerado?
                <CampoObrigatorioMark />
              </span>
              <select
                value={abonoRemunerado}
                onChange={(e) => setAbonoRemunerado(e.target.value as RhSolicitacaoAbonoRemunerado | "")}
                aria-label="Abono remunerado"
                aria-required
                style={inputStyle}
              >
                <option value="">Selecione…</option>
                {RH_SOLICITACAO_ABONO_OPCOES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
              Observação do RH
              {statusAlterado ? <CampoObrigatorioMark /> : null}
            </span>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={4}
              aria-label="Observação do RH"
              aria-required={statusAlterado}
              style={{ ...inputStyle, resize: "vertical", minHeight: 88 }}
            />
          </label>
        </div>
      </ModalTabPanel>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "0 20px 20px" }}>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={saving}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden />
              Salvando…
            </>
          ) : (
            "Salvar"
          )}
        </button>
      </div>
    </ModalBase>
  );
}
