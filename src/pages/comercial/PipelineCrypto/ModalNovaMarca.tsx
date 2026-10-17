import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { getCtaCriarGradient } from "../../../lib/ctaCriarStyles";
import { formatCnpj, normalizarDominio } from "./mapRow";

export function ModalNovaMarca({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const razaoRef = useRef<HTMLInputElement>(null);
  const [razao, setRazao] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [marca, setMarca] = useState("");
  const [dominio, setDominio] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [marcaCriadaId, setMarcaCriadaId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => razaoRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, []);

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
  };

  async function salvar() {
    const nomeMarca = marca.trim();
    const dominioOk = normalizarDominio(dominio);
    const nomeContato = nome.trim();
    const tel = telefone.trim();
    const cnpjTrim = cnpj.trim();
    if (!nomeMarca) {
      setErr("Marca é obrigatória.");
      return;
    }
    if (!dominio.trim()) {
      setErr("Domínio é obrigatório.");
      return;
    }
    if (!dominioOk) {
      setErr("Informe um domínio válido.");
      return;
    }
    if (!nomeContato) {
      setErr("Nome do contato é obrigatório.");
      return;
    }
    if (!tel) {
      setErr("Telefone é obrigatório.");
      return;
    }
    if (cnpjTrim && !formatCnpj(cnpjTrim)) {
      setErr("CNPJ deve ter 14 dígitos.");
      return;
    }

    setSalvando(true);
    setErr(null);

    let marcaId = marcaCriadaId;

    if (!marcaId) {
      let empresaId: string | null = null;
      let razaoGravar: string | null = razao.trim() || null;
      let cnpjGravar: string | null = cnpjTrim ? formatCnpj(cnpjTrim) : null;

      if (cnpjGravar) {
        const { data: empresa, error: empErr } = await supabase
          .from("comercial_empresas")
          .select("id, razao_social")
          .eq("cnpj", cnpjGravar)
          .maybeSingle();
        if (empErr) {
          console.error(empErr);
          setSalvando(false);
          setErr("Não foi possível consultar o CNPJ. Se o problema persistir, entre em contato com o suporte.");
          return;
        }
        if (empresa?.id) {
          empresaId = String(empresa.id);
          razaoGravar = null;
          cnpjGravar = null;
        }
      }

      const { data: criada, error: insErr } = await supabase
        .from("comercial_crypto_marcas")
        .insert({
          empresa_id: empresaId,
          razao_social: razaoGravar,
          cnpj: cnpjGravar,
          nome: nomeMarca,
          dominio: dominioOk,
          status_dominio: "inativo",
          status_pipeline: "disponiveis",
          status_folha: "sem_contato",
          origem: "manual",
        })
        .select("id")
        .single();

      if (insErr || !criada?.id) {
        console.error(insErr);
        setSalvando(false);
        setErr("Não foi possível criar a marca. Se o problema persistir, entre em contato com o suporte.");
        return;
      }
      marcaId = String(criada.id);
      setMarcaCriadaId(marcaId);
    }

    const { error: contErr } = await supabase.from("comercial_crypto_contatos").insert({
      marca_id: marcaId,
      nome: nomeContato,
      telefones: [{ iso: "BR", ddi: "+55", numero: tel }],
      emails: email.trim() ? [email.trim()] : [],
      ordem: 0,
    });

    setSalvando(false);
    if (contErr) {
      console.error(contErr);
      setErr("A marca foi criada, mas o contato não foi salvo. Tente salvar de novo.");
      onSaved();
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <ModalBase onClose={onClose} maxWidth={560} zIndex={1000}>
      <ModalHeader title="Nova Marca" onClose={onClose} />
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT.body, color: t.text }}>
          Razão Social
          <input
            ref={razaoRef}
            value={razao}
            onChange={(e) => setRazao(e.target.value)}
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT.body, color: t.text }}>
          CNPJ
          <input
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            inputMode="numeric"
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT.body, color: t.text }}>
          Marca <CampoObrigatorioMark />
          <input
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT.body, color: t.text }}>
          Domínio <CampoObrigatorioMark />
          <input
            value={dominio}
            onChange={(e) => setDominio(e.target.value)}
            placeholder="https://"
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </label>
        <div
          style={{
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: 12,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: FONT.body, color: t.text }}>Contato</div>
          <label style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT.body, color: t.text }}>
            Nome <CampoObrigatorioMark />
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={{ ...inputStyle, marginTop: 6 }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT.body, color: t.text }}>
            Telefone <CampoObrigatorioMark />
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              style={{ ...inputStyle, marginTop: 6 }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT.body, color: t.text }}>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...inputStyle, marginTop: 6 }}
            />
          </label>
        </div>
        {err ? (
          <p role="alert" style={{ margin: 0, fontSize: 13, color: "#e84025", fontFamily: FONT.body }}>
            {err}
          </p>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: `1px solid ${t.cardBorder}`,
              background: "transparent",
              color: t.text,
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={() => void salvar()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: getCtaCriarGradient(brand),
              color: "#fff",
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
              cursor: salvando ? "wait" : "pointer",
            }}
          >
            {salvando ? <Loader2 size={14} className="app-lucide-spin" aria-hidden /> : null}
            Salvar
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
