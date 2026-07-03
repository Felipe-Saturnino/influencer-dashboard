import { useMemo, useState, type CSSProperties } from "react";
import { Download, Eye, Loader2, Upload } from "lucide-react";
import { BtnExcluirLinha } from "../../../components/BtnExcluirLinha";
import { ModalConfirmExcluirPadrao } from "../../../components/OperacoesModal";
import {descricaoModalExcluirItem, tooltipExcluir} from "../../../lib/excluirItemUi";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
import {
  RH_PRESTADOR_DOC_ACCEPT,
  RH_PRESTADOR_DOCUMENTO_CATEGORIA_LABEL,
  agruparDocumentosPorCategoria,
  categoriasDocumentoPorTipoContrato,
  inputIdDocumentoPrestador,
} from "../../../lib/rhPrestadorDocumentosCadastro";
import type { RhFuncionarioSelfMedia, RhFuncionarioTipoContrato } from "../../../types/rhFuncionario";
import { useRhPrestadorDocumentosCategoria } from "../../../hooks/useRhPrestadorDocumentosCategoria";

const hiddenFileInputStyle: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export function PrestadorDocumentosGestaoPanel({
  funcionarioId,
  tipoContrato,
  podeEditar,
}: {
  funcionarioId: string | null;
  tipoContrato: RhFuncionarioTipoContrato | "" | null | undefined;
  podeEditar: boolean;
}) {
  const { theme: t } = useApp();
  const [alvoExcluir, setAlvoExcluir] = useState<RhFuncionarioSelfMedia | null>(null);

  const { rows, loading, erro, signedById, uploadingCategory, excluindoId, upload, excluir } =
    useRhPrestadorDocumentosCategoria(funcionarioId, { podeEditar });

  const categorias = useMemo(() => categoriasDocumentoPorTipoContrato(tipoContrato), [tipoContrato]);
  const porCategoria = useMemo(() => agruparDocumentosPorCategoria(rows, categorias), [rows, categorias]);

  if (!funcionarioId) {
    return (
      <p style={{ margin: 0, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
        Salve o prestador antes de anexar documentos.
      </p>
    );
  }

  if (loading && rows.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 120,
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
    <div style={{ marginTop: 4 }}>
      {erro ? (
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
          {erro}
        </div>
      ) : null}

      {podeEditar
        ? categorias.map((cat) => {
            const inputId = inputIdDocumentoPrestador("gestao", funcionarioId, cat);
            const enviando = uploadingCategory === cat;
            return (
              <input
                key={inputId}
                id={inputId}
                type="file"
                multiple
                accept={RH_PRESTADOR_DOC_ACCEPT}
                disabled={enviando}
                style={hiddenFileInputStyle}
                onChange={(e) => {
                  void upload(cat, e.target.files).then(() => {
                    e.target.value = "";
                  });
                }}
              />
            );
          })
        : null}

      <div className="app-table-wrap">
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 520 }}>
          <caption style={{ display: "none" }}>Documentos cadastrais por categoria</caption>
          <thead>
            <tr>
              <th scope="col" style={{ ...getThStyle(t), textAlign: "left", width: "30%" }}>
                Documento
              </th>
              <th scope="col" style={{ ...getThStyle(t), textAlign: "left" }}>
                Arquivos
              </th>
              {podeEditar ? (
                <th scope="col" style={{ ...getThStyle(t), textAlign: "center", width: 120 }}>
                  Enviar
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {categorias.map((cat, i) => {
              const arquivos = porCategoria[cat] ?? [];
              const enviando = uploadingCategory === cat;
              const inputId = inputIdDocumentoPrestador("gestao", funcionarioId, cat);
              return (
                <tr key={cat} style={{ background: zebraStripe(i) }}>
                  <td style={{ ...getTdStyle(t), textAlign: "left", verticalAlign: "top", fontWeight: 600 }}>
                    {RH_PRESTADOR_DOCUMENTO_CATEGORIA_LABEL[cat]}
                  </td>
                  <td style={{ ...getTdStyle(t), textAlign: "left", verticalAlign: "top" }}>
                    {arquivos.length === 0 ? (
                      <span style={{ color: t.textMuted, fontSize: 12 }}>Nenhum arquivo enviado.</span>
                    ) : (
                      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
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
                                padding: "6px 0",
                                borderBottom: arquivos.length > 1 ? `1px solid ${t.cardBorder}` : undefined,
                                fontSize: 12,
                                fontFamily: FONT.body,
                              }}
                            >
                              <span style={{ color: t.text, flex: 1, minWidth: 120, wordBreak: "break-word" }} title={m.file_name}>
                                {m.file_name}
                              </span>
                              {url ? (
                                <>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={tooltipAcao("Visualizar documento")}
                                    title={tooltipAcao("Visualizar documento")}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                      color: "var(--brand-primary, #7c3aed)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    <Eye size={14} aria-hidden />
                                    Visualizar
                                  </a>
                                  <a
                                    href={url}
                                    download={m.file_name}
                                    aria-label={tooltipAcao("Baixar documento")}
                                    title={tooltipAcao("Baixar documento")}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, color: t.textMuted }}
                                  >
                                    <Download size={14} aria-hidden />
                                    Download
                                  </a>
                                </>
                              ) : null}
                              {podeEditar ? (
                                <BtnExcluirLinha
                                  labelAcao={tooltipExcluir("documento")}
                                  onClick={() => setAlvoExcluir(m)}
                                />
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </td>
                  {podeEditar ? (
                    <td style={{ ...getTdStyle(t), textAlign: "center", verticalAlign: "top" }}>
                      <label
                        htmlFor={inputId}
                        aria-label={`Adicionar arquivos em ${RH_PRESTADOR_DOCUMENTO_CATEGORIA_LABEL[cat]}`}
                        title={`Adicionar arquivos em ${RH_PRESTADOR_DOCUMENTO_CATEGORIA_LABEL[cat]}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: `1px dashed ${t.cardBorder}`,
                          background: t.inputBg,
                          color: "var(--brand-primary, #7c3aed)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: enviando ? "wait" : "pointer",
                          fontFamily: FONT.body,
                          opacity: enviando ? 0.7 : 1,
                        }}
                      >
                        {enviando ? (
                          <>
                            <Loader2 size={14} className="app-lucide-spin" aria-hidden />
                            Enviando…
                          </>
                        ) : (
                          <>
                            <Upload size={14} aria-hidden />
                            Adicionar
                          </>
                        )}
                      </label>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {alvoExcluir ? (
        <ModalConfirmExcluirPadrao
          descricaoItem={descricaoModalExcluirItem("o documento", alvoExcluir.file_name)}
          onCancel={() => {
            if (!excluindoId) setAlvoExcluir(null);
          }}
          onConfirm={() => {
            void excluir(alvoExcluir).then((ok) => {
              if (ok) setAlvoExcluir(null);
            });
          }}
          loading={Boolean(excluindoId)}
          zIndex={1100}
        />
      ) : null}
    </div>
  );
}
