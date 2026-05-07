-- Spin na Rede — URL opcional de thumbnail (RSS ou SQL manual).

BEGIN;

ALTER TABLE public.spin_na_rede_mencao
  ADD COLUMN IF NOT EXISTS imagem_url text;

COMMENT ON COLUMN public.spin_na_rede_mencao.imagem_url IS
  'Thumbnail HTTPS (media:thumbnail, enclosure image, primeiro <img> no resumo RSS, ou URL manual).';

COMMIT;
