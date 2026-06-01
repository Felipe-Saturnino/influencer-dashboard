-- Template de Home para perfil Operador (null / default = Home Operador Padrão).

ALTER TABLE public.operadoras
  ADD COLUMN IF NOT EXISTS home_template text;

COMMENT ON COLUMN public.operadoras.home_template IS
  'Chave do template de Home do perfil Operador. NULL, default ou padrao = Home Operador Padrão; demais chaves registradas no front (ex.: blaze).';
