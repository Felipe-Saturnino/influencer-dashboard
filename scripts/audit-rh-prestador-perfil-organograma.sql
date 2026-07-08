-- Auditoria: prestadores em organograma staff interno com profiles.role divergente.
-- Rodar no Supabase → SQL Editor (service role / postgres).
-- Matriz: Gerência Figurino/Comunicação/RH/Tech Ops/Customer Service; Times Performance Coach, Shift Leader, Service Manager, Tech Ops, Customer Service, Game Presenter(s), Shuffler(s).

WITH base AS (
  SELECT
    f.id AS rh_funcionario_id,
    f.nome,
    f.status,
    f.setor,
    lower(trim(coalesce(f.email_spin, ''))) AS email_spin,
    lower(trim(coalesce(f.email, ''))) AS email_pessoal,
    coalesce(g_direto.nome, g_time.nome) AS gerencia_nome,
    t.nome AS time_nome,
    d.nome AS diretoria_nome
  FROM public.rh_funcionarios f
  LEFT JOIN public.rh_org_times t ON t.id = f.org_time_id
  LEFT JOIN public.rh_org_gerencias g_direto ON g_direto.id = f.org_gerencia_id
  LEFT JOIN public.rh_org_gerencias g_time ON g_time.id = t.gerencia_id
  LEFT JOIN public.rh_org_diretorias d ON d.id = f.org_diretoria_id
  WHERE f.status IS DISTINCT FROM 'encerrado'
),
norm AS (
  SELECT
    b.*,
    lower(
      trim(
        translate(
          coalesce(b.gerencia_nome, ''),
          'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
          'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
        )
      )
    ) AS gerencia_norm,
    lower(
      trim(
        translate(
          coalesce(b.time_nome, ''),
          'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
          'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
        )
      )
    ) AS time_norm,
    CASE
      WHEN nullif(b.email_spin, '') IS NOT NULL AND b.email_spin LIKE '%@%'
        THEN b.email_spin
      WHEN nullif(b.email_pessoal, '') IS NOT NULL AND b.email_pessoal LIKE '%@%'
        THEN b.email_pessoal
      ELSE NULL
    END AS email_login
  FROM base b
),
esperado AS (
  SELECT
    n.*,
    CASE
      WHEN n.gerencia_norm = 'figurino' THEN 'figurino'
      WHEN n.gerencia_norm = 'comunicacao' THEN 'comunicacao'
      WHEN n.gerencia_norm IN ('rh', 'recursos humanos') THEN 'rh'
      WHEN n.gerencia_norm = 'tech ops' THEN 'tech_ops'
      WHEN n.gerencia_norm = 'customer service' THEN 'customer_service'
      WHEN n.time_norm = 'customer service' THEN 'customer_service'
      WHEN n.time_norm IN ('game presenter', 'game presenters') THEN 'game_presenter'
      WHEN n.time_norm IN ('shuffler', 'shufflers') THEN 'shuffler'
      WHEN n.time_norm = 'tech ops' THEN 'tech_ops'
      WHEN n.time_norm = 'performance coach' THEN 'performance_coach'
      WHEN n.time_norm = 'shift leader' THEN 'shift_leader'
      WHEN n.time_norm = 'service manager' THEN 'service_manager'
      ELSE NULL
    END AS perfil_esperado,
    CASE
      WHEN n.time_nome IS NOT NULL THEN 'Time: ' || n.time_nome
      WHEN n.gerencia_nome IS NOT NULL THEN 'Gerência: ' || n.gerencia_nome
      WHEN n.diretoria_nome IS NOT NULL THEN 'Diretoria: ' || n.diretoria_nome
      ELSE coalesce(nullif(trim(n.setor), ''), '—')
    END AS organograma_label
  FROM norm n
),
com_profile AS (
  SELECT
    e.*,
    p.id AS profile_id,
    p.role AS perfil_atual,
    p.ativo AS profile_ativo
  FROM esperado e
  LEFT JOIN public.profiles p ON lower(trim(p.email)) = e.email_login
  WHERE e.perfil_esperado IS NOT NULL
)
SELECT
  nome,
  status,
  organograma_label AS organograma,
  perfil_esperado,
  coalesce(perfil_atual, '— sem profile —') AS perfil_atual,
  profile_ativo,
  email_login,
  rh_funcionario_id,
  profile_id
FROM com_profile
WHERE perfil_atual IS DISTINCT FROM perfil_esperado
ORDER BY nome;

-- Opcional: prestadores na matriz staff sem login criado
-- SELECT nome, status, organograma_label, perfil_esperado, email_login
-- FROM com_profile
-- WHERE email_login IS NULL OR profile_id IS NULL
-- ORDER BY nome;
