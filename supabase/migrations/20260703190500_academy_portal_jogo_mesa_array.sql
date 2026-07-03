-- Portal da Academy — Qual Jogo? passa a multi-seleção (text[])

BEGIN;

ALTER TABLE public.academy_portal_dica
  ALTER COLUMN jogo_mesa TYPE text[]
  USING CASE
    WHEN jogo_mesa IS NULL OR trim(jogo_mesa) = '' THEN NULL
    ELSE ARRAY[jogo_mesa]
  END;

ALTER TABLE public.academy_portal_manual
  ALTER COLUMN jogo_mesa TYPE text[]
  USING CASE
    WHEN jogo_mesa IS NULL OR trim(jogo_mesa) = '' THEN NULL
    ELSE ARRAY[jogo_mesa]
  END;

COMMIT;
