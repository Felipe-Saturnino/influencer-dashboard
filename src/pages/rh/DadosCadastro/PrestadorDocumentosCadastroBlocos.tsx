import { useMemo, useState } from "react";
import { BtnExcluirLinha } from "../../../components/BtnExcluirLinha";
import { ModalConfirmExcluirPadrao } from "../../../components/OperacoesModal";
import { SectionTitle } from "../../../components/dashboard/SectionTitle";
import { descricaoBotaoExcluir, descricaoModalExcluirItem } from "../../../lib/excluirItemUi";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import {
  RH_PRESTADOR_DOC_ACCEPT,
  RH_PRESTADOR_DOCUMENTO_CATEGORIA_LABEL,
  agruparDocumentosPorCategoria,
  categoriasDocumentoPorTipoContrato,
  inputIdDocumentoPrestador,
  type RhPrestadorDocumentoCategoria,
} from "../../../lib/rhPrestadorDocumentosCadastro";
import type { RhFuncionarioSelfMedia, RhFuncionarioTipoContrato } from "../../../types/rhFuncionario";
import { Loader2, RefreshCw, Upload } from "lucide-react";
import { useRhPrestadorDocumentosCategoria } from "../../../hooks/useRhPrestadorDocumentosCategoria";

export function PrestadorDocumentosCadastroBlocos({
  funcionarioId,
  tipoContrato,
  podeEditar,
  onDocumentosAlterados,
}: {
  funcionarioId: string;
  tipoContrato: RhFuncionarioTipoContrato;
  podeEditar: boolean;
  onDocumentosAlterados?: () => void | Promise<void>;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const pageBox = getPageContentBoxStyle(brand, t);
  const [alvoExcluir, setAlvoExcluir] = useState<RhFuncionarioSelfMedia | null>(null);

  const { rows, loading, erro, signedById, uploadingCategory, excluindoId, upload, excluir } =
    useRhPrestadorDocumentosCategoria(funcionarioId, { podeEditar });

  const categorias = useMemo(() => categoriasDocumentoPorTipoContrato(tipoContrato), [tipoContrato]);
  const porCategoria = useMemo(() => agruparDocumentosPorCategoria(rows, categorias), [rows, categorias]);

  const handleUpload = async (cat: RhPrestadorDocumentoCategoria, files: FileList | null) => {
    const count = await upload(cat, files);
    if (count > 0 && onDocumentosAlterados) await onDocumentosAlterados();
  };

  if (loading && rows.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 160,
          color: t.textMuted,
          fontFamily: FONT.body,
          fontSize: 13,
        }}
      >
        <Loader2 size={20} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
        Carregando…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {erro ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
          {erro}
        </div>
      ) : null}

      {categorias.map((cat) => {
        const arquivos = porCategoria[cat] ?? [];
        const enviando = uploadingCategory === cat;
        const inputId = inputIdDocumentoPrestador("cadastro", funcionarioId, cat);

        return (
          <section key={cat} style={pageBox}>
            <SectionTitle sub="Visualize ou substitua os arquivos desta categoria">
              {RH_PRESTADOR_DOCUMENTO_CATEGORIA_LABEL[cat]}
            </SectionTitle>

            {arquivos.length === 0 ? (
              <p style={{ margin: "0 0 12px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                Nenhum arquivo enviado.
              </p>
            ) : (
              <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0 }}>
                {arquivos.map((m) => {
                  const url = signedById[m.id];
                  return (
                    <li
                      key={m.id}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 0",
                        borderBottom: `1px solid ${t.cardBorder}`,
                        fontFamily: FONT.body,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: t.text, flex: 1, minWidth: 160, wordBreak: "break-word" }} title={m.file_name}>
                        {m.file_name}
                      </span>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--brand-primary, #7c3aed)", fontWeight: 600 }}
                        >
                          Visualizar
                        </a>
                      ) : null}
                      {podeEditar ? (
                        <>
                          <label
                            htmlFor={inputId}
                            aria-label={`Substituir ou adicionar em ${RH_PRESTADOR_DOCUMENTO_CATEGORIA_LABEL[cat]}`}
                            title="Adicionar ou substituir arquivo"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 12px",
                              borderRadius: 8,
                              border: `1px solid ${t.cardBorder}`,
                              background: t.inputBg,
                              color: t.text,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: enviando ? "wait" : "pointer",
                              fontFamily: FONT.body,
                              opacity: enviando ? 0.7 : 1,
                            }}
                          >
                            <RefreshCw size={14} aria-hidden />
                            Substituir
                          </label>
                          <BtnExcluirLinha
                            descricaoItem={descricaoBotaoExcluir("documento", m.file_name)}
                            onClick={() => setAlvoExcluir(m)}
                          />
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {podeEditar ? (
              <>
                <input
                  id={inputId}
                  type="file"
                  multiple
                  accept={RH_PRESTADOR_DOC_ACCEPT}
                  disabled={enviando}
                  style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: "hidden",
                    clip: "rect(0, 0, 0, 0)",
                    whiteSpace: "nowrap",
                    border: 0,
                  }}
                  onChange={(e) => {
                    void handleUpload(cat, e.target.files).then(() => {
                      e.target.value = "";
                    });
                  }}
                />
                <label
                  htmlFor={inputId}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    borderRadius: 12,
                    border: `1px dashed ${t.cardBorder}`,
                    cursor: enviando ? "wait" : "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: brand.primary,
                    fontFamily: FONT.body,
                  }}
                >
                  {enviando ? (
                    <>
                      <Loader2 size={16} className="app-lucide-spin" aria-hidden />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <Upload size={16} aria-hidden />
                      Adicionar arquivo
                    </>
                  )}
                </label>
              </>
            ) : null}
          </section>
        );
      })}

      {alvoExcluir ? (
        <ModalConfirmExcluirPadrao
          descricaoItem={descricaoModalExcluirItem("o documento", alvoExcluir.file_name)}
          onCancel={() => {
            if (!excluindoId) setAlvoExcluir(null);
          }}
          onConfirm={() => {
            void excluir(alvoExcluir).then(async (ok) => {
              if (ok) {
                setAlvoExcluir(null);
                if (onDocumentosAlterados) await onDocumentosAlterados();
              }
            });
          }}
          loading={Boolean(excluindoId)}
        />
      ) : null}
    </div>
  );
}
