-- Segunda conta TAP CDA (Afiliados) — Status Técnico / sync_logs.
-- Secret da Edge: CDA_AFILIADOS_API_KEY (nunca no código). Body: { conta: "afiliados" }.

INSERT INTO public.integrations (slug, nome, descricao, ativo)
VALUES (
  'casa_apostas_afiliados',
  'Casa de Apostas (CDA) — Afiliados',
  'Sync de métricas TAP da conta Afiliados (Reporting API). Edge sync-metricas-cda com conta=afiliados; secret CDA_AFILIADOS_API_KEY.',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;

UPDATE public.integrations
SET
  nome = 'Casa de Apostas (CDA) — Influencers',
  descricao = COALESCE(
    descricao,
    'Sync de métricas TAP da conta Influencers. Edge sync-metricas-cda; secret CDA_INFLUENCERS_API_KEY.'
  )
WHERE slug = 'casa_apostas'
  AND nome IS DISTINCT FROM 'Casa de Apostas (CDA) — Influencers';
