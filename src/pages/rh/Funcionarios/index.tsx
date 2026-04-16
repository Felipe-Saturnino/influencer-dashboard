import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  UserCircle2,
  UserX,
  Eye,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { getThStyle, getTdStyle, getTdNumStyle, zebraStripe } from "../../../lib/tableStyles";
import {
  centavosDeStringMoeda,
  formatarAgencia,
  formatarCnpjDigitos,
  formatarCpfDigitos,
  formatarMoedaDigitos,
  formatarRgInput,
  formatarTelefoneBr,
  numeroDeCentavosStr,
  somenteDigitos,
  validarCnpjDigitos,
  validarCpfDigitos,
  validarEmail,
} from "../../../lib/rhFuncionarioValidators";
import type { RhFuncionario, RhFuncionarioTipoContrato } from "../../../types/rhFuncionario";
import { PageHeader } from "../../../components/PageHeader";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { SkeletonTableRow } from "../../../components/dashboard/SkeletonCard";

const NIVEIS = ["Junior", "Pleno", "Senior", "Especialista", "Gestor"] as const;

const TIPOS_CONTRATO: { value: RhFuncionarioTipoContrato; label: string }[] = [
  { value: "CLT", label: "CLT" },
  { value: "PJ", label: "PJ" },
  { value: "Estagio", label: "Estágio" },
  { value: "Temporario", label: "Temporário" },
];

const ESCALAS_SUGEST = ["5x2", "6x1", "12x36", "12x48", "8x6", "Comercial"];

function labelTipoContrato(v: RhFuncionarioTipoContrato): string {
  return TIPOS_CONTRATO.find((x) => x.value === v)?.label ?? v;
}

function ctaGradient(brand: ReturnType<typeof useDashboardBrand>): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))";
}

type FormState = {
  nome: string;
  rg: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco_residencial: string;
  contato_emergencia: string;
  setor: string;
  cargo: string;
  nivel: string;
  salarioCentavos: string;
  data_inicio: string;
  escala: string;
  tipo_contrato: RhFuncionarioTipoContrato;
  nome_empresa: string;
  cnpj: string;
  endereco_empresa: string;
  banco: string;
  agencia: string;
  conta_corrente: string;
  pix: string;
};

function estadoVazioForm(): FormState {
  return {
    nome: "",
    rg: "",
    cpf: "",
    telefone: "",
    email: "",
    endereco_residencial: "",
    contato_emergencia: "",
    setor: "",
    cargo: "",
    nivel: "Pleno",
    salarioCentavos: "",
    data_inicio: "",
    escala: "5x2",
    tipo_contrato: "CLT",
    nome_empresa: "",
    cnpj: "",
    endereco_empresa: "",
    banco: "",
    agencia: "",
    conta_corrente: "",
    pix: "",
  };
}

function formDeFuncionario(f: RhFuncionario): FormState {
  const cents = Math.round(Number(f.salario) * 100).toString();
  return {
    nome: f.nome,
    rg: formatarRgInput(f.rg),
    cpf: formatarCpfDigitos(f.cpf),
    telefone: formatarTelefoneBr(f.telefone),
    email: f.email,
    endereco_residencial: f.endereco_residencial,
    contato_emergencia: f.contato_emergencia,
    setor: f.setor,
    cargo: f.cargo,
    nivel: f.nivel,
    salarioCentavos: cents,
    data_inicio: f.data_inicio,
    escala: f.escala,
    tipo_contrato: f.tipo_contrato,
    nome_empresa: f.nome_empresa,
    cnpj: formatarCnpjDigitos(f.cnpj),
    endereco_empresa: f.endereco_empresa,
    banco: f.banco,
    agencia: formatarAgencia(f.agencia),
    conta_corrente: f.conta_corrente,
    pix: f.pix ?? "",
  };
}

function SecaoForm({
  titulo,
  children,
  t,
}: {
  titulo: string;
  children: React.ReactNode;
  t: ReturnType<typeof useApp>["theme"];
}) {
  return (
    <fieldset
      style={{
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 14,
        fontFamily: FONT.body,
      }}
    >
      <legend
        style={{
          padding: "0 8px",
          fontSize: 12,
          fontWeight: 700,
          color: t.textMuted,
          fontFamily: FONT_TITLE,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

export default function RhFuncionariosPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_funcionarios");

  const podeVerDadosSensiveis = user?.role === "admin" || perm.canEditarOk;

  const [lista, setLista] = useState<RhFuncionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroGlobal, setErroGlobal] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroContrato, setFiltroContrato] = useState<RhFuncionarioTipoContrato | "todos">("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");

  const [modalForm, setModalForm] = useState<"fechado" | "novo" | "editar" | "ver">("fechado");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(estadoVazioForm);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const [desativarRow, setDesativarRow] = useState<RhFuncionario | null>(null);
  const [desativando, setDesativando] = useState(false);

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  const carregar = useCallback(async () => {
    setLoading(true);
    setErroGlobal(null);
    const { data, error } = await supabase.from("rh_funcionarios").select("*").order("nome", { ascending: true }).limit(5000);
    if (error) setErroGlobal(error.message);
    setLista((data ?? []) as RhFuncionario[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!sucessoMsg) return;
    const id = window.setTimeout(() => setSucessoMsg(null), 4000);
    return () => window.clearTimeout(id);
  }, [sucessoMsg]);

  const setoresUnicos = useMemo(() => {
    const s = new Set<string>();
    lista.forEach((r) => {
      if (r.setor.trim()) s.add(r.setor.trim());
    });
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [lista]);

  const filtrada = useMemo(() => {
    const b = busca.trim().toLowerCase();
    const digits = somenteDigitos(busca);
    return lista.filter((r) => {
      if (filtroStatus !== "todos" && r.status !== filtroStatus) return false;
      if (filtroContrato !== "todos" && r.tipo_contrato !== filtroContrato) return false;
      if (filtroSetor && r.setor.trim() !== filtroSetor) return false;
      if (!b) return true;
      if (digits.length === 11 && r.cpf === digits) return true;
      if (r.nome.toLowerCase().includes(b)) return true;
      if (r.email.toLowerCase().includes(b)) return true;
      if (r.cpf.includes(digits) && digits.length >= 3) return true;
      return false;
    });
  }, [lista, busca, filtroSetor, filtroContrato, filtroStatus]);

  const abrirNovo = () => {
    setForm(estadoVazioForm());
    setFieldErr({});
    setEditId(null);
    setModalForm("novo");
  };

  const abrirEditar = (row: RhFuncionario) => {
    setForm(formDeFuncionario(row));
    setFieldErr({});
    setEditId(row.id);
    setModalForm("editar");
  };

  const abrirVer = (row: RhFuncionario) => {
    setForm(formDeFuncionario(row));
    setFieldErr({});
    setEditId(row.id);
    setModalForm("ver");
  };

  function validarFormulario(): boolean {
    const e: Record<string, string> = {};
    const req = (k: keyof FormState, label: string, v: string) => {
      if (!v.trim()) e[k as string] = `${label} é obrigatório.`;
    };

    req("nome", "Nome completo", form.nome);
    req("rg", "RG", form.rg);
    req("telefone", "Telefone", form.telefone);
    req("email", "E-mail", form.email);
    req("endereco_residencial", "Endereço residencial", form.endereco_residencial);
    req("contato_emergencia", "Contato de emergência", form.contato_emergencia);
    req("setor", "Setor", form.setor);
    req("cargo", "Cargo", form.cargo);
    req("data_inicio", "Data de início", form.data_inicio);
    req("escala", "Escala", form.escala);
    req("nome_empresa", "Nome da empresa", form.nome_empresa);
    req("endereco_empresa", "Endereço da empresa", form.endereco_empresa);
    if (podeVerDadosSensiveis) {
      req("banco", "Banco", form.banco);
      req("agencia", "Agência", form.agencia);
      req("conta_corrente", "Conta corrente", form.conta_corrente);
    }

    const cpfD = somenteDigitos(form.cpf);
    if (cpfD.length !== 11) e.cpf = "CPF deve ter 11 dígitos.";
    else if (!validarCpfDigitos(cpfD)) e.cpf = "CPF inválido.";

    const cnpjD = somenteDigitos(form.cnpj);
    if (cnpjD.length !== 14) e.cnpj = "CNPJ deve ter 14 dígitos.";
    else if (!validarCnpjDigitos(cnpjD)) e.cnpj = "CNPJ inválido.";

    if (form.email.trim() && !validarEmail(form.email)) e.email = "E-mail inválido.";

    const telD = somenteDigitos(form.telefone);
    if (telD.length < 10 || telD.length > 11) e.telefone = "Telefone inválido.";

    if (podeVerDadosSensiveis) {
      const sal = numeroDeCentavosStr(form.salarioCentavos);
      if (sal <= 0) e.salarioCentavos = "Informe o salário.";
    }

    setFieldErr(e);
    return Object.keys(e).length === 0;
  }

  const montarPayload = (): Omit<RhFuncionario, "id" | "created_at" | "updated_at" | "created_by" | "updated_by" | "data_desligamento"> & {
    status: RhFuncionario["status"];
    data_desligamento?: string | null;
  } => {
    const sal = podeVerDadosSensiveis ? numeroDeCentavosStr(form.salarioCentavos) : 0;
    return {
      status: "ativo",
      nome: form.nome.trim(),
      rg: form.rg.trim(),
      cpf: somenteDigitos(form.cpf),
      telefone: somenteDigitos(form.telefone),
      email: form.email.trim().toLowerCase(),
      endereco_residencial: form.endereco_residencial.trim(),
      contato_emergencia: form.contato_emergencia.trim(),
      setor: form.setor.trim(),
      cargo: form.cargo.trim(),
      nivel: form.nivel.trim(),
      salario: sal,
      data_inicio: form.data_inicio,
      escala: form.escala.trim(),
      tipo_contrato: form.tipo_contrato,
      nome_empresa: form.nome_empresa.trim(),
      cnpj: somenteDigitos(form.cnpj),
      endereco_empresa: form.endereco_empresa.trim(),
      banco: form.banco.trim(),
      agencia: somenteDigitos(form.agencia),
      conta_corrente: form.conta_corrente.trim(),
      pix: form.pix.trim() || null,
    };
  };

  const salvar = async (opts?: { outro?: boolean }) => {
    if (modalForm === "ver") return;
    if (!validarFormulario()) return;
    setSalvando(true);
    setErroGlobal(null);
    const payload = montarPayload();
    const cadastrarOutro = opts?.outro === true;

    if (modalForm === "novo") {
      const { error } = await supabase.from("rh_funcionarios").insert(payload);
      setSalvando(false);
      if (error) {
        if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
          setErroGlobal("Já existe um funcionário cadastrado com este CPF.");
        } else {
          setErroGlobal(error.message);
        }
        return;
      }
      setSucessoMsg("Funcionário cadastrado.");
      await carregar();
      if (cadastrarOutro) {
        setForm(estadoVazioForm());
        setFieldErr({});
      } else {
        setModalForm("fechado");
      }
      return;
    }

    if (modalForm === "editar" && editId) {
      const atual = lista.find((x) => x.id === editId);
      const salarioFinal = podeVerDadosSensiveis ? payload.salario : (atual?.salario ?? 0);
      const mesclado =
        !podeVerDadosSensiveis && atual
          ? {
              ...payload,
              salario: salarioFinal,
              banco: atual.banco,
              agencia: atual.agencia,
              conta_corrente: atual.conta_corrente,
              pix: atual.pix,
            }
          : { ...payload, salario: salarioFinal };
      const { error } = await supabase.from("rh_funcionarios").update(mesclado).eq("id", editId);
      setSalvando(false);
      if (error) {
        if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
          setErroGlobal("Já existe um funcionário cadastrado com este CPF.");
        } else {
          setErroGlobal(error.message);
        }
        return;
      }
      setSucessoMsg("Dados atualizados.");
      setModalForm("fechado");
      await carregar();
    }
  };

  const confirmarDesativar = async () => {
    if (!desativarRow) return;
    setDesativando(true);
    setErroGlobal(null);
    const hoje = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("rh_funcionarios")
      .update({
        status: "inativo",
        data_desligamento: hoje,
      })
      .eq("id", desativarRow.id);
    setDesativando(false);
    if (error) {
      setErroGlobal(error.message);
      return;
    }
    setSucessoMsg("Funcionário desativado.");
    setDesativarRow(null);
    await carregar();
  };

  const reativar = async (row: RhFuncionario) => {
    setErroGlobal(null);
    const { error } = await supabase
      .from("rh_funcionarios")
      .update({ status: "ativo", data_desligamento: null })
      .eq("id", row.id);
    if (error) {
      setErroGlobal(error.message);
      return;
    }
    setSucessoMsg("Funcionário reativado.");
    await carregar();
  };

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

  const lbl = (htmlFor: string, text: string) => (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 4, fontFamily: FONT.body }}>
      {text}
    </label>
  );

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
        <div style={{ borderRadius: 14, border: `1px solid ${t.cardBorder}`, overflow: "hidden", boxShadow: cardShadow }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <caption style={{ display: "none" }}>Carregando funcionários</caption>
            <thead>
              <tr>
                {["Nome", "Setor", "Cargo", "Contrato", "Início", "Status", "Salário", "Ações"].map((h) => (
                  <th key={h} scope="col" style={getThStyle(t)}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SkeletonTableRow cols={8} />
              <SkeletonTableRow cols={8} />
              <SkeletonTableRow cols={8} />
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
  const desabilitarCampos = leitura || salvando;

  return (
    <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
      <PageHeader
        icon={<UserCircle2 size={16} aria-hidden />}
        title="Funcionários"
        subtitle="Cadastro e controle de colaboradores (base para outros módulos de RH)."
        actions={
          perm.canCriarOk && podeVerDadosSensiveis ? (
            <button
              type="button"
              onClick={abrirNovo}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: FONT.body,
                background: ctaGradient(brand),
              }}
            >
              <Plus size={16} aria-hidden />
              Novo funcionário
            </button>
          ) : null
        }
      />

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

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
          alignItems: "flex-end",
        }}
      >
        <div style={{ flex: "1 1 200px", minWidth: 160 }}>
          {lbl("rh-func-busca", "Buscar por nome, e-mail ou CPF")}
          <input
            id="rh-func-busca"
            type="search"
            value={busca}
            onChange={(ev) => setBusca(ev.target.value)}
            placeholder="Nome, e-mail ou CPF"
            aria-label="Buscar por nome, e-mail ou CPF"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: "0 1 160px" }}>
          {lbl("rh-func-setor", "Setor")}
          <select
            id="rh-func-setor"
            value={filtroSetor}
            onChange={(ev) => setFiltroSetor(ev.target.value)}
            aria-label="Filtrar por setor"
            style={inputStyle}
          >
            <option value="">Todos</option>
            {setoresUnicos.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: "0 1 160px" }}>
          {lbl("rh-func-contrato", "Tipo de contrato")}
          <select
            id="rh-func-contrato"
            value={filtroContrato}
            onChange={(ev) => setFiltroContrato(ev.target.value as typeof filtroContrato)}
            aria-label="Filtrar por tipo de contrato"
            style={inputStyle}
          >
            <option value="todos">Todos</option>
            {TIPOS_CONTRATO.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: "0 1 140px" }}>
          {lbl("rh-func-status", "Status")}
          <select
            id="rh-func-status"
            value={filtroStatus}
            onChange={(ev) => setFiltroStatus(ev.target.value as typeof filtroStatus)}
            aria-label="Filtrar por status"
            style={inputStyle}
          >
            <option value="todos">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>

      <div className="app-table-wrap">
        <div style={{ borderRadius: 14, border: `1px solid ${t.cardBorder}`, overflow: "hidden", boxShadow: cardShadow }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              minWidth: 720,
            }}
          >
            <caption style={{ display: "none" }}>Funcionários cadastrados</caption>
            <thead>
              <tr>
                <th scope="col" style={getThStyle(t)}>
                  Nome
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Setor
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Cargo
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Contrato
                </th>
                <th scope="col" style={getThStyle(t, { textAlign: "right" })}>
                  Início
                </th>
                <th scope="col" style={getThStyle(t)}>
                  Status
                </th>
                {podeVerDadosSensiveis ? (
                  <th scope="col" style={getThStyle(t, { textAlign: "right" })}>
                    Salário
                  </th>
                ) : null}
                <th scope="col" style={getThStyle(t, { textAlign: "right" })}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonTableRow cols={podeVerDadosSensiveis ? 8 : 7} />
                  <SkeletonTableRow cols={podeVerDadosSensiveis ? 8 : 7} />
                </>
              ) : filtrada.length === 0 ? (
                <tr>
                  <td colSpan={podeVerDadosSensiveis ? 8 : 7} style={{ ...getTdStyle(t), textAlign: "center", padding: "40px 16px", color: t.textMuted }}>
                    Sem dados para o período selecionado.
                  </td>
                </tr>
              ) : (
                filtrada.map((row, i) => (
                  <tr key={row.id}>
                    <td
                      style={{
                        ...getTdStyle(t),
                        textAlign: "left",
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        background: zebraStripe(i),
                      }}
                      title={row.nome}
                    >
                      {row.nome}
                    </td>
                    <td style={{ ...getTdStyle(t), background: zebraStripe(i) }}>{row.setor}</td>
                    <td style={{ ...getTdStyle(t), background: zebraStripe(i) }}>{row.cargo}</td>
                    <td style={{ ...getTdStyle(t), background: zebraStripe(i) }}>{labelTipoContrato(row.tipo_contrato)}</td>
                    <td style={{ ...getTdNumStyle(t, { background: zebraStripe(i) }) }}>
                      {row.data_inicio ? new Date(`${row.data_inicio}T12:00:00`).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td style={{ ...getTdStyle(t), background: zebraStripe(i) }}>
                      <span style={{ fontWeight: 700, color: row.status === "ativo" ? "#22c55e" : t.textMuted }}>
                        {row.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    {podeVerDadosSensiveis ? (
                      <td style={{ ...getTdNumStyle(t, { background: zebraStripe(i) }) }}>{fmtBRL(Number(row.salario))}</td>
                    ) : null}
                    <td style={{ ...getTdStyle(t, { textAlign: "right", background: zebraStripe(i) }) }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => abrirVer(row)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: `1px solid ${t.cardBorder}`,
                            background: t.inputBg,
                            color: t.text,
                            cursor: "pointer",
                            fontSize: 12,
                            fontFamily: FONT.body,
                          }}
                          aria-label={`Visualizar ${row.nome}`}
                        >
                          <Eye size={14} style={{ verticalAlign: "middle" }} aria-hidden />
                        </button>
                        {perm.canEditarOk ? (
                          <button
                            type="button"
                            onClick={() => abrirEditar(row)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: `1px solid ${t.cardBorder}`,
                              background: t.inputBg,
                              color: t.text,
                              cursor: "pointer",
                              fontSize: 12,
                              fontFamily: FONT.body,
                            }}
                            aria-label={`Editar ${row.nome}`}
                          >
                            <Pencil size={14} style={{ verticalAlign: "middle" }} aria-hidden />
                          </button>
                        ) : null}
                        {perm.canEditarOk && row.status === "ativo" ? (
                          <button
                            type="button"
                            onClick={() => setDesativarRow(row)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: `1px solid rgba(232,64,37,0.4)`,
                              background: "rgba(232,64,37,0.08)",
                              color: "#e84025",
                              cursor: "pointer",
                              fontSize: 12,
                              fontFamily: FONT.body,
                            }}
                            aria-label={`Desativar ${row.nome}`}
                          >
                            <UserX size={14} style={{ verticalAlign: "middle" }} aria-hidden />
                          </button>
                        ) : null}
                        {perm.canEditarOk && row.status === "inativo" ? (
                          <button
                            type="button"
                            onClick={() => void reativar(row)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: `1px solid ${t.cardBorder}`,
                              background: t.inputBg,
                              color: t.text,
                              cursor: "pointer",
                              fontSize: 12,
                              fontFamily: FONT.body,
                            }}
                            aria-label={`Reativar ${row.nome}`}
                          >
                            Reativar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(modalForm === "novo" || modalForm === "editar" || modalForm === "ver") && (
        <ModalBase maxWidth={720} onClose={() => !salvando && setModalForm("fechado")}>
          <ModalHeader
            title={modalForm === "novo" ? "Novo funcionário" : modalForm === "editar" ? "Editar funcionário" : "Detalhes do funcionário"}
            onClose={() => !salvando && setModalForm("fechado")}
          />

          <SecaoForm titulo="Dados pessoais" t={t}>
            <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
              <div style={{ marginBottom: 10 }}>
                {lbl("f-nome", "Nome completo")}
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
                {lbl("f-rg", "RG")}
                <input
                  id="f-rg"
                  disabled={desabilitarCampos}
                  value={form.rg}
                  onChange={(e) => setForm((s) => ({ ...s, rg: formatarRgInput(e.target.value) }))}
                  placeholder="00.000.000-0"
                  style={inputStyle}
                />
                {fieldErr.rg ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.rg}</div> : null}
              </div>
              <div style={{ marginBottom: 10 }}>
                {lbl("f-cpf", "CPF")}
                <input
                  id="f-cpf"
                  disabled={desabilitarCampos || modalForm === "editar"}
                  value={form.cpf}
                  onChange={(e) => setForm((s) => ({ ...s, cpf: formatarCpfDigitos(e.target.value) }))}
                  placeholder="000.000.000-00"
                  style={inputStyle}
                  title={modalForm === "editar" ? "CPF não pode ser alterado" : undefined}
                />
                {fieldErr.cpf ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.cpf}</div> : null}
              </div>
              <div style={{ marginBottom: 10 }}>
                {lbl("f-tel", "Telefone")}
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
                {lbl("f-email", "E-mail")}
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
              <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                {lbl("f-end", "Endereço residencial")}
                <input
                  id="f-end"
                  disabled={desabilitarCampos}
                  value={form.endereco_residencial}
                  onChange={(e) => setForm((s) => ({ ...s, endereco_residencial: e.target.value }))}
                  style={inputStyle}
                />
                {fieldErr.endereco_residencial ? (
                  <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.endereco_residencial}</div>
                ) : null}
              </div>
              <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                {lbl("f-emerg", "Contato de emergência (nome e telefone)")}
                <input
                  id="f-emerg"
                  disabled={desabilitarCampos}
                  value={form.contato_emergencia}
                  onChange={(e) => setForm((s) => ({ ...s, contato_emergencia: e.target.value }))}
                  style={inputStyle}
                />
                {fieldErr.contato_emergencia ? (
                  <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.contato_emergencia}</div>
                ) : null}
              </div>
            </div>
          </SecaoForm>

          <SecaoForm titulo="Dados profissionais" t={t}>
            <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
              <div style={{ marginBottom: 10 }}>
                {lbl("f-setor", "Setor")}
                <input id="f-setor" disabled={desabilitarCampos} value={form.setor} onChange={(e) => setForm((s) => ({ ...s, setor: e.target.value }))} style={inputStyle} list="lista-setores" />
                <datalist id="lista-setores">
                  {setoresUnicos.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {fieldErr.setor ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.setor}</div> : null}
              </div>
              <div style={{ marginBottom: 10 }}>
                {lbl("f-cargo", "Cargo")}
                <input id="f-cargo" disabled={desabilitarCampos} value={form.cargo} onChange={(e) => setForm((s) => ({ ...s, cargo: e.target.value }))} style={inputStyle} />
                {fieldErr.cargo ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.cargo}</div> : null}
              </div>
              <div style={{ marginBottom: 10 }}>
                {lbl("f-nivel", "Nível")}
                <select
                  id="f-nivel"
                  disabled={desabilitarCampos}
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
              <div style={{ marginBottom: 10 }}>
                {lbl("f-tipo", "Tipo de contrato")}
                <select
                  id="f-tipo"
                  disabled={desabilitarCampos}
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
              {podeVerDadosSensiveis ? (
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-sal", "Salário")}
                  <input
                    id="f-sal"
                    disabled={desabilitarCampos}
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.salarioCentavos ? formatarMoedaDigitos(form.salarioCentavos) : ""}
                    onChange={(e) => setForm((s) => ({ ...s, salarioCentavos: centavosDeStringMoeda(e.target.value) }))}
                    placeholder="R$ 0,00"
                    style={inputStyle}
                  />
                  {fieldErr.salarioCentavos ? (
                    <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.salarioCentavos}</div>
                  ) : null}
                </div>
              ) : (
                <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 8%, transparent)", fontSize: 12, color: t.textMuted }}>
                  Salário e dados bancários: visíveis apenas para administrador ou quem tem permissão de edição nesta página.
                </div>
              )}
              <div style={{ marginBottom: 10 }}>
                {lbl("f-ini", "Data de início")}
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
                {lbl("f-escala", "Escala")}
                <input id="f-escala" disabled={desabilitarCampos} value={form.escala} onChange={(e) => setForm((s) => ({ ...s, escala: e.target.value }))} style={inputStyle} list="lista-escalas" />
                <datalist id="lista-escalas">
                  {ESCALAS_SUGEST.map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
                {fieldErr.escala ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.escala}</div> : null}
              </div>
            </div>
          </SecaoForm>

          <SecaoForm titulo="Empresa contratante" t={t}>
            <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
              <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                {lbl("f-empnome", "Nome da empresa")}
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
                {lbl("f-cnpj", "CNPJ")}
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
              <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                {lbl("f-empend", "Endereço da empresa")}
                <input
                  id="f-empend"
                  disabled={desabilitarCampos}
                  value={form.endereco_empresa}
                  onChange={(e) => setForm((s) => ({ ...s, endereco_empresa: e.target.value }))}
                  style={inputStyle}
                />
                {fieldErr.endereco_empresa ? (
                  <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.endereco_empresa}</div>
                ) : null}
              </div>
            </div>
          </SecaoForm>

          <SecaoForm titulo="Dados bancários" t={t}>
            {podeVerDadosSensiveis ? (
              <div className="app-grid-2-tight" style={{ marginTop: 4 }}>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-banco", "Banco")}
                  <input id="f-banco" disabled={desabilitarCampos} value={form.banco} onChange={(e) => setForm((s) => ({ ...s, banco: e.target.value }))} style={inputStyle} />
                  {fieldErr.banco ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.banco}</div> : null}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {lbl("f-ag", "Agência")}
                  <input
                    id="f-ag"
                    disabled={desabilitarCampos}
                    value={form.agencia}
                    onChange={(e) => setForm((s) => ({ ...s, agencia: formatarAgencia(e.target.value) }))}
                    placeholder="0000-0"
                    style={inputStyle}
                  />
                  {fieldErr.agencia ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.agencia}</div> : null}
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lbl("f-cc", "Conta corrente")}
                  <input
                    id="f-cc"
                    disabled={desabilitarCampos}
                    value={form.conta_corrente}
                    onChange={(e) => setForm((s) => ({ ...s, conta_corrente: e.target.value }))}
                    style={inputStyle}
                  />
                  {fieldErr.conta_corrente ? (
                    <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.conta_corrente}</div>
                  ) : null}
                </div>
                <div style={{ marginBottom: 10, gridColumn: "1 / -1" }}>
                  {lbl("f-pix", "PIX (opcional)")}
                  <input id="f-pix" disabled={desabilitarCampos} value={form.pix} onChange={(e) => setForm((s) => ({ ...s, pix: e.target.value }))} style={inputStyle} />
                </div>
              </div>
            ) : (
              <p style={{ margin: "8px 0 0", fontSize: 13, color: t.textMuted }}>Dados bancários ocultos para o seu perfil.</p>
            )}
          </SecaoForm>

          {!leitura ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
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
          ) : perm.canEditarOk && editId ? (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => {
                  const row = lista.find((x) => x.id === editId);
                  if (row) abrirEditar(row);
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 13,
                  background: ctaGradient(brand),
                }}
              >
                Editar
              </button>
            </div>
          ) : null}
        </ModalBase>
      )}

      {desativarRow ? (
        <ModalBase maxWidth={420} onClose={() => !desativando && setDesativarRow(null)}>
          <ModalHeader title="Desativar funcionário" onClose={() => !desativando && setDesativarRow(null)} />
          <p style={{ color: t.text, fontSize: 14, fontFamily: FONT.body, marginTop: 0 }}>
            Confirma a desativação de <strong>{desativarRow.nome}</strong>? O registro permanece no sistema como inativo.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button
              type="button"
              disabled={desativando}
              onClick={() => setDesativarRow(null)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                color: t.text,
                cursor: desativando ? "not-allowed" : "pointer",
                fontFamily: FONT.body,
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={desativando}
              onClick={() => void confirmarDesativar()}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: "#e84025",
                color: "#fff",
                fontWeight: 700,
                cursor: desativando ? "wait" : "pointer",
                fontFamily: FONT.body,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {desativando ? <Loader2 size={16} color="#fff" className="app-lucide-spin" aria-hidden /> : null}
              Desativar
            </button>
          </div>
        </ModalBase>
      ) : null}
    </div>
  );
}
