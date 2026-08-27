-- Visibilidade inicial — Ofertas Spin (Marketplace): liderança e gestão de estúdio.
INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'marketplace-ofertas-spin',
  ARRAY[
    'shift_leader',
    'service_manager',
    'gestor_operacoes',
    'rh'
  ]::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;
