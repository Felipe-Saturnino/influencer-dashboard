-- =============================================================================
-- DIAGNÓSTICO: Ellen e aliases — por que métricas não aparecem
-- Execute no Supabase SQL Editor
-- =============================================================================

-- 1. Ellen existe em influencer_perfil?
SELECT id, nome_artistico, utm_source, status
FROM influencer_perfil
WHERE nome_artistico ILIKE '%ellen%';

-- 2. Aliases mapeados para Ellen (substitua o UUID pelo id de Ellen do passo 1)
SELECT ua.id, ua.utm_source, ua.influencer_id, ua.status, ua.operadora_slug,
       ip.nome_artistico
FROM utm_aliases ua
LEFT JOIN influencer_perfil ip ON ip.id = ua.influencer_id
WHERE ua.status = 'mapeado'
  AND (ip.nome_artistico ILIKE '%ellen%' OR ua.influencer_id IN (
    SELECT id FROM influencer_perfil WHERE nome_artistico ILIKE '%ellen%'
  ));

-- 3. Há métricas em influencer_metricas para Ellen?
SELECT im.*
FROM influencer_metricas im
JOIN influencer_perfil ip ON ip.id = im.influencer_id
WHERE ip.nome_artistico ILIKE '%ellen%'
ORDER BY im.data DESC
LIMIT 20;

-- 4. Operadora casa_apostas existe? (FK em influencer_metricas)
SELECT * FROM operadoras WHERE slug = 'casa_apostas';

-- 5. Ellen está em influencer_operadoras para casa_apostas?
SELECT io.*, ip.nome_artistico
FROM influencer_operadoras io
JOIN influencer_perfil ip ON ip.id = io.influencer_id
WHERE ip.nome_artistico ILIKE '%ellen%';

-- 6. View v_influencer_metrica_mensal — há linha para Ellen?
SELECT v.*, ip.nome_artistico
FROM v_influencer_metricas_mensal v
JOIN influencer_perfil ip ON ip.id = v.influencer_id
WHERE ip.nome_artistico ILIKE '%ellen%';

-- 7. Resumo: UTMs dos aliases mapeados vs o que a API poderia retornar
-- (A Reporting API usa utm_source; diferença de case impede match)
SELECT utm_source, LOWER(utm_source) AS utm_lower, influencer_id
FROM utm_aliases
WHERE status = 'mapeado' AND operadora_slug = 'casa_apostas'
ORDER BY total_ftds DESC;
