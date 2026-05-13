import type { DenunciaStatusDb } from "../../../lib/canalDenunciasSpin";

export interface AnexoRow {
  id: string;
  denuncia_id: string;
  anotacao_id: string | null;
  storage_path: string;
  file_name: string;
  content_type: string | null;
  file_size: number | null;
}

export interface DenunciaListRow {
  id: string;
  protocolo: string;
  created_at: string;
  status: DenunciaStatusDb;
  tipos_denuncia: string[];
  tipo_outro_descricao: string | null;
  relato: string;
  deseja_identificar: boolean;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  descricao_resolucao: string | null;
  canal_denuncia_anexos?: { id: string }[] | null;
}
