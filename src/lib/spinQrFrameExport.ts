import QRCode from "qrcode";

export type SpinQrFrameVariant = "dark" | "light";

const FRAME_W = 600;
const FRAME_H = 760;
const R_FRAME = 48;
const GAP = 48;
const QR_BOX = 296;
const QR_BOX_R = 28;
const LOGO_MAX_W = 400;
const CORNER = 40;
const STROKE = 6;

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawMainGradient(ctx: CanvasRenderingContext2D, variant: SpinQrFrameVariant) {
  const cx = FRAME_W / 2;
  const cy = FRAME_H / 2;
  const len = Math.hypot(FRAME_W, FRAME_H) / 2;
  const rad = (160 * Math.PI) / 180;
  const vx = Math.sin(rad);
  const vy = -Math.cos(rad);
  const g = ctx.createLinearGradient(cx - vx * len, cy - vy * len, cx + vx * len, cy + vy * len);
  g.addColorStop(0, "#4a3082");
  g.addColorStop(1, variant === "dark" ? "#1e36f8" : "#e94025");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FRAME_W, FRAME_H);
}

function drawVignette(ctx: CanvasRenderingContext2D, variant: SpinQrFrameVariant) {
  const g = ctx.createLinearGradient(0, 0, 0, FRAME_H);
  if (variant === "dark") {
    g.addColorStop(0, "rgba(0,0,0,0.18)");
    g.addColorStop(0.5, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.22)");
  } else {
    g.addColorStop(0, "rgba(0,0,0,0.10)");
    g.addColorStop(0.5, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.18)");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FRAME_W, FRAME_H);
}

function drawInnerBorder(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  roundRectPath(ctx, 1, 1, FRAME_W - 2, FRAME_H - 2, R_FRAME - 1);
  ctx.stroke();
}

function drawTextLogo(ctx: CanvasRenderingContext2D, cx: number, top: number): number {
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";
  ctx.font = '900 104px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillText("SPIN", cx, top);
  ctx.globalAlpha = 0.7;
  ctx.font = '700 26px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.letterSpacing = "0.22em";
  ctx.fillText("GAMING", cx, top + 88);
  ctx.letterSpacing = "0";
  ctx.globalAlpha = 1;
  return 140;
}

async function loadSpinLogo(baseUrl: string): Promise<HTMLImageElement | null> {
  const url = `${baseUrl}branding/logo-spin-gaming-white.png`;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Cantos em “L” brancos levemente para fora da caixa do QR (equivalente ao template HTML). */
function drawQrCorners(ctx: CanvasRenderingContext2D, bx: number, by: number) {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = STROKE;
  ctx.lineCap = "square";
  const o = 6;
  const c = CORNER;

  ctx.beginPath();
  ctx.moveTo(bx - o + c, by - o);
  ctx.lineTo(bx - o, by - o);
  ctx.lineTo(bx - o, by - o + c);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bx + QR_BOX + o - c, by - o);
  ctx.lineTo(bx + QR_BOX + o, by - o);
  ctx.lineTo(bx + QR_BOX + o, by - o + c);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bx + QR_BOX + o - c, by + QR_BOX + o);
  ctx.lineTo(bx + QR_BOX + o, by + QR_BOX + o);
  ctx.lineTo(bx + QR_BOX + o, by + QR_BOX + o - c);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bx - o + c, by + QR_BOX + o);
  ctx.lineTo(bx - o, by + QR_BOX + o);
  ctx.lineTo(bx - o, by + QR_BOX + o - c);
  ctx.stroke();
}

/**
 * Canvas 600×760 — quadro Spin (gradiente dark ou light) + logo + QR real do link.
 */
export async function renderSpinBrandedQrToCanvas(
  link: string,
  variant: SpinQrFrameVariant,
  baseUrl: string = import.meta.env.BASE_URL || "/"
): Promise<HTMLCanvasElement> {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  const canvas = document.createElement("canvas");
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não disponível.");

  ctx.save();
  roundRectPath(ctx, 0, 0, FRAME_W, FRAME_H, R_FRAME);
  ctx.clip();

  drawMainGradient(ctx, variant);
  drawVignette(ctx, variant);

  ctx.restore();

  drawInnerBorder(ctx);

  const logo = await loadSpinLogo(normalizedBase);
  let logoDrawW: number;
  let logoDrawH: number;
  if (logo && logo.complete && logo.naturalWidth > 0) {
    logoDrawW = Math.min(LOGO_MAX_W, logo.naturalWidth);
    logoDrawH = (logo.naturalHeight / logo.naturalWidth) * logoDrawW;
  } else {
    logoDrawW = LOGO_MAX_W;
    logoDrawH = 140;
  }

  const blockH = logoDrawH + GAP + QR_BOX;
  const startY = (FRAME_H - blockH) / 2;
  const cx = FRAME_W / 2;

  if (logo && logo.complete && logo.naturalWidth > 0) {
    ctx.drawImage(logo, cx - logoDrawW / 2, startY, logoDrawW, logoDrawH);
  } else {
    drawTextLogo(ctx, cx, startY);
  }

  const qrTop = startY + logoDrawH + GAP;
  const qrLeft = (FRAME_W - QR_BOX) / 2;

  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, qrLeft, qrTop, QR_BOX, QR_BOX, QR_BOX_R);
  ctx.fill();

  drawQrCorners(ctx, qrLeft, qrTop);

  const qrCanvas = document.createElement("canvas");
  const qrInner = 232;
  await QRCode.toCanvas(qrCanvas, link, {
    width: qrInner,
    margin: 1,
    color: { dark: "#14141a", light: "#ffffff" },
  });

  const pad = (QR_BOX - qrInner) / 2;
  ctx.drawImage(qrCanvas, qrLeft + pad, qrTop + pad);

  return canvas;
}

/** Pré-visualização na UI (redimensiona o quadro completo). */
export async function buildSpinBrandedQrPreviewDataUrl(
  link: string,
  variant: SpinQrFrameVariant,
  maxWidth = 280,
  baseUrl: string = import.meta.env.BASE_URL || "/"
): Promise<string> {
  const src = await renderSpinBrandedQrToCanvas(link, variant, baseUrl);
  const w = Math.round(maxWidth);
  const h = Math.round((FRAME_H / FRAME_W) * maxWidth);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Canvas 2D não disponível.");
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(src, 0, 0, w, h);
  return out.toDataURL("image/png");
}

/**
 * PNG 600×760 — quadro Spin (gradiente dark ou light) + logo + QR real do link.
 */
export async function buildSpinBrandedQrPngBlob(
  link: string,
  variant: SpinQrFrameVariant,
  baseUrl: string = import.meta.env.BASE_URL || "/"
): Promise<Blob> {
  const canvas = await renderSpinBrandedQrToCanvas(link, variant, baseUrl);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Falha ao gerar PNG."));
    }, "image/png");
  });
}
