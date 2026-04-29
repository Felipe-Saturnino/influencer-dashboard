import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { centavosDeStringMoeda, formatarMoedaDigitos, somenteDigitos } from "../../../lib/rhFuncionarioValidators";
import { carregarOpcoesTimesOrganograma } from "../../../lib/rhOrganogramaFetch";
import { hojeIsoDate, tipoVagaDeCheckboxes } from "../../../lib/rhVagasFormat";
import type { RhOrgOrganogramaGrupoPrestador } from "../../../types/rhOrganograma";
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
  const [chkInterna, setChkInterna] = useState(true);
  const [chkExterna, setChkExterna] = useState(false);
  const [orgTimeId, setOrgTimeId] = useState<string | null>(null);
  const [salarioCentavos, setSalarioCentavos] = useState("");
  const [dataAbertura, setDataAbertura] = useState(hojeIsoDate());
  const [dataFimInscricoes, setDataFimInscricoes] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsabilidades, setResponsabilidades] = useState("");
  const [requisitos, setRequisitos] = useState("");
  const [escalaTrabalho, setEscalaTrabalho] = useState("");

  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitulo("");
    setChkInterna(true);
    setChkExterna(false);
    setOrgTimeId(null);
    setSalarioCentavos("");
    setDataAbertura(hojeIsoDate());
    setDataFimInscricoes("");
    setDescricao("");
    setResponsabilidades("");
    setRequisitos("");
    setEscalaTrabalho("");
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
    const tipo = tipoVagaDeCheckboxes(chkInterna, chkExterna);
    if (!tipo) e.tipo_vaga = "Selecione Interna e/ou Externa.";
    if (!orgTimeId) e.org_time_id = "Selecione o organograma (time).";
    const centSal = parseInt(somenteDigitos(salarioCentavos), 10) || 0;
    if (centSal <= 0) e.remuneracao = "Informe a remuneração mensal.";
    if (!dataAbertura.trim()) e.data_abertura = "Informe a data de abertura.";
    if (!dataFimInscricoes.trim()) e.data_fim = "Informe a data fim das inscrições.";
    if (dataAbertura && dataFimInscricoes && dataFimInscricoes < dataAbertura) {
      e.data_fim = "A data fim das inscrições não pode ser anterior à data de abertura.";
    }
    if (!descricao.trim()) e.descricao = "Informe a descrição.";
    if (!responsabilidades.trim()) e.responsabilidades = "Informe as responsabilidades.";
    if (!requisitos.trim()) e.requisitos = "Informe os requisitos.";
    if (!escalaTrabalho.trim()) e.escala = "Informe a escala de trabalho.";
    setFieldErr(e);
    return Object.keys(e).length === 0;
  }

  async function salvar() {
    setErroSalvar(null);
    if (!validar()) return;
    const tipo = tipoVagaDeCheckboxes(chkInterna, chkExterna)!;
    setSalvando(true);
    const centSal = parseInt(somenteDigitos(salarioCentavos), 10) || 0;
    const payload = {
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
          {lblReq("nv-org", "Organograma")}
          <SelectOrganogramaTimes
            id="nv-org"
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
          {lblReq("nv-sal", "Remuneração mensal")}
          <input
            id="nv-sal"
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
        <div style={{ marginBottom: 14 }}>
          {lblReq("nv-req", "Requisitos")}
          <textarea id="nv-req" value={requisitos} onChange={(e) => setRequisitos(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          {fieldErr.requisitos ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.requisitos}</div> : null}
        </div>
        <div style={{ marginBottom: 18 }}>
          {lblReq("nv-escala", "Escala de trabalho")}
          <textarea
            id="nv-escala"
            value={escalaTrabalho}
            onChange={(e) => setEscalaTrabalho(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          {fieldErr.escala ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4 }}>{fieldErr.escala}</div> : null}
        </div>

        {erroSalvar ? (
          <div role="alert" style={{ marginBottom: 12, fontSize: 13, color: "#e84025", fontFamily: FONT.body }}>
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
