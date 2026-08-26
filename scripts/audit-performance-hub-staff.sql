-- Auditoria: prestadores GP/Shuffler em Gestão de Staff vs elegíveis no Performance Hub.
-- Rodar no Supabase → SQL Editor (service role / postgres).
--
-- O PH inclui rh_funcionarios cujo time normalizado contém «game presenter» ou «shuffler»
-- (mesma regra da Escala Estúdio). Antes do fix de 2026-08, só entravam nomes exactos
-- «Game Presenter(s)» / «Shuffler(s)».

WITH times AS (
  SELECT
    t.id,
    t.nome,
    t.status,
    g.nome AS gerencia_nome,
    lower(
      trim(
        translate(
          regexp_replace(btrim(t.nome), '\s+', ' ', 'g'),
          'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
          'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
        )
      )
    ) AS nome_norm
  FROM public.rh_org_times t
  LEFT JOIN public.rh_org_gerencias g ON g.id = t.gerencia_id
  WHERE t.status = 'ativo'
),
func AS (
  SELECT
    f.id,
    f.nome,
    f.status,
    f.org_time_id,
    f.staff_live_no_estudio,
    f.data_inicio,
    t.nome AS time_nome,
    t.gerencia_nome,
    t.nome_norm,
    (t.nome_norm IN ('game presenter', 'game presenters', 'shuffler', 'shufflers')) AS ph_exact,
    (
      t.nome_norm LIKE '%game presenter%'
      OR t.nome_norm LIKE '%shuffler%'
    ) AS ph_includes
  FROM public.rh_funcionarios f
  LEFT JOIN times t ON t.id = f.org_time_id
  WHERE f.status IN ('ativo', 'indisponivel')
)
-- Prestadores GP/Shuffler que ficavam de fora com match exacto (possível causa no PH)
SELECT
  nome,
  status,
  time_nome,
  gerencia_nome,
  staff_live_no_estudio,
  data_inicio,
  ph_exact,
  ph_includes
FROM func
WHERE ph_includes
  AND NOT ph_exact
ORDER BY nome;

-- Yasmim (ajuste o ILIKE se necessário)
-- SELECT * FROM func WHERE nome ILIKE '%Yasmim%Vitoria%';
