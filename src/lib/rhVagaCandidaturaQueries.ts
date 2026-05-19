/** Select Supabase compartilhado para candidaturas no kanban e modais. */

export const RH_CANDIDATURAS_SELECT = `
  *,
  vaga:rh_vagas ( id, codigo_vaga, titulo, tipo_vaga, status ),
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
