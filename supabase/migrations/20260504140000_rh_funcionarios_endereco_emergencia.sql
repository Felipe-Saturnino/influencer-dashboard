-- RH — endereço residencial/empresa detalhado + contato de emergência estruturado.
-- Mantém colunas legadas (endereco_residencial, contato_emergencia, endereco_empresa) preenchidas pela aplicação.

BEGIN;

ALTER TABLE public.rh_funcionarios
  ADD COLUMN IF NOT EXISTS res_cep text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS res_logradouro text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS res_numero text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS res_complemento text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS res_cidade text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS res_estado text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS emerg_nome text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS emerg_parentesco text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS emerg_telefone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS emp_cep text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS emp_logradouro text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS emp_numero text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS emp_complemento text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS emp_cidade text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS emp_estado text NOT NULL DEFAULT '';

UPDATE public.rh_funcionarios
SET res_logradouro = trim(both from endereco_residencial)
WHERE trim(both from coalesce(res_logradouro, '')) = ''
  AND trim(both from coalesce(endereco_residencial, '')) <> '';

UPDATE public.rh_funcionarios
SET emerg_nome = trim(both from contato_emergencia)
WHERE trim(both from coalesce(emerg_nome, '')) = ''
  AND trim(both from coalesce(contato_emergencia, '')) <> '';

UPDATE public.rh_funcionarios
SET emp_logradouro = trim(both from endereco_empresa)
WHERE trim(both from coalesce(emp_logradouro, '')) = ''
  AND trim(both from coalesce(endereco_empresa, '')) <> '';

COMMIT;
