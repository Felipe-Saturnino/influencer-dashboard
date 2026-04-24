/** Contexto das ações Vagas / Estrutura na visualização do organograma. */
export type OrgTreeVisualAcaoCtx =
  | { nivel: "diretoria"; id: string; nome: string }
  | { nivel: "gerencia"; id: string; nome: string }
  | { nivel: "time"; id: string; nome: string };
