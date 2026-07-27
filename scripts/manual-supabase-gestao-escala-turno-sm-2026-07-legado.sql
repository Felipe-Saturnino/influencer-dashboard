-- =============================================================================
-- Manual: Service Manager — julho/2026 — corrigir turno legado na grade aprovada
-- =============================================================================
-- Altera APENAS células MRN↔ NGT dos 5 prestadores listados + snapshot turno_mes.
-- NÃO toca em:
--   • rh_gestao_escala_grade_status (escala permanece aprovada)
--   • outros prestadores / outras áreas / outros meses
--   • dias Folga / Compra / Venda / Troca
--   • DELETE de linhas da grade
--
-- Rodar no SQL Editor do Supabase (role com permissão de escrita nas tabelas).
-- =============================================================================

BEGIN;

-- 0) Extensão para match por nome sem acento (se ainda não existir)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1) Mapa dos 5 prestadores (diagnóstico — deve retornar exatamente 5 linhas)
WITH alvo AS (
  SELECT * FROM (VALUES
    ('flavia ferreira',   'MRN', 'NGT', 'Noite'),
    ('giullia vieira',    'MRN', 'NGT', 'Noite'),
    ('renato sales',      'MRN', 'NGT', 'Noite'),
    ('jonathan fernandes','NGT', 'MRN', 'Manhã'),
    ('leticia louise',    'NGT', 'MRN', 'Manhã')
  ) AS t(nome_chave, valor_de, valor_para, turno_snap)
),
match_f AS (
  SELECT
    a.nome_chave,
    a.valor_de,
    a.valor_para,
    a.turno_snap,
    f.id AS funcionario_id,
    f.nome,
    f.staff_nickname,
    f.staff_turno AS staff_turno_atual
  FROM alvo a
  INNER JOIN public.rh_funcionarios f
    ON lower(unaccent(btrim(f.nome))) LIKE '%' || a.nome_chave || '%'
   AND f.status IN ('ativo', 'indisponivel')
)
SELECT
  m.nome_chave,
  m.funcionario_id,
  m.nome,
  m.staff_nickname,
  m.valor_de || ' → ' || m.valor_para AS troca_celula,
  m.turno_snap AS snapshot_turno_mes,
  (
    SELECT count(*)::int
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = DATE '2026-07-01'
      AND g.area_key = 'service_manager'
      AND g.funcionario_id = m.funcionario_id
      AND g.valor = m.valor_de
  ) AS celulas_que_serao_atualizadas,
  (
    SELECT count(*)::int
    FROM public.rh_gestao_escala_grade g
    WHERE g.ref_mes = DATE '2026-07-01'
      AND g.area_key = 'service_manager'
      AND g.funcionario_id = m.funcionario_id
  ) AS total_celulas_prestador_no_mes
FROM match_f m
ORDER BY m.nome_chave;

-- Se a query acima não tiver 5 linhas (ou tiver duplicata de nome), PARE e ajuste
-- os padrões em `alvo` antes do UPDATE. Em seguida rode o bloco abaixo.

-- 2) UPDATE só das células MRN/NGT dos IDs resolvidos
WITH alvo AS (
  SELECT * FROM (VALUES
    ('flavia ferreira',   'MRN', 'NGT', 'Noite'),
    ('giullia vieira',    'MRN', 'NGT', 'Noite'),
    ('renato sales',      'MRN', 'NGT', 'Noite'),
    ('jonathan fernandes','NGT', 'MRN', 'Manhã'),
    ('leticia louise',    'NGT', 'MRN', 'Manhã')
  ) AS t(nome_chave, valor_de, valor_para, turno_snap)
),
match_f AS (
  SELECT DISTINCT ON (a.nome_chave)
    a.nome_chave,
    a.valor_de,
    a.valor_para,
    a.turno_snap,
    f.id AS funcionario_id
  FROM alvo a
  INNER JOIN public.rh_funcionarios f
    ON lower(unaccent(btrim(f.nome))) LIKE '%' || a.nome_chave || '%'
   AND f.status IN ('ativo', 'indisponivel')
  ORDER BY a.nome_chave, f.nome
)
UPDATE public.rh_gestao_escala_grade g
SET
  valor = m.valor_para,
  atualizado_em = now()
FROM match_f m
WHERE g.funcionario_id = m.funcionario_id
  AND g.ref_mes = DATE '2026-07-01'
  AND g.area_key = 'service_manager'
  AND g.valor = m.valor_de;

-- 3) Snapshot da coluna Turno (mês aprovado) — sem reabrir aprovação
WITH alvo AS (
  SELECT * FROM (VALUES
    ('flavia ferreira',   'MRN', 'NGT', 'Noite'),
    ('giullia vieira',    'MRN', 'NGT', 'Noite'),
    ('renato sales',      'MRN', 'NGT', 'Noite'),
    ('jonathan fernandes','NGT', 'MRN', 'Manhã'),
    ('leticia louise',    'NGT', 'MRN', 'Manhã')
  ) AS t(nome_chave, valor_de, valor_para, turno_snap)
),
match_f AS (
  SELECT DISTINCT ON (a.nome_chave)
    a.nome_chave,
    a.turno_snap,
    f.id AS funcionario_id
  FROM alvo a
  INNER JOIN public.rh_funcionarios f
    ON lower(unaccent(btrim(f.nome))) LIKE '%' || a.nome_chave || '%'
   AND f.status IN ('ativo', 'indisponivel')
  ORDER BY a.nome_chave, f.nome
)
INSERT INTO public.rh_gestao_escala_turno_mes (
  ref_mes, area_key, funcionario_id, staff_turno, staff_horario_turno
)
SELECT
  DATE '2026-07-01',
  'service_manager',
  m.funcionario_id,
  m.turno_snap,
  NULL
FROM match_f m
ON CONFLICT (ref_mes, area_key, funcionario_id) DO UPDATE
SET staff_turno = EXCLUDED.staff_turno;

-- 4) Conferência pós-update (só os 5)
WITH alvo AS (
  SELECT * FROM (VALUES
    ('flavia ferreira'),
    ('giullia vieira'),
    ('renato sales'),
    ('jonathan fernandes'),
    ('leticia louise')
  ) AS t(nome_chave)
),
match_f AS (
  SELECT DISTINCT ON (a.nome_chave)
    a.nome_chave,
    f.id AS funcionario_id,
    f.nome
  FROM alvo a
  INNER JOIN public.rh_funcionarios f
    ON lower(unaccent(btrim(f.nome))) LIKE '%' || a.nome_chave || '%'
   AND f.status IN ('ativo', 'indisponivel')
  ORDER BY a.nome_chave, f.nome
)
SELECT
  m.nome,
  g.dia_iso,
  g.valor,
  tm.staff_turno AS turno_snapshot
FROM match_f m
INNER JOIN public.rh_gestao_escala_grade g
  ON g.funcionario_id = m.funcionario_id
 AND g.ref_mes = DATE '2026-07-01'
 AND g.area_key = 'service_manager'
LEFT JOIN public.rh_gestao_escala_turno_mes tm
  ON tm.funcionario_id = m.funcionario_id
 AND tm.ref_mes = DATE '2026-07-01'
 AND tm.area_key = 'service_manager'
ORDER BY m.nome, g.dia_iso;

-- 5) Status da área deve continuar aprovada (só leitura)
SELECT ref_mes, area_key, status, aprovado_em, aprovado_por
FROM public.rh_gestao_escala_grade_status
WHERE ref_mes = DATE '2026-07-01'
  AND area_key = 'service_manager';

COMMIT;
-- Se algo estiver errado na conferência: use ROLLBACK; em vez de COMMIT
-- (rode o script em duas etapas: SELECT diagnóstico → COMMIT só após validar).
