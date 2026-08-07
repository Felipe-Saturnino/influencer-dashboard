import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { carregarOpcoesTimesOrganograma } from "../../../lib/rhOrganogramaFetch";
import { hojeIsoDate, type RhVagaTipoSelecionavel } from "../../../lib/rhVagasFormat";
import { SimNaoField } from "./SimNaoField";
import { TipoVagaField } from "./TipoVagaField";
import type { RhOrgOrganogramaGrupoPrestador } from "../../../types/rhOrganograma";
import { CampoObrigatorioMark } from "../../CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../OperacoesModal";
import { orgVinculoTemSelecao, orgVinculoVazio, type RhVagaOrgVinculo } from "../../../lib/rhVagaOrganograma";
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

function ctaGradient(brand: ReturnType<typeof useDashboardBrand>): string {
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, var(--brand-action, #7c3aed), var(--brand-contrast, #1e36f8))";
}

export function ModalNovaVaga({
  open,
  onClose,
  onSalvo,
  t,
}: {
  open: boolean;
  onClose: () => void;
  onSalvo: () => void;
  t: Theme;
}) {
  const brand = useDashboardBrand();

  const [grupos, setGrupos] = useState<RhOrgOrganogramaGrupoPrestador[]>([]);
  const [carregandoOrg, setCarregandoOrg] = useState(false);
  const [erroOrg, setErroOrg] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [tipoVaga, setTipoVaga] = useState<RhVagaTipoSelecionavel>("interna");
  const [necessarioVideoApresentacao, setNecessarioVideoApresentacao] = useState(false);
  const [necessarioTurno, setNecessarioTurno] = useState(false);
  const [orgVinculo, setOrgVinculo] = useState<RhVagaOrgVinculo>(orgVinculoVazio);
  const [dataAbertura, setDataAbertura] = useState(hojeIsoDate());
  const [dataFimInscricoes, setDataFimInscricoes] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsabilidades, setResponsabilidades] = useState("");
  const [repasseInicialCentavos, setRepasseInicialCentavos] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitulo("");
    setTipoVaga("interna");
    setNecessarioVideoApresentacao(false);
    setNecessarioTurno(false);
    setOrgVinculo(orgVinculoVazio());
    setDataAbertura(hojeIsoDate());
    setDataFimInscricoes("");
    setDescricao("");
    setResponsabilidades("");
    setRepasseInicialCentavos("");
    setTags([]);
    setFieldErr({});
    setErroSalvar(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    resetForm();
    setCarregandoOrg(true);
    setErroOrg(null);
    void carregarOpcoesTimesOrganograma().then(({ grupos: g, error }) => {
      setCarregandoOrg(false);
      if (error) setErroOrg(error);
      else setGrupos(g);
    });
  }, [open, resetForm]);

  useEffect(() => {
    if (tipoVaga !== "externa") {
      setNecessarioVideoApresentacao(false);
      setNecessarioTurno(false);
      setTags([]);
    }
  }, [tipoVaga]);

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

  const lblReq = (htmlFor: string, text: string) => (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12, color: t.textMuted, marginBottom: 6, fontFamily: FONT.body }}>
      {text}
      <CampoObrigatorioMark />
    </label>
  );

  function validar(): boolean {
    const e: Record<string, string> = {};
    if (!titulo.trim()) e.titulo = "Informe o título.";
    if (!orgVinculoTemSelecao(orgVinculo)) e.org_vinculo = "Selecione o organograma.";
    if (!dataAbertura.trim()) e.data_abertura = "Informe a data de abertura.";
    if (!dataFimInscricoes.trim()) e.data_fim = "Informe a data fim das inscrições.";
    if (dataAbertura && dataFimInscricoes && dataFimInscricoes < dataAbertura) {
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

  async function salvar() {
    setErroSalvar(null);
    if (!validar()) return;
    setSalvando(true);
    const payload = {
      titulo: titulo.trim(),
      tipo_vaga: tipoVaga,
      org_time_id: orgVinculo.org_time_id,
      org_gerencia_id: orgVinculo.org_gerencia_id,
      org_diretoria_id: orgVinculo.org_diretoria_id,
      repasse_inicial_centavos: centavosInteirosDeStringMoeda(repasseInicialCentavos),
      data_abertura: dataAbertura.trim(),
      data_fim_inscricoes: dataFimInscricoes.trim(),
      descricao: descricao.trim(),
      responsabilidades: responsabilidades.trim(),
      tags: tipoVaga === "externa" ? tags : [],
      necessario_video_apresentacao: tipoVaga === "externa" ? necessarioVideoApresentacao : false,
      necessario_turno: tipoVaga === "externa" ? necessarioTurno : false,
      status: "aberta" as const,
    };
    const { error } = await supabase.from("rh_vagas").insert(payload);
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

  if (!open) return null;

  return (
    <ModalBase maxWidth={560} onClose={fechar} zIndex={1100}>
      <ModalHeader title="Nova vaga" onClose={fechar} />
      <div style={{ maxHeight: "min(70dvh, 620px)", overflowY: "auto", paddingRight: 4 }}>
        {erroOrg ? (
          <div style={{ marginBottom: 12, fontSize: 13, color: "#e84025", fontFamily: FONT.body }}>{erroOrg}</div>
        ) : null}
        {carregandoOrg ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: t.textMuted, fontSize: 13 }}>
            <Loader2 size={16} className="app-lucide-spin" aria-hidden />
            Carregando organograma…
          </div>
        ) : null}

        <div style={{ marginBottom: 14 }}>
          {lblReq("nv-titulo", "Título")}
          <input id="nv-titulo" type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} autoComplete="off" />
          {fieldErr.titulo ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.titulo}</div> : null}
        </div>

        <TipoVagaField name="nv-tipo-vaga" value={tipoVaga} onChange={setTipoVaga} t={t} erro={fieldErr.tipo_vaga} />

        {tipoVaga === "externa" ? (
          <div className="app-grid-2" style={{ marginBottom: 14 }}>
            <SimNaoField
              name="nv-video-apresentacao"
              label="Necessário Vídeo de Apresentação?"
              value={necessarioVideoApresentacao}
              onChange={setNecessarioVideoApresentacao}
              t={t}
            />
            <SimNaoField
              name="nv-turno"
              label="Necessário Turno?"
              value={necessarioTurno}
              onChange={setNecessarioTurno}
              t={t}
            />
          </div>
        ) : null}

        <CampoOrganogramaVaga
          id="nv-org"
          value={orgVinculo}
          onChange={setOrgVinculo}
          grupos={grupos}
          disabled={carregandoOrg || grupos.length === 0}
          style={inputStyle}
          t={t}
          erro={fieldErr.org_vinculo}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            {lblReq("nv-abertura", "Data de abertura")}
            <input id="nv-abertura" type="date" value={dataAbertura} onChange={(e) => setDataAbertura(e.target.value)} style={inputStyle} />
            {fieldErr.data_abertura ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.data_abertura}</div> : null}
          </div>
          <div>
            {lblReq("nv-fim", "Data fim das inscrições")}
            <input id="nv-fim" type="date" value={dataFimInscricoes} onChange={(e) => setDataFimInscricoes(e.target.value)} style={inputStyle} />
            {fieldErr.data_fim ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.data_fim}</div> : null}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          {lblReq("nv-repasse", "Repasse inicial")}
          <input
            id="nv-repasse"
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
          {lblReq("nv-desc", "Descrição")}
          <textarea id="nv-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          {fieldErr.descricao ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.descricao}</div> : null}
        </div>
        <div style={{ marginBottom: 14 }}>
          {lblReq("nv-resp", "Responsabilidades")}
          <textarea
            id="nv-resp"
            value={responsabilidades}
            onChange={(e) => setResponsabilidades(e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          {fieldErr.responsabilidades ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.responsabilidades}</div> : null}
        </div>
        {tipoVaga === "externa" ? (
          <CampoTagsVaga
            id="nv-tags"
            value={tags}
            onChange={setTags}
            t={t}
            inputStyle={inputStyle}
            obrigatorio
            erro={fieldErr.tags}
          />
        ) : null}

        {erroSalvar ? (
          <div role="alert" style={{ marginBottom: 12, fontSize: 13, color: "#e84025", fontFamily: FONT.body }}>
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
              opacity: salvando ? 0.85 : 1,
            }}
          >
            {salvando ? <Loader2 size={16} className="app-lucide-spin" aria-hidden /> : null}
            Salvar
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
