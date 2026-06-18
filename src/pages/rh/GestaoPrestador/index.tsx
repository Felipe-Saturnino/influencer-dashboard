import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileSignature,
  FolderOpen,
  KeyRound,
  Landmark,
  Loader2,
  UserCircle2,
  X,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { RH_BANCOS_BRASIL, rhBancoParaSelectValue } from "../../../constants/rhBancosBrasil";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import {
  centavosDeStringMoeda,
  centavosInteirosDeStringMoeda,
  formatarAgencia,
  formatarCepDigitos,
  formatarCnpjDigitos,
  formatarCpfDigitos,
  formatarMoedaDigitos,
  formatarRgInput,
  formatarTelefoneBr,
  numeroDeCentavosStr,
  somenteDigitos,
  validarCpfDigitos,
  validarDataNascimentoOpcional,
  validarEmail,
} from "../../../lib/rhFuncionarioValidators";
import { buscarEnderecoPorCep } from "../../../lib/rhViaCep";
import { opcoesTurnoPorEscalaRh, turnoRhCoerenteComEscala } from "../../../lib/rhEscalaTurnos";
import type {
  RhAreaAtuacao,
  RhFuncionario,
  RhFuncionarioHistorico,
  RhFuncionarioTipoContrato,
  RhHistoricoAcaoTipo,
  RhTipoTerminoPrestacao,
} from "../../../types/rhFuncionario";
import { uploadAnexosAcaoRh } from "../../../lib/rhPrestadorAcaoFiles";
import { encontrarVinculoParaFuncionarioRow } from "../../../lib/rhOrganogramaTree";
import { syncGamePresenterDealerFromRhFuncionario } from "../../../lib/rhGamePresenterDealerSync";
import {
  mensagemFeedbackSyncPrestador,
  mensagemSucessoDesativacaoPrestadorEncerrado,
  syncUsuarioPrestadorAposSalvarRh,
} from "../../../lib/rhPrestadorUsuarioSync";
import {
  defaultsNovoPrestadorDeVinculoOrganograma,
  defaultsNovoPrestadorSemVinculoOrganograma,
} from "../../../lib/rhPrestadorNovoDefaults";
import {
  buscarRhPrestadorAcessoPlataforma,
  type RhPrestadorAcessoPlataforma,
} from "../../../lib/rhPrestadorAcessoPlataforma";
import { PrestadorAcessoPlataformaPanel } from "./PrestadorAcessoPlataformaPanel";
import { PrestadorDocumentosGestaoPanel } from "./PrestadorDocumentosGestaoPanel";
import { podeEnviarDocumentosGestaoPrestador } from "../../../lib/rhPrestadorDocumentosCadastro";
import { SelectOrganogramaTimes } from "../../../components/rh/SelectOrganogramaTimes";
import { ListaHistoricoRh, fmtDataIsoPtBr } from "../../../components/rh/ListaHistoricoRh";
import {
  cadastroRevisaoJaRegistradaPeloPrestador,
  revisaoCadastralPendenteParaFuncionario,
  prestadorExigeRevisaoCadastral,
} from "../../../lib/rhCadastroRevisao";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { FILTER_SEARCH_STAFF } from "../../../lib/searchBarConstants";
import { textoContemBusca } from "../../../lib/searchText";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader, ModalConfirmExcluirPadrao } from "../../../components/OperacoesModal";
import { descricaoModalExcluirItem } from "../../../lib/excluirItemUi";
import {
  FiltroBarTabButton,
  SkeletonTableRow,
} from "../../../components/dashboard";
import {
  FILTER_BAR_ROW_GAP,
  FILTRO_BAR_TAB_ICON_SIZE,
  handleFiltroBarTabsArrowKeyDown,
} from "../../../lib/filterBarStyles";
import {
  ESCALAS_PERMITIDAS,
  FILTRO_TIPO_ACAO_HIST_PRESTADOR_OPTS,
  NIVEIS,
  ORIGENS_CONTRATACAO,
  TIPOS_CONTRATO,
  UFS_BR,
  abaDoCampoRhModal,
  blurSensivel,
  buildRhFuncionarioPayloadFromState,
  ctaGradient,
  diffContratacaoSlices,
  escalaEhPermitida,
  estadoVazioForm,
  formDeFuncionario,
  historicoPrestadorPassaFiltroTipo,
  labelOpcaoRhTalkPortal,
  labelStatusPrestador,
  mensagemErroSupabaseRhFuncionarioSalvar,
  type RhPortalRhTalkOpcao,
  sliceContratacaoDeForm,
  sliceContratacaoDeRow,
  tiposAcaoDisponiveis,
  type AbaFuncModal,
  type AbaPaginaRhFunc,
  type FiltroStatusPrestador,
  type FiltroTipoAcaoHistoricoPrestador,
  type FormState,
  type SliceContratacao,
  valorSelectEscala,
} from "./gestaoPrestadorHelpers";


import { RhFuncModalHeaderDetalhes } from "./RhFuncModalHeaderDetalhes";
import { PrestadorKpiResumo } from "./PrestadorKpiResumo";
import { PrestadorFiltroBar } from "./PrestadorFiltroBar";
import { PrestadorTabelaColaboradores } from "./PrestadorTabelaColaboradores";
import { usePrestadorLista } from "./usePrestadorLista";

export default function RhPrestadoresPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const perm = usePermission("rh_funcionarios");

  const podeVerDadosSensiveis = user?.role === "admin" || perm.canEditarOk;
  const [erroGlobal, setErroGlobal] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroDiretoria, setFiltroDiretoria] = useState("");
  const [filtroGerencia, setFiltroGerencia] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroContrato, setFiltroContrato] = useState<RhFuncionarioTipoContrato | "todos">("todos");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusPrestador>("disponiveis");
  const [abaPagina, setAbaPagina] = useRouteTab(
    "rh_funcionarios",
    "headcount",
    ["headcount", "acoes_rh", "anotacoes"] as const,
  );
  const [modalForm, setModalForm] = useState<"fechado" | "novo" | "editar" | "ver">("fechado");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(estadoVazioForm);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [alertaValidacaoModal, setAlertaValidacaoModal] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [abaModal, setAbaModal] = useState<AbaFuncModal>("pessoais");
  const [acessoPlataforma, setAcessoPlataforma] = useState<RhPrestadorAcessoPlataforma | null>(null);
  const [acessoPlataformaLoading, setAcessoPlataformaLoading] = useState(false);
  const [acessoPlataformaErro, setAcessoPlataformaErro] = useState<string | null>(null);

  const {
    lista,
    loading,
    carregar,
    erroCarregar,
    opcoesTimes,
    organogramaGrupos,
    opcoesVinculoFlat,
    opcoesFiltroDiretoria,
    opcoesFiltroGerencia,
    opcoesFiltroSetor,
    gerenciasOpcoes,
    filtrada,
    resumoPrestadoresCards,
    filtradaOrdenada,
    liderImediatoLinha,
    onSortPrestadores,
    sortPrestadores,
    permOrg,
  } = usePrestadorLista({
    busca,
    filtroDiretoria,
    filtroGerencia,
    filtroSetor,
    filtroContrato,
    filtroStatus,
    abaPagina,
  });
  /** No modal Visualizar: false = dados sensíveis com blur (ocultar). */
  const [modalVerExibirSensiveis, setModalVerExibirSensiveis] = useState(false);
  const [tabelaSalarioVisivel, setTabelaSalarioVisivel] = useState(false);
  const [cepBuscaEmAndamento, setCepBuscaEmAndamento] = useState<null | "res" | "emp">(null);

  const [acaoModalRow, setAcaoModalRow] = useState<RhFuncionario | null>(null);
  const [acaoTipo, setAcaoTipo] = useState<"" | RhHistoricoAcaoTipo>("");
  const [acaoSalvando, setAcaoSalvando] = useState(false);
  const [acaoForm, setAcaoForm] = useState<FormState>(estadoVazioForm);
  const acaoBaselineRef = useRef<SliceContratacao | null>(null);
  const [acaoDtSaida, setAcaoDtSaida] = useState("");
  const [acaoDtRetorno, setAcaoDtRetorno] = useState("");
  const [acaoDtTermino, setAcaoDtTermino] = useState("");
  const [acaoTipoTermino, setAcaoTipoTermino] = useState<"" | RhTipoTerminoPrestacao>("");
  const [acaoObs, setAcaoObs] = useState("");
  const [acaoFiles, setAcaoFiles] = useState<File[]>([]);
  const [histModalRow, setHistModalRow] = useState<RhFuncionario | null>(null);
  const [histModalItems, setHistModalItems] = useState<RhFuncionarioHistorico[]>([]);
  const [histModalLoading, setHistModalLoading] = useState(false);
  const [histModalFiltroTipo, setHistModalFiltroTipo] = useState<FiltroTipoAcaoHistoricoPrestador>("todos");

  const [rhTalksOpen, setRhTalksOpen] = useState(false);
  const [rtTalkId, setRtTalkId] = useState("");
  const [rtTalksOpcoes, setRtTalksOpcoes] = useState<RhPortalRhTalkOpcao[]>([]);
  const [rtTalksCarregando, setRtTalksCarregando] = useState(false);
  const [rtData, setRtData] = useState("");
  const [rtBusca, setRtBusca] = useState("");
  const [rtParticipantes, setRtParticipantes] = useState<RhFuncionario[]>([]);
  const [rtSalvando, setRtSalvando] = useState(false);

  const [anotacaoModalRow, setAnotacaoModalRow] = useState<RhFuncionario | null>(null);
  const [anVisibilidade, setAnVisibilidade] = useState<"Particular" | "Publico">("Publico");
  const [anAssunto, setAnAssunto] = useState("");
  const [anData, setAnData] = useState("");
  const [anAta, setAnAta] = useState("");
  const [anFiles, setAnFiles] = useState<File[]>([]);
  const [anSalvando, setAnSalvando] = useState(false);

  const [prestadorExcluirConfirm, setPrestadorExcluirConfirm] = useState<RhFuncionario | null>(null);
  const [excluindoPrestador, setExcluindoPrestador] = useState(false);

  useEffect(() => {
    if (filtroGerencia && !gerenciasOpcoes.includes(filtroGerencia)) setFiltroGerencia("");
  }, [filtroGerencia, gerenciasOpcoes]);

  useEffect(() => {
    if (!sucessoMsg) return;
    const id = window.setTimeout(() => setSucessoMsg(null), 4000);
    return () => window.clearTimeout(id);
  }, [sucessoMsg]);

  useEffect(() => {
    if (!rhTalksOpen) return;
    let cancel = false;
    setRtTalksCarregando(true);
    void (async () => {
      const { data, error } = await supabase
        .from("rh_portal_rh_talk")
        .select("id, numero, titulo, data_reuniao, status")
        .eq("status", "publicado")
        .order("data_reuniao", { ascending: false });
      if (cancel) return;
      if (error) {
        console.error("[GestaoPrestador] carregar RH Talks portal:", error);
        setRtTalksOpcoes([]);
        setErroGlobal("Não foi possível carregar os RH Talks do Portal de RH. Se o problema persistir, entre em contato com o suporte.");
      } else {
        setRtTalksOpcoes(
          ((data ?? []) as RhPortalRhTalkOpcao[]).filter((t) => String(t.titulo ?? "").trim().length > 0),
        );
      }
      setRtTalksCarregando(false);
    })();
    return () => {
      cancel = true;
    };
  }, [rhTalksOpen]);

  useEffect(() => {
    if (!histModalRow) {
      setHistModalItems([]);
      return;
    }
    setHistModalLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from("rh_funcionario_historico")
        .select("*")
        .eq("rh_funcionario_id", histModalRow.id)
        .order("created_at", { ascending: false });
      if (error) setHistModalItems([]);
      else setHistModalItems((data ?? []) as RhFuncionarioHistorico[]);
      setHistModalLoading(false);
    })();
  }, [histModalRow]);

  const histModalItemsFiltrados = useMemo(
    () => histModalItems.filter((h) => historicoPrestadorPassaFiltroTipo(h.tipo, histModalFiltroTipo)),
    [histModalItems, histModalFiltroTipo],
  );

  useEffect(() => {
    if (!acaoModalRow) return;
    if (acaoTipo !== "revisao_contrato" && acaoTipo !== "reativacao_prestacao") return;
    setAcaoForm(formDeFuncionario(acaoModalRow));
    acaoBaselineRef.current = sliceContratacaoDeRow(acaoModalRow);
  }, [acaoTipo, acaoModalRow]);

  const usarSelectOrganograma = useMemo(
    () => permOrg.canView !== "nao" && !permOrg.loading && opcoesVinculoFlat.length > 0,
    [permOrg.canView, permOrg.loading, opcoesVinculoFlat.length],
  );

  const opcaoOrgSelecionada = useMemo(
    () =>
      encontrarVinculoParaFuncionarioRow(
        {
          org_time_id: form.org_time_id,
          org_gerencia_id: form.org_gerencia_id,
          org_diretoria_id: form.org_diretoria_id,
        },
        opcoesVinculoFlat,
      ),
    [form.org_diretoria_id, form.org_gerencia_id, form.org_time_id, opcoesVinculoFlat],
  );

  const opcaoOrgAcaoForm = useMemo(
    () =>
      encontrarVinculoParaFuncionarioRow(
        {
          org_time_id: acaoForm.org_time_id,
          org_gerencia_id: acaoForm.org_gerencia_id,
          org_diretoria_id: acaoForm.org_diretoria_id,
        },
        opcoesVinculoFlat,
      ),
    [acaoForm.org_diretoria_id, acaoForm.org_gerencia_id, acaoForm.org_time_id, opcoesVinculoFlat],
  );

  const ehPJ = form.tipo_contrato === "PJ";
  const isEstudioContratacao = form.area_atuacao === "estudio";

  const abasModalDef = useMemo(() => {
    const tabs: { key: AbaFuncModal; label: string }[] = [
      { key: "pessoais", label: "Dados pessoais" },
      { key: "contratacao", label: "Dados de contratação" },
    ];
    if (ehPJ) tabs.push({ key: "empresa", label: "Dados da empresa" });
    tabs.push({ key: "bancarios", label: "Dados bancários" });
    if (modalForm === "editar" || modalForm === "ver") {
      tabs.push({ key: "documentos", label: "Documentos" });
      tabs.push({ key: "acesso_plataforma", label: "Acesso a Plataforma" });
    }
    return tabs;
  }, [ehPJ, modalForm]);

  useEffect(() => {
    if (modalForm === "fechado") return;
    const keys = abasModalDef.map((x) => x.key);
    if (!keys.includes(abaModal)) setAbaModal(keys[0] ?? "pessoais");
  }, [modalForm, abasModalDef, abaModal]);

  const errosPorAbaModal = useMemo(() => {
    const c: Record<AbaFuncModal, number> = {
      pessoais: 0,
      contratacao: 0,
      empresa: 0,
      bancarios: 0,
      documentos: 0,
      acesso_plataforma: 0,
    };
    for (const k of Object.keys(fieldErr)) {
      c[abaDoCampoRhModal(k, ehPJ)] += 1;
    }
    return c;
  }, [fieldErr, ehPJ]);

  const carregarAcessoPlataforma = useCallback(async (funcionarioId: string) => {
    setAcessoPlataformaLoading(true);
    setAcessoPlataformaErro(null);
    const { data, error } = await buscarRhPrestadorAcessoPlataforma(funcionarioId);
    setAcessoPlataforma(data);
    setAcessoPlataformaErro(error);
    setAcessoPlataformaLoading(false);
  }, []);

  useEffect(() => {
    if (modalForm !== "ver" && modalForm !== "editar") {
      setAcessoPlataforma(null);
      setAcessoPlataformaErro(null);
      setAcessoPlataformaLoading(false);
      return;
    }
    if (!editId) return;
    void carregarAcessoPlataforma(editId);
  }, [modalForm, editId, carregarAcessoPlataforma]);

  const sugestoesParticipantesRhTalks = useMemo(() => {
    const q = rtBusca.trim();
    if (!q) return [];
    const ids = new Set(rtParticipantes.map((p) => p.id));
    return lista
      .filter((f) => !ids.has(f.id))
      .filter((f) => textoContemBusca(f.nome, rtBusca))
      .slice(0, 12);
  }, [lista, rtBusca, rtParticipantes]);

  const abrirNovo = () => {
    setForm(estadoVazioForm());
    setFieldErr({});
    setAlertaValidacaoModal(null);
    setErroGlobal(null);
    setEditId(null);
    setAbaModal("pessoais");
    setModalVerExibirSensiveis(false);
    setModalForm("novo");
  };

  const abrirEditar = (row: RhFuncionario) => {
    setForm(formDeFuncionario(row));
    setFieldErr({});
    setAlertaValidacaoModal(null);
    setErroGlobal(null);
    setEditId(row.id);
    setAbaModal("pessoais");
    setModalVerExibirSensiveis(false);
    setModalForm("editar");
  };

  const abrirVer = (row: RhFuncionario) => {
    setForm(formDeFuncionario(row));
    setFieldErr({});
    setAlertaValidacaoModal(null);
    setErroGlobal(null);
    setEditId(row.id);
    setAbaModal("pessoais");
    setModalVerExibirSensiveis(false);
    setModalForm("ver");
  };

  const inserirHistorico = useCallback(
    async (
      funcionarioId: string,
      tipo: string,
      detalhes: Record<string, unknown>,
      anexos: { name: string; path: string; publicUrl: string }[],
    ) => {
      const { error } = await supabase.from("rh_funcionario_historico").insert({
        rh_funcionario_id: funcionarioId,
        tipo,
        detalhes: { ...detalhes, usuario_label: user?.email ?? String(user?.id ?? "—") },
        anexos,
      });
      return error;
    },
    [user?.email, user?.id],
  );

  const fecharModalRegistrarAcao = () => {
    if (acaoSalvando) return;
    setAcaoModalRow(null);
    setAcaoTipo("");
    setAcaoDtSaida("");
    setAcaoDtRetorno("");
    setAcaoDtTermino("");
    setAcaoTipoTermino("");
    setAcaoObs("");
    setAcaoFiles([]);
    acaoBaselineRef.current = null;
    setAcaoForm(estadoVazioForm());
  };

  const abrirModalRegistrarAcao = (row: RhFuncionario) => {
    setErroGlobal(null);
    setSucessoMsg(null);
    setAcaoModalRow(row);
    setAcaoTipo("");
    setAcaoDtSaida("");
    setAcaoDtRetorno("");
    setAcaoDtTermino("");
    setAcaoTipoTermino("");
    setAcaoObs("");
    setAcaoFiles([]);
    acaoBaselineRef.current = null;
    setAcaoForm(formDeFuncionario(row));
  };

  const fecharModalHistorico = () => {
    setHistModalRow(null);
    setHistModalItems([]);
    setHistModalFiltroTipo("todos");
  };

  const abrirModalHistorico = (row: RhFuncionario) => {
    setHistModalFiltroTipo("todos");
    setHistModalRow(row);
  };

  const fecharModalRhTalks = () => {
    if (rtSalvando) return;
    setRhTalksOpen(false);
    setRtTalkId("");
    setRtTalksOpcoes([]);
    setRtData("");
    setRtBusca("");
    setRtParticipantes([]);
  };

  const abrirModalRhTalks = () => {
    setErroGlobal(null);
    setSucessoMsg(null);
    setRhTalksOpen(true);
    setRtTalkId("");
    setRtData("");
    setRtBusca("");
    setRtParticipantes([]);
  };

  const selecionarRhTalkPortal = (talkId: string) => {
    setRtTalkId(talkId);
    const talk = rtTalksOpcoes.find((t) => t.id === talkId);
    if (talk?.data_reuniao) {
      setRtData(talk.data_reuniao.slice(0, 10));
    }
  };

  const fecharModalRegistrarAnotacao = () => {
    if (anSalvando) return;
    setAnotacaoModalRow(null);
    setAnVisibilidade("Publico");
    setAnAssunto("");
    setAnData("");
    setAnAta("");
    setAnFiles([]);
  };

  const abrirModalRegistrarAnotacao = (row: RhFuncionario) => {
    setErroGlobal(null);
    setSucessoMsg(null);
    setAnotacaoModalRow(row);
    setAnVisibilidade("Publico");
    setAnAssunto("");
    setAnData("");
    setAnAta("");
    setAnFiles([]);
  };

  const salvarRhTalks = async () => {
    if (!perm.canEditarOk) {
      setErroGlobal("Sem permissão para registrar.");
      return;
    }
    if (!rtTalkId) {
      setErroGlobal("Selecione o RH Talks.");
      return;
    }
    if (!rtData.trim()) {
      setErroGlobal("Informe a data da participação.");
      return;
    }
    if (rtParticipantes.length === 0) {
      setErroGlobal("Adicione pelo menos um participante.");
      return;
    }
    const talk = rtTalksOpcoes.find((t) => t.id === rtTalkId);
    if (!talk) {
      setErroGlobal("RH Talks selecionado não está mais disponível. Feche o modal e tente novamente.");
      return;
    }
    setRtSalvando(true);
    setErroGlobal(null);
    try {
      const participantesPayload = rtParticipantes.map((p) => ({ id: p.id, nome: p.nome.trim() || p.nome }));
      const detalhes: Record<string, unknown> = {
        rh_talk_id: talk.id,
        rh_talk_titulo: talk.titulo.trim(),
        rh_talk_numero: talk.numero,
        data_rh_talks: rtData.trim().slice(0, 10),
        participantes: participantesPayload,
      };
      for (const p of rtParticipantes) {
        const err = await inserirHistorico(p.id, "rh_talks", detalhes, []);
        if (err) throw err;
      }
      setSucessoMsg("Participação registrada para os prestadores selecionados.");
      fecharModalRhTalks();
      await carregar();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Erro ao salvar.";
      setErroGlobal(msg);
    } finally {
      setRtSalvando(false);
    }
  };

  const salvarAnotacaoRh = async () => {
    if (!anotacaoModalRow || !perm.canEditarOk) {
      setErroGlobal(anotacaoModalRow ? "Sem permissão para registrar." : "Selecione um prestador.");
      return;
    }
    const assunto = anAssunto.trim();
    const ata = anAta.trim();
    if (!assunto) {
      setErroGlobal("Informe o assunto.");
      return;
    }
    if (!anData.trim()) {
      setErroGlobal("Informe a data da conversa.");
      return;
    }
    if (!ata) {
      setErroGlobal("Informe a ata da reunião.");
      return;
    }
    setAnSalvando(true);
    setErroGlobal(null);
    const fid = anotacaoModalRow.id;
    try {
      let anexosDb: { name: string; path: string; publicUrl: string }[] = [];
      if (anFiles.length > 0) {
        const up = await uploadAnexosAcaoRh(fid, anFiles);
        if (!up.ok) {
          setErroGlobal(up.message);
          setAnSalvando(false);
          return;
        }
        anexosDb = up.anexos;
      }
      const tipoLabel = anVisibilidade === "Particular" ? "Particular" : "Público";
      const detalhes: Record<string, unknown> = {
        tipo_visibilidade: tipoLabel,
        assunto,
        data_conversa: anData.trim().slice(0, 10),
        ata_reuniao: ata,
      };
      const err = await inserirHistorico(fid, "anotacao_rh", detalhes, anexosDb);
      if (err) throw err;
      setSucessoMsg("Anotação registrada.");
      fecharModalRegistrarAnotacao();
      await carregar();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Erro ao salvar.";
      setErroGlobal(msg);
    } finally {
      setAnSalvando(false);
    }
  };

  const handleCepBlur = (qual: "res" | "emp", cepRaw: string) => {
    void (async () => {
      const d = somenteDigitos(cepRaw);
      if (d.length !== 8) return;
      setCepBuscaEmAndamento(qual);
      const r = await buscarEnderecoPorCep(cepRaw);
      setCepBuscaEmAndamento(null);
      if (!r.ok) {
        setErroGlobal(r.message);
        return;
      }
      setErroGlobal(null);
      if (qual === "res") {
        setForm((s) => ({
          ...s,
          res_logradouro: s.res_logradouro.trim() || r.logradouro,
          res_cidade: s.res_cidade.trim() || r.cidade,
          res_estado: (s.res_estado.trim() || r.uf).toUpperCase().slice(0, 2),
        }));
      } else {
        setForm((s) => ({
          ...s,
          emp_logradouro: s.emp_logradouro.trim() || r.logradouro,
          emp_cidade: s.emp_cidade.trim() || r.cidade,
          emp_estado: (s.emp_estado.trim() || r.uf).toUpperCase().slice(0, 2),
        }));
      }
    })();
  };

  /** Só quando há texto e a escala não está na lista permitida (cadastro legado). */
  function msgEscalaLegadaInvalida(): string {
    const leg = form.escala.trim();
    return `A escala «${leg}» já não é aceita. Escolha 5x2, 3x3, 4x2 ou 5x1.`;
  }

  function obterErrosFormulario(): Record<string, string> {
    const e: Record<string, string> = {};
    const req = (k: keyof FormState, label: string, v: string) => {
      if (!v.trim()) e[k as string] = `${label} é obrigatório.`;
    };

    const usarOrg = permOrg.canView !== "nao" && !permOrg.loading && opcoesVinculoFlat.length > 0;
    const temOrgVinculo = Boolean(form.org_time_id || form.org_gerencia_id || form.org_diretoria_id);

    /** Novo ou editar: nome, e-mail, CPF (âncora de duplicidade), aba Dados de contratação; demais conforme regras. */
    if (modalForm === "novo" || modalForm === "editar") {
      req("nome", "Nome completo", form.nome);
      req("email", "E-mail", form.email);
      if (usarOrg) {
        if (!temOrgVinculo) e.org_time_id = "Selecione o organograma.";
      } else {
        req("setor", "Setor", form.setor);
      }
      req("cargo", "Função", form.cargo);
      req("nivel", "Nível", form.nivel);
      req("data_inicio", "Data de início", form.data_inicio);
      if (form.area_atuacao !== "estudio" && form.area_atuacao !== "escritorio") {
        e.area_atuacao = "Selecione a área de atuação.";
      }
      if (!form.escala.trim()) e.escala = "Escala é obrigatória.";
      else if (!escalaEhPermitida(form.escala)) e.escala = msgEscalaLegadaInvalida();

      const cpfD = somenteDigitos(form.cpf);
      if (cpfD.length === 0) e.cpf = "CPF é obrigatório.";
      else if (cpfD.length !== 11) e.cpf = "CPF Inválido";
      else if (!validarCpfDigitos(cpfD)) e.cpf = "CPF Inválido";

      if (form.email.trim() && !validarEmail(form.email)) e.email = "E-mail inválido.";
      if (form.email_spin.trim() && !validarEmail(form.email_spin.trim())) {
        e.email_spin = "E-mail Spin inválido.";
      }
      if (form.data_nascimento.trim() && !validarDataNascimentoOpcional(form.data_nascimento)) {
        e.data_nascimento = "Data de nascimento inválida.";
      }
      if (form.origem_contratacao === "indicacao" && !form.quem_indicou.trim()) {
        e.quem_indicou = "Quem indicou? é obrigatório.";
      }

      const telD = somenteDigitos(form.telefone);
      if (telD.length > 0 && (telD.length < 10 || telD.length > 11)) e.telefone = "Telefone inválido.";

      if (podeVerDadosSensiveis) {
        if (form.area_atuacao === "estudio") {
          const rh = centavosInteirosDeStringMoeda(form.remuneracaoHoraCentavos);
          if (rh <= 0) e.remuneracaoHoraCentavos = "Informe a remuneração por hora.";
          if (!form.staff_turno.trim()) e.staff_turno = "Selecione o turno.";
        } else if (form.area_atuacao === "escritorio") {
          const sal = numeroDeCentavosStr(form.salarioCentavos);
          if (sal <= 0) e.salarioCentavos = "Informe a remuneração mensal.";
        }
      }

      return e;
    }

    return e;
  }

  const montarPayload = (statusPrestador: RhFuncionario["status"]) =>
    buildRhFuncionarioPayloadFromState(form, statusPrestador, podeVerDadosSensiveis, modalForm === "novo");

  /**
   * E-mails para a Edge: valor válido do formulário, senão o já gravado em `row`
   * (evita que `emailSpin: ""` / `emailPessoal: ""` apaguem os da BD e impeçam a sync
   * quando o operador não vê dados sensíveis ou não abriu o separador de e-mails).
   */
  const dispararSyncUsuarioPrestadorSeEmailSpin = async (row: RhFuncionario, emailsDoFormulario?: { emailSpin?: string; emailPessoal?: string }) => {
    const emailValidoNormalizado = (s: string | null | undefined) => {
      const t = String(s ?? "").trim().toLowerCase();
      return t.length > 0 && validarEmail(t) ? t : "";
    };
    const spin =
      emailValidoNormalizado(emailsDoFormulario?.emailSpin) || emailValidoNormalizado(row.email_spin ?? null);
    const personal =
      emailValidoNormalizado(emailsDoFormulario?.emailPessoal) || emailValidoNormalizado(row.email ?? null);
    /** Sempre chamar a Edge: ela lê `email` / `email_spin` em `rh_funcionarios` quando o body não traz reforço. */
    const res = await syncUsuarioPrestadorAposSalvarRh(row.id, {
      ...(spin ? { emailSpin: spin } : {}),
      ...(personal ? { emailPessoal: personal } : {}),
    });
    const m = mensagemFeedbackSyncPrestador(res);
    if (m) setErroGlobal(m);
  };

  const salvar = async (opts?: { outro?: boolean }) => {
    if (modalForm === "ver") return;
    setAlertaValidacaoModal(null);
    const errosVal = obterErrosFormulario();
    if (Object.keys(errosVal).length > 0) {
      setFieldErr(errosVal);
      const ordemAbas = abasModalDef.map((tb) => tb.key);
      for (const aba of ordemAbas) {
        if (Object.keys(errosVal).some((k) => abaDoCampoRhModal(k, ehPJ) === aba)) {
          setAbaModal(aba);
          break;
        }
      }
      const n = Object.keys(errosVal).length;
      const linhas = Object.values(errosVal).map((msg) => `• ${msg}`);
      setAlertaValidacaoModal(
        `Não foi possível salvar (${n} ${n === 1 ? "pendência" : "pendências"}). Revise os campos destacados abaixo:\n${linhas.join("\n")}`,
      );
      return;
    }
    setFieldErr({});
    setSalvando(true);
    setErroGlobal(null);
    const payload = montarPayload("ativo");
    const cadastrarOutro = opts?.outro === true;

    if (modalForm === "novo") {
      const { data: criado, error } = await supabase.from("rh_funcionarios").insert(payload).select("*").single();
      setSalvando(false);
      if (error) {
        setErroGlobal(mensagemErroSupabaseRhFuncionarioSalvar(error));
        return;
      }
      if (criado) await syncGamePresenterDealerFromRhFuncionario(criado as RhFuncionario);
      if (criado) {
        try {
          await dispararSyncUsuarioPrestadorSeEmailSpin(criado as RhFuncionario, {
            emailSpin: form.email_spin.trim(),
            emailPessoal: form.email.trim(),
          });
        } catch (e) {
          setErroGlobal(
            `Funcionário cadastrado, mas a sincronização com Gestão de Usuários falhou: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
      setSucessoMsg("Funcionário cadastrado.");
      await carregar();
      if (cadastrarOutro) {
        setForm(estadoVazioForm());
        setFieldErr({});
        setAlertaValidacaoModal(null);
        setAbaModal("pessoais");
      } else {
        setModalForm("fechado");
        setAbaModal("pessoais");
        setAlertaValidacaoModal(null);
      }
      return;
    }

    if (modalForm === "editar" && editId) {
      const atual = lista.find((x) => x.id === editId);
      const payloadEdit = montarPayload(atual?.status ?? "ativo");
      const salarioFinal = podeVerDadosSensiveis ? payloadEdit.salario : (atual?.salario ?? 0);
      let mesclado =
        !podeVerDadosSensiveis && atual
          ? {
              ...payloadEdit,
              salario: salarioFinal,
              area_atuacao: atual.area_atuacao ?? "escritorio",
              remuneracao_hora_centavos: atual.remuneracao_hora_centavos ?? null,
              staff_turno: atual.staff_turno ?? null,
              banco: atual.banco,
              agencia: atual.agencia,
              conta_corrente: atual.conta_corrente,
              pix: atual.pix,
            }
          : { ...payloadEdit, salario: salarioFinal };
      /** Não reenviar CPF idêntico no UPDATE: âncora de duplicidade aplica-se ao insert (Novo); evita ruído com índice único. */
      if (atual && somenteDigitos(form.cpf) === somenteDigitos(atual.cpf ?? "")) {
        const { cpf: _omitCpf, ...semCpf } = mesclado;
        void _omitCpf;
        mesclado = semCpf as typeof mesclado;
      }
      const { data: atualizadoRh, error } = await supabase.from("rh_funcionarios").update(mesclado).eq("id", editId).select("*").single();
      setSalvando(false);
      if (error) {
        setErroGlobal(mensagemErroSupabaseRhFuncionarioSalvar(error));
        return;
      }
      if (atualizadoRh) await syncGamePresenterDealerFromRhFuncionario(atualizadoRh as RhFuncionario);
      if (atualizadoRh) {
        try {
          await dispararSyncUsuarioPrestadorSeEmailSpin(atualizadoRh as RhFuncionario, {
            emailSpin: form.email_spin.trim(),
            emailPessoal: form.email.trim(),
          });
        } catch (e) {
          setErroGlobal(
            `Dados atualizados, mas a sincronização com Gestão de Usuários falhou: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
      setSucessoMsg("Dados atualizados.");
      setModalForm("fechado");
      setAbaModal("pessoais");
      setAlertaValidacaoModal(null);
      await carregar();
      return;
    }

    setSalvando(false);
    if (modalForm === "editar" && !editId) {
      setErroGlobal("Não foi possível identificar o registro a atualizar. Feche o modal e abra novamente.");
    }
  };

  const salvarAcaoRh = async () => {
    if (!acaoModalRow || !acaoTipo) {
      setErroGlobal("Selecione o tipo de ação.");
      return;
    }
    setAcaoSalvando(true);
    setErroGlobal(null);
    const fid = acaoModalRow.id;
    let anexosDb: { name: string; path: string; publicUrl: string }[] = [];
    if (acaoFiles.length > 0 && acaoTipo !== "reativacao_prestacao") {
      const up = await uploadAnexosAcaoRh(fid, acaoFiles);
      if (!up.ok) {
        setErroGlobal(up.message);
        setAcaoSalvando(false);
        return;
      }
      anexosDb = up.anexos;
    }
    const fmtSal = (c: string) => fmtBRL(numeroDeCentavosStr(c));
    try {
      switch (acaoTipo) {
        case "revisao_contrato": {
          const usarST = permOrg.canView !== "nao" && !permOrg.loading && opcoesVinculoFlat.length > 0;
          const temOrgAcao = Boolean(acaoForm.org_time_id || acaoForm.org_gerencia_id || acaoForm.org_diretoria_id);
          if (usarST && !temOrgAcao) {
            setErroGlobal("Selecione o organograma.");
            setAcaoSalvando(false);
            return;
          }
          if (!usarST && !acaoForm.setor.trim()) {
            setErroGlobal("Informe o setor.");
            setAcaoSalvando(false);
            return;
          }
          if (!acaoForm.cargo.trim() || !acaoForm.nivel.trim() || !acaoForm.escala.trim()) {
            setErroGlobal("Preencha função, nível e escala.");
            setAcaoSalvando(false);
            return;
          }
          if (!escalaEhPermitida(acaoForm.escala)) {
            setErroGlobal("Selecione uma escala válida: 5x2, 3x3, 4x2 ou 5x1.");
            setAcaoSalvando(false);
            return;
          }
          if (!acaoForm.data_funcao.trim()) {
            setErroGlobal("Informe a data da Função.");
            setAcaoSalvando(false);
            return;
          }
          const areaAc: RhAreaAtuacao =
            acaoForm.area_atuacao === "estudio" || acaoForm.area_atuacao === "escritorio"
              ? acaoForm.area_atuacao
              : "escritorio";
          const isEstudioAc = areaAc === "estudio";
          if (podeVerDadosSensiveis) {
            if (isEstudioAc) {
              if (centavosInteirosDeStringMoeda(acaoForm.remuneracaoHoraCentavos) <= 0) {
                setErroGlobal("Informe a remuneração por hora.");
                setAcaoSalvando(false);
                return;
              }
              if (!acaoForm.staff_turno.trim()) {
                setErroGlobal("Selecione o turno.");
                setAcaoSalvando(false);
                return;
              }
            } else if (numeroDeCentavosStr(acaoForm.salarioCentavos) <= 0) {
              setErroGlobal("Informe a remuneração mensal.");
              setAcaoSalvando(false);
              return;
            }
          }
          if (acaoForm.email_spin.trim() && !validarEmail(acaoForm.email_spin.trim())) {
            setErroGlobal("E-mail Spin inválido.");
            setAcaoSalvando(false);
            return;
          }
          const antes = acaoBaselineRef.current ?? sliceContratacaoDeRow(acaoModalRow);
          const depois = sliceContratacaoDeForm(acaoForm);
          const diff = diffContratacaoSlices(antes, depois, opcoesVinculoFlat, opcoesTimes, fmtSal);
          if (diff.length === 0) {
            setErroGlobal("Nenhuma alteração para registrar.");
            setAcaoSalvando(false);
            return;
          }
          const sal = !podeVerDadosSensiveis
            ? acaoModalRow.salario
            : isEstudioAc
              ? 0
              : numeroDeCentavosStr(acaoForm.salarioCentavos);
          const remuneracao_hora_centavos = !podeVerDadosSensiveis
            ? acaoModalRow.remuneracao_hora_centavos ?? null
            : isEstudioAc
              ? centavosInteirosDeStringMoeda(acaoForm.remuneracaoHoraCentavos)
              : null;
          const staff_turno = !podeVerDadosSensiveis
            ? acaoModalRow.staff_turno ?? null
            : isEstudioAc
              ? acaoForm.staff_turno.trim() || null
              : null;
          const df = acaoForm.data_funcao.trim().slice(0, 10);
          const { error: eUp } = await supabase
            .from("rh_funcionarios")
            .update({
              org_diretoria_id: acaoForm.org_diretoria_id || null,
              org_gerencia_id: acaoForm.org_gerencia_id || null,
              org_time_id: acaoForm.org_time_id || null,
              setor: acaoForm.setor.trim(),
              cargo: acaoForm.cargo.trim(),
              nivel: acaoForm.nivel.trim(),
              area_atuacao: areaAc,
              remuneracao_hora_centavos,
              staff_turno,
              salario: sal,
              tipo_contrato: acaoForm.tipo_contrato,
              escala: acaoForm.escala.trim(),
              data_funcao: df,
              email_spin: acaoForm.email_spin.trim() ? acaoForm.email_spin.trim().toLowerCase() : null,
            })
            .eq("id", fid);
          if (eUp) throw eUp;
          const errH = await inserirHistorico(fid, "revisao_contrato", { alteracoes: diff }, anexosDb);
          if (errH) throw errH;
          break;
        }
        case "periodo_indisponibilidade": {
          if (!acaoDtSaida.trim()) {
            setErroGlobal("Informe a data de saída.");
            setAcaoSalvando(false);
            return;
          }
          if (!acaoDtRetorno.trim()) {
            setErroGlobal("Informe a data de retorno.");
            setAcaoSalvando(false);
            return;
          }
          if (!acaoObs.trim()) {
            setErroGlobal("Informe a observação.");
            setAcaoSalvando(false);
            return;
          }
          if (acaoDtRetorno < acaoDtSaida) {
            setErroGlobal("A data de retorno não pode ser anterior à data de saída.");
            setAcaoSalvando(false);
            return;
          }
          const { error: eUp } = await supabase.from("rh_funcionarios").update({ status: "indisponivel" }).eq("id", fid);
          if (eUp) throw eUp;
          const det: Record<string, unknown> = { data_saida: acaoDtSaida, data_retorno: acaoDtRetorno.trim(), observacao: acaoObs.trim() };
          const errH = await inserirHistorico(fid, "periodo_indisponibilidade", det, anexosDb);
          if (errH) throw errH;
          break;
        }
        case "retorno_indisponibilidade": {
          if (!acaoObs.trim()) {
            setErroGlobal("Informe a observação.");
            setAcaoSalvando(false);
            return;
          }
          const { error: eUp } = await supabase.from("rh_funcionarios").update({ status: "ativo" }).eq("id", fid);
          if (eUp) throw eUp;
          const det: Record<string, unknown> = { observacao: acaoObs.trim() };
          const errH = await inserirHistorico(fid, "retorno_indisponibilidade", det, anexosDb);
          if (errH) throw errH;
          break;
        }
        case "termino_prestacao": {
          if (!acaoDtTermino.trim()) {
            setErroGlobal("Informe a data de término.");
            setAcaoSalvando(false);
            return;
          }
          if (acaoTipoTermino !== "voluntario" && acaoTipoTermino !== "nao_voluntario") {
            setErroGlobal("Selecione o tipo de término.");
            setAcaoSalvando(false);
            return;
          }
          if (!acaoObs.trim()) {
            setErroGlobal("Informe a observação.");
            setAcaoSalvando(false);
            return;
          }
          const { error: eUp } = await supabase
            .from("rh_funcionarios")
            .update({ status: "encerrado", data_desligamento: acaoDtTermino })
            .eq("id", fid);
          if (eUp) throw eUp;
          const det: Record<string, unknown> = {
            data_termino: acaoDtTermino,
            tipo_termino: acaoTipoTermino,
            observacao: acaoObs.trim(),
          };
          const errH = await inserirHistorico(fid, "termino_prestacao", det, anexosDb);
          if (errH) throw errH;
          break;
        }
        case "alinhamento_formal": {
          if (!acaoObs.trim()) {
            setErroGlobal("Informe a observação.");
            setAcaoSalvando(false);
            return;
          }
          const det: Record<string, unknown> = { observacao: acaoObs.trim() };
          const errH = await inserirHistorico(fid, "alinhamento_formal", det, anexosDb);
          if (errH) throw errH;
          break;
        }
        case "reativacao_prestacao": {
          const usarSTR = permOrg.canView !== "nao" && !permOrg.loading && opcoesVinculoFlat.length > 0;
          const temOrgReat = Boolean(acaoForm.org_time_id || acaoForm.org_gerencia_id || acaoForm.org_diretoria_id);
          if (usarSTR && !temOrgReat) {
            setErroGlobal("Selecione o organograma.");
            setAcaoSalvando(false);
            return;
          }
          if (!usarSTR && !acaoForm.setor.trim()) {
            setErroGlobal("Informe o setor.");
            setAcaoSalvando(false);
            return;
          }
          if (!acaoForm.cargo.trim() || !acaoForm.nivel.trim() || !acaoForm.escala.trim() || !acaoForm.data_inicio.trim()) {
            setErroGlobal("Preencha função, nível, escala e data de início.");
            setAcaoSalvando(false);
            return;
          }
          if (!escalaEhPermitida(acaoForm.escala)) {
            setErroGlobal("Selecione uma escala válida: 5x2, 3x3, 4x2 ou 5x1.");
            setAcaoSalvando(false);
            return;
          }
          if (!(acaoForm.observacao_rh ?? "").trim()) {
            setErroGlobal("Informe a observação.");
            setAcaoSalvando(false);
            return;
          }
          if (podeVerDadosSensiveis) {
            const areaReat: RhAreaAtuacao =
              acaoForm.area_atuacao === "estudio" || acaoForm.area_atuacao === "escritorio"
                ? acaoForm.area_atuacao
                : "escritorio";
            if (areaReat === "estudio") {
              if (centavosInteirosDeStringMoeda(acaoForm.remuneracaoHoraCentavos) <= 0) {
                setErroGlobal("Informe a remuneração por hora.");
                setAcaoSalvando(false);
                return;
              }
              if (!acaoForm.staff_turno.trim()) {
                setErroGlobal("Selecione o turno.");
                setAcaoSalvando(false);
                return;
              }
            } else if (numeroDeCentavosStr(acaoForm.salarioCentavos) <= 0) {
              setErroGlobal("Informe a remuneração mensal.");
              setAcaoSalvando(false);
              return;
            }
          }
          const rowAntes = lista.find((x) => x.id === fid) ?? acaoModalRow;
          const base = buildRhFuncionarioPayloadFromState(acaoForm, "ativo", podeVerDadosSensiveis);
          let mesclado =
            !podeVerDadosSensiveis && acaoModalRow
              ? {
                  ...base,
                  salario: acaoModalRow.salario,
                  banco: acaoModalRow.banco,
                  agencia: acaoModalRow.agencia,
                  conta_corrente: acaoModalRow.conta_corrente,
                  pix: acaoModalRow.pix,
                }
              : base;
          if (somenteDigitos(acaoForm.cpf) === somenteDigitos(rowAntes.cpf ?? "")) {
            const { cpf: _omitCpfAcao, ...semCpfAcao } = mesclado;
            void _omitCpfAcao;
            mesclado = semCpfAcao as typeof mesclado;
          }
          const antes = acaoBaselineRef.current ?? sliceContratacaoDeRow(acaoModalRow);
          const depois = sliceContratacaoDeForm(acaoForm);
          const diffContrato = diffContratacaoSlices(antes, depois, opcoesVinculoFlat, opcoesTimes, fmtSal);
          const obsAntes = (rowAntes.observacao_rh ?? "").trim();
          const obsDepois = (acaoForm.observacao_rh ?? "").trim();
          const alteracoesReativacao: { campo: string; antes: string; depois: string }[] = [
            {
              campo: "Status",
              antes: labelStatusPrestador(rowAntes.status),
              depois: labelStatusPrestador("ativo"),
            },
          ];
          if (rowAntes.data_desligamento && String(rowAntes.data_desligamento).trim()) {
            alteracoesReativacao.push({
              campo: "Data de desligamento",
              antes: fmtDataIsoPtBr(rowAntes.data_desligamento),
              depois: "—",
            });
          }
          if (obsAntes !== obsDepois) {
            alteracoesReativacao.push({
              campo: "Observação",
              antes: obsAntes || "—",
              depois: obsDepois || "—",
            });
          }
          const diff = [...alteracoesReativacao, ...diffContrato];
          const { error: eUp } = await supabase.from("rh_funcionarios").update({ ...mesclado, data_desligamento: null }).eq("id", fid);
          if (eUp) throw eUp;
          const errH = await inserirHistorico(fid, "reativacao_prestacao", { alteracoes: diff }, []);
          if (errH) throw errH;
          break;
        }
        default: {
          setErroGlobal("Tipo de ação não suportado neste formulário.");
          setAcaoSalvando(false);
          return;
        }
      }
      try {
        const { data: rowRhPosAcao } = await supabase.from("rh_funcionarios").select("*").eq("id", fid).maybeSingle();
        if (rowRhPosAcao) {
          await syncGamePresenterDealerFromRhFuncionario(rowRhPosAcao as RhFuncionario);
        }
      } catch (e) {
        console.error("Falha ao sincronizar elenco de dealers após ação RH", e);
      }
      let resSync: Awaited<ReturnType<typeof syncUsuarioPrestadorAposSalvarRh>> | null = null;
      try {
        const spinAcao = acaoForm.email_spin.trim().toLowerCase();
        const emailAcao = acaoForm.email.trim().toLowerCase();
        resSync = await syncUsuarioPrestadorAposSalvarRh(fid, {
          emailSpin: spinAcao && validarEmail(spinAcao) ? spinAcao : undefined,
          emailPessoal: emailAcao && validarEmail(emailAcao) ? emailAcao : undefined,
        });
        const m = mensagemFeedbackSyncPrestador(resSync);
        if (m) setErroGlobal(m);
      } catch (e) {
        setErroGlobal(
          `Ação registrada, mas a sincronização com Gestão de Usuários falhou: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      const extraDesativacao = mensagemSucessoDesativacaoPrestadorEncerrado(resSync);
      setSucessoMsg(extraDesativacao ? `Ação registrada. ${extraDesativacao}` : "Ação registrada.");
      fecharModalRegistrarAcao();
      await carregar();
    } catch (e: unknown) {
      let msg = "Erro ao salvar.";
      if (e && typeof e === "object") {
        const o = e as { message?: string; code?: string; details?: string };
        if (typeof o.message === "string" && o.message.trim()) {
          msg = mensagemErroSupabaseRhFuncionarioSalvar(o);
        } else if (typeof o.details === "string" && o.details.trim()) {
          msg = mensagemErroSupabaseRhFuncionarioSalvar({ message: o.details, code: o.code, details: o.details });
        }
      }
      setErroGlobal(msg);
    } finally {
      setAcaoSalvando(false);
    }
  };

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
        <div className="app-table-wrap" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle()}>
            <caption style={{ display: "none" }}>Carregando gestão de prestadores</caption>
            <thead>
              <tr>
                {["Nome", "Função", "Líder Imediato", "Data da Função", "Remuneração", "Status", "Ações"].map((h) => (
                  <th key={h} scope="col" style={dataTable.thHeader}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SkeletonTableRow cols={7} />
              <SkeletonTableRow cols={7} />
              <SkeletonTableRow cols={7} />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const leitura = modalForm === "ver";
  const podeEnviarDocumentos = podeEnviarDocumentosGestaoPrestador(perm, modalForm);
  const snapshotEdicao = modalForm === "editar" && editId ? lista.find((x) => x.id === editId) ?? null : null;
  const cpfCampoTravadoEdicao = Boolean(modalForm === "editar" && somenteDigitos(snapshotEdicao?.cpf ?? "").length === 11);
  const bloquearOrgEdit = Boolean(
    usarSelectOrganograma &&
      (snapshotEdicao?.org_time_id || snapshotEdicao?.org_gerencia_id || snapshotEdicao?.org_diretoria_id),
  );
  const bloquearSetorManualEdit = Boolean(!usarSelectOrganograma && snapshotEdicao && snapshotEdicao.setor.trim());
  const bloquearCargoEdit = Boolean(snapshotEdicao?.cargo.trim());
  const bloquearNivelEdit = Boolean(snapshotEdicao?.nivel.trim());
  const bloquearSalarioEdit = Boolean(podeVerDadosSensiveis && snapshotEdicao && Number(snapshotEdicao.salario) > 0);
  const bloquearTipoContratoEdit = Boolean(snapshotEdicao && String(snapshotEdicao.tipo_contrato).length > 0);
  const bloquearEscalaEdit = Boolean(snapshotEdicao?.escala.trim());
  const desabilitarCampos = leitura || salvando;
  const sensivelBlurDoc = leitura && !modalVerExibirSensiveis;
  const sensivelBlurFinanceiro = leitura && !modalVerExibirSensiveis && podeVerDadosSensiveis;

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

  const astReq = <CampoObrigatorioMark />;
  const lbl = (htmlFor: string, text: string) => (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
      {text}
    </label>
  );
  const lblReq = (htmlFor: string, text: string) => (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
      {text}
      {astReq}
    </label>
  );
  /** Asterisco só quando `comAsterisco` — alinhado a `obterErrosFormulario` (novo / editar). */
  const lblReqCad = (htmlFor: string, text: string, comAsterisco = true) => (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
      {text}
      {!leitura && comAsterisco ? astReq : null}
    </label>
  );

  const idTabModal = (k: AbaFuncModal) => `rh-func-tab-${k}`;
  const iconAbaModal = (k: AbaFuncModal) => {
    const sz = FILTRO_BAR_TAB_ICON_SIZE;
    const p = { size: sz, strokeWidth: 2 as const, "aria-hidden": "true" as const };
    if (k === "pessoais") return <UserCircle2 {...p} />;
    if (k === "contratacao") return <FileSignature {...p} />;
    if (k === "empresa") return <Building2 {...p} />;
    if (k === "bancarios") return <Landmark {...p} />;
    if (k === "acesso_plataforma") return <KeyRound {...p} />;
    return <FolderOpen {...p} />;
  };
  const idPanelModal = (k: AbaFuncModal) => `rh-func-panel-${k}`;
  const fecharModalFuncionario = () => {
    if (salvando) return;
    setModalForm("fechado");
    setAbaModal("pessoais");
    setModalVerExibirSensiveis(false);
    setAcessoPlataforma(null);
    setAcessoPlataformaErro(null);
    setAcessoPlataformaLoading(false);
    setAlertaValidacaoModal(null);
    setFieldErr({});
    setErroGlobal(null);
  };

  const executarExclusaoPrestador = async () => {
    if (!prestadorExcluirConfirm) return;
    setExcluindoPrestador(true);
    setErroGlobal(null);
    const fid = prestadorExcluirConfirm.id;
    try {
      const { error } = await supabase.from("rh_funcionarios").delete().eq("id", fid);
      if (error) throw error;
      if (editId === fid) fecharModalFuncionario();
      setPrestadorExcluirConfirm(null);
      setSucessoMsg("Prestador excluído.");
      await carregar();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Erro ao excluir.";
      setErroGlobal(msg);
    } finally {
      setExcluindoPrestador(false);
    }
  };

  const idTabPagina = (k: AbaPaginaRhFunc) => `rh-gest-func-pag-${k}`;
  const panelPaginaRhId = "rh-gest-func-panel-pag";
  const legendaTabelaPorAba =
    abaPagina === "headcount"
      ? "Head count — colaboradores filtrados"
      : abaPagina === "acoes_rh"
        ? "Ações de RH — colaboradores filtrados"
        : "Anotações RH — colaboradores filtrados";
  const preencherAcoesHeadcount = abaPagina === "headcount";
  const tabelaAcoesRh = abaPagina === "acoes_rh";
  const tabelaAnotacoesRh = abaPagina === "anotacoes";
  const mostrarCtaAbaPaginaRh =
    (abaPagina === "headcount" && perm.canCriarOk && podeVerDadosSensiveis) ||
    (abaPagina === "anotacoes" && perm.canEditarOk);
  const tabelaSemSalario = tabelaAcoesRh || tabelaAnotacoesRh;
  const colunasTabela = tabelaSemSalario ? 6 : 7;

  return (
    <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
      <PageHeader
        icon={<PageMenuIcon pageKey="rh_funcionarios" />}
        title={getPageMenuLabel("rh_funcionarios")}
        subtitle="Cadastro, head count e fluxos de RH."
      />

      {(erroGlobal || erroCarregar) && modalForm === "fechado" && !acaoModalRow && !anotacaoModalRow && !rhTalksOpen ? (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 12,
            background: "rgba(232,64,37,0.12)",
            border: "1px solid rgba(232,64,37,0.35)",
            color: "#e84025",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} color="#e84025" aria-hidden />
          {erroGlobal ?? erroCarregar}
        </div>
      ) : null}

      {sucessoMsg ? (
        <div
          role="status"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 12,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.35)",
            color: "#166534",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={14} color="#22c55e" aria-hidden />
          {sucessoMsg}
        </div>
      ) : null}

      <PrestadorKpiResumo
        resumo={resumoPrestadoresCards}
        filtroStatus={filtroStatus}
        podeEditar={perm.canEditarOk}
        onEditarPrestador={abrirEditar}
      />

      <PrestadorFiltroBar
        brand={brand}
        t={t}
        filtroDiretoria={filtroDiretoria}
        onFiltroDiretoriaChange={setFiltroDiretoria}
        opcoesFiltroDiretoria={opcoesFiltroDiretoria}
        filtroGerencia={filtroGerencia}
        onFiltroGerenciaChange={setFiltroGerencia}
        opcoesFiltroGerencia={opcoesFiltroGerencia}
        filtroSetor={filtroSetor}
        onFiltroSetorChange={setFiltroSetor}
        opcoesFiltroSetor={opcoesFiltroSetor}
        filtroContrato={filtroContrato}
        onFiltroContratoChange={setFiltroContrato}
        filtroStatus={filtroStatus}
        onFiltroStatusChange={setFiltroStatus}
        busca={busca}
        onBuscaChange={setBusca}
        abaPagina={abaPagina}
        onAbaPaginaChange={setAbaPagina}
        panelPaginaRhId={panelPaginaRhId}
        mostrarCtaAbaPaginaRh={mostrarCtaAbaPaginaRh}
        podeCriarHeadcount={perm.canCriarOk && podeVerDadosSensiveis}
        podeRhTalks={perm.canEditarOk}
        onNovoPrestador={abrirNovo}
        onRhTalks={() => abrirModalRhTalks()}
      />

      <PrestadorTabelaColaboradores
        brand={brand}
        t={t}
        panelPaginaRhId={panelPaginaRhId}
        idTabPagina={idTabPagina(abaPagina)}
        legendaTabelaPorAba={legendaTabelaPorAba}
        tabelaSemSalario={tabelaSemSalario}
        colunasTabela={colunasTabela}
        preencherAcoesHeadcount={preencherAcoesHeadcount}
        tabelaAcoesRh={tabelaAcoesRh}
        tabelaAnotacoesRh={tabelaAnotacoesRh}
        loading={loading}
        filtrada={filtrada}
        filtradaOrdenada={filtradaOrdenada}
        sortPrestadores={sortPrestadores}
        onSortPrestadores={onSortPrestadores}
        liderImediatoLinha={liderImediatoLinha}
        podeVerDadosSensiveis={podeVerDadosSensiveis}
        tabelaSalarioVisivel={tabelaSalarioVisivel}
        onToggleTabelaSalarioVisivel={() => setTabelaSalarioVisivel((v) => !v)}
        podeEditar={perm.canEditarOk}
        podeExcluir={perm.canExcluirOk}
        onAbrirVer={abrirVer}
        onAbrirHistorico={abrirModalHistorico}
        onAbrirEditar={abrirEditar}
        onRegistrarAcao={abrirModalRegistrarAcao}
        onRegistrarAnotacao={abrirModalRegistrarAnotacao}
        onConfirmarExclusao={setPrestadorExcluirConfirm}
      />

      {(modalForm === "novo" || modalForm === "editar" || modalForm === "ver") && (
        <ModalBase maxWidth={720} onClose={fecharModalFuncionario}>
          {modalForm === "ver" ? (
            <RhFuncModalHeaderDetalhes
              t={t}
              perm={perm}
              editId={editId}
              lista={lista}
              modalVerExibirSensiveis={modalVerExibirSensiveis}
              setModalVerExibirSensiveis={setModalVerExibirSensiveis}
              abrirEditar={abrirEditar}
              fecharModalFuncionario={fecharModalFuncionario}
              ctaGradient={ctaGradient}
              brand={brand}
            />
          ) : (
            <ModalHeader
              title={modalForm === "novo" ? "Novo Prestador" : "Editar Prestador"}
              onClose={fecharModalFuncionario}
            />
          )}

          <div
            role="tablist"
            aria-label="Seções do cadastro"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: FILTER_BAR_ROW_GAP,
              marginBottom: 16,
              width: "100%",
            }}
          >
            {abasModalDef.map((tb) => (
              <FiltroBarTabButton
                key={tb.key}
                id={idTabModal(tb.key)}
                active={abaModal === tb.key}
                aria-controls={idPanelModal(tb.key)}
                onClick={() => setAbaModal(tb.key)}
                onKeyDown={(e) =>
                  handleFiltroBarTabsArrowKeyDown(
                    e,
                    abasModalDef.map((x) => x.key),
                    tb.key,
                    setAbaModal,
                    "rh-func-tab-",
                  )
                }
                icon={iconAbaModal(tb.key)}
                aria-label={
                  modalForm !== "ver" && errosPorAbaModal[tb.key] > 0
                    ? `${tb.label}, ${errosPorAbaModal[tb.key]} erro(s) nesta seção`
                    : undefined
                }
              >
                {tb.label}
                {modalForm !== "ver" && errosPorAbaModal[tb.key] > 0 ? (
                  <span style={{ color: "#e84025", fontWeight: 800 }} aria-hidden>
                    {" "}
                    · {errosPorAbaModal[tb.key]}
                  </span>
                ) : null}
              </FiltroBarTabButton>
            ))}
          </div>

          {(modalForm === "novo" || modalForm === "editar" || modalForm === "ver") && erroGlobal ? (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(232,64,37,0.12)",
                border: "1px solid rgba(232,64,37,0.35)",
                color: "#e84025",
                fontSize: 13,
                fontFamily: FONT.body,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                lineHeight: 1.45,
              }}
            >
              <AlertCircle size={16} color="#e84025" aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{erroGlobal}</span>
            </div>
          ) : null}

          {modalForm !== "ver" && alertaValidacaoModal ? (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(232,64,37,0.12)",
                border: "1px solid rgba(232,64,37,0.35)",
                color: "#e84025",
                fontSize: 12,
                fontFamily: FONT.body,
                whiteSpace: "pre-line",
                lineHeight: 1.45,
              }}
            >
              {alertaValidacaoModal}
            </div>
          ) : null}

          <div
            role="tabpanel"
            id={idPanelModal(abaModal)}
            aria-labelledby={idTabModal(abaModal)}
            style={{ minHeight: 100 }}
          >
            {abaModal === "pessoais" ? (
              <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
                {leitura && snapshotEdicao && prestadorExigeRevisaoCadastral(snapshotEdicao.status) ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      marginBottom: 12,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${revisaoCadastralPendenteParaFuncionario(snapshotEdicao) ? "rgba(245, 158, 11, 0.45)" : t.cardBorder}`,
                      background: revisaoCadastralPendenteParaFuncionario(snapshotEdicao)
                        ? "rgba(245, 158, 11, 0.1)"
                        : t.inputBg,
                      fontSize: 13,
                      fontFamily: FONT.body,
                      color: t.text,
                    }}
                  >
                    <strong>Revisão cadastral (prestador):</strong>{" "}
                    {cadastroRevisaoJaRegistradaPeloPrestador(snapshotEdicao.cadastro_revisado_em)
                      ? `última em ${fmtDataIsoPtBr(String(snapshotEdicao.cadastro_revisado_em).slice(0, 10))}`
                      : "primeira revisão pendente — aguardando confirmação em Dados de Cadastro"}
                    {snapshotEdicao.cadastro_revisao_tipo === "sem_alteracao"
                      ? " — declarada sem alterações"
                      : snapshotEdicao.cadastro_revisao_tipo === "alteracao"
                        ? " — com atualização de dados/documentos"
                        : ""}
                    {revisaoCadastralPendenteParaFuncionario(snapshotEdicao) ? (
                      <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                        {" "}
                        · Pendente
                        {cadastroRevisaoJaRegistradaPeloPrestador(snapshotEdicao.cadastro_revisado_em)
                          ? " (ciclo 6 meses)"
                          : " (primeira revisão)"}
                      </span>
                    ) : (
                      <span style={{ color: "#22c55e", fontWeight: 600 }}> · Em dia</span>
                    )}
                  </div>
                ) : null}
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-nome", "Nome completo")}
                  <input
                    id="f-nome"
                    disabled={desabilitarCampos}
                    value={form.nome}
                    onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.nome ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.nome}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-rg", "RG", false)}
                  <input
                    id="f-rg"
                    disabled={desabilitarCampos}
                    value={form.rg}
                    onChange={(e) => setForm((s) => ({ ...s, rg: formatarRgInput(e.target.value) }))}
                    placeholder="00.000.000-0"
                    style={{ ...inputStyle, ...(sensivelBlurDoc ? blurSensivel : {}) }}
                  />
                  {fieldErr.rg ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.rg}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-cpf", "CPF")}
                  <input
                    id="f-cpf"
                    disabled={desabilitarCampos || cpfCampoTravadoEdicao}
                    value={form.cpf}
                    onChange={(e) => setForm((s) => ({ ...s, cpf: formatarCpfDigitos(e.target.value) }))}
                    placeholder="000.000.000-00"
                    style={{ ...inputStyle, ...(sensivelBlurDoc ? blurSensivel : {}) }}
                    title={cpfCampoTravadoEdicao ? "CPF não pode ser alterado" : undefined}
                  />
                  {fieldErr.cpf ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.cpf}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-data-nasc", "Data de nascimento")}
                  {!leitura ? (
                    <input
                      id="f-data-nasc"
                      type="date"
                      disabled={desabilitarCampos}
                      value={form.data_nascimento.trim().slice(0, 10)}
                      onChange={(e) => setForm((s) => ({ ...s, data_nascimento: e.target.value }))}
                      style={inputStyle}
                      aria-label="Data de nascimento"
                    />
                  ) : (
                    <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>{fmtDataIsoPtBr(form.data_nascimento)}</div>
                  )}
                  {fieldErr.data_nascimento ? (
                    <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.data_nascimento}</div>
                  ) : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-tel", "Telefone", false)}
                  <input
                    id="f-tel"
                    disabled={desabilitarCampos}
                    value={form.telefone}
                    onChange={(e) => setForm((s) => ({ ...s, telefone: formatarTelefoneBr(e.target.value) }))}
                    placeholder="(00) 00000-0000"
                    style={inputStyle}
                  />
                  {fieldErr.telefone ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.telefone}</div> : null}
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReqCad("f-email", "E-mail")}
                  <input
                    id="f-email"
                    type="email"
                    disabled={desabilitarCampos}
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.email ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.email}</div> : null}
                </div>
                <div style={{ marginBottom: 6, gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body }}>
                  Endereço residencial
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-res-cep", "CEP")}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      id="f-res-cep"
                      disabled={desabilitarCampos}
                      value={form.res_cep}
                      onChange={(e) => setForm((s) => ({ ...s, res_cep: formatarCepDigitos(e.target.value) }))}
                      onBlur={(e) => handleCepBlur("res", e.target.value)}
                      placeholder="00000-000"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    {cepBuscaEmAndamento === "res" ? <Loader2 size={16} className="app-lucide-spin" aria-hidden style={{ color: t.textMuted }} /> : null}
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>
                    Insira o CEP para preencher o endereço
                  </div>
                  {fieldErr.res_cep ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_cep}</div> : null}
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReqCad("f-res-log", "Logradouro", false)}
                  <input
                    id="f-res-log"
                    disabled={desabilitarCampos}
                    value={form.res_logradouro}
                    onChange={(e) => setForm((s) => ({ ...s, res_logradouro: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.res_logradouro ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_logradouro}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-res-num", "Número", false)}
                  <input
                    id="f-res-num"
                    disabled={desabilitarCampos}
                    value={form.res_numero}
                    onChange={(e) => setForm((s) => ({ ...s, res_numero: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.res_numero ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_numero}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-res-compl", "Complemento")}
                  <input
                    id="f-res-compl"
                    disabled={desabilitarCampos}
                    value={form.res_complemento}
                    onChange={(e) => setForm((s) => ({ ...s, res_complemento: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-res-cid", "Cidade", false)}
                  <input
                    id="f-res-cid"
                    disabled={desabilitarCampos}
                    value={form.res_cidade}
                    onChange={(e) => setForm((s) => ({ ...s, res_cidade: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.res_cidade ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_cidade}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-res-uf", "Estado (UF)", false)}
                  <select
                    id="f-res-uf"
                    disabled={desabilitarCampos}
                    value={form.res_estado}
                    onChange={(e) => setForm((s) => ({ ...s, res_estado: e.target.value.toUpperCase().slice(0, 2) }))}
                    style={inputStyle}
                    aria-label="UF residencial"
                  >
                    <option value="">—</option>
                    {UFS_BR.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                  {fieldErr.res_estado ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_estado}</div> : null}
                </div>
                <div style={{ marginBottom: 6, gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body }}>
                  Contato de emergência
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-emerg-nome", "Nome")}
                  <input
                    id="f-emerg-nome"
                    disabled={desabilitarCampos}
                    value={form.emerg_nome}
                    onChange={(e) => setForm((s) => ({ ...s, emerg_nome: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.emerg_nome ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emerg_nome}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-emerg-parent", "Parentesco")}
                  <input
                    id="f-emerg-parent"
                    disabled={desabilitarCampos}
                    value={form.emerg_parentesco}
                    onChange={(e) => setForm((s) => ({ ...s, emerg_parentesco: e.target.value }))}
                    placeholder="Ex.: Cônjuge, irmã(o)"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-emerg-tel", "Telefone", false)}
                  <input
                    id="f-emerg-tel"
                    disabled={desabilitarCampos}
                    value={form.emerg_telefone}
                    onChange={(e) => setForm((s) => ({ ...s, emerg_telefone: formatarTelefoneBr(e.target.value) }))}
                    placeholder="(00) 00000-0000"
                    style={inputStyle}
                  />
                  {fieldErr.emerg_telefone ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emerg_telefone}</div> : null}
                </div>
              </div>
            ) : null}

            {abaModal === "contratacao" ? (
              <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {usarSelectOrganograma ? (
                    <>
                      {!leitura ? (
                        <>
                          {lblReqCad("f-org-time", "Organograma")}
                          <SelectOrganogramaTimes
                            id="f-org-time"
                            disabled={desabilitarCampos || bloquearOrgEdit}
                            value={form.org_time_id ?? form.org_gerencia_id ?? form.org_diretoria_id ?? ""}
                            grupos={organogramaGrupos}
                            onPick={(id, op) => {
                              if (!id || !op) {
                                setForm((s) => ({
                                  ...s,
                                  org_diretoria_id: null,
                                  org_gerencia_id: null,
                                  org_time_id: null,
                                  setor: "",
                                  ...(modalForm === "novo" ? defaultsNovoPrestadorSemVinculoOrganograma() : {}),
                                }));
                                return;
                              }
                              const defaultsNovo =
                                modalForm === "novo" ? defaultsNovoPrestadorDeVinculoOrganograma(op) : null;
                              if (op.nivel === "time") {
                                setForm((s) => ({
                                  ...s,
                                  org_diretoria_id: null,
                                  org_gerencia_id: null,
                                  org_time_id: op.timeId,
                                  setor: op.setorNome,
                                  ...(defaultsNovo ?? {}),
                                }));
                              } else if (op.nivel === "gerencia") {
                                setForm((s) => ({
                                  ...s,
                                  org_diretoria_id: null,
                                  org_gerencia_id: op.gerenciaId,
                                  org_time_id: null,
                                  setor: op.setorNome,
                                  ...(defaultsNovo ?? {}),
                                }));
                              } else {
                                setForm((s) => ({
                                  ...s,
                                  org_diretoria_id: op.diretoriaId,
                                  org_gerencia_id: null,
                                  org_time_id: null,
                                  setor: op.setorNome,
                                  ...(defaultsNovo ?? {}),
                                }));
                              }
                            }}
                            aria-label="Organograma"
                            style={inputStyle}
                          />
                          {fieldErr.org_time_id ? (
                            <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.org_time_id}</div>
                          ) : null}
                        </>
                      ) : null}
                      {opcaoOrgSelecionada || (leitura && form.setor.trim()) ? (
                        <div
                          style={{
                            marginTop: leitura ? 0 : 10,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: `1px solid ${t.cardBorder}`,
                            background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 6%, transparent)",
                            fontSize: 12,
                            color: t.textMuted,
                            lineHeight: 1.6,
                          }}
                        >
                          {opcaoOrgSelecionada ? (
                            <>
                              <div>
                                <strong style={{ color: t.text }}>Diretoria:</strong> {opcaoOrgSelecionada.diretoriaNome}
                              </div>
                              {opcaoOrgSelecionada.nivel !== "diretoria" ? (
                                <div>
                                  <strong style={{ color: t.text }}>Gerência:</strong> {opcaoOrgSelecionada.gerenciaNome || "—"}
                                </div>
                              ) : null}
                              {opcaoOrgSelecionada.nivel === "time" ? (
                                <div>
                                  <strong style={{ color: t.text }}>Time:</strong> {opcaoOrgSelecionada.timeNome}
                                </div>
                              ) : null}
                              <div>
                                <strong style={{ color: t.text }}>Líder imediato:</strong> {opcaoOrgSelecionada.gestorNome}
                              </div>
                            </>
                          ) : (
                            <div>
                              <strong style={{ color: t.text }}>Setor:</strong> {form.setor}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {lblReqCad("f-setor", "Setor")}
                      <input
                        id="f-setor"
                        disabled={desabilitarCampos || bloquearSetorManualEdit}
                        value={form.setor}
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            setor: e.target.value,
                            org_diretoria_id: null,
                            org_gerencia_id: null,
                            org_time_id: null,
                          }))
                        }
                        style={inputStyle}
                        list="lista-setores"
                      />
                      <datalist id="lista-setores">
                        {opcoesFiltroSetor.map((s) => (
                          <option key={s.value} value={s.value} />
                        ))}
                      </datalist>
                      {permOrg.canView !== "nao" && !permOrg.loading && organogramaGrupos.length === 0 && opcoesVinculoFlat.length === 0 ? (
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>
                          Nenhuma estrutura ativa no organograma. Cadastre diretorias em RH → Organograma ou informe o setor manualmente.
                        </div>
                      ) : null}
                    </>
                  )}
                  {fieldErr.setor ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.setor}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-cargo", "Função")}
                  <input id="f-cargo" disabled={desabilitarCampos || bloquearCargoEdit} value={form.cargo} onChange={(e) => setForm((s) => ({ ...s, cargo: e.target.value }))} style={inputStyle} />
                  {fieldErr.cargo ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.cargo}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-nivel", "Nível")}
                  <select
                    id="f-nivel"
                    disabled={desabilitarCampos || bloquearNivelEdit}
                    value={form.nivel}
                    onChange={(e) => setForm((s) => ({ ...s, nivel: e.target.value }))}
                    style={inputStyle}
                    aria-label="Nível profissional"
                  >
                    {NIVEIS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    marginBottom: 10,
                    gridColumn: "1 / -1",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    {lblReqCad("f-tipo", "Tipo de contrato", false)}
                    <select
                      id="f-tipo"
                      disabled={desabilitarCampos || bloquearTipoContratoEdit}
                      value={form.tipo_contrato}
                      onChange={(e) => setForm((s) => ({ ...s, tipo_contrato: e.target.value as RhFuncionarioTipoContrato }))}
                      style={inputStyle}
                      aria-label="Tipo de contrato"
                    >
                      {TIPOS_CONTRATO.map((x) => (
                        <option key={x.value} value={x.value}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {leitura ? lbl("f-area-atuacao", "Área de atuação") : lblReqCad("f-area-atuacao", "Área de atuação", true)}
                    <select
                      id="f-area-atuacao"
                      disabled={desabilitarCampos}
                      value={form.area_atuacao}
                      onChange={(e) => {
                        const v = e.target.value as "" | RhAreaAtuacao;
                        setForm((s) => {
                          if (v === "escritorio") {
                            const esc = !s.escala.trim() || !escalaEhPermitida(s.escala) ? "5x2" : s.escala;
                            return {
                              ...s,
                              area_atuacao: v,
                              escala: esc,
                              remuneracaoHoraCentavos: "",
                              staff_turno: "",
                            };
                          }
                          if (v === "estudio") {
                            return { ...s, area_atuacao: v, salarioCentavos: "" };
                          }
                          return { ...s, area_atuacao: v };
                        });
                      }}
                      style={inputStyle}
                      aria-label="Área de atuação"
                      aria-required={!leitura}
                    >
                      {modalForm === "novo" ? (
                        <option value="">— Selecione —</option>
                      ) : null}
                      <option value="escritorio">Escritório</option>
                      <option value="estudio">Estúdio</option>
                    </select>
                    {fieldErr.area_atuacao ? (
                      <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.area_atuacao}</div>
                    ) : null}
                  </div>
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lbl("f-email-spin", "E-mail Spin")}
                  <input
                    id="f-email-spin"
                    type="email"
                    disabled={desabilitarCampos}
                    value={form.email_spin}
                    onChange={(e) => setForm((s) => ({ ...s, email_spin: e.target.value }))}
                    placeholder="exemplo@spingaming.com.br"
                    autoComplete="email"
                    style={inputStyle}
                    aria-label="E-mail corporativo Spin"
                  />
                  {fieldErr.email_spin ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.email_spin}</div> : null}
                </div>
                {podeVerDadosSensiveis ? (
                  isEstudioContratacao ? (
                    <div style={{ marginBottom: 10 }}>
                      {lblReqCad("f-rem-hora", "Remuneração por hora")}
                      <input
                        id="f-rem-hora"
                        disabled={desabilitarCampos}
                        inputMode="numeric"
                        autoComplete="off"
                        value={form.remuneracaoHoraCentavos ? formatarMoedaDigitos(form.remuneracaoHoraCentavos) : ""}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, remuneracaoHoraCentavos: centavosDeStringMoeda(e.target.value) }))
                        }
                        placeholder="R$ 0,00"
                        style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                      />
                      {fieldErr.remuneracaoHoraCentavos ? (
                        <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.remuneracaoHoraCentavos}</div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ marginBottom: 10 }}>
                      {lblReqCad("f-sal", "Remuneração Mensal")}
                      <input
                        id="f-sal"
                        disabled={desabilitarCampos || bloquearSalarioEdit}
                        inputMode="numeric"
                        autoComplete="off"
                        value={form.salarioCentavos ? formatarMoedaDigitos(form.salarioCentavos) : ""}
                        onChange={(e) => setForm((s) => ({ ...s, salarioCentavos: centavosDeStringMoeda(e.target.value) }))}
                        placeholder="R$ 0,00"
                        style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                      />
                      {fieldErr.salarioCentavos ? (
                        <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.salarioCentavos}</div>
                      ) : null}
                    </div>
                  )
                ) : (
                  <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 8%, transparent)", fontSize: 12, color: t.textMuted }}>
                    Remuneração (mensal ou por hora) e dados bancários: visíveis apenas para administrador ou quem tem permissão de edição nesta página.
                  </div>
                )}
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-ini", "Data de início")}
                  <input
                    id="f-ini"
                    type="date"
                    disabled={desabilitarCampos}
                    value={form.data_inicio}
                    onChange={(e) => setForm((s) => ({ ...s, data_inicio: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.data_inicio ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.data_inicio}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-escala", "Escala")}
                  <select
                    id="f-escala"
                    disabled={desabilitarCampos || bloquearEscalaEdit}
                    value={valorSelectEscala(form.escala)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((s) => {
                        const escalaNova = v === "__legacy__" ? s.escala : v;
                        return {
                          ...s,
                          escala: escalaNova,
                          staff_turno: turnoRhCoerenteComEscala(escalaNova, s.staff_turno),
                        };
                      });
                    }}
                    style={inputStyle}
                    aria-label="Escala de trabalho"
                  >
                    <option value="">— Selecione —</option>
                    {valorSelectEscala(form.escala) === "__legacy__" ? (
                      <option value="__legacy__">
                        {form.escala.trim()} (cadastro antigo — escolha 5x2, 3x3, 4x2 ou 5x1)
                      </option>
                    ) : null}
                    {ESCALAS_PERMITIDAS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                  {fieldErr.escala ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.escala}</div> : null}
                </div>
                {isEstudioContratacao ? (
                  <div style={{ marginBottom: 10 }}>
                    {lblReqCad("f-turno-estudio", "Turno")}
                    <select
                      id="f-turno-estudio"
                      disabled={desabilitarCampos}
                      value={turnoRhCoerenteComEscala(form.escala, form.staff_turno)}
                      onChange={(e) => setForm((s) => ({ ...s, staff_turno: e.target.value }))}
                      style={inputStyle}
                      aria-label="Turno"
                      aria-required={!leitura}
                    >
                      <option value="">— Selecione —</option>
                      {opcoesTurnoPorEscalaRh(form.escala).map((tn) => (
                        <option key={tn} value={tn}>
                          {tn}
                        </option>
                      ))}
                    </select>
                    {fieldErr.staff_turno ? (
                      <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.staff_turno}</div>
                    ) : null}
                  </div>
                ) : null}
                {!leitura && modalForm !== "novo" ? (
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    {lbl("f-dt-funcao", "Data da Função")}
                    <input
                      id="f-dt-funcao"
                      type="date"
                      disabled={desabilitarCampos}
                      value={form.data_funcao}
                      onChange={(e) => setForm((s) => ({ ...s, data_funcao: e.target.value }))}
                      style={inputStyle}
                      aria-label="Data da Função"
                    />
                  </div>
                ) : null}
                {leitura && form.data_funcao.trim() ? (
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>Data da Função</div>
                    <div style={{ fontSize: 13, color: t.text, fontFamily: FONT.body }}>{fmtDataIsoPtBr(form.data_funcao)}</div>
                  </div>
                ) : null}
                <div style={{ marginBottom: 10, gridColumn: leitura ? "1 / -1" : undefined }}>
                  {lbl("f-origem-contratacao", "Origem")}
                  <select
                    id="f-origem-contratacao"
                    disabled={desabilitarCampos}
                    value={form.origem_contratacao}
                    onChange={(e) => {
                      const v = e.target.value as FormState["origem_contratacao"];
                      setForm((s) => ({
                        ...s,
                        origem_contratacao: v,
                        quem_indicou: v === "indicacao" ? s.quem_indicou : "",
                      }));
                    }}
                    style={inputStyle}
                    aria-label="Origem da contratação"
                  >
                    <option value="">— Selecione —</option>
                    {ORIGENS_CONTRATACAO.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {form.origem_contratacao === "indicacao" ? (
                  <div style={{ marginBottom: 10, gridColumn: leitura ? "1 / -1" : undefined }}>
                    {lblReqCad("f-quem-indicou", "Quem indicou?")}
                    <input
                      id="f-quem-indicou"
                      disabled={desabilitarCampos}
                      value={form.quem_indicou}
                      onChange={(e) => setForm((s) => ({ ...s, quem_indicou: e.target.value }))}
                      style={inputStyle}
                      aria-label="Quem indicou"
                      aria-required={!leitura}
                    />
                    {fieldErr.quem_indicou ? (
                      <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.quem_indicou}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {abaModal === "empresa" && ehPJ ? (
              <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReqCad("f-empnome", "Nome da empresa", false)}
                  <input
                    id="f-empnome"
                    disabled={desabilitarCampos}
                    value={form.nome_empresa}
                    onChange={(e) => setForm((s) => ({ ...s, nome_empresa: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.nome_empresa ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.nome_empresa}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-cnpj", "CNPJ", false)}
                  <input
                    id="f-cnpj"
                    disabled={desabilitarCampos}
                    value={form.cnpj}
                    onChange={(e) => setForm((s) => ({ ...s, cnpj: formatarCnpjDigitos(e.target.value) }))}
                    placeholder="00.000.000/0000-00"
                    style={inputStyle}
                  />
                  {fieldErr.cnpj ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.cnpj}</div> : null}
                </div>
                <div style={{ marginBottom: 6, gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body }}>
                  Endereço da empresa
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-emp-cep", "CEP")}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      id="f-emp-cep"
                      disabled={desabilitarCampos}
                      value={form.emp_cep}
                      onChange={(e) => setForm((s) => ({ ...s, emp_cep: formatarCepDigitos(e.target.value) }))}
                      onBlur={(e) => handleCepBlur("emp", e.target.value)}
                      placeholder="00000-000"
                      inputMode="numeric"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    {cepBuscaEmAndamento === "emp" ? <Loader2 size={16} className="app-lucide-spin" aria-hidden style={{ color: t.textMuted }} /> : null}
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4, fontFamily: FONT.body }}>
                    Insira o CEP para preencher o endereço
                  </div>
                  {fieldErr.emp_cep ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_cep}</div> : null}
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReqCad("f-emp-log", "Logradouro", false)}
                  <input
                    id="f-emp-log"
                    disabled={desabilitarCampos}
                    value={form.emp_logradouro}
                    onChange={(e) => setForm((s) => ({ ...s, emp_logradouro: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.emp_logradouro ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_logradouro}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-emp-num", "Número", false)}
                  <input
                    id="f-emp-num"
                    disabled={desabilitarCampos}
                    value={form.emp_numero}
                    onChange={(e) => setForm((s) => ({ ...s, emp_numero: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.emp_numero ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_numero}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-emp-compl", "Complemento")}
                  <input
                    id="f-emp-compl"
                    disabled={desabilitarCampos}
                    value={form.emp_complemento}
                    onChange={(e) => setForm((s) => ({ ...s, emp_complemento: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-emp-cid", "Cidade", false)}
                  <input
                    id="f-emp-cid"
                    disabled={desabilitarCampos}
                    value={form.emp_cidade}
                    onChange={(e) => setForm((s) => ({ ...s, emp_cidade: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.emp_cidade ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_cidade}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReqCad("f-emp-uf", "Estado (UF)", false)}
                  <select
                    id="f-emp-uf"
                    disabled={desabilitarCampos}
                    value={form.emp_estado}
                    onChange={(e) => setForm((s) => ({ ...s, emp_estado: e.target.value.toUpperCase().slice(0, 2) }))}
                    style={inputStyle}
                    aria-label="UF da empresa"
                  >
                    <option value="">—</option>
                    {UFS_BR.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                  {fieldErr.emp_estado ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_estado}</div> : null}
                </div>
              </div>
            ) : null}

            {abaModal === "bancarios" ? (
              podeVerDadosSensiveis ? (
                <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
                  <div style={{ marginBottom: 10 }}>
                    {lblReqCad("f-banco", "Banco", false)}
                    <select
                      id="f-banco"
                      disabled={desabilitarCampos}
                      value={rhBancoParaSelectValue(form.banco)}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__legacy__") return;
                        setForm((s) => ({ ...s, banco: v }));
                      }}
                      style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                      aria-label="Banco"
                    >
                      <option value="">— Selecione —</option>
                      {rhBancoParaSelectValue(form.banco) === "__legacy__" ? (
                        <option value="__legacy__">
                          {form.banco.trim()} (cadastro fora da lista — selecione o banco equivalente)
                        </option>
                      ) : null}
                      {RH_BANCOS_BRASIL.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                    {fieldErr.banco ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.banco}</div> : null}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    {lblReqCad("f-ag", "Agência", false)}
                    <input
                      id="f-ag"
                      disabled={desabilitarCampos}
                      value={form.agencia}
                      onChange={(e) => setForm((s) => ({ ...s, agencia: formatarAgencia(e.target.value) }))}
                      placeholder="0000-0"
                      style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                    />
                    {fieldErr.agencia ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.agencia}</div> : null}
                  </div>
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    {lblReqCad("f-cc", "Conta corrente", false)}
                    <input
                      id="f-cc"
                      disabled={desabilitarCampos}
                      value={form.conta_corrente}
                      onChange={(e) => setForm((s) => ({ ...s, conta_corrente: e.target.value }))}
                      style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                    />
                    {fieldErr.conta_corrente ? (
                      <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.conta_corrente}</div>
                    ) : null}
                  </div>
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    {lblReqCad("f-pix", "PIX", false)}
                    <input
                      id="f-pix"
                      disabled={desabilitarCampos}
                      value={form.pix}
                      onChange={(e) => setForm((s) => ({ ...s, pix: e.target.value }))}
                      style={{ ...inputStyle, ...(sensivelBlurFinanceiro ? blurSensivel : {}) }}
                    />
                    {fieldErr.pix ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.pix}</div> : null}
                  </div>
                </div>
              ) : (
                <p style={{ margin: "8px 0 0", fontSize: 13, color: t.textMuted }}>Dados bancários ocultos para o seu perfil.</p>
              )
            ) : null}

            {abaModal === "documentos" ? (
              <PrestadorDocumentosGestaoPanel
                funcionarioId={editId}
                tipoContrato={form.tipo_contrato}
                podeEditar={podeEnviarDocumentos}
              />
            ) : null}

            {abaModal === "acesso_plataforma" ? (
              <PrestadorAcessoPlataformaPanel
                loading={acessoPlataformaLoading}
                erro={acessoPlataformaErro}
                dados={acessoPlataforma}
              />
            ) : null}
          </div>

          {!leitura ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "flex-end",
                alignItems: "center",
                marginTop: 8,
              }}
            >
                {modalForm === "novo" ? (
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => void salvar({ outro: true })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg,
                      color: t.text,
                      cursor: salvando ? "wait" : "pointer",
                      fontFamily: FONT.body,
                      fontSize: 13,
                    }}
                  >
                    Salvar e cadastrar outro
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void salvar({ outro: false })}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "none",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: salvando ? "wait" : "pointer",
                    fontFamily: FONT.body,
                    fontSize: 13,
                    background: ctaGradient(brand),
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {salvando ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
                  Salvar
                </button>
            </div>
          ) : null}
        </ModalBase>
      )}

      {acaoModalRow ? (
        <ModalBase maxWidth={680} onClose={fecharModalRegistrarAcao}>
          <ModalHeader title="Registrar Ação" onClose={fecharModalRegistrarAcao} />
          <div style={{ padding: "0 4px 8px", fontFamily: FONT.body }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: t.textMuted }}>
              <strong style={{ color: t.text }}>{acaoModalRow.nome}</strong>
            </div>
            {erroGlobal ? (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  marginBottom: 12,
                  background: "rgba(232,64,37,0.12)",
                  border: "1px solid rgba(232,64,37,0.35)",
                  color: "#e84025",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={14} color="#e84025" aria-hidden />
                {erroGlobal}
              </div>
            ) : null}
            <div style={{ marginBottom: 12 }}>
              {lblReq("acao-tipo", "Tipo de ação")}
              <select
                id="acao-tipo"
                value={acaoTipo}
                onChange={(e) => {
                  setAcaoTipo((e.target.value || "") as "" | RhHistoricoAcaoTipo);
                  setAcaoTipoTermino("");
                  setAcaoFiles([]);
                }}
                style={inputStyle}
                aria-label="Tipo de ação"
              >
                <option value="">— Selecione —</option>
                {tiposAcaoDisponiveis(acaoModalRow.status).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {acaoTipo === "periodo_indisponibilidade" ? (
              <div className="app-grid-2-tight">
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-dt-saida", "Data de saída")}
                  <input
                    id="acao-dt-saida"
                    type="date"
                    value={acaoDtSaida}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAcaoDtSaida(v);
                      setAcaoDtRetorno((r) => (r && v && r < v ? "" : r));
                    }}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-dt-ret", "Data de retorno")}
                  <input
                    id="acao-dt-ret"
                    type="date"
                    value={acaoDtRetorno}
                    min={acaoDtSaida || undefined}
                    onChange={(e) => setAcaoDtRetorno(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReq("acao-obs", "Observação")}
                  <textarea id="acao-obs" value={acaoObs} onChange={(e) => setAcaoObs(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                <div style={{ gridColumn: "1 / -1", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4 }}>Anexos</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setAcaoFiles(Array.from(e.target.files ?? []))}
                    style={{ fontSize: 12, width: "100%", color: t.textMuted }}
                    aria-label="Anexos"
                  />
                  {acaoFiles.length > 0 ? (
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{acaoFiles.map((f) => f.name).join(", ")}</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {acaoTipo === "retorno_indisponibilidade" ? (
              <div>
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-obs-r", "Observação")}
                  <textarea id="acao-obs-r" value={acaoObs} onChange={(e) => setAcaoObs(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4 }}>Anexos</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setAcaoFiles(Array.from(e.target.files ?? []))}
                    style={{ fontSize: 12, width: "100%", color: t.textMuted }}
                    aria-label="Anexos"
                  />
                  {acaoFiles.length > 0 ? (
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{acaoFiles.map((f) => f.name).join(", ")}</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {acaoTipo === "termino_prestacao" ? (
              <div className="app-grid-2-tight">
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReq("acao-dt-term", "Data de término")}
                  <input id="acao-dt-term" type="date" value={acaoDtTermino} onChange={(e) => setAcaoDtTermino(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReq("acao-tipo-term", "Tipo de término")}
                  <select
                    id="acao-tipo-term"
                    value={acaoTipoTermino}
                    onChange={(e) => setAcaoTipoTermino((e.target.value || "") as "" | RhTipoTerminoPrestacao)}
                    style={inputStyle}
                    aria-label="Tipo de término"
                    aria-required
                  >
                    <option value="">— Selecione —</option>
                    <option value="voluntario">Voluntário</option>
                    <option value="nao_voluntario">Não voluntário</option>
                  </select>
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lblReq("acao-obs-t", "Observação")}
                  <textarea id="acao-obs-t" value={acaoObs} onChange={(e) => setAcaoObs(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                <div style={{ gridColumn: "1 / -1", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4 }}>Anexos</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setAcaoFiles(Array.from(e.target.files ?? []))}
                    style={{ fontSize: 12, width: "100%", color: t.textMuted }}
                    aria-label="Anexos"
                  />
                  {acaoFiles.length > 0 ? (
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{acaoFiles.map((f) => f.name).join(", ")}</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {acaoTipo === "alinhamento_formal" ? (
              <div>
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-obs-a", "Observação")}
                  <textarea id="acao-obs-a" value={acaoObs} onChange={(e) => setAcaoObs(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4 }}>Anexos</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setAcaoFiles(Array.from(e.target.files ?? []))}
                    style={{ fontSize: 12, width: "100%", color: t.textMuted }}
                    aria-label="Anexos"
                  />
                  {acaoFiles.length > 0 ? (
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{acaoFiles.map((f) => f.name).join(", ")}</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {acaoTipo === "revisao_contrato" || acaoTipo === "reativacao_prestacao" ? (
              <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {usarSelectOrganograma ? (
                    <>
                      {lblReq("acao-org", "Organograma")}
                      <SelectOrganogramaTimes
                        id="acao-org"
                        value={acaoForm.org_time_id ?? acaoForm.org_gerencia_id ?? acaoForm.org_diretoria_id ?? ""}
                        grupos={organogramaGrupos}
                        onPick={(id, op) => {
                          if (!id || !op) {
                            setAcaoForm((s) => ({ ...s, org_diretoria_id: null, org_gerencia_id: null, org_time_id: null, setor: "" }));
                            return;
                          }
                          if (op.nivel === "time") {
                            setAcaoForm((s) => ({
                              ...s,
                              org_diretoria_id: null,
                              org_gerencia_id: null,
                              org_time_id: op.timeId,
                              setor: op.setorNome,
                            }));
                          } else if (op.nivel === "gerencia") {
                            setAcaoForm((s) => ({
                              ...s,
                              org_diretoria_id: null,
                              org_gerencia_id: op.gerenciaId,
                              org_time_id: null,
                              setor: op.setorNome,
                            }));
                          } else {
                            setAcaoForm((s) => ({
                              ...s,
                              org_diretoria_id: op.diretoriaId,
                              org_gerencia_id: null,
                              org_time_id: null,
                              setor: op.setorNome,
                            }));
                          }
                        }}
                        aria-label="Organograma"
                        style={inputStyle}
                      />
                      {opcaoOrgAcaoForm ? (
                        <div
                          style={{
                            marginTop: 10,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: `1px solid ${t.cardBorder}`,
                            background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 6%, transparent)",
                            fontSize: 12,
                            color: t.textMuted,
                            lineHeight: 1.6,
                          }}
                        >
                          <div>
                            <strong style={{ color: t.text }}>Diretoria:</strong> {opcaoOrgAcaoForm.diretoriaNome}
                          </div>
                          {opcaoOrgAcaoForm.nivel !== "diretoria" ? (
                            <div>
                              <strong style={{ color: t.text }}>Gerência:</strong> {opcaoOrgAcaoForm.gerenciaNome || "—"}
                            </div>
                          ) : null}
                          {opcaoOrgAcaoForm.nivel === "time" ? (
                            <div>
                              <strong style={{ color: t.text }}>Time:</strong> {opcaoOrgAcaoForm.timeNome}
                            </div>
                          ) : null}
                          <div>
                            <strong style={{ color: t.text }}>Líder imediato:</strong> {opcaoOrgAcaoForm.gestorNome}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {lblReq("acao-setor", "Setor")}
                      <input
                        id="acao-setor"
                        value={acaoForm.setor}
                        onChange={(e) =>
                          setAcaoForm((s) => ({
                            ...s,
                            setor: e.target.value,
                            org_diretoria_id: null,
                            org_gerencia_id: null,
                            org_time_id: null,
                          }))
                        }
                        style={inputStyle}
                      />
                    </>
                  )}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-cargo", "Função")}
                  <input
                    id="acao-cargo"
                    value={acaoForm.cargo}
                    onChange={(e) => setAcaoForm((s) => ({ ...s, cargo: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-nivel", "Nível")}
                  <select
                    id="acao-nivel"
                    value={acaoForm.nivel}
                    onChange={(e) => setAcaoForm((s) => ({ ...s, nivel: e.target.value }))}
                    style={inputStyle}
                    aria-label="Nível"
                  >
                    {NIVEIS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    marginBottom: 10,
                    gridColumn: "1 / -1",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    {lblReq("acao-tipo", "Tipo de contrato")}
                    <select
                      id="acao-tipo-ct"
                      value={acaoForm.tipo_contrato}
                      onChange={(e) => setAcaoForm((s) => ({ ...s, tipo_contrato: e.target.value as RhFuncionarioTipoContrato }))}
                      style={inputStyle}
                      aria-label="Tipo de contrato"
                    >
                      {TIPOS_CONTRATO.map((x) => (
                        <option key={x.value} value={x.value}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {lblReq("acao-area-atuacao", "Área de atuação")}
                    <select
                      id="acao-area-atuacao"
                      value={
                        acaoForm.area_atuacao === "estudio" || acaoForm.area_atuacao === "escritorio"
                          ? acaoForm.area_atuacao
                          : "escritorio"
                      }
                      onChange={(e) => {
                        const v = e.target.value as RhAreaAtuacao;
                        setAcaoForm((s) => {
                          if (v === "escritorio") {
                            const esc = !s.escala.trim() || !escalaEhPermitida(s.escala) ? "5x2" : s.escala;
                            return {
                              ...s,
                              area_atuacao: v,
                              escala: esc,
                              remuneracaoHoraCentavos: "",
                              staff_turno: "",
                            };
                          }
                          if (v === "estudio") {
                            return { ...s, area_atuacao: v, salarioCentavos: "" };
                          }
                          return { ...s, area_atuacao: v };
                        });
                      }}
                      style={inputStyle}
                      aria-label="Área de atuação"
                    >
                      <option value="escritorio">Escritório</option>
                      <option value="estudio">Estúdio</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lbl("acao-email-spin", "E-mail Spin")}
                  <input
                    id="acao-email-spin"
                    type="email"
                    value={acaoForm.email_spin}
                    onChange={(e) => setAcaoForm((s) => ({ ...s, email_spin: e.target.value }))}
                    placeholder="exemplo@spingaming.com.br"
                    autoComplete="email"
                    style={inputStyle}
                    aria-label="E-mail corporativo Spin"
                  />
                </div>
                {podeVerDadosSensiveis ? (
                  acaoForm.area_atuacao === "estudio" ? (
                    <div style={{ marginBottom: 10 }}>
                      {lblReq("acao-rem-hora", "Remuneração por hora")}
                      <input
                        id="acao-rem-hora"
                        inputMode="numeric"
                        value={acaoForm.remuneracaoHoraCentavos ? formatarMoedaDigitos(acaoForm.remuneracaoHoraCentavos) : ""}
                        onChange={(e) =>
                          setAcaoForm((s) => ({ ...s, remuneracaoHoraCentavos: centavosDeStringMoeda(e.target.value) }))
                        }
                        placeholder="R$ 0,00"
                        style={inputStyle}
                      />
                    </div>
                  ) : (
                    <div style={{ marginBottom: 10 }}>
                      {lblReq("acao-sal", "Remuneração Mensal")}
                      <input
                        id="acao-sal"
                        inputMode="numeric"
                        value={acaoForm.salarioCentavos ? formatarMoedaDigitos(acaoForm.salarioCentavos) : ""}
                        onChange={(e) => setAcaoForm((s) => ({ ...s, salarioCentavos: centavosDeStringMoeda(e.target.value) }))}
                        placeholder="R$ 0,00"
                        style={inputStyle}
                      />
                    </div>
                  )
                ) : (
                  <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 8%, transparent)", fontSize: 12, color: t.textMuted }}>
                    Remuneração (mensal ou por hora): visível apenas para quem tem permissão de edição.
                  </div>
                )}
                <div style={{ marginBottom: 10 }}>
                  {lblReq("acao-escala", "Escala")}
                  <select
                    id="acao-escala"
                    value={valorSelectEscala(acaoForm.escala)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAcaoForm((s) => {
                        const escalaNova = v === "__legacy__" ? s.escala : v;
                        return {
                          ...s,
                          escala: escalaNova,
                          staff_turno: turnoRhCoerenteComEscala(escalaNova, s.staff_turno),
                        };
                      });
                    }}
                    style={inputStyle}
                    aria-label="Escala de trabalho"
                  >
                    <option value="">— Selecione —</option>
                    {valorSelectEscala(acaoForm.escala) === "__legacy__" ? (
                      <option value="__legacy__">
                        {acaoForm.escala.trim()} (cadastro antigo — escolha 5x2, 3x3, 4x2 ou 5x1)
                      </option>
                    ) : null}
                    {ESCALAS_PERMITIDAS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                {acaoForm.area_atuacao === "estudio" ? (
                  <div style={{ marginBottom: 10 }}>
                    {lblReq("acao-turno-estudio", "Turno")}
                    <select
                      id="acao-turno-estudio"
                      value={turnoRhCoerenteComEscala(acaoForm.escala, acaoForm.staff_turno)}
                      onChange={(e) => setAcaoForm((s) => ({ ...s, staff_turno: e.target.value }))}
                      style={inputStyle}
                      aria-label="Turno"
                    >
                      <option value="">— Selecione —</option>
                      {opcoesTurnoPorEscalaRh(acaoForm.escala).map((tn) => (
                        <option key={tn} value={tn}>
                          {tn}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {acaoTipo === "revisao_contrato" ? (
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    {lblReq("acao-dt-funcao", "Data da Função")}
                    <input
                      id="acao-dt-funcao"
                      type="date"
                      value={acaoForm.data_funcao}
                      onChange={(e) => setAcaoForm((s) => ({ ...s, data_funcao: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ) : null}
                {acaoTipo === "reativacao_prestacao" ? (
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    {lblReq("acao-dt-ini", "Data de início")}
                    <input
                      id="acao-dt-ini"
                      type="date"
                      value={acaoForm.data_inicio}
                      onChange={(e) => setAcaoForm((s) => ({ ...s, data_inicio: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ) : null}
                {acaoTipo === "reativacao_prestacao" ? (
                  <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                    {lblReq("acao-obs-rh", "Observação")}
                    <textarea
                      id="acao-obs-rh"
                      value={acaoForm.observacao_rh}
                      onChange={(e) => setAcaoForm((s) => ({ ...s, observacao_rh: e.target.value }))}
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                disabled={acaoSalvando}
                onClick={fecharModalRegistrarAcao}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  cursor: acaoSalvando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={acaoSalvando || !acaoTipo}
                onClick={() => void salvarAcaoRh()}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: acaoSalvando || !acaoTipo ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  background: ctaGradient(brand),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {acaoSalvando ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
                Salvar
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}

      {rhTalksOpen ? (
        <ModalBase maxWidth={640} onClose={fecharModalRhTalks}>
          <ModalHeader title="RH Talks" onClose={fecharModalRhTalks} />
          <div style={{ padding: "0 4px 16px", fontFamily: FONT.body }}>
            {erroGlobal ? (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  marginBottom: 12,
                  background: "rgba(232,64,37,0.12)",
                  border: "1px solid rgba(232,64,37,0.35)",
                  color: "#e84025",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={14} color="#e84025" aria-hidden />
                {erroGlobal}
              </div>
            ) : null}
            <div style={{ marginBottom: 12 }}>
              {lblReq("rt-talk", "RH Talks")}
              {rtTalksCarregando ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", color: t.textMuted, fontSize: 13 }}>
                  <Loader2 size={14} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
                  Carregando…
                </div>
              ) : rtTalksOpcoes.length === 0 ? (
                <div style={{ fontSize: 13, color: t.textMuted, padding: "8px 0", fontFamily: FONT.body }}>
                  Nenhum RH Talks publicado no Portal de RH. Cadastre e publique em Portal de RH antes de registrar participantes.
                </div>
              ) : (
                <select
                  id="rt-talk"
                  value={rtTalkId}
                  onChange={(e) => selecionarRhTalkPortal(e.target.value)}
                  style={inputStyle}
                  aria-label="RH Talks"
                >
                  <option value="">Selecione o RH Talks…</option>
                  {rtTalksOpcoes.map((talk) => (
                    <option key={talk.id} value={talk.id}>
                      {labelOpcaoRhTalkPortal(talk)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              {lblReq("rt-data", "Data da participação")}
              <input
                id="rt-data"
                type="date"
                value={rtData}
                onChange={(e) => setRtData(e.target.value)}
                style={inputStyle}
                aria-label="Data da participação"
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              {lblReq("rt-busca", "Participantes")}
              <BarraPesquisaPagina
                id="rt-busca"
                value={rtBusca}
                onChange={setRtBusca}
                placeholder={FILTER_SEARCH_STAFF}
                aria-label="Pesquisar funcionários para adicionar como participantes"
                wrapperStyle={{ width: "100%", marginBottom: 0 }}
              />
              {rtBusca.trim() ? (
                <div
                  style={{
                    marginTop: 8,
                    maxHeight: 200,
                    overflow: "auto",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg,
                  }}
                >
                  {sugestoesParticipantesRhTalks.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 12, color: t.textMuted }}>Nenhum resultado para esta pesquisa.</div>
                  ) : (
                    sugestoesParticipantesRhTalks.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setRtParticipantes((prev) => [...prev, f])}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 12px",
                          border: "none",
                          borderBottom: `1px solid ${t.cardBorder}`,
                          background: "transparent",
                          color: t.text,
                          cursor: "pointer",
                          fontSize: 13,
                          fontFamily: FONT.body,
                        }}
                      >
                        {f.nome}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                  Digite o nome para ver sugestões de participantes.
                </div>
              )}
              {rtParticipantes.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {rtParticipantes.map((p) => (
                    <span
                      key={p.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 10px",
                        borderRadius: 20,
                        border: `1px solid ${t.cardBorder}`,
                        background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 8%, transparent)",
                        fontSize: 12,
                        color: t.text,
                        fontFamily: FONT.body,
                      }}
                    >
                      {p.nome}
                      <button
                        type="button"
                        onClick={() => setRtParticipantes((prev) => prev.filter((x) => x.id !== p.id))}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          padding: 0,
                          color: t.textMuted,
                          lineHeight: 1,
                        }}
                        aria-label={`Remover ${p.nome} dos participantes`}
                      >
                        <X size={14} aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                disabled={rtSalvando}
                onClick={fecharModalRhTalks}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  cursor: rtSalvando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={rtSalvando || rtTalksCarregando || rtTalksOpcoes.length === 0}
                onClick={() => void salvarRhTalks()}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: rtSalvando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  background: ctaGradient(brand),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {rtSalvando ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
                Salvar
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}

      {anotacaoModalRow ? (
        <ModalBase maxWidth={640} onClose={fecharModalRegistrarAnotacao}>
          <ModalHeader title="Registrar Anotação" onClose={fecharModalRegistrarAnotacao} />
          <div style={{ padding: "0 4px 16px", fontFamily: FONT.body }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: t.textMuted }}>
              <strong style={{ color: t.text }}>{anotacaoModalRow.nome}</strong>
            </div>
            {erroGlobal ? (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  marginBottom: 12,
                  background: "rgba(232,64,37,0.12)",
                  border: "1px solid rgba(232,64,37,0.35)",
                  color: "#e84025",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={14} color="#e84025" aria-hidden />
                {erroGlobal}
              </div>
            ) : null}
            <div style={{ marginBottom: 12 }}>
              {lblReq("an-tipo", "Tipo")}
              <select
                id="an-tipo"
                value={anVisibilidade}
                onChange={(e) => setAnVisibilidade(e.target.value as "Particular" | "Publico")}
                style={inputStyle}
                aria-label="Tipo da anotação"
              >
                <option value="Publico">Público</option>
                <option value="Particular">Particular</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              {lblReq("an-assunto", "Assunto")}
              <input id="an-assunto" value={anAssunto} onChange={(e) => setAnAssunto(e.target.value)} style={inputStyle} aria-label="Assunto" />
            </div>
            <div style={{ marginBottom: 12 }}>
              {lblReq("an-data", "Data da conversa")}
              <input
                id="an-data"
                type="date"
                value={anData}
                onChange={(e) => setAnData(e.target.value)}
                style={inputStyle}
                aria-label="Data da conversa"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              {lblReq("an-ata", "Ata da reunião")}
              <textarea
                id="an-ata"
                value={anAta}
                onChange={(e) => setAnAta(e.target.value)}
                rows={6}
                style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
                aria-label="Ata da reunião"
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label htmlFor="an-anexo" style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
                Anexo
              </label>
              <input
                id="an-anexo"
                type="file"
                onChange={(e) => setAnFiles(Array.from(e.target.files ?? []))}
                style={{ fontSize: 12, width: "100%", color: t.textMuted }}
                aria-label="Anexo"
              />
              {anFiles.length > 0 ? (
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{anFiles.map((f) => f.name).join(", ")}</div>
              ) : null}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                disabled={anSalvando}
                onClick={fecharModalRegistrarAnotacao}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  cursor: anSalvando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={anSalvando}
                onClick={() => void salvarAnotacaoRh()}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: anSalvando ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  background: ctaGradient(brand),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {anSalvando ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
                Salvar
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}

      {histModalRow ? (
        <ModalBase maxWidth={720} onClose={fecharModalHistorico}>
          <ModalHeader title="Histórico" onClose={fecharModalHistorico} />
          <div style={{ padding: "0 4px 16px", fontFamily: FONT.body }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: t.textMuted }}>
              <strong style={{ color: t.text }}>{histModalRow.nome}</strong>
            </div>
            <label
              htmlFor="filtro-tipo-acao-historico-prestador"
              style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}
            >
              Tipo de ação
            </label>
            <select
              id="filtro-tipo-acao-historico-prestador"
              aria-label="Filtrar por tipo de ação"
              value={histModalFiltroTipo}
              onChange={(e) => setHistModalFiltroTipo(e.target.value as FiltroTipoAcaoHistoricoPrestador)}
              style={{
                width: "100%",
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg,
                color: t.text,
                fontSize: 13,
                fontFamily: FONT.body,
              }}
            >
              {FILTRO_TIPO_ACAO_HIST_PRESTADOR_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div style={{ maxHeight: "min(60vh, 480px)", overflowY: "auto", paddingRight: 2 }}>
              <ListaHistoricoRh
                items={histModalItemsFiltrados}
                loading={histModalLoading}
                t={t}
                emptyMessage={
                  histModalItems.length === 0 && !histModalLoading
                    ? "Sem dados para o período selecionado."
                    : "Nenhum registro deste tipo no histórico."
                }
              />
            </div>
          </div>
        </ModalBase>
      ) : null}

      {prestadorExcluirConfirm ? (
        <ModalConfirmExcluirPadrao
          descricaoItem={descricaoModalExcluirItem(
            "o cadastro de",
            prestadorExcluirConfirm.nome,
            `(CPF ${somenteDigitos(prestadorExcluirConfirm.cpf ?? "") || "—"})`,
          )}
          onCancel={() => {
            if (!excluindoPrestador) setPrestadorExcluirConfirm(null);
          }}
          onConfirm={() => void executarExclusaoPrestador()}
          loading={excluindoPrestador}
        />
      ) : null}

    </div>
  );
}

