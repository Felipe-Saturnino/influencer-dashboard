import { useState, useCallback, useEffect, type CSSProperties, type ReactNode } from "react";
import { Loader2, Search, Lock, CircleCheckBig, VenetianMask, ShieldBan, Info, Megaphone } from "lucide-react";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../components/dashboard";
import { supabase } from "../../lib/supabase";
import { FONT, BASE_COLORS } from "../../constants/theme";
import { CampoObrigatorioMark } from "../../components/CampoObrigatorioMark";
import {
  TIPOS_DENUNCIA,
  STORAGE_BUCKET,
  sanitizeStorageFileName,
  type TipoDenunciaKey,
} from "../../lib/canalDenunciasSpin";

const MAX_ANEXO_BYTES = 20 * 1024 * 1024;

const BADGES: {
  Icon: typeof Lock;
  title: string;
  text: string;
}[] = [
  {
    Icon: Lock,
    title: "Confidencial",
    text: "Suas informações são protegidas e tratadas com total sigilo.",
  },
  {
    Icon: CircleCheckBig,
    title: "Toda Denúncia Importa",
    text: "Nenhum relato é ignorado. Cada caso recebe atenção dedicada e retorno formal.",
  },
  {
    Icon: VenetianMask,
    title: "Anônimo",
    text: "Você pode denunciar sem se identificar. O anonimato é garantido.",
  },
  {
    Icon: ShieldBan,
    title: "Sem retaliação",
    text: "Qualquer forma de retaliação a denunciantes é proibida e punível.",
  },
];

type TabKey = "denunciar" | "consultar";

const CANAL_TABS: TabKey[] = ["denunciar", "consultar"];

type ConsultaPublicOk = {
  ok: true;
  status: string;
  relatado_em: string;
  em_avaliacao_em: string | null;
  atendida_em: string | null;
  descricao_resolucao: string | null;
};

function fmtDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

/** Evita faixa clara no rodapé: tema claro do `body`/`#root` ficava visível atrás do zoom. */
function useCanalDenunciasPublicViewportBg() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const snap = {
      htmlBg: html.style.background,
      htmlMinH: html.style.minHeight,
      bodyBg: body.style.background,
      bodyMinH: body.style.minHeight,
      rootBg: root?.style.background ?? "",
      rootMinH: root?.style.minHeight ?? "",
    };
    const grad = "linear-gradient(135deg, #0a0a0f 0%, #2d1b4e 100%)";
    html.style.background = "#0a0a0f";
    html.style.minHeight = "100%";
    body.style.background = grad;
    body.style.minHeight = "100%";
    if (root) {
      root.style.minHeight = "100%";
      root.style.background = grad;
    }
    return () => {
      html.style.background = snap.htmlBg;
      html.style.minHeight = snap.htmlMinH;
      body.style.background = snap.bodyBg;
      body.style.minHeight = snap.bodyMinH;
      if (root) {
        root.style.background = snap.rootBg;
        root.style.minHeight = snap.rootMinH;
      }
    };
  }, []);
}

export default function CanalDenunciasSpinPage() {
  useCanalDenunciasPublicViewportBg();

  const [aba, setAba] = useState<TabKey>("denunciar");
  const [desejaIdentificar, setDesejaIdentificar] = useState<"sim" | "nao" | "">("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [tiposSel, setTiposSel] = useState<Set<TipoDenunciaKey>>(new Set());
  const [outroTexto, setOutroTexto] = useState("");
  const [relato, setRelato] = useState("");
  const [arquivos, setArquivos] = useState<FileList | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [protocoloOk, setProtocoloOk] = useState<string | null>(null);

  const [protocoloConsulta, setProtocoloConsulta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [consultaErro, setConsultaErro] = useState<string | null>(null);
  const [consultaData, setConsultaData] = useState<ConsultaPublicOk | null>(null);

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
      if (!/\S+@\S+\.\S+/.test(email)) return setErroEnvio("E-mail inválido.");
      if (!telefone.trim()) return setErroEnvio("Informe o telefone.");
    }
    if (tiposSel.size === 0) return setErroEnvio("Selecione ao menos um tipo de relato.");
    if (tiposSel.has("outro") && !outroTexto.trim()) return setErroEnvio("Descreva o motivo em «Outro».");
    if (!relato.trim()) return setErroEnvio("Preencha o relato do ocorrido.");

    if (arquivos && arquivos.length > 0) {
      for (let i = 0; i < arquivos.length; i++) {
        if (arquivos[i].size > MAX_ANEXO_BYTES) {
          return setErroEnvio("Cada anexo deve ter no máximo 20MB.");
        }
      }
    }

    setEnviando(true);
    try {
      const tiposArr = [...tiposSel];
      const row = {
        deseja_identificar: desejaIdentificar === "sim",
        nome: desejaIdentificar === "sim" ? nome.trim() : null,
        telefone: desejaIdentificar === "sim" ? telefone.trim() : null,
        email: desejaIdentificar === "sim" ? email.trim().toLowerCase() : null,
        tipos_denuncia: tiposArr,
        tipo_outro_descricao: tiposSel.has("outro") ? outroTexto.trim() : null,
        relato: relato.trim(),
      };
      const { data: rpcData, error: rpcErr } = await supabase.rpc("registrar_denuncia_spin", {
        p_deseja_identificar: row.deseja_identificar,
        p_nome: row.nome,
        p_telefone: row.telefone,
        p_email: row.email,
        p_tipos_denuncia: row.tipos_denuncia,
        p_tipo_outro_descricao: row.tipo_outro_descricao,
        p_relato: row.relato,
      });
      if (rpcErr) {
        setErroEnvio("Não foi possível registrar a denúncia. Tente novamente.");
        setEnviando(false);
        return;
      }
      const ins = rpcData as { ok?: boolean; id?: string; protocolo?: string; error?: string } | null;
      if (!ins?.ok || !ins.id || !ins.protocolo) {
        const code = ins?.error;
        const msg =
          code === "identificacao_incompleta"
            ? "Preencha nome, e-mail e telefone para se identificar."
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
        setEnviando(false);
        return;
      }
      const denunciaId = ins.id;
      const prot = ins.protocolo;

      if (arquivos && arquivos.length > 0) {
        for (let i = 0; i < arquivos.length; i++) {
          const f = arquivos[i];
          const safe = sanitizeStorageFileName(f.name);
          const path = `${denunciaId}/${Date.now()}_${i}_${safe}`;
          const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, f, {
            contentType: f.type || undefined,
            upsert: false,
          });
          if (upErr) {
            setErroEnvio("Denúncia registrada, mas houve falha no envio de um ou mais anexos. Guarde o protocolo e contate o RH.");
            setProtocoloOk(prot);
            setEnviando(false);
            return;
          }
          await supabase.from("canal_denuncia_anexos").insert({
            denuncia_id: denunciaId,
            anotacao_id: null,
            storage_path: path,
            file_name: f.name,
            content_type: f.type || null,
            file_size: f.size,
          });
        }
      }

      setProtocoloOk(prot);
    } catch {
      setErroEnvio("Erro inesperado. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleConsultar() {
    setConsultaErro(null);
    setConsultaData(null);
    const p = protocoloConsulta.trim().toUpperCase();
    if (!p) {
      setConsultaErro("Informe o protocolo.");
      return;
    }
    setConsultando(true);
    const { data, error } = await supabase.rpc("consultar_denuncia_spin", { p_protocolo: p });
    setConsultando(false);
    if (error) {
      setConsultaErro("Não foi possível consultar. Tente novamente.");
      return;
    }
    const j = data as { ok?: boolean; error?: string } | null;
    if (!j?.ok || j.error === "not_found") {
      setConsultaErro("Protocolo não encontrado");
      return;
    }
    setConsultaData(j as ConsultaPublicOk);
  }

  return (
    <div
      className="app-full-viewport-zoomed"
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #0a0a0f 0%, #2d1b4e 100%)",
        fontFamily: FONT.body,
        color: "#e5dce1",
        padding: "clamp(16px, 4vw, 40px)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/Logo Spin Gaming White.png"
            alt="Spin Gaming"
            style={{ height: "clamp(56px, 14vw, 96px)", objectFit: "contain" }}
          />
          <h1
            style={{
              margin: "16px 0 0",
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            Canal de Denúncias Spin
          </h1>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "clamp(0.95rem, 2.5vw, 1.05rem)",
              color: "#d4c4e8",
              lineHeight: 1.5,
              maxWidth: 520,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Um espaço seguro para relatar irregularidades com total confidencialidade.
          </p>
        </div>

        <div className="canal-denuncias-badges-grid" style={{ marginBottom: 28 }}>
          {BADGES.map(({ Icon, title, text }) => (
            <div
              key={title}
              style={{
                padding: "14px 14px 16px",
                borderRadius: 14,
                border: "1px solid rgba(124,58,237,0.35)",
                background: "rgba(15,15,26,0.75)",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(124,58,237,0.25)",
                    color: "var(--brand-icon, #70cae4)",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} strokeWidth={2} aria-hidden />
                </span>
                <span style={{ fontWeight: 800, fontSize: 13, color: "#fff", lineHeight: 1.25 }}>{title}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#c9b8e0", lineHeight: 1.5 }}>{text}</p>
            </div>
          ))}
        </div>

        <div
          role="tablist"
          aria-label="Formulário do canal de denúncias"
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}
          onKeyDown={(e) => onFiltroBarTabsKeyDown(e, CANAL_TABS, setAba, (k) => `tab-canal-${k}`)}
        >
          <FiltroBarTabButton
            id="tab-canal-denunciar"
            active={aba === "denunciar"}
            aria-controls="panel-canal-denunciar"
            onClick={() => setAba("denunciar")}
            icon={<Megaphone {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Realizar denúncia
          </FiltroBarTabButton>
          <FiltroBarTabButton
            id="tab-canal-consultar"
            active={aba === "consultar"}
            aria-controls="panel-canal-consultar"
            onClick={() => setAba("consultar")}
            icon={<Search {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            Consultar denúncia
          </FiltroBarTabButton>
        </div>

        {aba === "denunciar" && (
          <div
            role="tabpanel"
            id="panel-canal-denunciar"
            aria-labelledby="tab-canal-denunciar"
            style={{
              border: "1px solid rgba(124,58,237,0.35)",
              borderRadius: 16,
              padding: "clamp(18px, 4vw, 28px)",
              background: "rgba(15,15,26,0.88)",
            }}
          >
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
                <p style={{ fontSize: 13, color: "#a89bc4", lineHeight: 1.55, maxWidth: 420, margin: "0 auto 20px" }}>
                  Guarde este protocolo para acompanhar a tratativa no futuro, na aba «Consultar denúncia» desta mesma página.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setProtocoloOk(null);
                    setDesejaIdentificar("");
                    setNome("");
                    setTelefone("");
                    setEmail("");
                    setTiposSel(new Set());
                    setOutroTexto("");
                    setRelato("");
                    setArquivos(null);
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

                {desejaIdentificar === "sim" && (
                  <>
                    <Campo label="Nome" obrigatorio>
                      <input value={nome} onChange={(e) => setNome(e.target.value)} style={inp} />
                    </Campo>
                    <Campo label="Telefone" obrigatorio>
                      <input value={telefone} onChange={(e) => setTelefone(e.target.value)} style={inp} />
                    </Campo>
                    <Campo label="E-mail" obrigatorio>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
                    </Campo>
                  </>
                )}

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
                  {tiposSel.has("outro") && (
                    <textarea
                      value={outroTexto}
                      onChange={(e) => setOutroTexto(e.target.value)}
                      placeholder="Descreva o motivo do relato"
                      rows={3}
                      style={{ ...inp, marginTop: 12, resize: "vertical" }}
                    />
                  )}
                </div>

                <Campo
                  label="Relate o ocorrido"
                  obrigatorio
                  legenda="Descreva o que aconteceu, quando, onde e quem estava envolvido. Quanto mais detalhes, melhor a apuração."
                >
                  <textarea
                    value={relato}
                    onChange={(e) => setRelato(e.target.value)}
                    placeholder="Descreva os fatos com o máximo de detalhes possível…"
                    rows={8}
                    style={{ ...inp, resize: "vertical", minHeight: 140 }}
                  />
                </Campo>

                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", display: "block", marginBottom: 8 }}>Anexo</span>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setArquivos(e.target.files)}
                    style={{ fontSize: 13, color: "#c4b5d4" }}
                  />
                  <p style={{ fontSize: 11, color: "#9b8ab8", marginTop: 8, lineHeight: 1.45 }}>
                    Documentos, fotos ou vídeos como evidências. Formatos aceitos: PDF, JPG, PNG, MP4. Tamanho máximo: 20MB por arquivo.
                  </p>
                </div>

                {erroEnvio && (
                  <div role="alert" style={{ ...alertBox, marginBottom: 16 }}>
                    {erroEnvio}
                  </div>
                )}

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
                    Após o envio, você receberá um número de protocolo. Use-o na aba «Consultar denúncia» para acompanhar o andamento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleEnviar}
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
                      Enviando...
                    </>
                  ) : (
                    "Enviar"
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {aba === "consultar" && (
          <div
            role="tabpanel"
            id="panel-canal-consultar"
            aria-labelledby="tab-canal-consultar"
            style={{
              border: "1px solid rgba(124,58,237,0.35)",
              borderRadius: 16,
              padding: "clamp(18px, 4vw, 28px)",
              background: "rgba(15,15,26,0.88)",
            }}
          >
            <label style={{ fontSize: 13, fontWeight: 600, color: "#fff", display: "block", marginBottom: 8 }}>
              Protocolo
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                value={protocoloConsulta}
                onChange={(e) => setProtocoloConsulta(e.target.value)}
                placeholder="Ex.: CDSPIN00001"
                aria-label="Protocolo da denúncia"
                style={{ ...inp, flex: "1 1 200px", maxWidth: 320 }}
              />
              <button
                type="button"
                onClick={handleConsultar}
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
                {consultando ? <Loader2 className="app-lucide-spin" size={18} color="#fff" aria-hidden /> : <Search size={18} aria-hidden />}
                Pesquisar
              </button>
            </div>
            {consultaErro && (
              <div role="alert" style={{ ...alertBox, marginTop: 16 }}>
                {consultaErro}
              </div>
            )}
            {consultaData && (
              <div style={{ marginTop: 24 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Linha do tempo</h2>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 18 }}>
                  <TimelineItem titulo="Relatado" subtitulo={fmtDataHora(consultaData.relatado_em as string)} />
                  {(consultaData.status === "em_avaliacao" ||
                    consultaData.status === "procedente" ||
                    consultaData.status === "nao_procedente") &&
                    consultaData.em_avaliacao_em && (
                      <TimelineItem titulo="Denúncia em avaliação" subtitulo={fmtDataHora(consultaData.em_avaliacao_em as string)} />
                    )}
                  {(consultaData.status === "procedente" || consultaData.status === "nao_procedente") && (
                    <>
                      <TimelineItem titulo="Denúncia atendida" subtitulo={fmtDataHora(consultaData.atendida_em as string)} />
                      {typeof consultaData.descricao_resolucao === "string" && consultaData.descricao_resolucao && (
                        <li
                          style={{
                            padding: "14px 16px",
                            borderRadius: 12,
                            background: "rgba(255,255,255,0.05)",
                            borderLeft: "3px solid var(--brand-icon, #70cae4)",
                          }}
                        >
                          <div style={{ fontSize: 12, color: "#9b8ab8", marginBottom: 6 }}>Descrição da resolução</div>
                          <div style={{ fontSize: 14, color: "#e5dce1", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                            {String(consultaData.descricao_resolucao)}
                          </div>
                        </li>
                      )}
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: 32, marginBottom: 24, fontSize: 12, color: "#8a7aa8" }}>
          <a href="/" style={{ color: "var(--brand-icon, #70cae4)", fontWeight: 600 }}>
            Voltar ao login da plataforma
          </a>
        </p>
      </div>
    </div>
  );
}

function TimelineItem({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <li
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.05)",
        borderLeft: "3px solid var(--brand-primary, #7c3aed)",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 13, color: "#b8a8d4" }}>{subtitulo}</div>
    </li>
  );
}

function Campo({
  label,
  obrigatorio,
  legenda,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  legenda?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#fff", display: "block", marginBottom: 8 }}>
        {label}
        {obrigatorio ? <CampoObrigatorioMark /> : null}
      </label>
      {legenda ? (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#9b8ab8", lineHeight: 1.5 }}>{legenda}</p>
      ) : null}
      {children}
    </div>
  );
}

const inp: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  color: "#fff",
  fontSize: 14,
  fontFamily: FONT.body,
};

const alertBox: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  background: "rgba(232,64,37,0.12)",
  border: "1px solid rgba(232,64,37,0.35)",
  color: "#e84025",
  fontSize: 13,
};
