-- Gestão de Staff — datas na aba Dados de skills.

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS staff_live_no_estudio date,
  ADD COLUMN IF NOT EXISTS staff_fim_treinamento date;

COMMENT ON COLUMN public.rh_funcionarios.staff_live_no_estudio IS
  'Data da live no estúdio (Gestão de Staff > Dados de skills).';

COMMENT ON COLUMN public.rh_funcionarios.staff_fim_treinamento IS
  'Fim do treinamento (YYYY-MM-DD); preenchimento automático via Supabase (somente leitura na UI).';

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
  NEW.staff_live_no_estudio := OLD.staff_live_no_estudio;
  NEW.staff_fim_treinamento := OLD.staff_fim_treinamento;
  RETURN NEW;
END;
$$;

COMMIT;
