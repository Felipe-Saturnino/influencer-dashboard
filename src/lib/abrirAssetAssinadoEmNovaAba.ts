import { prefereAssetMesmaAba } from "./platformDetect";

/**
 * Abre URL assinada (Storage) em nova aba.
 * Abre `about:blank` **no mesmo clique** (gesto síncrono) — necessário no Safari/iOS,
 * onde `window.open` após `await` é bloqueado em silêncio.
 */

export type AbrirAssetAssinadoResultado = "ok" | "popup_bloqueado" | "falha_url";

/** iOS: mesma aba (pop-up bloqueado). Demais: nova aba com about:blank síncrono. */
export async function abrirAssetAssinadoComFallback(
  obterUrl: () => Promise<string | null>,
): Promise<AbrirAssetAssinadoResultado> {
  if (prefereAssetMesmaAba()) {
    try {
      const url = await obterUrl();
      if (!url) return "falha_url";
      window.location.assign(url);
      return "ok";
    } catch (e) {
      console.error("[abrirAssetAssinadoComFallback]", e);
      return "falha_url";
    }
  }
  return abrirAssetAssinadoEmNovaAba(obterUrl);
}

export async function abrirAssetAssinadoEmNovaAba(
  obterUrl: () => Promise<string | null>,
): Promise<AbrirAssetAssinadoResultado> {
  const win = window.open("about:blank", "_blank");
  if (!win) return "popup_bloqueado";
  try {
    const url = await obterUrl();
    if (!url) {
      win.close();
      return "falha_url";
    }
    win.location.href = url;
    return "ok";
  } catch (e) {
    console.error("[abrirAssetAssinadoEmNovaAba]", e);
    try {
      win.close();
    } catch {
      /* ignore */
    }
    return "falha_url";
  }
}

export const ERRO_ABRIR_ASSET_POPUP =
  "Não foi possível abrir o arquivo: o navegador bloqueou a nova aba. Permita pop-ups para este site e tente de novo.";

export const ERRO_ABRIR_ASSET_URL =
  "Não foi possível abrir o arquivo. Se o problema persistir, entre em contato com o suporte.";
