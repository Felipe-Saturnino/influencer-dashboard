import { useState, useCallback } from "react";
import { Copy, Loader2, Info } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { FONT, BASE_COLORS } from "../../constants/theme";
import { CampoObrigatorioMark } from "../../components/CampoObrigatorioMark";
import {
  TIPOS_DENUNCIA,
  STORAGE_BUCKET,
  sanitizeStorageFileName,
  arquivoCanalDenunciaPermitido,
  CANAL_DENUNCIA_ANEXO_ACCEPT,
  CANAL_DENUNCIA_ANEXO_MAX_COUNT,
  MSG_CANAL_RATE_LIMITED,
  MSG_CANAL_ANEXO_FALHA_ENVIO,
  emailCanalDenunciaValido,
  mapComConcurrency,
  type TipoDenunciaKey,
} from "../../lib/canalDenunciasSpin";
import { CampoUploadArquivos } from "../../components/CampoUploadArquivos";
import { formatarTelefoneBr } from "../../lib/rhFuncionarioValidators";
import {
  UPLOAD_CONCURRENCY,
  PANEL_BOX_STYLE,
  UPLOAD_THEME,
  inp,
  alertBox,
} from "./canalDenunciasPublicUi";
import { Campo } from "./canalDenunciasPublicFields";

type Props = {
  onIrParaConsultar: (protocolo: string) => void;
};

export function CanalDenunciarPanel({ onIrParaConsultar }: Props) {
  const [desejaIdentificar, setDesejaIdentificar] = useState<"sim" | "nao" | "">("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [tiposSel, setTiposSel] = useState<Set<TipoDenunciaKey>>(new Set());
  const [outroTexto, setOutroTexto] = useState("");
  const [relato, setRelato] = useState("");
  const [arquivosEnvio, setArquivosEnvio] = useState<{ id: string; file: File }[]>([]);
  const [honeypot, setHoneypot] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [protocoloOk, setProtocoloOk] = useState<string | null>(null);
  const [avisoAnexoEnvio, setAvisoAnexoEnvio] = useState<string | null>(null);
  const [protocoloCopiado, setProtocoloCopiado] = useState(false);

  const toggleTipo = useCallback((k: TipoDenunciaKey) => {
    setTiposSel((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }, []);

  async function handleEnviar() {
    setErroEnvio(null);
    if (desejaIdentificar === "") return setErroEnvio("Indique se deseja se identificar.");
    if (desejaIdentificar === "sim") {
      if (!nome.trim()) return setErroEnvio("Informe o nome.");
      if (!email.trim()) return setErroEnvio("Informe o e-mail.");
      if (!emailCanalDenunciaValido(email)) return setErroEnvio("E-mail inválido.");
      if (!telefone.trim()) return setErroEnvio("Informe o telefone.");
    }
    if (tiposSel.size === 0) return setErroEnvio("Selecione ao menos um tipo de relato.");
    if (tiposSel.has("outro") && !outroTexto.trim()) return setErroEnvio("Descreva o motivo em «Outro».");
    if (!relato.trim()) return setErroEnvio("Preencha o relato do ocorrido.");
    if (arquivosEnvio.length > CANAL_DENUNCIA_ANEXO_MAX_COUNT) {
      return setErroEnvio(`No máximo ${CANAL_DENUNCIA_ANEXO_MAX_COUNT} anexos por envio.`);
    }

    for (const nf of arquivosEnvio) {
      if (!arquivoCanalDenunciaPermitido(nf.file)) {
        return setErroEnvio("Anexe apenas PDF, JPG, PNG ou MP4, com no máximo 20MB por arquivo.");
      }
    }

    setEnviando(true);
    setAvisoAnexoEnvio(null);
    setProtocoloCopiado(false);
    try {
      const tiposArr = [...tiposSel];
      const { data: rpcData, error: rpcErr } = await supabase.rpc("registrar_denuncia_spin", {
        p_deseja_identificar: desejaIdentificar === "sim",
        p_nome: desejaIdentificar === "sim" ? nome.trim() : null,
        p_telefone: desejaIdentificar === "sim" ? telefone.trim() : null,
        p_email: desejaIdentificar === "sim" ? email.trim().toLowerCase() : null,
        p_tipos_denuncia: tiposArr,
        p_tipo_outro_descricao: tiposSel.has("outro") ? outroTexto.trim() : null,
        p_relato: relato.trim(),
        p_hp: honeypot,
      });
      if (rpcErr) {
        setErroEnvio("Não foi possível registrar a denúncia. Tente novamente.");
        return;
      }
      const ins = rpcData as { ok?: boolean; id?: string; protocolo?: string; error?: string } | null;
      if (!ins?.ok || !ins.id || !ins.protocolo) {
        const code = ins?.error;
        const msg =
          code === "rate_limited"
            ? MSG_CANAL_RATE_LIMITED
            : code === "identificacao_incompleta"
              ? "Preencha nome, e-mail e telefone para se identificar."
              : code === "email_invalido"
                ? "E-mail inválido."
                : code === "outro_sem_descricao"
                  ? "Descreva o motivo em «Outro»."
                  : code === "tipos_vazio"
                    ? "Selecione ao menos um tipo de relato."
                    : code === "relato_vazio"
                      ? "Preencha o relato do ocorrido."
                      : code === "tipo_invalido"
                        ? "Tipo de relato inválido. Atualize a página e tente novamente."
                        : "Não foi possível registrar a denúncia. Tente novamente.";
        setErroEnvio(msg);
        return;
      }

      const falhaAnexo = await mapComConcurrency(arquivosEnvio, UPLOAD_CONCURRENCY, async (nf, i) => {
        const f = nf.file;
        const safe = sanitizeStorageFileName(f.name);
        const path = `${ins.id}/${Date.now()}_${i}_${safe}`;
        const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, f, {
          contentType: f.type || undefined,
          upsert: false,
        });
        if (upErr) return false;
        const { error: insAnexoErr } = await supabase.from("canal_denuncia_anexos").insert({
          denuncia_id: ins.id,
          anotacao_id: null,
          storage_path: path,
          file_name: f.name,
          content_type: f.type || null,
          file_size: f.size,
        });
        return !insAnexoErr;
      });

      if (falhaAnexo) setAvisoAnexoEnvio(MSG_CANAL_ANEXO_FALHA_ENVIO);
      setProtocoloOk(ins.protocolo);
    } catch {
      setErroEnvio("Erro inesperado. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleCopiarProtocolo() {
    if (!protocoloOk) return;
    try {
      await navigator.clipboard.writeText(protocoloOk);
      setProtocoloCopiado(true);
      window.setTimeout(() => setProtocoloCopiado(false), 2500);
    } catch {
      setProtocoloCopiado(false);
    }
  }

  function adicionarAnexosEnvio(files: File[]) {
    const ok = files.filter((f) => arquivoCanalDenunciaPermitido(f));
    if (ok.length < files.length) {
      setErroEnvio("Anexe apenas PDF, JPG, PNG ou MP4, com no máximo 20MB por arquivo.");
    }
    if (ok.length === 0) return;
    setArquivosEnvio((prev) => {
      const room = CANAL_DENUNCIA_ANEXO_MAX_COUNT - prev.length;
      if (room <= 0) {
        setErroEnvio(`No máximo ${CANAL_DENUNCIA_ANEXO_MAX_COUNT} anexos por envio.`);
        return prev;
      }
      if (ok.length > room) {
        setErroEnvio(`No máximo ${CANAL_DENUNCIA_ANEXO_MAX_COUNT} anexos por envio.`);
      }
      return [...prev, ...ok.slice(0, room).map((file) => ({ id: crypto.randomUUID(), file }))];
    });
  }

  return (
    <div role="tabpanel" id="panel-canal-denunciar" aria-labelledby="tab-canal-denunciar" style={PANEL_BOX_STYLE}>
      {protocoloOk ? (
        <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
          <p style={{ fontSize: 15, color: "#fff", fontWeight: 600, marginBottom: 12 }}>
            Obrigado. Sua denúncia foi registrada com sucesso.
          </p>
          <p style={{ fontSize: 14, color: "#c4b5d4", lineHeight: 1.6, marginBottom: 16 }}>
            A denúncia será apurada com o devido cuidado e, quando aplicável, serão adotadas as medidas cabíveis.
          </p>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--brand-icon, #70cae4)",
              marginBottom: 12,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Protocolo: {protocoloOk}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => void handleCopiarProtocolo()}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid rgba(112,202,228,0.45)",
                background: "rgba(112,202,228,0.12)",
                color: "#e5dce1",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: FONT.body,
              }}
            >
              <Copy size={15} aria-hidden />
              {protocoloCopiado ? "Protocolo copiado" : "Copiar protocolo"}
            </button>
          </div>
          <p style={{ fontSize: 13, color: "#a89bc4", lineHeight: 1.55, maxWidth: 420, margin: "0 auto 20px" }}>
            Guarde este protocolo. Na aba «Consultar denúncia», informe o número
            {desejaIdentificar === "sim" ? " e o mesmo e-mail usado no envio" : ""} para acompanhar a tratativa.
          </p>
          {avisoAnexoEnvio ? (
            <div role="alert" style={{ ...alertBox, margin: "0 auto 20px", maxWidth: 480, textAlign: "left" }}>
              <p style={{ margin: "0 0 10px" }}>{avisoAnexoEnvio}</p>
              <button
                type="button"
                onClick={() => onIrParaConsultar(protocoloOk)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(245,158,11,0.45)",
                  background: "rgba(245,158,11,0.12)",
                  color: "#fbbf24",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                }}
              >
                Ir para Consultar
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setProtocoloOk(null);
              setAvisoAnexoEnvio(null);
              setProtocoloCopiado(false);
              setDesejaIdentificar("");
              setNome("");
              setTelefone("");
              setEmail("");
              setTiposSel(new Set());
              setOutroTexto("");
              setRelato("");
              setArquivosEnvio([]);
              setHoneypot("");
            }}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: FONT.body,
            }}
          >
            Registrar nova denúncia
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
              Deseja se identificar? <CampoObrigatorioMark />
            </span>
            <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input
                  type="radio"
                  name="ident"
                  checked={desejaIdentificar === "sim"}
                  onChange={() => setDesejaIdentificar("sim")}
                />
                Sim
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input
                  type="radio"
                  name="ident"
                  checked={desejaIdentificar === "nao"}
                  onChange={() => setDesejaIdentificar("nao")}
                />
                Não
              </label>
            </div>
          </div>

          {desejaIdentificar === "sim" ? (
            <>
              <Campo label="Nome" obrigatorio htmlFor="canal-denuncia-nome">
                <input
                  id="canal-denuncia-nome"
                  className="app-public-form-input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoComplete="name"
                  aria-label="Nome"
                  style={inp}
                />
              </Campo>
              <Campo label="Telefone" obrigatorio htmlFor="canal-denuncia-telefone">
                <input
                  id="canal-denuncia-telefone"
                  className="app-public-form-input"
                  type="tel"
                  inputMode="numeric"
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefoneBr(e.target.value))}
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                  aria-label="Telefone"
                  style={inp}
                />
              </Campo>
              <Campo label="E-mail" obrigatorio htmlFor="canal-denuncia-email">
                <input
                  id="canal-denuncia-email"
                  className="app-public-form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  aria-label="E-mail"
                  style={inp}
                />
              </Campo>
            </>
          ) : null}

          <div aria-hidden style={{ position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" }}>
            <label htmlFor="canal-denuncia-empresa">Empresa</label>
            <input
              id="canal-denuncia-empresa"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
              O que você gostaria de relatar? <CampoObrigatorioMark />
            </span>
            <p style={{ fontSize: 12, color: "#9b8ab8", margin: "8px 0 10px" }}>Pode marcar mais de uma opção.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {TIPOS_DENUNCIA.map((t) => (
                <label
                  key={t.key}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    cursor: "pointer",
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={tiposSel.has(t.key)}
                    onChange={() => toggleTipo(t.key)}
                    style={{ marginTop: 5, flexShrink: 0 }}
                  />
                  <span>
                    <span style={{ fontWeight: 700, color: "#fff", display: "block" }}>{t.titulo}</span>
                    {t.detalhe ? (
                      <span style={{ display: "block", fontStyle: "italic", color: "#b8a6d4", fontSize: 12, marginTop: 2 }}>
                        {t.detalhe}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
            {tiposSel.has("outro") ? (
              <textarea
                className="app-public-form-input"
                value={outroTexto}
                onChange={(e) => setOutroTexto(e.target.value)}
                placeholder="Descreva o motivo do relato"
                rows={3}
                style={{ ...inp, marginTop: 12, resize: "vertical" }}
              />
            ) : null}
          </div>

          <Campo
            label="Relate o ocorrido"
            obrigatorio
            legenda="Descreva o que aconteceu, quando, onde e quem estava envolvido. Quanto mais detalhes, melhor a apuração."
          >
            <textarea
              className="app-public-form-input"
              value={relato}
              onChange={(e) => setRelato(e.target.value)}
              placeholder="Descreva os fatos com o máximo de detalhes possível…"
              rows={8}
              style={{ ...inp, resize: "vertical", minHeight: 140 }}
            />
          </Campo>

          <div style={{ marginBottom: 20 }}>
            <CampoUploadArquivos
              id="canal-denuncia-anexos"
              label="Anexo"
              buttonLabel="Adicionar anexo"
              accept={CANAL_DENUNCIA_ANEXO_ACCEPT}
              multiple
              items={arquivosEnvio.map((nf) => ({
                key: nf.id,
                label: nf.file.name,
                pendente: true,
              }))}
              onAdd={adicionarAnexosEnvio}
              onRemove={(key) => setArquivosEnvio((prev) => prev.filter((nf) => nf.id !== key))}
              disabled={enviando}
              t={UPLOAD_THEME}
              hint={`PDF, JPG, PNG ou MP4 · até 20MB · máx. ${CANAL_DENUNCIA_ANEXO_MAX_COUNT} arquivos`}
              pendingHint="Anexos serão enviados junto com a denúncia."
            />
          </div>

          {erroEnvio ? (
            <div role="alert" style={{ ...alertBox, marginBottom: 16 }}>
              {erroEnvio}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(112,202,228,0.35)",
              background: "rgba(112,202,228,0.08)",
              marginBottom: 16,
            }}
          >
            <Info size={20} color="var(--brand-icon, #70cae4)" aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 13, color: "#d4c4e8", lineHeight: 1.55 }}>
              Após o envio, você receberá um protocolo. Guarde-o. Se se identificar, use também o mesmo e-mail na aba
              «Consultar denúncia».
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleEnviar()}
            disabled={enviando}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
              cursor: enviando ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              fontFamily: FONT.body,
            }}
          >
            {enviando ? (
              <>
                <Loader2 className="app-lucide-spin" size={20} color="#fff" aria-hidden />
                Enviando…
              </>
            ) : (
              "Enviar"
            )}
          </button>
        </>
      )}
    </div>
  );
}
