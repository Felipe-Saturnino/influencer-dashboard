import {
  ACADEMY_CRONOGRAMA_STATUS_LABEL,
  ACADEMY_CRONOGRAMA_VAZIO,
} from "./academyCronogramaConstants";
import type {
  AcademyCatalogoStatus,
  AcademyCronograma,
  AcademyMaterial,
  AcademyProva,
  AcademyProvaQuestao,
  AcademyTrilha,
} from "./academyCronogramaTypes";
import { isoDateBrasilFromInstant } from "./dateBrasil";

export function fmtDataCatalogo(iso: string | null | undefined): string {
  const day = isoDateBrasilFromInstant(iso);
  if (!day) return ACADEMY_CRONOGRAMA_VAZIO;
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

export function fmtDataHoraCatalogo(iso: string | null | undefined): string {
  if (!iso) return ACADEMY_CRONOGRAMA_VAZIO;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return ACADEMY_CRONOGRAMA_VAZIO;
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function labelOuVazio(value: string | null | undefined): string {
  const t = (value ?? "").trim();
  return t || ACADEMY_CRONOGRAMA_VAZIO;
}

export function labelStatusCatalogo(status: AcademyCatalogoStatus): string {
  return ACADEMY_CRONOGRAMA_STATUS_LABEL[status];
}

export function nomesVinculados(nomes: string[]): string {
  const clean = nomes.map((n) => n.trim()).filter(Boolean);
  return clean.length ? clean.join(" · ") : ACADEMY_CRONOGRAMA_VAZIO;
}

export function cronogramasDaTrilha(
  trilhaId: string,
  cronogramas: AcademyCronograma[],
  itens: { cronograma_id: string; trilha_id: string }[],
): AcademyCronograma[] {
  const ids = new Set(itens.filter((i) => i.trilha_id === trilhaId).map((i) => i.cronograma_id));
  return cronogramas.filter((c) => ids.has(c.id)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function materiaisDaTrilha(
  trilhaId: string,
  materiais: AcademyMaterial[],
  vinculos: { trilha_id: string; material_id: string }[],
): AcademyMaterial[] {
  const ids = new Set(vinculos.filter((v) => v.trilha_id === trilhaId).map((v) => v.material_id));
  return materiais.filter((m) => ids.has(m.id));
}

export function provasDaTrilha(
  trilhaId: string,
  provas: AcademyProva[],
  vinculos: { trilha_id: string; prova_id: string }[],
): AcademyProva[] {
  const ids = new Set(vinculos.filter((v) => v.trilha_id === trilhaId).map((v) => v.prova_id));
  return provas.filter((p) => ids.has(p.id));
}

export function trilhasDoMaterial(
  materialId: string,
  trilhas: AcademyTrilha[],
  vinculos: { trilha_id: string; material_id: string }[],
): AcademyTrilha[] {
  const ids = new Set(vinculos.filter((v) => v.material_id === materialId).map((v) => v.trilha_id));
  return trilhas.filter((t) => ids.has(t.id));
}

export function trilhasDaProva(
  provaId: string,
  trilhas: AcademyTrilha[],
  vinculos: { trilha_id: string; prova_id: string }[],
): AcademyTrilha[] {
  const ids = new Set(vinculos.filter((v) => v.prova_id === provaId).map((v) => v.trilha_id));
  return trilhas.filter((t) => ids.has(t.id));
}

export function provaValidaParaPublicar(questoes: AcademyProvaQuestao[]): boolean {
  if (questoes.length === 0) return false;
  return questoes.every(
    (q) =>
      q.t.trim().length > 0 &&
      q.opts.every((o) => o.trim().length > 0) &&
      q.ok >= 0 &&
      q.ok <= 3,
  );
}

export function questaoVazia(): AcademyProvaQuestao {
  return { t: "", opts: ["", "", "", ""], ok: 0 };
}
