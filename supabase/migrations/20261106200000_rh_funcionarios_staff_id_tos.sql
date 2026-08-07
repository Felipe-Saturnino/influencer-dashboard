-- ID TOS (UUID do Service Manager no sistema Proxylive / ClickHouse stats_signals.signal_resolver_id).
-- Preenchimento manual em Gestão de Staff — time Service Manager. De-para para carga de sinais SM.

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS staff_id_tos text;

COMMENT ON COLUMN public.rh_funcionarios.staff_id_tos IS
  'UUID do Service Manager no TOS/Proxylive (ClickHouse stats_signals.signal_resolver_id). Preenchido em Gestão de Staff — time Service Manager. Distinto do staff_id_operacional (Work ID) e do UUID interno rh_funcionarios.id.';

-- Um UUID TOS por prestador (de-para estável na carga de sinais).
CREATE UNIQUE INDEX IF NOT EXISTS idx_rh_funcionarios_staff_id_tos_unique
  ON public.rh_funcionarios (lower(btrim(staff_id_tos)))
  WHERE staff_id_tos IS NOT NULL AND btrim(staff_id_tos) <> '';

-- Self-service não pode alterar ID TOS (só Gestão de Staff / perm edit).
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
  NEW.staff_estudio_slug := OLD.staff_estudio_slug;
  NEW.staff_barcode := OLD.staff_barcode;
  NEW.staff_id_operacional := OLD.staff_id_operacional;
  NEW.staff_id_tos := OLD.staff_id_tos;
  NEW.staff_skills := OLD.staff_skills;
  NEW.staff_horario_turno := OLD.staff_horario_turno;
  NEW.staff_live_no_estudio := OLD.staff_live_no_estudio;
  NEW.staff_fim_treinamento := OLD.staff_fim_treinamento;
  NEW.origem_contratacao := OLD.origem_contratacao;
  NEW.quem_indicou := OLD.quem_indicou;
  RETURN NEW;
END;
$$;

COMMIT;
