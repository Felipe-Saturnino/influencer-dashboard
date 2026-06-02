import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2, ScanLine, XCircle } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { Operadora } from "../../../types";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import type {
  RhFigurinoCondition,
  RhFigurinoEmprestimo,
  RhFigurinoPeca,
  RhFigurinoStatusHist,
  RhWithdrawalType,
} from "./types";
import {
  CATEGORIAS,
  TAMANHOS,
  TIPOS_MANUTENCAO,
  labelStatusHistorico,
  labelStatusPeca,
  labelTipoRetirada,
  type RhFigurinoTipoManutencao,
} from "./figurinosConstants";
import {
  actorLabel,
  ctaButtonContent,
  emprestimoFigurinoEhDoProprioLogin,
  fmtDataHora,
  fmtDataSóDia,
  labelEmprestadoParaTabela,
  labelOperadorasPeca,
  normNomeParaFiltroPrestadorFig,
  pecaSlugsOperadoras,
  labelCondicaoPeca,
} from "./figurinosPageHelpers";
import { BlocoResumoPecaBasico } from "./BlocoResumoPecaBasico";
import { BarcodeBlock } from "./BarcodeBlock";

export function ModalManutencaoPeca({
  peca,
  resumoOperadoras,
  actor,
  onClose,
  onOk,
}: {
  peca: RhFigurinoPeca;
  resumoOperadoras: string;
  actor: string;
  onClose: () => void;
  onOk: () => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [tipo, setTipo] = useState<RhFigurinoTipoManutencao | "">("");
  const [motivo, setMotivo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const agoraIso = useMemo(() => new Date().toISOString(), []);

  const confirmar = async () => {
    setErr(null);
    if (!tipo) {
      setErr("Selecione o tipo.");
      return;
    }
    if (!motivo.trim()) {
      setErr("Informe o motivo.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("rh_figurino_enviar_manutencao", {
      p_item_id: peca.id,
      p_tipo: tipo,
      p_motivo: motivo.trim(),
      p_actor: actor,
    });
    setLoading(false);
    if (error) {
      console.error("[Figurinos] Erro ao enviar para manutenção:", error);
      setErr("Não foi possível enviar a peça para manutenção. Se o problema persistir, contate o suporte.");
      return;
    }
    await onOk();
  };

  return (
    <ModalBase onClose={onClose} maxWidth={500}>
      <ModalHeader title="Manutenção" onClose={onClose} />
      <BlocoResumoPecaBasico peca={peca} operadorasTexto={resumoOperadoras} t={t} />
      <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 10 }}>
        Tipo *
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as RhFigurinoTipoManutencao | "")}
          aria-label="Tipo"
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
      <p style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, margin: "0 0 10px", lineHeight: 1.45 }}>
        Costura ou Lavagem enviam a peça para manutenção. Perda ou Descarte alteram o status para descartada.
      </p>
      <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: 12 }}>
        Motivo *
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
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
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.textMuted,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
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
          {ctaButtonContent(loading, "Confirmar", "Salvando…")}
        </button>
      </div>
    </ModalBase>
  );
}
