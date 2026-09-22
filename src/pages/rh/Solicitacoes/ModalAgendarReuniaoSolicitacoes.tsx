import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import {
  agendarReuniaoSolicitacoes,
  type RhSolicitacaoAgendarReuniaoTipo,
} from "../../../lib/rhSolicitacoesAgendarReuniao";
import { diaIsoEhEstritamenteFuturo } from "../../../lib/rhCalendarioAcaoHelpers";

type Brand = ReturnType<typeof useDashboardBrand>;

type PrestadorOpt = { id: string; nome: string };

const ERRO_CARGA_PRESTADORES =
  "Não foi possível carregar os prestadores. Se o problema persistir, entre em contato com o suporte.";

export interface ModalAgendarReuniaoSolicitacoesProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  t: Theme;
  brand: Brand;
  /** `null` = sem recorte (Ver/Editar Sim). Lista de ids da cascata quando Próprios. */
  prestadorIdsPermitidos?: string[] | null;
}

export function ModalAgendarReuniaoSolicitacoes({
  open,
  onClose,
  onSaved,
  t,
  brand,
  prestadorIdsPermitidos = null,
}: ModalAgendarReuniaoSolicitacoesProps) {
  const [tipo, setTipo] = useState<RhSolicitacaoAgendarReuniaoTipo | "">("");
  const [prestadorId, setPrestadorId] = useState("");
  const [diaIso, setDiaIso] = useState("");
  const [observacao, setObservacao] = useState("");
  const [prestadores, setPrestadores] = useState<PrestadorOpt[]>([]);
  const [loadingPrest, setLoadingPrest] = useState(false);
  const [erroPrest, setErroPrest] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const carregarPrestadores = useCallback(async () => {
    setErroPrest(null);
    setLoadingPrest(true);
    try {
      if (prestadorIdsPermitidos) {
        const { data, error } = await supabase.rpc("rh_lideranca_prestadores", {
          p_funcionario_id: null,
        });
        if (error) throw error;
        const allow = new Set(prestadorIdsPermitidos);
        setPrestadores(
          ((data ?? []) as PrestadorOpt[])
            .filter((p) => allow.has(p.id))
            .map((p) => ({ id: p.id, nome: (p.nome ?? "").trim() || "—" }))
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
        );
      } else {
        const data = await fetchAllPages<PrestadorOpt>(async (from, to) =>
          supabase
            .from("rh_funcionarios")
            .select("id, nome")
            .in("status", ["ativo", "indisponivel"])
            .order("nome", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to),
        );
        setPrestadores(
          data.map((p) => ({ id: p.id, nome: (p.nome ?? "").trim() || "—" })),
        );
      }
    } catch (e) {
      console.error("[ModalAgendarReuniaoSolicitacoes]", e);
      setErroPrest(ERRO_CARGA_PRESTADORES);
      setPrestadores([]);
    }
    setLoadingPrest(false);
  }, [prestadorIdsPermitidos]);

  useEffect(() => {
    if (!open) return;
    setTipo("");
    setPrestadorId("");
    setDiaIso("");
    setObservacao("");
    setErr(null);
    setSaving(false);
    void carregarPrestadores();
  }, [open, carregarPrestadores]);

  if (!open) return null;

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

  async function confirmar() {
    setErr(null);
    if (!tipo) {
      setErr("Selecione o tipo de reunião.");
      return;
    }
    if (!prestadorId) {
      setErr("Selecione o prestador.");
      return;
    }
    if (!diaIso || !diaIsoEhEstritamenteFuturo(diaIso)) {
      setErr("A data da reunião deve ser um dia futuro.");
      return;
    }
    if (!observacao.trim()) {
      setErr("Informe a observação.");
      return;
    }
    setSaving(true);
    const res = await agendarReuniaoSolicitacoes({
      prestadorId,
      tipo,
      diaIso,
      observacao: observacao.trim(),
    });
    setSaving(false);
    if (!res.ok) {
      setErr("Não foi possível agendar a reunião. Se o problema persistir, entre em contato com o suporte.");
      return;
    }
    onSaved();
    onClose();
  }

  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <ModalBase onClose={onClose} maxWidth={520} zIndex={1100}>
      <ModalHeader title="Agendar Reunião" onClose={onClose} />
      <div style={{ padding: "0 20px 20px", fontFamily: FONT.body }}>
        {err ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginBottom: 12 }}>
            {err}
          </div>
        ) : null}

        {erroPrest ? (
          <div
            role="alert"
            style={{
              color: "#e84025",
              fontSize: 12,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span>{erroPrest}</span>
            <button
              type="button"
              onClick={() => void carregarPrestadores()}
              style={{
                fontFamily: FONT.body,
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid rgba(232,64,37,0.35)",
                background: "transparent",
                color: "#e84025",
                cursor: "pointer",
              }}
            >
              Tentar de novo
            </button>
          </div>
        ) : null}

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6 }}>
            Tipo de Reunião
            <CampoObrigatorioMark />
          </span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as RhSolicitacaoAgendarReuniaoTipo | "")}
            aria-label="Tipo de Reunião"
            aria-required
            style={inputStyle}
          >
            <option value="">Selecione…</option>
            <option value="reuniao_rh">Reunião com RH</option>
            <option value="reuniao_lideranca">Reunião com Liderança</option>
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6 }}>
            Prestador
            <CampoObrigatorioMark />
          </span>
          <select
            value={prestadorId}
            onChange={(e) => setPrestadorId(e.target.value)}
            aria-label="Prestador"
            aria-required
            disabled={loadingPrest || !!erroPrest}
            style={inputStyle}
          >
            <option value="">{loadingPrest ? "Carregando…" : erroPrest ? "Indisponível" : "Selecione…"}</option>
            {prestadores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6 }}>
            Data Solicitada
            <CampoObrigatorioMark />
          </span>
          <input
            type="date"
            value={diaIso}
            min={minDate}
            onChange={(e) => setDiaIso(e.target.value)}
            aria-label="Data Solicitada"
            aria-required
            style={inputStyle}
          />
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6 }}>
            Observação
            <CampoObrigatorioMark />
          </span>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={4}
            aria-label="Observação"
            aria-required
            placeholder="Descreva brevemente o intuito da ata"
            style={{ ...inputStyle, resize: "vertical", minHeight: 88 }}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={saving || loadingPrest || !!erroPrest}
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
                Agendando…
              </>
            ) : (
              "Agendar"
            )}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
