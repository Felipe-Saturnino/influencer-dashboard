-- Marketplace — expiração automática quando faltam menos de 2h para o turno.
--
-- Fonte da verdade: `inicio_turno_at`, calculado e congelado na publicação.
-- O cron encerra ofertas ativas mesmo sem ninguém abrir a página; as RPCs de
-- listar/aceitar/aprovar também aplicam a regra defensivamente.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

ALTER TABLE public.escala_marketplace_oferta
  ADD COLUMN IF NOT EXISTS inicio_turno_at timestamptz NULL;

COMMENT ON COLUMN public.escala_marketplace_oferta.inicio_turno_at IS
  'Início exato do turno ofertado (America/Sao_Paulo), congelado na publicação para expiração automática 2h antes.';

CREATE INDEX IF NOT EXISTS escala_marketplace_oferta_ativa_inicio_idx
  ON public.escala_marketplace_oferta (inicio_turno_at)
  WHERE status IN ('aberta', 'interessado', 'em_analise');

/** Replica no banco a resolução de início usada pelo cliente no Marketplace. */
CREATE OR REPLACE FUNCTION public._escala_marketplace_inicio_turno(
  p_funcionario_id uuid,
  p_dia_iso date,
  p_turno_label text
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escala text;
  v_staff_turno text;
  v_staff_horario text;
  v_operadora_slug text;
  v_turno text := btrim(COALESCE(p_turno_label, ''));
  v_hora time;
  v_hora_key text;
BEGIN
  IF p_funcionario_id IS NULL OR p_dia_iso IS NULL OR v_turno = '' THEN
    RETURN NULL;
  END IF;

  SELECT
    lower(regexp_replace(btrim(COALESCE(f.escala, '')), '\s+', '', 'g')),
    btrim(COALESCE(f.staff_turno, '')),
    btrim(COALESCE(f.staff_horario_turno, '')),
    btrim(COALESCE(f.staff_operadora_slug, ''))
  INTO v_escala, v_staff_turno, v_staff_horario, v_operadora_slug
  FROM public.rh_funcionarios f
  WHERE f.id = p_funcionario_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 5x2 Comercial: opções 09-17 / 19-03; default igual ao cliente = 09-17.
  IF v_escala = '5x2'
     AND v_turno = 'Comercial'
     AND v_staff_turno IN ('Comercial', 'Horário Comercial')
  THEN
    v_hora_key := CASE
      WHEN v_staff_horario IN ('09-17', '19-03') THEN v_staff_horario
      ELSE '09-17'
    END;
    v_hora := make_time(split_part(v_hora_key, '-', 1)::integer, 0, 0);

  -- 3x3: opções editáveis da Gestão de Staff; defaults iguais ao cliente.
  ELSIF v_escala = '3x3' AND v_turno = 'Manhã' THEN
    v_hora_key := '08-20';
    v_hora := make_time(8, 0, 0);
  ELSIF v_escala = '3x3' AND v_turno = 'Noite' THEN
    v_hora_key := CASE
      WHEN v_staff_horario IN ('18-06', '20-08') THEN v_staff_horario
      ELSE '18-06'
    END;
    v_hora := make_time(split_part(v_hora_key, '-', 1)::integer, 0, 0);

  -- 4x2 / 5x1 e fallback operacional: horários configurados na operadora.
  ELSIF v_turno IN ('Manhã', 'Tarde', 'Noite') THEN
    SELECT CASE v_turno
      WHEN 'Manhã' THEN o.turno_manha_inicio
      WHEN 'Tarde' THEN o.turno_tarde_inicio
      ELSE o.turno_noite_inicio
    END
    INTO v_hora
    FROM public.operadoras o
    WHERE o.slug = v_operadora_slug
    LIMIT 1;
  END IF;

  IF v_hora IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (p_dia_iso + v_hora) AT TIME ZONE 'America/Sao_Paulo';
END;
$$;

REVOKE ALL ON FUNCTION public._escala_marketplace_inicio_turno(uuid, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._escala_marketplace_inicio_turno(uuid, date, text) FROM authenticated;

-- Backfill das ofertas já existentes. As ativas sem horário resolvível recebem
-- fallback conservador no expirer (dia atual/passado), alinhado ao aceite legado.
UPDATE public.escala_marketplace_oferta o
SET inicio_turno_at = public._escala_marketplace_inicio_turno(
  o.ofertante_funcionario_id,
  o.dia_iso,
  o.turno_label
)
WHERE o.inicio_turno_at IS NULL;

CREATE OR REPLACE FUNCTION public._escala_marketplace_limite_2h_atingido(
  p_inicio_turno_at timestamptz,
  p_dia_iso date,
  p_agora timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_inicio_turno_at IS NOT NULL
      THEN p_inicio_turno_at < p_agora + interval '2 hours'
    -- Somente legado sem início resolvido: o aceite antigo já rejeitava o dia atual.
    ELSE p_dia_iso <= (p_agora AT TIME ZONE 'America/Sao_Paulo')::date
  END;
$$;

REVOKE ALL ON FUNCTION public._escala_marketplace_limite_2h_atingido(timestamptz, date, timestamptz)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public._escala_marketplace_limite_2h_atingido(timestamptz, date, timestamptz)
  FROM authenticated;

CREATE OR REPLACE FUNCTION public.escala_marketplace_expirar_ofertas_2h()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  UPDATE public.escala_marketplace_oferta o
  SET status = 'expirada', atualizado_em = now()
  WHERE o.status IN ('aberta', 'interessado', 'em_analise')
    AND public._escala_marketplace_limite_2h_atingido(
      o.inicio_turno_at,
      o.dia_iso,
      now()
    );

  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_expirar_ofertas_2h() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.escala_marketplace_expirar_ofertas_2h() FROM authenticated;

-- ─── Criar: congela o início do turno e exige resolução segura ──────────────

ALTER FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text)
  RENAME TO _escala_marketplace_oferta_criar_sem_inicio_2h;

REVOKE ALL ON FUNCTION public._escala_marketplace_oferta_criar_sem_inicio_2h(text, date, text, text, text)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public._escala_marketplace_oferta_criar_sem_inicio_2h(text, date, text, text, text)
  FROM authenticated;

CREATE FUNCTION public.escala_marketplace_oferta_criar(
  p_tipo text,
  p_dia_iso date,
  p_valor_celula text,
  p_turno_label text DEFAULT NULL,
  p_observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_id uuid;
  v_inicio timestamptz;
  v_fid uuid;
  v_turno text;
BEGIN
  v_result := public._escala_marketplace_oferta_criar_sem_inicio_2h(
    p_tipo,
    p_dia_iso,
    p_valor_celula,
    p_turno_label,
    p_observacao
  );
  IF COALESCE((v_result ->> 'ok')::boolean, false) IS NOT TRUE THEN
    RETURN v_result;
  END IF;

  v_id := (v_result ->> 'id')::uuid;
  SELECT o.ofertante_funcionario_id, o.turno_label
  INTO v_fid, v_turno
  FROM public.escala_marketplace_oferta o
  WHERE o.id = v_id
  FOR UPDATE;

  -- Usa o turno validado/congelado pela RPC interna, não o argumento do cliente.
  v_inicio := public._escala_marketplace_inicio_turno(v_fid, p_dia_iso, v_turno);
  IF v_inicio IS NULL THEN
    DELETE FROM public.escala_marketplace_oferta WHERE id = v_id;
    RETURN jsonb_build_object('ok', false, 'error', 'horario_turno_indisponivel');
  END IF;

  IF v_inicio < now() + interval '24 hours' THEN
    DELETE FROM public.escala_marketplace_oferta WHERE id = v_id;
    RETURN jsonb_build_object('ok', false, 'error', 'antecedencia_minima');
  END IF;

  UPDATE public.escala_marketplace_oferta
  SET inicio_turno_at = v_inicio
  WHERE id = v_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_criar(text, date, text, text, text)
  TO authenticated;

-- ─── Listar: expiração lazy além do cron ────────────────────────────────────

ALTER FUNCTION public.escala_marketplace_ofertas_listar(date)
  RENAME TO _escala_marketplace_ofertas_listar_sem_expiracao_2h;

REVOKE ALL ON FUNCTION public._escala_marketplace_ofertas_listar_sem_expiracao_2h(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._escala_marketplace_ofertas_listar_sem_expiracao_2h(date)
  FROM authenticated;

CREATE FUNCTION public.escala_marketplace_ofertas_listar(p_ref_mes date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.escala_marketplace_expirar_ofertas_2h();
  RETURN public._escala_marketplace_ofertas_listar_sem_expiracao_2h(p_ref_mes);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_ofertas_listar(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_ofertas_listar(date) TO authenticated;

-- ─── Aceitar: lock + barreira defensiva antes de alterar a grade ────────────

ALTER FUNCTION public.escala_marketplace_oferta_aceitar(uuid, date, text)
  RENAME TO _escala_marketplace_oferta_aceitar_sem_limite_2h;

REVOKE ALL ON FUNCTION public._escala_marketplace_oferta_aceitar_sem_limite_2h(uuid, date, text)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public._escala_marketplace_oferta_aceitar_sem_limite_2h(uuid, date, text)
  FROM authenticated;

CREATE FUNCTION public.escala_marketplace_oferta_aceitar(
  p_oferta_id uuid,
  p_dia_iso_interesse date DEFAULT NULL,
  p_valor_celula_interesse text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_inicio timestamptz;
  v_dia date;
BEGIN
  SELECT o.status, o.inicio_turno_at, o.dia_iso
  INTO v_status, v_inicio, v_dia
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id
  FOR UPDATE;

  IF FOUND
     AND v_status IN ('aberta', 'interessado')
     AND public._escala_marketplace_limite_2h_atingido(v_inicio, v_dia, now())
  THEN
    UPDATE public.escala_marketplace_oferta
    SET status = 'expirada', atualizado_em = now()
    WHERE id = p_oferta_id;
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;

  RETURN public._escala_marketplace_oferta_aceitar_sem_limite_2h(
    p_oferta_id,
    p_dia_iso_interesse,
    p_valor_celula_interesse
  );
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_oferta_aceitar(uuid, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_oferta_aceitar(uuid, date, text)
  TO authenticated;

-- ─── Aprovar troca: a proposta também expira 2h antes ──────────────────────

ALTER FUNCTION public.escala_marketplace_troca_aprovar(uuid)
  RENAME TO _escala_marketplace_troca_aprovar_sem_limite_2h;

REVOKE ALL ON FUNCTION public._escala_marketplace_troca_aprovar_sem_limite_2h(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._escala_marketplace_troca_aprovar_sem_limite_2h(uuid)
  FROM authenticated;

CREATE FUNCTION public.escala_marketplace_troca_aprovar(p_oferta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_inicio timestamptz;
  v_dia date;
BEGIN
  SELECT o.status, o.inicio_turno_at, o.dia_iso
  INTO v_status, v_inicio, v_dia
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id
  FOR UPDATE;

  IF FOUND
     AND v_status = 'em_analise'
     AND public._escala_marketplace_limite_2h_atingido(v_inicio, v_dia, now())
  THEN
    UPDATE public.escala_marketplace_oferta
    SET status = 'expirada', atualizado_em = now()
    WHERE id = p_oferta_id;
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;

  RETURN public._escala_marketplace_troca_aprovar_sem_limite_2h(p_oferta_id);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_troca_aprovar(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_troca_aprovar(uuid) TO authenticated;

-- Recusar não pode reabrir uma proposta cujo limite já foi alcançado.
ALTER FUNCTION public.escala_marketplace_troca_recusar(uuid)
  RENAME TO _escala_marketplace_troca_recusar_sem_limite_2h;

REVOKE ALL ON FUNCTION public._escala_marketplace_troca_recusar_sem_limite_2h(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._escala_marketplace_troca_recusar_sem_limite_2h(uuid)
  FROM authenticated;

CREATE FUNCTION public.escala_marketplace_troca_recusar(p_oferta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_inicio timestamptz;
  v_dia date;
BEGIN
  SELECT o.status, o.inicio_turno_at, o.dia_iso
  INTO v_status, v_inicio, v_dia
  FROM public.escala_marketplace_oferta o
  WHERE o.id = p_oferta_id
  FOR UPDATE;

  IF FOUND
     AND v_status = 'em_analise'
     AND public._escala_marketplace_limite_2h_atingido(v_inicio, v_dia, now())
  THEN
    UPDATE public.escala_marketplace_oferta
    SET status = 'expirada', atualizado_em = now()
    WHERE id = p_oferta_id;
    RETURN jsonb_build_object('ok', false, 'error', 'oferta_expirada');
  END IF;

  RETURN public._escala_marketplace_troca_recusar_sem_limite_2h(p_oferta_id);
END;
$$;

REVOKE ALL ON FUNCTION public.escala_marketplace_troca_recusar(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escala_marketplace_troca_recusar(uuid) TO authenticated;

COMMENT ON FUNCTION public.escala_marketplace_expirar_ofertas_2h() IS
  'Expira ofertas aberta/interessado/em_analise quando faltam menos de 2h para o início congelado do turno.';

-- Cron principal: a cada minuto. As RPCs mantêm a mesma regra como proteção
-- caso o pg_cron esteja temporariamente indisponível.
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = 'escala-marketplace-expirar-ofertas-2h'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
END;
$$;

SELECT cron.schedule(
  'escala-marketplace-expirar-ofertas-2h',
  '* * * * *',
  'SELECT public.escala_marketplace_expirar_ofertas_2h();'
);

COMMIT;
