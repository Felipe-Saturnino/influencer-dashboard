export interface BlocoFiltros {
  podeVerInfluencer: (id: string) => boolean;
  podeVerOperadora: (slug: string) => boolean;
  filterInfluencers: string[];
  filterOperadora: string;
  filtroOp: string[] | null;
  operadoraInfMap: Record<string, string[]>;
  operadorasList: { slug: string; nome: string }[];
  mesFiltro: string;
  historico: boolean;
}