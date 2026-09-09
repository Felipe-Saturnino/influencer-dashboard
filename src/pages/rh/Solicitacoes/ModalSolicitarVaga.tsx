import { useEffect, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { CampoOrganogramaVaga } from "../../../components/rh/vagas/CampoOrganogramaVaga";
import { FONT } from "../../../constants/theme";
import type { Theme } from "../../../constants/theme";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { carregarOpcoesTimesOrganograma } from "../../../lib/rhOrganogramaFetch";
import {
  orgVinculoDeOpcao,
  orgVinculoTemSelecao,
  orgVinculoVazio,
  type RhVagaOrgVinculo,
} from "../../../lib/rhVagaOrganograma";
import { buscarRhFuncionarioAtivoPorEmailLogin } from "../../../lib/rhFuncionarioLoginMatch";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import type { RhOrgOrganogramaGrupoPrestador } from "../../../types/rhOrganograma";

type Brand = ReturnType<typeof useDashboardBrand>;

/** Soma ~15 dias úteis (seg–sex) a partir de hoje — hint de data de entrada. */
function sugerirDataEntrada15DiasUteis(): string {
  const d = new Date();
  let added = 0;
  while (added < 15) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) added += 1;
  }
  return d.toISOString().slice(0, 10);
}

export interface ModalSolicitarVagaProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  t: Theme;
  brand: Brand;
}

export function ModalSolicitarVaga({ open, onClose, onSaved, t, brand }: ModalSolicitarVagaProps) {
  const { user } = useApp();
  const [orgVinculo, setOrgVinculo] = useState<RhVagaOrgVinculo>(orgVinculoVazio());
  const [dataEntrada, setDataEntrada] = useState("");
  const [observacao, setObservacao] = useState("");
  const [grupos, setGrupos] = useState<RhOrgOrganogramaGrupoPrestador[]>([]);
  const [carregandoOrg, setCarregandoOrg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setOrgVinculo(orgVinculoVazio());
    setDataEntrada(sugerirDataEntrada15DiasUteis());
    setObservacao("");
    setErr(null);
    setSaving(false);
    setCarregandoOrg(true);
    void carregarOpcoesTimesOrganograma().then(({ grupos: g, error }) => {
      setCarregandoOrg(false);
      if (error) {
        console.error("[ModalSolicitarVaga]", error);
        setGrupos([]);
        return;
      }
      setGrupos(g);
    });
  }, [open]);

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
    if (!orgVinculoTemSelecao(orgVinculo)) {
      setErr("Selecione o organograma.");
      return;
    }
    if (!dataEntrada.trim()) {
      setErr("Informe a data de entrada.");
      return;
    }
    if (!observacao.trim()) {
      setErr("Informe a observação.");
      return;
    }
    const email = user?.email?.trim();
    if (!email) {
      setErr("Não foi possível identificar o seu cadastro. Se o problema persistir, entre em contato com o suporte.");
      return;
    }
    setSaving(true);
    const func = await buscarRhFuncionarioAtivoPorEmailLogin(email);
    if (!func?.id) {
      setSaving(false);
      setErr("Não foi possível identificar o seu cadastro de prestador. Se o problema persistir, entre em contato com o suporte.");
      return;
    }

    const orgLabel =
      grupos
        .flatMap((g) => g.vinculos)
        .find((v) => {
          const ov = orgVinculoDeOpcao(v);
          return (
            ov.org_time_id === orgVinculo.org_time_id &&
            ov.org_gerencia_id === orgVinculo.org_gerencia_id &&
            ov.org_diretoria_id === orgVinculo.org_diretoria_id
          );
        })?.label ?? "Organograma";

    const descricao = [
      observacao.trim(),
      "",
      `Organograma: ${orgLabel}`,
      `Data de entrada sugerida: ${dataEntrada.slice(0, 10)}`,
    ].join("\n");

    const { error } = await supabase.from("rh_solicitacoes").insert({
      rh_funcionario_id: func.id,
      tipo: "vagas",
      status: "em_analise",
      descricao,
      rh_vaga_id: null,
    });
    setSaving(false);
    if (error) {
      console.error("[ModalSolicitarVaga]", error);
      setErr("Não foi possível solicitar a vaga. Se o problema persistir, entre em contato com o suporte.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={520} zIndex={1100}>
      <ModalHeader title="Solicitar Vaga" onClose={onClose} />
      <div style={{ padding: "0 20px 20px", fontFamily: FONT.body }}>
        {err ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginBottom: 12 }}>
            {err}
          </div>
        ) : null}

        {carregandoOrg ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: t.textMuted, fontSize: 13 }}>
            <Loader2 size={16} className="app-lucide-spin" aria-hidden />
            Carregando organograma…
          </div>
        ) : null}

        <CampoOrganogramaVaga
          id="sv-org"
          value={orgVinculo}
          onChange={setOrgVinculo}
          grupos={grupos}
          disabled={carregandoOrg || grupos.length === 0}
          style={inputStyle}
          t={t}
        />

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: t.textMuted, marginBottom: 6 }}>
            Data de Entrada
            <CampoObrigatorioMark />
          </span>
          <input
            type="date"
            value={dataEntrada}
            onChange={(e) => setDataEntrada(e.target.value)}
            aria-label="Data de Entrada"
            aria-required
            style={inputStyle}
          />
          <span style={{ display: "block", fontSize: 11, color: t.textMuted, marginTop: 6 }}>
            Sugestão: cerca de 15 dias úteis a partir de hoje (ajustável).
          </span>
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
            placeholder="Descreva a necessidade da vaga"
            style={{ ...inputStyle, resize: "vertical", minHeight: 88 }}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={saving || carregandoOrg}
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
                Solicitando…
              </>
            ) : (
              "Solicitar"
            )}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
