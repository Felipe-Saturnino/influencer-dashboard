import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { REVISAO_GATE_BANNER_KEY } from "../../../lib/appRoutes";
import { FONT } from "../../../constants/theme";
import { RH_BANCOS_BRASIL, rhBancoParaSelectValue } from "../../../constants/rhBancosBrasil";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { buscarEnderecoPorCep, mesclarCamposEnderecoViaCep } from "../../../lib/rhViaCep";
import {
  formatarAgencia,
  formatarCepDigitos,
  formatarCnpjDigitos,
  formatarCpfDigitos,
  formatarRgInput,
  RG_INPUT_MAX_LENGTH,
  validarRgInput,
  formatarTelefoneBr,
  numeroDeCentavosStr,
  somenteDigitos,
  validarCnpjDigitos,
  validarCpfDigitos,
  validarDataNascimentoOpcional,
  validarEmail,
} from "../../../lib/rhFuncionarioValidators";
import type { RhFuncionario, RhFuncionarioHistorico, RhFuncionarioTipoContrato } from "../../../types/rhFuncionario";
import { carregarOpcoesTimesOrganograma } from "../../../lib/rhOrganogramaFetch";
import type { RhOrgOrganogramaGrupoPrestador, RhOrgTimeOpcao } from "../../../types/rhOrganograma";
import { filtraFuncionariosParaLoginEmail } from "../../../lib/rhFuncionarioLoginMatch";
import { encontrarVinculoParaFuncionarioRow, flattenVinculosDeGrupos } from "../../../lib/rhOrganogramaTree";
import { turnoRhCoerenteComEscala } from "../../../lib/rhEscalaTurnos";
import { syncGamePresenterDealerFromRhFuncionario } from "../../../lib/rhGamePresenterDealerSync";
import { ListaHistoricoRh, fmtDataIsoPtBr } from "../../../components/rh/ListaHistoricoRh";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import {
  FiltroBarTabButton,
  FiltroCalendarioStaffSelect,
  FiltroMeuCalendarioButton,
  onFiltroBarTabsKeyDown,
  SectionTitle,
} from "../../../components/dashboard";
import { ABAS_CADASTRO, CADASTRO_TAB_ICONS, CADASTRO_TAB_IDS } from "./constants";
import FormacaoCompetenciasPainel from "./FormacaoCompetencias";
import ExperienciaProfissionalPainel from "./ExperienciaProfissional";
import { PrestadorDocumentosCadastroBlocos } from "./PrestadorDocumentosCadastroBlocos";
import { getFilterBarRowStyle } from "../../../lib/filterBarStyles";
import { getPageFilterBoxStyle, getPageContentBoxStyle, PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { buscarRhFuncionarioAtivoPorEmailLogin } from "../../../lib/rhFuncionarioLoginMatch";
import {
  buildPayloadCadastralDadosCadastro,
  dadosCadastroVistaCompleta,
  dadosCadastroVisualizaProprioCadastro,
  historicoVisivelAbaDadosCadastro,
  podeEditarFuncionarioDadosCadastro,
} from "../../../lib/rhDadosCadastroHelpers";
import { podeEnviarDocumentosDadosCadastro } from "../../../lib/rhPrestadorDocumentosCadastro";
import {
  MESES_CICLO_REVISAO_CADASTRO,
  payloadMarcarRevisaoCadastral,
  cadastroRevisaoJaRegistradaPeloPrestador,
  precisaRevisaoCadastral,
  prestadorExigeRevisaoCadastral,
  proximaRevisaoCadastralEm,
  revisaoCadastralPendenteParaFuncionario,
  notificarRevisaoCadastralAtualizada,
} from "../../../lib/rhCadastroRevisao";
import {
  avaliarCompletudeCadastroRevisao,
  camposCadastraisIncompletos,
  carregarCompletudeExternaCadastro,
  verificarCompletudeCadastroRevisao,
  type RhCadastroCampoKey,
  type RhCadastroCompletudeExterna,
  type RhCadastroFormCompletudeInput,
} from "../../../lib/rhCadastroRevisaoCompleteness";

const UFS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO",
  "RR", "SC", "SP", "SE", "TO",
] as const;

const TIPOS_CONTRATO_LABEL: Record<RhFuncionarioTipoContrato, string> = {
  CLT: "CLT",
  PJ: "PJ",
  Estagio: "Estágio",
  Temporario: "Temporário",
};

type FormState = {
  nome: string;
  staff_nickname: string;
  rg: string;
  cpf: string;
  telefone: string;
  email: string;
  email_spin: string;
  data_nascimento: string;
  res_cep: string;
  res_logradouro: string;
  res_numero: string;
  res_complemento: string;
  res_cidade: string;
  res_estado: string;
  emerg_nome: string;
  emerg_parentesco: string;
  emerg_telefone: string;
  setor: string;
  org_diretoria_id: string | null;
  org_gerencia_id: string | null;
  org_time_id: string | null;
  cargo: string;
  nivel: string;
  salarioCentavos: string;
  data_inicio: string;
  data_funcao: string;
  escala: string;
  tipo_contrato: RhFuncionarioTipoContrato;
  nome_empresa: string;
  cnpj: string;
  emp_cep: string;
  emp_logradouro: string;
  emp_numero: string;
  emp_complemento: string;
  emp_cidade: string;
  emp_estado: string;
  banco: string;
  agencia: string;
  conta_corrente: string;
  pix: string;
  observacao_rh: string;
};

function formDeFuncionario(f: RhFuncionario): FormState {
  const cents = Math.round(Number(f.salario) * 100).toString();
  const resLog = (f.res_logradouro ?? "").trim() || f.endereco_residencial;
  const empLog = (f.emp_logradouro ?? "").trim() || f.endereco_empresa;
  const emergNome = (f.emerg_nome ?? "").trim() || f.contato_emergencia;
  return {
    nome: f.nome,
    staff_nickname: (f.staff_nickname ?? "").trim(),
    rg: formatarRgInput(f.rg),
    cpf: formatarCpfDigitos(f.cpf ?? ""),
    telefone: formatarTelefoneBr(f.telefone),
    email: f.email,
    email_spin: (f.email_spin ?? "").trim(),
    data_nascimento: f.data_nascimento ? String(f.data_nascimento).slice(0, 10) : "",
    res_cep: formatarCepDigitos(f.res_cep ?? ""),
    res_logradouro: resLog,
    res_numero: f.res_numero ?? "",
    res_complemento: f.res_complemento ?? "",
    res_cidade: f.res_cidade ?? "",
    res_estado: (f.res_estado ?? "").toUpperCase().slice(0, 2),
    emerg_nome: emergNome,
    emerg_parentesco: f.emerg_parentesco ?? "",
    emerg_telefone: formatarTelefoneBr(f.emerg_telefone ?? ""),
    setor: f.setor,
    org_diretoria_id: f.org_diretoria_id ?? null,
    org_gerencia_id: f.org_gerencia_id ?? null,
    org_time_id: f.org_time_id ?? null,
    cargo: f.cargo,
    nivel: f.nivel,
    salarioCentavos: cents,
    data_inicio: f.data_inicio,
    data_funcao: f.data_funcao ? String(f.data_funcao).slice(0, 10) : "",
    escala: f.escala,
    tipo_contrato: f.tipo_contrato,
    nome_empresa: f.nome_empresa,
    cnpj: formatarCnpjDigitos(f.cnpj),
    emp_cep: formatarCepDigitos(f.emp_cep ?? ""),
    emp_logradouro: empLog,
    emp_numero: f.emp_numero ?? "",
    emp_complemento: f.emp_complemento ?? "",
    emp_cidade: f.emp_cidade ?? "",
    emp_estado: (f.emp_estado ?? "").toUpperCase().slice(0, 2),
    banco: f.banco,
    agencia: formatarAgencia(f.agencia),
    conta_corrente: f.conta_corrente,
    pix: f.pix ?? "",
    observacao_rh: f.observacao_rh ?? "",
  };
}

function formParaCompletudeInput(f: FormState): RhCadastroFormCompletudeInput {
  return {
    nome: f.nome,
    rg: f.rg,
    cpf: f.cpf,
    telefone: f.telefone,
    email: f.email,
    data_nascimento: f.data_nascimento,
    res_cep: f.res_cep,
    res_logradouro: f.res_logradouro,
    res_numero: f.res_numero,
    res_complemento: f.res_complemento,
    res_cidade: f.res_cidade,
    res_estado: f.res_estado,
    emerg_nome: f.emerg_nome,
    emerg_parentesco: f.emerg_parentesco,
    emerg_telefone: f.emerg_telefone,
    tipo_contrato: f.tipo_contrato,
    nome_empresa: f.nome_empresa,
    cnpj: f.cnpj,
    emp_cep: f.emp_cep,
    emp_logradouro: f.emp_logradouro,
    emp_numero: f.emp_numero,
    emp_complemento: f.emp_complemento,
    emp_cidade: f.emp_cidade,
    emp_estado: f.emp_estado,
    banco: f.banco,
    agencia: f.agencia,
    conta_corrente: f.conta_corrente,
    pix: f.pix,
  };
}

function validarCadastroSelf(form: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  const req = (k: keyof FormState, label: string, v: string) => {
    if (!v.trim()) e[k as string] = `${label} é obrigatório.`;
  };
  req("nome", "Nome completo", form.nome);
  req("rg", "RG", form.rg);
  if (form.rg.trim() && !validarRgInput(form.rg)) e.rg = "RG inválido.";
  req("telefone", "Telefone", form.telefone);
  req("email", "E-mail", form.email);
  req("res_logradouro", "Logradouro (residencial)", form.res_logradouro);
  req("res_numero", "Número (residencial)", form.res_numero);
  req("res_cidade", "Cidade (residencial)", form.res_cidade);
  if (!form.res_estado.trim()) e.res_estado = "UF (residencial) é obrigatória.";
  else if (!UFS_BR.includes(form.res_estado.trim().toUpperCase() as (typeof UFS_BR)[number])) {
    e.res_estado = "UF inválida.";
  }
  const cepRes = somenteDigitos(form.res_cep);
  if (cepRes.length > 0 && cepRes.length !== 8) e.res_cep = "CEP residencial deve ter 8 dígitos.";
  req("emerg_nome", "Nome do contato de emergência", form.emerg_nome);
  req("emerg_telefone", "Telefone do contato de emergência", form.emerg_telefone);
  if (form.tipo_contrato === "PJ") {
    req("nome_empresa", "Nome da empresa", form.nome_empresa);
    req("emp_logradouro", "Logradouro da empresa", form.emp_logradouro);
    req("emp_numero", "Número da empresa", form.emp_numero);
    req("emp_cidade", "Cidade da empresa", form.emp_cidade);
    if (!form.emp_estado.trim()) e.emp_estado = "UF da empresa é obrigatória.";
    else if (!UFS_BR.includes(form.emp_estado.trim().toUpperCase() as (typeof UFS_BR)[number])) {
      e.emp_estado = "UF inválida.";
    }
    const cepEmp = somenteDigitos(form.emp_cep);
    if (cepEmp.length > 0 && cepEmp.length !== 8) e.emp_cep = "CEP da empresa deve ter 8 dígitos.";
  }
  req("banco", "Banco", form.banco);
  req("agencia", "Agência", form.agencia);
  req("conta_corrente", "Conta corrente", form.conta_corrente);
  req("pix", "PIX", form.pix);
  const cpfD = somenteDigitos(form.cpf);
  if (cpfD.length !== 11) e.cpf = "CPF deve ter 11 dígitos.";
  else if (!validarCpfDigitos(cpfD)) e.cpf = "CPF inválido.";
  if (form.tipo_contrato === "PJ") {
    const cnpjD = somenteDigitos(form.cnpj);
    if (cnpjD.length !== 14) e.cnpj = "CNPJ deve ter 14 dígitos.";
    else if (!validarCnpjDigitos(cnpjD)) e.cnpj = "CNPJ inválido.";
  }
  if (form.email.trim() && !validarEmail(form.email)) e.email = "E-mail inválido.";
  if (form.email_spin.trim() && !validarEmail(form.email_spin.trim())) {
    e.email_spin = "E-mail Spin inválido.";
  }
  if (form.data_nascimento.trim() && !validarDataNascimentoOpcional(form.data_nascimento)) {
    e.data_nascimento = "Data de nascimento inválida.";
  }
  const telD = somenteDigitos(form.telefone);
  if (telD.length < 10 || telD.length > 11) e.telefone = "Telefone inválido.";
  const telEmerg = somenteDigitos(form.emerg_telefone);
  if (telEmerg.length < 10 || telEmerg.length > 11) e.emerg_telefone = "Telefone de emergência inválido.";
  return e;
}

export default function RhDadosCadastroPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_dados_cadastro");

  const [aba, setAba] = useRouteTab("rh_dados_cadastro", "trabalho", CADASTRO_TAB_IDS);
  const [gateRedirectBanner] = useState(() => {
    if (typeof window === "undefined") return false;
    const flagged = sessionStorage.getItem(REVISAO_GATE_BANNER_KEY);
    if (flagged) sessionStorage.removeItem(REVISAO_GATE_BANNER_KEY);
    return !!flagged;
  });
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<RhFuncionario | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [msgOk, setMsgOk] = useState<string | null>(null);
  const [erroGlobal, setErroGlobal] = useState<string | null>(null);
  const [cepBusca, setCepBusca] = useState<"res" | "emp" | null>(null);

  const [organogramaGrupos, setOrganogramaGrupos] = useState<RhOrgOrganogramaGrupoPrestador[]>([]);
  const [opcoesTimes, setOpcoesTimes] = useState<RhOrgTimeOpcao[]>([]);

  const [histItems, setHistItems] = useState<RhFuncionarioHistorico[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const [declaracaoSemAlteracao, setDeclaracaoSemAlteracao] = useState(false);
  const [completudeExterna, setCompletudeExterna] = useState<RhCadastroCompletudeExterna | null>(null);
  const [completudeLoading, setCompletudeLoading] = useState(false);
  const [confirmandoSemAlteracao, setConfirmandoSemAlteracao] = useState(false);

  const vistaCompleta = !perm.loading && dadosCadastroVistaCompleta(perm.canView);
  const vistaApenasProprio = !perm.loading && !vistaCompleta;
  const [prestadores, setPrestadores] = useState<RhFuncionario[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [filterStaffId, setFilterStaffId] = useState<string | null>(null);
  const [meuPrestadorId, setMeuPrestadorId] = useState<string | null>(null);

  const opcoesVinculoFlat = useMemo(() => flattenVinculosDeGrupos(organogramaGrupos), [organogramaGrupos]);

  const revisaoPendente = useMemo(
    () => revisaoCadastralPendenteParaFuncionario(row),
    [row],
  );

  const proximaRevisaoLabel = useMemo(() => {
    if (!row) return null;
    const d = proximaRevisaoCadastralEm(row.cadastro_revisado_em);
    return d ? d.toLocaleDateString("pt-BR") : null;
  }, [row]);

  const orgLabel = useMemo(() => {
    if (!row) return "—";
    const v = encontrarVinculoParaFuncionarioRow(row, opcoesVinculoFlat);
    if (v) return v.label;
    const tm = opcoesTimes.find((o) => o.timeId === row.org_time_id);
    if (tm) return tm.label;
    return row.setor?.trim() || "—";
  }, [row, opcoesVinculoFlat, opcoesTimes]);

  const visualizandoProprioCadastro = dadosCadastroVisualizaProprioCadastro(
    vistaCompleta,
    meuPrestadorId,
    row?.id ?? null,
  );
  const podeEditarSelecionado = podeEditarFuncionarioDadosCadastro(perm, meuPrestadorId, row?.id ?? null, {
    vistaApenasProprio,
  });
  const podeEnviarDocumentos = podeEnviarDocumentosDadosCadastro(perm, meuPrestadorId, row?.id ?? null, {
    vistaApenasProprio,
  });

  const completudeRevisao = useMemo(() => {
    if (!form || !completudeExterna) return { ok: false, pendencias: [] as string[] };
    return avaliarCompletudeCadastroRevisao(form, completudeExterna);
  }, [form, completudeExterna]);

  const camposIncompletos = useMemo(
    () => (form ? camposCadastraisIncompletos(formParaCompletudeInput(form)) : new Set<RhCadastroCampoKey>()),
    [form],
  );

  const recarregarCompletude = useCallback(async (fid: string): Promise<RhCadastroCompletudeExterna | null> => {
    setCompletudeLoading(true);
    const { data, error } = await carregarCompletudeExternaCadastro(fid);
    setCompletudeLoading(false);
    if (error || !data) {
      setCompletudeExterna(null);
      return null;
    }
    setCompletudeExterna(data);
    return data;
  }, []);

  useEffect(() => {
    if (!row?.id) {
      setCompletudeExterna(null);
      return;
    }
    void recarregarCompletude(row.id);
  }, [row?.id, recarregarCompletude]);

  useEffect(() => {
    if (!completudeRevisao.ok) setDeclaracaoSemAlteracao(false);
  }, [completudeRevisao.ok]);
  const podeEditarFormacao = podeEditarSelecionado && row?.status !== "encerrado";
  const podeEditarExperiencia = podeEditarSelecionado && row?.status !== "encerrado";
  /** E-mail pessoal: somente leitura quando já gravado no cadastro; vazio no banco → inclusão editável até salvar. */
  const emailPessoalEditavel = Boolean(podeEditarSelecionado && row && !(row.email ?? "").trim());
  const meuCadastroAtivo = Boolean(meuPrestadorId && filterStaffId === meuPrestadorId);
  const staffSelectItems = useMemo(
    () => prestadores.map((p) => ({ id: p.id, name: (p.nome ?? "").trim() || "—" })),
    [prestadores],
  );
  const pageSubtitle = vistaCompleta
    ? "Consulta e atualização cadastral de prestadores."
    : "Atualização cadastral — apenas o seu cadastro";

  const carregarFuncionarioProprio = useCallback(async () => {
    if (!user?.email?.trim()) {
      setRow(null);
      setForm(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErroGlobal(null);
    const emailNorm = user.email.trim();
    const emailLc = emailNorm.toLowerCase();
    const [byEmail, bySpin] = await Promise.all([
      supabase.from("rh_funcionarios").select("*").ilike("email", emailNorm),
      supabase.from("rh_funcionarios").select("*").not("email_spin", "is", null).ilike("email_spin", emailNorm),
    ]);
    const errMsg = byEmail.error?.message ?? bySpin.error?.message ?? null;
    if (errMsg) {
      setErroGlobal(errMsg);
      setRow(null);
      setForm(null);
      setLoading(false);
      return;
    }
    const map = new Map<string, RhFuncionario>();
    for (const r of [...(byEmail.data ?? []), ...(bySpin.data ?? [])] as RhFuncionario[]) {
      map.set(r.id, r);
    }
    const rows = filtraFuncionariosParaLoginEmail([...map.values()], emailLc);
    if (rows.length === 0) {
      setRow(null);
      setForm(null);
      setLoading(false);
      return;
    }
    if (rows.length > 1) {
      setErroGlobal("Há mais de um cadastro associado ao seu e-mail de acesso. Procure o RH para regularizar.");
    }
    const r = rows[0]!;
    setRow(r);
    setForm(formDeFuncionario(r));
    setLoading(false);
  }, [user?.email]);

  const carregarFuncionarioPorId = useCallback(async (funcionarioId: string) => {
    setLoading(true);
    setErroGlobal(null);
    const { data, error } = await supabase.from("rh_funcionarios").select("*").eq("id", funcionarioId).maybeSingle();
    if (error) {
      setErroGlobal("Não foi possível carregar o cadastro selecionado.");
      setRow(null);
      setForm(null);
      setLoading(false);
      return;
    }
    if (!data) {
      setRow(null);
      setForm(null);
      setLoading(false);
      return;
    }
    const r = data as RhFuncionario;
    setRow(r);
    setForm(formDeFuncionario(r));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (perm.loading) return;
    if (vistaCompleta) {
      if (!filterStaffId) {
        setRow(null);
        setForm(null);
        setLoading(false);
        return;
      }
      void carregarFuncionarioPorId(filterStaffId);
      return;
    }
    void carregarFuncionarioProprio();
  }, [perm.loading, vistaCompleta, filterStaffId, carregarFuncionarioProprio, carregarFuncionarioPorId]);

  useEffect(() => {
    if (perm.loading || !vistaCompleta) return;
    setLoadingStaff(true);
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("rh_funcionarios")
        .select("id, nome, staff_nickname, email, email_spin, status")
        .in("status", ["ativo", "indisponivel"])
        .order("nome", { ascending: true });
      if (cancelled) return;
      if (error) {
        setPrestadores([]);
        setLoadingStaff(false);
        return;
      }
      setPrestadores((data ?? []) as RhFuncionario[]);
      setLoadingStaff(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [perm.loading, vistaCompleta]);

  useEffect(() => {
    if (perm.loading || !user?.email?.trim()) return;
    let cancelled = false;
    void buscarRhFuncionarioAtivoPorEmailLogin(user.email).then((r) => {
      if (!cancelled) setMeuPrestadorId(r?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [perm.loading, user?.email]);

  useEffect(() => {
    if (!vistaCompleta || !meuPrestadorId || filterStaffId) return;
    setFilterStaffId(meuPrestadorId);
  }, [vistaCompleta, meuPrestadorId, filterStaffId]);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const { opcoes, grupos } = await carregarOpcoesTimesOrganograma();
      if (!cancel) {
        setOrganogramaGrupos(grupos);
        setOpcoesTimes(opcoes);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const carregarHistorico = useCallback(async (fid: string, viewingSelf: boolean) => {
    setHistLoading(true);
    const { data, error } = await supabase
      .from("rh_funcionario_historico")
      .select("*")
      .eq("rh_funcionario_id", fid)
      .order("created_at", { ascending: false });
    setHistLoading(false);
    if (error) {
      setHistItems([]);
      return;
    }
    setHistItems(
      ((data ?? []) as RhFuncionarioHistorico[]).filter((h) =>
        historicoVisivelAbaDadosCadastro(h, viewingSelf),
      ),
    );
  }, []);

  useEffect(() => {
    if (!row?.id) return;
    void carregarHistorico(row.id, visualizandoProprioCadastro);
  }, [row?.id, visualizandoProprioCadastro, carregarHistorico]);

  const handleCepBlur = (qual: "res" | "emp", cepRaw: string) => {
    void (async () => {
      const d = somenteDigitos(cepRaw);
      if (d.length !== 8) return;
      setCepBusca(qual);
      const r = await buscarEnderecoPorCep(cepRaw);
      setCepBusca(null);
      if (!r.ok) {
        setErroGlobal(r.message);
        return;
      }
      setErroGlobal(null);
      if (qual === "res") {
        setForm((s) => {
          if (!s) return s;
          const m = mesclarCamposEnderecoViaCep(
            {
              logradouro: s.res_logradouro,
              complemento: s.res_complemento,
              cidade: s.res_cidade,
              estado: s.res_estado,
            },
            r,
          );
          return {
            ...s,
            res_logradouro: m.logradouro,
            res_complemento: m.complemento,
            res_cidade: m.cidade,
            res_estado: m.estado,
          };
        });
      } else {
        setForm((s) => {
          if (!s) return s;
          const m = mesclarCamposEnderecoViaCep(
            {
              logradouro: s.emp_logradouro,
              complemento: s.emp_complemento,
              cidade: s.emp_cidade,
              estado: s.emp_estado,
            },
            r,
          );
          return {
            ...s,
            emp_logradouro: m.logradouro,
            emp_complemento: m.complemento,
            emp_cidade: m.cidade,
            emp_estado: m.estado,
          };
        });
      }
    })();
  };

  const marcarRevisaoCadastralNoBanco = async (funcionarioId: string, comAlteracao: boolean) => {
    const patch = payloadMarcarRevisaoCadastral(comAlteracao ? "alteracao" : "sem_alteracao");
    const { error } = await supabase.from("rh_funcionarios").update(patch).eq("id", funcionarioId);
    return error;
  };

  /**
   * Só marca `cadastro_revisado_em` quando todo o cadastro exigido está completo.
   * Permite salvar/enviar por etapas sem encerrar o bloqueio antes da hora.
   */
  const tentarConcluirRevisaoCadastralSeCompleto = async (
    funcionarioId: string,
    formCompletude: RhCadastroFormCompletudeInput,
    revisaoEstavaPendente: boolean,
  ): Promise<{ concluiu: boolean; pendencias: string[] }> => {
    if (
      !visualizandoProprioCadastro ||
      !prestadorExigeRevisaoCadastral(row?.status ?? "encerrado") ||
      !revisaoEstavaPendente
    ) {
      return { concluiu: false, pendencias: [] };
    }
    const verificacao = await verificarCompletudeCadastroRevisao(funcionarioId, formCompletude);
    if (verificacao.externo) setCompletudeExterna(verificacao.externo);
    if (verificacao.error) {
      return { concluiu: false, pendencias: [] };
    }
    if (!verificacao.ok) {
      return { concluiu: false, pendencias: verificacao.pendencias };
    }
    const revErr = await marcarRevisaoCadastralNoBanco(funcionarioId, true);
    if (revErr) {
      setErroGlobal("Não foi possível registrar a revisão cadastral. Se o problema persistir, entre em contato com o suporte.");
      return { concluiu: false, pendencias: [] };
    }
    notificarRevisaoCadastralAtualizada();
    return { concluiu: true, pendencias: [] };
  };

  const handleDocumentosAlterados = async () => {
    if (!row || !form) return;
    setErroGlobal(null);
    await recarregarCompletude(row.id);
    const revisaoEstavaPendente = revisaoCadastralPendenteParaFuncionario(row);
    const { concluiu } = await tentarConcluirRevisaoCadastralSeCompleto(
      row.id,
      formParaCompletudeInput(form),
      revisaoEstavaPendente,
    );
    if (concluiu) {
      setMsgOk("Documentos atualizados e revisão cadastral concluída.");
      if (vistaCompleta && row.id) {
        await carregarFuncionarioPorId(row.id);
      } else {
        await carregarFuncionarioProprio();
      }
      await carregarHistorico(row.id, true);
    } else {
      setMsgOk("Documentos atualizados.");
    }
  };

  const handleCompletudeExternaAlterada = async () => {
    if (!row || !form) return;
    await recarregarCompletude(row.id);
    const revisaoEstavaPendente = revisaoCadastralPendenteParaFuncionario(row);
    const { concluiu } = await tentarConcluirRevisaoCadastralSeCompleto(
      row.id,
      formParaCompletudeInput(form),
      revisaoEstavaPendente,
    );
    if (concluiu) {
      setMsgOk("Revisão cadastral concluída.");
      if (vistaCompleta && row.id) {
        await carregarFuncionarioPorId(row.id);
      } else {
        await carregarFuncionarioProprio();
      }
      await carregarHistorico(row.id, true);
    }
  };

  const confirmarSemAlteracoes = async () => {
    if (!podeEditarSelecionado || !visualizandoProprioCadastro || !row || !form || !declaracaoSemAlteracao) return;
    setConfirmandoSemAlteracao(true);
    setErroGlobal(null);
    setMsgOk(null);
    const verificacao = await verificarCompletudeCadastroRevisao(row.id, formParaCompletudeInput(form));
    if (verificacao.externo) setCompletudeExterna(verificacao.externo);
    if (verificacao.error) {
      setConfirmandoSemAlteracao(false);
      setErroGlobal(verificacao.error);
      return;
    }
    if (!verificacao.ok) {
      setConfirmandoSemAlteracao(false);
      setErroGlobal(
        "Complete todas as informações obrigatórias do cadastro antes de confirmar sem alterações.",
      );
      return;
    }
    const { error } = await supabase.rpc("rh_registrar_revisao_cadastral_sem_alteracao", {
      p_funcionario_id: row.id,
    });
    setConfirmandoSemAlteracao(false);
    if (error) {
      setErroGlobal(error.message);
      return;
    }
    setDeclaracaoSemAlteracao(false);
    setMsgOk("Revisão cadastral registrada. Nenhuma alteração informada neste período.");
    if (vistaCompleta && row.id) {
      await carregarFuncionarioPorId(row.id);
    } else {
      await carregarFuncionarioProprio();
    }
    await carregarHistorico(row.id, true);
    notificarRevisaoCadastralAtualizada();
  };

  const salvarCadastro = async () => {
    if (!podeEditarSelecionado || !row || !form) return;
    const e = validarCadastroSelf(form);
    setFieldErr(e);
    if (Object.keys(e).length > 0) return;
    setSalvando(true);
    setErroGlobal(null);
    setMsgOk(null);
    const revisaoEstavaPendente = revisaoCadastralPendenteParaFuncionario(row);
    const payload = buildPayloadCadastralDadosCadastro(form, row.status);
    const { data: atualizado, error } = await supabase.from("rh_funcionarios").update(payload).eq("id", row.id).select("*").maybeSingle();
    setSalvando(false);
    if (error) {
      if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
        setErroGlobal("Já existe um cadastro com este CPF.");
      } else {
        setErroGlobal(error.message);
      }
      return;
    }
    if (atualizado) {
      await syncGamePresenterDealerFromRhFuncionario(atualizado as RhFuncionario);
    }
    const formPosSave = atualizado ? formDeFuncionario(atualizado as RhFuncionario) : form;
    const { concluiu } = await tentarConcluirRevisaoCadastralSeCompleto(
      row.id,
      formParaCompletudeInput(formPosSave),
      revisaoEstavaPendente,
    );
    setMsgOk(
      concluiu
        ? "Dados atualizados e revisão cadastral concluída."
        : revisaoEstavaPendente && visualizandoProprioCadastro
          ? "Dados atualizados. A revisão cadastral permanece pendente até completar todas as informações obrigatórias."
          : "Dados atualizados.",
    );
    if (vistaCompleta && row.id) {
      await carregarFuncionarioPorId(row.id);
    } else {
      await carregarFuncionarioProprio();
    }
    await carregarHistorico(row.id, visualizandoProprioCadastro);
    await recarregarCompletude(row.id);
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
  };

  const readOnlyBox: CSSProperties = {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.cardBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
  };

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  if (perm.loading || loading || (vistaCompleta && loadingStaff)) {
    return (
      <div className="app-page-shell" style={{ color: t.textMuted, fontFamily: FONT.body }}>
        <Loader2 size={18} className="app-lucide-spin" aria-hidden style={{ verticalAlign: "middle", marginRight: 8 }} />
        Carregando…
      </div>
    );
  }

  if (!user?.email) {
    return (
      <div className="app-page-shell" style={{ color: t.textMuted, fontFamily: FONT.body }}>
        Não foi possível identificar o e-mail da sessão.
      </div>
    );
  }

  if (vistaCompleta && !filterStaffId) {
    return (
      <div className="app-page-shell">
        <PageHeader
          icon={<PageMenuIcon pageKey="rh_dados_cadastro" />}
          title={getPageMenuLabel("rh_dados_cadastro")}
          subtitle={pageSubtitle}
        />
        <div style={getPageFilterBoxStyle(brand, t)}>
          <div style={getFilterBarRowStyle({ width: "100%" })}>
            <FiltroCalendarioStaffSelect
              mode="single"
              selected={filterStaffId ? [filterStaffId] : []}
              onChange={(ids) => setFilterStaffId(ids[0] ?? null)}
              items={staffSelectItems}
              disabled={loadingStaff || staffSelectItems.length === 0}
            />
            {meuPrestadorId ? (
              <FiltroMeuCalendarioButton
                active={meuCadastroAtivo}
                onClick={() => setFilterStaffId(meuPrestadorId)}
                ariaLabelActive="Mostrar lista completa de prestadores"
                ariaLabelInactive="Filtrar cadastro apenas para o meu registro de prestador"
              >
                Meu Cadastro
              </FiltroMeuCalendarioButton>
            ) : null}
          </div>
        </div>
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Selecione um prestador no filtro Staff para visualizar o cadastro.
        </div>
      </div>
    );
  }

  if (!row || !form) {
    return (
      <div className="app-page-shell">
        <PageHeader
          icon={<PageMenuIcon pageKey="rh_dados_cadastro" />}
          title={getPageMenuLabel("rh_dados_cadastro")}
          subtitle={pageSubtitle}
        />
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Não encontramos um cadastro de prestador vinculado ao seu e-mail de acesso. Em caso de dúvida, fale com o RH.
        </div>
      </div>
    );
  }

  const isPj = form.tipo_contrato === "PJ";
  const salarioFmt = fmtBRL(numeroDeCentavosStr(form.salarioCentavos));
  const areaEstudio = row.area_atuacao === "estudio";
  const remuneracaoTrabalhoLabel = areaEstudio ? "Remuneração por hora" : "Remuneração mensal";
  const rhCent = Number(row.remuneracao_hora_centavos ?? 0);
  const remuneracaoTrabalhoValor = areaEstudio
    ? rhCent > 0
      ? fmtBRL(rhCent / 100)
      : "—"
    : salarioFmt;

  const pageBox = getPageContentBoxStyle(brand, t);
  const cadastroBlocosCol: CSSProperties = { display: "flex", flexDirection: "column", gap: PAGE_CONTENT_BOX_GAP };

  const campoVazio = (key: RhCadastroCampoKey) => camposIncompletos.has(key);

  const lblCadastral = (key: RhCadastroCampoKey | null): CSSProperties => ({
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: key && campoVazio(key) ? "#e84025" : t.textMuted,
    fontFamily: FONT.body,
    marginBottom: 4,
  });

  const lblCadastralReadOnly = (key: RhCadastroCampoKey): CSSProperties => ({
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: campoVazio(key) ? "#e84025" : t.textMuted,
    fontFamily: FONT.body,
    marginBottom: 4,
  });

  const filterBarTabsRow = (withTopBorder: boolean): CSSProperties => ({
    ...getFilterBarRowStyle(),
    width: "100%",
    marginBottom: withTopBorder ? 0 : PAGE_CONTENT_BOX_GAP,
    ...(withTopBorder ? { paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` } : {}),
  });

  const revisaoCadastralProximaNotice =
    !revisaoPendente && proximaRevisaoLabel && visualizandoProprioCadastro && row ? (
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: t.textMuted,
          fontFamily: FONT.body,
          lineHeight: 1.55,
          textAlign: "center",
          width: "100%",
          maxWidth: "100%",
        }}
      >
        Próxima revisão cadastral prevista em <strong>{proximaRevisaoLabel}</strong>.
        {cadastroRevisaoJaRegistradaPeloPrestador(row.cadastro_revisado_em) ? (
          <>
            {" "}
            Última revisão em{" "}
            <strong>{fmtDataIsoPtBr(String(row.cadastro_revisado_em).slice(0, 10))}</strong>
            {row.cadastro_revisao_tipo === "sem_alteracao" ? " (sem alterações declaradas)" : null}.
          </>
        ) : null}
      </p>
    ) : null;

  const revisaoCadastralProximaNoticeRow = revisaoCadastralProximaNotice ? (
    <div className="app-cadastro-revisao-notice">{revisaoCadastralProximaNotice}</div>
  ) : null;

  const abasCadastro = (
    <>
      {ABAS_CADASTRO.map((tb) => (
        <FiltroBarTabButton
          key={tb.key}
          id={`tab-cadastro-${tb.key}`}
          active={aba === tb.key}
          onClick={() => setAba(tb.key)}
          icon={CADASTRO_TAB_ICONS[tb.key]}
        >
          {tb.label}
        </FiltroBarTabButton>
      ))}
    </>
  );

  return (
    <div className="app-page-shell app-page-shell--pb64">
      <PageHeader
        icon={<PageMenuIcon pageKey="rh_dados_cadastro" />}
        title={getPageMenuLabel("rh_dados_cadastro")}
        subtitle={pageSubtitle}
      />

      {erroGlobal ? (
        <div style={{ marginBottom: 12, padding: 12, borderRadius: 12, border: `1px solid #e84025`, color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
          {erroGlobal}
        </div>
      ) : null}
      {msgOk ? (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            border: `1px solid #22c55e`,
            color: "#22c55e",
            fontSize: 13,
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} aria-hidden />
          {msgOk}
        </div>
      ) : null}

      {gateRedirectBanner && visualizandoProprioCadastro ? (
        <div
          role="status"
          style={{
            marginBottom: PAGE_CONTENT_BOX_GAP,
            padding: "12px 16px",
            borderRadius: 12,
            border: `1px solid ${t.cardBorder}`,
            background: t.cardBg,
            fontSize: 13,
            color: t.textMuted,
            fontFamily: FONT.body,
            lineHeight: 1.55,
          }}
        >
          Conclua a atualização cadastral obrigatória nesta página para voltar a usar o restante do sistema.
        </div>
      ) : null}

      {revisaoPendente && visualizandoProprioCadastro ? (
        <section
          aria-labelledby="revisao-cadastral-titulo"
          style={{
            marginBottom: PAGE_CONTENT_BOX_GAP,
            padding: "16px 18px",
            borderRadius: 14,
            border: "1px solid rgba(232, 64, 37, 0.28)",
            borderLeft: `4px solid #e84025`,
            background: `color-mix(in srgb, #e84025 6%, ${t.cardBg})`,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <AlertTriangle size={20} color="#e84025" aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                id="revisao-cadastral-titulo"
                style={{
                  margin: "0 0 8px",
                  fontFamily: FONT_TITLE,
                  fontSize: 15,
                  color: t.text,
                }}
              >
                Atualização cadastral obrigatória
              </h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: t.text, lineHeight: 1.6, fontFamily: FONT.body }}>
                A cada {MESES_CICLO_REVISAO_CADASTRO} meses você deve revisar seu cadastro nesta página. Se algo mudou,
                atualize os dados nas abas <strong>Dados cadastrais</strong>, <strong>Documentos</strong>,{" "}
                <strong>Formação e Competências</strong> ou <strong>Experiência Profissional</strong> e salve ou envie os
                arquivos. Para usar <strong>Confirmar sem alterações</strong>, todo o cadastro deve estar completo (campos,
                documentos e registros exigidos por tipo de contrato).
              </p>
              {completudeLoading ? (
                <p style={{ margin: "0 0 12px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                  Verificando completude do cadastro…
                </p>
              ) : !completudeRevisao.ok && completudeRevisao.pendencias.length > 0 ? (
                <div
                  role="status"
                  style={{
                    margin: "0 0 12px",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg,
                    fontSize: 12,
                    color: t.text,
                    fontFamily: FONT.body,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Pendências para concluir a atualização cadastral:</div>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>
                    {completudeRevisao.pendencias.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {cadastroRevisaoJaRegistradaPeloPrestador(row.cadastro_revisado_em) ? (
                <p style={{ margin: "0 0 12px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                  Última revisão: {fmtDataIsoPtBr(String(row.cadastro_revisado_em).slice(0, 10))}
                  {precisaRevisaoCadastral(row.cadastro_revisado_em) ? " (vencida)" : null}
                </p>
              ) : (
                <p style={{ margin: "0 0 12px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                  Primeira revisão cadastral pendente: conclua a atualização ou confirme que seus dados estão corretos
                  antes de usar as demais áreas da plataforma.
                </p>
              )}
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  fontSize: 13,
                  color: t.text,
                  fontFamily: FONT.body,
                  cursor: podeEditarSelecionado ? "pointer" : "default",
                  marginBottom: 12,
                }}
              >
                <input
                  type="checkbox"
                  checked={declaracaoSemAlteracao}
                  disabled={
                    !podeEditarSelecionado ||
                    confirmandoSemAlteracao ||
                    salvando ||
                    completudeLoading ||
                    !completudeRevisao.ok
                  }
                  onChange={(ev) => setDeclaracaoSemAlteracao(ev.target.checked)}
                  aria-label="Confirmar que não houve alteração nos dados cadastrais neste período"
                  style={{ marginTop: 3, flexShrink: 0 }}
                />
                <span>
                  Confirmo que meus dados cadastrais e documentos estão corretos
                  {cadastroRevisaoJaRegistradaPeloPrestador(row.cadastro_revisado_em)
                    ? " e que não houve alteração no período desde a última revisão."
                    : "."}
                </span>
              </label>
              <button
                type="button"
                disabled={
                  !podeEditarSelecionado ||
                  !declaracaoSemAlteracao ||
                  confirmandoSemAlteracao ||
                  salvando ||
                  completudeLoading ||
                  !completudeRevisao.ok
                }
                onClick={() => void confirmarSemAlteracoes()}
                title={
                  !completudeRevisao.ok
                    ? "Complete todos os campos obrigatórios do cadastro antes de confirmar."
                    : undefined
                }
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: brand.useBrand
                    ? `linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))`
                    : `linear-gradient(135deg, var(--brand-primary, #7c3aed), var(--brand-accent, #1e36f8))`,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor:
                    !podeEditarSelecionado ||
                    !declaracaoSemAlteracao ||
                    confirmandoSemAlteracao ||
                    salvando ||
                    completudeLoading ||
                    !completudeRevisao.ok
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    !podeEditarSelecionado ||
                    !declaracaoSemAlteracao ||
                    confirmandoSemAlteracao ||
                    salvando ||
                    completudeLoading ||
                    !completudeRevisao.ok
                      ? 0.55
                      : 1,
                  fontFamily: FONT.body,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {confirmandoSemAlteracao ? (
                  <>
                    <Loader2 size={14} className="app-lucide-spin" aria-hidden />
                    Registrando…
                  </>
                ) : (
                  "Confirmar sem alterações"
                )}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {vistaCompleta && row && !podeEditarSelecionado ? (
        <div
          role="status"
          style={{
            marginBottom: PAGE_CONTENT_BOX_GAP,
            padding: "12px 16px",
            borderRadius: 12,
            border: `1px solid ${t.cardBorder}`,
            background: t.cardBg,
            fontSize: 13,
            color: t.textMuted,
            fontFamily: FONT.body,
          }}
        >
          Visualização somente leitura — você não pode editar o cadastro deste prestador.
        </div>
      ) : null}

      {vistaCompleta ? (
        <div style={{ ...getPageFilterBoxStyle(brand, t), marginBottom: PAGE_CONTENT_BOX_GAP }}>
          <div style={getFilterBarRowStyle({ width: "100%" })}>
            <FiltroCalendarioStaffSelect
              mode="single"
              selected={filterStaffId ? [filterStaffId] : []}
              onChange={(ids) => setFilterStaffId(ids[0] ?? null)}
              items={staffSelectItems}
              disabled={loadingStaff || staffSelectItems.length === 0}
            />
            {meuPrestadorId ? (
              <FiltroMeuCalendarioButton
                active={meuCadastroAtivo}
                onClick={() => setFilterStaffId(meuPrestadorId)}
                ariaLabelActive="Mostrar lista completa de prestadores"
                ariaLabelInactive="Filtrar cadastro apenas para o meu registro de prestador"
              >
                Meu Cadastro
              </FiltroMeuCalendarioButton>
            ) : null}
          </div>
          {revisaoCadastralProximaNoticeRow}
          <div
            role="tablist"
            aria-label="Seções do cadastro"
            className="app-cadastro-tabs-row"
            style={filterBarTabsRow(true)}
            onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ABAS_CADASTRO.map((tb) => tb.key), setAba, (k) => `tab-cadastro-${k}`)}
          >
            {abasCadastro}
          </div>
        </div>
      ) : (
        <div style={{ ...getPageFilterBoxStyle(brand, t), marginBottom: PAGE_CONTENT_BOX_GAP }}>
          {revisaoCadastralProximaNoticeRow}
          <div
            role="tablist"
            aria-label="Seções do cadastro"
            className="app-cadastro-tabs-row"
            style={{
              ...(revisaoCadastralProximaNotice
                ? { paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }
                : {}),
              display: "flex",
              gap: 8,
              ...getFilterBarRowStyle(),
              width: "100%",
            }}
            onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ABAS_CADASTRO.map((tb) => tb.key), setAba, (k) => `tab-cadastro-${k}`)}
          >
            {abasCadastro}
          </div>
        </div>
      )}

      {aba === "trabalho" ? (
        <div style={cadastroBlocosCol}>
          <div style={pageBox}>
            <SectionTitle sub="Mantidos pelo RH — não podem ser alterados por aqui">Dados da contratação</SectionTitle>
            <div className="app-grid-form" style={{ marginTop: 4 }}>
              {(
                [
                  ["Organograma", orgLabel],
                  ["Função", form.cargo],
                  ["Nível", form.nivel],
                  ["Tipo de contrato", TIPOS_CONTRATO_LABEL[form.tipo_contrato]],
                  ["E-mail Spin", form.email_spin?.trim() || "—"],
                  [remuneracaoTrabalhoLabel, remuneracaoTrabalhoValor],
                  ["Data de início", form.data_inicio ? form.data_inicio.slice(0, 10).split("-").reverse().join("/") : "—"],
                  ["Escala", form.escala],
                  ["Turno", turnoRhCoerenteComEscala(row.escala, row.staff_turno) || "—"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>{k}</div>
                  <div style={readOnlyBox}>{v || "—"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {aba === "cadastral" ? (
        <div style={cadastroBlocosCol}>
          <div style={pageBox}>
            <SectionTitle sub="Identificação e contato">Dados pessoais</SectionTitle>
            <div className="app-grid-form" style={{ marginTop: 4 }}>
            <div style={{ marginBottom: 10 }}>
              <span id="dc-nome-lbl" style={lblCadastralReadOnly("nome")}>
                Nome completo
              </span>
              <div id="dc-nome" style={readOnlyBox} aria-labelledby="dc-nome-lbl">
                {form.nome.trim() || "—"}
              </div>
              {fieldErr.nome ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.nome}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <span id="dc-nickname-lbl" style={lblCadastral(null)}>
                Nickname
              </span>
              <div id="dc-nickname" style={readOnlyBox} aria-labelledby="dc-nickname-lbl">
                {form.staff_nickname.trim() || "—"}
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-rg" style={lblCadastral("rg")}>
                RG
              </label>
              <input
                id="dc-rg"
                disabled={!podeEditarSelecionado}
                value={form.rg}
                maxLength={RG_INPUT_MAX_LENGTH}
                onChange={(e) => setForm((s) => (s ? { ...s, rg: formatarRgInput(e.target.value) } : s))}
                style={inputStyle}
              />
              {fieldErr.rg ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.rg}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-cpf" style={lblCadastral("cpf")}>
                CPF
              </label>
              <input
                id="dc-cpf"
                disabled={!podeEditarSelecionado}
                value={form.cpf}
                onChange={(e) => setForm((s) => (s ? { ...s, cpf: formatarCpfDigitos(e.target.value) } : s))}
                style={inputStyle}
              />
              {fieldErr.cpf ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.cpf}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-data-nasc" style={lblCadastral("data_nascimento")}>
                Data de nascimento
              </label>
              {podeEditarSelecionado ? (
                <input
                  id="dc-data-nasc"
                  type="date"
                  value={form.data_nascimento.trim().slice(0, 10)}
                  onChange={(e) => setForm((s) => (s ? { ...s, data_nascimento: e.target.value } : s))}
                  style={inputStyle}
                  aria-label="Data de nascimento"
                />
              ) : (
                <div style={readOnlyBox}>{fmtDataIsoPtBr(form.data_nascimento)}</div>
              )}
              {fieldErr.data_nascimento ? (
                <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.data_nascimento}</div>
              ) : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-tel" style={lblCadastral("telefone")}>
                Telefone
              </label>
              <input
                id="dc-tel"
                disabled={!podeEditarSelecionado}
                value={form.telefone}
                onChange={(e) => setForm((s) => (s ? { ...s, telefone: formatarTelefoneBr(e.target.value) } : s))}
                style={inputStyle}
              />
              {fieldErr.telefone ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.telefone}</div> : null}
            </div>
            <div className="app-grid-form-span-full" style={{ marginBottom: 10 }}>
              {emailPessoalEditavel ? (
                <>
                  <label htmlFor="dc-email" style={lblCadastral("email")}>
                    E-mail
                  </label>
                  <input
                    id="dc-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm((s) => (s ? { ...s, email: e.target.value } : s))}
                    style={inputStyle}
                    aria-label="E-mail pessoal"
                  />
                </>
              ) : (
                <>
                  <span id="dc-email-lbl" style={lblCadastralReadOnly("email")}>
                    E-mail
                  </span>
                  <div id="dc-email" style={{ ...readOnlyBox, wordBreak: "break-word" }} aria-labelledby="dc-email-lbl">
                    {form.email.trim() || "—"}
                  </div>
                </>
              )}
              {fieldErr.email ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.email}</div> : null}
            </div>
          </div>
          </div>

          <div style={pageBox}>
            <SectionTitle sub="CEP, logradouro e complemento">Endereço residencial</SectionTitle>
            <div className="app-grid-form" style={{ marginTop: 4 }}>
            <div style={{ marginBottom: 10 }}>
              <span style={lblCadastral("res_cep")}>CEP</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  id="dc-cep-res"
                  disabled={!podeEditarSelecionado}
                  value={form.res_cep}
                  onChange={(e) => setForm((s) => (s ? { ...s, res_cep: formatarCepDigitos(e.target.value) } : s))}
                  onBlur={(e) => handleCepBlur("res", e.target.value)}
                  placeholder="00000-000"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  style={{ ...inputStyle, flex: "1 1 120px", minWidth: 0 }}
                  aria-label="CEP residencial"
                />
                <button
                  type="button"
                  disabled={!podeEditarSelecionado || somenteDigitos(form.res_cep).length !== 8}
                  onClick={() => handleCepBlur("res", form.res_cep)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.cardBg,
                    color: t.text,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: podeEditarSelecionado ? "pointer" : "not-allowed",
                    fontFamily: FONT.body,
                  }}
                >
                  {cepBusca === "res" ? <Loader2 size={14} className="app-lucide-spin" aria-hidden /> : "Consultar CEP"}
                </button>
              </div>
              {fieldErr.res_cep ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_cep}</div> : null}
            </div>
            <div className="app-grid-form-span-full" style={{ marginBottom: 10 }}>
              <label htmlFor="dc-log" style={lblCadastral("res_logradouro")}>
                Logradouro
              </label>
              <input
                id="dc-log"
                disabled={!podeEditarSelecionado}
                value={form.res_logradouro}
                onChange={(e) => setForm((s) => (s ? { ...s, res_logradouro: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.res_logradouro ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_logradouro}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-num" style={lblCadastral("res_numero")}>
                Número
              </label>
              <input
                id="dc-num"
                disabled={!podeEditarSelecionado}
                value={form.res_numero}
                onChange={(e) => setForm((s) => (s ? { ...s, res_numero: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.res_numero ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_numero}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-compl" style={lblCadastral(null)}>
                Complemento
              </label>
              <input
                id="dc-compl"
                disabled={!podeEditarSelecionado}
                value={form.res_complemento}
                onChange={(e) => setForm((s) => (s ? { ...s, res_complemento: e.target.value } : s))}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-cid" style={lblCadastral("res_cidade")}>
                Cidade
              </label>
              <input
                id="dc-cid"
                disabled={!podeEditarSelecionado}
                value={form.res_cidade}
                onChange={(e) => setForm((s) => (s ? { ...s, res_cidade: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.res_cidade ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_cidade}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-uf" style={lblCadastral("res_estado")}>
                Estado (UF)
              </label>
              <select
                id="dc-uf"
                disabled={!podeEditarSelecionado}
                value={form.res_estado}
                onChange={(e) => setForm((s) => (s ? { ...s, res_estado: e.target.value.toUpperCase().slice(0, 2) } : s))}
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
          </div>
          </div>

          <div style={pageBox}>
            <SectionTitle sub="Nome, parentesco e telefone">Contato de emergência</SectionTitle>
            <div className="app-grid-form" style={{ marginTop: 4 }}>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-em-nome" style={lblCadastral("emerg_nome")}>
                Nome
              </label>
              <input
                id="dc-em-nome"
                disabled={!podeEditarSelecionado}
                value={form.emerg_nome}
                onChange={(e) => setForm((s) => (s ? { ...s, emerg_nome: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.emerg_nome ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emerg_nome}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-em-par" style={lblCadastral("emerg_parentesco")}>
                Parentesco
              </label>
              <input
                id="dc-em-par"
                disabled={!podeEditarSelecionado}
                value={form.emerg_parentesco}
                onChange={(e) => setForm((s) => (s ? { ...s, emerg_parentesco: e.target.value } : s))}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-em-tel" style={lblCadastral("emerg_telefone")}>
                Telefone
              </label>
              <input
                id="dc-em-tel"
                disabled={!podeEditarSelecionado}
                value={form.emerg_telefone}
                onChange={(e) => setForm((s) => (s ? { ...s, emerg_telefone: formatarTelefoneBr(e.target.value) } : s))}
                style={inputStyle}
              />
              {fieldErr.emerg_telefone ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emerg_telefone}</div> : null}
            </div>
          </div>
          </div>

          {isPj ? (
            <div style={pageBox}>
              <SectionTitle sub="Razão social e endereço da empresa">Dados da empresa (PJ)</SectionTitle>
              <div className="app-grid-form" style={{ marginTop: 4 }}>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="dc-emp-nome" style={lblCadastral("nome_empresa")}>
                    Nome da empresa
                  </label>
                  <input
                    id="dc-emp-nome"
                    disabled={!podeEditarSelecionado}
                    value={form.nome_empresa}
                    onChange={(e) => setForm((s) => (s ? { ...s, nome_empresa: e.target.value } : s))}
                    style={inputStyle}
                  />
                  {fieldErr.nome_empresa ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.nome_empresa}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="dc-cnpj" style={lblCadastral("cnpj")}>
                    CNPJ
                  </label>
                  <input
                    id="dc-cnpj"
                    disabled={!podeEditarSelecionado}
                    value={form.cnpj}
                    onChange={(e) => setForm((s) => (s ? { ...s, cnpj: formatarCnpjDigitos(e.target.value) } : s))}
                    style={inputStyle}
                  />
                  {fieldErr.cnpj ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.cnpj}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <span style={lblCadastral("emp_cep")}>CEP</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      disabled={!podeEditarSelecionado}
                      value={form.emp_cep}
                      onChange={(e) => setForm((s) => (s ? { ...s, emp_cep: formatarCepDigitos(e.target.value) } : s))}
                      onBlur={(e) => handleCepBlur("emp", e.target.value)}
                      placeholder="00000-000"
                      inputMode="numeric"
                      style={{ ...inputStyle, flex: "1 1 120px", minWidth: 0 }}
                      aria-label="CEP da empresa"
                    />
                    <button
                      type="button"
                      disabled={!podeEditarSelecionado || somenteDigitos(form.emp_cep).length !== 8}
                      onClick={() => handleCepBlur("emp", form.emp_cep)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: `1px solid ${t.cardBorder}`,
                        background: t.cardBg,
                        color: t.text,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: podeEditarSelecionado ? "pointer" : "not-allowed",
                        fontFamily: FONT.body,
                      }}
                    >
                      {cepBusca === "emp" ? <Loader2 size={14} className="app-lucide-spin" aria-hidden /> : "Consultar CEP"}
                    </button>
                  </div>
                  {fieldErr.emp_cep ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_cep}</div> : null}
                </div>
                <div className="app-grid-form-span-full" style={{ marginBottom: 10 }}>
                  <label htmlFor="dc-emp-log" style={lblCadastral("emp_logradouro")}>
                    Logradouro
                  </label>
                  <input
                    id="dc-emp-log"
                    disabled={!podeEditarSelecionado}
                    value={form.emp_logradouro}
                    onChange={(e) => setForm((s) => (s ? { ...s, emp_logradouro: e.target.value } : s))}
                    style={inputStyle}
                  />
                  {fieldErr.emp_logradouro ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_logradouro}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="dc-emp-num" style={lblCadastral("emp_numero")}>
                    Número
                  </label>
                  <input
                    id="dc-emp-num"
                    disabled={!podeEditarSelecionado}
                    value={form.emp_numero}
                    onChange={(e) => setForm((s) => (s ? { ...s, emp_numero: e.target.value } : s))}
                    style={inputStyle}
                  />
                  {fieldErr.emp_numero ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_numero}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="dc-emp-compl" style={lblCadastral(null)}>
                    Complemento
                  </label>
                  <input
                    id="dc-emp-compl"
                    disabled={!podeEditarSelecionado}
                    value={form.emp_complemento}
                    onChange={(e) => setForm((s) => (s ? { ...s, emp_complemento: e.target.value } : s))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="dc-emp-cid" style={lblCadastral("emp_cidade")}>
                    Cidade
                  </label>
                  <input
                    id="dc-emp-cid"
                    disabled={!podeEditarSelecionado}
                    value={form.emp_cidade}
                    onChange={(e) => setForm((s) => (s ? { ...s, emp_cidade: e.target.value } : s))}
                    style={inputStyle}
                  />
                  {fieldErr.emp_cidade ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_cidade}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="dc-emp-uf" style={lblCadastral("emp_estado")}>
                    Estado (UF)
                  </label>
                  <select
                    id="dc-emp-uf"
                    disabled={!podeEditarSelecionado}
                    value={form.emp_estado}
                    onChange={(e) => setForm((s) => (s ? { ...s, emp_estado: e.target.value.toUpperCase().slice(0, 2) } : s))}
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
            </div>
          ) : null}

          <div style={pageBox}>
            <SectionTitle sub="Conta para pagamentos">Dados bancários</SectionTitle>
            <div className="app-grid-form" style={{ marginTop: 4 }}>
            <div className="app-grid-form-span-full" style={{ marginBottom: 10 }}>
              <label htmlFor="dc-banco" style={lblCadastral("banco")}>
                Banco
              </label>
              <select
                id="dc-banco"
                disabled={!podeEditarSelecionado}
                value={rhBancoParaSelectValue(form.banco)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__legacy__") return;
                  setForm((s) => (s ? { ...s, banco: v } : s));
                }}
                style={inputStyle}
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
              <label htmlFor="dc-ag" style={lblCadastral("agencia")}>
                Agência
              </label>
              <input
                id="dc-ag"
                disabled={!podeEditarSelecionado}
                value={form.agencia}
                onChange={(e) => setForm((s) => (s ? { ...s, agencia: formatarAgencia(e.target.value) } : s))}
                style={inputStyle}
              />
              {fieldErr.agencia ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.agencia}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-cc" style={lblCadastral("conta_corrente")}>
                Conta corrente
              </label>
              <input
                id="dc-cc"
                disabled={!podeEditarSelecionado}
                value={form.conta_corrente}
                onChange={(e) => setForm((s) => (s ? { ...s, conta_corrente: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.conta_corrente ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.conta_corrente}</div> : null}
            </div>
            <div className="app-grid-form-span-full" style={{ marginBottom: 10 }}>
              <label htmlFor="dc-pix" style={lblCadastral("pix")}>
                PIX
              </label>
              <input
                id="dc-pix"
                disabled={!podeEditarSelecionado}
                value={form.pix}
                onChange={(e) => setForm((s) => (s ? { ...s, pix: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.pix ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.pix}</div> : null}
            </div>
          </div>

          {podeEditarSelecionado ? (
            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                onClick={() => void salvarCadastro()}
                disabled={salvando}
                style={{
                  padding: "10px 22px",
                  borderRadius: 12,
                  border: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: salvando ? "wait" : "pointer",
                  color: "#fff",
                  fontFamily: FONT.body,
                  background: brand.useBrand
                    ? "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))"
                    : "linear-gradient(135deg, var(--brand-primary, #7c3aed), var(--brand-accent, #1e36f8))",
                }}
              >
                {salvando ? (
                  <>
                    <Loader2 size={16} className="app-lucide-spin" aria-hidden style={{ verticalAlign: "middle", marginRight: 8 }} />
                    Salvando…
                  </>
                ) : (
                  "Salvar alterações"
                )}
              </button>
            </div>
          ) : (
            <p style={{ marginTop: 16, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
              Você não tem permissão para editar estes dados. Em caso de erro, fale com o RH.
            </p>
          )}
          </div>
        </div>
      ) : null}

      {aba === "documentos" && row && form ? (
        <PrestadorDocumentosCadastroBlocos
          funcionarioId={row.id}
          tipoContrato={form.tipo_contrato}
          podeEditar={podeEnviarDocumentos}
          onDocumentosAlterados={handleDocumentosAlterados}
        />
      ) : null}

      {aba === "formacao" && row ? (
        <FormacaoCompetenciasPainel
          funcionarioId={row.id}
          podeEditar={podeEditarFormacao}
          usuarioLabel={user?.email ?? String(user?.id ?? "—")}
          onHistoricoRefresh={() => void carregarHistorico(row.id, visualizandoProprioCadastro)}
          onCompletudeAlterada={() => void handleCompletudeExternaAlterada()}
          onErro={setErroGlobal}
        />
      ) : null}

      {aba === "experiencia" && row ? (
        <ExperienciaProfissionalPainel
          funcionarioId={row.id}
          podeEditar={podeEditarExperiencia}
          usuarioLabel={user?.email ?? String(user?.id ?? "—")}
          onHistoricoRefresh={() => void carregarHistorico(row.id, visualizandoProprioCadastro)}
          onCompletudeAlterada={() => void handleCompletudeExternaAlterada()}
          onErro={setErroGlobal}
        />
      ) : null}

      {aba === "historico" ? (
        <section>
          <h2 style={{ fontFamily: FONT_TITLE, fontSize: 16, color: t.text, marginBottom: 12 }}>Histórico de RH</h2>
          <ListaHistoricoRh items={histItems} loading={histLoading} t={t} />
        </section>
      ) : null}
    </div>
  );
}
