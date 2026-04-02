-- =============================================================================
-- VERIFICAÇÃO DE SAÚDE DA BASE DE DADOS — INFLUENCER DASHBOARD
-- Execute no Supabase SQL Editor para obter um diagnóstico completo
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. LISTAR TODAS AS TABELAS PÚBLICAS E CONTAGEM DE REGISTROS
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 
  'TABELAS' AS secao,
  schemaname AS schema_name,
  relname AS tabela,
  n_live_tup::bigint AS registros_approx
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ESTRUTURA ESPERADA DO PROJETO (tabelas que o app utiliza)
-- ─────────────────────────────────────────────────────────────────────────────

WITH tabelas_esperadas AS (
  SELECT unnest(ARRAY[
    'profiles', 'influencer_perfil', 'influencer_operadoras', 'operadoras',
    'lives', 'live_resultados', 'influencer_metricas', 'ciclos_pagamento',
    'pagamentos', 'pagamentos_agentes', 'user_scopes', 'role_permissions',
    'utm_aliases', 'utm_metricas_diarias', 'scout_influencer', 'scout_anotacoes',
    'campanhas', 'gestor_tipo_pages', 'operadora_pages',
    'dealers', 'dealer_observacoes', 'guia_confirmacoes',
    'roteiro_mesa_campanhas', 'roteiro_mesa_sugestoes', 'banca_jogo_solicitacoes',
    'integrations', 'sync_logs', 'tech_logs', 'pipeline_runs', 'email_envios',
    'relatorio_daily_summary', 'relatorio_monthly_summary', 'relatorio_por_tabela',
    'relatorio_uap_por_jogo',
    'kpi_daily', 'instagram_posts', 'facebook_posts', 'youtube_videos', 'linkedin_posts',
    'alert_config'
  ]) AS nome
)
SELECT 
  'TABELAS ESPERADAS' AS secao,
  t.nome,
  CASE WHEN c.relname IS NOT NULL THEN '✓ Existe' ELSE '✗ FALTA CRIAR' END AS status
FROM tabelas_esperadas t
LEFT JOIN pg_class c ON c.relname = t.nome AND c.relkind = 'r'
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
ORDER BY t.nome;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. VIEWS EXISTENTES
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 
  'VIEWS' AS secao,
  schemaname,
  viewname AS view_name
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FUNÇÕES RPC (usadas pelo frontend)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 
  'FUNÇÕES RPC' AS secao,
  n.nspname AS schema_name,
  p.proname AS funcao,
  pg_get_function_arguments(p.oid) AS argumentos
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_metricas_financeiro',
    'aplicar_mapeamento_utm',
    'aprovar_pagamento',
    'registrar_pagamento',
    'get_campanha_funil_totais',
    'get_campanhas_performance',
    'get_investimento_pago',
    'obter_utm_cda_emitido_para_influencer',
    'registrar_utm_alias_tracking_casa_apostas'
  )
ORDER BY p.proname, pg_get_function_arguments(p.oid);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS (Row Level Security) — tabelas com e sem RLS
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 
  'RLS' AS secao,
  c.relname AS tabela,
  CASE WHEN c.relrowsecurity THEN '✓ Habilitado' ELSE '⚠ Desabilitado' END AS rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ÍNDICES POR TABELA (performance)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 
  'ÍNDICES' AS secao,
  t.relname AS tabela,
  i.relname AS indice,
  array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS colunas
FROM pg_index ix
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey) AND a.attnum > 0 AND NOT a.attisdropped
WHERE n.nspname = 'public'
  AND t.relkind = 'r'
  AND NOT ix.indisprimary
GROUP BY t.relname, i.relname
ORDER BY t.relname, i.relname;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. INTEGRIDADE — possíveis órfãos e inconsistências
-- NOTA: Se alguma tabela não existir, essa seção pode falhar. Execute por partes se necessário.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 'ÓRFÃOS' AS secao, 'influencer_perfil sem profile' AS tipo,
  COUNT(*)::text AS quantidade
FROM influencer_perfil ip
LEFT JOIN auth.users u ON u.id = ip.id
WHERE u.id IS NULL;

SELECT 'ÓRFÃOS' AS secao, 'influencer_operadoras sem influencer_perfil' AS tipo,
  COUNT(*)::text AS quantidade
FROM influencer_operadoras io
LEFT JOIN influencer_perfil ip ON ip.id = io.influencer_id
WHERE ip.id IS NULL;

SELECT 'ÓRFÃOS' AS secao, 'influencer_operadoras sem operadora' AS tipo,
  COUNT(*)::text AS quantidade
FROM influencer_operadoras io
LEFT JOIN operadoras o ON o.slug = io.operadora_slug
WHERE o.slug IS NULL;

SELECT 'ÓRFÃOS' AS secao, 'lives sem influencer_perfil' AS tipo,
  COUNT(*)::text AS quantidade
FROM lives l
LEFT JOIN influencer_perfil ip ON ip.id = l.influencer_id
WHERE ip.id IS NULL AND l.influencer_id IS NOT NULL;

SELECT 'ÓRFÃOS' AS secao, 'live_resultados sem live' AS tipo,
  COUNT(*)::text AS quantidade
FROM live_resultados lr
LEFT JOIN lives l ON l.id = lr.live_id
WHERE l.id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RESUMO DE DADOS (contagens exatas por tabela principal)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 'profiles (influencers)' AS entidade, COUNT(*)::text AS total FROM profiles WHERE role = 'influencer'
UNION ALL
SELECT 'operadoras', COUNT(*)::text FROM operadoras
UNION ALL
SELECT 'influencer_perfil', COUNT(*)::text FROM influencer_perfil
UNION ALL
SELECT 'lives', COUNT(*)::text FROM lives
UNION ALL
SELECT 'lives (realizadas)', COUNT(*)::text FROM lives WHERE status = 'realizada'
UNION ALL
SELECT 'live_resultados', COUNT(*)::text FROM live_resultados
UNION ALL
SELECT 'ciclos_pagamento', COUNT(*)::text FROM ciclos_pagamento
UNION ALL
SELECT 'pagamentos', COUNT(*)::text FROM pagamentos
UNION ALL
SELECT 'pagamentos_agentes', COUNT(*)::text FROM pagamentos_agentes
UNION ALL
SELECT 'role_permissions', COUNT(*)::text FROM role_permissions
UNION ALL
SELECT 'user_scopes', COUNT(*)::text FROM user_scopes;

-- Tabelas opcionais (podem não existir ainda)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'influencer_metricas') THEN
    RAISE NOTICE 'influencer_metricas: % registros', (SELECT COUNT(*) FROM influencer_metricas);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'utm_aliases') THEN
    RAISE NOTICE 'utm_aliases: % registros', (SELECT COUNT(*) FROM utm_aliases);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scout_influencer') THEN
    RAISE NOTICE 'scout_influencer: % registros', (SELECT COUNT(*) FROM scout_influencer);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scout_anotacoes') THEN
    RAISE NOTICE 'scout_anotacoes: % registros', (SELECT COUNT(*) FROM scout_anotacoes);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. FUNÇÕES SECURITY DEFINER (auditoria — ver docs/SUPABASE-CHECKLIST-NAO-TECNICO.md)
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  p.proname AS funcao,
  pg_get_function_identity_arguments(p.oid) AS argumentos,
  p.proconfig AS config_funcao
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.prosecdef = true
ORDER BY p.proname;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. POLÍTICAS RLS que citam get_my_role ou is_admin
-- ─────────────────────────────────────────────────────────────────────────────

SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    coalesce(qual::text, '') ILIKE '%get_my_role%'
    OR coalesce(with_check::text, '') ILIKE '%get_my_role%'
    OR coalesce(qual::text, '') ILIKE '%is_admin%'
    OR coalesce(with_check::text, '') ILIKE '%is_admin%'
  )
ORDER BY tablename, policyname;
