-- Controle de Turno → Escala do Turno: incluir Compra - Turno como escalado.
-- Quem vendeu (Venda) ou está em Troca/Folga continua fora.
-- Aplicar no Supabase Editor (paste) — não editar migrations antigas.

BEGIN;

CREATE OR REPLACE FUNCTION public.escala_controle_turno_presenca_dia(
  p_dia date,
  p_turno text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turno text := lower(btrim(COALESCE(p_turno, '')));
  v_valor text;
  v_ref date;
  v_out jsonb;
BEGIN
  IF NOT public._escala_controle_turno_perm('view') THEN
    RAISE EXCEPTION 'sem_permissao';
  END IF;

  IF p_dia IS NULL THEN
    RAISE EXCEPTION 'dia_obrigatorio';
  END IF;

  IF v_turno NOT IN ('manha', 'tarde', 'noite') THEN
    RAISE EXCEPTION 'turno_invalido';
  END IF;

  v_ref := date_trunc('month', p_dia)::date;
  v_valor := CASE v_turno
    WHEN 'manha' THEN 'MRN'
    WHEN 'tarde' THEN 'AFT'
    ELSE 'NGT'
  END;

  WITH escalados AS (
    SELECT DISTINCT ON (f.id)
      f.id AS funcionario_id,
      COALESCE(NULLIF(btrim(f.nome), ''), '—') AS nome,
      COALESCE(NULLIF(btrim(f.staff_nickname), ''), '') AS nickname,
      COALESCE(NULLIF(btrim(t.nome), ''), '') AS time_nome,
      CASE
        WHEN f.staff_estudio_slugs IS NOT NULL
             AND cardinality(f.staff_estudio_slugs) > 0
             AND EXISTS (
               SELECT 1 FROM unnest(f.staff_estudio_slugs) s(slug)
               WHERE lower(btrim(s.slug)) = 'todos'
             )
          THEN 'Todos Estúdios'
        WHEN f.staff_estudio_slugs IS NOT NULL
             AND cardinality(f.staff_estudio_slugs) > 0
          THEN COALESCE(
            (
              SELECT string_agg(COALESCE(NULLIF(btrim(es.nome), ''), btrim(s.slug)), ' · ' ORDER BY COALESCE(es.nome, s.slug))
              FROM unnest(f.staff_estudio_slugs) s(slug)
              LEFT JOIN public.estudios_spin es ON es.slug = btrim(s.slug)
              WHERE btrim(s.slug) <> '' AND lower(btrim(s.slug)) <> 'todos'
            ),
            '—'
          )
        WHEN NULLIF(btrim(f.staff_estudio_slug), '') IS NOT NULL
          THEN COALESCE(
            (
              SELECT NULLIF(btrim(es.nome), '')
              FROM public.estudios_spin es
              WHERE es.slug = btrim(f.staff_estudio_slug)
            ),
            btrim(f.staff_estudio_slug)
          )
        WHEN NULLIF(btrim(f.staff_operadora_slug), '') IS NOT NULL
          THEN COALESCE(
            (
              SELECT COALESCE(NULLIF(btrim(es.nome), ''), j.estudio_slug)
              FROM public.estudios_spin_operadoras j
              LEFT JOIN public.estudios_spin es ON es.slug = j.estudio_slug
              WHERE j.operadora_slug = btrim(f.staff_operadora_slug)
              ORDER BY CASE WHEN es.tipo = 'dedicado' THEN 0 ELSE 1 END, j.estudio_slug
              LIMIT 1
            ),
            '—'
          )
        ELSE '—'
      END AS estudio_nome
    FROM public.rh_funcionarios f
    INNER JOIN public.rh_org_times t ON t.id = f.org_time_id AND t.status = 'ativo'
    INNER JOIN public.rh_gestao_escala_grade gr
      ON gr.funcionario_id = f.id
     AND gr.ref_mes = v_ref
     AND gr.dia_iso = p_dia
     AND gr.area_key IN ('game_presenter', 'shuffler')
     AND (
       -- Escalado: sigla, rótulo Manhã/Tarde/Noite ou Compra - Turno.
       -- Venda, Troca, Folga e demais valores não entram.
       btrim(COALESCE(gr.valor, '')) = v_valor
       OR btrim(COALESCE(gr.valor, '')) = CASE v_turno
         WHEN 'manha' THEN 'Manhã'
         WHEN 'tarde' THEN 'Tarde'
         ELSE 'Noite'
       END
       OR btrim(COALESCE(gr.valor, '')) = CASE v_turno
         WHEN 'manha' THEN 'Compra - Manhã'
         WHEN 'tarde' THEN 'Compra - Tarde'
         ELSE 'Compra - Noite'
       END
     )
    WHERE f.status IN ('ativo', 'indisponivel')
      AND (
        lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%game presenter%'
        OR lower(regexp_replace(btrim(t.nome), '\s+', ' ', 'g')) LIKE '%shuffler%'
      )
    ORDER BY f.id, gr.area_key
  ),
  uids AS (
    SELECT e.funcionario_id, u.id AS user_id
    FROM escalados e
    INNER JOIN public.rh_funcionarios f ON f.id = e.funcionario_id
    INNER JOIN auth.users u ON (
      lower(trim(COALESCE(f.email, ''))) = lower(trim(COALESCE(u.email::text, '')))
      OR (
        trim(COALESCE(f.email_spin, '')) <> ''
        AND lower(trim(COALESCE(f.email_spin, ''))) = lower(trim(COALESCE(u.email::text, '')))
      )
    )
  ),
  ponto AS (
    SELECT
      COALESCE(r.funcionario_id, uids.funcionario_id) AS funcionario_id,
      min(r.created_at) FILTER (WHERE r.tipo = 'check_in') AS check_in_at,
      max(r.created_at) FILTER (WHERE r.tipo = 'check_out') AS check_out_at
    FROM public.prestador_ponto_registros r
    LEFT JOIN uids ON uids.user_id = r.user_id
    WHERE r.dia_sp = p_dia
      AND (
        r.funcionario_id IN (SELECT funcionario_id FROM escalados)
        OR uids.funcionario_id IS NOT NULL
      )
    GROUP BY COALESCE(r.funcionario_id, uids.funcionario_id)
  ),
  reg AS (
    SELECT pr.prestador_id, pr.status_presenca, pr.entrada_hhmm, pr.saida_hhmm
    FROM public.escala_ct_presenca_registro pr
    WHERE pr.data = p_dia
      AND pr.turno = v_turno
  ),
  linhas AS (
    SELECT
      e.funcionario_id,
      e.nome,
      e.nickname,
      e.time_nome,
      e.estudio_nome,
      CASE
        WHEN r.prestador_id IS NOT NULL THEN btrim(COALESCE(r.entrada_hhmm, ''))
        WHEN p.check_in_at IS NOT NULL
          THEN to_char(p.check_in_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
        ELSE ''
      END AS entrada,
      CASE
        WHEN r.prestador_id IS NOT NULL THEN btrim(COALESCE(r.saida_hhmm, ''))
        WHEN p.check_out_at IS NOT NULL
          THEN to_char(p.check_out_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
        ELSE ''
      END AS saida,
      CASE
        WHEN r.prestador_id IS NOT NULL THEN r.status_presenca
        WHEN p.check_in_at IS NOT NULL THEN 'presente'
        ELSE 'pendente'
      END AS status,
      (r.prestador_id IS NOT NULL) AS registrado
    FROM escalados e
    LEFT JOIN ponto p ON p.funcionario_id = e.funcionario_id
    LEFT JOIN reg r ON r.prestador_id = e.funcionario_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', l.funcionario_id,
      'nome', l.nome,
      'nickname', l.nickname,
      'time', l.time_nome,
      'estudio', l.estudio_nome,
      'entrada', l.entrada,
      'saida', l.saida,
      'status', l.status,
      'registrado', l.registrado
    )
    ORDER BY l.nome
  ), '[]'::jsonb)
  INTO v_out
  FROM linhas l;

  RETURN v_out;
END;
$$;

COMMENT ON FUNCTION public.escala_controle_turno_presenca_dia(date, text) IS
  'Controle de Turno → Escala do Turno: escalados GP/Shuffler do dia/turno (MRN/AFT/NGT, Manhã/Tarde/Noite e Compra - Turno; exclui Venda/Troca/Folga) com ponto, overlay de escala_ct_presenca_registro e estúdio do cadastro Gestão de Staff.';

COMMIT;
