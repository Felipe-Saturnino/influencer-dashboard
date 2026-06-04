import { useEffect, useState } from "react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { FONT } from "../../../constants/theme"
import { supabase } from "../../../lib/supabase"
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles"
import type { Operadora } from "../../../types"
import { type RhFigurinoPeca } from "./types"
import { CATEGORIAS, TAMANHOS } from "./figurinosConstants"
import { ctaButtonContent } from "./figurinosPageHelpers"

export function ModalCadastroPeca({
  onClose,
  operadoras,
  podeVerOperadora,
  operadoraSlugsForcado,
  actor,
  onCreated,
}: {
  onClose: () => void;
  operadoras: Operadora[];
  podeVerOperadora: (s: string) => boolean;
  operadoraSlugsForcado: string[] | null;
  actor: string;
  onCreated: (row: RhFigurinoPeca) => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [previewCode, setPreviewCode] = useState<string>("…");
  const [slugsSel, setSlugsSel] = useState<Set<string>>(() => {
    if (operadoraSlugsForcado?.length) return new Set(operadoraSlugsForcado);
    return new Set();
  });
  const [cat, setCat] = useState<string>(CATEGORIAS[0]);
  const [tam, setTam] = useState<string>(TAMANHOS[3]);
  const [desc, setDesc] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabase.rpc("rh_figurino_preview_proximo_code");
      if (!cancel && !error && typeof data === "string") setPreviewCode(data);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const toggleSlug = (slug: string) => {
    setSlugsSel((prev) => {
      const n = new Set(prev);
      if (n.has(slug)) n.delete(slug);
      else n.add(slug);
      return n;
    });
  };

  const salvar = async () => {
    setErr(null);
    if (slugsSel.size === 0) {
      setErr("Selecione ao menos uma operadora.");
      return;
    }
    if (!dataEntrada.trim()) {
      setErr("Informe a data de entrada.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("rh_figurino_criar_peca", {
      p_operadora_slugs: [...slugsSel],
      p_category: cat,
      p_size: tam,
      p_purchase_date: dataEntrada,
      p_description: desc,
      p_actor: actor,
    });
    setLoading(false);
    if (error) {
      console.error("[Figurinos] Erro ao cadastrar peça:", error);
      setErr("Não foi possível cadastrar a peça. Se o problema persistir, entre em contato com o suporte.");
      return;
    }
    await onCreated(data as RhFigurinoPeca);
  };

  const opsVis = operadoras.filter((o) => podeVerOperadora(o.slug));

  return (
    <ModalBase onClose={onClose} maxWidth={480}>
      <ModalHeader title="Cadastrar peça" onClose={onClose} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          Código (pré-visualização)
          <input
            readOnly
            value={previewCode}
            aria-readonly="true"
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              color: t.text,
              fontFamily: FONT.body,
              fontWeight: 700,
            }}
          />
        </label>
        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 8 }}>
            Operadoras
            <CampoObrigatorioMark />
            <span style={{ fontWeight: 400 }}> (pode marcar várias)</span>
          </legend>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 200,
              overflowY: "auto",
              padding: "4px 0",
            }}
          >
            {opsVis.map((o) => {
              const ativo = slugsSel.has(o.slug);
              return (
                <button
                  key={o.slug}
                  type="button"
                  role="checkbox"
                  aria-checked={ativo}
                  aria-label={`Operadora ${o.nome}`}
                  onClick={() => toggleSlug(o.slug)}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                    background: ativo
                      ? brand.useBrand
                        ? "color-mix(in srgb, var(--brand-accent) 12%, transparent)"
                        : "rgba(124,58,237,0.12)"
                      : (t.inputBg ?? t.cardBg),
                    color: ativo ? brand.accent : t.text,
                    fontFamily: FONT.body,
                    fontSize: 13,
                    fontWeight: ativo ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {o.nome}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Categoria
            <CampoObrigatorioMark />
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
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
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Tamanho
            <CampoObrigatorioMark />
            <select
              value={tam}
              onChange={(e) => setTam(e.target.value)}
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
              {TAMANHOS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          Data de entrada
          <CampoObrigatorioMark />
          <span style={{ fontWeight: 400, color: t.textMuted }}> (data de aquisição)</span>
          <input
            type="date"
            required
            value={dataEntrada}
            onChange={(e) => setDataEntrada(e.target.value)}
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
          />
        </label>
        <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          Observações
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
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
        {err ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body }}>
            {err}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
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
            onClick={() => void salvar()}
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
              opacity: loading ? 0.75 : 1,
            }}
          >
            {ctaButtonContent(loading, "Salvar", "Salvando…")}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
