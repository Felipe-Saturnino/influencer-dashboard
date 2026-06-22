import type { CSSProperties } from "react";
import { FileText, Upload, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import {
  RH_DOCUMENTO_APLICAVEL_OPCOES,
  RH_DOCUMENTO_AREAS,
  RH_DOCUMENTO_CLASSIFICACOES,
  RH_DOCUMENTO_TIPOS,
  type RhDocumentoNormativoCampos,
  type RhDocumentoTipo,
  prefixoCodigoDocumento,
  proximoCodigoSugerido,
} from "../../../lib/portalRhDocumentoNormativo";

type DocOpcao = { id: string; codigo: string | null; titulo: string; versao: string | null };

function lbl(id: string, text: string, obrigatorio?: boolean) {
  return (
    <label htmlFor={id} style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, fontFamily: FONT.body }}>
      {text}
      {obrigatorio ? <CampoObrigatorioMark /> : null}
    </label>
  );
}

export function ModalFormPoliticaNormativa({
  values,
  onChange,
  fieldErr,
  inputStyle,
  selectStyle,
  codigosExistentes,
  documentosParaRelacionar,
  pdfFile,
  onPdfFileChange,
  pdfNomeAtual,
}: {
  values: RhDocumentoNormativoCampos;
  onChange: (patch: Partial<RhDocumentoNormativoCampos>) => void;
  fieldErr: Record<string, string>;
  inputStyle: CSSProperties;
  selectStyle: CSSProperties;
  codigosExistentes: string[];
  documentosParaRelacionar: DocOpcao[];
  pdfFile: File | null;
  onPdfFileChange: (file: File | null) => void;
  pdfNomeAtual: string | null;
}) {
  const { theme: t } = useApp();

  const handleTipoChange = (tipo: RhDocumentoTipo | "") => {
    const patch: Partial<RhDocumentoNormativoCampos> = { tipoDocumento: tipo };
    if (tipo && !values.codigo.trim()) {
      patch.codigo = proximoCodigoSugerido(tipo, codigosExistentes);
    }
    onChange(patch);
  };

  const toggleAplicavel = (opcao: string) => {
    if (opcao === "Todos os prestadores") {
      onChange({ aplicavelA: values.aplicavelA.includes(opcao) ? [] : [opcao] });
      return;
    }
    const semTodos = values.aplicavelA.filter((x) => x !== "Todos os prestadores");
    const next = semTodos.includes(opcao) ? semTodos.filter((x) => x !== opcao) : [...semTodos, opcao];
    onChange({ aplicavelA: next });
  };

  const toggleRelacionado = (id: string) => {
    const next = values.relacionadosIds.includes(id)
      ? values.relacionadosIds.filter((x) => x !== id)
      : [...values.relacionadosIds, id];
    onChange({ relacionadosIds: next });
  };

  const pdfLabel = pdfFile?.name ?? pdfNomeAtual ?? values.pdfNome;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          {lbl("mp-tipo-doc", "Tipo de documento", true)}
          <select
            id="mp-tipo-doc"
            value={values.tipoDocumento}
            onChange={(e) => handleTipoChange(e.target.value as RhDocumentoTipo | "")}
            style={{ ...selectStyle, borderColor: fieldErr.tipoDocumento ? "#e84025" : t.cardBorder }}
            aria-label="Tipo de documento"
          >
            <option value="">Selecione…</option>
            {RH_DOCUMENTO_TIPOS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          {lbl("mp-codigo", "Código do documento", true)}
          <input
            id="mp-codigo"
            value={values.codigo}
            onChange={(e) => onChange({ codigo: e.target.value.toUpperCase() })}
            style={{ ...inputStyle, borderColor: fieldErr.codigo ? "#e84025" : t.cardBorder, fontFamily: "ui-monospace, monospace" }}
            aria-label="Código do documento"
            placeholder={values.tipoDocumento ? prefixoCodigoDocumento(values.tipoDocumento) + "000" : "POL-RH-000"}
          />
        </div>
        <div>
          {lbl("mp-versao", "Versão", true)}
          <input
            id="mp-versao"
            value={values.versao}
            onChange={(e) => onChange({ versao: e.target.value })}
            style={{ ...inputStyle, borderColor: fieldErr.versao ? "#e84025" : t.cardBorder }}
            aria-label="Versão"
          />
        </div>

        <div>
          {lbl("mp-emissao", "Data de emissão", true)}
          <input
            id="mp-emissao"
            value={values.dataEmissao}
            onChange={(e) => onChange({ dataEmissao: e.target.value })}
            style={{ ...inputStyle, borderColor: fieldErr.dataEmissao ? "#e84025" : t.cardBorder }}
            aria-label="Data de emissão"
            placeholder="Junho/2026"
          />
        </div>
        <div>
          {lbl("mp-area", "Área responsável", true)}
          <select
            id="mp-area"
            value={values.areaResponsavel}
            onChange={(e) => onChange({ areaResponsavel: e.target.value })}
            style={{ ...selectStyle, borderColor: fieldErr.areaResponsavel ? "#e84025" : t.cardBorder }}
            aria-label="Área responsável"
          >
            <option value="">Selecione…</option>
            {RH_DOCUMENTO_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          {lbl("mp-titulo-doc", "Título oficial (capa do PDF)", true)}
          <input
            id="mp-titulo-doc"
            value={values.titulo}
            onChange={(e) => onChange({ titulo: e.target.value })}
            style={{ ...inputStyle, borderColor: fieldErr.titulo ? "#e84025" : t.cardBorder }}
            aria-label="Título oficial"
          />
        </div>

        <div>
          {lbl("mp-class", "Classificação", true)}
          <select
            id="mp-class"
            value={values.classificacao}
            onChange={(e) => onChange({ classificacao: e.target.value as RhDocumentoNormativoCampos["classificacao"] })}
            style={{ ...selectStyle, borderColor: fieldErr.classificacao ? "#e84025" : t.cardBorder }}
            aria-label="Classificação"
          >
            <option value="">Selecione…</option>
            {RH_DOCUMENTO_CLASSIFICACOES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          {lbl("mp-req-apr-doc", "Enviar para aprovação antes de publicar?", true)}
          <select
            id="mp-req-apr-doc"
            value={values.requerAprovacao}
            onChange={(e) => onChange({ requerAprovacao: e.target.value })}
            style={{ ...selectStyle, borderColor: fieldErr.requerAprovacao ? "#e84025" : t.cardBorder }}
            aria-label="Enviar para aprovação"
          >
            <option value="">Selecione…</option>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          {lbl("mp-aplicavel", "Aplicável a", true)}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              padding: 10,
              borderRadius: 10,
              border: `1px solid ${fieldErr.aplicavelA ? "#e84025" : t.cardBorder}`,
              background: t.inputBg,
            }}
          >
            {RH_DOCUMENTO_APLICAVEL_OPCOES.map((opcao) => {
              const ativo = values.aplicavelA.includes(opcao);
              return (
                <button
                  key={opcao}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => toggleAplicavel(opcao)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: `1px solid ${ativo ? "var(--brand-accent, #1e36f8)" : t.cardBorder}`,
                    background: ativo ? "color-mix(in srgb, var(--brand-accent, #1e36f8) 12%, #fff)" : t.cardBg,
                    color: ativo ? "var(--brand-accent, #1e36f8)" : t.text,
                    fontSize: 12,
                    fontWeight: ativo ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                  }}
                >
                  {opcao}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          {lbl("mp-resumo", "Resumo para listagem (Objetivo)", true)}
          <textarea
            id="mp-resumo"
            value={values.resumo}
            maxLength={400}
            rows={3}
            onChange={(e) => onChange({ resumo: e.target.value })}
            style={{ ...inputStyle, resize: "vertical", borderColor: fieldErr.resumo ? "#e84025" : t.cardBorder }}
            aria-label="Resumo para listagem"
          />
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{values.resumo.length}/400</div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          {lbl("mp-pdf", "Arquivo oficial (PDF)", true)}
          <div
            style={{
              border: `2px dashed ${fieldErr.pdf ? "#e84025" : "color-mix(in srgb, var(--brand-accent, #1e36f8) 35%, transparent)"}`,
              borderRadius: 12,
              padding: 20,
              textAlign: "center",
              background: "color-mix(in srgb, var(--brand-accent, #1e36f8) 4%, #fff)",
            }}
          >
            <Upload size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>PDF canônico do documento</div>
            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>
              O colaborador lê este arquivo na plataforma. Máx. 15 MB.
            </div>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Selecionar PDF
              <input
                type="file"
                accept="application/pdf,.pdf"
                style={{ display: "none" }}
                onChange={(e) => onPdfFileChange(e.target.files?.[0] ?? null)}
              />
            </label>
            {pdfLabel ? (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  textAlign: "left",
                }}
              >
                <FileText size={18} aria-hidden />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>{pdfLabel}</div>
                </div>
                {pdfFile ? (
                  <button
                    type="button"
                    aria-label="Remover PDF selecionado"
                    onClick={() => onPdfFileChange(null)}
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: t.textMuted }}
                  >
                    <X size={16} aria-hidden />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {documentosParaRelacionar.length > 0 ? (
          <div style={{ gridColumn: "1 / -1" }}>
            {lbl("mp-rel", "Documentos relacionados")}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
              {documentosParaRelacionar.map((doc) => {
                const ativo = values.relacionadosIds.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: `1px solid ${t.cardBorder}`,
                      background: ativo ? "color-mix(in srgb, var(--brand-accent, #1e36f8) 8%, #fff)" : t.inputBg,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    <input type="checkbox" checked={ativo} onChange={() => toggleRelacionado(doc.id)} />
                    <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--brand-primary, #7c3aed)" }}>
                      {doc.codigo ?? "—"}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.titulo}
                    </span>
                    {doc.versao ? <span style={{ color: t.textMuted }}>v{doc.versao}</span> : null}
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        <div>
          {lbl("mp-exige-ciencia", "Exige ciência do colaborador?", true)}
          <select
            id="mp-exige-ciencia"
            value={values.exigeCiencia}
            onChange={(e) => onChange({ exigeCiencia: e.target.value })}
            style={{ ...selectStyle, borderColor: fieldErr.exigeCiencia ? "#e84025" : t.cardBorder }}
            aria-label="Exige ciência"
          >
            <option value="">Selecione…</option>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
        </div>
        <div>
          {lbl("mp-elaborado", "Elaborado por")}
          <input
            id="mp-elaborado"
            value={values.elaboradoPor}
            onChange={(e) => onChange({ elaboradoPor: e.target.value })}
            style={inputStyle}
            aria-label="Elaborado por"
            placeholder="Recursos Humanos"
          />
        </div>
        <div>
          {lbl("mp-revisado", "Revisado por")}
          <input
            id="mp-revisado"
            value={values.revisadoPor}
            onChange={(e) => onChange({ revisadoPor: e.target.value })}
            style={inputStyle}
            aria-label="Revisado por"
          />
        </div>
        <div>
          {lbl("mp-aprovado-doc", "Aprovado por")}
          <input
            id="mp-aprovado-doc"
            value={values.aprovadoPorDoc}
            onChange={(e) => onChange({ aprovadoPorDoc: e.target.value })}
            style={inputStyle}
            aria-label="Aprovado por"
          />
        </div>
      </div>
    </>
  );
}

export const FORM_POLITICA_NORMATIVA_VAZIO: RhDocumentoNormativoCampos = {
  tipoDocumento: "",
  codigo: "",
  versao: "1.0",
  dataEmissao: "",
  titulo: "",
  areaResponsavel: "",
  classificacao: "",
  aplicavelA: [],
  resumo: "",
  pdfPath: null,
  pdfNome: null,
  exigeCiencia: "",
  requerAprovacao: "",
  elaboradoPor: "",
  revisadoPor: "",
  aprovadoPorDoc: "",
  relacionadosIds: [],
};
