import { useEffect, useState } from "react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { FONT } from "../../../constants/theme"
import { supabase } from "../../../lib/supabase"
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark"
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal"
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles"
import { type RhFigurinoPeca } from "./types"
import { CATEGORIAS, TAMANHOS, GENEROS, CORES, GENERO_PADRAO, COR_PADRAO, FIGURINO_ESTUDIO_CADASTRO_STAFF, FIGURINO_ESTUDIO_CADASTRO_TODOS, figurinoEstudioAtendeStaff, figurinoEstudioAtendeTodos } from "./figurinosConstants"
import { ctaButtonContent } from "./figurinosPageHelpers"
import { FigurinoEstudioCampoSelect } from "./FigurinoEstudioCampoSelect"

export function ModalCadastroPeca({
  onClose,
  estudios,
  estudioSlugsForcado,
  actor,
  onCreated,
}: {
  onClose: () => void;
  estudios: readonly { slug: string; nome: string }[];
  estudioSlugsForcado: string[] | null;
  actor: string;
  onCreated: (row: RhFigurinoPeca) => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [previewCode, setPreviewCode] = useState<string>("…");
  const [estudioSel, setEstudioSel] = useState<string[]>(() => {
    if (estudioSlugsForcado?.length) return [...estudioSlugsForcado];
    return [];
  });
  const [cat, setCat] = useState<string>(CATEGORIAS[0]);
  const [tam, setTam] = useState<string>(TAMANHOS[3]);
  const [genero, setGenero] = useState<string>(GENERO_PADRAO);
  const [cor, setCor] = useState<string>(COR_PADRAO);
  const [desc, setDesc] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    setPreviewCode("…");
    (async () => {
      const { data, error } = await supabase.rpc("rh_figurino_preview_proximo_code", {
        p_category: cat,
      });
      if (!cancel && !error && typeof data === "string") setPreviewCode(data);
    })();
    return () => {
      cancel = true;
    };
  }, [cat]);

  const salvar = async () => {
    setErr(null);
    const atendeTodos = figurinoEstudioAtendeTodos(estudioSel);
    const atendeStaff = figurinoEstudioAtendeStaff(estudioSel);
    const slugsEspecificos = estudioSel.filter(
      (s) => s !== FIGURINO_ESTUDIO_CADASTRO_TODOS && s !== FIGURINO_ESTUDIO_CADASTRO_STAFF,
    );
    if (!atendeTodos && !atendeStaff && slugsEspecificos.length === 0) {
      setErr("Selecione Staff, Todos Estúdios ou ao menos um estúdio específico.");
      return;
    }
    if (!dataEntrada.trim()) {
      setErr("Informe a data de entrada.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("rh_figurino_criar_peca", {
      p_estudio_slugs: atendeTodos || atendeStaff ? [] : slugsEspecificos,
      p_category: cat,
      p_size: tam,
      p_genero: genero,
      p_cor: cor,
      p_purchase_date: dataEntrada,
      p_description: desc,
      p_actor: actor,
      p_atende_todos_estudios: atendeTodos,
      p_atende_staff: atendeStaff,
    });
    setLoading(false);
    if (error) {
      console.error("[Figurinos] Erro ao cadastrar peça:", error);
      setErr("Não foi possível cadastrar a peça. Se o problema persistir, entre em contato com o suporte.");
      return;
    }
    await onCreated(data as RhFigurinoPeca);
  };

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
        <div>
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 8 }}>
            Estúdios
            <CampoObrigatorioMark />
            <span style={{ fontWeight: 400 }}> (Staff, Todos Estúdios ou um ou mais específicos)</span>
          </div>
          <FigurinoEstudioCampoSelect value={estudioSel} onChange={setEstudioSel} estudios={estudios} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Categoria
            <CampoObrigatorioMark />
            <select
              value={cat}
              onChange={(ev) => setCat(ev.target.value)}
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
              onChange={(ev) => setTam(ev.target.value)}
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Gênero
            <CampoObrigatorioMark />
            <select
              value={genero}
              onChange={(ev) => setGenero(ev.target.value)}
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
              {GENEROS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Cor
            <CampoObrigatorioMark />
            <select
              value={cor}
              onChange={(ev) => setCor(ev.target.value)}
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
              {CORES.map((c) => (
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
            onChange={(ev) => setDataEntrada(ev.target.value)}
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
            onChange={(ev) => setDesc(ev.target.value)}
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
