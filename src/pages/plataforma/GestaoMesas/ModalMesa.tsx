import { useEffect, useId, useState } from "react";
import { AlertCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT, BRAND_SEMANTIC as BRAND } from "../../../constants/theme";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { SalvarCtaContent } from "../GestaoUsuarios/gestaoUsuariosUi";
import { ctaGradientSalvar } from "../GestaoUsuarios/gestaoUsuariosHelpers";
import type { Role } from "../../../types";
import { ROLES_STAFF_OPERACOES_LIVES } from "../../../lib/staffRoles";
import { TIPOS_JOGO, tipoJogoInitial, type MesaSpinCadastroRow } from "./gestaoMesasUi";

const ERRO_SALVAR_MESA = "Não foi possível salvar a mesa. Verifique os dados e tente novamente.";
const ERRO_MESA_DUPLICADA =
  "Já existe uma mesa com este ID Spin ou ID da operadora para esta operadora.";

export function ModalMesa({
  editando,
  onClose,
  onSalvo,
}: {
  editando: MesaSpinCadastroRow | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const { theme: t, user } = useApp();
  const dashBrand = useDashboardBrand();
  const userRole = user?.role ?? null;
  const baseId = useId();
  const ini = tipoJogoInitial(editando);
  const [operadoras, setOperadoras] = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraSlug, setOperadoraSlug] = useState(editando?.operadora_slug ?? "");
  const [nomeMesa, setNomeMesa] = useState(editando?.nome_mesa ?? "");
  const [tipoJogo, setTipoJogo] = useState(ini.preset);
  const [tipoJogoOutro, setTipoJogoOutro] = useState(ini.outro);
  const [numeroMesa, setNumeroMesa] = useState(editando?.numero_mesa ?? "");
  const [mesaIdentificacao, setMesaIdentificacao] = useState(editando?.mesa_identificacao ?? "");
  const [mesaIdentificacaoOperadora, setMesaIdentificacaoOperadora] = useState(
    editando?.mesa_identificacao_operadora ?? "",
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("operadoras")
      .select("slug, nome")
      .order("nome")
      .then(({ data }) => {
        if (!cancelled) setOperadoras(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tipoJogoEfetivo = tipoJogo === "Outro" ? tipoJogoOutro.trim() : tipoJogo;

  const salvar = async () => {
    setErro(null);
    if (!operadoraSlug.trim()) {
      setErro("Selecione a operadora.");
      return;
    }
    if (!nomeMesa.trim()) {
      setErro("Informe o nome da mesa.");
      return;
    }
    if (!tipoJogoEfetivo) {
      setErro("Informe o tipo de jogo.");
      return;
    }
    if (!numeroMesa.trim()) {
      setErro("Informe o número da mesa.");
      return;
    }
    if (!mesaIdentificacao.trim()) {
      setErro("Informe o ID interno Spin da mesa.");
      return;
    }
    if (!mesaIdentificacaoOperadora.trim()) {
      setErro("Informe o ID da mesa no catálogo da operadora.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        operadora_slug: operadoraSlug.trim(),
        nome_mesa: nomeMesa.trim(),
        tipo_jogo: tipoJogoEfetivo,
        numero_mesa: numeroMesa.trim(),
        mesa_identificacao: mesaIdentificacao.trim(),
        mesa_identificacao_operadora: mesaIdentificacaoOperadora.trim(),
      };
      if (editando) {
        const { error } = await supabase.from("mesas_spin_cadastro").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mesas_spin_cadastro").insert(payload);
        if (error) throw error;
      }
      onSalvo();
      onClose();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "";
      if (msg.includes("duplicate") || msg.includes("ux_mesas")) {
        setErro(ERRO_MESA_DUPLICADA);
      } else {
        console.error(e);
        setErro(ERRO_SALVAR_MESA);
      }
    } finally {
      setSalvando(false);
    }
  };

  const tryClose = () => {
    if (!salvando) onClose();
  };

  const desabilitaOperadora =
    Boolean(editando) && (!userRole || !ROLES_STAFF_OPERACOES_LIVES.includes(userRole as Role));

  return (
    <ModalBase maxWidth={480} onClose={tryClose}>
      <ModalHeader title={editando ? "Editar mesa" : "Nova mesa"} onClose={tryClose} />
      {erro && (
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
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} color="#e84025" aria-hidden />
          {erro}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label htmlFor={`${baseId}-op`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Operadora
            <CampoObrigatorioMark />
          </label>
          <select
            id={`${baseId}-op`}
            aria-label="Operadora (obrigatório)"
            value={operadoraSlug}
            disabled={desabilitaOperadora}
            onChange={(e) => setOperadoraSlug(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: desabilitaOperadora ? t.cardBg : t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          >
            <option value="">Selecione…</option>
            {operadoras.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${baseId}-nome`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Nome da mesa
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-nome`}
            type="text"
            value={nomeMesa}
            onChange={(e) => setNomeMesa(e.target.value)}
            placeholder="Ex.: Blackjack VIP"
            aria-label="Nome da mesa (obrigatório)"
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          />
        </div>
        <div>
          <label htmlFor={`${baseId}-tipo`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Tipo de jogo
            <CampoObrigatorioMark />
          </label>
          <select
            id={`${baseId}-tipo`}
            aria-label="Tipo de jogo (obrigatório)"
            value={(TIPOS_JOGO as readonly string[]).includes(tipoJogo) ? tipoJogo : "Outro"}
            onChange={(e) => setTipoJogo(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          >
            {TIPOS_JOGO.map((tj) => (
              <option key={tj} value={tj}>
                {tj}
              </option>
            ))}
          </select>
          {tipoJogo === "Outro" && (
            <>
              <label htmlFor={`${baseId}-tipo-outro`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginTop: 10, marginBottom: 6 }}>
                Especificar tipo
                <CampoObrigatorioMark />
              </label>
              <input
                id={`${baseId}-tipo-outro`}
                type="text"
                value={tipoJogoOutro}
                onChange={(e) => {
                  setTipoJogoOutro(e.target.value);
                }}
                placeholder="Descreva o tipo de jogo"
                aria-label="Especificar tipo de jogo (obrigatório)"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontFamily: FONT.body,
                  fontSize: 13,
                }}
              />
            </>
          )}
        </div>
        <div>
          <label htmlFor={`${baseId}-num`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Número da mesa
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-num`}
            type="text"
            value={numeroMesa}
            onChange={(e) => setNumeroMesa(e.target.value)}
            placeholder="Ex.: 01"
            aria-label="Número da mesa (obrigatório)"
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          />
        </div>
        <div>
          <label htmlFor={`${baseId}-id`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            ID interno Spin
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-id`}
            type="text"
            value={mesaIdentificacao}
            onChange={(e) => setMesaIdentificacao(e.target.value)}
            disabled={Boolean(editando)}
            placeholder="Identificador Spin (estúdio)"
            aria-label="ID interno Spin (obrigatório)"
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: editando ? t.cardBg : t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          />
          {editando && (
            <p style={{ margin: "8px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body, lineHeight: 1.4 }}>
              O ID Spin não pode ser alterado. Exclua e crie novamente se estiver incorreto.
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${baseId}-id-op`} style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            ID na operadora
            <CampoObrigatorioMark />
          </label>
          <input
            id={`${baseId}-id-op`}
            type="text"
            value={mesaIdentificacaoOperadora}
            onChange={(e) => setMesaIdentificacaoOperadora(e.target.value)}
            placeholder="Ex.: 500617 (game id na Blaze)"
            aria-label="ID da mesa no catálogo da operadora (obrigatório)"
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: t.inputBg,
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <button
          type="button"
          onClick={tryClose}
          disabled={salvando}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: "transparent",
            color: t.text,
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 600,
            cursor: salvando ? "not-allowed" : "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={salvando}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 20px",
            borderRadius: 10,
            border: "none",
            background: ctaGradientSalvar(dashBrand, salvando, BRAND.cinza),
            color: "#fff",
            fontFamily: FONT.body,
            fontSize: 13,
            fontWeight: 700,
            cursor: salvando ? "not-allowed" : "pointer",
            opacity: salvando ? 0.85 : 1,
          }}
        >
          <SalvarCtaContent salvando={salvando} label={editando ? "Salvar" : "Cadastrar"} labelSalvando="Salvando…" />
        </button>
      </div>
    </ModalBase>
  );
}
