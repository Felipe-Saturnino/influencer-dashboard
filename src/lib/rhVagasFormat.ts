import type { RhVagaRow, RhVagaStatus, RhVagaTipo } from "../types/rhVaga";

export function normalizarBuscaVaga(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function organogramaLabelDeVaga(v: RhVagaRow): string {
  const t = v.org_time;
  if (!t?.nome) return "—";
  const g = t.gerencia?.nome?.trim();
  const d = t.gerencia?.diretoria?.nome?.trim();
  if (d && g) return `${d} › ${g} › ${t.nome}`;
  if (g) return `${g} › ${t.nome}`;
  return t.nome;
}

export function vagaPassaBuscaNomeOuDiretoria(v: RhVagaRow, buscaRaw: string): boolean {
  const q = normalizarBuscaVaga(buscaRaw);
  if (!q) return true;
  if (normalizarBuscaVaga(v.titulo).includes(q)) return true;
  const org = organogramaLabelDeVaga(v);
  if (org !== "—" && normalizarBuscaVaga(org).includes(q)) return true;
  return false;
}

export function labelTipoVaga(tipo: RhVagaTipo): string {
  if (tipo === "interna") return "Interna";
  if (tipo === "externa") return "Externa";
  return "Interna e externa";
}

export function labelStatusVaga(s: RhVagaStatus): string {
  if (s === "aberta") return "Aberta";
  if (s === "em_andamento") return "Em andamento";
  if (s === "concluida") return "Concluída";
  return "Cancelada";
}

export function fmtDataBR(isoDate: string | null | undefined): string {
  if (!isoDate?.trim()) return "—";
  const [y, m, d] = isoDate.slice(0, 10).split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return "—";
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
