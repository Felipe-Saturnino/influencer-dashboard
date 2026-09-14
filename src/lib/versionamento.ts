import { MENU, getMenuItem } from "../constants/menu";
import type { PermissoesMapa } from "../context/AppContext";
import type { PageKey } from "../types";
import { podeVerPaginaAjuda } from "./ajudaVisibilidade";
import { textoContemBusca } from "./searchText";

export type VersionamentoTipo = "novo" | "melhoria" | "correcao";

export type VersionamentoItem = {
  tipo: VersionamentoTipo;
  /** Página da feature. `"*"` = transversal (visível a quem acessa Versionamento). */
  paginas: "*" | PageKey[];
  titulo: string;
  descricao: string;
  /** Link «Acesse a página AQUI» para a primeira página da lista. */
  linkPagina?: boolean;
  palavrasChave?: string;
};

export type VersionamentoRelease = {
  /** Sequencial crescente. A primeira publicada é 1. */
  numero: number;
  /** Data de publicação `DD/MM/AAAA`. */
  data: string;
  titulo: string;
  resumo: string;
  itens: VersionamentoItem[];
  palavrasChave?: string;
};

export const VERSIONAMENTO_TIPO_LABEL: Record<VersionamentoTipo, string> = {
  novo: "Novo",
  melhoria: "Melhoria",
  correcao: "Correção",
};

export const VERSIONAMENTO_TIPO_COR: Record<VersionamentoTipo, string> = {
  novo: "#a78bfa",
  melhoria: "#1e36f8",
  correcao: "#22c55e",
};

export const VERSIONAMENTO_TIPOS: VersionamentoTipo[] = ["novo", "melhoria", "correcao"];

export const MSG_VERSIONAMENTO_VAZIO = "Nenhuma release publicada.";
export const MSG_VERSIONAMENTO_FILTRO = "Nenhuma release encontrada para os filtros selecionados.";

const PAGINAS_GERAL: PageKey[] = ["home", "configuracoes", "simulador_login", "ajuda", "versionamento"];

const LABEL_PAGINA_FORA_MENU: Partial<Record<PageKey, string>> = {
  home: "Home",
  configuracoes: "Configurações",
  simulador_login: "Simulador de Login",
  ajuda: "Ajuda",
  versionamento: "Versionamento",
};

export function labelPaginaVersionamento(pageKey: PageKey): string {
  return LABEL_PAGINA_FORA_MENU[pageKey] ?? getMenuItem(pageKey)?.label ?? pageKey;
}

export function secaoPaginaVersionamento(pageKey: PageKey): string {
  if (pageKey === "home") return "Home";
  if (PAGINAS_GERAL.includes(pageKey)) return "Geral";
  for (const sec of MENU) {
    if (sec.items.some((item) => item.key === pageKey)) return sec.section;
  }
  return "Geral";
}

export function secaoDoItemVersionamento(item: VersionamentoItem): string {
  if (item.paginas === "*") return "Geral";
  const primeira = item.paginas[0];
  return primeira ? secaoPaginaVersionamento(primeira) : "Geral";
}

export function chipPaginaVersionamento(item: VersionamentoItem): string {
  if (item.paginas === "*") return "Geral";
  const primeira = item.paginas[0];
  return primeira ? labelPaginaVersionamento(primeira) : "Geral";
}

export function pageKeyLinkVersionamento(item: VersionamentoItem): PageKey | null {
  if (!item.linkPagina || item.paginas === "*") return null;
  return item.paginas[0] ?? null;
}

export function podeVerItemVersionamento(
  item: VersionamentoItem,
  permissions: PermissoesMapa,
): boolean {
  if (item.paginas === "*") return true;
  return item.paginas.some((key) => podeVerPaginaAjuda(permissions[key]));
}

export function tituloHistoricoRelease(release: VersionamentoRelease): string {
  return `Release #${release.numero} - ${release.titulo} - ${release.data}`;
}

function dataSemBarras(data: string): string {
  return data.replace(/\//g, "");
}

export function haystackRelease(release: VersionamentoRelease): string {
  return [
    `Release #${release.numero}`,
    `#${release.numero}`,
    String(release.numero),
    release.data,
    dataSemBarras(release.data),
    release.titulo,
    release.resumo,
    release.palavrasChave,
    "Recente",
  ]
    .filter(Boolean)
    .join(" ");
}

export function haystackItem(item: VersionamentoItem, release: VersionamentoRelease): string {
  const paginasTxt =
    item.paginas === "*"
      ? "Geral transversal plataforma"
      : item.paginas.map((k) => `${labelPaginaVersionamento(k)} ${secaoPaginaVersionamento(k)}`).join(" ");
  return [
    haystackRelease(release),
    VERSIONAMENTO_TIPO_LABEL[item.tipo],
    item.tipo,
    secaoDoItemVersionamento(item),
    paginasTxt,
    item.titulo,
    item.descricao,
    item.palavrasChave,
  ]
    .filter(Boolean)
    .join(" ");
}

export function releaseMaisRecente(releases: readonly VersionamentoRelease[]): VersionamentoRelease | null {
  if (releases.length === 0) return null;
  return [...releases].sort((a, b) => b.numero - a.numero)[0] ?? null;
}

export function releasesHistorico(
  releases: readonly VersionamentoRelease[],
  recente: VersionamentoRelease | null,
): VersionamentoRelease[] {
  return [...releases]
    .filter((r) => recente == null || r.numero !== recente.numero)
    .sort((a, b) => b.numero - a.numero);
}

export type FiltroVersionamento = {
  tipo: "todos" | VersionamentoTipo;
  secao: string;
  busca: string;
};

export function itemPassaFiltroVersionamento(
  item: VersionamentoItem,
  release: VersionamentoRelease,
  filtro: FiltroVersionamento,
  permissions: PermissoesMapa,
): boolean {
  if (!podeVerItemVersionamento(item, permissions)) return false;
  if (filtro.tipo !== "todos" && item.tipo !== filtro.tipo) return false;
  if (filtro.secao && secaoDoItemVersionamento(item) !== filtro.secao) return false;
  const blocoMatch = textoContemBusca(haystackRelease(release), filtro.busca);
  if (blocoMatch) return true;
  return textoContemBusca(haystackItem(item, release), filtro.busca);
}

export function releaseTemItensVisiveis(
  release: VersionamentoRelease,
  filtro: FiltroVersionamento,
  permissions: PermissoesMapa,
): boolean {
  return release.itens.some((item) => itemPassaFiltroVersionamento(item, release, filtro, permissions));
}

export function itensVisiveisRelease(
  release: VersionamentoRelease,
  filtro: FiltroVersionamento,
  permissions: PermissoesMapa,
): VersionamentoItem[] {
  return release.itens.filter((item) => itemPassaFiltroVersionamento(item, release, filtro, permissions));
}

export function contarTiposVisiveis(itens: readonly VersionamentoItem[]): {
  novo: number;
  melhoria: number;
  correcao: number;
} {
  return {
    novo: itens.filter((i) => i.tipo === "novo").length,
    melhoria: itens.filter((i) => i.tipo === "melhoria").length,
    correcao: itens.filter((i) => i.tipo === "correcao").length,
  };
}

export function secoesPresentesCatalogo(
  releases: readonly VersionamentoRelease[],
  permissions: PermissoesMapa,
): string[] {
  const set = new Set<string>();
  for (const release of releases) {
    for (const item of release.itens) {
      if (podeVerItemVersionamento(item, permissions)) {
        set.add(secaoDoItemVersionamento(item));
      }
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
