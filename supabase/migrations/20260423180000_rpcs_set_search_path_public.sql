-- SECURITY DEFINER: fixar search_path=public (evita hijacking de objetos em outros schemas).
-- Alinhado às outras RPCs do projeto (aprovar_pagamento, get_investimento_pago, etc.).

ALTER FUNCTION public.aplicar_mapeamento_utm(text, uuid) SET search_path = public;
ALTER FUNCTION public.get_campanha_funil_totais(date, date, text) SET search_path = public;
ALTER FUNCTION public.get_campanhas_performance(date, date, text) SET search_path = public;
