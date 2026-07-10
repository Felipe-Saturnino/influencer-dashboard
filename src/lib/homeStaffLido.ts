/**
 * Persistência de «Li e Ocultar» na Home staff (Informações + Blogueiro Spin).
 * No próximo acesso o card inicia recolhido; expandir na sessão não limpa o lido.
 */

const STORAGE_PREFIX = "home-staff-lido-v1:";

export type HomeStaffLidoBucket = "informativo" | "blogueiro";

type HomeStaffLidoStore = Partial<Record<HomeStaffLidoBucket, string[]>>;

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function lerStore(userId: string): HomeStaffLidoStore {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as HomeStaffLidoStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function gravarStore(userId: string, store: HomeStaffLidoStore): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

export function listarHomeStaffLidos(userId: string, bucket: HomeStaffLidoBucket): Set<string> {
  const ids = lerStore(userId)[bucket] ?? [];
  return new Set(ids);
}

export function marcarHomeStaffLido(userId: string, bucket: HomeStaffLidoBucket, itemId: string): void {
  const store = lerStore(userId);
  const atual = new Set(store[bucket] ?? []);
  atual.add(itemId);
  store[bucket] = [...atual];
  gravarStore(userId, store);
}
