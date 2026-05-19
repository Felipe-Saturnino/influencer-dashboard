import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { buscarRhFuncionarioAtivoPorEmailLogin } from "../../../lib/rhFuncionarioLoginMatch";
import { supabase } from "../../../lib/supabase";
import { uploadCurriculoCandidaturaVaga } from "../../../lib/rhVagaCandidaturaFiles";
import type { RhVagaRow } from "../../../types/rhVaga";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import { CampoObrigatorioMark } from "../../CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../OperacoesModal";

const CARTA_PLACEHOLDER =
  "Destaque de forma objetiva a sua experiência como prestador na empresa, qual o interesse em assumir a nova posição, suas principais competências e como suas habilidades agregam para esta vaga.";

const CURRICULO_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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

export function ModalCandidaturaVaga({
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
  const { user } = useApp();
  const inputCurriculoRef = useRef<HTMLInputElement>(null);

  const [prestador, setPrestador] = useState<RhFuncionario | null>(null);
  const [carregandoPrestador, setCarregandoPrestador] = useState(false);
  const [erroPrestador, setErroPrestador] = useState<string | null>(null);

  const [curriculoFile, setCurriculoFile] = useState<File | null>(null);
  const [cartaApresentacao, setCartaApresentacao] = useState("");

  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const nomeCompleto = (prestador?.nome ?? "").trim();
  const funcaoAtual = (prestador?.cargo ?? "").trim();

  const resetForm = useCallback(() => {
    setCurriculoFile(null);
    setCartaApresentacao("");
    setFieldErr({});
    setErroSalvar(null);
    if (inputCurriculoRef.current) inputCurriculoRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!open) {
      setPrestador(null);
      setErroPrestador(null);
      resetForm();
      return;
    }
    resetForm();
    const email = user?.email?.trim();
    if (!email) {
      setPrestador(null);
      setErroPrestador("Não foi possível identificar o seu cadastro de prestador. Verifique o e-mail da sua conta.");
      return;
    }
    let cancelled = false;
    setCarregandoPrestador(true);
    setErroPrestador(null);
    void buscarRhFuncionarioAtivoPorEmailLogin(email).then((row) => {
      if (cancelled) return;
      setCarregandoPrestador(false);
      if (!row) {
        setPrestador(null);
        setErroPrestador(
          "Não encontramos seu cadastro ativo em Gestão de Prestadores. Peça ao RH para vincular seu e-mail ao cadastro.",
        );
        return;
      }
      if (!row.nome?.trim()) {
        setPrestador(null);
        setErroPrestador("Seu cadastro de prestador está sem nome completo. Atualize com o RH antes de candidatar-se.");
        return;
      }
      if (!row.cargo?.trim()) {
        setPrestador(null);
        setErroPrestador("Seu cadastro de prestador está sem função. Atualize com o RH antes de candidatar-se.");
        return;
      }
      setPrestador(row);
    });
    return () => {
      cancelled = true;
    };
  }, [open, resetForm, user?.email]);

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

  const readOnlyStyle: CSSProperties = {
    ...inputStyle,
    background: t.cardBg ?? t.inputBg,
    opacity: 0.92,
    cursor: "not-allowed",
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

  function validar(): boolean {
    const e: Record<string, string> = {};
    if (!prestador) e.prestador = erroPrestador ?? "Cadastro de prestador indisponível.";
    if (!curriculoFile) e.curriculo = "Anexe o currículo atualizado.";
    if (!cartaApresentacao.trim()) e.carta = "Informe a carta de apresentação.";
    setFieldErr(e);
    return Object.keys(e).length === 0;
  }

  async function candidatar() {
    if (!vaga || !prestador || !user?.id) return;
    setErroSalvar(null);
    if (!validar() || !curriculoFile) return;

    setSalvando(true);
    const up = await uploadCurriculoCandidaturaVaga(prestador.id, vaga.id, curriculoFile);
    if (!up.ok) {
      setSalvando(false);
      setErroSalvar(up.message);
      return;
    }

    const { error } = await supabase.from("rh_vaga_candidaturas").insert({
      vaga_id: vaga.id,
      funcionario_id: prestador.id,
      nome_completo: nomeCompleto,
      funcao_atual: funcaoAtual,
      curriculo_storage_path: up.path,
      curriculo_nome_arquivo: up.fileName,
      carta_apresentacao: cartaApresentacao.trim(),
      created_by: user.id,
    });

    setSalvando(false);
    if (error) {
      if (error.code === "23505") {
        setErroSalvar("Você já possui candidatura para esta vaga.");
      } else {
        setErroSalvar(error.message);
      }
      return;
    }
    onSalvo();
    onClose();
  }

  function fechar() {
    if (salvando) return;
    onClose();
  }

  if (!open || !vaga) return null;

  const podeEnviar = Boolean(prestador) && !carregandoPrestador;

  return (
    <ModalBase maxWidth={560} onClose={fechar} zIndex={1100}>
      <ModalHeader title="Candidatura" onClose={fechar} />
      <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.45 }}>
        Vaga: <strong style={{ color: t.text }}>{vaga.titulo}</strong>
      </p>

      <div style={{ maxHeight: "min(70dvh, 620px)", overflowY: "auto", paddingRight: 4 }}>
        {carregandoPrestador ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            <Loader2 size={16} className="app-lucide-spin" aria-hidden />
            Carregando seus dados…
          </div>
        ) : null}

        {erroPrestador ? (
          <div role="alert" style={{ marginBottom: 14, fontSize: 13, color: "#e84025", fontFamily: FONT.body, lineHeight: 1.45 }}>
            {erroPrestador}
          </div>
        ) : null}
        {fieldErr.prestador && !erroPrestador ? (
          <div style={{ marginBottom: 14, fontSize: 12, color: "#e84025", fontFamily: FONT.body }}>{fieldErr.prestador}</div>
        ) : null}

        <div style={{ marginBottom: 14 }}>
          {lbl("cand-nome", "Nome Completo")}
          <input
            id="cand-nome"
            type="text"
            readOnly
            value={nomeCompleto || "—"}
            style={readOnlyStyle}
            aria-readonly="true"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          {lbl("cand-funcao", "Função Atual")}
          <input
            id="cand-funcao"
            type="text"
            readOnly
            value={funcaoAtual || "—"}
            style={readOnlyStyle}
            aria-readonly="true"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          {lblReq("cand-curriculo", "Currículo Atualizado")}
          <input
            id="cand-curriculo"
            ref={inputCurriculoRef}
            type="file"
            accept={CURRICULO_ACCEPT}
            disabled={!podeEnviar || salvando}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setCurriculoFile(f);
              if (fieldErr.curriculo) setFieldErr((prev) => ({ ...prev, curriculo: "" }));
            }}
            style={{
              ...inputStyle,
              padding: 8,
              cursor: !podeEnviar || salvando ? "not-allowed" : "pointer",
              opacity: !podeEnviar || salvando ? 0.7 : 1,
            }}
            aria-describedby={fieldErr.curriculo ? "cand-curriculo-err" : undefined}
          />
          {curriculoFile ? (
            <div style={{ marginTop: 6, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{curriculoFile.name}</div>
          ) : (
            <div style={{ marginTop: 6, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>PDF ou Word (.pdf, .doc, .docx)</div>
          )}
          {fieldErr.curriculo ? (
            <div id="cand-curriculo-err" style={{ color: "#e84025", fontSize: 12, marginTop: 4, fontFamily: FONT.body }}>
              {fieldErr.curriculo}
            </div>
          ) : null}
        </div>

        <div style={{ marginBottom: 18 }}>
          {lblReq("cand-carta", "Carta de Apresentação")}
          <textarea
            id="cand-carta"
            value={cartaApresentacao}
            onChange={(e) => setCartaApresentacao(e.target.value)}
            placeholder={CARTA_PLACEHOLDER}
            rows={6}
            disabled={!podeEnviar || salvando}
            style={{ ...inputStyle, resize: "vertical", minHeight: 120, opacity: !podeEnviar || salvando ? 0.7 : 1 }}
          />
          {fieldErr.carta ? <div style={{ color: "#e84025", fontSize: 12, marginTop: 4, fontFamily: FONT.body }}>{fieldErr.carta}</div> : null}
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
            onClick={() => void candidatar()}
            disabled={salvando || !podeEnviar}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: ctaGradient(brand),
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: FONT.body,
              cursor: salvando || !podeEnviar ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              opacity: salvando || !podeEnviar ? 0.85 : 1,
            }}
          >
            {salvando ? <Loader2 size={16} className="app-lucide-spin" aria-hidden /> : null}
            Candidatar
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
