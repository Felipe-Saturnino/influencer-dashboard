import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import {
  AlertCircle,
  Calendar,
  Download,
  Image as ImageIcon,
  Images,
  Loader2,
  Upload as UploadIcon,
  User,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader, ModalConfirmExcluirPadrao } from "../../../components/OperacoesModal";
import { BtnExcluirLinha } from "../../../components/BtnExcluirLinha";
import { descricaoBotaoExcluir, descricaoModalExcluirItem } from "../../../lib/excluirItemUi";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  FiltroSemanticoTabPill,
  SelectComIcone,
  onFiltroBarTabsKeyDown,
  SectionTitle,
} from "../../../components/dashboard";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import {
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
} from "../../../lib/pageContentBoxStyles";
import {
  type MarketingEvento,
  type MarketingFotoComEvento,
  type MarketingFotoTipo,
  fmtDataEvento,
  removerMarketingFotoStorage,
  uploadMarketingFotoArquivo,
  urlAssinadaFotoPrestador,
  urlPublicaFotoGeral,
  MARKETING_FOTO_MIME_PERMITIDOS,
} from "../../../lib/marketingGaleriaFotos";

type Aba = "galeria" | "upload";
type FiltroTipoGaleria = "todos" | "geral" | "prestador";

const ABAS_GALERIA: Aba[] = ["galeria"];
const ABAS_COM_UPLOAD: Aba[] = ["galeria", "upload"];

const MSG_ERRO_CARREGAR =
  "Não foi possível carregar as fotos. Se o problema persistir, entre em contato com o suporte.";
const MSG_ERRO_SALVAR =
  "Não foi possível salvar. Se o problema persistir, entre em contato com o suporte.";
const MSG_ERRO_UPLOAD =
  "Não foi possível enviar as fotos. Se o problema persistir, entre em contato com o suporte.";
const MSG_ERRO_EXCLUIR =
  "Não foi possível excluir a foto. Se o problema persistir, entre em contato com o suporte.";

interface PrestadorOpcao {
  id: string;
  nome: string;
}

function inputStyle(t: ReturnType<typeof useApp>["theme"]): CSSProperties {
  return {
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
}

export default function GaleriaFotos() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("galeria_fotos");
  const podeUpload = perm.canCriarOk;
  const podeGerir = perm.canCriarOk || perm.canEditarOk || perm.canExcluirOk;

  const abasDisponiveis = podeUpload ? ABAS_COM_UPLOAD : ABAS_GALERIA;
  const [aba, setAba] = useRouteTab("galeria_fotos", "galeria", abasDisponiveis);

  const [eventos, setEventos] = useState<MarketingEvento[]>([]);
  const [fotos, setFotos] = useState<MarketingFotoComEvento[]>([]);
  const [prestadores, setPrestadores] = useState<PrestadorOpcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [filtroEvento, setFiltroEvento] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoGaleria>("geral");
  const [buscaGaleria, setBuscaGaleria] = useState("");

  const [uploadEventoId, setUploadEventoId] = useState("");
  const [uploadTipo, setUploadTipo] = useState<MarketingFotoTipo>("geral");
  const [uploadPrestadorId, setUploadPrestadorId] = useState("");
  const [uploadLegenda, setUploadLegenda] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadErro, setUploadErro] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalEvento, setModalEvento] = useState(false);
  const [eventoNome, setEventoNome] = useState("");
  const [eventoData, setEventoData] = useState("");
  const [eventoDescricao, setEventoDescricao] = useState("");
  const [salvandoEvento, setSalvandoEvento] = useState(false);
  const [eventoErro, setEventoErro] = useState<string | null>(null);
  const eventoNomeRef = useRef<HTMLInputElement>(null);

  const [lightbox, setLightbox] = useState<MarketingFotoComEvento | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [urlsPrestador, setUrlsPrestador] = useState<Record<string, string>>({});
  const [fotoExcluir, setFotoExcluir] = useState<MarketingFotoComEvento | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const pageBox = getPageContentBoxStyle(brand, t);
  const ctaGrad = getCtaCriarGradient(brand);

  const carregarEventos = useCallback(async () => {
    const { data, error } = await supabase
      .from("marketing_eventos")
      .select("id, nome, data_evento, descricao, ativo, created_at, updated_at")
      .eq("ativo", true)
      .order("data_evento", { ascending: false });
    if (error) throw error;
    setEventos((data ?? []) as MarketingEvento[]);
  }, []);

  const carregarFotos = useCallback(async () => {
    const { data, error } = await supabase
      .from("marketing_fotos")
      .select(
        "id, evento_id, tipo, rh_funcionario_id, storage_path, file_name, mime_type, legenda, visivel_prestador, uploaded_by, created_at, marketing_eventos(id, nome, data_evento, ativo), rh_funcionarios!rh_funcionario_id(id, nome)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    setFotos((data ?? []) as MarketingFotoComEvento[]);
  }, []);

  const carregarPrestadores = useCallback(async () => {
    const { data, error } = await supabase
      .from("rh_funcionarios")
      .select("id, nome")
      .in("status", ["ativo", "indisponivel"])
      .order("nome");
    if (error) throw error;
    setPrestadores((data ?? []).map((r) => ({ id: r.id, nome: r.nome })));
  }, []);

  const recarregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      await Promise.all([carregarEventos(), carregarFotos(), podeUpload ? carregarPrestadores() : Promise.resolve()]);
    } catch {
      setErro(MSG_ERRO_CARREGAR);
    } finally {
      setLoading(false);
    }
  }, [carregarEventos, carregarFotos, carregarPrestadores, podeUpload]);

  useEffect(() => {
    if (perm.canView !== "nao") void recarregar();
  }, [perm.canView, recarregar]);

  useEffect(() => {
    if (!podeGerir) return;
    const prestadorFotos = fotos.filter((f) => f.tipo === "prestador");
    if (!prestadorFotos.length) return;
    let cancel = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const f of prestadorFotos) {
        const url = await urlAssinadaFotoPrestador(f.storage_path);
        if (url) next[f.id] = url;
      }
      if (!cancel) setUrlsPrestador((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancel = true;
    };
  }, [fotos, podeGerir]);

  useEffect(() => {
    if (!lightbox) {
      setLightboxUrl(null);
      return;
    }
    let cancel = false;
    void (async () => {
      const url =
        lightbox.tipo === "geral"
          ? urlPublicaFotoGeral(lightbox.storage_path)
          : await urlAssinadaFotoPrestador(lightbox.storage_path);
      if (!cancel) setLightboxUrl(url);
    })();
    return () => {
      cancel = true;
    };
  }, [lightbox]);

  useEffect(() => {
    if (!podeGerir && filtroTipo !== "geral") setFiltroTipo("geral");
  }, [podeGerir, filtroTipo]);

  const fotosFiltradas = useMemo(() => {
    let list = fotos;
    if (!podeGerir) list = list.filter((f) => f.tipo === "geral");
    else if (filtroTipo !== "todos") list = list.filter((f) => f.tipo === filtroTipo);
    if (filtroEvento !== "todos") list = list.filter((f) => f.evento_id === filtroEvento);
    if (buscaGaleria.trim()) {
      list = list.filter((f) => {
        const ev = f.marketing_eventos;
        const prest = f.rh_funcionarios;
        return textoContemBuscaEmAlgum(
          buscaGaleria,
          ev?.nome,
          f.legenda,
          f.file_name,
          prest?.nome,
        );
      });
    }
    return list;
  }, [fotos, podeGerir, filtroTipo, filtroEvento, buscaGaleria]);

  const blocosPorEvento = useMemo(() => {
    const map = new Map<string, { evento: MarketingEvento; fotos: MarketingFotoComEvento[] }>();
    for (const f of fotosFiltradas) {
      const ev = f.marketing_eventos;
      if (!ev) continue;
      const key = ev.id;
      if (!map.has(key)) {
        map.set(key, {
          evento: {
            id: ev.id,
            nome: ev.nome,
            data_evento: ev.data_evento,
            ativo: ev.ativo ?? true,
          },
          fotos: [],
        });
      }
      map.get(key)!.fotos.push(f);
    }
    return [...map.values()].sort((a, b) => b.evento.data_evento.localeCompare(a.evento.data_evento));
  }, [fotosFiltradas]);

  const urlThumbnail = (f: MarketingFotoComEvento): string | null => {
    if (f.tipo === "geral") return urlPublicaFotoGeral(f.storage_path);
    return urlsPrestador[f.id] ?? null;
  };

  const abrirModalEvento = () => {
    setEventoNome("");
    setEventoData("");
    setEventoDescricao("");
    setEventoErro(null);
    setModalEvento(true);
    setTimeout(() => eventoNomeRef.current?.focus(), 100);
  };

  const salvarEvento = async () => {
    const nome = eventoNome.trim();
    if (!nome || !eventoData) {
      setEventoErro("Informe o nome e a data do evento.");
      return;
    }
    setSalvandoEvento(true);
    setEventoErro(null);
    try {
      const { data, error } = await supabase
        .from("marketing_eventos")
        .insert({
          nome,
          data_evento: eventoData,
          descricao: eventoDescricao.trim() || null,
          created_by: user?.id ?? null,
        })
        .select("id, nome, data_evento, descricao, ativo, created_at, updated_at")
        .single();
      if (error) throw error;
      const novo = data as MarketingEvento;
      setEventos((prev) => [novo, ...prev].sort((a, b) => b.data_evento.localeCompare(a.data_evento)));
      setUploadEventoId(novo.id);
      setModalEvento(false);
    } catch {
      setEventoErro(MSG_ERRO_SALVAR);
    } finally {
      setSalvandoEvento(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length || !uploadEventoId) return;
    if (uploadTipo === "prestador" && !uploadPrestadorId) {
      setUploadErro("Selecione o colaborador para fotos individuais.");
      return;
    }
    setUploading(true);
    setUploadErro(null);
    setUploadOk(null);
    let enviadas = 0;
    try {
      for (const file of Array.from(files)) {
        const up = await uploadMarketingFotoArquivo(
          file,
          uploadTipo,
          uploadEventoId,
          uploadTipo === "prestador" ? uploadPrestadorId : null,
        );
        if (!up.ok) {
          setUploadErro(up.message);
          break;
        }
        const { error: insErr } = await supabase.from("marketing_fotos").insert({
          evento_id: uploadEventoId,
          tipo: uploadTipo,
          rh_funcionario_id: uploadTipo === "prestador" ? uploadPrestadorId : null,
          storage_path: up.path,
          file_name: file.name,
          mime_type: file.type || null,
          legenda: uploadLegenda.trim() || null,
          uploaded_by: user?.id ?? null,
        });
        if (insErr) {
          await removerMarketingFotoStorage(uploadTipo, up.path);
          setUploadErro(MSG_ERRO_UPLOAD);
          break;
        }
        enviadas += 1;
      }
      if (enviadas > 0) {
        setUploadOk(
          enviadas === 1 ? "1 foto enviada com sucesso." : `${enviadas} fotos enviadas com sucesso.`,
        );
        await carregarFotos();
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } finally {
      setUploading(false);
    }
  };

  const confirmarExcluir = async () => {
    if (!fotoExcluir) return;
    setExcluindo(true);
    try {
      await removerMarketingFotoStorage(fotoExcluir.tipo, fotoExcluir.storage_path);
      const { error } = await supabase.from("marketing_fotos").delete().eq("id", fotoExcluir.id);
      if (error) throw error;
      setFotos((prev) => prev.filter((f) => f.id !== fotoExcluir.id));
      if (lightbox?.id === fotoExcluir.id) setLightbox(null);
      setFotoExcluir(null);
    } catch {
      setErro(MSG_ERRO_EXCLUIR);
      setFotoExcluir(null);
    } finally {
      setExcluindo(false);
    }
  };

  const baixarFoto = async (f: MarketingFotoComEvento) => {
    const url =
      f.tipo === "geral"
        ? urlPublicaFotoGeral(f.storage_path)
        : await urlAssinadaFotoPrestador(f.storage_path);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = f.file_name;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div className="app-page-shell">
      <PageHeader
        icon={<PageMenuIcon pageKey="galeria_fotos" />}
        title={getPageMenuLabel("galeria_fotos")}
        subtitle="Organize fotos de eventos, publique materiais gerais e vincule imagens individuais aos colaboradores."
      />

      <div style={getPageFilterBoxStyle(brand, t)}>
        <div
          role="tablist"
          aria-label="Seções da galeria"
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, abasDisponiveis, setAba, (k) => `tab-galeria-${k}`)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 10,
            width: "100%",
          }}
        >
          <FiltroBarTabButton
            id="tab-galeria-galeria"
            active={aba === "galeria"}
            aria-controls="panel-galeria-galeria"
            onClick={() => setAba("galeria")}
            icon={<Images {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Galeria
          </FiltroBarTabButton>
          {podeUpload ? (
            <FiltroBarTabButton
              id="tab-galeria-upload"
              active={aba === "upload"}
              aria-controls="panel-galeria-upload"
              onClick={() => setAba("upload")}
              icon={<UploadIcon {...FILTRO_BAR_TAB_ICON_PROPS} />}
            >
              Upload
            </FiltroBarTabButton>
          ) : null}
        </div>
      </div>

      {erro ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} aria-hidden />
          {erro}
        </div>
      ) : null}

      {aba === "galeria" ? (
        <div
          role="tabpanel"
          id="panel-galeria-galeria"
          aria-labelledby="tab-galeria-galeria"
          tabIndex={0}
        >
          <div style={getPageFilterBoxStyle(brand, t)}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 10,
                width: "100%",
                marginBottom: 10,
              }}
            >
              <FiltroSemanticoTabPill
                label="Todos os eventos"
                semanticColor={brand.primary}
                active={filtroEvento === "todos"}
                onClick={() => setFiltroEvento("todos")}
              />
              {eventos.map((ev) => (
                <FiltroSemanticoTabPill
                  key={ev.id}
                  label={ev.nome}
                  semanticColor={brand.accent}
                  active={filtroEvento === ev.id}
                  onClick={() => setFiltroEvento(filtroEvento === ev.id ? "todos" : ev.id)}
                />
              ))}
            </div>
            {podeGerir ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  width: "100%",
                  marginBottom: 10,
                }}
              >
                <FiltroSemanticoTabPill
                  label="Todas"
                  semanticColor="#6b7280"
                  active={filtroTipo === "todos"}
                  onClick={() => setFiltroTipo("todos")}
                />
                <FiltroSemanticoTabPill
                  label="Gerais"
                  semanticColor="#22c55e"
                  active={filtroTipo === "geral"}
                  onClick={() => setFiltroTipo(filtroTipo === "geral" ? "todos" : "geral")}
                />
                <FiltroSemanticoTabPill
                  label="Colaboradores"
                  semanticColor="#1e36f8"
                  active={filtroTipo === "prestador"}
                  onClick={() => setFiltroTipo(filtroTipo === "prestador" ? "todos" : "prestador")}
                />
              </div>
            ) : null}
            <BarraPesquisaPagina
              value={buscaGaleria}
              onChange={setBuscaGaleria}
              placeholder="Pesquisar evento, colaborador ou legenda..."
              aria-label="Buscar na galeria"
              wrapperStyle={{ width: "100%", maxWidth: 420 }}
            />
          </div>

          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
              <Loader2
                size={24}
                className="app-lucide-spin"
                color="var(--brand-primary, #7c3aed)"
                aria-hidden
                style={{ marginBottom: 12 }}
              />
              <div style={{ fontSize: 13 }}>Carregando…</div>
            </div>
          ) : blocosPorEvento.length === 0 ? (
            <div style={pageBox}>
              <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                Nenhuma foto encontrada para os filtros selecionados.
              </div>
            </div>
          ) : (
            blocosPorEvento.map(({ evento, fotos: fotosBloco }) => (
              <div key={evento.id} style={pageBox}>
                <SectionTitle sub={fmtDataEvento(evento.data_evento)}>{evento.nome}</SectionTitle>
                <div
                  className="app-grid-3"
                  style={{ gap: 12, marginTop: 14 }}
                >
                  {fotosBloco.map((f) => {
                    const thumb = urlThumbnail(f);
                    return (
                      <div
                        key={f.id}
                        style={{
                          position: "relative",
                          borderRadius: 12,
                          overflow: "hidden",
                          border: `1px solid ${t.cardBorder}`,
                          background: t.inputBg,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setLightbox(f)}
                          aria-label={`Visualizar ${f.file_name}`}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: 0,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                          }}
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              style={{
                                display: "block",
                                width: "100%",
                                aspectRatio: "4 / 3",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                aspectRatio: "4 / 3",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: t.textMuted,
                              }}
                            >
                              <ImageIcon size={28} aria-hidden />
                            </div>
                          )}
                        </button>
                        <div
                          style={{
                            padding: "8px 10px",
                            fontSize: 11,
                            fontFamily: FONT.body,
                            color: t.textMuted,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {f.tipo === "prestador" && f.rh_funcionarios?.nome
                              ? f.rh_funcionarios.nome
                              : f.legenda || "Foto geral"}
                          </span>
                          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => void baixarFoto(f)}
                              aria-label={`Baixar ${f.file_name}`}
                              title={`Baixar ${f.file_name}`}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                border: `1px solid ${t.cardBorder}`,
                                background: t.inputBg,
                                color: t.text,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Download size={13} aria-hidden />
                            </button>
                            {perm.canExcluirOk ? (
                              <BtnExcluirLinha
                                descricaoItem={descricaoBotaoExcluir("foto", f.file_name)}
                                onClick={() => setFotoExcluir(f)}
                              />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {aba === "upload" && podeUpload ? (
        <div
          role="tabpanel"
          id="panel-galeria-upload"
          aria-labelledby="tab-galeria-upload"
          tabIndex={0}
        >
          <div style={pageBox}>
            <SectionTitle sub="fotos gerais e individuais de colaboradores">Enviar fotos</SectionTitle>

            {uploadErro ? (
              <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginTop: 12 }}>
                {uploadErro}
              </div>
            ) : null}
            {uploadOk ? (
              <div style={{ color: "#22c55e", fontSize: 12, fontFamily: FONT.body, marginTop: 12 }}>{uploadOk}</div>
            ) : null}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 16, alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 220px", minWidth: 200 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 6, fontFamily: FONT.body }}>
                  Evento
                  <CampoObrigatorioMark />
                </label>
                <SelectComIcone
                  icon={<Calendar size={15} aria-hidden />}
                  label="Evento"
                  value={uploadEventoId}
                  onChange={setUploadEventoId}
                  minWidth={280}
                  pill={false}
                >
                  <option value="">Selecione um evento</option>
                  {eventos.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nome} ({fmtDataEvento(ev.data_evento)})
                    </option>
                  ))}
                </SelectComIcone>
              </div>
              {perm.canCriarOk ? (
                <CtaCriarButton onClick={abrirModalEvento} style={{ flexShrink: 0 }}>
                  Novo Evento
                </CtaCriarButton>
              ) : null}
            </div>

            <div style={{ marginTop: 16 }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 8, fontFamily: FONT.body }}>
                Tipo de foto
                <CampoObrigatorioMark />
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <FiltroSemanticoTabPill
                  label="Fotos gerais"
                  semanticColor="#22c55e"
                  active={uploadTipo === "geral"}
                  onClick={() => {
                    setUploadTipo("geral");
                    setUploadPrestadorId("");
                  }}
                  showClearIcon={false}
                />
                <FiltroSemanticoTabPill
                  label="Fotos de colaborador"
                  semanticColor="#1e36f8"
                  active={uploadTipo === "prestador"}
                  onClick={() => setUploadTipo("prestador")}
                  showClearIcon={false}
                />
              </div>
            </div>

            {uploadTipo === "prestador" ? (
              <div style={{ marginTop: 16, maxWidth: 360 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 6, fontFamily: FONT.body }}>
                  Colaborador
                  <CampoObrigatorioMark />
                </label>
                <SelectComIcone
                  icon={<User size={15} aria-hidden />}
                  label="Colaborador"
                  value={uploadPrestadorId}
                  onChange={setUploadPrestadorId}
                  minWidth={280}
                  pill={false}
                >
                  <option value="">Selecione o colaborador</option>
                  {prestadores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </SelectComIcone>
              </div>
            ) : null}

            <div style={{ marginTop: 16, maxWidth: 480 }}>
              <label htmlFor="galeria-legenda" style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 6, fontFamily: FONT.body }}>
                Legenda
              </label>
              <input
                id="galeria-legenda"
                type="text"
                value={uploadLegenda}
                onChange={(e) => setUploadLegenda(e.target.value)}
                style={inputStyle(t)}
                placeholder="Descrição opcional para o lote"
              />
            </div>

            <div style={{ marginTop: 20 }}>
              <label
                htmlFor="galeria-upload-input"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: ctaGrad,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: uploading ? "wait" : "pointer",
                  opacity: !uploadEventoId || uploading ? 0.55 : 1,
                }}
              >
                {uploading ? (
                  <>
                    <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden />
                    Enviando…
                  </>
                ) : (
                  <>
                    <UploadIcon size={14} aria-hidden />
                    Selecionar fotos
                  </>
                )}
              </label>
              <input
                id="galeria-upload-input"
                ref={fileInputRef}
                type="file"
                accept={MARKETING_FOTO_MIME_PERMITIDOS.join(",")}
                multiple
                disabled={!uploadEventoId || uploading}
                onChange={(e: ChangeEvent<HTMLInputElement>) => void handleUpload(e.target.files)}
                style={{ display: "none" }}
              />
              <p style={{ margin: "10px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
                JPG, PNG ou WebP — até 10 MB por arquivo.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {modalEvento ? (
        <ModalBase onClose={() => !salvandoEvento && setModalEvento(false)} zIndex={1000}>
          <ModalHeader title="Novo evento" onClose={() => !salvandoEvento && setModalEvento(false)} />
          {eventoErro ? (
            <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}>
              {eventoErro}
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body }}>
                Nome do evento
                <CampoObrigatorioMark />
              </label>
              <input
                ref={eventoNomeRef}
                type="text"
                value={eventoNome}
                onChange={(e) => setEventoNome(e.target.value)}
                style={inputStyle(t)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body }}>
                Data do evento
                <CampoObrigatorioMark />
              </label>
              <input
                type="date"
                value={eventoData}
                onChange={(e) => setEventoData(e.target.value)}
                style={inputStyle(t)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body }}>
                Descrição
              </label>
              <textarea
                value={eventoDescricao}
                onChange={(e) => setEventoDescricao(e.target.value)}
                rows={3}
                style={{ ...inputStyle(t), resize: "vertical" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={() => setModalEvento(false)}
              disabled={salvandoEvento}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                color: t.text,
                fontWeight: 600,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void salvarEvento()}
              disabled={salvandoEvento}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                background: ctaGrad,
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: salvandoEvento ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {salvandoEvento ? (
                <>
                  <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden />
                  Salvando…
                </>
              ) : (
                "Salvar"
              )}
            </button>
          </div>
        </ModalBase>
      ) : null}

      {lightbox ? (
        <ModalBase onClose={() => setLightbox(null)} zIndex={1050} maxWidth={720}>
          <ModalHeader title={lightbox.file_name} onClose={() => setLightbox(null)} />
          {lightboxUrl ? (
            <img
              src={lightboxUrl}
              alt=""
              style={{
                display: "block",
                width: "100%",
                maxHeight: "70dvh",
                objectFit: "contain",
                borderRadius: 10,
              }}
            />
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
              <Loader2 size={20} className="app-lucide-spin" aria-hidden style={{ marginBottom: 8 }} />
              Carregando…
            </div>
          )}
          {lightbox.legenda ? (
            <p style={{ marginTop: 12, fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>{lightbox.legenda}</p>
          ) : null}
          <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => void baixarFoto(lightbox)}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                color: t.text,
                fontWeight: 600,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Download size={14} aria-hidden />
              Baixar
            </button>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: t.inputBg,
                color: t.text,
                fontWeight: 600,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              Fechar
            </button>
          </div>
        </ModalBase>
      ) : null}

      {fotoExcluir ? (
        <ModalConfirmExcluirPadrao
          descricaoItem={descricaoModalExcluirItem("a foto", fotoExcluir.file_name)}
          onCancel={() => setFotoExcluir(null)}
          onConfirm={() => void confirmarExcluir()}
          loading={excluindo}
        />
      ) : null}
    </div>
  );
}
