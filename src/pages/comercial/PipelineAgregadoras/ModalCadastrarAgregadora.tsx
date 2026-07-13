import { useEffect, useId, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { ComercialOpcao } from "./types";
import { normalizeAgregadoraSite } from "./helpers";

export function ModalCadastrarAgregadora({
  onClose,
  onCreated,
  comerciais,
  canCriar,
}: {
  onClose: () => void;
  onCreated: (payload: {
    nome: string;
    site: string;
    jogos: number | null;
    comercial_user_id: string;
  }) => Promise<string | null>;
  comerciais: ComercialOpcao[];
  canCriar: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const formId = useId();
  const [nome, setNome] = useState("");
  const [site, setSite] = useState("");
  const [jogos, setJogos] = useState("");
  const [comercialId, setComercialId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const comerciaisComId = comerciais.filter((c): c is ComercialOpcao & { id: string } => !!c.id);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.getElementById(`${formId}-nome`)?.focus();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [formId]);

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: 12,
    fontWeight: 600,
    color: t.text,
    marginBottom: 6,
    fontFamily: FONT.body,
  };

  async function salvar() {
    if (!canCriar) return;
    const nomeTrim = nome.trim();
    const siteNorm = normalizeAgregadoraSite(site);
    if (!nomeTrim) {
      setErr("Informe o nome da agregadora.");
      return;
    }
    if (!siteNorm) {
      setErr("Informe o site da agregadora.");
      return;
    }
    if (!comercialId) {
      setErr("Selecione o comercial responsável.");
      return;
    }

    let jogosVal: number | null = null;
    if (jogos.trim()) {
      const n = Number(jogos.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        setErr("Informe a quantidade de jogos como número inteiro.");
        return;
      }
      jogosVal = n;
    }

    setSalvando(true);
    setErr(null);
    const errorMsg = await onCreated({
      nome: nomeTrim,
      site: siteNorm,
      jogos: jogosVal,
      comercial_user_id: comercialId,
    });
    setSalvando(false);
    if (errorMsg) {
      setErr(errorMsg);
      return;
    }
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={480} zIndex={1000}>
      <ModalHeader title="Cadastrar agregadora" onClose={onClose} />
      {err ? (
        <div
          role="alert"
          aria-live="polite"
          style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
        >
          {err}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label htmlFor={`${formId}-nome`} style={labelStyle}>
            Nome
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${formId}-nome`}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={inputStyle}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor={`${formId}-site`} style={labelStyle}>
            Site
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${formId}-site`}
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="https://exemplo.com"
            style={inputStyle}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor={`${formId}-jogos`} style={labelStyle}>
            Jogos
          </label>
          <input
            id={`${formId}-jogos`}
            value={jogos}
            onChange={(e) => setJogos(e.target.value)}
            inputMode="numeric"
            placeholder="Ex.: 12000"
            style={inputStyle}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor={`${formId}-comercial`} style={labelStyle}>
            Comercial
            <CampoObrigatorioMark />
          </label>
          <select
            id={`${formId}-comercial`}
            value={comercialId}
            onChange={(e) => setComercialId(e.target.value)}
            style={inputStyle}
            aria-label="Comercial"
          >
            <option value="">Selecione…</option>
            {comerciaisComId.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 20,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={salvando || !canCriar}
          onClick={() => void salvar()}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: salvando || !canCriar ? "not-allowed" : "pointer",
            opacity: salvando || !canCriar ? 0.7 : 1,
          }}
        >
          {salvando ? "Salvando…" : "Cadastrar"}
        </button>
      </div>
    </ModalBase>
  );
}
