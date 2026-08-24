/**
 * Detecção de plataforma/navegador para fallbacks cross-OS (vídeo inline iOS, cache, PDFs).
 * iOS inclui Safari, Chrome (CriOS), Firefox (FxiOS) e Edge (EdgiOS) — todos WebKit no iPhone/iPad.
 */

/** iPhone, iPod, iPad clássico ou iPadOS 13+ (MacIntel + touch). */
export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Player inline / mesma aba — obrigatório em todo iOS; Safari macOS também beneficia em vídeo. */
export function prefereMidiaInlineNoDispositivo(): boolean {
  return isIOSDevice();
}

/** Abrir PDF/asset na mesma aba — pop-up bloqueado na maioria dos browsers mobile. */
export function prefereAssetMesmaAba(): boolean {
  return isIOSDevice();
}
