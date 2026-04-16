-- Tipos de gestor adicionais: Figurino, Recursos Humanos (aba Gestores + user_scopes)

BEGIN;

ALTER TABLE public.gestor_tipo_pages
  DROP CONSTRAINT IF EXISTS gestor_tipo_pages_gestor_tipo_slug_check;

ALTER TABLE public.gestor_tipo_pages
  ADD CONSTRAINT gestor_tipo_pages_gestor_tipo_slug_check
  CHECK (
    gestor_tipo_slug IN (
      'operacoes',
      'marketing',
      'afiliados',
      'geral',
      'figurino',
      'recursos_humanos'
    )
  );

COMMENT ON CONSTRAINT gestor_tipo_pages_gestor_tipo_slug_check ON public.gestor_tipo_pages IS
  'Slugs alinhados ao front (GESTOR_TIPOS) e às edge functions criar-usuario / atualizar-perfil.';

COMMIT;
