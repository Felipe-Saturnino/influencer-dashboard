-- Calendário RH: habilita coluna Editar na matriz (Relatório de Presença + ações de presença).
-- Valores nulos (salva anterior com hasEditar=false) passam a «Não» até liberação explícita.

BEGIN;

UPDATE public.role_permissions
SET can_editar = 'nao'
WHERE page_key = 'rh_calendario'
  AND (can_editar IS NULL OR trim(can_editar::text) = '');

COMMIT;
