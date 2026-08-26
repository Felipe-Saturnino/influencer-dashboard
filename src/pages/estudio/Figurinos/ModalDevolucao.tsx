import { useMemo, useState } from "react"
import { CheckCircle2, Wrench, XCircle } from "lucide-react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { FONT } from "../../../constants/theme"
import { supabase } from "../../../lib/supabase"
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles"
import { type RhFigurinoEmprestimo, type RhFigurinoPeca } from "./types"
import { TIPOS_MANUTENCAO, labelTipoRetirada, type RhFigurinoTipoManutencao } from "./figurinosConstants"
import { ctaButtonContent, fmtDataHora } from "./figurinosPageHelpers"
import { BlocoResumoPecaBasico } from "./BlocoResumoPecaBasico"
import type { FluxoDevolucaoUi } from "./figurinosModalShared"

export function ModalDevolucao({
  peca,
  resumoEstudios,
  emprestimo,
  actor,
  onClose,
  onOk,
}: {
  peca: RhFigurinoPeca;
  resumoEstudios: string;
  emprestimo: RhFigurinoEmprestimo | undefined;
  actor: string;
  onClose: () => void;
  onOk: () => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [fluxo, setFluxo] = useState<FluxoDevolucaoUi | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [tipoManut, setTipoManut] = useState<RhFigurinoTipoManutencao | "">("");
  const [motivoManut, setMotivoManut] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const agoraIso = useMemo(() => new Date().toISOString(), []);

  const confirmar = async () => {
    setErr(null);
    if (!fluxo) {
      setErr("Selecione a condição da devolução.");
      return;
    }
    if (fluxo === "possivel_descarte" && !observacoes.trim()) {
      setErr("Informe a observação.");
      return;
    }
    if (fluxo === "manutencao") {
      if (!tipoManut || !motivoManut.trim()) {
        setErr("Informe o tipo e o motivo.");
        return;
      }
    }
    let pFluxo: string;
    if (fluxo === "boa") pFluxo = "disponivel_bom";
    else if (fluxo === "possivel_descarte") pFluxo = "disponivel_possivel_descarte";
    else pFluxo = "manutencao";

    setLoading(true);
    const { error } = await supabase.rpc("rh_figurino_registrar_devolucao", {
      p_item_id: peca.id,
      p_fluxo: pFluxo,
      p_observacoes: observacoes.trim(),
      p_manut_tipo: fluxo === "manutencao" ? tipoManut : "",
      p_manut_motivo: fluxo === "manutencao" ? motivoManut.trim() : "",
      p_actor: actor,
    });
    setLoading(false);
    if (error) {
      console.error("[Figurinos] Erro ao registrar devolução:", error);
      setErr("Não foi possível registrar a devolução. Se o problema persistir, entre em contato com o suporte.");
      return;
    }
    await onOk();
  };

  const opts: { key: FluxoDevolucaoUi; label: string; cor: string; Icon: typeof CheckCircle2 }[] = [
    { key: "boa", label: "Boa condição", cor: "#22c55e", Icon: CheckCircle2 },
    { key: "possivel_descarte", label: "Possível descarte", cor: "#f59e0b", Icon: Wrench },
    { key: "manutencao", label: "Manutenção", cor: "#a78bfa", Icon: XCircle },
  ];

  return (
    <ModalBase onClose={onClose} maxWidth={500}>
      <ModalHeader title="Devolução" onClose={onClose} />
      <BlocoResumoPecaBasico peca={peca} estudiosTexto={resumoEstudios} t={t} />
      {emprestimo ? (
        <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 12px" }}>
          Retirada ativa ({labelTipoRetirada(emprestimo.withdrawal_type)}):{" "}
          <strong style={{ color: t.text }}>{emprestimo.borrower_name}</strong> desde {fmtDataHora(emprestimo.loaned_at)}
        </p>
      ) : (
        <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 12px" }}>Dados do empréstimo não encontrados.</p>
      )}
      <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 8, fontFamily: FONT.body }}>Condição da devolução</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {opts.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={fluxo === o.key}
            onClick={() => setFluxo(o.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${fluxo === o.key ? o.cor : t.cardBorder}`,
              background: fluxo === o.key ? `${o.cor}18` : "transparent",
              color: fluxo === o.key ? o.cor : t.textMuted,
              fontWeight: fluxo === o.key ? 700 : 500,
              fontFamily: FONT.body,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <o.Icon size={16} aria-hidden />
            {o.label}
          </button>
        ))}
      </div>
      {fluxo === "boa" || fluxo === "possivel_descarte" ? (
        <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 12 }}>
          Observações
          {fluxo === "possivel_descarte" ? <CampoObrigatorioMark /> : null}
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg ?? t.cardBg,
              color: t.text,
              fontFamily: FONT.body,
              resize: "vertical",
            }}
          />
        </label>
      ) : null}
      {fluxo === "manutencao" ? (
        <>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 10 }}>
            Tipo *
            <select
              value={tipoManut}
              onChange={(e) => setTipoManut(e.target.value as RhFigurinoTipoManutencao | "")}
              aria-label="Tipo de manutenção ou destino"
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
              }}
            >
              <option value="">Selecione…</option>
              {TIPOS_MANUTENCAO.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 12 }}>
            Motivo *
            <textarea
              value={motivoManut}
              onChange={(e) => setMotivoManut(e.target.value)}
              rows={3}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontFamily: FONT.body,
                resize: "vertical",
              }}
            />
          </label>
        </>
      ) : null}
      <div
        style={{
          fontSize: 12,
          color: t.textMuted,
          marginBottom: 12,
          fontFamily: FONT.body,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px dashed ${t.cardBorder}`,
          background: t.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
        }}
      >
        Registrado por: <strong style={{ color: t.text }}>{actor}</strong>
        <br />
        Data/hora: <strong style={{ color: t.text }}>{fmtDataHora(agoraIso)}</strong>
      </div>
      {err ? (
        <div role="alert" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 10 }}>
          {err}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          type="button"
          disabled={loading}
          onClick={() => void confirmar()}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {ctaButtonContent(loading, "Confirmar devolução", "Salvando…")}
        </button>
      </div>
    </ModalBase>
  );
}
