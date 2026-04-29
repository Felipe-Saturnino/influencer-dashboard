import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { centavosDeStringMoeda, formatarMoedaDigitos, somenteDigitos } from "../../../lib/rhFuncionarioValidators";
import { carregarOpcoesTimesOrganograma } from "../../../lib/rhOrganogramaFetch";
import {
  checkboxesFromTipoVaga,
  dataIsoDateOnly,
  hojeIsoDate,
  normalizarBuscaVaga,
  tipoVagaDeCheckboxes,
} from "../../../lib/rhVagasFormat";
import type { RhOrgOrganogramaGrupoPrestador } from "../../../types/rhOrganograma";
import type { RhVagaRow, RhVagaStatus, RhVagaTipo } from "../../../types/rhVaga";
import { CampoObrigatorioMark } from "../../CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../OperacoesModal";
import { SelectOrganogramaTimes } from "../SelectOrganogramaTimes";

type Theme = {
  text: string;
  textMuted: string;
  cardBorder: string;
  inputBg: string;
  cardBg?: string;
};

type AcaoAtualizar = "" | "reabrir" | "atualizar" | "concluir" | "cancelar";

type HcRow = { id: string; nome: string };

function ctaGradient(brand: ReturnType<typeof useDashboardBrand>): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))";
}

function opcoesAcaoSelect(status: RhVagaStatus): { value: AcaoAtualizar; label: string }[] {
  if (status === "cancelada") return [{ value: "reabrir", label: "Reabrir vaga" }];
  if (status === "aberta" || status === "em_andamento") {
    return [
      { value: "atualizar", label: "Atualizar vaga" },
      { value: "concluir", label: "Concluir vaga" },
      { value: "cancelar", label: "Cancelar vaga" },
    ];
  }
  return [];
}

export function ModalAtualizarVaga({
  open,
  vaga,
  onClose,
  onSalvo,
  t,
}: {
  open: boolean;
  vaga: RhVagaRow | null;
  onClose: () => void;
  onSalvo: () => void;
  t: Theme;
}) {
  const brand = useDashboardBrand();

  const [passo, setPasso] = useState<"escolha" | "formulario">("escolha");
  const [accao, setAccao] = useState<AcaoAtualizar>("");

  const [grupos, setGrupos] = useState<RhOrgOrganogramaGrupoPrestador[]>([]);
  const [carregandoOrg, setCarregandoOrg] = useState(false);
  const [erroOrg, setErroOrg] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [chkInterna, setChkInterna] = useState(true);
  const [chkExterna, setChkExterna] = useState(false);
  const [orgTimeId, setOrgTimeId] = useState<string | null>(null);
  const [salarioCentavos, setSalarioCentavos] = useState("");
  const [dataAbertura, setDataAbertura] = useState("");
  /** Só usado em "Atualizar" para validar data fim vs abertura (campo oculto). */
  const [dataAberturaRef, setDataAberturaRef] = useState("");
  const [dataFimInscricoes, setDataFimInscricoes] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsabilidades, setResponsabilidades] = useState("");
  const [requisitos, setRequisitos] = useState("");
  const [escalaTrabalho, setEscalaTrabalho] = useState("");

  const [funcionarios, setFuncionarios] = useState<HcRow[]>([]);
  const [carregandoHc, setCarregandoHc] = useState(false);
  const [erroHc, setErroHc] = useState<string | null>(null);
  const [buscaHc, setBuscaHc] = useState("");
  const [candidatoId, setCandidatoId] = useState("");
  const [dataEncerramento, setDataEncerramento] = useState("");
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const resetTudo = useCallback(() => {
    setPasso("escolha");
    setAccao("");
    setFieldErr({});
    setErroSalvar(null);
    setErroHc(null);
    setBuscaHc("");
    setCandidatoId("");
    setMotivoCancelamento("");
  }, []);

  useEffect(() => {
    if (!open) {
      resetTudo();
      return;
    }
    resetTudo();
  }, [open, resetTudo]);

  useEffect(() => {
    if (!open || passo !== "formulario") return;
    if (accao !== "reabrir" && accao !== "atualizar") return;
    if (!vaga) return;
    const checks = checkboxesFromTipoVaga(vaga.tipo_vaga as RhVagaTipo);
    setChkInterna(checks.interna);
    setChkExterna(checks.externa);
    setTitulo(vaga.titulo);
    setOrgTimeId(vaga.org_time_id);
    setSalarioCentavos(String(Math.max(0, Math.round(Number(vaga.remuneracao_centavos)))));
    setDataFimInscricoes(dataIsoDateOnly(vaga.data_fim_inscricoes));
    setDescricao(vaga.descricao ?? "");
    setResponsabilidades(vaga.responsabilidades ?? "");
    setRequisitos(vaga.requisitos ?? "");
    setEscalaTrabalho(vaga.escala_trabalho ?? "");
    const ab = dataIsoDateOnly(vaga.data_abertura);
    setDataAberturaRef(ab);
    if (accao === "reabrir") {
      setDataAbertura(hojeIsoDate());
    } else {
      setDataAbertura(ab);
    }
  }, [open, passo, accao, vaga]);

  useEffect(() => {
    if (!open || passo !== "formulario" || accao !== "concluir" || !vaga) return;
    setDataEncerramento(hojeIsoDate());
    setCandidatoId(vaga.candidato_selecionado_funcionario_id ?? "");
  }, [open, passo, accao, vaga]);

  useEffect(() => {
    if (!open || passo !== "formulario" || accao !== "cancelar" || !vaga) return;
    setDataEncerramento(hojeIsoDate());
    setMotivoCancelamento("");
  }, [open, passo, accao, vaga]);

  useEffect(() => {
    if (!open || passo !== "formulario") return;
    if (accao !== "reabrir" && accao !== "atualizar") return;
    setCarregandoOrg(true);
    setErroOrg(null);
    void carregarOpcoesTimesOrganograma().then(({ grupos: g, error }) => {
      setCarregandoOrg(false);
      if (error) setErroOrg(error);
      else setGrupos(g);
    });
  }, [open, passo, accao]);

  useEffect(() => {
    if (!open || passo !== "formulario" || accao !== "concluir") return;
    let cancelled = false;
    setCarregandoHc(true);
    setErroHc(null);
    void supabase
      .from("rh_funcionarios")
      .select("id, nome")
      .in("status", ["ativo", "indisponivel"])
      .order("nome")
      .limit(5000)
      .then(({ data, error }) => {
        if (cancelled) return;
        setCarregandoHc(false);
        if (error) setErroHc(error.message);
        else setFuncionarios((data ?? []) as HcRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, passo, accao]);

  const filtradosHc = useMemo(() => {
    const q = normalizarBuscaVaga(buscaHc);
    let list = funcionarios;
    if (q) list = list.filter((f) => normalizarBuscaVaga(f.nome).includes(q));
    return list.slice(0, 500);
  }, [funcionarios, buscaHc]);

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 14,
    fontFamily: FONT.body,
    outline: "none",
  };

  const lbl = (htmlFor: string, text: string) => (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
      {text}
    </label>
  );
  const lblReq = (htmlFor: string, text: string) => (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
      {text}
      <CampoObrigatorioMark />
    </label>
  );

  function validarFormCorpo(): boolean {
    const e: Record<string, string> = {};
    if (!titulo.trim()) e.titulo = "Informe o título.";
    const tipo = tipoVagaDeCheckboxes(chkInterna, chkExterna);
    if (!tipo) e.tipo_vaga = "Selecione Interna e/ou Externa.";
    if (!orgTimeId) e.org_time_id = "Selecione o organograma (time).";
    const centSal = parseInt(somenteDigitos(salarioCentavos), 10) || 0;
    if (centSal <= 0) e.remuneracao = "Informe a remuneração mensal.";
    const abRef = accao === "atualizar" ? dataAberturaRef : dataAbertura;
    if (accao === "reabrir") {
      if (!dataAbertura.trim()) e.data_abertura = "Informe a data de abertura.";
    }
    if (!dataFimInscricoes.trim()) e.data_fim = "Informe a data fim das inscrições.";
    if (abRef && dataFimInscricoes && dataFimInscricoes < abRef) {
      e.data_fim = "A data fim das inscrições não pode ser anterior à data de abertura.";
    }
    if (!descricao.trim()) e.descricao = "Informe a descrição.";
    if (!responsabilidades.trim()) e.responsabilidades = "Informe as responsabilidades.";
    if (!requisitos.trim()) e.requisitos = "Informe os requisitos.";
    if (!escalaTrabalho.trim()) e.escala = "Informe a escala de trabalho.";
    setFieldErr(e);
    return Object.keys(e).length === 0;
  }

  function validarConcluir(): boolean {
    const e: Record<string, string> = {};
    if (!candidatoId) e.candidato = "Selecione o candidato (HC).";
    if (!dataEncerramento.trim()) e.data_enc = "Informe a data de encerramento.";
    setFieldErr(e);
    return Object.keys(e).length === 0;
  }

  function validarCancelar(): boolean {
    const e: Record<string, string> = {};
    if (!dataEncerramento.trim()) e.data_enc = "Informe a data de encerramento.";
    if (!motivoCancelamento.trim()) e.motivo = "Informe o motivo do cancelamento.";
    setFieldErr(e);
    return Object.keys(e).length === 0;
  }

  async function salvar() {
    if (!vaga) return;
    setErroSalvar(null);
    if (accao === "reabrir" || accao === "atualizar") {
      if (!validarFormCorpo()) return;
    } else if (accao === "concluir") {
      if (!validarConcluir()) return;
    } else if (accao === "cancelar") {
      if (!validarCancelar()) return;
    } else return;

    setSalvando(true);

    let patch: Record<string, unknown> = {};

    if (accao === "reabrir") {
      const tipo = tipoVagaDeCheckboxes(chkInterna, chkExterna)!;
      const centSal = parseInt(somenteDigitos(salarioCentavos), 10) || 0;
      patch = {
        titulo: titulo.trim(),
        tipo_vaga: tipo,
        org_time_id: orgTimeId,
        remuneracao_centavos: centSal,
        data_abertura: dataAbertura.trim(),
        data_fim_inscricoes: dataFimInscricoes.trim(),
        descricao: descricao.trim(),
        responsabilidades: responsabilidades.trim(),
        requisitos: requisitos.trim(),
        escala_trabalho: escalaTrabalho.trim(),
        status: "aberta",
        data_encerramento: null,
        motivo_cancelamento: null,
        candidato_selecionado_funcionario_id: null,
      };
    } else if (accao === "atualizar") {
      const tipo = tipoVagaDeCheckboxes(chkInterna, chkExterna)!;
      const centSal = parseInt(somenteDigitos(salarioCentavos), 10) || 0;
      patch = {
        titulo: titulo.trim(),
        tipo_vaga: tipo,
        org_time_id: orgTimeId,
        remuneracao_centavos: centSal,
        data_fim_inscricoes: dataFimInscricoes.trim(),
        descricao: descricao.trim(),
        responsabilidades: responsabilidades.trim(),
        requisitos: requisitos.trim(),
        escala_trabalho: escalaTrabalho.trim(),
      };
    } else if (accao === "concluir") {
      patch = {
        status: "concluida",
        candidato_selecionado_funcionario_id: candidatoId,
        data_encerramento: dataEncerramento.trim(),
        motivo_cancelamento: null,
      };
    } else if (accao === "cancelar") {
      patch = {
        status: "cancelada",
        data_encerramento: dataEncerramento.trim(),
        motivo_cancelamento: motivoCancelamento.trim(),
        candidato_selecionado_funcionario_id: null,
      };
    }

    const { error } = await supabase.from("rh_vagas").update(patch).eq("id", vaga.id);
    setSalvando(false);
    if (error) {
      setErroSalvar(error.message);
      return;
    }
    onSalvo();
    onClose();
  }

  function fechar() {
    if (salvando) return;
    onClose();
  }

  function irParaFormulario() {
    if (!accao || !vaga) return;
    setFieldErr({});
    setErroSalvar(null);
    setPasso("formulario");
  }

  function voltarEscolha() {
    setPasso("escolha");
    setAccao("");
    setFieldErr({});
    setErroSalvar(null);
  }

  if (!open || !vaga) return null;

  const opcoes = opcoesAcaoSelect(vaga.status as RhVagaStatus);
  const tituloModal = `Atualizar vaga — ${vaga.titulo}`;

  return (
    <ModalBase maxWidth={560} onClose={fechar} zIndex={1101}>
      <ModalHeader title={tituloModal} onClose={fechar} />

      {passo === "escolha" ? (
        <div style={{ fontFamily: FONT.body }}>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: t.textMuted, lineHeight: 1.45 }}>
            Status atual: <strong style={{ color: t.text }}>{vaga.status === "aberta" ? "Aberta" : vaga.status === "em_andamento" ? "Em andamento" : "Cancelada"}</strong>
          </p>
          {lbl("atv-acao", "Selecione a ação")}
          <select
            id="atv-acao"
            value={accao}
            onChange={(e) => setAccao(e.target.value as AcaoAtualizar)}
            aria-label="Ação a executar na vaga"
            style={{ ...inputStyle, marginBottom: 16 }}
          >
            <option value="">— Selecione —</option>
            {opcoes.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={fechar}
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
              disabled={!accao}
              onClick={irParaFormulario}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: ctaGradient(brand),
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: !accao ? "not-allowed" : "pointer",
                opacity: !accao ? 0.55 : 1,
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      ) : (
        <div style={{ maxHeight: "min(70dvh, 640px)", overflowY: "auto", paddingRight: 4, fontFamily: FONT.body }}>
          <button
            type="button"
            onClick={voltarEscolha}
            style={{
              marginBottom: 14,
              padding: 0,
              border: "none",
              background: "none",
              color: brand.accent,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONT.body,
            }}
          >
            « Escolher outra ação
          </button>

          {accao === "reabrir" || accao === "atualizar" ? (
            <>
              {erroOrg ? <div style={{ marginBottom: 12, fontSize: 13, color: "#e84025" }}>{erroOrg}</div> : null}
              {carregandoOrg ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: t.textMuted, fontSize: 13 }}>
                  <Loader2 size={16} className="app-lucide-spin" aria-hidden />
                  Carregando organograma…
                </div>
              ) : null}

              <div style={{ marginBottom: 14 }}>
                {lblReq("atv-titulo", "Título")}
                <input id="atv-titulo" type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} autoComplete="off" />
                {fieldErr.titulo ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.titulo}</div> : null}
              </div>

              <fieldset style={{ border: "none", margin: "0 0 14px", padding: 0 }}>
                <legend style={{ fontSize: 12, color: t.textMuted, marginBottom: 8, fontFamily: FONT.body, padding: 0 }}>
                  Tipo de vaga
                  <CampoObrigatorioMark />
                </legend>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: t.text, fontFamily: FONT.body }}>
                    <input type="checkbox" checked={chkInterna} onChange={(e) => setChkInterna(e.target.checked)} aria-label="Vaga interna" />
                    Interna
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: t.text, fontFamily: FONT.body }}>
                    <input type="checkbox" checked={chkExterna} onChange={(e) => setChkExterna(e.target.checked)} aria-label="Vaga externa" />
                    Externa
                  </label>
                </div>
                {fieldErr.tipo_vaga ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 6 }}>{fieldErr.tipo_vaga}</div> : null}
              </fieldset>

              <div style={{ marginBottom: 14 }}>
                {lblReq("atv-org", "Organograma")}
                <SelectOrganogramaTimes
                  id="atv-org"
                  aria-label="Selecionar time no organograma"
                  value={orgTimeId ?? ""}
                  disabled={carregandoOrg || grupos.length === 0}
                  grupos={grupos}
                  acceptLevels={["time"]}
                  onPick={(id) => setOrgTimeId(id)}
                  style={inputStyle}
                />
                {fieldErr.org_time_id ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.org_time_id}</div> : null}
              </div>

              <div style={{ marginBottom: 14 }}>
                {lblReq("atv-sal", "Remuneração mensal")}
                <input
                  id="atv-sal"
                  type="text"
                  inputMode="decimal"
                  value={salarioCentavos ? formatarMoedaDigitos(salarioCentavos) : ""}
                  onChange={(e) => setSalarioCentavos(centavosDeStringMoeda(e.target.value))}
                  placeholder="R$ 0,00"
                  style={inputStyle}
                  autoComplete="off"
                />
                {fieldErr.remuneracao ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.remuneracao}</div> : null}
              </div>

              {accao === "reabrir" ? (
                <div style={{ marginBottom: 14 }}>
                  {lblReq("atv-abertura", "Data de abertura")}
                  <input id="atv-abertura" type="date" value={dataAbertura} onChange={(e) => setDataAbertura(e.target.value)} style={inputStyle} />
                  {fieldErr.data_abertura ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.data_abertura}</div> : null}
                </div>
              ) : null}

              <div style={{ marginBottom: 14 }}>
                {lblReq("atv-fim", "Data fim das inscrições")}
                <input id="atv-fim" type="date" value={dataFimInscricoes} onChange={(e) => setDataFimInscricoes(e.target.value)} style={inputStyle} />
                {fieldErr.data_fim ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.data_fim}</div> : null}
              </div>

              <div style={{ marginBottom: 14 }}>
                {lblReq("atv-desc", "Descrição")}
                <textarea id="atv-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
                {fieldErr.descricao ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.descricao}</div> : null}
              </div>
              <div style={{ marginBottom: 14 }}>
                {lblReq("atv-resp", "Responsabilidades")}
                <textarea
                  id="atv-resp"
                  value={responsabilidades}
                  onChange={(e) => setResponsabilidades(e.target.value)}
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                {fieldErr.responsabilidades ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.responsabilidades}</div> : null}
              </div>
              <div style={{ marginBottom: 14 }}>
                {lblReq("atv-req", "Requisitos")}
                <textarea id="atv-req" value={requisitos} onChange={(e) => setRequisitos(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
                {fieldErr.requisitos ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.requisitos}</div> : null}
              </div>
              <div style={{ marginBottom: 18 }}>
                {lblReq("atv-escala", "Escala de trabalho")}
                <textarea
                  id="atv-escala"
                  value={escalaTrabalho}
                  onChange={(e) => setEscalaTrabalho(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                {fieldErr.escala ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.escala}</div> : null}
              </div>
            </>
          ) : null}

          {accao === "concluir" ? (
            <>
              {erroHc ? <div style={{ marginBottom: 12, fontSize: 13, color: "#e84025" }}>{erroHc}</div> : null}
              {carregandoHc ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: t.textMuted, fontSize: 13 }}>
                  <Loader2 size={16} className="app-lucide-spin" aria-hidden />
                  Carregando lista HC…
                </div>
              ) : null}
              <div style={{ marginBottom: 14 }}>
                {lbl("atv-busca-hc", "Pesquisar candidato (HC)")}
                <input
                  id="atv-busca-hc"
                  type="search"
                  value={buscaHc}
                  onChange={(e) => setBuscaHc(e.target.value)}
                  placeholder="Nome do funcionário…"
                  autoComplete="off"
                  aria-label="Filtrar lista de funcionários por nome"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                {lblReq("atv-cand", "Candidato selecionado")}
                <select
                  id="atv-cand"
                  value={candidatoId}
                  onChange={(e) => setCandidatoId(e.target.value)}
                  aria-label="Selecionar candidato na lista HC"
                  size={Math.min(10, Math.max(3, filtradosHc.length + 1))}
                  style={{ ...inputStyle, height: "auto", minHeight: 120 }}
                >
                  <option value="">— Selecione —</option>
                  {filtradosHc.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
                {funcionarios.length > 500 && filtradosHc.length >= 500 ? (
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>Mostrando até 500 resultados. Refine a pesquisa.</div>
                ) : null}
                {fieldErr.candidato ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.candidato}</div> : null}
              </div>
              <div style={{ marginBottom: 18 }}>
                {lblReq("atv-enc-1", "Data de encerramento")}
                <input id="atv-enc-1" type="date" value={dataEncerramento} onChange={(e) => setDataEncerramento(e.target.value)} style={inputStyle} />
                {fieldErr.data_enc ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.data_enc}</div> : null}
              </div>
            </>
          ) : null}

          {accao === "cancelar" ? (
            <>
              <div style={{ marginBottom: 14 }}>
                {lblReq("atv-enc-2", "Data de encerramento")}
                <input id="atv-enc-2" type="date" value={dataEncerramento} onChange={(e) => setDataEncerramento(e.target.value)} style={inputStyle} />
                {fieldErr.data_enc ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.data_enc}</div> : null}
              </div>
              <div style={{ marginBottom: 18 }}>
                {lblReq("atv-motivo", "Motivo do cancelamento")}
                <textarea
                  id="atv-motivo"
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                {fieldErr.motivo ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.motivo}</div> : null}
              </div>
            </>
          ) : null}

          {erroSalvar ? (
            <div role="alert" style={{ marginBottom: 12, fontSize: 13, color: "#e84025" }}>
              {erroSalvar}
            </div>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              onClick={fechar}
              disabled={salvando}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                color: t.text,
                fontWeight: 600,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: salvando ? "not-allowed" : "pointer",
                opacity: salvando ? 0.6 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: ctaGradient(brand),
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: salvando ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {salvando ? <Loader2 size={16} className="app-lucide-spin" aria-hidden /> : null}
              Salvar
            </button>
          </div>
        </div>
      )}
    </ModalBase>
  );
}
