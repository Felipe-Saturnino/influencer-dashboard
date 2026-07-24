-- Visibilidade de tutoriais da Ajuda por perfil (role).
-- Admin configura quais roles veem cada tutorial_id do catálogo em código.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ajuda_tutorial_visibilidade (
  tutorial_id   text        PRIMARY KEY,
  roles         text[]      NOT NULL DEFAULT '{}',
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid        REFERENCES auth.users (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.ajuda_tutorial_visibilidade IS
  'Perfis (roles) que podem ver cada tutorial da aba Tutoriais na Ajuda. Admin sempre vê todos.';

CREATE OR REPLACE FUNCTION public.ajuda_tutorial_visibilidade_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ajuda_tutorial_visibilidade_audit ON public.ajuda_tutorial_visibilidade;
CREATE TRIGGER trg_ajuda_tutorial_visibilidade_audit
  BEFORE INSERT OR UPDATE ON public.ajuda_tutorial_visibilidade
  FOR EACH ROW EXECUTE PROCEDURE public.ajuda_tutorial_visibilidade_audit();

ALTER TABLE public.ajuda_tutorial_visibilidade ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ajuda_tutorial_visibilidade_select ON public.ajuda_tutorial_visibilidade;
CREATE POLICY ajuda_tutorial_visibilidade_select
  ON public.ajuda_tutorial_visibilidade
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS ajuda_tutorial_visibilidade_admin_write ON public.ajuda_tutorial_visibilidade;
CREATE POLICY ajuda_tutorial_visibilidade_admin_write
  ON public.ajuda_tutorial_visibilidade
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

GRANT SELECT ON public.ajuda_tutorial_visibilidade TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ajuda_tutorial_visibilidade TO authenticated;

-- Seed: Controle de Presença — perfis de Estúdio (ponto no Calendário)
INSERT INTO public.ajuda_tutorial_visibilidade (tutorial_id, roles)
VALUES (
  'controle-presenca',
  ARRAY[
    'performance_coach',
    'service_manager',
    'customer_service',
    'shift_leader',
    'shuffler',
    'game_presenter'
  ]::text[]
)
ON CONFLICT (tutorial_id) DO NOTHING;

COMMIT;
