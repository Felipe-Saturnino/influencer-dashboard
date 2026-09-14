import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { FONT, FONT_TITLE } from "../../constants/theme";
import { useDisableAppUiZoom } from "../../hooks/useDisableAppUiZoom";
import {
  PAINEL_NOTICIAS_BG,
  PAINEL_NOTICIAS_FETCH_LIMIT,
  PAINEL_NOTICIAS_POLL_MS,
  PAINEL_NOTICIAS_RELOAD_MS,
  PAINEL_NOTICIAS_SLIDE_MS,
} from "../../lib/painelNoticias";
import {
  calcularPainelNoticiasExibicao,
  prepararExibicaoPainelNoticia,
  type PainelNoticiaRow,
} from "../../lib/painelNoticiasDisplay";

const VAZIO_MSG = "Aguardando notícias…";
const ERRO_MSG = "Não foi possível carregar as notícias. Tentando novamente…";
const POLL_FALHA_MSG = "Atualização pausada — tentando novamente…";
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

function usePainelNoticiasTituloAba() {
  useEffect(() => {
    const anterior = document.title;
    document.title = "Painel de Notícias";
    return () => {
      document.title = anterior;
    };
  }, []);
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

function exibirNoticia(row: PainelNoticiaRow) {
  return prepararExibicaoPainelNoticia(row);
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
            display: "-webkit-box",
            WebkitLineClamp: 6,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
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

function PainelNoticiasCarrossel({
  itens,
  paused,
}: {
  itens: PainelNoticiaRow[];
  paused: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [saindo, setSaindo] = useState(false);
  const idxRef = useRef(0);
  const itensRef = useRef(itens);
  const timerRef = useRef<number | null>(null);
  const reduceMotion = usePrefersReducedMotion();
  const transitionMs = reduceMotion ? 0 : SLIDE_TRANSITION_MS;

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
    if (paused || itens.length <= 1) return;
    timerRef.current = window.setTimeout(() => {
      setSaindo(true);
    }, PAINEL_NOTICIAS_SLIDE_MS);
  }, [itens.length, limparTimer, paused]);

  useEffect(() => {
    if (paused) {
      limparTimer();
      setSaindo(false);
      return undefined;
    }
    if (saindo) return undefined;
    agendarProximo();
    return limparTimer;
  }, [idx, saindo, paused, agendarProximo, limparTimer]);

  useEffect(() => {
    if (!saindo || paused) return undefined;
    if (transitionMs === 0) {
      const lista = itensRef.current;
      if (lista.length > 1) {
        syncIdx((idxRef.current + 1) % lista.length);
      }
      setSaindo(false);
      return undefined;
    }
    const t = window.setTimeout(() => {
      const lista = itensRef.current;
      if (lista.length <= 1) {
        setSaindo(false);
        return;
      }
      syncIdx((idxRef.current + 1) % lista.length);
      setSaindo(false);
    }, transitionMs);
    return () => window.clearTimeout(t);
  }, [saindo, paused, syncIdx, transitionMs]);

  const atual = itens[idx];
  const proximo = itens.length > 1 ? itens[(idx + 1) % itens.length] : null;
  if (!atual) return null;

  const atualExibir = exibirNoticia(atual);
  const proximoExibir = proximo ? exibirNoticia(proximo) : null;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Painel de notícias"
      style={{ position: "relative", minHeight: "100dvh", overflow: "hidden" }}
    >
      {!saindo && (
        <div style={{ ...slideShellStyle, transform: "translateY(0)", opacity: 1 }}>
          <PainelNoticiaConteudo titulo={atualExibir.titulo} detalhe={atualExibir.detalhe} />
        </div>
      )}
      {saindo && proximo && proximoExibir && (
        <>
          <div
            className={reduceMotion ? undefined : "painel-noticia-slide-sai"}
            style={slideShellStyle}
          >
            <PainelNoticiaConteudo titulo={atualExibir.titulo} detalhe={atualExibir.detalhe} />
          </div>
          <div
            className={reduceMotion ? undefined : "painel-noticia-slide-entra"}
            style={slideShellStyle}
          >
            <PainelNoticiaConteudo titulo={proximoExibir.titulo} detalhe={proximoExibir.detalhe} />
          </div>
        </>
      )}
    </div>
  );
}

export default function PainelNoticiasPage() {
  usePainelNoticiasViewportBg();
  usePainelNoticiasNoIndex();
  usePainelNoticiasTituloAba();
  useDisableAppUiZoom(true);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [itens, setItens] = useState<PainelNoticiaRow[]>([]);
  const [abaOculta, setAbaOculta] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  const loadGenRef = useRef(0);

  const carregar = useCallback(async (signal?: AbortSignal) => {
    const gen = ++loadGenRef.current;
    let query = supabase
      .from("painel_noticia")
      .select("id, titulo, resumo, visivel_desde, visivel_ate")
      .eq("passou_filtro", true)
      .order("visivel_desde", { ascending: false })
      .limit(PAINEL_NOTICIAS_FETCH_LIMIT);

    if (signal) {
      query = query.abortSignal(signal);
    }

    const { data, error } = await query;

    if (signal?.aborted || gen !== loadGenRef.current) return;

    if (error) {
      console.error("[PainelNoticias]", error.message);
      setErro(true);
      setLoading(false);
      return;
    }
    setErro(false);
    setItens(calcularPainelNoticiasExibicao((data ?? []) as PainelNoticiaRow[]));
    setLoading(false);
  }, []);

  useEffect(() => {
    let abort: AbortController | null = null;
    let pollId: number | null = null;
    let reloadId: number | null = null;

    const limparTimers = () => {
      if (pollId != null) {
        window.clearInterval(pollId);
        pollId = null;
      }
      if (reloadId != null) {
        window.clearInterval(reloadId);
        reloadId = null;
      }
    };

    const dispararCarga = () => {
      abort?.abort();
      abort = new AbortController();
      void carregar(abort.signal);
    };

    const iniciarTimers = () => {
      limparTimers();
      pollId = window.setInterval(() => {
        dispararCarga();
      }, PAINEL_NOTICIAS_POLL_MS);
      reloadId = window.setInterval(() => {
        window.location.reload();
      }, PAINEL_NOTICIAS_RELOAD_MS);
    };

    const onVisibility = () => {
      const hidden = document.hidden;
      setAbaOculta(hidden);
      if (hidden) {
        limparTimers();
        abort?.abort();
        loadGenRef.current += 1;
      } else {
        dispararCarga();
        iniciarTimers();
      }
    };

    dispararCarga();
    if (!document.hidden) iniciarTimers();
    else setAbaOculta(true);

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      limparTimers();
      abort?.abort();
      loadGenRef.current += 1;
    };
  }, [carregar]);

  const mostrarFalhaPoll = erro && itens.length > 0;

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
        <PainelNoticiasCarrossel itens={itens} paused={abaOculta} />
      )}
      {mostrarFalhaPoll ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: "clamp(12px, 2.5vh, 28px)",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "clamp(0.85rem, 1.4vw, 1.1rem)",
            fontFamily: FONT.body,
            pointerEvents: "none",
            padding: "0 16px",
          }}
        >
          {POLL_FALHA_MSG}
        </div>
      ) : null}
    </div>
  );
}
