import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import type { Role } from "../../../types";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { ctaGradientInformativos } from "../../../lib/informativosUi";
import { FONT } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { EditorTextoFormatado } from "../../../components/conteudo/EditorTextoFormatado";
import { InformativoPerfilMultiSelect } from "../../../components/conteudo/InformativoPerfilMultiSelect";
import { InformativoOperadorEscopoSelect } from "../../../components/conteudo/InformativoOperadorEscopoSelect";
import { perfisIncluemOperador } from "../../../lib/informativosOperadorEscopo";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import {
  acaoEnvioPermitida,
  diffEdicaoRascunho,
  perfisRequeremFluxoAprovacao,
  podePublicarDiretoInformativo,
  registrarHistoricoEdicoesRascunho,
  registrarHistoricoStatus,
  sanitizeInformativoHtml,
  validarPublicarInformativo,
  validarSalvarInformativo,
  type InformativoStatus,
  type SnapshotInformativoEdicao,
} from "../../../lib/informativosWorkflow";
const ERRO_CARREGAR = "Não foi possível carregar o informativo para edição.";
const ERRO_SALVAR = "Não foi possível salvar o informativo. Se o problema persistir, contate o suporte.";
const ERRO_ACAO_PERFIL =
  "A combinação de perfis selecionada não permite esta ação. Ajuste os perfis ou escolha outra forma de envio.";

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "inherit",
  marginBottom: 6,
  fontFamily: FONT.body,
};

export function ModalCriarInformativo({
  open,
  modo,
  editId,
  onClose,
  onSalvo,
}: {
  open: boolean;
  modo: "criar" | "editar";
  editId: string | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();

  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [perfis, setPerfis] = useState<Role[]>([]);
  const [operadorEscopo, setOperadorEscopo] = useState<string | null>(null);
  const [statusAtual, setStatusAtual] = useState<InformativoStatus>("rascunho");
  const [loadingData, setLoadingData] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [snapshotEdicao, setSnapshotEdicao] = useState<SnapshotInformativoEdicao | null>(null);

  const resetForm = useCallback(() => {
    setAssunto("");
    setDescricao("");
    setPerfis([]);
    setOperadorEscopo(null);
    setStatusAtual("rascunho");
    setFieldErr({});
    setErro(null);
    setSnapshotEdicao(null);
  }, []);

  const carregarEdicao = useCallback(async (id: string) => {
    setLoadingData(true);
    setErro(null);
    const { data, error } = await supabase.from("conteudo_informativo").select("*").eq("id", id).single();
    setLoadingData(false);
    if (error || !data) {
      console.error("[ModalCriarInformativo] carregar:", error);
      setErro(ERRO_CARREGAR);
      return;
    }
    const row = data as {
      assunto: string;
      descricao: string;
      perfis: string[];
      operador_escopo: string | null;
      status: InformativoStatus;
    };
    setAssunto(row.assunto);
    setDescricao(row.descricao);
    setPerfis((row.perfis ?? []) as Role[]);
    setOperadorEscopo(row.operador_escopo ?? null);
    setStatusAtual(row.status);
    setSnapshotEdicao({
      assunto: row.assunto,
      descricao: row.descricao,
      perfis: [...(row.perfis ?? [])],
      operador_escopo: row.operador_escopo ?? null,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }
    if (modo === "editar" && editId) void carregarEdicao(editId);
    else resetForm();
  }, [open, modo, editId, carregarEdicao, resetForm]);

  const mostrarEscopoOperador = perfisIncluemOperador(perfis);

  useEffect(() => {
    if (!mostrarEscopoOperador) setOperadorEscopo(null);
  }, [mostrarEscopoOperador]);

  const persistir = async (acao: "salvar" | "aprovacao" | "publicar") => {
    if (!user?.id) return;
    const novoStatus: InformativoStatus =
      acao === "salvar"
        ? modo === "editar" && (statusAtual === "publicado" || statusAtual === "aprovacao")
          ? statusAtual
          : "rascunho"
        : acao === "aprovacao"
          ? "aprovacao"
          : "publicado";

    const escopoPersistido = mostrarEscopoOperador ? operadorEscopo : null;

    if (acao === "publicar" || acao === "aprovacao") {
      const errs = validarPublicarInformativo({
        assunto,
        descricao,
        perfis,
        operador_escopo: escopoPersistido,
      });
      setFieldErr(errs);
      if (Object.keys(errs).length > 0) return;
      if (!acaoEnvioPermitida(acao, perfis)) {
        setErro(ERRO_ACAO_PERFIL);
        return;
      }
    } else {
      const errs = validarSalvarInformativo({ perfis, operador_escopo: escopoPersistido });
      setFieldErr(errs);
      if (Object.keys(errs).length > 0) return;
    }

    setSalvando(true);
    setErro(null);
    const now = new Date().toISOString();
    const descricaoSan = sanitizeInformativoHtml(descricao);

    const basePayload = {
      assunto: assunto.trim() || "Rascunho",
      descricao: descricaoSan,
      perfis,
      operador_escopo: escopoPersistido,
      status: novoStatus,
    };
    const publishFields =
      novoStatus === "publicado"
        ? { published_at: now, published_by: user.id }
        : {};

    try {
      if (modo === "editar" && editId) {
        const { error } = await supabase
          .from("conteudo_informativo")
          .update({ ...basePayload, ...publishFields })
          .eq("id", editId);
        if (error) {
          console.error("[ModalCriarInformativo] update:", error);
          setSalvando(false);
          setErro(ERRO_SALVAR);
          return;
        }
        if (statusAtual === "rascunho" && snapshotEdicao) {
          const depois: SnapshotInformativoEdicao = {
            assunto: assunto.trim(),
            descricao: descricaoSan,
            perfis: [...perfis],
            operador_escopo: escopoPersistido,
          };
          const alteracoes = diffEdicaoRascunho(snapshotEdicao, depois);
          await registrarHistoricoEdicoesRascunho(supabase, editId, alteracoes, user.id);
        }
        if (statusAtual !== novoStatus) {
          await registrarHistoricoStatus(supabase, editId, statusAtual, novoStatus, user.id);
        }
      } else {
        const { data: inserted, error } = await supabase
          .from("conteudo_informativo")
          .insert({ ...basePayload, created_by: user.id, ...publishFields })
          .select("id")
          .single();
        if (error || !inserted) {
          console.error("[ModalCriarInformativo] insert:", error);
          setSalvando(false);
          setErro(ERRO_SALVAR);
          return;
        }
        const id = (inserted as { id: string }).id;
        await registrarHistoricoStatus(supabase, id, null, novoStatus, user.id);
      }

      setSalvando(false);
      onSalvo();
      onClose();
    } catch (e) {
      console.error("[ModalCriarInformativo] persistir:", e);
      setSalvando(false);
      setErro(ERRO_SALVAR);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    boxSizing: "border-box" as const,
  };

  const mostrarEnviarAprovacao = perfisRequeremFluxoAprovacao(perfis);
  const mostrarPublicar = podePublicarDiretoInformativo(perfis);

  if (!open) return null;

  return (
    <ModalBase maxWidth={640} onClose={onClose} zIndex={1100}>
      <ModalHeader title={modo === "editar" ? "Editar informativo" : "Novo informativo"} onClose={onClose} />
      <div style={{ padding: "0 20px 20px", fontFamily: FONT.body }}>
        {erro ? (
          <div role="alert" style={{ color: "#e84025", fontSize: 13, marginBottom: 12 }}>
            {erro}
          </div>
        ) : null}
        {loadingData ? (
          <div style={{ textAlign: "center", padding: 32, color: t.textMuted }}>
            <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Assunto <CampoObrigatorioMark />
              </label>
              <input
                type="text"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: fieldErr.assunto ? "#e84025" : t.cardBorder,
                }}
                aria-invalid={!!fieldErr.assunto}
              />
              {fieldErr.assunto ? (
                <div style={{ color: "#e84025", fontSize: 11, marginTop: 4 }}>{fieldErr.assunto}</div>
              ) : null}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Descrição <CampoObrigatorioMark />
              </label>
              <EditorTextoFormatado
                value={descricao}
                onChange={setDescricao}
                t={t}
                ariaLabel="Descrição do informativo"
                hasError={!!fieldErr.descricao}
              />
              {fieldErr.descricao ? (
                <div style={{ color: "#e84025", fontSize: 11, marginTop: 4 }}>{fieldErr.descricao}</div>
              ) : null}
            </div>

            <div style={{ marginBottom: 18 }}>
              <span style={labelStyle}>
                Perfil <CampoObrigatorioMark />
              </span>
              <InformativoPerfilMultiSelect
                selected={perfis}
                onChange={setPerfis}
                t={t}
                hasError={!!fieldErr.perfis}
              />
              {fieldErr.perfis ? (
                <div style={{ color: "#e84025", fontSize: 11, marginTop: 4 }}>{fieldErr.perfis}</div>
              ) : null}
            </div>

            {mostrarEscopoOperador ? (
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="informativo-operador-escopo" style={labelStyle}>
                  Operadora (perfil Operador) <CampoObrigatorioMark />
                </label>
                <InformativoOperadorEscopoSelect
                  value={operadorEscopo}
                  onChange={setOperadorEscopo}
                  t={t}
                  hasError={!!fieldErr.operador_escopo}
                />
                {fieldErr.operador_escopo ? (
                  <div style={{ color: "#e84025", fontSize: 11, marginTop: 4 }}>{fieldErr.operador_escopo}</div>
                ) : null}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={salvando}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: "transparent",
                  color: t.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={() => void persistir("salvar")}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                }}
              >
                {salvando ? "Salvando…" : "Salvar rascunho"}
              </button>
              {mostrarEnviarAprovacao ? (
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void persistir("aprovacao")}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 10%, transparent)",
                    color: t.text,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                  }}
                >
                  {salvando ? "Enviando…" : "Enviar para aprovação"}
                </button>
              ) : null}
              {mostrarPublicar ? (
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void persistir("publicar")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: ctaGradientInformativos(brand),
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {salvando ? (
                    <>
                      <Loader2 size={14} color="#fff" className="app-lucide-spin" aria-hidden />
                      Publicando…
                    </>
                  ) : (
                    "Publicar"
                  )}
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </ModalBase>
  );
}
