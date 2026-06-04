import { useCallback, useEffect, useRef, useState } from "react";
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
  formatDetalhePainelNoticia,
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
  return formatDetalhePainelNoticia(row.resumo);
}

const slideShellStyle = {
  position: "absolute" as const,
  inset: 0,
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "center",
  alignItems: "center",
  padding: "clamp(24px, 6vw, 64px)",
  boxSizing: "border-box" as const,
};

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
            whiteSpace: "pre-line",
          }}
        >
          {detalhe}
        </p>
      )}
    </>
  );
}

function preservarIndiceAtual(
  listaAnterior: PainelNoticiaRow[],
  indiceAnterior: number,
  novaLista: PainelNoticiaRow[],
): number {
  if (novaLista.length === 0) return 0;
  const idAtual = listaAnterior[indiceAnterior]?.id;
  if (idAtual) {
    const encontrado = novaLista.findIndex((x) => x.id === idAtual);
    if (encontrado >= 0) return encontrado;
  }
  return Math.min(indiceAnterior, novaLista.length - 1);
}

function PainelNoticiasCarrossel({ itens }: { itens: PainelNoticiaRow[] }) {
  const [idx, setIdx] = useState(0);
  const [saindo, setSaindo] = useState(false);
  const idxRef = useRef(0);
  const itensRef = useRef(itens);
  const timerRef = useRef<number | null>(null);

  const syncIdx = useCallback((next: number) => {
    idxRef.current = next;
    setIdx(next);
  }, []);

  useEffect(() => {
    const prev = itensRef.current;
    itensRef.current = itens;
    syncIdx(preservarIndiceAtual(prev, idxRef.current, itens));
  }, [itens, syncIdx]);

  const limparTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const agendarProximo = useCallback(() => {
    limparTimer();
    if (itens.length <= 1) return;
    timerRef.current = window.setTimeout(() => {
      setSaindo(true);
    }, PAINEL_NOTICIAS_SLIDE_MS);
  }, [itens.length, limparTimer]);

  useEffect(() => {
    if (saindo) return undefined;
    agendarProximo();
    return limparTimer;
  }, [idx, saindo, agendarProximo, limparTimer]);

  useEffect(() => {
    if (!saindo) return undefined;
    const t = window.setTimeout(() => {
      const lista = itensRef.current;
      if (lista.length <= 1) {
        setSaindo(false);
        return;
      }
      syncIdx((idxRef.current + 1) % lista.length);
      setSaindo(false);
    }, SLIDE_TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [saindo, syncIdx]);

  const atual = itens[idx];
  const proximo = itens.length > 1 ? itens[(idx + 1) % itens.length] : null;
  if (!atual) return null;

  const animBase = `${SLIDE_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Painel de notícias"
      style={{ position: "relative", minHeight: "100dvh", overflow: "hidden" }}
    >
      {!saindo && (
        <div style={{ ...slideShellStyle, transform: "translateY(0)", opacity: 1 }}>
          <PainelNoticiaConteudo titulo={atual.titulo} detalhe={detalheNoticia(atual)} />
        </div>
      )}
      {saindo && proximo && (
        <>
          <div
            style={{
              ...slideShellStyle,
              animation: `painelNoticiaSai ${animBase}`,
            }}
          >
            <PainelNoticiaConteudo titulo={atual.titulo} detalhe={detalheNoticia(atual)} />
          </div>
          <div
            style={{
              ...slideShellStyle,
              animation: `painelNoticiaEntra ${animBase}`,
            }}
          >
            <PainelNoticiaConteudo titulo={proximo.titulo} detalhe={detalheNoticia(proximo)} />
          </div>
        </>
      )}
      <style>{`
        @keyframes painelNoticiaSai {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-100%); opacity: 0; }
        }
        @keyframes painelNoticiaEntra {
          from { transform: translateY(100%); opacity: 0.35; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function PainelNoticiasPage() {
  usePainelNoticiasViewportBg();
  usePainelNoticiasNoIndex();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [itens, setItens] = useState<PainelNoticiaRow[]>([]);

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
    setItens(calcularPainelNoticiasExibicao((data ?? []) as PainelNoticiaRow[]));
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
      ) : (
        <PainelNoticiasCarrossel itens={itens} />
      )}
    </div>
  );
}
