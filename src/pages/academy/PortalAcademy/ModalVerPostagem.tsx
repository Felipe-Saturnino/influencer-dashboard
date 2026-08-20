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
  ACADEMY_POSTAGEM_STATUS_LABEL,
  ACADEMY_POSTAGEM_TIPO_UI_LABEL,
  labelComunicadoFromSlug,
  labelDicaManualFromSlug,
  type AcademyPostagemContentType,
  type AcademyPostagemStatus,
} from "../../../lib/academyPortalWorkflow";
import { fmtDataHoraPortalAcademy } from "../../../lib/academyPortalAutorMeta";
import {
  isVideoPath,
  normalizarAnexosAcademyPortal,
  normalizarImagensAcademyPortal,
  urlAssinadaAcademyPortalAsset,
  type AcademyPortalAnexoRef,
} from "../../../lib/academyPortalPostagemFiles";
import { normalizarJogosMesa } from "../../../lib/academyPortalJogosMesa";
import { PortalAcademyAnexosLista } from "./PortalAcademyAnexosLista";

type AbaVer = "ver" | "historico";

type HistRow = {
  id: string;
  alteracao: string;
  created_at: string;
  created_by: string;
  autor?: { name: string | null } | null;
};

type PostagemLeitura = {
  contentType: AcademyPostagemContentType;
  titulo: string;
  status: AcademyPostagemStatus | null;
  categoriaLabel: string | null;
  introducao: string | null;
  corpo: string;
  jogos: string[];
  codigo: string | null;
  versao: string | null;
  exigeCiencia: boolean | null;
  aplicavelA: string[];
  imagemPaths: string[];
  anexos: AcademyPortalAnexoRef[];
  publishedAt: string | null;
  createdAt: string | null;
};

const ERRO_HISTORICO =
  "Não foi possível carregar o histórico. Se o problema persistir, entre em contato com o suporte.";
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

function MidiaBloco({ paths, titulo }: { paths: string[]; titulo: string }) {
  const { theme: t } = useApp();
  const [urls, setUrls] = useState<(string | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!paths.length) {
      setUrls([]);
      return;
    }
    void Promise.all(paths.map((p) => urlAssinadaAcademyPortalAsset(p))).then((signed) => {
      if (!cancelled) setUrls(signed);
    });
    return () => {
      cancelled = true;
    };
  }, [paths]);

  if (!paths.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {paths.map((path, i) => {
        const url = urls[i];
        if (!url) {
          return (
            <div key={path} style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>
              Carregando…
            </div>
          );
        }
        return isVideoPath(path) ? (
          <video
            key={path}
            src={url}
            controls
            style={{ width: "100%", maxHeight: 360, borderRadius: 10, display: "block", background: "#000" }}
          />
        ) : (
          <img
            key={path}
            src={url}
            alt={titulo}
            style={{
              width: "100%",
              maxHeight: 360,
              objectFit: "contain",
              borderRadius: 10,
              display: "block",
            }}
          />
        );
      })}
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
      <div style={{ textAlign: "center", padding: 24 }}>
        <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
        <div style={{ fontSize: 13, color: t.textMuted, marginTop: 8, fontFamily: FONT.body }}>Carregando…</div>
      </div>
    );
  }
  if (erro) {
    return (
      <div role="alert" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
        {erro}
      </div>
    );
  }
  if (itens.length === 0) {
    return (
      <div style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, textAlign: "center", padding: "20px 0" }}>
        Nenhum registro no histórico.
      </div>
    );
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {itens.map((item) => (
        <li
          key={item.id}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.inputBg,
            fontFamily: FONT.body,
          }}
        >
          <div style={{ fontSize: 13, color: t.text }}>{item.alteracao}</div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>
            {(item.autor?.name ?? "Usuário").trim() || "Usuário"} · {fmtDataHoraPortalAcademy(item.created_at)}
          </div>
        </li>
      ))}
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
  contentType: AcademyPostagemContentType | null;
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
      .from("academy_portal_postagem_status_historico")
      .select("id, alteracao, created_at, created_by")
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .order("created_at", { ascending: false });

    setLoadingHist(false);
    if (error) {
      console.error("[ModalVerPostagem Academy] historico:", error);
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
    const midiaCols =
      "imagem_storage_path, imagem_storage_paths, anexo_storage_path, anexo_nome, anexo_nomes, anexo_storage_paths";
    const catJoin = "categoria:academy_portal_categoria(slug, scope)";
    try {
      let data: unknown = null;
      let error: { message?: string } | null = null;
      if (contentType === "comunicado") {
        const res = await supabase
          .from("academy_portal_comunicado")
          .select(`titulo, corpo, status, published_at, created_at, ${midiaCols}, ${catJoin}`)
          .eq("id", contentId)
          .single();
        data = res.data;
        error = res.error;
      } else if (contentType === "dica") {
        const res = await supabase
          .from("academy_portal_dica")
          .select(`titulo, corpo, status, published_at, created_at, jogo_mesa, ${midiaCols}, ${catJoin}`)
          .eq("id", contentId)
          .single();
        data = res.data;
        error = res.error;
      } else {
        const res = await supabase
          .from("academy_portal_manual")
          .select(
            `titulo, corpo, introducao, status, published_at, created_at, jogo_mesa, codigo, versao, requires_acknowledgment, aplicavel_a, ${midiaCols}, ${catJoin}`,
          )
          .eq("id", contentId)
          .single();
        data = res.data;
        error = res.error;
      }
      if (error || !data) throw error ?? new Error("empty");
      const row = data as {
        titulo: string;
        corpo: string;
        introducao?: string | null;
        status: AcademyPostagemStatus | null;
        published_at: string | null;
        created_at: string | null;
        jogo_mesa?: string | string[] | null;
        codigo?: string | null;
        versao?: string | null;
        requires_acknowledgment?: boolean | null;
        aplicavel_a?: string[] | null;
        imagem_storage_path?: string | null;
        imagem_storage_paths?: string[] | null;
        anexo_storage_path?: string | null;
        anexo_nome?: string | null;
        anexo_nomes?: string[] | null;
        anexo_storage_paths?: string[] | null;
        categoria?: { slug: string; scope: string } | { slug: string; scope: string }[] | null;
      };
      const cat = Array.isArray(row.categoria) ? row.categoria[0] : row.categoria;
      setPostagem({
        contentType,
        titulo: row.titulo,
        status: row.status,
        categoriaLabel:
          contentType === "comunicado"
            ? labelComunicadoFromSlug(cat?.slug ?? "")
            : labelDicaManualFromSlug(cat?.slug ?? ""),
        introducao: row.introducao ?? null,
        corpo: row.corpo ?? "",
        jogos: normalizarJogosMesa(row.jogo_mesa),
        codigo: row.codigo?.trim() ?? null,
        versao: row.versao?.trim() ?? null,
        exigeCiencia: contentType === "manual" ? Boolean(row.requires_acknowledgment) : null,
        aplicavelA: row.aplicavel_a?.length ? [...row.aplicavel_a] : [],
        imagemPaths: normalizarImagensAcademyPortal(row),
        anexos: normalizarAnexosAcademyPortal(row),
        publishedAt: row.published_at,
        createdAt: row.created_at,
      });
    } catch (error) {
      console.error("[ModalVerPostagem Academy] leitura:", error);
      setErroVer(ERRO_LEITURA);
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

  if (!open) return null;

  const html = (postagem?.corpo ?? "").trim();

  return (
    <ModalBase maxWidth={720} onClose={onClose} zIndex={1100}>
      <ModalHeader title="Ver" onClose={onClose} />
      <div
        role="tablist"
        aria-label="Abas da postagem"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
        onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ABAS, setAba, (k) => `tab-ver-postagem-academy-${k}`)}
      >
        <FiltroBarTabButton
          id="tab-ver-postagem-academy-ver"
          active={aba === "ver"}
          aria-controls="panel-ver-postagem-academy-ver"
          onClick={() => setAba("ver")}
          icon={<Eye {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Ver
        </FiltroBarTabButton>
        <FiltroBarTabButton
          id="tab-ver-postagem-academy-historico"
          active={aba === "historico"}
          aria-controls="panel-ver-postagem-academy-historico"
          onClick={() => setAba("historico")}
          icon={<Clock {...FILTRO_BAR_TAB_ICON_PROPS} />}
        >
          Histórico
        </FiltroBarTabButton>
      </div>

      <ModalTabPanel active={aba === "ver"} id="panel-ver-postagem-academy-ver" labelledBy="tab-ver-postagem-academy-ver">
        {loadingVer ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden />
            <div style={{ fontSize: 13, color: t.textMuted, marginTop: 8, fontFamily: FONT.body }}>Carregando…</div>
          </div>
        ) : erroVer ? (
          <div role="alert" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body }}>
            {erroVer}
          </div>
        ) : postagem ? (
          <div>
            <CampoLeitura label="Tipo de postagem">
              <TextoOuTraco value={ACADEMY_POSTAGEM_TIPO_UI_LABEL[postagem.contentType]} />
            </CampoLeitura>
            <CampoLeitura label="Status">
              <TextoOuTraco value={postagem.status ? ACADEMY_POSTAGEM_STATUS_LABEL[postagem.status] : null} />
            </CampoLeitura>
            <CampoLeitura label="Tipo">
              <TextoOuTraco value={postagem.categoriaLabel} />
            </CampoLeitura>
            {postagem.contentType === "manual" ? (
              <>
                <CampoLeitura label="Código">
                  <TextoOuTraco value={postagem.codigo} />
                </CampoLeitura>
                <CampoLeitura label="Versão">
                  <TextoOuTraco value={postagem.versao} />
                </CampoLeitura>
                <CampoLeitura label="Exige ciência do colaborador">
                  <TextoOuTraco value={postagem.exigeCiencia ? "Sim" : "Não"} />
                </CampoLeitura>
                {postagem.exigeCiencia ? (
                  <CampoLeitura label="Aplicável a">
                    <TextoOuTraco value={postagem.aplicavelA.length ? postagem.aplicavelA.join(", ") : null} />
                  </CampoLeitura>
                ) : null}
              </>
            ) : null}
            {postagem.contentType === "dica" || postagem.contentType === "manual" ? (
              <CampoLeitura label="Qual Jogo?">
                <TextoOuTraco value={postagem.jogos.length ? postagem.jogos.join(", ") : null} />
              </CampoLeitura>
            ) : null}
            <CampoLeitura label="Título">
              <TextoOuTraco value={postagem.titulo || assunto} />
            </CampoLeitura>
            {postagem.contentType === "manual" ? (
              <CampoLeitura label="Introdução">
                <TextoOuTraco value={postagem.introducao} />
              </CampoLeitura>
            ) : null}
            <CampoLeitura label="Descrição">
              {html ? <CorpoHtmlPortalRh html={html} color={t.text} /> : <TextoOuTraco value={null} />}
            </CampoLeitura>
            <CampoLeitura label="Imagem e vídeo">
              {postagem.imagemPaths.length ? (
                <MidiaBloco paths={postagem.imagemPaths} titulo={postagem.titulo} />
              ) : (
                <TextoOuTraco value={null} />
              )}
            </CampoLeitura>
            <CampoLeitura label="Anexos">
              {postagem.anexos.length ? (
                <PortalAcademyAnexosLista
                  anexos={postagem.anexos}
                  color={t.text}
                  mostrarNomeAnexo={postagem.contentType !== "comunicado"}
                />
              ) : (
                <TextoOuTraco value={null} />
              )}
            </CampoLeitura>
            <CampoLeitura label="Criado em">
              <TextoOuTraco value={fmtDataHoraPortalAcademy(postagem.createdAt)} />
            </CampoLeitura>
            <CampoLeitura label="Publicado em">
              <TextoOuTraco value={fmtDataHoraPortalAcademy(postagem.publishedAt)} />
            </CampoLeitura>
          </div>
        ) : null}
      </ModalTabPanel>

      <ModalTabPanel
        active={aba === "historico"}
        id="panel-ver-postagem-academy-historico"
        labelledBy="tab-ver-postagem-academy-historico"
      >
        <PainelHistorico loading={loadingHist} erro={erroHist} itens={itens} />
      </ModalTabPanel>
    </ModalBase>
  );
}
