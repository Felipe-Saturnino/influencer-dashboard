import type { ProdutoTipo, StatusFolha, StatusPipeline, StatusProduto } from "./constants";

export interface TelefoneContato {
  iso: string;
  ddi: string;
  numero: string;
}

export interface ComercialEmpresa {
  id: string;
  razao_social: string;
  cnpj: string;
  portaria: string | null;
  portaria_retificacoes: string[];
  requerimento_numero: string | null;
  requerimento_ano: string | null;
  /** Município da sede (enriquecimento CNPJ — comercial_empresas). */
  cidade?: string | null;
  /** UF da sede (2 letras). */
  estado?: string | null;
}

export interface ComercialContato {
  id: string;
  marca_id: string;
  nome: string;
  telefones: TelefoneContato[];
  emails: string[];
  linkedin: string | null;
  instagram: string | null;
  data_nascimento: string | null;
  ordem: number;
}

export interface ComercialProduto {
  produto: ProdutoTipo;
  status_produto: StatusProduto | null;
}

export interface PipelineMarcaRow {
  id: string;
  nome: string;
  dominio: string | null;
  status_dominio: "ok" | "inativo";
  status_pipeline: StatusPipeline;
  status_folha: StatusFolha;
  comercial_user_id: string | null;
  comercial_nome: string | null;
  ultimo_contato: string | null;
  ultima_comunicacao: string | null;
  empresa: ComercialEmpresa;
  contatos: ComercialContato[];
  produtos: ComercialProduto[];
}

export interface ComercialOpcao {
  /** UUID em `profiles`; null se o usuário canónico ainda não existir no cadastro. */
  id: string | null;
  name: string;
}

export interface MarcaAnotacao {
  id: string;
  marca_id: string;
  texto: string;
  created_at: string;
  usuario_id: string | null;
  usuario_nome?: string | null;
}

export interface MarcaHistorico {
  id: string;
  marca_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
  usuario_id: string | null;
  usuario_nome?: string | null;
}
