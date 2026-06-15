import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { PipelineMarcaRow } from "./types";
import { parseDominioMarcaInput } from "./helpers";

export function ModalEditarDominio({
  marca,
  onClose,
  onSaved,
}: {
  marca: PipelineMarcaRow;
  onClose: () => void;
  onSaved: (marcaId: string, dominio: string | null) => Promise<boolean>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dominio, setDominio] = useState(marca.dominio ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

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

  async function salvar() {
    setErr(null);
    const parsed = parseDominioMarcaInput(dominio);
    if (parsed.error) {
      setErr(parsed.error);
      return;
    }
    setSalvando(true);
    const ok = await onSaved(marca.id, parsed.value);
    setSalvando(false);
    if (ok) onClose();
    else setErr("Não foi possível salvar o domínio. Se o problema persistir, entre em contato com o suporte.");
  }

  return (
    <ModalBase onClose={onClose} maxWidth={480} zIndex={1000}>
      <ModalHeader title={`Editar domínio — ${marca.nome}`} onClose={onClose} />
      <p
        style={{
          margin: "0 0 16px",
          fontSize: 13,
          color: t.textMuted,
          fontFamily: FONT.body,
          lineHeight: 1.45,
        }}
      >
        {marca.empresa.razao_social} · CNPJ {marca.empresa.cnpj}
      </p>

      {err ? (
        <div
          role="alert"
          aria-live="polite"
          style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
        >
          {err}
        </div>
      ) : null}

      <label style={{ display: "block", marginBottom: 16 }}>
        <span
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 600,
            color: t.textMuted,
            marginBottom: 6,
            fontFamily: FONT.body,
          }}
        >
          Domínio
        </span>
        <input
          ref={inputRef}
          type="url"
          inputMode="url"
          value={dominio}
          onChange={(e) => setDominio(e.target.value)}
          placeholder="https://marca.bet.br"
          aria-label="Domínio da marca"
          style={inputStyle}
        />
      </label>

      <p style={{ margin: "0 0 20px", fontSize: 11, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.45 }}>
        Ao alterar o domínio, o status volta para Inativo até a próxima validação automática.
      </p>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={salvando}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            fontSize: 13,
            fontWeight: 600,
            color: t.text,
            cursor: salvando ? "not-allowed" : "pointer",
            fontFamily: FONT.body,
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={salvando}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: getCtaCriarGradient(brand),
            fontSize: 13,
            fontWeight: 700,
            color: "#fff",
            cursor: salvando ? "not-allowed" : "pointer",
            fontFamily: FONT.body,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {salvando ? (
            <>
              <Loader2 size={14} className="app-lucide-spin" aria-hidden />
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
