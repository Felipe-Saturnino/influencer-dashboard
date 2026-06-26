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
  ChevronRight,
  Download,
  Image as ImageIcon,
  Images,
  Loader2,
  Pencil,
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
import { ModalBase, ModalHeader, ModalConfirmExcluirPadrao, ModalConfirmDelete } from "../../../components/OperacoesModal";
import { BtnExcluirLinha } from "../../../components/BtnExcluirLinha";
import { BtnExcluirComTexto } from "../../../components/BtnExcluirComTexto";
import { descricaoBotaoExcluir, descricaoModalExcluirItem, MODAL_EXCLUIR_TITULO, textoModalExcluir } from "../../../lib/excluirItemUi";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  FiltroEntidadeBarSelect,
  FiltroSemanticoTabPill,
  SelectComIcone,
  onFiltroBarTabsKeyDown,
  SectionTitle,
} from "../../../components/dashboard";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { placeholderPesquisaFiltro } from "../../../lib/searchBarConstants";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import {
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
} from "../../../lib/pageContentBoxStyles";
import {
  type MarketingEvento,
  type MarketingFotoComEvento,
  type MarketingFotoTipo,
  fmtDataEvento,
  fotoEventoEmbed,
  fotoPrestadorEmbed,
  removerMarketingFotoStorage,
  uploadMarketingFotoArquivo,
  urlAssinadaFotoPrestador,
  urlPublicaFotoGeral,
  buscarMeuColaboradorGaleria,
  fotosGeraisDoEvento,
  excluirMarketingEventoGaleria,
  buildRotulosFotoGaleria,
  rotuloExibicaoFotoGaleria,
  nomeArquivoDownloadFotoGaleria,
  MARKETING_FOTO_MIME_PERMITIDOS,
  marketingFotoTamanhoMaxMb,
} from "../../../lib/marketingGaleriaFotos";

type GaleriaBloco = {
  kind: "evento" | "prestador";
  id: string;
  titulo: string;
  sub: string;
  descricao?: string | null;
  fotos: MarketingFotoComEvento[];
};

type Aba = "galeria" | "upload";
type GaleriaSubAba = "gerais" | "minhas_fotos";

const GALERIA_SUB_ABAS: GaleriaSubAba[] = ["gerais", "minhas_fotos"];
const FILTRO_EVENTO_TODOS = "todos";
const FILTRO_PRESTADOR_TODOS = "todos";

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
const MSG_ERRO_EXCLUIR_EVENTO =
  "Não foi possível excluir o evento. Se o problema persistir, entre em contato com o suporte.";

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

/** Miniatura — retrato (colaborador) ancora no topo para não cortar o rosto. */
function estiloThumbGaleria(tipo: MarketingFotoTipo): CSSProperties {
  if (tipo === "prestador") {
    return {
      display: "block",
      width: "100%",
      aspectRatio: "3 / 4",
      objectFit: "cover",
      objectPosition: "top center",
    };
  }
  return {
    display: "block",
    width: "100%",
    aspectRatio: "4 / 3",
    objectFit: "cover",
    objectPosition: "center center",
  };
}

function aspectRatioThumbPlaceholder(tipo: MarketingFotoTipo): string {
  return tipo === "prestador" ? "3 / 4" : "4 / 3";
}

export default function GaleriaFotos() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("galeria_fotos");
  const podeUpload = perm.canCriarOk;
  const podeFiltrarPrestador = perm.canEditarOk;

  const abasDisponiveis = podeUpload ? ABAS_COM_UPLOAD : ABAS_GALERIA;
  const [aba, setAba] = useRouteTab("galeria_fotos", "galeria", abasDisponiveis);

  const [eventos, setEventos] = useState<MarketingEvento[]>([]);
  const [fotos, setFotos] = useState<MarketingFotoComEvento[]>([]);
  const [prestadores, setPrestadores] = useState<PrestadorOpcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [filtroEvento, setFiltroEvento] = useState(FILTRO_EVENTO_TODOS);
  const [galeriaSubAba, setGaleriaSubAba] = useState<GaleriaSubAba>("gerais");
  const [filtroPrestador, setFiltroPrestador] = useState(FILTRO_PRESTADOR_TODOS);
  const [buscaGaleria, setBuscaGaleria] = useState("");
  const [meuRhFuncionarioId, setMeuRhFuncionarioId] = useState<string | null>(null);
  const [meuRhFuncionarioNome, setMeuRhFuncionarioNome] = useState<string | null>(null);

  const [uploadEventoId, setUploadEventoId] = useState("");
  const [uploadTipo, setUploadTipo] = useState<MarketingFotoTipo>("geral");
  const [uploadPrestadorId, setUploadPrestadorId] = useState("");
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

  const [modalEditarEvento, setModalEditarEvento] = useState(false);
  const [editEventoId, setEditEventoId] = useState("");
  const [editEventoNome, setEditEventoNome] = useState("");
  const [editEventoData, setEditEventoData] = useState("");
  const [editEventoDescricao, setEditEventoDescricao] = useState("");
  const [salvandoEditEvento, setSalvandoEditEvento] = useState(false);
  const [editEventoErro, setEditEventoErro] = useState<string | null>(null);
  const [confirmExcluirEvento, setConfirmExcluirEvento] = useState<{
    id: string;
    nome: string;
    qtdFotos: number;
  } | null>(null);
  const [excluindoEvento, setExcluindoEvento] = useState(false);

  const [lightbox, setLightbox] = useState<MarketingFotoComEvento | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [urlsPrestador, setUrlsPrestador] = useState<Record<string, string>>({});
  const [fotoExcluir, setFotoExcluir] = useState<MarketingFotoComEvento | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [eventosExpandidos, setEventosExpandidos] = useState<Set<string>>(() => new Set());

  const pageBox = getPageContentBoxStyle(brand, t);
  const ctaGrad = getCtaCriarGradient(brand);
  const uploadPronto = uploadTipo === "geral" ? !!uploadEventoId : !!uploadPrestadorId;
  const prestadorItens = useMemo(
    () => prestadores.map((p) => ({ id: p.id, name: p.nome })),
    [prestadores],
  );
  const prestadorItensMinhas = useMemo(() => {
    if (podeFiltrarPrestador) return prestadorItens;
    if (meuRhFuncionarioId && meuRhFuncionarioNome) {
      return [{ id: meuRhFuncionarioId, name: meuRhFuncionarioNome }];
    }
    return [];
  }, [podeFiltrarPrestador, prestadorItens, meuRhFuncionarioId, meuRhFuncionarioNome]);
  const prestadorFiltroSelecionado = useMemo(() => {
    if (galeriaSubAba !== "minhas_fotos") return [];
    if (podeFiltrarPrestador) {
      return filtroPrestador === FILTRO_PRESTADOR_TODOS ? [] : [filtroPrestador];
    }
    return meuRhFuncionarioId ? [meuRhFuncionarioId] : [];
  }, [galeriaSubAba, podeFiltrarPrestador, filtroPrestador, meuRhFuncionarioId]);

  const rotulosFotoGaleria = useMemo(() => buildRotulosFotoGaleria(fotos), [fotos]);
  const forcarExpandirEventos = buscaGaleria.trim().length > 0;

  const toggleEventoExpandido = (eventoId: string) => {
    setEventosExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(eventoId)) next.delete(eventoId);
      else next.add(eventoId);
      return next;
    });
  };

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
        "id, evento_id, tipo, rh_funcionario_id, storage_path, file_name, mime_type, legenda, visivel_prestador, uploaded_by, created_at, marketing_eventos(id, nome, data_evento, descricao, ativo), rh_funcionarios!rh_funcionario_id(id, nome)",
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
      const tarefas: Promise<void>[] = [carregarEventos(), carregarFotos()];
      if (podeUpload || podeFiltrarPrestador) tarefas.push(carregarPrestadores());
      await Promise.all(tarefas);
    } catch {
      setErro(MSG_ERRO_CARREGAR);
    } finally {
      setLoading(false);
    }
  }, [carregarEventos, carregarFotos, carregarPrestadores, podeUpload, podeFiltrarPrestador]);

  useEffect(() => {
    if (perm.canView !== "nao") void recarregar();
  }, [perm.canView, recarregar]);

  useEffect(() => {
    if (perm.canView === "nao") {
      setMeuRhFuncionarioId(null);
      setMeuRhFuncionarioNome(null);
      return;
    }
    let cancel = false;
    void buscarMeuColaboradorGaleria().then((row) => {
      if (cancel) return;
      setMeuRhFuncionarioId(row?.id ?? null);
      setMeuRhFuncionarioNome(row?.nome ?? null);
    });
    return () => {
      cancel = true;
    };
  }, [perm.canView]);

  useEffect(() => {
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
  }, [fotos]);

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

  const fotosFiltradas = useMemo(() => {
    let list = fotos;

    if (galeriaSubAba === "gerais") {
      list = list.filter((f) => f.tipo === "geral");
      if (filtroEvento !== FILTRO_EVENTO_TODOS) {
        list = list.filter((f) => f.evento_id === filtroEvento);
      }
    } else {
      list = list.filter((f) => f.tipo === "prestador");
      if (podeFiltrarPrestador) {
        if (filtroPrestador !== FILTRO_PRESTADOR_TODOS) {
          list = list.filter((f) => f.rh_funcionario_id === filtroPrestador);
        }
      } else if (meuRhFuncionarioId) {
        list = list.filter((f) => f.rh_funcionario_id === meuRhFuncionarioId);
      }
      // Sem Editar: RLS já limita às fotos do próprio colaborador quando o vínculo existe.
    }

    if (buscaGaleria.trim()) {
      list = list.filter((f) => {
        const ev = fotoEventoEmbed(f);
        const prest = fotoPrestadorEmbed(f);
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
  }, [
    fotos,
    galeriaSubAba,
    filtroEvento,
    filtroPrestador,
    podeFiltrarPrestador,
    meuRhFuncionarioId,
    buscaGaleria,
  ]);

  const galeriaBlocos = useMemo((): GaleriaBloco[] => {
    const eventoMap = new Map<string, GaleriaBloco>();
    const prestadorMap = new Map<string, GaleriaBloco>();

    for (const f of fotosFiltradas) {
      if (f.tipo === "geral") {
        const ev = fotoEventoEmbed(f);
        if (!ev) continue;
        if (!eventoMap.has(ev.id)) {
          eventoMap.set(ev.id, {
            kind: "evento",
            id: ev.id,
            titulo: ev.nome,
            sub: fmtDataEvento(ev.data_evento),
            descricao: ev.descricao?.trim() || null,
            fotos: [],
          });
        }
        eventoMap.get(ev.id)!.fotos.push(f);
        continue;
      }

      const prest = fotoPrestadorEmbed(f);
      if (!prest) continue;
      if (!prestadorMap.has(prest.id)) {
        prestadorMap.set(prest.id, {
          kind: "prestador",
          id: prest.id,
          titulo: prest.nome,
          sub: "Fotos individuais",
          fotos: [],
        });
      }
      prestadorMap.get(prest.id)!.fotos.push(f);
    }

    const eventoBlocos = [...eventoMap.values()].sort((a, b) => {
      const da = fotoEventoEmbed(a.fotos[0])?.data_evento ?? "";
      const db = fotoEventoEmbed(b.fotos[0])?.data_evento ?? "";
      return db.localeCompare(da);
    });
    const prestadorBlocos = [...prestadorMap.values()].sort((a, b) =>
      compareLocaleTexto(a.titulo, b.titulo, "asc"),
    );
    return galeriaSubAba === "gerais" ? eventoBlocos : prestadorBlocos;
  }, [fotosFiltradas, galeriaSubAba]);

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

  const abrirModalEditarEvento = () => {
    setEditEventoId("");
    setEditEventoNome("");
    setEditEventoData("");
    setEditEventoDescricao("");
    setEditEventoErro(null);
    setModalEditarEvento(true);
  };

  const preencherFormEditarEvento = (eventoId: string) => {
    setEditEventoId(eventoId);
    const ev = eventos.find((e) => e.id === eventoId);
    if (!ev) {
      setEditEventoNome("");
      setEditEventoData("");
      setEditEventoDescricao("");
      return;
    }
    setEditEventoNome(ev.nome);
    setEditEventoData(ev.data_evento.split("T")[0] ?? "");
    setEditEventoDescricao(ev.descricao ?? "");
    setEditEventoErro(null);
  };

  const salvarEditarEvento = async () => {
    if (!editEventoId) {
      setEditEventoErro("Selecione um evento.");
      return;
    }
    const nome = editEventoNome.trim();
    const descricao = editEventoDescricao.trim();
    if (!nome || !editEventoData || !descricao) {
      setEditEventoErro("Informe o nome, a data e a descrição do evento.");
      return;
    }
    setSalvandoEditEvento(true);
    setEditEventoErro(null);
    try {
      const { data, error } = await supabase
        .from("marketing_eventos")
        .update({
          nome,
          data_evento: editEventoData,
          descricao,
        })
        .eq("id", editEventoId)
        .select("id, nome, data_evento, descricao, ativo, created_at, updated_at")
        .single();
      if (error) throw error;
      const atualizado = data as MarketingEvento;
      setEventos((prev) =>
        prev
          .map((e) => (e.id === atualizado.id ? atualizado : e))
          .sort((a, b) => b.data_evento.localeCompare(a.data_evento)),
      );
      setModalEditarEvento(false);
      await carregarFotos();
    } catch {
      setEditEventoErro(MSG_ERRO_SALVAR);
    } finally {
      setSalvandoEditEvento(false);
    }
  };

  const solicitarExcluirEvento = () => {
    if (!editEventoId) {
      setEditEventoErro("Selecione um evento.");
      return;
    }
    const ev = eventos.find((e) => e.id === editEventoId);
    if (!ev) return;
    const qtdFotos = fotosGeraisDoEvento(fotos, editEventoId).length;
    setConfirmExcluirEvento({ id: ev.id, nome: ev.nome, qtdFotos });
  };

  const confirmarExcluirEvento = async () => {
    if (!confirmExcluirEvento) return;
    setExcluindoEvento(true);
    try {
      const fotosDoEvento = fotosGeraisDoEvento(fotos, confirmExcluirEvento.id);
      const result = await excluirMarketingEventoGaleria(confirmExcluirEvento.id, fotosDoEvento);
      if (!result.ok) throw new Error("delete failed");
      setEventos((prev) => prev.filter((e) => e.id !== confirmExcluirEvento.id));
      setFotos((prev) => prev.filter((f) => f.evento_id !== confirmExcluirEvento.id));
      if (uploadEventoId === confirmExcluirEvento.id) setUploadEventoId("");
      if (filtroEvento === confirmExcluirEvento.id) setFiltroEvento(FILTRO_EVENTO_TODOS);
      setConfirmExcluirEvento(null);
      setModalEditarEvento(false);
    } catch {
      setEditEventoErro(MSG_ERRO_EXCLUIR_EVENTO);
      setConfirmExcluirEvento(null);
    } finally {
      setExcluindoEvento(false);
    }
  };

  const textoConfirmExcluirEvento = (nome: string, qtdFotos: number): string => {
    const fragmento = descricaoModalExcluirItem("o evento", nome);
    if (qtdFotos <= 0) return textoModalExcluir(fragmento);
    const rotuloFotos = qtdFotos === 1 ? "1 foto" : `${qtdFotos} fotos`;
    return `Deseja excluir ${fragmento}?\n\nEste evento possui ${rotuloFotos}. As imagens serão excluídas permanentemente.\n\nEsta ação não poderá ser desfeita.`;
  };

  const salvarEvento = async () => {
    const nome = eventoNome.trim();
    const descricao = eventoDescricao.trim();
    if (!nome || !eventoData || !descricao) {
      setEventoErro("Informe o nome, a data e a descrição do evento.");
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
          descricao,
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
    if (!files?.length || !uploadPronto) return;
    if (uploadTipo === "geral" && !uploadEventoId) {
      setUploadErro("Selecione um evento.");
      return;
    }
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
          uploadTipo === "geral" ? uploadEventoId : null,
          uploadTipo === "prestador" ? uploadPrestadorId : null,
        );
        if (!up.ok) {
          setUploadErro(up.message);
          break;
        }
        const { error: insErr } = await supabase.from("marketing_fotos").insert({
          evento_id: uploadTipo === "geral" ? uploadEventoId : null,
          tipo: uploadTipo,
          rh_funcionario_id: uploadTipo === "prestador" ? uploadPrestadorId : null,
          storage_path: up.path,
          file_name: file.name,
          mime_type: file.type || null,
          legenda: null,
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
    a.download = nomeArquivoDownloadFotoGaleria(f, rotulosFotoGaleria);
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const renderGradeFotosGaleria = (lista: MarketingFotoComEvento[]) => (
    <div className="app-grid-3" style={{ gap: 12 }}>
      {lista.map((f) => {
        const thumb = urlThumbnail(f);
        const rotuloFoto = rotuloExibicaoFotoGaleria(f, rotulosFotoGaleria);
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
              aria-label={`Visualizar ${rotuloFoto}`}
              title={`Visualizar ${rotuloFoto}`}
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
                  style={estiloThumbGaleria(f.tipo)}
                />
              ) : (
                <div
                  style={{
                    aspectRatio: aspectRatioThumbPlaceholder(f.tipo),
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
                {rotuloFoto}
              </span>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => void baixarFoto(f)}
                  aria-label={`Baixar ${rotuloFoto}`}
                  title={`Baixar ${rotuloFoto}`}
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
                    descricaoItem={descricaoBotaoExcluir("foto", rotuloFoto)}
                    onClick={() => setFotoExcluir(f)}
                  />
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

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
              role="tablist"
              aria-label="Modo da galeria"
              onKeyDown={(e) =>
                onFiltroBarTabsKeyDown(e, GALERIA_SUB_ABAS, setGaleriaSubAba, (k) => `tab-galeria-sub-${k}`)
              }
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
              <FiltroBarTabButton
                id="tab-galeria-sub-gerais"
                active={galeriaSubAba === "gerais"}
                aria-controls="panel-galeria-sub-gerais"
                onClick={() => setGaleriaSubAba("gerais")}
                icon={<Images {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                Gerais
              </FiltroBarTabButton>
              <FiltroBarTabButton
                id="tab-galeria-sub-minhas_fotos"
                active={galeriaSubAba === "minhas_fotos"}
                aria-controls="panel-galeria-sub-minhas_fotos"
                onClick={() => setGaleriaSubAba("minhas_fotos")}
                icon={<User {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                Minhas Fotos
              </FiltroBarTabButton>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 10,
                width: "100%",
              }}
            >
              <BarraPesquisaPagina
                value={buscaGaleria}
                onChange={setBuscaGaleria}
                placeholder={
                  galeriaSubAba === "gerais"
                    ? "Pesquisar evento ou arquivo..."
                    : "Pesquisar colaborador ou arquivo..."
                }
                aria-label={
                  galeriaSubAba === "gerais"
                    ? "Buscar fotos gerais por evento ou arquivo"
                    : "Buscar minhas fotos por colaborador ou arquivo"
                }
                wrapperStyle={{ width: "100%", maxWidth: 420, flex: "1 1 240px" }}
              />
              {galeriaSubAba === "gerais" ? (
                <SelectComIcone
                  icon={<Calendar size={15} aria-hidden />}
                  label="Eventos"
                  value={filtroEvento}
                  onChange={setFiltroEvento}
                  minWidth={220}
                  pill
                >
                  <option value={FILTRO_EVENTO_TODOS}>Todos Eventos</option>
                  {eventos.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nome} ({fmtDataEvento(ev.data_evento)})
                    </option>
                  ))}
                </SelectComIcone>
              ) : podeFiltrarPrestador ? (
                <FiltroEntidadeBarSelect
                  mode="single"
                  selected={prestadorFiltroSelecionado}
                  onChange={(ids) =>
                    setFiltroPrestador(ids[0] ?? FILTRO_PRESTADOR_TODOS)
                  }
                  items={prestadorItensMinhas}
                  icon={<User size={15} aria-hidden />}
                  triggerEmptyLabel="Todos Colaboradores"
                  ariaFilterPrefix="Filtrar por colaborador"
                  listboxAriaLabel="Colaboradores"
                  searchPlaceholder={placeholderPesquisaFiltro("Colaborador")}
                  enableSearch={prestadorItensMinhas.length > 5}
                />
              ) : meuRhFuncionarioId ? (
                <FiltroEntidadeBarSelect
                  mode="single"
                  selected={prestadorFiltroSelecionado}
                  onChange={() => {}}
                  items={prestadorItensMinhas}
                  icon={<User size={15} aria-hidden />}
                  triggerEmptyLabel={meuRhFuncionarioNome ?? "Colaborador"}
                  ariaFilterPrefix="Colaborador"
                  listboxAriaLabel="Colaborador"
                  disabled
                />
              ) : (
                <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
                  Nenhum colaborador vinculado ao seu login.
                </span>
              )}
            </div>
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
          ) : galeriaBlocos.length === 0 ? (
            <div style={pageBox}>
              <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                {galeriaSubAba === "minhas_fotos" && !podeFiltrarPrestador && !meuRhFuncionarioId
                  ? "Nenhum colaborador vinculado ao seu login."
                  : "Nenhuma foto encontrada para os filtros selecionados."}
              </div>
            </div>
          ) : (
            galeriaBlocos.map((bloco) => {
              if (bloco.kind === "evento") {
                const expandido = forcarExpandirEventos || eventosExpandidos.has(bloco.id);
                const qtdFotos = bloco.fotos.length;
                const rotuloQtdFotos = qtdFotos === 1 ? "1 foto" : `${qtdFotos} fotos`;
                return (
                  <div key={`${bloco.kind}-${bloco.id}`} style={pageBox}>
                    <button
                      type="button"
                      onClick={() => toggleEventoExpandido(bloco.id)}
                      aria-expanded={expandido}
                      aria-controls={`panel-galeria-evento-${bloco.id}`}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: 0,
                        margin: 0,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <ChevronRight
                        size={14}
                        color={t.textMuted}
                        aria-hidden
                        style={{
                          marginTop: 4,
                          transform: expandido ? "rotate(90deg)" : "rotate(0deg)",
                          transition: "transform 0.2s",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <SectionTitle sub={bloco.sub} compact>
                          {bloco.titulo}
                        </SectionTitle>
                        {bloco.descricao ? (
                          <p
                            style={{
                              margin: "4px 0 0",
                              fontSize: 13,
                              fontWeight: 400,
                              color: t.textMuted,
                              fontFamily: FONT.body,
                              lineHeight: 1.55,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {bloco.descricao}
                          </p>
                        ) : null}
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: t.textMuted,
                          fontFamily: FONT.body,
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {rotuloQtdFotos}
                      </span>
                    </button>
                    {expandido ? (
                      <div
                        id={`panel-galeria-evento-${bloco.id}`}
                        style={{ marginTop: 14 }}
                      >
                        {renderGradeFotosGaleria(bloco.fotos)}
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <div key={`${bloco.kind}-${bloco.id}`} style={pageBox}>
                  <SectionTitle sub={bloco.sub}>{bloco.titulo}</SectionTitle>
                  <div style={{ marginTop: 14 }}>{renderGradeFotosGaleria(bloco.fotos)}</div>
                </div>
              );
            })
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
                />
                <FiltroSemanticoTabPill
                  label="Fotos de colaborador"
                  semanticColor="#1e36f8"
                  active={uploadTipo === "prestador"}
                  onClick={() => {
                    setUploadTipo("prestador");
                    setUploadEventoId("");
                  }}
                />
              </div>
            </div>

            {uploadTipo === "geral" ? (
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
                {perm.canEditarOk ? (
                  <button
                    type="button"
                    onClick={abrirModalEditarEvento}
                    aria-label="Editar eventos"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 20px",
                      borderRadius: 10,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg,
                      color: t.text,
                      fontWeight: 700,
                      fontSize: 13,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <Pencil size={14} aria-hidden />
                    Editar Eventos
                  </button>
                ) : null}
              </div>
            ) : (
              <div style={{ marginTop: 16, maxWidth: 360 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 6, fontFamily: FONT.body }}>
                  Colaborador
                  <CampoObrigatorioMark />
                </label>
                <FiltroEntidadeBarSelect
                  mode="single"
                  selected={uploadPrestadorId ? [uploadPrestadorId] : []}
                  onChange={(ids) => setUploadPrestadorId(ids[0] ?? "")}
                  items={prestadorItens}
                  icon={<User size={15} aria-hidden />}
                  triggerEmptyLabel="Selecione o colaborador"
                  ariaFilterPrefix="Filtrar por colaborador"
                  listboxAriaLabel="Colaboradores"
                  searchPlaceholder={placeholderPesquisaFiltro("Colaborador")}
                  enableSearch
                />
              </div>
            )}

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
                  opacity: !uploadPronto || uploading ? 0.55 : 1,
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
                disabled={!uploadPronto || uploading}
                onChange={(e: ChangeEvent<HTMLInputElement>) => void handleUpload(e.target.files)}
                style={{ display: "none" }}
              />
              <p style={{ margin: "10px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
                JPG, PNG ou WebP — até {marketingFotoTamanhoMaxMb()} MB por arquivo.
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
                <CampoObrigatorioMark />
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

      {modalEditarEvento ? (
        <ModalBase
          onClose={() => !salvandoEditEvento && !excluindoEvento && setModalEditarEvento(false)}
          zIndex={1000}
        >
          <ModalHeader
            title="Editar evento"
            onClose={() => !salvandoEditEvento && !excluindoEvento && setModalEditarEvento(false)}
          />
          {editEventoErro ? (
            <div
              role="alert"
              aria-live="polite"
              style={{ color: "#e84025", fontSize: 12, fontFamily: FONT.body, marginBottom: 12 }}
            >
              {editEventoErro}
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body }}>
                Evento
                <CampoObrigatorioMark />
              </label>
              <SelectComIcone
                icon={<Calendar size={15} aria-hidden />}
                label="Selecionar evento para editar"
                value={editEventoId}
                onChange={preencherFormEditarEvento}
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
            {editEventoId ? (
              <>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body }}>
                    Nome do evento
                    <CampoObrigatorioMark />
                  </label>
                  <input
                    type="text"
                    value={editEventoNome}
                    onChange={(e) => setEditEventoNome(e.target.value)}
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
                    value={editEventoData}
                    onChange={(e) => setEditEventoData(e.target.value)}
                    style={inputStyle(t)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body }}>
                    Descrição
                    <CampoObrigatorioMark />
                  </label>
                  <textarea
                    value={editEventoDescricao}
                    onChange={(e) => setEditEventoDescricao(e.target.value)}
                    rows={3}
                    style={{ ...inputStyle(t), resize: "vertical" }}
                  />
                </div>
              </>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 20,
            }}
          >
            <div>
              {perm.canExcluirOk && editEventoId ? (
                <BtnExcluirComTexto
                  descricaoItem={descricaoBotaoExcluir("evento", editEventoNome.trim() || "evento")}
                  onClick={solicitarExcluirEvento}
                  disabled={salvandoEditEvento || excluindoEvento}
                />
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setModalEditarEvento(false)}
                disabled={salvandoEditEvento || excluindoEvento}
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
                onClick={() => void salvarEditarEvento()}
                disabled={!editEventoId || salvandoEditEvento || excluindoEvento}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: ctaGrad,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: salvandoEditEvento ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: !editEventoId ? 0.55 : 1,
                }}
              >
                {salvandoEditEvento ? (
                  <>
                    <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden />
                    Salvando…
                  </>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}

      {confirmExcluirEvento ? (
        <ModalConfirmDelete
          title={MODAL_EXCLUIR_TITULO}
          texto={textoConfirmExcluirEvento(confirmExcluirEvento.nome, confirmExcluirEvento.qtdFotos)}
          confirmLabel="Excluir"
          onCancel={() => !excluindoEvento && setConfirmExcluirEvento(null)}
          onConfirm={() => void confirmarExcluirEvento()}
          loading={excluindoEvento}
          zIndex={1100}
        />
      ) : null}

      {lightbox ? (
        <ModalBase onClose={() => setLightbox(null)} zIndex={1050} maxWidth={720}>
          <ModalHeader
            title={rotuloExibicaoFotoGaleria(lightbox, rotulosFotoGaleria)}
            onClose={() => setLightbox(null)}
          />
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
          descricaoItem={descricaoModalExcluirItem(
            "a foto",
            fotoExcluir ? rotuloExibicaoFotoGaleria(fotoExcluir, rotulosFotoGaleria) : "",
          )}
          onCancel={() => setFotoExcluir(null)}
          onConfirm={() => void confirmarExcluir()}
          loading={excluindo}
        />
      ) : null}
    </div>
  );
}
