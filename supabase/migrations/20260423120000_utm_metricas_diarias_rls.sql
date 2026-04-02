-- utm_metricas_diarias: RLS ligado, sem políticas para anon/authenticated.
-- Acesso aos dados continua via:
--   • service_role (Edge Function sync-metricas-cda, upsert)
--   • Funções SECURITY DEFINER (aplicar_mapeamento_utm, get_campanha_funil_totais, get_campanhas_performance, etc.)
-- O cliente nunca usa supabase.from('utm_metricas_diarias').

ALTER TABLE public.utm_metricas_diarias ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.utm_metricas_diarias IS 'Métricas por UTM por dia. RLS ativo: sem políticas públicas; sync (service_role) e RPCs SECURITY DEFINER.';
