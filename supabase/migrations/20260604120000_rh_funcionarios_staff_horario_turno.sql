-- Horário do turno na Gestão de Staff (3x3 / 5x2); 4x2 e 5x1 usam apenas operadoras.

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS staff_horario_turno text NULL;

COMMENT ON COLUMN public.rh_funcionarios.staff_horario_turno IS
  'Chave do intervalo do turno na Staff (ex.: 07-15, 09-17) para escalas 3x3 e 5x2. Para 4x2/5x1 o horário vem só de operadoras.';

CREATE OR REPLACE FUNCTION public.rh_funcionarios_preserva_contratacao_self_sem_perm_grupo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF public._rh_funcionario_perm('edit') THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(OLD.email, '')))
  ) THEN
    RETURN NEW;
  END IF;

  NEW.status := OLD.status;
  NEW.setor := OLD.setor;
  NEW.org_diretoria_id := OLD.org_diretoria_id;
  NEW.org_gerencia_id := OLD.org_gerencia_id;
  NEW.org_time_id := OLD.org_time_id;
  NEW.cargo := OLD.cargo;
  NEW.nivel := OLD.nivel;
  NEW.salario := OLD.salario;
  NEW.data_inicio := OLD.data_inicio;
  NEW.data_funcao := OLD.data_funcao;
  NEW.data_desligamento := OLD.data_desligamento;
  NEW.escala := OLD.escala;
  NEW.tipo_contrato := OLD.tipo_contrato;
  NEW.observacao_rh := OLD.observacao_rh;
  NEW.staff_nickname := OLD.staff_nickname;
  NEW.staff_operadora_slug := OLD.staff_operadora_slug;
  NEW.staff_barcode := OLD.staff_barcode;
  NEW.staff_id_operacional := OLD.staff_id_operacional;
  NEW.staff_skills := OLD.staff_skills;
  NEW.staff_horario_turno := OLD.staff_horario_turno;
  RETURN NEW;
END;
$$;

COMMIT;
