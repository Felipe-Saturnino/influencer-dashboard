export type MesCarrosselEntry = { ano: number; mes: number; label: string };

export function buildMesesCarrossel(items: { iso: string | null | undefined }[]): MesCarrosselEntry[] {
  const keys = new Set<string>();
  for (const { iso } of items) {
    if (!iso) continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    keys.add(`${d.getFullYear()}-${d.getMonth()}`);
  }
  const entries = [...keys].map((k) => {
    const [ano, mes] = k.split("-").map(Number);
    const raw = new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return { ano, mes, label: raw.charAt(0).toUpperCase() + raw.slice(1) };
  });
  entries.sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  if (entries.length) return entries;
  const hoje = new Date();
  const raw = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return [{ ano: hoje.getFullYear(), mes: hoje.getMonth(), label: raw.charAt(0).toUpperCase() + raw.slice(1) }];
}

export function itemNoMesCarrossel(iso: string | null | undefined, mes: MesCarrosselEntry | undefined): boolean {
  if (!mes || !iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === mes.ano && d.getMonth() === mes.mes;
}
