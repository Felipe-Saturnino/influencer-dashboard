import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { FONT, FONT_TITLE } from "../../constants/theme";
import {
  PAINEL_NOTICIAS_BG,
  PAINEL_NOTICIAS_POLL_MS,
  PAINEL_NOTICIAS_RELOAD_MS,
  PAINEL_NOTICIAS_SLIDE_MS,
} from "../../lib/painelNoticias";
import {
  calcularPainelNoticiasExibicao,
  stripHtmlPainelNoticia,
  type PainelNoticiaRow,
} from "../../lib/painelNoticiasDisplay";

const VAZIO_MSG = "Aguardando notícias…";
const ERRO_MSG = "Não foi possível carregar as notícias. Tentando novamente…";
const SLIDE_TRANSITION_MS = 900;

function usePainelNoticiasViewportBg() {
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
    const bg = PAINEL_NOTICIAS_BG;
    html.style.background = bg;
    html.style.minHeight = "100%";
    body.style.background = bg;
    body.style.minHeight = "100dvh";
    if (root) {
      root.style.background = bg;
      root.style.minHeight = "100dvh";
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

function usePainelNoticiasNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);
}

function detalheNoticia(row: PainelNoticiaRow): string {
  return row.resumo ? stripHtmlPainelNoticia(row.resumo) : "";
}

function PainelNoticiaConteudo({ titulo, detalhe }: { titulo: string; detalhe: string }) {
  return (
    <>
      <h1
        style={{
          margin: 0,
          marginBottom: "clamp(16px, 3vh, 32px)",
          fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
          fontWeight: 800,
          lineHeight: 1.15,
          textAlign: "center",
          color: "#f5f5f5",
          fontFamily: FONT_TITLE,
          maxWidth: "min(1200px, 92vw)",
          wordBreak: "break-word",
        }}
      >
        {titulo}
      </h1>
      {detalhe.length > 0 && (
        <p
          style={{
            margin: 0,
            fontSize: "clamp(1.75rem, 3.2vw, 2.75rem)",
            fontWeight: 400,
            lineHeight: 1.35,
            textAlign: "center",
            color: "#c4c4c4",
            fontFamily: FONT.body,
            maxWidth: "min(1100px, 90vw)",
            wordBreak: "break-word",
          }}
        >
          {detalhe}
        </p>
      )}
    </>
  );
}

export default function PainelNoticiasPage() {
  usePainelNoticiasViewportBg();
  usePainelNoticiasNoIndex();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [itens, setItens] = useState<PainelNoticiaRow[]>([]);
  const [idx, setIdx] = useState(0);
  const [transicao, setTransicao] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("painel_noticia")
      .select("id, titulo, resumo, visivel_desde, visivel_ate")
      .eq("passou_filtro", true)
      .order("visivel_desde", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[PainelNoticias]", error.message);
      setErro(true);
      return;
    }
    setErro(false);
    const exibir = calcularPainelNoticiasExibicao((data ?? []) as PainelNoticiaRow[]);
    setItens(exibir);
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregar();
    const poll = window.setInterval(() => {
      void carregar();
    }, PAINEL_NOTICIAS_POLL_MS);
    const reload = window.setInterval(() => {
      window.location.reload();
    }, PAINEL_NOTICIAS_RELOAD_MS);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(reload);
    };
  }, [carregar]);

  useEffect(() => {
    setIdx(0);
  }, [itens]);

  useEffect(() => {
    if (itens.length <= 1) return undefined;
    const tick = window.setInterval(() => {
      setTransicao(true);
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % itens.length);
        setTransicao(false);
      }, SLIDE_TRANSITION_MS);
    }, PAINEL_NOTICIAS_SLIDE_MS);
    return () => window.clearInterval(tick);
  }, [itens.length]);

  const atual = itens[idx];
  const proximo = itens.length > 1 ? itens[(idx + 1) % itens.length] : null;

  return (
    <div
      className="app-full-viewport-zoomed"
      style={{
        minHeight: "100dvh",
        background: PAINEL_NOTICIAS_BG,
        overflow: "hidden",
        fontFamily: FONT.body,
        position: "relative",
      }}
    >
      {loading ? (
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: "#c4c4c4",
          }}
        >
          <Loader2
            size={28}
            className="app-lucide-spin"
            color="var(--brand-primary, #7c3aed)"
            aria-hidden
          />
          <span style={{ fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)" }}>Carregando…</span>
        </div>
      ) : itens.length === 0 ? (
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            textAlign: "center",
            color: "#c4c4c4",
            fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
          }}
        >
          {erro ? ERRO_MSG : VAZIO_MSG}
        </div>
      ) : atual ? (
        <div
          role="region"
          aria-live="polite"
          aria-label="Painel de notícias"
          style={{ position: "relative", minHeight: "100dvh", overflow: "hidden" }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "clamp(24px, 6vw, 64px)",
              boxSizing: "border-box",
              transform: transicao ? "translateY(-100%)" : "translateY(0)",
              opacity: transicao ? 0 : 1,
              transition: `transform ${SLIDE_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${SLIDE_TRANSITION_MS}ms ease`,
            }}
          >
            <PainelNoticiaConteudo titulo={atual.titulo} detalhe={detalheNoticia(atual)} />
          </div>
          {transicao && proximo && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "clamp(24px, 6vw, 64px)",
                boxSizing: "border-box",
                transform: "translateY(0)",
                animation: `painelNoticiaEntra ${SLIDE_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
              }}
            >
              <PainelNoticiaConteudo titulo={proximo.titulo} detalhe={detalheNoticia(proximo)} />
            </div>
          )}
          <style>{`
            @keyframes painelNoticiaEntra {
              from { transform: translateY(100%); opacity: 0.4; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      ) : null}
    </div>
  );
}
