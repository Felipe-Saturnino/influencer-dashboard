import { useCallback, useEffect, useState } from "react";
import type { RhFuncionarioSelfMedia } from "../types/rhFuncionario";
import type { RhPrestadorDocumentoCategoria } from "./rhPrestadorDocumentosCadastro";
import {
  excluirDocumentoPrestador,
  listarDocumentosPrestador,
  uploadDocumentoPrestador,
  urlsAssinadasDocumentosPrestador,
} from "./rhPrestadorSelfMediaDocs";

export function useRhPrestadorDocumentosCategoria(
  funcionarioId: string | null,
  opts?: { podeEditar?: boolean },
) {
  const podeEditar = opts?.podeEditar ?? false;
  const [rows, setRows] = useState<RhFuncionarioSelfMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [signedById, setSignedById] = useState<Record<string, string>>({});
  const [uploadingCategory, setUploadingCategory] = useState<RhPrestadorDocumentoCategoria | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!funcionarioId) {
      setRows([]);
      setErro(null);
      return;
    }
    setLoading(true);
    setErro(null);
    const { rows: list, error } = await listarDocumentosPrestador(funcionarioId);
    setLoading(false);
    if (error) {
      setErro(error);
      setRows([]);
      return;
    }
    setRows(list);
  }, [funcionarioId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (rows.length === 0) {
      setSignedById({});
      return;
    }
    let cancelled = false;
    void urlsAssinadasDocumentosPrestador(rows).then((next) => {
      if (!cancelled) setSignedById(next);
    });
    return () => {
      cancelled = true;
    };
  }, [rows]);

  const upload = useCallback(
    async (categoria: RhPrestadorDocumentoCategoria, files: FileList | null): Promise<number> => {
      if (!podeEditar || !funcionarioId || !files?.length) return 0;
      setUploadingCategory(categoria);
      setErro(null);
      let uploaded = 0;
      try {
        for (const file of Array.from(files)) {
          const res = await uploadDocumentoPrestador({ funcionarioId, categoria, file });
          if (!res.ok) {
            setErro(res.message);
            break;
          }
          uploaded += 1;
        }
        if (uploaded > 0) await carregar();
      } finally {
        setUploadingCategory(null);
      }
      return uploaded;
    },
    [podeEditar, funcionarioId, carregar],
  );

  const excluir = useCallback(
    async (row: RhFuncionarioSelfMedia): Promise<boolean> => {
      if (!podeEditar) return false;
      setExcluindoId(row.id);
      setErro(null);
      const res = await excluirDocumentoPrestador(row);
      setExcluindoId(null);
      if (!res.ok) {
        setErro(res.message ?? "Não foi possível excluir o documento.");
        return false;
      }
      await carregar();
      return true;
    },
    [podeEditar, carregar],
  );

  return {
    rows,
    loading,
    erro,
    signedById,
    uploadingCategory,
    excluindoId,
    upload,
    excluir,
    recarregar: carregar,
  };
}
