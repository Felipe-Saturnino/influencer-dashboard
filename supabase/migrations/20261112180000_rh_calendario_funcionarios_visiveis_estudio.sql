-- Calendário: devolver vínculo de estúdio nos funcionários visíveis
-- (horário Manhã/Tarde/Noite em 4x2/5x1 vem de estudios_spin, não só de operadora).

DROP FUNCTION IF EXISTS public.rh_calendario_funcionarios_visiveis();

CREATE FUNCTION public.rh_calendario_funcionarios_visiveis()
RETURNS TABLE (
  id uuid,
  status text,
  nome text,
  org_diretoria_id uuid,
  org_gerencia_id uuid,
  org_time_id uuid,
  area_atuacao text,
  escala text,
  staff_turno text,
  staff_horario_turno text,
  staff_operadora_slug text,
  staff_estudio_slug text,
  staff_estudio_slugs text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.status,
    f.nome,
    f.org_diretoria_id,
    f.org_gerencia_id,
    f.org_time_id,
    f.area_atuacao,
    f.escala,
    f.staff_turno,
    f.staff_horario_turno,
    f.staff_operadora_slug,
    f.staff_estudio_slug,
    f.staff_estudio_slugs
  FROM public.rh_funcionarios f
  INNER JOIN public._rh_calendario_funcionarios_escopo() e
    ON e.funcionario_id = f.id
  ORDER BY f.nome
$$;

COMMENT ON FUNCTION public.rh_calendario_funcionarios_visiveis() IS
  'Calendário RH: funcionários no escopo do Organograma (inclui estúdio para resolver horários de turno).';

REVOKE ALL ON FUNCTION public.rh_calendario_funcionarios_visiveis() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_calendario_funcionarios_visiveis() TO authenticated;
