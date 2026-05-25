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
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import {
  diffEdicaoRascunho,
  registrarHistoricoEdicoesRascunho,
  registrarHistoricoStatus,
  sanitizeInformativoHtml,
  validarPublicarInformativo,
  type InformativoStatus,
  type SnapshotInformativoEdicao,
} from "../../../lib/informativosWorkflow";
import { INFORMATIVO_PERFIL_OPCOES } from "../../../lib/informativosRoles";

const ERRO_CARREGAR = "Não foi possível carregar o informativo para edição.";
const ERRO_SALVAR = "Não foi possível salvar o informativo. Se o problema persistir, contate o suporte.";

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
      status: InformativoStatus;
    };
    setAssunto(row.assunto);
    setDescricao(row.descricao);
    setPerfis((row.perfis ?? []) as Role[]);
    setStatusAtual(row.status);
    setSnapshotEdicao({
      assunto: row.assunto,
      descricao: row.descricao,
      perfis: [...(row.perfis ?? [])],
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

  function togglePerfil(role: Role) {
    setPerfis((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  const persistir = async (acao: "salvar" | "aprovacao" | "publicar") => {
    if (!user?.id) return;
    const novoStatus: InformativoStatus =
      acao === "salvar" ? "rascunho" : acao === "aprovacao" ? "aprovacao" : "publicado";

    if (acao === "publicar" || acao === "aprovacao") {
      const errs = validarPublicarInformativo({ assunto, descricao, perfis });
      setFieldErr(errs);
      if (Object.keys(errs).length > 0) return;
    } else {
      setFieldErr({});
    }

    setSalvando(true);
    setErro(null);
    const now = new Date().toISOString();
    const descricaoSan = sanitizeInformativoHtml(descricao);

    const basePayload = {
      assunto: assunto.trim() || "Rascunho",
      descricao: descricaoSan,
      perfis,
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

  return (
    <ModalBase open={open} onClose={onClose} maxWidth={640}>
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
              <div
                role="group"
                aria-label="Perfis que verão o informativo na Home"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 8,
                }}
              >
                {INFORMATIVO_PERFIL_OPCOES.map(({ value, label }) => {
                  const checked = perfis.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-label={label}
                      onClick={() => togglePerfil(value)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: `1px solid ${checked ? "var(--brand-primary, #7c3aed)" : t.cardBorder}`,
                        background: checked ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)" : t.inputBg,
                        color: t.text,
                        fontSize: 12,
                        fontWeight: checked ? 700 : 500,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: FONT.body,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {fieldErr.perfis ? (
                <div style={{ color: "#e84025", fontSize: 11, marginTop: 4 }}>{fieldErr.perfis}</div>
              ) : null}
            </div>

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
                Enviar para aprovação
              </button>
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
            </div>
          </>
        )}
      </div>
    </ModalBase>
  );
}
