import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { primeiroUltimoNome } from "../../../lib/rhGamePresenterDealerSync"
import { normalizarTextoBusca } from "../../../lib/searchText"
import { FIGURINO_ESTUDIO_CADASTRO_TODOS_LABEL, FIGURINO_ESTUDIO_CADASTRO_STAFF_LABEL, FIGURINO_FILTRO_STAFF } from "./figurinosConstants"
import type { RhFigurinoCondition, RhFigurinoEmprestimo, RhFigurinoPeca } from "./types"

export function tableRowHoverBg(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
}

/**
 * Candidatos para bipagem: leitores/teclado costumam omitir zeros à esquerda do barcode (12 dígitos no cadastro).
 */
export function candidatosLookupFigurino(texto: string): string[] {
  const raw = texto.trim();
  if (!raw) return [];
  const out: string[] = [];
  const push = (s: string) => {
    if (s && !out.includes(s)) out.push(s);
  };
  push(raw);
  push(raw.toUpperCase());
  const digits = raw.replace(/\D/g, "");
  if (digits) {
    push(digits);
    if (digits.length < 12) push(digits.padStart(12, "0"));
    if (digits.length === 13) {
      push(digits.slice(0, 12));
      push(digits.slice(1));
    }
  }
  return out;
}

/** Match local no inventário já carregado (barcode ou código da peça). */
export function pecaPorCodigoLocal(pecas: RhFigurinoPeca[], texto: string): RhFigurinoPeca | undefined {
  const cands = candidatosLookupFigurino(texto);
  if (!cands.length) return undefined;
  const upperCodes = new Set(cands.map((c) => c.toUpperCase()));
  return pecas.find(
    (p) => cands.includes(p.barcode) || upperCodes.has((p.code ?? "").toUpperCase()),
  );
}

export function ctaButtonContent(loading: boolean, idle: ReactNode, busy: string): ReactNode {
  if (!loading) return idle;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden />
      {busy}
    </span>
  );
}

/** Alinha nome do perfil com o texto gravado em «Emprestado para» / retirada (borrower_name). */
export function normNomeParaFiltroPrestadorFig(s: string | null | undefined): string {
  return normalizarTextoBusca(s);
}

/** Nome exibido na coluna «Emprestado para» — primeiro e último token. */
export function labelEmprestadoParaTabela(emp: RhFigurinoEmprestimo | undefined): string {
  const nome = (emp?.borrower_name ?? "").trim();
  if (!nome) return "—";
  return primeiroUltimoNome(nome) || "—";
}

/** Retirada via Gestão de Prestadores grava `borrower_ref` = id de `rh_funcionarios`; login casa por e-mail como em Dados de Cadastro. */
export function emprestimoFigurinoEhDoProprioLogin(
  emp: RhFigurinoEmprestimo | undefined,
  rhPrestadorIds: Set<string>,
  nomePerfilNorm: string,
): boolean {
  if (!emp) return false;
  const ref = (emp.borrower_ref ?? "").trim();
  if (ref.length > 0 && rhPrestadorIds.has(ref)) return true;
  const nb = normNomeParaFiltroPrestadorFig(emp.borrower_name);
  return nb.length > 0 && nomePerfilNorm.length > 0 && nb === nomePerfilNorm;
}

export function fmtDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function fmtDataSóDia(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

export function labelCondicaoPeca(c: RhFigurinoCondition): string {
  if (c === "good") return "Boa";
  if (c === "damaged") return "Avariada";
  return "Limpeza";
}

export function actorLabel(user: { name: string; email: string } | null): string {
  if (!user) return "—";
  return (user.name || "").trim() || user.email;
}

export function pecaAtendeTodosEstudios(p: RhFigurinoPeca): boolean {
  return p.atende_todos_estudios === true;
}

export function pecaAtendeStaff(p: RhFigurinoPeca): boolean {
  return p.atende_staff === true;
}

export function pecaPassaFiltroEstudio(
  p: RhFigurinoPeca,
  filtroEstudio: string,
  filtroTodosValue: string,
  opParaEstudio: Record<string, string> = {},
): boolean {
  if (filtroEstudio === FIGURINO_FILTRO_STAFF) return pecaAtendeStaff(p);
  if (filtroEstudio === filtroTodosValue) return true;
  if (pecaAtendeTodosEstudios(p)) return true;
  return pecaSlugsEstudiosEfetivos(p, opParaEstudio).includes(filtroEstudio);
}

export function pecaSlugsEstudiosDiretos(p: RhFigurinoPeca): string[] {
  const r = p.rh_figurino_peca_estudios;
  if (!r || !Array.isArray(r)) return [];
  return [...new Set(r.map((x) => x.estudio_slug.trim()).filter(Boolean))];
}

export function pecaSlugsOperadorasLegado(p: RhFigurinoPeca): string[] {
  const r = p.rh_figurino_peca_operadoras;
  if (!r || !Array.isArray(r)) return [];
  return [...new Set(r.map((x) => x.operadora_slug))];
}

/** Estúdios da peça (coluna embed ou fallback operadora → estúdio). */
export function pecaSlugsEstudiosEfetivos(
  p: RhFigurinoPeca,
  opParaEstudio: Record<string, string> = {},
): string[] {
  const direct = pecaSlugsEstudiosDiretos(p);
  if (direct.length > 0) return direct;
  const est = new Set<string>();
  for (const op of pecaSlugsOperadorasLegado(p)) {
    const e = opParaEstudio[op.trim()];
    if (e) est.add(e);
  }
  return [...est];
}

/** @deprecated Use pecaSlugsOperadorasLegado */
export function pecaSlugsOperadoras(p: RhFigurinoPeca): string[] {
  return pecaSlugsOperadorasLegado(p);
}

export function labelEstudiosPeca(
  p: RhFigurinoPeca,
  slugParaNome: (slug: string) => string,
  opParaEstudio: Record<string, string> = {},
): string {
  if (pecaAtendeTodosEstudios(p)) return FIGURINO_ESTUDIO_CADASTRO_TODOS_LABEL;
  const partes: string[] = [];
  if (pecaAtendeStaff(p)) partes.push(FIGURINO_ESTUDIO_CADASTRO_STAFF_LABEL);
  const slugs = pecaSlugsEstudiosEfetivos(p, opParaEstudio);
  if (slugs.length > 0) partes.push(...slugs.map(slugParaNome));
  if (partes.length === 0) return "—";
  return partes.join(" · ");
}

/** @deprecated Use labelEstudiosPeca */
export function labelOperadorasPeca(
  p: RhFigurinoPeca,
  slugParaNome: (slug: string) => string,
  opParaEstudio: Record<string, string> = {},
): string {
  return labelEstudiosPeca(p, slugParaNome, opParaEstudio);
}
