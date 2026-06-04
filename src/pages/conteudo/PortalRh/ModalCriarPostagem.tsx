import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { ctaGradientPortalRh } from "../../../lib/portalRhUi";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { EditorTextoFormatado } from "../../../components/conteudo/EditorTextoFormatado";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { uploadPortalRhAsset } from "../../../lib/portalRhPostagemFiles";
import {
  contentTypeFromTipoUi,
  diffEdicaoRascunho,
  labelComunicadoFromSlug,
  labelPoliticaFromSlug,
  registrarHistoricoEdicoesRascunho,
  registrarHistoricoStatus,
  requerAprovacaoEhSim,
  requerAprovacaoLabelFromDb,
  slugComunicadoFromLabel,
  slugPoliticaFromLabel,
  statusPosPublicar,
  tipoUiFromContentType,
  validarPublicarComunicado,
  validarPublicarPolitica,
  validarPublicarRhTalk,
  type RhPostagemContentType,
  type RhPostagemStatus,
  type RhPostagemTipoUi,
  type SnapshotPostagemEdicao,
  TIPOS_COMUNICADO,
  TIPOS_POLITICA,
} from "../../../lib/portalRhWorkflow";

type Categoria = { id: string; slug: string; label: string; scope: string };

export type PostagemEditRef = {
  contentType: RhPostagemContentType;
  id: string;
};

type AcaoModal = "salvar" | "publicar";

const ERRO_CARREGAR_EDICAO = "Não foi possível carregar a postagem para edição.";
const ERRO_SALVAR =
  "Não foi possível salvar a postagem. Se o problema persistir, entre em contato com o suporte.";
const ERRO_UPLOAD = "Não foi possível enviar o arquivo. Tente novamente.";

export function ModalCriarPostagem({
  open,
  modo,
  editRef,
  categoriasCom,
  categoriasPol,
  onClose,
  onSalvo,
}: {
  open: boolean;
  modo: "criar" | "editar";
  editRef: PostagemEditRef | null;
  categoriasCom: Categoria[];
  categoriasPol: Categoria[];
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();

  const [tipoPostagem, setTipoPostagem] = useState<RhPostagemTipoUi | "">("");
  const [tipoComunicado, setTipoComunicado] = useState("");
  const [tipoPolitica, setTipoPolitica] = useState("");
  const [requerAprovacao, setRequerAprovacao] = useState("");
  const [assunto, setAssunto] = useState("");
  const [introducao, setIntroducao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [imagemPath, setImagemPath] = useState<string | null>(null);
  const [anexoPath, setAnexoPath] = useState<string | null>(null);
  const [anexoNome, setAnexoNome] = useState<string | null>(null);
  const [statusAtual, setStatusAtual] = useState<RhPostagemStatus>("rascunho");
  const [loadingData, setLoadingData] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [snapshotEdicao, setSnapshotEdicao] = useState<SnapshotPostagemEdicao | null>(null);

  const buildSnapshot = useCallback(
    (paths: { imagem: string | null; anexo: string | null; anexoNome: string | null }): SnapshotPostagemEdicao | null => {
      if (!tipoPostagem) return null;
      return {
        tipoPostagem,
        tipoComunicado,
        tipoPolitica,
        requerAprovacao,
        assunto,
        introducao,
        descricao,
        imagemPath: paths.imagem,
        anexoPath: paths.anexo,
        anexoNome: paths.anexoNome,
      };
    },
    [tipoPostagem, tipoComunicado, tipoPolitica, requerAprovacao, assunto, introducao, descricao],
  );

  const resetForm = useCallback(() => {
    setTipoPostagem("");
    setTipoComunicado("");
    setTipoPolitica("");
    setRequerAprovacao("");
    setAssunto("");
    setIntroducao("");
    setDescricao("");
    setImagemFile(null);
    setAnexoFile(null);
    setImagemPath(null);
    setAnexoPath(null);
    setAnexoNome(null);
    setStatusAtual("rascunho");
    setFieldErr({});
    setErro(null);
    setSnapshotEdicao(null);
  }, []);

  const aplicarSnapshotAposCarga = (
    tipoUi: RhPostagemTipoUi,
    snap: Omit<SnapshotPostagemEdicao, "tipoPostagem">,
  ) => {
    setSnapshotEdicao({ tipoPostagem: tipoUi, ...snap });
  };

  const carregarEdicao = useCallback(async (ref: PostagemEditRef) => {
    setLoadingData(true);
    setErro(null);
    const tipoUi = tipoUiFromContentType(ref.contentType);
    setTipoPostagem(tipoUi);

    if (ref.contentType === "comunicado") {
      const { data, error } = await supabase
        .from("rh_portal_comunicado")
        .select("*, categoria:rh_portal_categoria(slug)")
        .eq("id", ref.id)
        .single();
      setLoadingData(false);
      if (error || !data) {
        console.error("[ModalCriarPostagem] carregar comunicado:", error);
        setErro(ERRO_CARREGAR_EDICAO);
        return;
      }
      const row = data as {
        titulo: string;
        corpo: string;
        status: RhPostagemStatus;
        imagem_storage_path: string | null;
        anexo_storage_path: string | null;
        anexo_nome: string | null;
        categoria?: { slug: string } | null;
      };
      setAssunto(row.titulo);
      setDescricao(row.corpo);
      setStatusAtual(row.status);
      setImagemPath(row.imagem_storage_path);
      setAnexoPath(row.anexo_storage_path);
      setAnexoNome(row.anexo_nome);
      const tipoCom = labelComunicadoFromSlug(row.categoria?.slug ?? "");
      setTipoComunicado(tipoCom);
      aplicarSnapshotAposCarga("comunicado", {
        tipoComunicado: tipoCom,
        tipoPolitica: "",
        requerAprovacao: "",
        assunto: row.titulo,
        introducao: "",
        descricao: row.corpo,
        imagemPath: row.imagem_storage_path,
        anexoPath: row.anexo_storage_path,
        anexoNome: row.anexo_nome,
      });
    } else if (ref.contentType === "documento") {
      const { data, error } = await supabase
        .from("rh_portal_documento")
        .select("*, categoria:rh_portal_categoria(slug)")
        .eq("id", ref.id)
        .single();
      setLoadingData(false);
      if (error || !data) {
        console.error("[ModalCriarPostagem] carregar documento:", error);
        setErro(ERRO_CARREGAR_EDICAO);
        return;
      }
      const row = data as {
        titulo: string;
        corpo: string | null;
        introducao: string | null;
        status: RhPostagemStatus;
        requer_aprovacao: boolean;
        imagem_storage_path: string | null;
        anexo_storage_path: string | null;
        anexo_nome: string | null;
        categoria?: { slug: string } | null;
      };
      setAssunto(row.titulo);
      setDescricao(row.corpo ?? "");
      setIntroducao(row.introducao ?? "");
      setStatusAtual(row.status);
      const reqApr = requerAprovacaoLabelFromDb(row.requer_aprovacao);
      setRequerAprovacao(reqApr);
      setImagemPath(row.imagem_storage_path);
      setAnexoPath(row.anexo_storage_path);
      setAnexoNome(row.anexo_nome);
      const tipoPol = labelPoliticaFromSlug(row.categoria?.slug ?? "");
      setTipoPolitica(tipoPol);
      aplicarSnapshotAposCarga("politica", {
        tipoComunicado: "",
        tipoPolitica: tipoPol,
        requerAprovacao: reqApr,
        assunto: row.titulo,
        introducao: row.introducao ?? "",
        descricao: row.corpo ?? "",
        imagemPath: row.imagem_storage_path,
        anexoPath: row.anexo_storage_path,
        anexoNome: row.anexo_nome,
      });
    } else {
      const { data, error } = await supabase.from("rh_portal_rh_talk").select("*").eq("id", ref.id).single();
      setLoadingData(false);
      if (error || !data) {
        console.error("[ModalCriarPostagem] carregar rh_talk:", error);
        setErro(ERRO_CARREGAR_EDICAO);
        return;
      }
      const row = data as {
        titulo: string;
        corpo: string | null;
        introducao: string | null;
        resumo: string | null;
        status: RhPostagemStatus;
        imagem_storage_path: string | null;
        anexo_storage_path: string | null;
        anexo_nome: string | null;
      };
      setAssunto(row.titulo);
      setDescricao(row.corpo ?? row.resumo ?? "");
      setIntroducao(row.introducao ?? "");
      setStatusAtual(row.status);
      setImagemPath(row.imagem_storage_path);
      setAnexoPath(row.anexo_storage_path);
      setAnexoNome(row.anexo_nome);
      aplicarSnapshotAposCarga("rh_talk", {
        tipoComunicado: "",
        tipoPolitica: "",
        requerAprovacao: "",
        assunto: row.titulo,
        introducao: row.introducao ?? "",
        descricao: row.corpo ?? row.resumo ?? "",
        imagemPath: row.imagem_storage_path,
        anexoPath: row.anexo_storage_path,
        anexoNome: row.anexo_nome,
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (modo === "criar") {
      resetForm();
      return;
    }
    if (editRef) void carregarEdicao(editRef);
  }, [open, modo, editRef, resetForm, carregarEdicao]);

  const resolveCategoriaId = (scope: "comunicado" | "politica", slug: string | null): string | null => {
    const cats = scope === "comunicado" ? categoriasCom : categoriasPol;
    if (slug) {
      const found = cats.find((c) => c.slug === slug);
      if (found) return found.id;
    }
    return cats[0]?.id ?? null;
  };

  const uploadArquivos = async (): Promise<{
    imagem: string | null;
    anexo: string | null;
    anexoNomeOut: string | null;
    err: string | null;
  }> => {
    let img = imagemPath;
    let anx = anexoPath;
    let anxNome = anexoNome;
    if (imagemFile) {
      const up = await uploadPortalRhAsset(imagemFile, "imagens");
      if (up.error) return { imagem: null, anexo: null, anexoNomeOut: null, err: up.error };
      img = up.path;
    }
    if (anexoFile) {
      const up = await uploadPortalRhAsset(anexoFile, "anexos");
      if (up.error) return { imagem: img, anexo: null, anexoNomeOut: null, err: up.error };
      anx = up.path;
      anxNome = anexoFile.name;
    }
    return { imagem: img, anexo: anx, anexoNomeOut: anxNome, err: null };
  };

  const proximoNumeroTalk = async (): Promise<number> => {
    const { data } = await supabase.from("rh_portal_rh_talk").select("numero").order("numero", { ascending: false }).limit(1);
    const max = (data?.[0] as { numero: number } | undefined)?.numero ?? 0;
    return max + 1;
  };

  const persistir = async (acao: AcaoModal) => {
    if (!user?.id || !tipoPostagem) {
      setErro("Selecione o tipo de postagem.");
      return;
    }
    const novoStatus: RhPostagemStatus =
      acao === "salvar"
        ? "rascunho"
        : tipoPostagem === "politica"
          ? statusPosPublicar(requerAprovacaoEhSim(requerAprovacao))
          : "publicado";

    if (acao === "publicar") {
      let errs: Record<string, string> = {};
      if (tipoPostagem === "comunicado") {
        errs = validarPublicarComunicado({ tipoComunicado, assunto, descricao });
      } else if (tipoPostagem === "politica") {
        errs = validarPublicarPolitica({ tipoPolitica, requerAprovacao, assunto, introducao, descricao });
      } else {
        errs = validarPublicarRhTalk({ assunto, introducao, descricao });
      }
      setFieldErr(errs);
      if (Object.keys(errs).length > 0) return;
    } else {
      setFieldErr({});
    }

    setSalvando(true);
    setErro(null);

    const up = await uploadArquivos();
    if (up.err) {
      console.error("[ModalCriarPostagem] upload:", up.err);
      setSalvando(false);
      setErro(ERRO_UPLOAD);
      return;
    }

    const now = new Date().toISOString();
    const ct = contentTypeFromTipoUi(tipoPostagem);
    const statusAnterior = modo === "editar" ? statusAtual : null;
    const registrarEdicoesRascunho = async (contentId: string) => {
      if (modo !== "editar" || statusAnterior !== "rascunho" || !snapshotEdicao || !user?.id) return;
      const depois = buildSnapshot({ imagem: up.imagem, anexo: up.anexo, anexoNome: up.anexoNomeOut });
      if (!depois) return;
      const alteracoes = diffEdicaoRascunho(snapshotEdicao, depois);
      await registrarHistoricoEdicoesRascunho(supabase, ct, contentId, alteracoes, user.id);
      setSnapshotEdicao(depois);
    };

    try {
      if (tipoPostagem === "comunicado") {
        const catId = resolveCategoriaId("comunicado", slugComunicadoFromLabel(tipoComunicado));
        if (!catId) {
          setErro("Categoria de comunicado indisponível.");
          setSalvando(false);
          return;
        }
        const payload = {
          titulo: assunto.trim() || "Rascunho",
          corpo: descricao,
          categoria_id: catId,
          status: novoStatus,
          imagem_storage_path: up.imagem,
          anexo_storage_path: up.anexo,
          anexo_nome: up.anexoNomeOut,
          created_by: user.id,
          published_at: novoStatus === "publicado" ? now : null,
          published_by: novoStatus === "publicado" ? user.id : null,
        };
        if (modo === "editar" && editRef) {
          const { error } = await supabase.from("rh_portal_comunicado").update(payload).eq("id", editRef.id);
          if (error) {
            console.error("[ModalCriarPostagem] salvar comunicado:", error);
            setSalvando(false);
            setErro(ERRO_SALVAR);
            return;
          }
          await registrarEdicoesRascunho(editRef.id);
          if (statusAnterior !== novoStatus) {
            await registrarHistoricoStatus(supabase, ct, editRef.id, statusAnterior, novoStatus, user.id);
          }
        } else {
          const { error } = await supabase.from("rh_portal_comunicado").insert(payload);
          if (error) {
            console.error("[ModalCriarPostagem] inserir comunicado:", error);
            setSalvando(false);
            setErro(ERRO_SALVAR);
            return;
          }
        }
      } else if (tipoPostagem === "politica") {
        const catId = resolveCategoriaId("politica", slugPoliticaFromLabel(tipoPolitica));
        if (!catId) {
          setErro("Categoria de política indisponível.");
          setSalvando(false);
          return;
        }
        const reqApr = requerAprovacaoEhSim(requerAprovacao);
        const payload = {
          titulo: assunto.trim() || "Rascunho",
          corpo: descricao,
          introducao: introducao.trim() || null,
          categoria_id: catId,
          status: novoStatus,
          requer_aprovacao: reqApr,
          imagem_storage_path: up.imagem,
          anexo_storage_path: up.anexo,
          anexo_nome: up.anexoNomeOut,
          created_by: user.id,
          published_at: novoStatus === "publicado" ? now : null,
          updated_by: user.id,
        };
        if (modo === "editar" && editRef) {
          const { error } = await supabase.from("rh_portal_documento").update(payload).eq("id", editRef.id);
          if (error) {
            console.error("[ModalCriarPostagem] salvar documento:", error);
            setSalvando(false);
            setErro(ERRO_SALVAR);
            return;
          }
          await registrarEdicoesRascunho(editRef.id);
          if (statusAnterior !== novoStatus) {
            await registrarHistoricoStatus(supabase, ct, editRef.id, statusAnterior, novoStatus, user.id);
          }
        } else {
          const { error } = await supabase.from("rh_portal_documento").insert(payload);
          if (error) {
            console.error("[ModalCriarPostagem] inserir documento:", error);
            setSalvando(false);
            setErro(ERRO_SALVAR);
            return;
          }
        }
      } else {
        const payload = {
          titulo: assunto.trim() || "Rascunho",
          corpo: descricao,
          introducao: introducao.trim() || null,
          resumo: introducao.trim() || null,
          status: novoStatus,
          imagem_storage_path: up.imagem,
          anexo_storage_path: up.anexo,
          anexo_nome: up.anexoNomeOut,
          created_by: user.id,
          published_at: novoStatus === "publicado" ? now : null,
          data_reuniao: novoStatus === "publicado" ? now.slice(0, 10) : null,
          duracao_min: 0,
        };
        if (modo === "editar" && editRef) {
          let numeroExtra: { numero?: number } = {};
          if (novoStatus === "publicado") {
            const { data: cur } = await supabase.from("rh_portal_rh_talk").select("numero").eq("id", editRef.id).single();
            const numAtual = (cur as { numero: number | null } | null)?.numero;
            if (numAtual == null) numeroExtra = { numero: await proximoNumeroTalk() };
          }
          const { error } = await supabase
            .from("rh_portal_rh_talk")
            .update({ ...payload, ...numeroExtra })
            .eq("id", editRef.id);
          if (error) {
            console.error("[ModalCriarPostagem] salvar rh_talk:", error);
            setSalvando(false);
            setErro(ERRO_SALVAR);
            return;
          }
          await registrarEdicoesRascunho(editRef.id);
          if (statusAnterior !== novoStatus) {
            await registrarHistoricoStatus(supabase, ct, editRef.id, statusAnterior, novoStatus, user.id);
          }
        } else {
          const insertPayload = {
            ...payload,
            numero: novoStatus === "publicado" ? await proximoNumeroTalk() : null,
          };
          const { error } = await supabase.from("rh_portal_rh_talk").insert(insertPayload);
          if (error) {
            console.error("[ModalCriarPostagem] inserir rh_talk:", error);
            setSalvando(false);
            setErro(ERRO_SALVAR);
            return;
          }
        }
      }

      setSalvando(false);
      onSalvo();
      onClose();
    } catch (e) {
      console.error("[ModalCriarPostagem] persistir inesperado:", e);
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

  return (
    <ModalBase maxWidth={640} onClose={onClose} zIndex={1100}>
      <ModalHeader title={modo === "editar" ? "Editar postagem" : "Criar postagem"} onClose={onClose} />

      {loadingData ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "min(70dvh, 560px)", overflowY: "auto", paddingRight: 4 }}>
          {erro ? (
            <div role="alert" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
              {erro}
            </div>
          ) : null}

          <div>
            {lbl("mp-tipo-post", "Tipo de Postagem", modo === "criar")}
            <select
              id="mp-tipo-post"
              value={tipoPostagem}
              disabled={tipoLocked}
              onChange={(e) => setTipoPostagem(e.target.value as RhPostagemTipoUi | "")}
              style={selectStyle}
              aria-label="Tipo de postagem"
            >
              <option value="">Selecione…</option>
              <option value="comunicado">Comunicados</option>
              <option value="politica">Políticas e Normativas</option>
              <option value="rh_talk">RH Talks</option>
            </select>
          </div>

          {tipoPostagem === "comunicado" ? (
            <>
              <div>
                {lbl("mp-tipo-com", "Tipo de comunicado", true)}
                <select
                  id="mp-tipo-com"
                  value={tipoComunicado}
                  onChange={(e) => setTipoComunicado(e.target.value)}
                  style={{ ...selectStyle, borderColor: fieldErr.tipoComunicado ? "#e84025" : t.cardBorder }}
                  aria-label="Tipo de comunicado"
                >
                  <option value="">Selecione…</option>
                  {TIPOS_COMUNICADO.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                {lbl("mp-assunto", "Assunto", true)}
                <input
                  id="mp-assunto"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  style={{ ...inputStyle, borderColor: fieldErr.assunto ? "#e84025" : t.cardBorder }}
                  aria-label="Assunto"
                />
              </div>
              <div>
                {lbl("mp-desc", "Descrição", true)}
                <EditorTextoFormatado
                  value={descricao}
                  onChange={setDescricao}
                  t={t}
                  ariaLabel="Descrição do comunicado"
                  hasError={!!fieldErr.descricao}
                />
              </div>
            </>
          ) : null}

          {tipoPostagem === "politica" ? (
            <>
              <div>
                {lbl("mp-tipo-pol", "Tipo de Política/Normativa", true)}
                <select
                  id="mp-tipo-pol"
                  value={tipoPolitica}
                  onChange={(e) => setTipoPolitica(e.target.value)}
                  style={{ ...selectStyle, borderColor: fieldErr.tipoPolitica ? "#e84025" : t.cardBorder }}
                  aria-label="Tipo de política ou normativa"
                >
                  <option value="">Selecione…</option>
                  {TIPOS_POLITICA.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                {lbl("mp-req-apr", "É necessário aprovação?", true)}
                <select
                  id="mp-req-apr"
                  value={requerAprovacao}
                  onChange={(e) => setRequerAprovacao(e.target.value)}
                  style={{ ...selectStyle, borderColor: fieldErr.requerAprovacao ? "#e84025" : t.cardBorder }}
                  aria-label="É necessário aprovação"
                >
                  <option value="">Selecione…</option>
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </div>
              <div>
                {lbl("mp-assunto-pol", "Assunto", true)}
                <input
                  id="mp-assunto-pol"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  style={{ ...inputStyle, borderColor: fieldErr.assunto ? "#e84025" : t.cardBorder }}
                  aria-label="Assunto"
                />
              </div>
              <div>
                {lbl("mp-intro-pol", "Introdução", true)}
                <textarea
                  id="mp-intro-pol"
                  value={introducao}
                  maxLength={400}
                  onChange={(e) => setIntroducao(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", borderColor: fieldErr.introducao ? "#e84025" : t.cardBorder }}
                  aria-label="Introdução"
                />
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>
                  {introducao.length}/400
                </div>
              </div>
              <div>
                {lbl("mp-desc-pol", "Descrição", true)}
                <EditorTextoFormatado
                  value={descricao}
                  onChange={setDescricao}
                  t={t}
                  ariaLabel="Descrição da política"
                  hasError={!!fieldErr.descricao}
                />
              </div>
            </>
          ) : null}

          {tipoPostagem === "rh_talk" ? (
            <>
              <div>
                {lbl("mp-assunto-rt", "Assunto", true)}
                <input
                  id="mp-assunto-rt"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  style={{ ...inputStyle, borderColor: fieldErr.assunto ? "#e84025" : t.cardBorder }}
                  aria-label="Assunto"
                />
              </div>
              <div>
                {lbl("mp-intro-rt", "Introdução", true)}
                <textarea
                  id="mp-intro-rt"
                  value={introducao}
                  maxLength={400}
                  onChange={(e) => setIntroducao(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", borderColor: fieldErr.introducao ? "#e84025" : t.cardBorder }}
                  aria-label="Introdução"
                />
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>
                  {introducao.length}/400
                </div>
              </div>
              <div>
                {lbl("mp-desc-rt", "Descrição", true)}
                <EditorTextoFormatado
                  value={descricao}
                  onChange={setDescricao}
                  t={t}
                  ariaLabel="Descrição do RH Talks"
                  hasError={!!fieldErr.descricao}
                />
              </div>
            </>
          ) : null}

          {tipoPostagem ? (
            <>
              <div>
                {lbl("mp-imagem", "Imagem")}
                <input
                  id="mp-imagem"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImagemFile(e.target.files?.[0] ?? null)}
                  style={{ ...inputStyle, padding: 8 }}
                  aria-label="Imagem"
                />
              </div>
              <div>
                {lbl("mp-anexo", "Anexo")}
                <input
                  id="mp-anexo"
                  type="file"
                  onChange={(e) => setAnexoFile(e.target.files?.[0] ?? null)}
                  style={{ ...inputStyle, padding: 8 }}
                  aria-label="Anexo"
                />
                {anexoNome && !anexoFile ? (
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>{anexoNome}</div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, flexWrap: "wrap" }}>
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
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: ctaGradientPortalRh(brand),
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
          Publicar
        </button>
      </div>
    </ModalBase>
  );
}
