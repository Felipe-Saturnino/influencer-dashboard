import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { primeiroUltimoNome } from "../../../lib/rhGamePresenterDealerSync";
import type { RhFigurinoCondition, RhFigurinoEmprestimo, RhFigurinoPeca } from "./types";

export function tableRowHoverBg(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
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
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
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

export function pecaSlugsOperadoras(p: RhFigurinoPeca): string[] {
  const r = p.rh_figurino_peca_operadoras;
  if (!r || !Array.isArray(r)) return [];
  return [...new Set(r.map((x) => x.operadora_slug))];
}

export function labelOperadorasPeca(p: RhFigurinoPeca, slugParaNome: (slug: string) => string): string {
  const slugs = pecaSlugsOperadoras(p);
  if (slugs.length === 0) return "—";
  return slugs.map(slugParaNome).join(" · ");
}
