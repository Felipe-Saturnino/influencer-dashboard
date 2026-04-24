import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { CheckCircle2, Download, Files, History, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { RH_BANCOS_BRASIL, rhBancoParaSelectValue } from "../../../constants/rhBancosBrasil";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { montarContatoEmergenciaLinha, montarEnderecoResumoLine } from "../../../lib/rhFuncionarioEndereco";
import { buscarEnderecoPorCep } from "../../../lib/rhViaCep";
import {
  formatarAgencia,
  formatarCepDigitos,
  formatarCnpjDigitos,
  formatarCpfDigitos,
  formatarRgInput,
  formatarTelefoneBr,
  numeroDeCentavosStr,
  somenteDigitos,
  validarCnpjDigitos,
  validarCpfDigitos,
  validarEmail,
} from "../../../lib/rhFuncionarioValidators";
import type { RhFuncionario, RhFuncionarioHistorico, RhFuncionarioSelfMedia, RhFuncionarioTipoContrato } from "../../../types/rhFuncionario";
import { carregarOpcoesTimesOrganograma } from "../../../lib/rhOrganogramaFetch";
import type { RhOrgOrganogramaGrupoPrestador, RhOrgTimeOpcao } from "../../../types/rhOrganograma";
import { encontrarVinculoParaFuncionarioRow, flattenVinculosDeGrupos } from "../../../lib/rhOrganogramaTree";
import { ListaHistoricoRh } from "../../../components/rh/ListaHistoricoRh";
import { PageHeader } from "../../../components/PageHeader";

const RH_SELF_MEDIA_BUCKET = "rh-prestador-self-media";

const CNPJ_CONTEXTO_NAO_PJ = "00000000000191";

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

/** Prestadores cujo e-mail pessoal ou E-mail Spin coincide com o login (comparação normalizada). */
function filtraFuncionariosParaLoginEmail(rows: RhFuncionario[], loginEmail: string): RhFuncionario[] {
  const n = loginEmail.trim().toLowerCase();
  return rows.filter((r) => {
    const em = (r.email ?? "").trim().toLowerCase();
    const sp = (r.email_spin ?? "").trim().toLowerCase();
    return em === n || (sp.length > 0 && sp === n);
  });
}

/** Anotação do RH «Particular»: não listar na aba Histórico desta página (só no modal em Gestão de Prestadores). */
function historicoVisivelAbaDadosCadastro(h: RhFuncionarioHistorico): boolean {
  if (h.tipo !== "anotacao_rh") return true;
  const d = h.detalhes;
  if (!d || typeof d !== "object" || Array.isArray(d)) return true;
  const tv = String((d as Record<string, unknown>).tipo_visibilidade ?? "").trim().toLowerCase();
  return tv !== "particular";
}

type AbaCadastro = "trabalho" | "cadastral" | "documentos" | "historico" | "fotos";

type FormState = {
  nome: string;
  rg: string;
  cpf: string;
  telefone: string;
  email: string;
  email_spin: string;
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
    rg: formatarRgInput(f.rg),
    cpf: formatarCpfDigitos(f.cpf),
    telefone: formatarTelefoneBr(f.telefone),
    email: f.email,
    email_spin: (f.email_spin ?? "").trim(),
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

function buildPayloadFromForm(form: FormState, statusPrestador: RhFuncionario["status"]) {
  const isPj = form.tipo_contrato === "PJ";
  const cnpjFinal = isPj ? somenteDigitos(form.cnpj) : CNPJ_CONTEXTO_NAO_PJ;
  const endResLinha = montarEnderecoResumoLine({
    cep: form.res_cep,
    logradouro: form.res_logradouro,
    numero: form.res_numero,
    complemento: form.res_complemento,
    cidade: form.res_cidade,
    estado: form.res_estado,
  });
  const endEmpLinha = montarEnderecoResumoLine({
    cep: form.emp_cep,
    logradouro: form.emp_logradouro,
    numero: form.emp_numero,
    complemento: form.emp_complemento,
    cidade: form.emp_cidade,
    estado: form.emp_estado,
  });
  const emergLinha = montarContatoEmergenciaLinha(
    form.emerg_nome.trim(),
    form.emerg_parentesco,
    somenteDigitos(form.emerg_telefone),
  );
  const sal = numeroDeCentavosStr(form.salarioCentavos);
  return {
    status: statusPrestador,
    nome: form.nome.trim(),
    rg: form.rg.trim(),
    cpf: somenteDigitos(form.cpf),
    telefone: somenteDigitos(form.telefone),
    email: form.email.trim().toLowerCase(),
    email_spin: form.email_spin.trim() ? form.email_spin.trim().toLowerCase() : null,
    endereco_residencial: endResLinha,
    res_cep: somenteDigitos(form.res_cep),
    res_logradouro: form.res_logradouro.trim(),
    res_numero: form.res_numero.trim(),
    res_complemento: form.res_complemento.trim(),
    res_cidade: form.res_cidade.trim(),
    res_estado: form.res_estado.trim().toUpperCase().slice(0, 2),
    contato_emergencia: emergLinha,
    emerg_nome: form.emerg_nome.trim(),
    emerg_parentesco: form.emerg_parentesco.trim(),
    emerg_telefone: somenteDigitos(form.emerg_telefone),
    setor: form.setor.trim(),
    org_diretoria_id: form.org_diretoria_id || null,
    org_gerencia_id: form.org_gerencia_id || null,
    org_time_id: form.org_time_id || null,
    cargo: form.cargo.trim(),
    nivel: form.nivel.trim(),
    salario: sal,
    data_inicio: form.data_inicio,
    data_funcao: form.data_funcao.trim() ? form.data_funcao.trim().slice(0, 10) : null,
    escala: form.escala.trim(),
    tipo_contrato: form.tipo_contrato,
    nome_empresa: isPj ? form.nome_empresa.trim() : form.nome_empresa.trim() || "—",
    cnpj: cnpjFinal,
    endereco_empresa: isPj ? endEmpLinha : "—",
    emp_cep: isPj ? somenteDigitos(form.emp_cep) : "",
    emp_logradouro: isPj ? form.emp_logradouro.trim() : "",
    emp_numero: isPj ? form.emp_numero.trim() : "",
    emp_complemento: isPj ? form.emp_complemento.trim() : "",
    emp_cidade: isPj ? form.emp_cidade.trim() : "",
    emp_estado: isPj ? form.emp_estado.trim().toUpperCase().slice(0, 2) : "",
    banco: form.banco.trim(),
    agencia: somenteDigitos(form.agencia),
    conta_corrente: form.conta_corrente.trim(),
    pix: form.pix.trim() || null,
    observacao_rh: form.observacao_rh.trim() || null,
  };
}

function sanitizeStorageFileName(name: string): string {
  return name.replace(/[/\\]/g, "_").slice(0, 180) || "arquivo";
}

function validarCadastroSelf(form: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  const req = (k: keyof FormState, label: string, v: string) => {
    if (!v.trim()) e[k as string] = `${label} é obrigatório.`;
  };
  req("nome", "Nome completo", form.nome);
  req("rg", "RG", form.rg);
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
  const telD = somenteDigitos(form.telefone);
  if (telD.length < 10 || telD.length > 11) e.telefone = "Telefone inválido.";
  const telEmerg = somenteDigitos(form.emerg_telefone);
  if (telEmerg.length < 10 || telEmerg.length > 11) e.emerg_telefone = "Telefone de emergência inválido.";
  return e;
}

const ABAS: { key: AbaCadastro; label: string }[] = [
  { key: "trabalho", label: "Histórico de trabalho" },
  { key: "cadastral", label: "Dados cadastrais" },
  { key: "documentos", label: "Documentos" },
  { key: "historico", label: "Histórico" },
  { key: "fotos", label: "Galeria de fotos" },
];

export default function RhDadosCadastroPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_dados_cadastro");

  const [aba, setAba] = useState<AbaCadastro>("trabalho");
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

  const [mediaRows, setMediaRows] = useState<RhFuncionarioSelfMedia[]>([]);
  const [signedById, setSignedById] = useState<Record<string, string>>({});
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const opcoesVinculoFlat = useMemo(() => flattenVinculosDeGrupos(organogramaGrupos), [organogramaGrupos]);

  const orgLabel = useMemo(() => {
    if (!row) return "—";
    const v = encontrarVinculoParaFuncionarioRow(row, opcoesVinculoFlat);
    if (v) return v.label;
    const tm = opcoesTimes.find((o) => o.timeId === row.org_time_id);
    if (tm) return tm.label;
    return row.setor?.trim() || "—";
  }, [row, opcoesVinculoFlat, opcoesTimes]);

  const carregarFuncionario = useCallback(async () => {
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

  useEffect(() => {
    void carregarFuncionario();
  }, [carregarFuncionario]);

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

  const carregarHistorico = useCallback(async (fid: string) => {
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
    setHistItems(((data ?? []) as RhFuncionarioHistorico[]).filter(historicoVisivelAbaDadosCadastro));
  }, []);

  const carregarMedia = useCallback(async (fid: string) => {
    const { data, error } = await supabase
      .from("rh_funcionario_self_media")
      .select("*")
      .eq("rh_funcionario_id", fid)
      .order("created_at", { ascending: false });
    if (error) {
      setMediaRows([]);
      return;
    }
    setMediaRows((data ?? []) as RhFuncionarioSelfMedia[]);
  }, []);

  useEffect(() => {
    if (!row?.id) return;
    void carregarHistorico(row.id);
    void carregarMedia(row.id);
  }, [row?.id, carregarHistorico, carregarMedia]);

  const mediaDocs = useMemo(() => mediaRows.filter((m) => m.kind === "documento"), [mediaRows]);
  const mediaFotos = useMemo(() => mediaRows.filter((m) => m.kind === "foto"), [mediaRows]);

  useEffect(() => {
    const list = [...mediaDocs, ...mediaFotos];
    if (list.length === 0) {
      setSignedById({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const m of list) {
        const { data } = await supabase.storage.from(RH_SELF_MEDIA_BUCKET).createSignedUrl(m.storage_path, 7200);
        if (data?.signedUrl) next[m.id] = data.signedUrl;
      }
      if (!cancelled) setSignedById(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaDocs, mediaFotos]);

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
      if (!form) return;
      if (qual === "res") {
        setForm((s) =>
          s
            ? {
                ...s,
                res_logradouro: s.res_logradouro.trim() || r.logradouro,
                res_cidade: s.res_cidade.trim() || r.cidade,
                res_estado: (s.res_estado.trim() || r.uf).toUpperCase().slice(0, 2),
              }
            : s,
        );
      } else {
        setForm((s) =>
          s
            ? {
                ...s,
                emp_logradouro: s.emp_logradouro.trim() || r.logradouro,
                emp_cidade: s.emp_cidade.trim() || r.cidade,
                emp_estado: (s.emp_estado.trim() || r.uf).toUpperCase().slice(0, 2),
              }
            : s,
        );
      }
    })();
  };

  const salvarCadastro = async () => {
    if (!perm.canEditarOk || !row || !form) return;
    const e = validarCadastroSelf(form);
    setFieldErr(e);
    if (Object.keys(e).length > 0) return;
    setSalvando(true);
    setErroGlobal(null);
    setMsgOk(null);
    const payload = buildPayloadFromForm(form, row.status);
    const { error } = await supabase.from("rh_funcionarios").update(payload).eq("id", row.id);
    setSalvando(false);
    if (error) {
      if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
        setErroGlobal("Já existe um cadastro com este CPF.");
      } else {
        setErroGlobal(error.message);
      }
      return;
    }
    setMsgOk("Dados atualizados.");
    await carregarFuncionario();
    await carregarHistorico(row.id);
  };

  const uploadMidia = async (files: FileList | null, kind: "documento" | "foto") => {
    if (!perm.canEditarOk || !row || !files?.length) return;
    const setBusy = kind === "documento" ? setUploadingDoc : setUploadingFoto;
    setBusy(true);
    setErroGlobal(null);
    try {
      for (const file of Array.from(files)) {
        const path = `${row.id}/${crypto.randomUUID()}_${sanitizeStorageFileName(file.name)}`;
        const { error: upErr } = await supabase.storage.from(RH_SELF_MEDIA_BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
        if (upErr) {
          setErroGlobal(upErr.message);
          break;
        }
        const { error: insErr } = await supabase.from("rh_funcionario_self_media").insert({
          rh_funcionario_id: row.id,
          kind,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
        });
        if (insErr) {
          await supabase.storage.from(RH_SELF_MEDIA_BUCKET).remove([path]);
          setErroGlobal(insErr.message);
          break;
        }
      }
      await carregarMedia(row.id);
    } finally {
      setBusy(false);
    }
  };

  const excluirMidia = async (m: RhFuncionarioSelfMedia) => {
    if (!perm.canEditarOk || !row) return;
    setErroGlobal(null);
    const { error: rmErr } = await supabase.storage.from(RH_SELF_MEDIA_BUCKET).remove([m.storage_path]);
    if (rmErr) {
      setErroGlobal(rmErr.message);
      return;
    }
    const { error: delErr } = await supabase.from("rh_funcionario_self_media").delete().eq("id", m.id);
    if (delErr) {
      setErroGlobal(delErr.message);
      return;
    }
    await carregarMedia(row.id);
  };

  const tabActiveBg = brand.useBrand
    ? `color-mix(in srgb, var(--brand-action, #7c3aed) 14%, transparent)`
    : `color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)`;

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
  };

  const readOnlyBox: CSSProperties = {
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

  if (perm.loading || loading) {
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

  if (!row || !form) {
    return (
      <div className="app-page-shell">
        <PageHeader icon={<Files size={16} aria-hidden />} title="Dados de Cadastro" subtitle="Atualização cadastral" />
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Não encontramos um cadastro de prestador vinculado ao seu e-mail de acesso. Em caso de dúvida, fale com o RH.
        </div>
      </div>
    );
  }

  const isPj = form.tipo_contrato === "PJ";
  const salarioFmt = fmtBRL(numeroDeCentavosStr(form.salarioCentavos));

  return (
    <div className="app-page-shell app-page-shell--pb64">
      <PageHeader icon={<Files size={16} aria-hidden />} title="Dados de Cadastro" subtitle="Atualização cadastral — apenas o seu cadastro" />

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

      <div
        role="tablist"
        aria-label="Seções do cadastro"
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 18,
          flexWrap: "nowrap",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 2,
        }}
      >
        {ABAS.map((tb) => {
          const ativa = aba === tb.key;
          return (
            <button
              key={tb.key}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setAba(tb.key)}
              style={{
                padding: "7px 14px",
                borderRadius: 20,
                flexShrink: 0,
                border: `1px solid ${ativa ? brand.primary : t.cardBorder}`,
                background: ativa ? tabActiveBg : (t.inputBg ?? t.cardBg),
                color: ativa ? brand.primary : t.textMuted,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONT.body,
              }}
            >
              {tb.label}
            </button>
          );
        })}
      </div>

      {aba === "trabalho" ? (
        <section aria-labelledby="sec-contratacao">
          <h2 id="sec-contratacao" style={{ fontFamily: FONT_TITLE, fontSize: 16, color: t.text, marginBottom: 12 }}>
            Dados da contratação
          </h2>
          <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 16 }}>
            Estes dados são mantidos pelo RH e não podem ser alterados por aqui.
          </p>
          <div className="app-grid-2-tight">
            {(
              [
                ["Organograma", orgLabel],
                ["Função", form.cargo],
                ["Nível", form.nivel],
                ["Tipo de contrato", TIPOS_CONTRATO_LABEL[form.tipo_contrato]],
                ["E-mail Spin", form.email_spin?.trim() || "—"],
                ["Remuneração mensal", salarioFmt],
                ["Data de início", form.data_inicio ? form.data_inicio.slice(0, 10).split("-").reverse().join("/") : "—"],
                ["Escala", form.escala],
              ] as const
            ).map(([k, v]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>{k}</div>
                <div style={readOnlyBox}>{v || "—"}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {aba === "cadastral" ? (
        <section>
          <h2 style={{ fontFamily: FONT_TITLE, fontSize: 16, color: t.text, marginBottom: 12 }}>Dados pessoais</h2>
          <div className="app-grid-2-tight">
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-nome" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                Nome completo
              </label>
              <input
                id="dc-nome"
                disabled={!perm.canEditarOk}
                value={form.nome}
                onChange={(e) => setForm((s) => (s ? { ...s, nome: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.nome ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.nome}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-rg" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                RG
              </label>
              <input
                id="dc-rg"
                disabled={!perm.canEditarOk}
                value={form.rg}
                onChange={(e) => setForm((s) => (s ? { ...s, rg: formatarRgInput(e.target.value) } : s))}
                style={inputStyle}
              />
              {fieldErr.rg ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.rg}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-cpf" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                CPF
              </label>
              <input
                id="dc-cpf"
                disabled={!perm.canEditarOk}
                value={form.cpf}
                onChange={(e) => setForm((s) => (s ? { ...s, cpf: formatarCpfDigitos(e.target.value) } : s))}
                style={inputStyle}
              />
              {fieldErr.cpf ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.cpf}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-tel" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                Telefone
              </label>
              <input
                id="dc-tel"
                disabled={!perm.canEditarOk}
                value={form.telefone}
                onChange={(e) => setForm((s) => (s ? { ...s, telefone: formatarTelefoneBr(e.target.value) } : s))}
                style={inputStyle}
              />
              {fieldErr.telefone ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.telefone}</div> : null}
            </div>
            <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
              <label htmlFor="dc-email" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                E-mail
              </label>
              <input
                id="dc-email"
                type="email"
                disabled={!perm.canEditarOk}
                value={form.email}
                onChange={(e) => setForm((s) => (s ? { ...s, email: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.email ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.email}</div> : null}
            </div>
          </div>

          <h3 style={{ fontFamily: FONT_TITLE, fontSize: 14, color: t.text, margin: "20px 0 10px" }}>Endereço residencial</h3>
          <div className="app-grid-2-tight">
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>CEP</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  id="dc-cep-res"
                  disabled={!perm.canEditarOk}
                  value={form.res_cep}
                  onChange={(e) => setForm((s) => (s ? { ...s, res_cep: formatarCepDigitos(e.target.value) } : s))}
                  onBlur={(e) => handleCepBlur("res", e.target.value)}
                  placeholder="00000-000"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  style={{ ...inputStyle, flex: 1, minWidth: 120 }}
                  aria-label="CEP residencial"
                />
                <button
                  type="button"
                  disabled={!perm.canEditarOk || somenteDigitos(form.res_cep).length !== 8}
                  onClick={() => handleCepBlur("res", form.res_cep)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.cardBg,
                    color: t.text,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: perm.canEditarOk ? "pointer" : "not-allowed",
                    fontFamily: FONT.body,
                  }}
                >
                  {cepBusca === "res" ? <Loader2 size={14} className="app-lucide-spin" aria-hidden /> : "Consultar CEP"}
                </button>
              </div>
              {fieldErr.res_cep ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_cep}</div> : null}
            </div>
            <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
              <label htmlFor="dc-log" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                Logradouro
              </label>
              <input
                id="dc-log"
                disabled={!perm.canEditarOk}
                value={form.res_logradouro}
                onChange={(e) => setForm((s) => (s ? { ...s, res_logradouro: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.res_logradouro ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_logradouro}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-num" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                Número
              </label>
              <input
                id="dc-num"
                disabled={!perm.canEditarOk}
                value={form.res_numero}
                onChange={(e) => setForm((s) => (s ? { ...s, res_numero: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.res_numero ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_numero}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-compl" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                Complemento
              </label>
              <input
                id="dc-compl"
                disabled={!perm.canEditarOk}
                value={form.res_complemento}
                onChange={(e) => setForm((s) => (s ? { ...s, res_complemento: e.target.value } : s))}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-cid" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                Cidade
              </label>
              <input
                id="dc-cid"
                disabled={!perm.canEditarOk}
                value={form.res_cidade}
                onChange={(e) => setForm((s) => (s ? { ...s, res_cidade: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.res_cidade ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.res_cidade}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-uf" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                Estado (UF)
              </label>
              <select
                id="dc-uf"
                disabled={!perm.canEditarOk}
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

          <h3 style={{ fontFamily: FONT_TITLE, fontSize: 14, color: t.text, margin: "20px 0 10px" }}>Contato de emergência</h3>
          <div className="app-grid-2-tight">
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-em-nome" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                Nome
              </label>
              <input
                id="dc-em-nome"
                disabled={!perm.canEditarOk}
                value={form.emerg_nome}
                onChange={(e) => setForm((s) => (s ? { ...s, emerg_nome: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.emerg_nome ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emerg_nome}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-em-par" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                Parentesco
              </label>
              <input
                id="dc-em-par"
                disabled={!perm.canEditarOk}
                value={form.emerg_parentesco}
                onChange={(e) => setForm((s) => (s ? { ...s, emerg_parentesco: e.target.value } : s))}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-em-tel" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                Telefone
              </label>
              <input
                id="dc-em-tel"
                disabled={!perm.canEditarOk}
                value={form.emerg_telefone}
                onChange={(e) => setForm((s) => (s ? { ...s, emerg_telefone: formatarTelefoneBr(e.target.value) } : s))}
                style={inputStyle}
              />
              {fieldErr.emerg_telefone ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emerg_telefone}</div> : null}
            </div>
          </div>

          {isPj ? (
            <>
              <h3 style={{ fontFamily: FONT_TITLE, fontSize: 14, color: t.text, margin: "20px 0 10px" }}>Dados da empresa (PJ)</h3>
              <div className="app-grid-2-tight">
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="dc-emp-nome" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                    Nome da empresa
                  </label>
                  <input
                    id="dc-emp-nome"
                    disabled={!perm.canEditarOk}
                    value={form.nome_empresa}
                    onChange={(e) => setForm((s) => (s ? { ...s, nome_empresa: e.target.value } : s))}
                    style={inputStyle}
                  />
                  {fieldErr.nome_empresa ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.nome_empresa}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="dc-cnpj" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                    CNPJ
                  </label>
                  <input
                    id="dc-cnpj"
                    disabled={!perm.canEditarOk}
                    value={form.cnpj}
                    onChange={(e) => setForm((s) => (s ? { ...s, cnpj: formatarCnpjDigitos(e.target.value) } : s))}
                    style={inputStyle}
                  />
                  {fieldErr.cnpj ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.cnpj}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>CEP</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      disabled={!perm.canEditarOk}
                      value={form.emp_cep}
                      onChange={(e) => setForm((s) => (s ? { ...s, emp_cep: formatarCepDigitos(e.target.value) } : s))}
                      onBlur={(e) => handleCepBlur("emp", e.target.value)}
                      placeholder="00000-000"
                      inputMode="numeric"
                      style={{ ...inputStyle, flex: 1, minWidth: 120 }}
                      aria-label="CEP da empresa"
                    />
                    <button
                      type="button"
                      disabled={!perm.canEditarOk || somenteDigitos(form.emp_cep).length !== 8}
                      onClick={() => handleCepBlur("emp", form.emp_cep)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: `1px solid ${t.cardBorder}`,
                        background: t.cardBg,
                        color: t.text,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: perm.canEditarOk ? "pointer" : "not-allowed",
                        fontFamily: FONT.body,
                      }}
                    >
                      {cepBusca === "emp" ? <Loader2 size={14} className="app-lucide-spin" aria-hidden /> : "Consultar CEP"}
                    </button>
                  </div>
                  {fieldErr.emp_cep ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_cep}</div> : null}
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  <label htmlFor="dc-emp-log" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                    Logradouro
                  </label>
                  <input
                    id="dc-emp-log"
                    disabled={!perm.canEditarOk}
                    value={form.emp_logradouro}
                    onChange={(e) => setForm((s) => (s ? { ...s, emp_logradouro: e.target.value } : s))}
                    style={inputStyle}
                  />
                  {fieldErr.emp_logradouro ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_logradouro}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="dc-emp-num" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                    Número
                  </label>
                  <input
                    id="dc-emp-num"
                    disabled={!perm.canEditarOk}
                    value={form.emp_numero}
                    onChange={(e) => setForm((s) => (s ? { ...s, emp_numero: e.target.value } : s))}
                    style={inputStyle}
                  />
                  {fieldErr.emp_numero ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_numero}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="dc-emp-compl" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                    Complemento
                  </label>
                  <input
                    id="dc-emp-compl"
                    disabled={!perm.canEditarOk}
                    value={form.emp_complemento}
                    onChange={(e) => setForm((s) => (s ? { ...s, emp_complemento: e.target.value } : s))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="dc-emp-cid" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                    Cidade
                  </label>
                  <input
                    id="dc-emp-cid"
                    disabled={!perm.canEditarOk}
                    value={form.emp_cidade}
                    onChange={(e) => setForm((s) => (s ? { ...s, emp_cidade: e.target.value } : s))}
                    style={inputStyle}
                  />
                  {fieldErr.emp_cidade ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.emp_cidade}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="dc-emp-uf" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                    Estado (UF)
                  </label>
                  <select
                    id="dc-emp-uf"
                    disabled={!perm.canEditarOk}
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
            </>
          ) : null}

          <h3 style={{ fontFamily: FONT_TITLE, fontSize: 14, color: t.text, margin: "20px 0 10px" }}>Dados bancários</h3>
          <div className="app-grid-2-tight">
            <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
              <label htmlFor="dc-banco" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                Banco
              </label>
              <select
                id="dc-banco"
                disabled={!perm.canEditarOk}
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
              <label htmlFor="dc-ag" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                Agência
              </label>
              <input
                id="dc-ag"
                disabled={!perm.canEditarOk}
                value={form.agencia}
                onChange={(e) => setForm((s) => (s ? { ...s, agencia: formatarAgencia(e.target.value) } : s))}
                style={inputStyle}
              />
              {fieldErr.agencia ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.agencia}</div> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="dc-cc" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                Conta corrente
              </label>
              <input
                id="dc-cc"
                disabled={!perm.canEditarOk}
                value={form.conta_corrente}
                onChange={(e) => setForm((s) => (s ? { ...s, conta_corrente: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.conta_corrente ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.conta_corrente}</div> : null}
            </div>
            <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
              <label htmlFor="dc-pix" style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>
                PIX
              </label>
              <input
                id="dc-pix"
                disabled={!perm.canEditarOk}
                value={form.pix}
                onChange={(e) => setForm((s) => (s ? { ...s, pix: e.target.value } : s))}
                style={inputStyle}
              />
              {fieldErr.pix ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.pix}</div> : null}
            </div>
          </div>

          {perm.canEditarOk ? (
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
        </section>
      ) : null}

      {aba === "documentos" ? (
        <section>
          <h2 style={{ fontFamily: FONT_TITLE, fontSize: 16, color: t.text, marginBottom: 12 }}>Documentos</h2>
          {perm.canEditarOk ? (
            <>
              <input
                id="dc-upload-docs"
                type="file"
                multiple
                disabled={uploadingDoc}
                style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: uploadingDoc ? "none" : "auto" }}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                onChange={(e) => void uploadMidia(e.target.files, "documento")}
              />
              <label
                htmlFor="dc-upload-docs"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: `1px dashed ${t.cardBorder}`,
                  cursor: uploadingDoc ? "wait" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: brand.primary,
                  fontFamily: FONT.body,
                  marginBottom: 16,
                }}
              >
                <Upload size={16} aria-hidden />
                {uploadingDoc ? "Enviando…" : "Enviar documentos"}
              </label>
            </>
          ) : null}
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {mediaDocs.length === 0 ? (
              <li style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Sem dados para o período selecionado.</li>
            ) : (
              mediaDocs.map((m) => {
                const url = signedById[m.id];
                return (
                  <li
                    key={m.id}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom: `1px solid ${t.cardBorder}`,
                      fontFamily: FONT.body,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: t.text, flex: 1, minWidth: 160 }}>{m.file_name}</span>
                    {url ? (
                      <>
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-action, #7c3aed)", fontWeight: 600 }}>
                          Visualizar
                        </a>
                        <a href={url} download={m.file_name} style={{ color: t.textMuted, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Download size={14} aria-hidden />
                          Download
                        </a>
                      </>
                    ) : null}
                    {perm.canEditarOk ? (
                      <button
                        type="button"
                        onClick={() => void excluirMidia(m)}
                        aria-label={`Excluir ${m.file_name}`}
                        style={{ border: "none", background: "transparent", color: "#e84025", cursor: "pointer", padding: 4 }}
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </section>
      ) : null}

      {aba === "historico" ? (
        <section>
          <h2 style={{ fontFamily: FONT_TITLE, fontSize: 16, color: t.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <History size={18} aria-hidden />
            Histórico de RH
          </h2>
          <ListaHistoricoRh items={histItems} loading={histLoading} t={t} />
        </section>
      ) : null}

      {aba === "fotos" ? (
        <section>
          <h2 style={{ fontFamily: FONT_TITLE, fontSize: 16, color: t.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <ImageIcon size={18} aria-hidden />
            Galeria de fotos
          </h2>
          {perm.canEditarOk ? (
            <>
              <input
                id="dc-upload-fotos"
                type="file"
                multiple
                disabled={uploadingFoto}
                style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: uploadingFoto ? "none" : "auto" }}
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => void uploadMidia(e.target.files, "foto")}
              />
              <label
                htmlFor="dc-upload-fotos"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: `1px dashed ${t.cardBorder}`,
                  cursor: uploadingFoto ? "wait" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: brand.primary,
                  fontFamily: FONT.body,
                  marginBottom: 16,
                }}
              >
                <Upload size={16} aria-hidden />
                {uploadingFoto ? "Enviando…" : "Enviar fotos"}
              </label>
            </>
          ) : null}
          {mediaFotos.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Sem dados para o período selecionado.
            </div>
          ) : (
            <div className="app-grid-2-tight">
              {mediaFotos.map((m) => {
                const url = signedById[m.id];
                return (
                  <figure
                    key={m.id}
                    style={{
                      margin: 0,
                      padding: 10,
                      borderRadius: 14,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.cardBg,
                    }}
                  >
                    {url ? (
                      <img src={url} alt={m.file_name} style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10 }} />
                    ) : (
                      <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted }}>
                        <Loader2 size={20} className="app-lucide-spin" aria-hidden />
                      </div>
                    )}
                    <figcaption style={{ marginTop: 8, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{m.file_name}</figcaption>
                    {url ? (
                      <a
                        href={url}
                        download={m.file_name}
                        style={{
                          marginTop: 8,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--brand-action, #7c3aed)",
                          fontFamily: FONT.body,
                        }}
                      >
                        <Download size={14} aria-hidden />
                        Download
                      </a>
                    ) : null}
                    {perm.canEditarOk ? (
                      <button
                        type="button"
                        onClick={() => void excluirMidia(m)}
                        style={{
                          marginTop: 8,
                          border: "none",
                          background: "transparent",
                          color: "#e84025",
                          cursor: "pointer",
                          fontSize: 12,
                          fontFamily: FONT.body,
                        }}
                      >
                        Excluir
                      </button>
                    ) : null}
                  </figure>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
