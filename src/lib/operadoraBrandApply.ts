import { validarBrandguide, cssDerivadasBrand, type BrandValidated } from "./brandguideValidation";
import {
  readOperadoraBrandCache,
  writeOperadoraBrandCache,
  type OperadoraBrandSnapshot,
} from "./operadoraBrandCache";
import {
  fetchOperadoraBrandSnapshot,
  operadoraBrandSnapshotHasVisual,
} from "./operadoraBrandLoad";

/** Tokens de gráfico estáveis (não whitelabel) — mapeados em `--brand-extra*` / danger / success. */
export const CHART_SEMANTIC = {
  extra1: "#1e36f8",
  extra2: "#22c55e",
  extra3: "#f59e0b",
  extra4: "#e84025",
} as const;

export type OperadoraBrandRow = {
  brand_action?: string | null;
  brand_contrast?: string | null;
  brand_bg?: string | null;
  brand_text?: string | null;
  logo_url?: string | null;
};

export type OperadoraBrandState = {
  nome: string | null;
  logo_url: string | null;
  font_url: string | null;
  brand_bg: string | null;
  home_template: string | null;
};

/** Injeta tokens Opção C + aliases legados (`--brand-primary` = `--brand-action`, etc.). */
export function injectBrandCss(validated: BrandValidated) {
  const root = document.documentElement.style;
  const der = cssDerivadasBrand(validated);
  Object.entries(der).forEach(([k, v]) => root.setProperty(k, v));
  root.setProperty("--brand-action", validated.action);
  root.setProperty("--brand-contrast", validated.contrast);
  root.setProperty("--brand-bg", validated.bg);
  root.setProperty("--brand-text", validated.text);
  root.setProperty("--brand-primary", validated.action);
  root.setProperty("--brand-secondary", validated.contrast);
  root.setProperty("--brand-accent", validated.contrast);
  root.setProperty("--brand-background", validated.bg);
  const iconMix = der["--brand-icon-color"]!;
  root.setProperty("--brand-icon-color", iconMix);
  root.setProperty("--brand-icon", iconMix);
  (Object.keys(CHART_SEMANTIC) as (keyof typeof CHART_SEMANTIC)[]).forEach((k) => {
    root.setProperty(`--brand-${k}`, CHART_SEMANTIC[k]);
  });
  root.setProperty("--brand-danger", CHART_SEMANTIC.extra4);
  root.setProperty("--brand-success", CHART_SEMANTIC.extra2);
}

/** Reseta para paleta Spin validada (usuário não operador ou sem brand). */
export function aplicarBrandguideReset() {
  injectBrandCss(validarBrandguide({}));
}

export function aplicarBrandguideOperadora(data: OperadoraBrandRow | null | undefined) {
  const validated = validarBrandguide({
    action: data?.brand_action,
    contrast: data?.brand_contrast,
    bg: data?.brand_bg,
    text: data?.brand_text,
  });
  if (validated.warnings.length) console.warn("[brandguide]", validated.warnings);
  injectBrandCss(validated);
}

export function operadoraBrandFromSnapshot(snapshot: OperadoraBrandSnapshot): OperadoraBrandState {
  return {
    nome: snapshot.nome,
    logo_url: snapshot.logo_url,
    font_url: snapshot.font_url,
    brand_bg: snapshot.brand_bg,
    home_template: snapshot.home_template,
  };
}

export function applyOperadoraBrandSnapshot(snapshot: OperadoraBrandSnapshot): void {
  if (operadoraBrandSnapshotHasVisual(snapshot)) {
    aplicarBrandguideOperadora(snapshot);
  } else {
    aplicarBrandguideReset();
  }
}

/** Cache síncrono + fetch (opcional em background) para evitar flash Spin → operadora. */
export async function syncOperadoraBrandState(
  slug: string,
  setBrand: (b: OperadoraBrandState | null) => void,
  setReady: (v: boolean) => void,
  opts?: { awaitNetwork?: boolean },
): Promise<void> {
  const cached = readOperadoraBrandCache(slug);

  if (cached) {
    applyOperadoraBrandSnapshot(cached);
    setBrand(operadoraBrandFromSnapshot(cached));
    setReady(true);
  } else if (opts?.awaitNetwork !== false) {
    setReady(false);
  }

  const applyFresh = (snapshot: OperadoraBrandSnapshot) => {
    writeOperadoraBrandCache(snapshot);
    applyOperadoraBrandSnapshot(snapshot);
    setBrand(operadoraBrandFromSnapshot(snapshot));
    setReady(true);
  };

  const onNetworkError = () => {
    if (!cached) {
      aplicarBrandguideReset();
      setBrand(null);
    }
    setReady(true);
  };

  if (opts?.awaitNetwork === false) {
    void fetchOperadoraBrandSnapshot(slug)
      .then((fresh) => {
        if (fresh) applyFresh(fresh);
        else onNetworkError();
      })
      .catch(onNetworkError);
    return;
  }

  try {
    const fresh = await fetchOperadoraBrandSnapshot(slug);
    if (fresh) applyFresh(fresh);
    else onNetworkError();
  } catch {
    onNetworkError();
  }
}
