-- Calendário: feed iCal pessoal (unidirecional — Spin → agenda externa).
-- Token opaco por prestador; a Edge `rh-calendario-ics` gera o .ics.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rh_calendario_ics_feed (
  funcionario_id uuid PRIMARY KEY REFERENCES public.rh_funcionarios (id) ON DELETE CASCADE,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_fetched_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS rh_calendario_ics_feed_token_uidx
  ON public.rh_calendario_ics_feed (token);

COMMENT ON TABLE public.rh_calendario_ics_feed IS
  'URL secreta do calendário pessoal (iCal). Um token ativo por prestador; regenerar invalida o anterior.';

ALTER TABLE public.rh_calendario_ics_feed ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rh_calendario_ics_feed FROM PUBLIC;
REVOKE ALL ON TABLE public.rh_calendario_ics_feed FROM anon;
REVOKE ALL ON TABLE public.rh_calendario_ics_feed FROM authenticated;

CREATE OR REPLACE FUNCTION public._rh_calendario_ics_token_novo()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT replace(replace(rtrim(encode(gen_random_bytes(24), 'base64'), '='), '+', '-'), '/', '_');
$$;

REVOKE ALL ON FUNCTION public._rh_calendario_ics_token_novo() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._feriado_sp_capital(p_dia date)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  y int := EXTRACT(YEAR FROM p_dia)::int;
  a int; b int; c int; d int; e int; f int; g int; h int; i int; k int; l int; m int;
  mes int; dia int;
  pascoa date;
BEGIN
  IF to_char(p_dia, 'MM-DD') IN (
    '01-01', '01-25', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'
  ) THEN
    RETURN true;
  END IF;
  a := y % 19;
  b := y / 100;
  c := y % 100;
  d := b / 4;
  e := b % 4;
  f := (b + 8) / 25;
  g := (b - f + 1) / 3;
  h := (19 * a + b - d - g + 15) % 30;
  i := c / 4;
  k := c % 4;
  l := (32 + 2 * e + 2 * i - h - k) % 7;
  m := (a + 11 * h + 22 * l) / 451;
  mes := (h + l - 7 * m + 114) / 31;
  dia := ((h + l - 7 * m + 114) % 31) + 1;
  pascoa := make_date(y, mes, dia);
  RETURN p_dia = (pascoa - 2);
END;
$$;

COMMENT ON FUNCTION public._feriado_sp_capital(date) IS
  'Feriados nacionais + SP capital (fixos) e Sexta-feira Santa — alinhado a feriadosSaoPauloCapital.ts.';

REVOKE ALL ON FUNCTION public._feriado_sp_capital(date) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._rh_calendario_ics_turno_trabalho(p_valor text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN v = '' OR lower(v) IN ('folga', 'f', 'venda', 'atestado', 'compra', 'troca') THEN NULL
    WHEN v ~* '^compra\s*-\s*manh[ãa]$' THEN 'Manhã'
    WHEN v ~* '^compra\s*-\s*tarde$' THEN 'Tarde'
    WHEN v ~* '^compra\s*-\s*noite$' THEN 'Noite'
    WHEN v ~* '^compra\s*-\s*comercial$' THEN 'Comercial'
    WHEN v = 'Comercial' THEN 'Comercial'
    WHEN v = 'MRN' THEN 'Manhã'
    WHEN v = 'AFT' THEN 'Tarde'
    WHEN v = 'NGT' THEN 'Noite'
    WHEN v IN ('Manhã', 'Tarde', 'Noite') THEN v
    ELSE NULL
  END
  FROM (SELECT btrim(COALESCE(p_valor, '')) AS v) s;
$$;

REVOKE ALL ON FUNCTION public._rh_calendario_ics_turno_trabalho(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._rh_calendario_ics_usa_sintetico(
  p_area_atuacao text,
  p_staff_turno text,
  p_escala text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    lower(btrim(COALESCE(p_area_atuacao, ''))) = 'escritorio'
    OR btrim(COALESCE(p_staff_turno, '')) IN ('Comercial', 'Horário Comercial')
    OR lower(regexp_replace(btrim(COALESCE(p_escala, '')), '\s+', '', 'g')) = '5x2';
$$;

REVOKE ALL ON FUNCTION public._rh_calendario_ics_usa_sintetico(text, text, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._rh_calendario_ics_bounds(
  p_funcionario_id uuid,
  p_dia date,
  p_turno text
)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turno text := btrim(COALESCE(p_turno, ''));
  v_inicio timestamptz;
  v_escala text;
  v_horario text;
  v_h1 int;
  v_h2 int;
  v_horas int;
BEGIN
  IF p_funcionario_id IS NULL OR p_dia IS NULL OR v_turno = '' THEN
    RETURN;
  END IF;

  IF v_turno = 'Comercial' THEN
    starts_at := (p_dia + time '09:00') AT TIME ZONE 'America/Sao_Paulo';
    ends_at := (p_dia + time '18:00') AT TIME ZONE 'America/Sao_Paulo';
    RETURN NEXT;
    RETURN;
  END IF;

  v_inicio := public._escala_marketplace_inicio_turno(p_funcionario_id, p_dia, v_turno);
  IF v_inicio IS NULL THEN
    RETURN;
  END IF;

  SELECT
    lower(regexp_replace(btrim(COALESCE(f.escala, '')), '\s+', '', 'g')),
    btrim(COALESCE(f.staff_horario_turno, ''))
  INTO v_escala, v_horario
  FROM public.rh_funcionarios f
  WHERE f.id = p_funcionario_id;

  IF v_horario ~ '^\d{1,2}-\d{1,2}$' THEN
    v_h1 := split_part(v_horario, '-', 1)::int;
    v_h2 := split_part(v_horario, '-', 2)::int;
    v_horas := v_h2 - v_h1;
    IF v_horas <= 0 THEN
      v_horas := v_horas + 24;
    END IF;
    starts_at := v_inicio;
    ends_at := v_inicio + make_interval(hours => v_horas);
    RETURN NEXT;
    RETURN;
  END IF;

  starts_at := v_inicio;
  IF v_escala = '5x1' THEN
    ends_at := v_inicio + interval '6 hours 30 minutes';
  ELSE
    ends_at := v_inicio + interval '8 hours';
  END IF;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public._rh_calendario_ics_bounds(uuid, date, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._rh_calendario_ics_pode_gestir()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.role_permissions rp ON rp.role::text = p.role::text
        WHERE p.id = auth.uid()
          AND rp.page_key = 'rh_calendario'
          AND rp.can_view IN ('sim', 'proprios')
      )
    );
$$;

REVOKE ALL ON FUNCTION public._rh_calendario_ics_pode_gestir() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.rh_calendario_ics_feed_obter()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fid uuid;
  v_token text;
BEGIN
  IF NOT public._rh_calendario_ics_pode_gestir() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;

  v_fid := public._rh_funcionario_login_id();
  IF v_fid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_vinculo');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.rh_funcionarios f
    WHERE f.id = v_fid AND f.status IN ('ativo', 'indisponivel')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_vinculo');
  END IF;

  SELECT t.token INTO v_token
  FROM public.rh_calendario_ics_feed t
  WHERE t.funcionario_id = v_fid;

  IF v_token IS NULL THEN
    v_token := public._rh_calendario_ics_token_novo();
    INSERT INTO public.rh_calendario_ics_feed (funcionario_id, token)
    VALUES (v_fid, v_token)
    ON CONFLICT (funcionario_id) DO UPDATE
      SET token = EXCLUDED.token, updated_at = now()
    RETURNING token INTO v_token;
  END IF;

  RETURN jsonb_build_object('ok', true, 'token', v_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.rh_calendario_ics_feed_regenerar()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fid uuid;
  v_token text;
BEGIN
  IF NOT public._rh_calendario_ics_pode_gestir() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_permissao');
  END IF;

  v_fid := public._rh_funcionario_login_id();
  IF v_fid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_vinculo');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.rh_funcionarios f
    WHERE f.id = v_fid AND f.status IN ('ativo', 'indisponivel')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_vinculo');
  END IF;

  v_token := public._rh_calendario_ics_token_novo();
  INSERT INTO public.rh_calendario_ics_feed (funcionario_id, token, updated_at)
  VALUES (v_fid, v_token, now())
  ON CONFLICT (funcionario_id) DO UPDATE
    SET token = EXCLUDED.token, updated_at = now()
  RETURNING token INTO v_token;

  RETURN jsonb_build_object('ok', true, 'token', v_token);
END;
$$;

REVOKE ALL ON FUNCTION public.rh_calendario_ics_feed_obter() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_ics_feed_regenerar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_ics_feed_obter() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_ics_feed_regenerar() TO authenticated;

CREATE OR REPLACE FUNCTION public.rh_calendario_ics_feed_eventos(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_fid uuid;
  v_nome text;
  v_area text;
  v_staff_turno text;
  v_escala text;
  v_hoje date;
  v_de date;
  v_ate date;
  v_ref1 date;
  v_ref2 date;
  v_sintetico boolean;
  v_tem_eo boolean;
  v_eventos jsonb := '[]'::jsonb;
  r record;
  v_turno text;
  v_bounds record;
  v_valor text;
  v_iso text;
  v_label text;
BEGIN
  IF length(btrim(COALESCE(p_token, ''))) < 16 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token');
  END IF;

  SELECT f.id, f.nome, f.area_atuacao, f.staff_turno, f.escala
  INTO v_fid, v_nome, v_area, v_staff_turno, v_escala
  FROM public.rh_calendario_ics_feed t
  INNER JOIN public.rh_funcionarios f ON f.id = t.funcionario_id
  WHERE t.token = btrim(p_token)
    AND f.status IN ('ativo', 'indisponivel');

  IF v_fid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token');
  END IF;

  UPDATE public.rh_calendario_ics_feed
  SET last_fetched_at = now()
  WHERE funcionario_id = v_fid;

  v_hoje := (timezone('America/Sao_Paulo', now()))::date;
  v_de := date_trunc('month', v_hoje)::date;
  v_ate := (date_trunc('month', v_hoje) + interval '2 months' - interval '1 day')::date;
  v_ref1 := v_de;
  v_ref2 := (date_trunc('month', v_hoje) + interval '1 month')::date;
  v_sintetico := public._rh_calendario_ics_usa_sintetico(v_area, v_staff_turno, v_escala);

  SELECT EXISTS (
    SELECT 1
    FROM public.rh_gestao_escala_grade g
    INNER JOIN public.rh_gestao_escala_grade_status s
      ON s.ref_mes = g.ref_mes AND s.area_key = g.area_key AND s.status = 'aprovada'
    WHERE g.funcionario_id = v_fid
      AND g.ref_mes IN (v_ref1, v_ref2)
      AND (
        lower(btrim(g.area_key)) LIKE 'eo\_%' ESCAPE '\'
        OR lower(btrim(g.area_key)) LIKE 'eog\_%' ESCAPE '\'
      )
  ) INTO v_tem_eo;

  FOR r IN
    SELECT d::date AS dia
    FROM generate_series(v_de, v_ate, interval '1 day') AS d
  LOOP
    v_iso := to_char(r.dia, 'YYYY-MM-DD');
    v_valor := NULL;

    SELECT g.valor
    INTO v_valor
    FROM public.rh_gestao_escala_grade g
    INNER JOIN public.rh_gestao_escala_grade_status s
      ON s.ref_mes = g.ref_mes AND s.area_key = g.area_key AND s.status = 'aprovada'
    WHERE g.funcionario_id = v_fid
      AND g.dia_iso = r.dia
      AND g.ref_mes IN (v_ref1, v_ref2)
      AND (
        coalesce(nullif(trim(v_area), ''), 'estudio') <> 'escritorio'
        OR lower(btrim(g.area_key)) LIKE 'eo\_%' ESCAPE '\'
        OR lower(btrim(g.area_key)) LIKE 'eog\_%' ESCAPE '\'
      )
    ORDER BY
      CASE
        WHEN public._rh_calendario_ics_turno_trabalho(g.valor) IS NOT NULL THEN 0
        ELSE 1
      END
    LIMIT 1;

    IF v_sintetico AND NOT coalesce(v_tem_eo, false) THEN
      IF coalesce(v_valor, '') IN ('Compra', 'Venda', 'Troca', 'Atestado') THEN
        NULL;
      ELSE
        IF EXTRACT(ISODOW FROM r.dia) >= 6 OR public._feriado_sp_capital(r.dia) THEN
          v_valor := 'Folga';
        ELSE
          v_valor := 'Comercial';
        END IF;
      END IF;
    END IF;

    v_turno := public._rh_calendario_ics_turno_trabalho(v_valor);
    IF v_turno IS NULL THEN
      CONTINUE;
    END IF;

    SELECT b.starts_at, b.ends_at INTO v_bounds
    FROM public._rh_calendario_ics_bounds(v_fid, r.dia, v_turno) b;

    v_label := 'Turno ' || v_turno;
    IF v_bounds.starts_at IS NOT NULL AND v_bounds.ends_at IS NOT NULL THEN
      v_eventos := v_eventos || jsonb_build_array(jsonb_build_object(
        'uid', 'turno-' || v_fid::text || '-' || v_iso || '@data-intelligence.spingaming.com.br',
        'titulo', v_label,
        'startsAt', to_char(v_bounds.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'endsAt', to_char(v_bounds.ends_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'allDay', false
      ));
    ELSE
      v_eventos := v_eventos || jsonb_build_array(jsonb_build_object(
        'uid', 'turno-' || v_fid::text || '-' || v_iso || '@data-intelligence.spingaming.com.br',
        'titulo', v_label,
        'startsAt', v_iso,
        'endsAt', to_char(r.dia + 1, 'YYYY-MM-DD'),
        'allDay', true
      ));
    END IF;
  END LOOP;

  FOR r IN
    SELECT
      a.id,
      left(trim(a.payload->>'dia_iso'), 10)::date AS dia_iso,
      trim(coalesce(a.payload->>'reuniao_com', '')) AS reuniao_com,
      trim(coalesce(a.payload->>'reuniao_com_label', '')) AS reuniao_com_label
    FROM public.rh_calendario_acoes a
    WHERE a.tipo_acao = 'agendamento_reuniao'
      AND a.status = 'Agendado'
      AND a.solicitante_funcionario_id = v_fid
      AND coalesce(trim(a.payload->>'dia_iso'), '') <> ''
      AND length(trim(a.payload->>'dia_iso')) >= 10
      AND left(trim(a.payload->>'dia_iso'), 10)::date BETWEEN v_de AND v_ate
  LOOP
    v_iso := to_char(r.dia_iso, 'YYYY-MM-DD');
    v_label := 'Reunião - ' || CASE
      WHEN r.reuniao_com = 'rh' THEN 'RH'
      WHEN r.reuniao_com_label <> '' THEN r.reuniao_com_label
      ELSE 'Agenda'
    END;
    v_eventos := v_eventos || jsonb_build_array(jsonb_build_object(
      'uid', 'reuniao-' || r.id::text || '@data-intelligence.spingaming.com.br',
      'titulo', v_label,
      'startsAt', v_iso,
      'endsAt', to_char(r.dia_iso + 1, 'YYYY-MM-DD'),
      'allDay', true
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'nome', v_nome,
    'eventos', v_eventos
  );
END;
$$;

COMMENT ON FUNCTION public.rh_calendario_ics_feed_eventos(text) IS
  'Eventos iCal do prestador dono do token (mês corrente + seguinte, SP). Só service_role.';

REVOKE ALL ON FUNCTION public.rh_calendario_ics_feed_eventos(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rh_calendario_ics_feed_eventos(text) FROM anon;
REVOKE ALL ON FUNCTION public.rh_calendario_ics_feed_eventos(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rh_calendario_ics_feed_eventos(text) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_rh_calendario_ics_feed_encerrado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'encerrado' AND (OLD.status IS DISTINCT FROM 'encerrado') THEN
    DELETE FROM public.rh_calendario_ics_feed WHERE funcionario_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_calendario_ics_feed_encerrado ON public.rh_funcionarios;
CREATE TRIGGER trg_rh_calendario_ics_feed_encerrado
  AFTER UPDATE OF status ON public.rh_funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_rh_calendario_ics_feed_encerrado();

COMMIT;
