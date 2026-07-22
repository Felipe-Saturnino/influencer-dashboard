import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Loader2, Paperclip, Plus, X } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { ctaGradientPortalAcademy } from "../../../lib/academyPortalUi";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { EditorTextoFormatado } from "../../../components/conteudo/EditorTextoFormatado";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { SelectOrganogramaMultiForm } from "../../../components/rh/SelectOrganogramaMultiForm";
import {
  normalizarAnexosAcademyPortal,
  normalizarImagensAcademyPortal,
  payloadMidiaAcademyPortal,
  uploadAcademyPortalAssets,
  type AcademyPortalAnexoRef,
} from "../../../lib/academyPortalPostagemFiles";
import { opcoesTimesAplicavelAcademyManuais } from "../../../lib/academyPortalAplicavel";
import {
  carregarJogosMesasEstudio,
  jogoMesaParaPersistirManual,
  normalizarJogosMesa,
} from "../../../lib/academyPortalJogosMesa";
import { reservarCodigoManual } from "../../../lib/academyPortalManualCodigo";
import { carregarOpcoesTimesOrganograma } from "../../../lib/rhOrganogramaFetch";
import type { RhOrgOrganogramaGrupoPrestador } from "../../../types/rhOrganograma";
import { AcademyPortalJogosMultiSelect } from "./AcademyPortalJogosMultiSelect";
import {
  contentTypeFromTipoUi,
  diffEdicaoRascunho,
  labelComunicadoFromSlug,
  labelDicaManualFromSlug,
  registrarHistoricoEdicoesRascunho,
  registrarHistoricoStatus,
  slugComunicadoFromLabel,
  slugDicaManualFromLabel,
  validarPublicarComunicado,
  validarPublicarDica,
  validarPublicarManual,
  type AcademyPostagemContentType,
  type AcademyPostagemStatus,
  type AcademyPostagemTipoUi,
  type SnapshotPostagemEdicaoAcademy,
  TIPOS_COMUNICADO_ACADEMY,
  TIPOS_DICA_MANUAL,
} from "../../../lib/academyPortalWorkflow";

type Categoria = { id: string; slug: string; label: string; scope: string };

export type PostagemEditRef = {
  contentType: AcademyPostagemContentType;
  id: string;
};

type AcaoModal = "salvar" | "publicar";

const ERRO_CARREGAR_EDICAO = "Não foi possível carregar a postagem para edição.";
const ERRO_SALVAR =
  "Não foi possível salvar a postagem. Se o problema persistir, entre em contato com o suporte.";
const ERRO_UPLOAD = "Não foi possível enviar o arquivo. Tente novamente.";

type ItemArquivoLista = { key: string; label: string; pendente: boolean };

function CampoArquivosBotao({
  id,
  label,
  buttonLabel,
  accept,
  multiple = true,
  items,
  onAdd,
  onRemove,
  disabled,
  t,
}: {
  id: string;
  label: string;
  buttonLabel: string;
  accept?: string;
  multiple?: boolean;
  items: ItemArquivoLista[];
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  disabled?: boolean;
  t: { text: string; textMuted: string; cardBorder: string; inputBg: string };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = buttonLabel.toLowerCase().includes("anexo") ? Paperclip : Plus;

  return (
    <div>
      <label htmlFor={id} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          const list = e.target.files;
          if (!list?.length) return;
          onAdd(Array.from(list));
          e.target.value = "";
        }}
        style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 }}
        aria-label={buttonLabel}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderRadius: 10,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg,
          color: t.text,
          fontFamily: FONT.body,
          fontSize: 13,
          fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Icon size={15} aria-hidden />
        {buttonLabel}
      </button>
      {items.length === 0 ? (
        <p style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>Nenhum arquivo adicionado.</p>
      ) : (
        <>
          <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((item) => (
              <li
                key={item.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  fontFamily: FONT.body,
                }}
              >
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 12,
                    color: t.text,
                  }}
                  title={item.label}
                >
                  {item.label}
                </span>
                {item.pendente ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "rgba(245,158,11,0.15)",
                      color: "#f59e0b",
                      border: "1px solid rgba(245,158,11,0.35)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Pendente
                  </span>
                ) : null}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemove(item.key)}
                  aria-label={`Remover ${item.label}`}
                  title={`Remover ${item.label}`}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: `1px solid ${t.cardBorder}`,
                    background: "transparent",
                    color: t.textMuted,
                    cursor: disabled ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <X size={13} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          {items.some((i) => i.pendente) ? (
            <p style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
              Arquivos serão enviados ao salvar ou publicar.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

export function ModalCriarPostagem({
  open,
  modo,
  editRef,
  categoriasCom,
  categoriasDica,
  categoriasManual,
  onClose,
  onSalvo,
}: {
  open: boolean;
  modo: "criar" | "editar";
  editRef: PostagemEditRef | null;
  categoriasCom: Categoria[];
  categoriasDica: Categoria[];
  categoriasManual: Categoria[];
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();

  const [tipoPostagem, setTipoPostagem] = useState<AcademyPostagemTipoUi | "">("");
  const [tipoSubcategoria, setTipoSubcategoria] = useState("");
  const [titulo, setTitulo] = useState("");
  const [introducao, setIntroducao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [jogosMesa, setJogosMesa] = useState<string[]>([]);
  const [codigoManual, setCodigoManual] = useState("");
  const [versaoManual, setVersaoManual] = useState("1.0");
  const [exigeCiencia, setExigeCiencia] = useState("sim");
  const [aplicavelA, setAplicavelA] = useState<string[]>([]);
  const [organogramaGrupos, setOrganogramaGrupos] = useState<RhOrgOrganogramaGrupoPrestador[]>([]);
  const [jogosOpcoes, setJogosOpcoes] = useState<string[]>([]);
  const [imagemPaths, setImagemPaths] = useState<string[]>([]);
  const [imagemFiles, setImagemFiles] = useState<File[]>([]);
  const [anexoRefs, setAnexoRefs] = useState<AcademyPortalAnexoRef[]>([]);
  const [anexoFiles, setAnexoFiles] = useState<File[]>([]);
  const [statusAtual, setStatusAtual] = useState<AcademyPostagemStatus>("rascunho");
  const [loadingData, setLoadingData] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [snapshotEdicao, setSnapshotEdicao] = useState<SnapshotPostagemEdicaoAcademy | null>(null);

  const buildSnapshot = useCallback(
    (paths: { imagens: string[]; anexos: AcademyPortalAnexoRef[] }): SnapshotPostagemEdicaoAcademy | null => {
      if (!tipoPostagem) return null;
      const jogosSnapshot =
        tipoPostagem === "manual"
          ? (jogoMesaParaPersistirManual(tipoSubcategoria, jogosMesa) ?? [])
          : jogosMesa;
      return {
        tipoPostagem,
        tipoSubcategoria,
        titulo,
        introducao,
        descricao,
        jogoMesa: jogosSnapshot,
        codigo: codigoManual,
        versao: versaoManual,
        exigeCiencia,
        aplicavelA,
        imagemPaths: paths.imagens,
        anexoRefs: paths.anexos,
      };
    },
    [tipoPostagem, tipoSubcategoria, titulo, introducao, descricao, jogosMesa, codigoManual, versaoManual, exigeCiencia, aplicavelA],
  );

  const opcoesAplicavel = useMemo(
    () => opcoesTimesAplicavelAcademyManuais(organogramaGrupos),
    [organogramaGrupos],
  );

  const itensImagemLista = useMemo((): ItemArquivoLista[] => {
    const saved = imagemPaths.map((path) => ({
      key: `saved:${path}`,
      label: path.split("/").pop() || path,
      pendente: false,
    }));
    const pending = imagemFiles.map((file, i) => ({
      key: `pending:${i}`,
      label: file.name,
      pendente: true,
    }));
    return [...saved, ...pending];
  }, [imagemPaths, imagemFiles]);

  const itensAnexoLista = useMemo((): ItemArquivoLista[] => {
    const saved = anexoRefs.map((a) => ({
      key: `saved:${a.path}`,
      label: a.nome,
      pendente: false,
    }));
    const pending = anexoFiles.map((file, i) => ({
      key: `pending:${i}`,
      label: file.name,
      pendente: true,
    }));
    return [...saved, ...pending];
  }, [anexoRefs, anexoFiles]);

  const removerImagemItem = (key: string) => {
    if (key.startsWith("saved:")) {
      const path = key.slice(6);
      setImagemPaths((prev) => prev.filter((p) => p !== path));
      return;
    }
    if (key.startsWith("pending:")) {
      const idx = Number(key.slice(8));
      setImagemFiles((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const removerAnexoItem = (key: string) => {
    if (key.startsWith("saved:")) {
      const path = key.slice(6);
      setAnexoRefs((prev) => prev.filter((a) => a.path !== path));
      return;
    }
    if (key.startsWith("pending:")) {
      const idx = Number(key.slice(8));
      setAnexoFiles((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const resetForm = useCallback(() => {
    setTipoPostagem("");
    setTipoSubcategoria("");
    setTitulo("");
    setIntroducao("");
    setDescricao("");
    setJogosMesa([]);
    setCodigoManual("");
    setVersaoManual("1.0");
    setExigeCiencia("sim");
    setAplicavelA([]);
    setImagemPaths([]);
    setImagemFiles([]);
    setAnexoRefs([]);
    setAnexoFiles([]);
    setStatusAtual("rascunho");
    setFieldErr({});
    setErro(null);
    setSnapshotEdicao(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    void carregarJogosMesasEstudio().then(setJogosOpcoes);
    void carregarOpcoesTimesOrganograma().then(({ grupos }) => setOrganogramaGrupos(grupos));
  }, [open]);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }
    if (modo === "criar") {
      resetForm();
      return;
    }
    if (!editRef) return;

    setLoadingData(true);
    void (async () => {
      const table =
        editRef.contentType === "comunicado"
          ? "academy_portal_comunicado"
          : editRef.contentType === "dica"
            ? "academy_portal_dica"
            : "academy_portal_manual";

      const { data, error } = await supabase
        .from(table)
        .select("*, categoria:academy_portal_categoria(slug, scope)")
        .eq("id", editRef.id)
        .single();

      setLoadingData(false);
      if (error || !data) {
        console.error("[ModalCriarPostagem Academy] carregar:", error);
        setErro(ERRO_CARREGAR_EDICAO);
        return;
      }

      const row = data as {
        titulo: string;
        corpo: string;
        introducao?: string | null;
        status: AcademyPostagemStatus;
        imagem_storage_path: string | null;
        anexo_storage_path: string | null;
        anexo_nome: string | null;
        jogo_mesa?: string | string[] | null;
        codigo?: string | null;
        versao?: string | null;
        requires_acknowledgment?: boolean | null;
        aplicavel_a?: string[] | null;
        categoria?: { slug: string; scope: string } | { slug: string; scope: string }[] | null;
      };

      const cat = Array.isArray(row.categoria) ? row.categoria[0] : row.categoria;
      const tipoUi = editRef.contentType;
      setTipoPostagem(tipoUi);
      if (tipoUi === "comunicado") {
        setTipoSubcategoria(labelComunicadoFromSlug(cat?.slug ?? ""));
      } else {
        setTipoSubcategoria(labelDicaManualFromSlug(cat?.slug ?? ""));
      }
      setTitulo(row.titulo);
      setIntroducao(row.introducao ?? "");
      setDescricao(row.corpo);
      setJogosMesa(normalizarJogosMesa(row.jogo_mesa));
      setCodigoManual(row.codigo?.trim() ?? "");
      setVersaoManual(row.versao?.trim() || "1.0");
      setExigeCiencia(row.requires_acknowledgment === false ? "nao" : "sim");
      setAplicavelA(row.aplicavel_a?.length ? [...row.aplicavel_a] : []);
      setImagemPaths(normalizarImagensAcademyPortal(row));
      setAnexoRefs(normalizarAnexosAcademyPortal(row));
      setImagemFiles([]);
      setAnexoFiles([]);
      setStatusAtual(row.status ?? "rascunho");
      setSnapshotEdicao({
        tipoPostagem: tipoUi,
        tipoSubcategoria:
          tipoUi === "comunicado"
            ? labelComunicadoFromSlug(cat?.slug ?? "")
            : labelDicaManualFromSlug(cat?.slug ?? ""),
        titulo: row.titulo,
        introducao: row.introducao ?? "",
        descricao: row.corpo,
        jogoMesa: normalizarJogosMesa(row.jogo_mesa),
        codigo: row.codigo?.trim() ?? "",
        versao: row.versao?.trim() || "1.0",
        exigeCiencia: row.requires_acknowledgment === false ? "nao" : "sim",
        aplicavelA: row.aplicavel_a?.length ? [...row.aplicavel_a] : [],
        imagemPaths: normalizarImagensAcademyPortal(row),
        anexoRefs: normalizarAnexosAcademyPortal(row),
      });
    })();
  }, [open, modo, editRef, resetForm]);

  const resolveCategoriaId = (scope: "comunicado" | "dica" | "manual", slug: string): string | null => {
    const list =
      scope === "comunicado" ? categoriasCom : scope === "dica" ? categoriasDica : categoriasManual;
    return list.find((c) => c.slug === slug)?.id ?? null;
  };

  const uploadArquivos = async () => {
    const imagens = [...imagemPaths];
    const anexos = [...anexoRefs];

    if (imagemFiles.length > 0) {
      const up = await uploadAcademyPortalAssets(imagemFiles, "imagens");
      if (up.error) return { imagens: [] as string[], anexos: [] as AcademyPortalAnexoRef[], err: up.error };
      imagens.push(...up.paths);
    }
    if (anexoFiles.length > 0) {
      const up = await uploadAcademyPortalAssets(anexoFiles, "anexos");
      if (up.error) return { imagens, anexos: [] as AcademyPortalAnexoRef[], err: up.error };
      anexos.push(
        ...up.paths.map((path, i) => ({
          path,
          nome: anexoFiles[i]?.name || path.split("/").pop() || "Anexo",
        })),
      );
    }
    return { imagens, anexos, err: null as string | null };
  };

  const persistir = async (acao: AcaoModal) => {
    if (!user?.id || !tipoPostagem) {
      setErro("Selecione o tipo de postagem.");
      return;
    }
    const novoStatus: AcademyPostagemStatus = acao === "salvar" ? "rascunho" : "publicado";

    if (acao === "publicar") {
      let errs: Record<string, string> = {};
      if (tipoPostagem === "comunicado") {
        errs = validarPublicarComunicado({ tipoComunicado: tipoSubcategoria, titulo, descricao });
      } else if (tipoPostagem === "dica") {
        errs = validarPublicarDica({ tipoDica: tipoSubcategoria, titulo, descricao, jogoMesa: jogosMesa });
      } else {
        errs = validarPublicarManual({
          tipoManual: tipoSubcategoria,
          titulo,
          introducao,
          descricao,
          jogoMesa: jogosMesa,
          exigeCiencia,
          aplicavelA,
        });
      }
      setFieldErr(errs);
      if (Object.keys(errs).length > 0) {
        setErro("Preencha os campos obrigatórios destacados antes de publicar.");
        return;
      }
    } else {
      setFieldErr({});
    }

    setSalvando(true);
    setErro(null);

    let up: Awaited<ReturnType<typeof uploadArquivos>>;
    try {
      up = await uploadArquivos();
    } catch (e) {
      console.error("[ModalCriarPostagem Academy] upload exception:", e);
      setSalvando(false);
      setErro(ERRO_UPLOAD);
      return;
    }
    if (up.err) {
      console.error("[ModalCriarPostagem Academy] upload:", up.err);
      setSalvando(false);
      setErro(ERRO_UPLOAD);
      return;
    }

    const now = new Date().toISOString();
    const ct = contentTypeFromTipoUi(tipoPostagem);
    const statusAnterior = modo === "editar" ? statusAtual : null;

    const registrarEdicoesRascunho = async (contentId: string) => {
      if (modo !== "editar" || statusAnterior !== "rascunho" || !snapshotEdicao || !user?.id) return;
      const depois = buildSnapshot({ imagens: up.imagens, anexos: up.anexos });
      if (!depois) return;
      const alteracoes = diffEdicaoRascunho(snapshotEdicao, depois);
      await registrarHistoricoEdicoesRascunho(supabase, ct, contentId, alteracoes, user.id);
      setSnapshotEdicao(depois);
    };

    try {
      const slug =
        tipoPostagem === "comunicado"
          ? slugComunicadoFromLabel(tipoSubcategoria || "Geral")
          : slugDicaManualFromLabel(tipoSubcategoria || "Geral");
      const scope = tipoPostagem;
      let catId = resolveCategoriaId(scope, slug);
      if (!catId) {
        const list =
          scope === "comunicado" ? categoriasCom : scope === "dica" ? categoriasDica : categoriasManual;
        catId = list[0]?.id ?? null;
      }
      if (!catId) {
        setErro("Categoria indisponível.");
        setSalvando(false);
        return;
      }

      const basePayload: Record<string, unknown> = {
        titulo: titulo.trim() || "Rascunho",
        corpo: descricao,
        categoria_id: catId,
        status: novoStatus,
        ...payloadMidiaAcademyPortal(up.imagens, up.anexos),
      };
      if (modo !== "editar") {
        basePayload.created_by = user.id;
      }
      if (novoStatus === "publicado") {
        // Re-publicar sem alterar data/autor originais da publicação.
        if (statusAnterior !== "publicado") {
          basePayload.published_at = now;
          basePayload.published_by = user.id;
        }
      } else {
        basePayload.published_at = null;
        basePayload.published_by = null;
      }

      if (tipoPostagem === "comunicado") {
        if (modo === "editar" && editRef) {
          const { error } = await supabase.from("academy_portal_comunicado").update(basePayload).eq("id", editRef.id);
          if (error) throw error;
          await registrarEdicoesRascunho(editRef.id);
          if (statusAnterior !== novoStatus) {
            await registrarHistoricoStatus(supabase, ct, editRef.id, statusAnterior, novoStatus, user.id);
          }
        } else {
          const { error } = await supabase.from("academy_portal_comunicado").insert(basePayload);
          if (error) throw error;
        }
      } else if (tipoPostagem === "dica") {
        const payload = {
          ...basePayload,
          jogo_mesa: tipoSubcategoria === "Jogos" && jogosMesa.length > 0 ? jogosMesa : null,
        };
        if (modo === "editar" && editRef) {
          const { error } = await supabase.from("academy_portal_dica").update(payload).eq("id", editRef.id);
          if (error) throw error;
          await registrarEdicoesRascunho(editRef.id);
          if (statusAnterior !== novoStatus) {
            await registrarHistoricoStatus(supabase, ct, editRef.id, statusAnterior, novoStatus, user.id);
          }
        } else {
          const { error } = await supabase.from("academy_portal_dica").insert(payload);
          if (error) throw error;
        }
      } else {
        let codigoFinal = codigoManual.trim();
        if (!codigoFinal) {
          const reserva = await reservarCodigoManual(supabase, tipoSubcategoria);
          if (reserva.error || !reserva.codigo) {
            setErro(reserva.error ?? ERRO_SALVAR);
            setSalvando(false);
            return;
          }
          codigoFinal = reserva.codigo;
        }

        const jogosManual = jogoMesaParaPersistirManual(tipoSubcategoria, jogosMesa);
        const payload = {
          ...basePayload,
          introducao: introducao.trim() || "—",
          jogo_mesa: jogosManual,
          codigo: codigoFinal,
          versao: versaoManual.trim() || "1.0",
          requires_acknowledgment: exigeCiencia === "sim",
          aplicavel_a: exigeCiencia === "sim" && aplicavelA.length > 0 ? aplicavelA : null,
        };
        if (modo === "editar" && editRef) {
          const { error } = await supabase.from("academy_portal_manual").update(payload).eq("id", editRef.id);
          if (error) throw error;
          await registrarEdicoesRascunho(editRef.id);
          if (statusAnterior !== novoStatus) {
            await registrarHistoricoStatus(supabase, ct, editRef.id, statusAnterior, novoStatus, user.id);
          }
        } else {
          const { error } = await supabase.from("academy_portal_manual").insert(payload);
          if (error) throw error;
        }
      }

      setSalvando(false);
      onSalvo();
      onClose();
    } catch (e) {
      console.error("[ModalCriarPostagem Academy] persistir:", e);
      setSalvando(false);
      setErro(ERRO_SALVAR);
    }
  };

  if (!open) return null;

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    boxSizing: "border-box",
  };

  const lbl = (id: string, text: string, obrig?: boolean) => (
    <label htmlFor={id} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
      {text}
      {obrig ? <CampoObrigatorioMark /> : null}
    </label>
  );

  const selectStyle: CSSProperties = { ...inputStyle, cursor: "pointer" };
  const tipoLocked = modo === "editar";
  const mostraJogo = tipoSubcategoria === "Jogos" && (tipoPostagem === "dica" || tipoPostagem === "manual");

  const tiposSub =
    tipoPostagem === "comunicado"
      ? TIPOS_COMUNICADO_ACADEMY
      : tipoPostagem === "dica" || tipoPostagem === "manual"
        ? TIPOS_DICA_MANUAL
        : [];

  return (
    <ModalBase maxWidth={640} onClose={onClose} zIndex={1100}>
      <ModalHeader title={modo === "editar" ? "Editar postagem" : "Nova postagem"} onClose={onClose} />

      {loadingData ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "min(70dvh, 560px)", overflowY: "auto", paddingRight: 4 }}>
          <div>
            {lbl("ap-tipo-post", "Tipo de Postagem", modo === "criar")}
            <select
              id="ap-tipo-post"
              value={tipoPostagem}
              disabled={tipoLocked}
              onChange={(e) => {
                const v = e.target.value as AcademyPostagemTipoUi | "";
                setTipoPostagem(v);
                setTipoSubcategoria("");
                setJogosMesa([]);
              }}
              style={selectStyle}
              aria-label="Tipo de postagem"
            >
              <option value="">Selecione…</option>
              <option value="comunicado">Comunicados</option>
              <option value="dica">Dicas</option>
              <option value="manual">Manuais</option>
            </select>
          </div>

          {tipoPostagem ? (
            <>
              <div>
                {lbl(
                  "ap-tipo-sub",
                  tipoPostagem === "comunicado"
                    ? "Tipo de Comunicado"
                    : tipoPostagem === "dica"
                      ? "Tipo de Dica"
                      : "Tipo de Manuais",
                  true,
                )}
                <select
                  id="ap-tipo-sub"
                  value={tipoSubcategoria}
                  onChange={(e) => {
                    setTipoSubcategoria(e.target.value);
                    if (e.target.value !== "Jogos") setJogosMesa([]);
                  }}
                  style={{ ...selectStyle, borderColor: fieldErr.tipoComunicado || fieldErr.tipoDica || fieldErr.tipoManual ? "#e84025" : t.cardBorder }}
                  aria-label="Subcategoria"
                >
                  <option value="">Selecione…</option>
                  {tiposSub.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {mostraJogo ? (
                <div>
                  {lbl("ap-jogo-label", "Qual Jogo?", true)}
                  <AcademyPortalJogosMultiSelect
                    opcoes={jogosOpcoes}
                    selected={jogosMesa}
                    onChange={setJogosMesa}
                    t={t}
                    hasError={!!fieldErr.jogoMesa}
                  />
                </div>
              ) : null}

              <div>
                {lbl("ap-titulo", "Título", true)}
                <input
                  id="ap-titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  style={{ ...inputStyle, borderColor: fieldErr.titulo ? "#e84025" : t.cardBorder }}
                  aria-label="Título"
                />
              </div>

              {tipoPostagem === "manual" ? (
                <>
                  <div>
                    {lbl("ap-versao", "Versão", true)}
                    <input
                      id="ap-versao"
                      value={versaoManual}
                      onChange={(e) => setVersaoManual(e.target.value)}
                      style={{ ...inputStyle, borderColor: fieldErr.versao ? "#e84025" : t.cardBorder }}
                      aria-label="Versão"
                    />
                  </div>
                  <div>
                    {lbl("ap-exige-ciencia", "Exige ciência do colaborador?", true)}
                    <select
                      id="ap-exige-ciencia"
                      value={exigeCiencia}
                      onChange={(e) => {
                        const v = e.target.value;
                        setExigeCiencia(v);
                        if (v === "nao") setAplicavelA([]);
                      }}
                      style={{ ...selectStyle, borderColor: fieldErr.exigeCiencia ? "#e84025" : t.cardBorder }}
                      aria-label="Exige ciência do colaborador"
                    >
                      <option value="">Selecione…</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </div>
                  {exigeCiencia === "sim" ? (
                    <div>
                      {lbl("ap-aplicavel", "Aplicável a", true)}
                      <SelectOrganogramaMultiForm
                        id="ap-aplicavel"
                        value={aplicavelA}
                        onChange={setAplicavelA}
                        options={opcoesAplicavel}
                        hasError={Boolean(fieldErr.aplicavelA)}
                        ariaLabel="Aplicável a"
                        incluirTodosPrestadores={false}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}

              {tipoPostagem === "manual" ? (
                <div>
                  {lbl("ap-intro", "Introdução", true)}
                  <textarea
                    id="ap-intro"
                    value={introducao}
                    onChange={(e) => setIntroducao(e.target.value)}
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical", borderColor: fieldErr.introducao ? "#e84025" : t.cardBorder }}
                    aria-label="Introdução"
                  />
                </div>
              ) : null}

              <div>
                {lbl("ap-desc", "Descrição", true)}
                <EditorTextoFormatado
                  value={descricao}
                  onChange={setDescricao}
                  t={t}
                  ariaLabel="Descrição"
                  hasError={!!fieldErr.descricao}
                />
              </div>

              <CampoArquivosBotao
                id="ap-imagem"
                label="Imagem/Vídeo"
                buttonLabel="Adicionar imagem ou vídeo"
                accept="image/*,video/*"
                items={itensImagemLista}
                onAdd={(files) => setImagemFiles((prev) => [...prev, ...files])}
                onRemove={removerImagemItem}
                disabled={salvando}
                t={t}
              />
              <CampoArquivosBotao
                id="ap-anexo"
                label="Anexo"
                buttonLabel="Adicionar anexo"
                items={itensAnexoLista}
                onAdd={(files) => setAnexoFiles((prev) => [...prev, ...files])}
                onRemove={removerAnexoItem}
                disabled={salvando}
                t={t}
              />
            </>
          ) : null}
        </div>
      )}

      {erro ? (
        <div
          role="alert"
          aria-live="polite"
          style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, marginTop: 16 }}
        >
          {erro}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: erro ? 12 : 20, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onClose}
          disabled={salvando}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: "transparent",
            color: t.textMuted,
            fontFamily: FONT.body,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void persistir("salvar")}
          disabled={salvando || !tipoPostagem || loadingData}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            color: t.text,
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 600,
            cursor: salvando ? "not-allowed" : "pointer",
            opacity: salvando ? 0.6 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {salvando ? <Loader2 className="app-lucide-spin" size={14} color={t.text} aria-hidden /> : null}
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => void persistir("publicar")}
          disabled={salvando || !tipoPostagem || loadingData}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: ctaGradientPortalAcademy(brand),
            color: "#fff",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 700,
            cursor: salvando ? "not-allowed" : "pointer",
            opacity: salvando ? 0.6 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {salvando ? <Loader2 className="app-lucide-spin" size={14} color="#fff" aria-hidden /> : null}
          {salvando ? "Publicando…" : "Publicar"}
        </button>
      </div>
    </ModalBase>
  );
}
