import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { ctaGradientPortalAcademy } from "../../../lib/academyPortalUi";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { EditorTextoFormatado } from "../../../components/conteudo/EditorTextoFormatado";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { SelectOrganogramaMultiForm } from "../../../components/rh/SelectOrganogramaMultiForm";
import { uploadAcademyPortalAsset } from "../../../lib/academyPortalPostagemFiles";
import { opcoesTimesAplicavelAcademyManuais } from "../../../lib/academyPortalAplicavel";
import { carregarJogosMesasEstudio, normalizarJogosMesa } from "../../../lib/academyPortalJogosMesa";
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
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [imagemPath, setImagemPath] = useState<string | null>(null);
  const [anexoPath, setAnexoPath] = useState<string | null>(null);
  const [anexoNome, setAnexoNome] = useState<string | null>(null);
  const [statusAtual, setStatusAtual] = useState<AcademyPostagemStatus>("rascunho");
  const [loadingData, setLoadingData] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [snapshotEdicao, setSnapshotEdicao] = useState<SnapshotPostagemEdicaoAcademy | null>(null);

  const buildSnapshot = useCallback(
    (paths: { imagem: string | null; anexo: string | null; anexoNome: string | null }): SnapshotPostagemEdicaoAcademy | null => {
      if (!tipoPostagem) return null;
      return {
        tipoPostagem,
        tipoSubcategoria,
        titulo,
        introducao,
        descricao,
        jogoMesa: jogosMesa,
        codigo: codigoManual,
        versao: versaoManual,
        exigeCiencia,
        aplicavelA,
        imagemPath: paths.imagem,
        anexoPath: paths.anexo,
        anexoNome: paths.anexoNome,
      };
    },
    [tipoPostagem, tipoSubcategoria, titulo, introducao, descricao, jogosMesa, codigoManual, versaoManual, exigeCiencia, aplicavelA],
  );

  const opcoesAplicavel = useMemo(
    () => opcoesTimesAplicavelAcademyManuais(organogramaGrupos),
    [organogramaGrupos],
  );

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
      setImagemPath(row.imagem_storage_path);
      setAnexoPath(row.anexo_storage_path);
      setAnexoNome(row.anexo_nome);
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
        imagemPath: row.imagem_storage_path,
        anexoPath: row.anexo_storage_path,
        anexoNome: row.anexo_nome,
      });
    })();
  }, [open, modo, editRef, resetForm]);

  const resolveCategoriaId = (scope: "comunicado" | "dica" | "manual", slug: string): string | null => {
    const list =
      scope === "comunicado" ? categoriasCom : scope === "dica" ? categoriasDica : categoriasManual;
    return list.find((c) => c.slug === slug)?.id ?? null;
  };

  const uploadArquivos = async () => {
    let img = imagemPath;
    let anx = anexoPath;
    let anxNome = anexoNome;
    if (imagemFile) {
      const up = await uploadAcademyPortalAsset(imagemFile, "imagens");
      if (up.error) return { imagem: null, anexo: null, anexoNomeOut: null, err: up.error };
      img = up.path;
    }
    if (anexoFile) {
      const up = await uploadAcademyPortalAsset(anexoFile, "anexos");
      if (up.error) return { imagem: img, anexo: null, anexoNomeOut: null, err: up.error };
      anx = up.path;
      anxNome = anexoFile.name;
    }
    return { imagem: img, anexo: anx, anexoNomeOut: anxNome, err: null };
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
      if (Object.keys(errs).length > 0) return;
    } else {
      setFieldErr({});
    }

    setSalvando(true);
    setErro(null);

    const up = await uploadArquivos();
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
      const depois = buildSnapshot({ imagem: up.imagem, anexo: up.anexo, anexoNome: up.anexoNomeOut });
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

      const basePayload = {
        titulo: titulo.trim() || "Rascunho",
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

        const payload = {
          ...basePayload,
          introducao: introducao.trim() || "—",
          jogo_mesa: tipoSubcategoria === "Jogos" && jogosMesa.length > 0 ? jogosMesa : null,
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
          {erro ? (
            <div role="alert" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
              {erro}
            </div>
          ) : null}

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

              <div>
                {lbl("ap-imagem", "Imagem/Vídeo")}
                <input
                  id="ap-imagem"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setImagemFile(e.target.files?.[0] ?? null)}
                  style={{ ...inputStyle, padding: 8 }}
                  aria-label="Imagem ou vídeo"
                />
              </div>
              <div>
                {lbl("ap-anexo", "Anexo")}
                <input
                  id="ap-anexo"
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
