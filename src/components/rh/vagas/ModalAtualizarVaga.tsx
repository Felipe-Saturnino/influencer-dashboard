import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useListboxKeyboardNavigation } from "../../../hooks/useListboxKeyboardNavigation";
import { carregarOpcoesTimesOrganograma } from "../../../lib/rhOrganogramaFetch";
import {
  dataIsoDateOnly,
  hojeIsoDate,
  normalizarBuscaVaga,
  tipoVagaParaEdicao,
  type RhVagaTipoSelecionavel,
} from "../../../lib/rhVagasFormat";
import { SimNaoField } from "./SimNaoField";
import { TipoVagaField } from "./TipoVagaField";
import type { RhOrgOrganogramaGrupoPrestador } from "../../../types/rhOrganograma";
import type { RhVagaRow, RhVagaStatus, RhVagaTipo } from "../../../types/rhVaga";
import { BarraPesquisaPagina } from "../../BarraPesquisaPagina";
import { CampoObrigatorioMark } from "../../CampoObrigatorioMark";
import { FILTER_SEARCH_STAFF } from "../../../lib/searchBarConstants";
import { ModalBase, ModalHeader } from "../../OperacoesModal";
import { orgVinculoDeRow, orgVinculoTemSelecao, orgVinculoVazio, type RhVagaOrgVinculo } from "../../../lib/rhVagaOrganograma";
import { CampoOrganogramaVaga } from "./CampoOrganogramaVaga";
import { CampoTagsVaga } from "./CampoTagsVaga";
import { formatarMoedaDigitos, centavosInteirosDeStringMoeda } from "../../../lib/rhFuncionarioValidators";

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
  const [tipoVaga, setTipoVaga] = useState<RhVagaTipoSelecionavel>("interna");
  const [orgVinculo, setOrgVinculo] = useState<RhVagaOrgVinculo>(orgVinculoVazio);
  const [dataAbertura, setDataAbertura] = useState("");
  /** Só usado em "Atualizar" para validar data fim vs abertura (campo oculto). */
  const [dataAberturaRef, setDataAberturaRef] = useState("");
  const [dataFimInscricoes, setDataFimInscricoes] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsabilidades, setResponsabilidades] = useState("");
  const [repasseInicialCentavos, setRepasseInicialCentavos] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [necessarioVideoApresentacao, setNecessarioVideoApresentacao] = useState(false);
  const [necessarioTurno, setNecessarioTurno] = useState(false);

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
    setTipoVaga(tipoVagaParaEdicao(vaga.tipo_vaga as RhVagaTipo));
    setTitulo(vaga.titulo);
    setOrgVinculo(orgVinculoDeRow(vaga));
    setDataFimInscricoes(dataIsoDateOnly(vaga.data_fim_inscricoes));
    setDescricao(vaga.descricao ?? "");
    setResponsabilidades(vaga.responsabilidades ?? "");
    setRepasseInicialCentavos(
      vaga.repasse_inicial_centavos > 0 ? String(Math.trunc(vaga.repasse_inicial_centavos)) : "",
    );
    setTags(Array.isArray(vaga.tags) ? vaga.tags : []);
    setNecessarioVideoApresentacao(Boolean(vaga.necessario_video_apresentacao));
    setNecessarioTurno(Boolean(vaga.necessario_turno));
    const ab = dataIsoDateOnly(vaga.data_abertura);
    setDataAberturaRef(ab);
    if (accao === "reabrir") {
      setDataAbertura(hojeIsoDate());
    } else {
      setDataAbertura(ab);
    }
  }, [open, passo, accao, vaga]);

  useEffect(() => {
    if (tipoVaga !== "externa") {
      setNecessarioVideoApresentacao(false);
      setNecessarioTurno(false);
      setTags([]);
    }
  }, [tipoVaga]);

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
  const funcionariosKeyboard = useListboxKeyboardNavigation({
    items: filtradosHc,
    onSelect: (funcionario) => {
      setCandidatoId(funcionario.id);
      setBuscaHc("");
    },
  });

  const candidatoSelecionadoHc = useMemo(
    () => funcionarios.find((f) => f.id === candidatoId) ?? null,
    [funcionarios, candidatoId],
  );

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
    if (!orgVinculoTemSelecao(orgVinculo)) e.org_vinculo = "Selecione o organograma.";
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
    if (centavosInteirosDeStringMoeda(repasseInicialCentavos) <= 0) {
      e.repasse_inicial = "Informe o repasse inicial.";
    }
    if (tipoVaga === "externa" && tags.length === 0) e.tags = "Adicione ao menos uma tag.";
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

    const camposExterna = {
      necessario_video_apresentacao: tipoVaga === "externa" ? necessarioVideoApresentacao : false,
      necessario_turno: tipoVaga === "externa" ? necessarioTurno : false,
    };

    let patch: Record<string, unknown> = {};

    if (accao === "reabrir") {
      patch = {
        titulo: titulo.trim(),
        tipo_vaga: tipoVaga,
        org_time_id: orgVinculo.org_time_id,
        org_gerencia_id: orgVinculo.org_gerencia_id,
        org_diretoria_id: orgVinculo.org_diretoria_id,
        data_abertura: dataAbertura.trim(),
        data_fim_inscricoes: dataFimInscricoes.trim(),
        descricao: descricao.trim(),
        responsabilidades: responsabilidades.trim(),
        repasse_inicial_centavos: centavosInteirosDeStringMoeda(repasseInicialCentavos),
        tags: tipoVaga === "externa" ? tags : [],
        ...camposExterna,
        status: "aberta",
        data_encerramento: null,
        motivo_cancelamento: null,
        candidato_selecionado_funcionario_id: null,
      };
    } else if (accao === "atualizar") {
      patch = {
        titulo: titulo.trim(),
        tipo_vaga: tipoVaga,
        org_time_id: orgVinculo.org_time_id,
        org_gerencia_id: orgVinculo.org_gerencia_id,
        org_diretoria_id: orgVinculo.org_diretoria_id,
        data_fim_inscricoes: dataFimInscricoes.trim(),
        descricao: descricao.trim(),
        responsabilidades: responsabilidades.trim(),
        repasse_inicial_centavos: centavosInteirosDeStringMoeda(repasseInicialCentavos),
        tags: tipoVaga === "externa" ? tags : [],
        ...camposExterna,
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

              <TipoVagaField name="atv-tipo-vaga" value={tipoVaga} onChange={setTipoVaga} t={t} erro={fieldErr.tipo_vaga} />

              {tipoVaga === "externa" ? (
                <div className="app-grid-2" style={{ marginBottom: 14 }}>
                  <SimNaoField
                    name="atv-video-apresentacao"
                    label="Necessário Vídeo de Apresentação?"
                    value={necessarioVideoApresentacao}
                    onChange={setNecessarioVideoApresentacao}
                    t={t}
                  />
                  <SimNaoField
                    name="atv-turno"
                    label="Necessário Turno?"
                    value={necessarioTurno}
                    onChange={setNecessarioTurno}
                    t={t}
                  />
                </div>
              ) : null}

              <CampoOrganogramaVaga
                id="atv-org"
                value={orgVinculo}
                onChange={setOrgVinculo}
                grupos={grupos}
                disabled={carregandoOrg || grupos.length === 0}
                style={inputStyle}
                t={t}
                erro={fieldErr.org_vinculo}
              />

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
                {lblReq("atv-repasse", "Repasse inicial")}
                <input
                  id="atv-repasse"
                  type="text"
                  inputMode="decimal"
                  value={repasseInicialCentavos ? formatarMoedaDigitos(repasseInicialCentavos) : ""}
                  onChange={(e) => setRepasseInicialCentavos(e.target.value.replace(/\D/g, ""))}
                  placeholder="R$ 0,00"
                  autoComplete="off"
                  aria-label="Repasse inicial em reais"
                  style={inputStyle}
                />
                {fieldErr.repasse_inicial ? (
                  <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.repasse_inicial}</div>
                ) : null}
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
              {tipoVaga === "externa" ? (
                <CampoTagsVaga id="atv-tags" value={tags} onChange={setTags} t={t} inputStyle={inputStyle} obrigatorio erro={fieldErr.tags} />
              ) : null}
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
                {lblReq("atv-cand", "Candidato selecionado")}
                {candidatoSelecionadoHc ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      marginBottom: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${t.cardBorder}`,
                      background: t.inputBg,
                      fontFamily: FONT.body,
                      fontSize: 13,
                      color: t.text,
                    }}
                  >
                    <span>{candidatoSelecionadoHc.nome}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCandidatoId("");
                        setBuscaHc("");
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: `1px solid ${t.cardBorder}`,
                        background: "transparent",
                        color: t.text,
                        fontSize: 12,
                        fontFamily: FONT.body,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Trocar candidato
                    </button>
                  </div>
                ) : (
                  <>
                    <BarraPesquisaPagina
                      id="atv-busca-hc"
                      value={buscaHc}
                      onChange={setBuscaHc}
                      placeholder={FILTER_SEARCH_STAFF}
                      aria-label="Filtrar lista de funcionários por nome"
                      disabled={carregandoHc}
                      aria-activedescendant={
                        filtradosHc[funcionariosKeyboard.activeIndex]
                          ? `atv-funcionario-${funcionariosKeyboard.activeIndex}`
                          : undefined
                      }
                      onKeyDown={funcionariosKeyboard.onKeyDown}
                      wrapperStyle={{ width: "100%", marginBottom: 8 }}
                    />
                    <div
                      role="listbox"
                      aria-label="Funcionários para conclusão da vaga"
                      style={{
                        maxHeight: 200,
                        overflowY: "auto",
                        borderRadius: 10,
                        border: `1px solid ${t.cardBorder}`,
                        background: t.inputBg ?? t.cardBg,
                      }}
                    >
                      {filtradosHc.length === 0 ? (
                        <div style={{ padding: 12, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                          Nenhum resultado para a pesquisa.
                        </div>
                      ) : (
                        filtradosHc.map((f, i) => (
                          <button
                            key={f.id}
                            id={`atv-funcionario-${i}`}
                            ref={(node) => {
                              funcionariosKeyboard.optionRefs.current[i] = node;
                            }}
                            type="button"
                            role="option"
                            aria-selected={candidatoId === f.id}
                            tabIndex={-1}
                            onMouseEnter={() => funcionariosKeyboard.setActiveIndex(i)}
                            onClick={() => {
                              setCandidatoId(f.id);
                              setBuscaHc("");
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              textAlign: "left",
                              padding: "10px 12px",
                              border: "none",
                              borderTop: i > 0 ? `1px solid ${t.cardBorder}` : "none",
                              background:
                                i === funcionariosKeyboard.activeIndex
                                  ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)"
                                  : "transparent",
                              color: t.text,
                              fontSize: 13,
                              fontFamily: FONT.body,
                              cursor: "pointer",
                            }}
                          >
                            {f.nome}
                          </button>
                        ))
                      )}
                    </div>
                    {funcionarios.length > 500 && filtradosHc.length >= 500 ? (
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, fontFamily: FONT.body }}>
                        Mostrando até 500 resultados. Refine a pesquisa.
                      </div>
                    ) : null}
                  </>
                )}
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
