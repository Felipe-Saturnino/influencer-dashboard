import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Clock, Eye, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { useApp } from "../../../context/AppContext";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  onFiltroBarTabsKeyDown,
} from "../../../components/dashboard";
import { ModalTabPanel } from "../../../components/ModalTabPanel";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { CorpoHtmlPortalRh } from "../../../components/conteudo/CorpoHtmlPortalRh";
import {
  fmtDataHoraPt,
  fmtDataPt,
  labelComunicadoFromSlug,
  labelPoliticaFromSlug,
  RH_POSTAGEM_STATUS_LABEL,
  RH_POSTAGEM_TIPO_UI_LABEL,
  type RhPostagemContentType,
  type RhPostagemStatus,
} from "../../../lib/portalRhWorkflow";
import {
  documentoUsaModeloNormativo,
  labelClassificacaoDocumento,
  labelTipoDocumentoPortal,
  type RhDocumentoClassificacao,
  type RhDocumentoTipo,
} from "../../../lib/portalRhDocumentoNormativo";
import { urlAssinadaPortalRhAsset } from "../../../lib/portalRhPostagemFiles";
import { PortalRhAssetLink } from "./PortalRhAssetLink";

type AbaVer = "ver" | "historico";

type HistRow = {
  id: string;
  alteracao: string;
  created_at: string;
  created_by: string;
  autor?: { name: string | null } | null;
};

type PostagemLeitura = {
  contentType: RhPostagemContentType;
  titulo: string;
  status: RhPostagemStatus | null;
  categoriaLabel: string | null;
  introducao: string | null;
  corpo: string | null;
  isPinned: boolean;
  imagemPath: string | null;
  anexoPath: string | null;
  anexoNome: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  numero: number | null;
  normativo: boolean;
  codigo: string | null;
  versao: string | null;
  tipoDocumento: RhDocumentoTipo | null;
  classificacao: RhDocumentoClassificacao | null;
  areaResponsavel: string | null;
  aplicavelA: string[];
  resumo: string | null;
  exigeCiencia: boolean | null;
  elaboradoPor: string | null;
  revisadoPor: string | null;
  aprovadoPorDoc: string | null;
  dataEmissao: string | null;
  relacionados: { codigo: string | null; titulo: string; versao: string | null }[];
};

const ERRO_HISTORICO = "Não foi possível carregar o histórico. Tente novamente.";
const ERRO_LEITURA =
  "Não foi possível carregar a postagem. Se o problema persistir, entre em contato com o suporte.";

const ABAS: AbaVer[] = ["ver", "historico"];

function CampoLeitura({ label, children }: { label: string; children: ReactNode }) {
  const { theme: t } = useApp();
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: t.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 6,
          fontFamily: FONT.body,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function TextoOuTraco({ value }: { value: string | null | undefined }) {
  const { theme: t } = useApp();
  const txt = (value ?? "").trim();
  return (
    <p style={{ fontSize: 14, color: txt ? t.text : t.textMuted, margin: 0, lineHeight: 1.5, fontFamily: FONT.body, whiteSpace: "pre-wrap" }}>
      {txt || "—"}
    </p>
  );
}

function PdfLeitura({ path, nome }: { path: string | null; nome: string | null }) {
  const { theme: t } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path?.trim()));

  useEffect(() => {
    let cancelled = false;
    if (!path?.trim()) {
      setUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void urlAssinadaPortalRhAsset(path).then((signed) => {
      if (!cancelled) {
        setUrl(signed);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path?.trim()) return <TextoOuTraco value={null} />;
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
        <Loader2 className="app-lucide-spin" size={16} color="var(--brand-primary, #7c3aed)" aria-hidden />
        Carregando…
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <PortalRhAssetLink storagePath={path} label={nome?.trim() ? `Ver PDF (${nome.trim()})` : "Ver PDF"} color={t.text} />
      {url ? (
        <iframe
          title={nome?.trim() || "Documento PDF"}
          src={url}
          style={{ width: "100%", minHeight: 360, border: `1px solid ${t.cardBorder}`, borderRadius: 10, background: "#525659" }}
        />
      ) : null}
    </div>
  );
}

function PainelHistorico({
  loading,
  erro,
  itens,
}: {
  loading: boolean;
  erro: string | null;
  itens: HistRow[];
}) {
  const { theme: t } = useApp();
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
        <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
      </div>
    );
  }
  if (erro) {
    return (
      <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
        {erro}
      </div>
    );
  }
  if (itens.length === 0) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        Nenhum registro no histórico.
      </div>
    );
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "min(60dvh, 480px)", overflowY: "auto" }}>
      {itens.map((h) => {
        const autor = (h.autor?.name ?? "").trim() || "Usuário";
        return (
          <li
            key={h.id}
            style={{
              padding: "12px 0",
              borderBottom: `1px solid ${t.cardBorder}`,
              fontFamily: FONT.body,
            }}
          >
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>{fmtDataHoraPt(h.created_at)}</div>
            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 6 }}>{autor}</div>
            <div style={{ fontSize: 13, color: t.text, lineHeight: 1.45 }}>{h.alteracao}</div>
          </li>
        );
      })}
    </ul>
  );
}

export function ModalVerPostagem({
  open,
  assunto,
  contentType,
  contentId,
  onClose,
}: {
  open: boolean;
  assunto: string;
  contentType: RhPostagemContentType | null;
  contentId: string | null;
  onClose: () => void;
}) {
  const { theme: t } = useApp();
  const [aba, setAba] = useState<AbaVer>("ver");
  const [itens, setItens] = useState<HistRow[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [erroHist, setErroHist] = useState<string | null>(null);
  const [postagem, setPostagem] = useState<PostagemLeitura | null>(null);
  const [loadingVer, setLoadingVer] = useState(false);
  const [erroVer, setErroVer] = useState<string | null>(null);

  const carregarHistorico = useCallback(async () => {
    if (!contentType || !contentId) return;
    setLoadingHist(true);
    setErroHist(null);
    const { data, error } = await supabase
      .from("rh_portal_postagem_status_historico")
      .select("id, alteracao, created_at, created_by")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .order("created_at", { ascending: false });

    setLoadingHist(false);
    if (error) {
      console.error("[ModalVerPostagem] historico:", error);
      setErroHist(ERRO_HISTORICO);
      setItens([]);
      return;
    }
    const rows = (data ?? []) as Omit<HistRow, "autor">[];
    const ids = [...new Set(rows.map((r) => r.created_by).filter(Boolean))];
    const nomes: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
      for (const p of profs ?? []) {
        const pr = p as { id: string; name: string | null };
        nomes[pr.id] = pr.name ?? "";
      }
    }
    setItens(
      rows.map((r) => ({
        ...r,
        autor: { name: nomes[r.created_by] ?? null },
      })),
    );
  }, [contentType, contentId]);

  const carregarPostagem = useCallback(async () => {
    if (!contentType || !contentId) return;
    setLoadingVer(true);
    setErroVer(null);
    setPostagem(null);
    try {
      if (contentType === "comunicado") {
        const { data, error } = await supabase
          .from("rh_portal_comunicado")
          .select(
            "titulo, corpo, status, is_pinned, published_at, created_at, imagem_storage_path, anexo_storage_path, anexo_nome, categoria:rh_portal_categoria(slug)",
          )
          .eq("id", contentId)
          .single();
        if (error) throw error;
        const row = data as {
          titulo: string;
          corpo: string | null;
          status: RhPostagemStatus | null;
          is_pinned: boolean | null;
          published_at: string | null;
          created_at: string | null;
          imagem_storage_path: string | null;
          anexo_storage_path: string | null;
          anexo_nome: string | null;
          categoria?: { slug: string } | { slug: string }[] | null;
        };
        const slug = Array.isArray(row.categoria) ? row.categoria[0]?.slug : row.categoria?.slug;
        setPostagem({
          contentType,
          titulo: row.titulo,
          status: row.status,
          categoriaLabel: labelComunicadoFromSlug(slug ?? ""),
          introducao: null,
          corpo: row.corpo,
          isPinned: Boolean(row.is_pinned),
          imagemPath: row.imagem_storage_path,
          anexoPath: row.anexo_storage_path,
          anexoNome: row.anexo_nome,
          publishedAt: row.published_at,
          createdAt: row.created_at,
          numero: null,
          normativo: false,
          codigo: null,
          versao: null,
          tipoDocumento: null,
          classificacao: null,
          areaResponsavel: null,
          aplicavelA: [],
          resumo: null,
          exigeCiencia: null,
          elaboradoPor: null,
          revisadoPor: null,
          aprovadoPorDoc: null,
          dataEmissao: null,
          relacionados: [],
        });
      } else if (contentType === "documento") {
        const { data, error } = await supabase
          .from("rh_portal_documento")
          .select(
            "titulo, corpo, introducao, resumo, status, published_at, created_at, imagem_storage_path, anexo_storage_path, anexo_nome, storage_path, codigo, versao, tipo_documento, area_responsavel, classificacao, aplicavel_a, data_emissao, elaborado_por, revisado_por, aprovado_por_doc, requires_acknowledgment, categoria:rh_portal_categoria(slug)",
          )
          .eq("id", contentId)
          .single();
        if (error) throw error;
        const row = data as {
          titulo: string;
          corpo: string | null;
          introducao: string | null;
          resumo: string | null;
          status: RhPostagemStatus | null;
          published_at: string | null;
          created_at: string | null;
          imagem_storage_path: string | null;
          anexo_storage_path: string | null;
          anexo_nome: string | null;
          storage_path: string | null;
          codigo: string | null;
          versao: string | null;
          tipo_documento: RhDocumentoTipo | null;
          area_responsavel: string | null;
          classificacao: RhDocumentoClassificacao | null;
          aplicavel_a: string[] | null;
          data_emissao: string | null;
          elaborado_por: string | null;
          revisado_por: string | null;
          aprovado_por_doc: string | null;
          requires_acknowledgment: boolean | null;
          categoria?: { slug: string } | { slug: string }[] | null;
        };
        const slug = Array.isArray(row.categoria) ? row.categoria[0]?.slug : row.categoria?.slug;
        const normativo = documentoUsaModeloNormativo(row);
        let relacionados: PostagemLeitura["relacionados"] = [];
        if (normativo) {
          const { data: rels } = await supabase
            .from("rh_portal_documento_relacao")
            .select("relacionado_id")
            .eq("documento_id", contentId);
          const ids = (rels ?? []).map((r) => (r as { relacionado_id: string }).relacionado_id).filter(Boolean);
          if (ids.length > 0) {
            const { data: docs } = await supabase.from("rh_portal_documento").select("id, codigo, titulo, versao").in("id", ids);
            relacionados = (docs ?? []).map((d) => {
              const doc = d as { codigo: string | null; titulo: string; versao: string | null };
              return { codigo: doc.codigo, titulo: doc.titulo, versao: doc.versao };
            });
          }
        }
        const pdfPath = row.anexo_storage_path ?? row.storage_path;
        setPostagem({
          contentType,
          titulo: row.titulo,
          status: row.status,
          categoriaLabel: normativo ? null : labelPoliticaFromSlug(slug ?? ""),
          introducao: row.introducao,
          corpo: row.corpo,
          isPinned: false,
          imagemPath: row.imagem_storage_path,
          anexoPath: pdfPath,
          anexoNome: row.anexo_nome,
          publishedAt: row.published_at,
          createdAt: row.created_at,
          numero: null,
          normativo,
          codigo: row.codigo,
          versao: row.versao,
          tipoDocumento: row.tipo_documento,
          classificacao: row.classificacao,
          areaResponsavel: row.area_responsavel,
          aplicavelA: row.aplicavel_a ?? [],
          resumo: row.resumo,
          exigeCiencia: row.requires_acknowledgment,
          elaboradoPor: row.elaborado_por,
          revisadoPor: row.revisado_por,
          aprovadoPorDoc: row.aprovado_por_doc,
          dataEmissao: row.data_emissao,
          relacionados,
        });
      } else {
        const { data, error } = await supabase
          .from("rh_portal_rh_talk")
          .select(
            "titulo, corpo, introducao, resumo, numero, status, published_at, created_at, imagem_storage_path, anexo_storage_path, anexo_nome",
          )
          .eq("id", contentId)
          .single();
        if (error) throw error;
        const row = data as {
          titulo: string;
          corpo: string | null;
          introducao: string | null;
          resumo: string | null;
          numero: number | null;
          status: RhPostagemStatus | null;
          published_at: string | null;
          created_at: string | null;
          imagem_storage_path: string | null;
          anexo_storage_path: string | null;
          anexo_nome: string | null;
        };
        setPostagem({
          contentType,
          titulo: row.titulo,
          status: row.status,
          categoriaLabel: null,
          introducao: row.introducao ?? row.resumo,
          corpo: row.corpo ?? row.resumo,
          isPinned: false,
          imagemPath: row.imagem_storage_path,
          anexoPath: row.anexo_storage_path,
          anexoNome: row.anexo_nome,
          publishedAt: row.published_at,
          createdAt: row.created_at,
          numero: row.numero,
          normativo: false,
          codigo: null,
          versao: null,
          tipoDocumento: null,
          classificacao: null,
          areaResponsavel: null,
          aplicavelA: [],
          resumo: null,
          exigeCiencia: null,
          elaboradoPor: null,
          revisadoPor: null,
          aprovadoPorDoc: null,
          dataEmissao: null,
          relacionados: [],
        });
      }
    } catch (error) {
      console.error("[ModalVerPostagem] leitura:", error);
      setErroVer(ERRO_LEITURA);
      setPostagem(null);
    } finally {
      setLoadingVer(false);
    }
  }, [contentType, contentId]);

  useEffect(() => {
    if (!open || !contentType || !contentId) {
      setItens([]);
      setErroHist(null);
      setPostagem(null);
      setErroVer(null);
      setAba("ver");
      return;
    }
    setAba("ver");
    void carregarHistorico();
    void carregarPostagem();
  }, [open, contentType, contentId, carregarHistorico, carregarPostagem]);

  if (!open || !contentType || !contentId) return null;

  const tipoUi = contentType === "documento" ? "politica" : contentType;
  const html = (postagem?.corpo ?? "").trim();
  const temMidia = Boolean(postagem?.imagemPath?.trim() || postagem?.anexoPath?.trim());

  return (
    <ModalBase maxWidth={720} onClose={onClose} zIndex={1102}>
      <ModalHeader title="Ver" onClose={onClose} />
      <div
        role="tablist"
        aria-label="Abas da postagem"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ABAS, setAba, (k) => `tab-ver-postagem-rh-${k}`)}
      >
        <FiltroBarTabButton
          id="tab-ver-postagem-rh-ver"
          active={aba === "ver"}
          aria-controls="panel-ver-postagem-rh-ver"
          onClick={() => setAba("ver")}
          icon={<Eye {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Ver
        </FiltroBarTabButton>
        <FiltroBarTabButton
          id="tab-ver-postagem-rh-historico"
          active={aba === "historico"}
          aria-controls="panel-ver-postagem-rh-historico"
          onClick={() => setAba("historico")}
          icon={<Clock {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Histórico
        </FiltroBarTabButton>
      </div>

      <ModalTabPanel active={aba === "ver"} id="panel-ver-postagem-rh-ver" labelledBy="tab-ver-postagem-rh-ver">
        {loadingVer ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
          </div>
        ) : erroVer ? (
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
            {erroVer}
          </div>
        ) : postagem ? (
          <div>
            <CampoLeitura label="Tipo de postagem">
              <TextoOuTraco value={RH_POSTAGEM_TIPO_UI_LABEL[tipoUi]} />
            </CampoLeitura>
            <CampoLeitura label="Status">
              <TextoOuTraco value={postagem.status ? RH_POSTAGEM_STATUS_LABEL[postagem.status] : null} />
            </CampoLeitura>
            {postagem.contentType === "rh_talk" && postagem.numero != null ? (
              <CampoLeitura label="Número">
                <TextoOuTraco value={`#${postagem.numero}`} />
              </CampoLeitura>
            ) : null}
            {postagem.contentType === "comunicado" ? (
              <>
                <CampoLeitura label="Tipo de comunicado">
                  <TextoOuTraco value={postagem.categoriaLabel} />
                </CampoLeitura>
                <CampoLeitura label="Fixado">
                  <TextoOuTraco value={postagem.isPinned ? "Sim" : "Não"} />
                </CampoLeitura>
              </>
            ) : null}
            {postagem.contentType === "documento" && !postagem.normativo ? (
              <CampoLeitura label="Tipo de Política/Normativa">
                <TextoOuTraco value={postagem.categoriaLabel} />
              </CampoLeitura>
            ) : null}
            {postagem.normativo ? (
              <>
                <CampoLeitura label="Tipo de documento">
                  <TextoOuTraco value={postagem.tipoDocumento ? labelTipoDocumentoPortal(postagem.tipoDocumento) : null} />
                </CampoLeitura>
                <CampoLeitura label="Código">
                  <TextoOuTraco value={postagem.codigo} />
                </CampoLeitura>
                <CampoLeitura label="Versão">
                  <TextoOuTraco value={postagem.versao} />
                </CampoLeitura>
                <CampoLeitura label="Área responsável">
                  <TextoOuTraco value={postagem.areaResponsavel} />
                </CampoLeitura>
                <CampoLeitura label="Classificação">
                  <TextoOuTraco value={postagem.classificacao ? labelClassificacaoDocumento(postagem.classificacao) : null} />
                </CampoLeitura>
                <CampoLeitura label="Aplicável a">
                  <TextoOuTraco value={postagem.aplicavelA.length ? postagem.aplicavelA.join(", ") : null} />
                </CampoLeitura>
                <CampoLeitura label="Exige ciência">
                  <TextoOuTraco value={postagem.exigeCiencia ? "Sim" : "Não"} />
                </CampoLeitura>
                <CampoLeitura label="Data de emissão">
                  <TextoOuTraco value={postagem.dataEmissao ? fmtDataPt(postagem.dataEmissao) : null} />
                </CampoLeitura>
                <CampoLeitura label="Elaborado por">
                  <TextoOuTraco value={postagem.elaboradoPor} />
                </CampoLeitura>
                <CampoLeitura label="Revisado por">
                  <TextoOuTraco value={postagem.revisadoPor} />
                </CampoLeitura>
                <CampoLeitura label="Aprovado por">
                  <TextoOuTraco value={postagem.aprovadoPorDoc} />
                </CampoLeitura>
              </>
            ) : null}
            <CampoLeitura label={postagem.contentType === "documento" && postagem.normativo ? "Título do documento" : "Assunto"}>
              <TextoOuTraco value={postagem.titulo || assunto} />
            </CampoLeitura>
            {postagem.normativo ? (
              <CampoLeitura label="Objetivo">
                <TextoOuTraco value={postagem.resumo ?? postagem.introducao} />
              </CampoLeitura>
            ) : postagem.introducao?.trim() ? (
              <CampoLeitura label="Introdução">
                <TextoOuTraco value={postagem.introducao} />
              </CampoLeitura>
            ) : null}
            {!postagem.normativo ? (
              <CampoLeitura label="Descrição">
                {html ? <CorpoHtmlPortalRh html={html} color={t.text} /> : <TextoOuTraco value={null} />}
              </CampoLeitura>
            ) : null}
            {postagem.normativo ? (
              <>
                <CampoLeitura label="PDF">
                  <PdfLeitura path={postagem.anexoPath} nome={postagem.anexoNome} />
                </CampoLeitura>
                <CampoLeitura label="Documentos relacionados">
                  {postagem.relacionados.length === 0 ? (
                    <TextoOuTraco value={null} />
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18, fontFamily: FONT.body, fontSize: 13, color: t.text }}>
                      {postagem.relacionados.map((d, i) => (
                        <li key={`${d.codigo ?? d.titulo}-${i}`}>
                          {[d.codigo, d.titulo, d.versao ? `v${d.versao}` : null].filter(Boolean).join(" — ")}
                        </li>
                      ))}
                    </ul>
                  )}
                </CampoLeitura>
              </>
            ) : (
              <CampoLeitura label="Anexos">
                {temMidia ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT.body }}>
                    {postagem.imagemPath?.trim() ? (
                      <PortalRhAssetLink storagePath={postagem.imagemPath} label="Ver imagem" color={t.text} />
                    ) : null}
                    {postagem.anexoPath?.trim() ? (
                      <PortalRhAssetLink
                        storagePath={postagem.anexoPath}
                        label={postagem.anexoNome?.trim() ? `Ver anexo (${postagem.anexoNome.trim()})` : "Ver anexo"}
                        color={t.text}
                      />
                    ) : null}
                  </div>
                ) : (
                  <TextoOuTraco value={null} />
                )}
              </CampoLeitura>
            )}
            <CampoLeitura label="Criado em">
              <TextoOuTraco value={fmtDataHoraPt(postagem.createdAt)} />
            </CampoLeitura>
            <CampoLeitura label="Publicado em">
              <TextoOuTraco value={fmtDataHoraPt(postagem.publishedAt)} />
            </CampoLeitura>
          </div>
        ) : null}
      </ModalTabPanel>

      <ModalTabPanel active={aba === "historico"} id="panel-ver-postagem-rh-historico" labelledBy="tab-ver-postagem-rh-historico">
        <PainelHistorico loading={loadingHist} erro={erroHist} itens={itens} />
      </ModalTabPanel>
    </ModalBase>
  );
}
