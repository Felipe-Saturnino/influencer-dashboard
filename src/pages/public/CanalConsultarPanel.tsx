import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { FONT } from "../../constants/theme";
import { CampoObrigatorioMark } from "../../components/CampoObrigatorioMark";
import {
  STORAGE_BUCKET,
  sanitizeStorageFileName,
  labelAutorMensagemPublica,
  arquivoCanalDenunciaPermitido,
  CANAL_DENUNCIA_ANEXO_ACCEPT,
  CANAL_DENUNCIA_ANEXO_MAX_COUNT,
  MSG_CANAL_PROTOCOLO_NAO_ENCONTRADO,
  MSG_CANAL_PROTOCOLO_FORMATO,
  MSG_CANAL_RATE_LIMITED,
  MSG_CANAL_ANEXO_RH_SO_NOME,
  MSG_CANAL_TEXTO_INVALIDO,
  PROTOCOLO_CANAL_PLACEHOLDER,
  normalizarProtocoloCanal,
  isProtocoloCanalFormatoValido,
  mapComConcurrency,
  statusLabel,
  type DenunciaStatusDb,
} from "../../lib/canalDenunciasSpin";
import { CampoUploadArquivos } from "../../components/CampoUploadArquivos";
import {
  UPLOAD_CONCURRENCY,
  PANEL_BOX_STYLE,
  UPLOAD_THEME,
  fmtDataHora,
  inp,
  alertBox,
  type ConsultaPublicOk,
} from "./canalDenunciasPublicUi";
import { TimelineItem } from "./canalDenunciasPublicFields";

type Props = {
  protocoloInicial?: string;
};

export function CanalConsultarPanel({ protocoloInicial = "" }: Props) {
  const [protocoloConsulta, setProtocoloConsulta] = useState(protocoloInicial);
  const [emailConsulta, setEmailConsulta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [consultaErro, setConsultaErro] = useState<string | null>(null);
  const [consultaData, setConsultaData] = useState<ConsultaPublicOk | null>(null);
  const [respostaTexto, setRespostaTexto] = useState("");
  const [respostaFiles, setRespostaFiles] = useState<{ id: string; file: File }[]>([]);
  const [enviandoResposta, setEnviandoResposta] = useState(false);
  const [respostaErro, setRespostaErro] = useState<string | null>(null);
  const [respostaOk, setRespostaOk] = useState<string | null>(null);

  function emailConsultaRpc(): string | null {
    const e = emailConsulta.trim().toLowerCase();
    return e || null;
  }

  async function handleConsultar() {
    setConsultaErro(null);
    setConsultaData(null);
    setRespostaErro(null);
    setRespostaOk(null);
    setRespostaTexto("");
    setRespostaFiles([]);
    const p = normalizarProtocoloCanal(protocoloConsulta);
    if (!p) {
      setConsultaErro("Informe o protocolo.");
      return;
    }
    if (!isProtocoloCanalFormatoValido(p)) {
      setConsultaErro(MSG_CANAL_PROTOCOLO_FORMATO);
      return;
    }
    setConsultando(true);
    const { data, error } = await supabase.rpc("consultar_denuncia_spin", {
      p_protocolo: p,
      p_email: emailConsultaRpc(),
    });
    setConsultando(false);
    if (error) {
      setConsultaErro("Não foi possível consultar. Tente novamente.");
      return;
    }
    const j = data as { ok?: boolean; error?: string } | null;
    if (j?.error === "rate_limited") {
      setConsultaErro(MSG_CANAL_RATE_LIMITED);
      return;
    }
    if (!j?.ok || j.error === "not_found") {
      setConsultaErro(MSG_CANAL_PROTOCOLO_NAO_ENCONTRADO);
      return;
    }
    const ok = j as ConsultaPublicOk;
    setConsultaData({
      ...ok,
      mensagens: Array.isArray(ok.mensagens) ? ok.mensagens : [],
    });
  }

  async function handleEnviarResposta() {
    setRespostaErro(null);
    setRespostaOk(null);
    const p = normalizarProtocoloCanal(protocoloConsulta);
    const txt = respostaTexto.trim();
    if (!p) {
      setRespostaErro("Informe o protocolo.");
      return;
    }
    if (!isProtocoloCanalFormatoValido(p)) {
      setRespostaErro(MSG_CANAL_PROTOCOLO_FORMATO);
      return;
    }
    if (!txt) {
      setRespostaErro("Digite sua mensagem.");
      return;
    }
    if (txt.length > 8000) {
      setRespostaErro(MSG_CANAL_TEXTO_INVALIDO);
      return;
    }
    if (respostaFiles.length > CANAL_DENUNCIA_ANEXO_MAX_COUNT) {
      setRespostaErro(`No máximo ${CANAL_DENUNCIA_ANEXO_MAX_COUNT} anexos por mensagem.`);
      return;
    }
    for (const nf of respostaFiles) {
      if (!arquivoCanalDenunciaPermitido(nf.file)) {
        setRespostaErro("Anexe apenas PDF, JPG, PNG ou MP4, com no máximo 20MB por arquivo.");
        return;
      }
    }
    setEnviandoResposta(true);
    try {
      const { data, error } = await supabase.rpc("responder_denuncia_spin", {
        p_protocolo: p,
        p_texto: txt,
        p_email: emailConsultaRpc(),
      });
      if (error) {
        setRespostaErro("Não foi possível enviar a mensagem. Tente novamente.");
        return;
      }
      const res = data as { ok?: boolean; error?: string; id?: string; denuncia_id?: string } | null;
      if (!res?.ok) {
        if (res?.error === "rate_limited") {
          setRespostaErro(MSG_CANAL_RATE_LIMITED);
        } else if (res?.error === "closed") {
          setRespostaErro("Esta denúncia já foi encerrada. Não é possível enviar novas mensagens.");
        } else if (res?.error === "not_found") {
          setRespostaErro(MSG_CANAL_PROTOCOLO_NAO_ENCONTRADO);
        } else if (res?.error === "invalid_text") {
          setRespostaErro(MSG_CANAL_TEXTO_INVALIDO);
        } else {
          setRespostaErro("Não foi possível enviar a mensagem. Tente novamente.");
        }
        return;
      }
      const anotacaoId = res.id;
      const denunciaId = res.denuncia_id;
      let falhaAnexo = false;
      if (anotacaoId && denunciaId && respostaFiles.length > 0) {
        falhaAnexo = await mapComConcurrency(respostaFiles, UPLOAD_CONCURRENCY, async (nf, i) => {
          const f = nf.file;
          const safe = sanitizeStorageFileName(f.name);
          const path = `${denunciaId}/${anotacaoId}/${Date.now()}_${i}_${safe}`;
          const { error: upErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, f, { contentType: f.type || undefined });
          if (upErr) return false;
          const { error: insAnexoErr } = await supabase.from("canal_denuncia_anexos").insert({
            denuncia_id: denunciaId,
            anotacao_id: anotacaoId,
            storage_path: path,
            file_name: f.name,
            content_type: f.type || null,
            file_size: f.size,
          });
          return !insAnexoErr;
        });
      }
      setRespostaTexto("");
      setRespostaFiles([]);
      if (falhaAnexo) {
        setRespostaErro(
          "Mensagem enviada, mas um ou mais anexos não acompanharam. A equipe RH já pode ver o texto.",
        );
      } else {
        setRespostaOk("Mensagem enviada. A equipe RH receberá sua resposta.");
      }
      const { data: refreshed } = await supabase.rpc("consultar_denuncia_spin", {
        p_protocolo: p,
        p_email: emailConsultaRpc(),
      });
      const j = refreshed as ConsultaPublicOk | null;
      if (j?.ok) {
        setConsultaData({
          ...j,
          mensagens: Array.isArray(j.mensagens) ? j.mensagens : [],
        });
      }
    } catch {
      setRespostaErro("Não foi possível enviar a mensagem. Tente novamente.");
    } finally {
      setEnviandoResposta(false);
    }
  }

  function adicionarAnexosResposta(files: File[]) {
    const ok = files.filter((f) => arquivoCanalDenunciaPermitido(f));
    if (ok.length < files.length) {
      setRespostaErro("Anexe apenas PDF, JPG, PNG ou MP4, com no máximo 20MB por arquivo.");
    }
    if (ok.length === 0) return;
    setRespostaFiles((prev) => {
      const room = CANAL_DENUNCIA_ANEXO_MAX_COUNT - prev.length;
      if (room <= 0) {
        setRespostaErro(`No máximo ${CANAL_DENUNCIA_ANEXO_MAX_COUNT} anexos por mensagem.`);
        return prev;
      }
      if (ok.length > room) {
        setRespostaErro(`No máximo ${CANAL_DENUNCIA_ANEXO_MAX_COUNT} anexos por mensagem.`);
      }
      return [...prev, ...ok.slice(0, room).map((file) => ({ id: crypto.randomUUID(), file }))];
    });
  }

  return (
    <div role="tabpanel" id="panel-canal-consultar" aria-labelledby="tab-canal-consultar" style={PANEL_BOX_STYLE}>
      <label
        htmlFor="canal-consulta-protocolo"
        style={{ fontSize: 13, fontWeight: 600, color: "#fff", display: "block", marginBottom: 8 }}
      >
        Protocolo
      </label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          id="canal-consulta-protocolo"
          value={protocoloConsulta}
          onChange={(e) => setProtocoloConsulta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleConsultar();
            }
          }}
          placeholder={PROTOCOLO_CANAL_PLACEHOLDER}
          aria-label="Protocolo da denúncia"
          style={{ ...inp, flex: "1 1 200px", maxWidth: 320 }}
        />
        <button
          type="button"
          onClick={() => void handleConsultar()}
          disabled={consultando}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "none",
            background: "var(--brand-primary, #7c3aed)",
            color: "#fff",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            cursor: consultando ? "wait" : "pointer",
            fontFamily: FONT.body,
          }}
        >
          {consultando ? (
            <Loader2 className="app-lucide-spin" size={18} color="#fff" aria-hidden />
          ) : (
            <Search size={18} aria-hidden />
          )}
          {consultando ? "Pesquisando…" : "Pesquisar"}
        </button>
      </div>
      <label
        htmlFor="canal-consulta-email"
        style={{ fontSize: 13, fontWeight: 600, color: "#fff", display: "block", margin: "16px 0 8px" }}
      >
        E-mail do envio
      </label>
      <input
        id="canal-consulta-email"
        type="email"
        value={emailConsulta}
        onChange={(e) => setEmailConsulta(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void handleConsultar();
          }
        }}
        placeholder="Se você se identificou, informe o mesmo e-mail"
        aria-label="E-mail usado no envio da denúncia"
        autoComplete="email"
        style={{ ...inp, maxWidth: 320 }}
      />
      <p style={{ margin: "8px 0 0", fontSize: 12, color: "#9b8ab8", lineHeight: 1.45, maxWidth: 480 }}>
        Obrigatório somente se você se identificou no registro. Relatos anônimos consultam só com o protocolo.
      </p>
      {consultaErro ? (
        <div role="alert" style={{ ...alertBox, marginTop: 16 }}>
          {consultaErro}
        </div>
      ) : null}
      {consultaData ? (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>Linha do tempo</h2>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 20,
                background: "rgba(112,202,228,0.15)",
                color: "var(--brand-icon, #70cae4)",
                border: "1px solid rgba(112,202,228,0.35)",
              }}
            >
              {statusLabel(
                (consultaData.status === "procedente" ||
                consultaData.status === "nao_procedente" ||
                consultaData.status === "em_avaliacao" ||
                consultaData.status === "relatado"
                  ? consultaData.status
                  : "relatado") as DenunciaStatusDb,
              )}
            </span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            <TimelineItem titulo="Relatado" subtitulo={fmtDataHora(consultaData.relatado_em)} />
            {(consultaData.status === "em_avaliacao" ||
              consultaData.status === "procedente" ||
              consultaData.status === "nao_procedente") &&
            consultaData.em_avaliacao_em ? (
              <TimelineItem titulo="Denúncia em avaliação" subtitulo={fmtDataHora(consultaData.em_avaliacao_em)} />
            ) : null}
            {consultaData.status === "procedente" || consultaData.status === "nao_procedente" ? (
              <>
                <TimelineItem
                  titulo={statusLabel(consultaData.status as DenunciaStatusDb)}
                  subtitulo={fmtDataHora(consultaData.atendida_em)}
                />
                {typeof consultaData.descricao_resolucao === "string" && consultaData.descricao_resolucao ? (
                  <li
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      borderLeft: "3px solid var(--brand-icon, #70cae4)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#9b8ab8", marginBottom: 6 }}>Descrição da resolução</div>
                    <div
                      className="canal-timeline-texto"
                      style={{ fontSize: 14, color: "#e5dce1", whiteSpace: "pre-wrap", lineHeight: 1.55 }}
                    >
                      {String(consultaData.descricao_resolucao)}
                    </div>
                  </li>
                ) : null}
              </>
            ) : null}
          </ul>

          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "28px 0 8px" }}>Comunicação com o RH</h2>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "#9b8ab8", lineHeight: 1.5 }}>
            Mensagens da equipe e suas respostas. Use este espaço para esclarecer dúvidas e enviar evidências durante a
            investigação.
          </p>

          {(consultaData.mensagens ?? []).length === 0 ? (
            <div
              style={{
                padding: "16px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px dashed rgba(255,255,255,0.12)",
                fontSize: 13,
                color: "#9b8ab8",
                textAlign: "center",
              }}
            >
              Ainda não há mensagens nesta denúncia. Quando a equipe RH enviar uma anotação, ela aparecerá aqui.
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {(consultaData.mensagens ?? []).map((m) => {
                const doRelator = m.autor_origem === "relator";
                return (
                  <li
                    key={m.id}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: doRelator ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.05)",
                      borderLeft: `3px solid ${doRelator ? "var(--brand-primary, #7c3aed)" : "var(--brand-icon, #70cae4)"}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                        {labelAutorMensagemPublica(m.autor_origem)}
                      </span>
                      <span style={{ fontSize: 12, color: "#9b8ab8" }}>{fmtDataHora(m.created_at)}</span>
                    </div>
                    <div
                      className="canal-timeline-texto"
                      style={{ fontSize: 14, color: "#e5dce1", whiteSpace: "pre-wrap", lineHeight: 1.55 }}
                    >
                      {m.texto}
                    </div>
                    {(m.anexos ?? []).length > 0 ? (
                      <div style={{ marginTop: 10 }}>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#b8a8d4" }}>
                          {(m.anexos ?? []).map((ax) => (
                            <li key={ax.id}>{ax.file_name}</li>
                          ))}
                        </ul>
                        {!doRelator ? (
                          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#9b8ab8", lineHeight: 1.45 }}>
                            {MSG_CANAL_ANEXO_RH_SO_NOME}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {consultaData.status === "procedente" || consultaData.status === "nao_procedente" ? (
            <p style={{ margin: "20px 0 0", fontSize: 13, color: "#9b8ab8", lineHeight: 1.5 }}>
              Esta denúncia já foi encerrada. Não é possível enviar novas mensagens.
            </p>
          ) : (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 12,
                border: "1px solid rgba(124,58,237,0.35)",
                background: "rgba(0,0,0,0.2)",
              }}
            >
              <label
                htmlFor="resposta-relator"
                style={{ fontSize: 13, fontWeight: 600, color: "#fff", display: "block", marginBottom: 8 }}
              >
                Sua mensagem
                <CampoObrigatorioMark />
              </label>
              <textarea
                id="resposta-relator"
                value={respostaTexto}
                onChange={(e) => setRespostaTexto(e.target.value)}
                rows={4}
                placeholder="Esclareça dúvidas ou envie informações adicionais à equipe RH…"
                disabled={enviandoResposta}
                style={{ ...inp, resize: "vertical", minHeight: 96 }}
              />
              <div style={{ marginTop: 12 }}>
                <CampoUploadArquivos
                  id="resposta-anexos"
                  label="Anexos"
                  buttonLabel="Adicionar evidências"
                  accept={CANAL_DENUNCIA_ANEXO_ACCEPT}
                  multiple
                  items={respostaFiles.map((nf) => ({
                    key: nf.id,
                    label: nf.file.name,
                    pendente: true,
                  }))}
                  onAdd={adicionarAnexosResposta}
                  onRemove={(key) => setRespostaFiles((prev) => prev.filter((nf) => nf.id !== key))}
                  disabled={enviandoResposta}
                  t={UPLOAD_THEME}
                  hint={`Opcional · PDF, JPG, PNG ou MP4 · até 20MB · máx. ${CANAL_DENUNCIA_ANEXO_MAX_COUNT} arquivos`}
                  pendingHint="Anexos serão enviados junto com a mensagem."
                />
              </div>
              {respostaErro ? (
                <div role="alert" style={{ ...alertBox, marginTop: 12 }}>
                  {respostaErro}
                </div>
              ) : null}
              {respostaOk ? (
                <div
                  role="status"
                  style={{
                    marginTop: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.35)",
                    color: "#22c55e",
                    fontSize: 13,
                  }}
                >
                  {respostaOk}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => void handleEnviarResposta()}
                disabled={enviandoResposta}
                style={{
                  marginTop: 14,
                  width: "100%",
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: "var(--brand-primary, #7c3aed)",
                  color: "#fff",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: enviandoResposta ? "wait" : "pointer",
                  fontFamily: FONT.body,
                }}
              >
                {enviandoResposta ? (
                  <>
                    <Loader2 className="app-lucide-spin" size={18} color="#fff" aria-hidden />
                    Enviando…
                  </>
                ) : (
                  "Enviar mensagem"
                )}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
