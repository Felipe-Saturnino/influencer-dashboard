import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { CampoUploadArquivos } from "../../../components/CampoUploadArquivos";
import { BtnExcluirLinha } from "../../../components/BtnExcluirLinha";
import { ModalConfirmExcluirPadrao } from "../../../components/OperacoesModal";
import { descricaoModalExcluirItem, tooltipExcluir } from "../../../lib/excluirItemUi";
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
  rotuloArquivoDocumentoPrestador,
  type RhPrestadorDocumentoCategoria,
} from "../../../lib/rhPrestadorDocumentosCadastro";
import type { RhFuncionarioSelfMedia, RhFuncionarioTipoContrato } from "../../../types/rhFuncionario";
import { useRhPrestadorDocumentosCategoria } from "../../../hooks/useRhPrestadorDocumentosCategoria";

export type PrestadorDocumentosGestaoHandle = {
  temPendentes: () => boolean;
  commitPendentes: () => Promise<{ ok: boolean }>;
  descartarPendentes: () => void;
};

type PendenteUpload = { key: string; categoria: RhPrestadorDocumentoCategoria; file: File };

export const PrestadorDocumentosGestaoPanel = forwardRef<
  PrestadorDocumentosGestaoHandle,
  {
    funcionarioId: string | null;
    tipoContrato: RhFuncionarioTipoContrato | "" | null | undefined;
    podeEditar: boolean;
  }
>(function PrestadorDocumentosGestaoPanel({ funcionarioId, tipoContrato, podeEditar }, ref) {
  const { theme: t } = useApp();
  const [alvoExcluir, setAlvoExcluir] = useState<{ row: RhFuncionarioSelfMedia; rotulo: string } | null>(null);
  const [pendentesUpload, setPendentesUpload] = useState<PendenteUpload[]>([]);
  const [pendentesExcluir, setPendentesExcluir] = useState<RhFuncionarioSelfMedia[]>([]);

  const { rows, loading, erro, signedById, uploadingCategory, excluindoId, upload, excluir } =
    useRhPrestadorDocumentosCategoria(funcionarioId, { podeEditar });

  const categorias = useMemo(() => categoriasDocumentoPorTipoContrato(tipoContrato), [tipoContrato]);
  const idsExcluir = useMemo(() => new Set(pendentesExcluir.map((r) => r.id)), [pendentesExcluir]);
  const rowsVisiveis = useMemo(() => rows.filter((r) => !idsExcluir.has(r.id)), [rows, idsExcluir]);
  const porCategoria = useMemo(
    () => agruparDocumentosPorCategoria(rowsVisiveis, categorias),
    [rowsVisiveis, categorias],
  );

  useImperativeHandle(
    ref,
    () => ({
      temPendentes: () => pendentesUpload.length > 0 || pendentesExcluir.length > 0,
      descartarPendentes: () => {
        setPendentesUpload([]);
        setPendentesExcluir([]);
        setAlvoExcluir(null);
      },
      commitPendentes: async () => {
        for (const p of pendentesUpload) {
          const dt = new DataTransfer();
          dt.items.add(p.file);
          const n = await upload(p.categoria, dt.files);
          if (n < 1) return { ok: false };
        }
        for (const row of pendentesExcluir) {
          const ok = await excluir(row);
          if (!ok) return { ok: false };
        }
        setPendentesUpload([]);
        setPendentesExcluir([]);
        return { ok: true };
      },
    }),
    [pendentesUpload, pendentesExcluir, upload, excluir],
  );

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

      {podeEditar ? (
        <p style={{ margin: "0 0 12px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          Os arquivos ficam pendentes até clicar em Salvar.
        </p>
      ) : null}

      <div className="app-table-wrap">
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", minWidth: 520 }}>
          <caption style={{ display: "none" }}>Documentos cadastrais por categoria</caption>
          <colgroup>
            <col style={{ width: "34%" }} />
            <col />
            {podeEditar ? <col style={{ width: 120 }} /> : null}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" style={{ ...getThStyle(t), textAlign: "left", overflow: "hidden" }}>
                Documento
              </th>
              <th scope="col" style={{ ...getThStyle(t), textAlign: "left", overflow: "hidden" }}>
                Arquivos
              </th>
              {podeEditar ? (
                <th scope="col" style={{ ...getThStyle(t), textAlign: "center" }}>
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
              const pendentesCat = pendentesUpload.filter((p) => p.categoria === cat);
              return (
                <tr key={cat} style={{ background: zebraStripe(i) }}>
                  <td
                    style={{
                      ...getTdStyle(t),
                      textAlign: "left",
                      verticalAlign: "top",
                      fontWeight: 600,
                      overflow: "hidden",
                      maxWidth: 0,
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                      whiteSpace: "normal",
                      paddingRight: 12,
                    }}
                  >
                    {RH_PRESTADOR_DOCUMENTO_CATEGORIA_LABEL[cat]}
                  </td>
                  <td
                    style={{
                      ...getTdStyle(t),
                      textAlign: "left",
                      verticalAlign: "top",
                      overflow: "hidden",
                      maxWidth: 0,
                      whiteSpace: "normal",
                    }}
                  >
                    {arquivos.length === 0 && pendentesCat.length === 0 ? (
                      <span style={{ color: t.textMuted, fontSize: 12 }}>Nenhum arquivo enviado.</span>
                    ) : (
                      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {arquivos.map((m, idx) => {
                          const url = signedById[m.id];
                          const rotulo = rotuloArquivoDocumentoPrestador(idx);
                          return (
                            <li
                              key={m.id}
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                alignItems: "center",
                                gap: 10,
                                padding: "6px 0",
                                borderBottom: `1px solid ${t.cardBorder}`,
                                fontSize: 12,
                                fontFamily: FONT.body,
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  color: t.text,
                                  flex: "0 0 auto",
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                }}
                                title={m.file_name}
                              >
                                {rotulo}
                              </span>
                              <span
                                style={{
                                  display: "inline-flex",
                                  flex: "0 0 auto",
                                  alignItems: "center",
                                  gap: 10,
                                  marginLeft: "auto",
                                }}
                              >
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
                                    onClick={() => setAlvoExcluir({ row: m, rotulo })}
                                  />
                                ) : null}
                              </span>
                            </li>
                          );
                        })}
                        {pendentesCat.map((p) => (
                          <li
                            key={p.key}
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              gap: 10,
                              padding: "6px 0",
                              borderBottom: `1px solid ${t.cardBorder}`,
                              fontSize: 12,
                              fontFamily: FONT.body,
                              minWidth: 0,
                            }}
                          >
                            <span style={{ color: t.text, fontWeight: 600 }} title={p.file.name}>
                              {p.file.name}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: 20,
                                background: "rgba(245,158,11,0.15)",
                                color: "#f59e0b",
                                border: "1px solid rgba(245,158,11,0.35)",
                              }}
                            >
                              Pendente
                            </span>
                            <span style={{ marginLeft: "auto" }}>
                              <BtnExcluirLinha
                                labelAcao={tooltipExcluir("documento")}
                                onClick={() => setPendentesUpload((prev) => prev.filter((x) => x.key !== p.key))}
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  {podeEditar ? (
                    <td style={{ ...getTdStyle(t), textAlign: "center", verticalAlign: "top" }}>
                      <CampoUploadArquivos
                        id={inputId}
                        label=""
                        buttonLabel={enviando ? "Enviando…" : "Adicionar"}
                        accept={RH_PRESTADOR_DOC_ACCEPT}
                        multiple
                        showList={false}
                        items={[]}
                        disabled={enviando || Boolean(excluindoId)}
                        onAdd={(files) => {
                          setPendentesUpload((prev) => [
                            ...prev,
                            ...files.map((file) => ({
                              key: `${cat}-${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
                              categoria: cat,
                              file,
                            })),
                          ]);
                        }}
                        onRemove={() => {}}
                        t={t}
                      />
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
          descricaoItem={descricaoModalExcluirItem("o documento", alvoExcluir.rotulo)}
          onCancel={() => {
            if (!excluindoId) setAlvoExcluir(null);
          }}
          onConfirm={() => {
            setPendentesExcluir((prev) => (prev.some((r) => r.id === alvoExcluir.row.id) ? prev : [...prev, alvoExcluir.row]));
            setAlvoExcluir(null);
          }}
          loading={Boolean(excluindoId)}
          zIndex={1100}
        />
      ) : null}
    </div>
  );
});
