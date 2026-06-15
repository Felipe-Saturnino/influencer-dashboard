import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { BtnExcluirComTexto } from "../../../components/BtnExcluirComTexto";
import { ModalBase, ModalHeader, ModalConfirmExcluirPadrao } from "../../../components/OperacoesModal";
import { descricaoBotaoExcluir, descricaoModalExcluirItem } from "../../../lib/excluirItemUi";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import type { ComercialContato, PipelineMarcaRow, TelefoneContato } from "./types";

const DDI_OPCOES = [
  { iso: "BR", label: "Brasil", ddi: "+55" },
  { iso: "US", label: "Estados Unidos", ddi: "+1" },
  { iso: "PT", label: "Portugal", ddi: "+351" },
  { iso: "AR", label: "Argentina", ddi: "+54" },
  { iso: "MX", label: "México", ddi: "+52" },
  { iso: "GB", label: "Reino Unido", ddi: "+44" },
];

function emptyTelefone(): TelefoneContato {
  return { iso: "BR", ddi: "+55", numero: "" };
}

export function ModalContato({
  mode,
  marca,
  contato,
  onClose,
  onSaved,
  canEditar,
}: {
  mode: "edit" | "add";
  marca: PipelineMarcaRow;
  contato?: ComercialContato;
  onClose: () => void;
  onSaved: () => void;
  canEditar: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const readonly = !canEditar;

  const [nome, setNome] = useState(contato?.nome ?? "");
  const [telefones, setTelefones] = useState<TelefoneContato[]>(
    contato?.telefones?.length ? contato.telefones : [emptyTelefone()],
  );
  const [emails, setEmails] = useState<string[]>(contato?.emails?.length ? contato.emails : [""]);
  const [linkedin, setLinkedin] = useState(contato?.linkedin ?? "");
  const [instagram, setInstagram] = useState(contato?.instagram ?? "");
  const [dataNascimento, setDataNascimento] = useState(contato?.data_nascimento ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [alvoExcluir, setAlvoExcluir] = useState(false);

  useEffect(() => {
    if (mode === "edit" && contato) {
      setNome(contato.nome);
      setTelefones(contato.telefones.length ? contato.telefones : [emptyTelefone()]);
      setEmails(contato.emails.length ? contato.emails : [""]);
      setLinkedin(contato.linkedin ?? "");
      setInstagram(contato.instagram ?? "");
      setDataNascimento(contato.data_nascimento ?? "");
    }
  }, [mode, contato]);

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: readonly ? t.cardBg : t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
  };

  async function salvar() {
    if (readonly) {
      onClose();
      return;
    }
    const trimmed = nome.trim();
    if (!trimmed) {
      setErr("Nome é obrigatório.");
      return;
    }
    setSalvando(true);
    setErr(null);
    const payload = {
      nome: trimmed,
      telefones: telefones.filter((tel) => tel.numero.trim()),
      emails: emails.map((e) => e.trim()).filter(Boolean),
      linkedin: linkedin.trim() || null,
      instagram: instagram.trim() || null,
      data_nascimento: dataNascimento || null,
    };

    if (mode === "add") {
      const ordem = marca.contatos.length;
      const { error } = await supabase.from("comercial_marca_contatos").insert({
        marca_id: marca.id,
        ordem,
        ...payload,
      });
      setSalvando(false);
      if (error) {
        console.error(error);
        setErr("Não foi possível salvar o contato. Se o problema persistir, entre em contato com o suporte.");
        return;
      }
    } else if (contato) {
      const { error } = await supabase.from("comercial_marca_contatos").update(payload).eq("id", contato.id);
      setSalvando(false);
      if (error) {
        console.error(error);
        setErr("Não foi possível salvar o contato. Se o problema persistir, entre em contato com o suporte.");
        return;
      }
    }
    onSaved();
    onClose();
  }

  async function confirmarExclusao() {
    if (!contato || readonly) return;
    setSalvando(true);
    const { error } = await supabase.from("comercial_marca_contatos").delete().eq("id", contato.id);
    setSalvando(false);
    setAlvoExcluir(false);
    if (error) {
      console.error(error);
      setErr("Não foi possível excluir o contato. Se o problema persistir, entre em contato com o suporte.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <>
      <ModalBase onClose={onClose} maxWidth={560} zIndex={1000}>
        <ModalHeader
          title={mode === "add" ? "Adicionar Contato" : contato?.nome ?? "Contato"}
          onClose={onClose}
        />
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 13,
            color: t.textMuted,
            fontFamily: FONT.body,
            lineHeight: 1.45,
          }}
        >
          {marca.nome} · {marca.empresa.razao_social}
        </p>
        {readonly && mode === "edit" ? (
          <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 12, fontFamily: FONT.body }}>
            Campos bloqueados — perfil sem permissão de Editar.
          </p>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label htmlFor="contatoNome" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body, color: t.text }}>
              Nome
              {!readonly ? <CampoObrigatorioMark /> : null}
            </label>
            <input
              id="contatoNome"
              type="text"
              value={nome}
              disabled={readonly}
              onChange={(e) => {
                setNome(e.target.value);
                if (err) setErr(null);
              }}
              style={inputStyle}
              autoComplete="name"
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body, color: t.text }}>Telefone</div>
            {telefones.map((tel, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <select
                  aria-label="DDI do país"
                  disabled={readonly}
                  value={tel.iso}
                  onChange={(e) => {
                    const opt = DDI_OPCOES.find((d) => d.iso === e.target.value) ?? DDI_OPCOES[0];
                    const next = [...telefones];
                    next[idx] = { ...next[idx], iso: opt.iso, ddi: opt.ddi };
                    setTelefones(next);
                  }}
                  style={{ ...inputStyle, width: 120, flexShrink: 0 }}
                >
                  {DDI_OPCOES.map((d) => (
                    <option key={d.iso} value={d.iso}>
                      {d.ddi} {d.label}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  aria-label="Número de telefone"
                  disabled={readonly}
                  value={tel.numero}
                  onChange={(e) => {
                    const next = [...telefones];
                    next[idx] = { ...next[idx], numero: e.target.value };
                    setTelefones(next);
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            ))}
            {!readonly ? (
              <button
                type="button"
                onClick={() => setTelefones([...telefones, emptyTelefone()])}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  border: "none",
                  background: "transparent",
                  color: "var(--brand-accent, #1e36f8)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                }}
              >
                <Plus size={12} aria-hidden /> Adicionar telefone
              </button>
            ) : null}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body, color: t.text }}>E-mail</div>
            {emails.map((em, idx) => (
              <input
                key={idx}
                type="email"
                disabled={readonly}
                value={em}
                onChange={(e) => {
                  const next = [...emails];
                  next[idx] = e.target.value;
                  setEmails(next);
                }}
                style={{ ...inputStyle, marginBottom: 8 }}
              />
            ))}
            {!readonly ? (
              <button
                type="button"
                onClick={() => setEmails([...emails, ""])}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  border: "none",
                  background: "transparent",
                  color: "var(--brand-accent, #1e36f8)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                }}
              >
                <Plus size={12} aria-hidden /> Adicionar e-mail
              </button>
            ) : null}
          </div>
          <div>
            <label htmlFor="contatoLinkedin" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body, color: t.text }}>
              LinkedIn
            </label>
            <input id="contatoLinkedin" type="url" disabled={readonly} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." style={inputStyle} />
          </div>
          <div>
            <label htmlFor="contatoInstagram" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body, color: t.text }}>
              Instagram
            </label>
            <input id="contatoInstagram" type="text" disabled={readonly} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@usuario" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="contatoAniversario" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: FONT.body, color: t.text }}>
              Data de Nascimento
            </label>
            <input id="contatoAniversario" type="date" disabled={readonly} value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} style={inputStyle} />
          </div>
        </div>
        {err ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 12, marginTop: 12, fontFamily: FONT.body }}>
            {err}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            justifyContent: mode === "edit" && canEditar ? "space-between" : "flex-end",
            alignItems: "center",
            marginTop: 20,
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {mode === "edit" && contato && canEditar ? (
            <BtnExcluirComTexto
              descricaoItem={descricaoBotaoExcluir("contato", contato.nome)}
              onClick={() => setAlvoExcluir(true)}
            />
          ) : null}
          {(mode === "add" || canEditar) && !readonly ? (
            <button
              type="button"
              disabled={salvando}
              onClick={() => void salvar()}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                background: getCtaCriarGradient(brand),
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: salvando ? "wait" : "pointer",
                fontFamily: FONT.body,
              }}
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          ) : null}
        </div>
      </ModalBase>
      {alvoExcluir && contato ? (
        <ModalConfirmExcluirPadrao
          descricaoItem={descricaoModalExcluirItem("o contato", contato.nome)}
          onCancel={() => setAlvoExcluir(false)}
          onConfirm={() => void confirmarExclusao()}
          loading={salvando}
        />
      ) : null}
    </>
  );
}
