-- Performance Hub — configuração persistente de pesos por time

BEGIN;

CREATE TABLE public.academy_performance_hub_scoring_config (
  time_slug   text        PRIMARY KEY,
  config      jsonb       NOT NULL,
  updated_by  uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academy_performance_hub_scoring_config_time_check
    CHECK (time_slug IN ('game_presenter', 'shuffler')),
  CONSTRAINT academy_performance_hub_scoring_config_json_check
    CHECK (jsonb_typeof(config) = 'object')
);

ALTER TABLE public.academy_performance_hub_scoring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_performance_hub_scoring_config_select
  ON public.academy_performance_hub_scoring_config
  FOR SELECT TO authenticated
  USING (public._academy_performance_hub_perm('view'));

CREATE POLICY academy_performance_hub_scoring_config_insert
  ON public.academy_performance_hub_scoring_config
  FOR INSERT TO authenticated
  WITH CHECK (
    public._academy_performance_hub_perm('create')
    AND updated_by = auth.uid()
  );

CREATE POLICY academy_performance_hub_scoring_config_update
  ON public.academy_performance_hub_scoring_config
  FOR UPDATE TO authenticated
  USING (public._academy_performance_hub_perm('create'))
  WITH CHECK (
    public._academy_performance_hub_perm('create')
    AND updated_by = auth.uid()
  );

GRANT SELECT, INSERT, UPDATE
  ON public.academy_performance_hub_scoring_config
  TO authenticated;

COMMIT;
