import { useMemo, type CSSProperties } from "react";
import { FileText, Upload, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { SelectOrganogramaTimes } from "../../../components/rh/SelectOrganogramaTimes";
import { SelectOrganogramaMultiForm } from "../../../components/rh/SelectOrganogramaMultiForm";
import type { RhOrgOrganogramaGrupoPrestador } from "../../../types/rhOrganograma";
import {
  RH_DOCUMENTO_CLASSIFICACOES,
  RH_DOCUMENTO_TIPOS,
  type RhDocumentoNormativoCampos,
  type RhDocumentoTipo,
  extrairSufixoNumericoCodigo,
  labelTipoDocumentoSelect,
  montarCodigoDocumento,
  opcoesOrganogramaAplicavel,
  prefixoCodigoDocumento,
  proximoCodigoSugerido,
  setorNomeDeVinculo,
  vinculoSelectValuePorSetorNome,
} from "../../../lib/portalRhDocumentoNormativo";

type DocOpcao = { id: string; codigo: string | null; titulo: string; versao: string | null };

function lbl(id: string, text: string, t: { textMuted: string }, obrigatorio?: boolean) {
  return (
    <label htmlFor={id} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
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
  organogramaGrupos,
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
  organogramaGrupos: RhOrgOrganogramaGrupoPrestador[];
}) {
  const { theme: t } = useApp();

  const opcoesAplicavel = useMemo(() => opcoesOrganogramaAplicavel(organogramaGrupos), [organogramaGrupos]);

  const handleTipoChange = (tipo: RhDocumentoTipo | "") => {
    if (!tipo) {
      onChange({ tipoDocumento: "", codigo: "" });
      return;
    }
    onChange({
      tipoDocumento: tipo,
      codigo: proximoCodigoSugerido(tipo, codigosExistentes),
    });
  };

  const prefixo = values.tipoDocumento ? prefixoCodigoDocumento(values.tipoDocumento) : "";
  const sufixoCodigo = prefixo ? extrairSufixoNumericoCodigo(values.codigo, prefixo) : "";

  const areaSelectValue = vinculoSelectValuePorSetorNome(organogramaGrupos, values.areaResponsavel);

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
          {lbl("mp-tipo-doc", "Tipo de documento", t, true)}
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
                {labelTipoDocumentoSelect(opt.value)}
              </option>
            ))}
          </select>
        </div>

        <div>
          {lbl("mp-codigo", "Código do documento", t, true)}
          <div style={{ display: "flex", alignItems: "stretch" }}>
            <span
              aria-hidden
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: "10px 0 0 10px",
                border: `1px solid ${fieldErr.codigo ? "#e84025" : t.cardBorder}`,
                borderRight: "none",
                background: t.cardBg,
                color: t.textMuted,
                fontSize: 13,
                fontFamily: "ui-monospace, monospace",
                whiteSpace: "nowrap",
              }}
            >
              {prefixo || "—"}
            </span>
            <input
              id="mp-codigo"
              value={sufixoCodigo}
              disabled={!values.tipoDocumento}
              inputMode="numeric"
              onChange={(e) => {
                if (!prefixo) return;
                const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                onChange({ codigo: montarCodigoDocumento(prefixo, digits) });
              }}
              onBlur={() => {
                if (!prefixo) return;
                onChange({ codigo: montarCodigoDocumento(prefixo, sufixoCodigo || "0") });
              }}
              style={{
                ...inputStyle,
                borderRadius: "0 10px 10px 0",
                borderColor: fieldErr.codigo ? "#e84025" : t.cardBorder,
                fontFamily: "ui-monospace, monospace",
              }}
              aria-label="Número sequencial do código do documento"
            />
          </div>
        </div>
        <div>
          {lbl("mp-versao", "Versão", t, true)}
          <input
            id="mp-versao"
            value={values.versao}
            onChange={(e) => onChange({ versao: e.target.value })}
            style={{ ...inputStyle, borderColor: fieldErr.versao ? "#e84025" : t.cardBorder }}
            aria-label="Versão"
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          {lbl("mp-area", "Área responsável", t, true)}
          <SelectOrganogramaTimes
            id="mp-area"
            aria-label="Área responsável"
            value={areaSelectValue}
            grupos={organogramaGrupos}
            acceptLevels={["gerencia", "time"]}
            onPick={(_id, op) => onChange({ areaResponsavel: setorNomeDeVinculo(op) })}
            style={{ ...selectStyle, borderColor: fieldErr.areaResponsavel ? "#e84025" : t.cardBorder }}
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          {lbl("mp-titulo-doc", "Título do documento", t, true)}
          <input
            id="mp-titulo-doc"
            value={values.titulo}
            onChange={(e) => onChange({ titulo: e.target.value })}
            style={{ ...inputStyle, borderColor: fieldErr.titulo ? "#e84025" : t.cardBorder }}
            aria-label="Título do documento"
          />
        </div>

        <div>
          {lbl("mp-class", "Classificação", t, true)}
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
          {lbl("mp-req-apr-doc", "Enviar para aprovação antes de publicar?", t, true)}
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
          {lbl("mp-aplicavel", "Aplicável a", t, true)}
          <SelectOrganogramaMultiForm
            id="mp-aplicavel"
            value={values.aplicavelA}
            onChange={(aplicavelA) => onChange({ aplicavelA })}
            options={opcoesAplicavel}
            hasError={Boolean(fieldErr.aplicavelA)}
            ariaLabel="Aplicável a"
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          {lbl("mp-resumo", "Objetivo da Política", t, true)}
          <textarea
            id="mp-resumo"
            value={values.resumo}
            maxLength={400}
            rows={3}
            onChange={(e) => onChange({ resumo: e.target.value })}
            style={{ ...inputStyle, resize: "vertical", borderColor: fieldErr.resumo ? "#e84025" : t.cardBorder }}
            aria-label="Objetivo da Política"
          />
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{values.resumo.length}/400</div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          {lbl("mp-pdf", "Documento (PDF)", t, true)}
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
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>PDF do documento</div>
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
            {lbl("mp-rel", "Documentos relacionados", t)}
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
          {lbl("mp-exige-ciencia", "Exige ciência do colaborador?", t, true)}
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
          {lbl("mp-elaborado", "Elaborado por", t)}
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
          {lbl("mp-revisado", "Revisado por", t)}
          <input
            id="mp-revisado"
            value={values.revisadoPor}
            onChange={(e) => onChange({ revisadoPor: e.target.value })}
            style={inputStyle}
            aria-label="Revisado por"
          />
        </div>
        <div>
          {lbl("mp-aprovado-doc", "Aprovado por", t)}
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
