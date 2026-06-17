-- Remove dealers cujo prestador não está mais no elenco ativo de Game Presenter
-- (encerrado, outro time ou time inativo). Alinha catálogo com Gestão de Staff / Prestadores.

BEGIN;

DELETE FROM public.dealers d
WHERE d.rh_funcionario_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.rh_funcionarios f
    INNER JOIN public.rh_org_times t ON t.id = f.org_time_id
    WHERE f.id = d.rh_funcionario_id
      AND f.status IN ('ativo', 'indisponivel')
      AND lower(coalesce(t.status, '')) = 'ativo'
      AND lower(trim(regexp_replace(t.nome, '\s+', ' ', 'g'))) = 'game presenter'
  );

COMMENT ON COLUMN public.dealers.rh_funcionario_id IS
  'Prestador RH no time Game Presenter (dealer). Sincronizado por Gestão de Staff; removido ao sair do time ou encerrar prestação.';

COMMIT;
