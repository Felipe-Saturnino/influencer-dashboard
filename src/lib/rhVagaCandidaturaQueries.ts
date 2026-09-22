/** Select Supabase compartilhado para candidaturas no kanban e modais. */

export const RH_CANDIDATURAS_SELECT = `
  id,
  vaga_id,
  funcionario_id,
  nome_completo,
  funcao_atual,
  curriculo_storage_path,
  curriculo_nome_arquivo,
  carta_apresentacao,
  email,
  telefone,
  cidade,
  redes_sociais,
  origem,
  quem_indicou,
  portfolio_storage_path,
  portfolio_nome_arquivo,
  portfolio_url,
  video_storage_path,
  video_nome_arquivo,
  turno_trabalho,
  origem_formulario,
  etapa,
  etapa_entrada_em,
  data_agendamento,
  data_aprovacao,
  data_contratacao,
  data_dispensa,
  motivo_dispensa,
  created_by,
  created_at,
  updated_at,
  vaga:rh_vagas (
    id,
    codigo_vaga,
    titulo,
    tipo_vaga,
    status,
    data_fim_inscricoes,
    necessario_video_apresentacao,
    necessario_turno
  ),
  funcionario:rh_funcionarios ( id, email, email_spin, cargo, data_inicio, data_funcao )
`.trim();

export const RH_CANDIDATURA_HISTORICO_SELECT = `
  id,
  candidatura_id,
  tipo,
  resumo,
  detalhes,
  created_by,
  created_at,
  autor:profiles ( name )
`.trim();
