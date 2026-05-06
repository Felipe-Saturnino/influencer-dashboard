/**
 * Regras de datas/turnos para ações do Calendário (prestador).
 */
import {
  normalizarEscalaCadastro,
  siglaGradeParaNomeTurno,
  turnosPermitidosPorEscalaPrestador,
} from "./rhEscalaTurnos";

export type RhCalendarioAcaoTipo =
  | "venda_folga"
  | "venda_turno"
  | "oferta_troca"
  | "troca_cassada"
  | "agendamento_reuniao";

export const RH_CALENDARIO_ACAO_LABEL: Record<RhCalendarioAcaoTipo, string> = {
  venda_folga: "Vender Folga",
  venda_turno: "Vender Turno",
  oferta_troca: "Ofertar Troca",
  troca_cassada: "Solicitar Troca",
  agendamento_reuniao: "Agendar Reunião",
};

export const RH_REUNIAO_COM_OPCOES = [
  { value: "shift_lead", label: "Shift Lead" },
  { value: "gerente_operacoes", label: "Gerente de Operações" },
  { value: "rh", label: "RH" },
] as const;

export type RhReuniaoComValor = (typeof RH_REUNIAO_COM_OPCOES)[number]["value"];

export function labelReuniaoCom(v: string): string {
  const hit = RH_REUNIAO_COM_OPCOES.find((o) => o.value === v);
  return hit?.label ?? v;
}

export function diaIsoChaveGradeCell(raw: string | Date | undefined | null): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.slice(0, 10);
  try {
    return new Date(raw).toISOString().slice(0, 10);
  } catch {
    return String(raw).slice(0, 10);
  }
}

/** Rótulo `dd-MM-yyyy` a partir de ISO `YYYY-MM-DD` (calendário local da string). */
export function labelDataDdMmAaaa(iso: string): string {
  const s = iso.slice(0, 10);
  const parts = s.split("-");
  if (parts.length < 3) return s;
  const [y, mo, d] = parts;
  if (!y || !mo || !d) return s;
  return `${d}-${mo}-${y}`;
}

export function valorCelulaEhFolga(valor: string): boolean {
  const v = (valor ?? "").trim();
  const vl = v.toLowerCase();
  return v === "Folga" || vl === "folga" || v === "F" || vl === "f";
}

/** Turno exibível na grade (não folga). */
export function turnoExibicaoValorGrade(valor: string): string | null {
  const v = (valor ?? "").trim();
  if (!v || valorCelulaEhFolga(v)) return null;
  if (v === "Comercial") return "Comercial";
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  const nome = siglaGradeParaNomeTurno(v);
  return nome || null;
}

function inicioDoDiaLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Apenas dias estritamente depois de hoje (não inclui hoje). */
export function diaIsoEhEstritamenteFuturo(iso: string): boolean {
  const parts = iso.slice(0, 10).split("-").map(Number);
  if (parts.length < 3 || Number.isNaN(parts[0])) return false;
  const alvo = new Date(parts[0]!, parts[1]! - 1, parts[2]!);
  const hoje = inicioDoDiaLocal(new Date());
  return alvo > hoje;
}

/** Turnos que o prestador pode oferecer trabalhar num dia de folga (conforme escala). */
export function turnosBaseOfertaNaFolga(escalaRaw: string | null | undefined): string[] {
  const k = normalizarEscalaCadastro(escalaRaw ?? "");
  if (k === "5x2") return ["Comercial"];
  const t = turnosPermitidosPorEscalaPrestador(escalaRaw ?? "");
  return t.length > 0 ? [...t] : ["Manhã", "Tarde", "Noite"];
}

export function listarIsoDiasDoMes(refMesPrimeiroDia: Date): string[] {
  const y = refMesPrimeiroDia.getFullYear();
  const m0 = refMesPrimeiroDia.getMonth();
  const ultimo = new Date(y, m0 + 1, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= ultimo; d++) {
    const mm = String(m0 + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    out.push(`${y}-${mm}-${dd}`);
  }
  return out;
}

export function listarDatasFolgaFuturasNoMes(
  refMesPrimeiroDia: Date,
  valorPorIso: Map<string, string>,
): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  for (const iso of listarIsoDiasDoMes(refMesPrimeiroDia)) {
    if (!diaIsoEhEstritamenteFuturo(iso)) continue;
    const v = valorPorIso.get(iso);
    if (v == null || !valorCelulaEhFolga(v)) continue;
    out.push({ iso, label: labelDataDdMmAaaa(iso) });
  }
  return out;
}

export function listarDatasEscaladoFuturasNoMes(
  refMesPrimeiroDia: Date,
  valorPorIso: Map<string, string>,
): { iso: string; label: string; turno: string }[] {
  const out: { iso: string; label: string; turno: string }[] = [];
  for (const iso of listarIsoDiasDoMes(refMesPrimeiroDia)) {
    if (!diaIsoEhEstritamenteFuturo(iso)) continue;
    const v = valorPorIso.get(iso);
    if (v == null) continue;
    const turno = turnoExibicaoValorGrade(v);
    if (!turno) continue;
    out.push({ iso, turno, label: `${labelDataDdMmAaaa(iso)} - ${turno}` });
  }
  return out;
}
