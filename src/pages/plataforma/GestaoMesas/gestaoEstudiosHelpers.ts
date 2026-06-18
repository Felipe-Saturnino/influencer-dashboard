export type EstudioTipo = "network" | "dedicado";

export const ESTUDIO_TIPO_OPTIONS: { value: EstudioTipo; label: string }[] = [
  { value: "dedicado", label: "Dedicado" },
  { value: "network", label: "Network" },
];

export function labelEstudioTipo(tipo: string): string {
  const found = ESTUDIO_TIPO_OPTIONS.find((o) => o.value === tipo);
  return found?.label ?? tipo;
}

export function slugifyEstudio(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return base || "estudio";
}
