-- Torneio Live Cassino CDA × Spin — snapshot para página pública (sync manual via scripts/torneio-cda-bko-sync.mjs).

CREATE TABLE IF NOT EXISTS public.torneio_cda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  periodo_inicio timestamptz NOT NULL,
  periodo_fim timestamptz NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.torneio_cda IS
  'Configuração do torneio Live Cassino CDA. Período usado pelo sync BKO (from/to UTC).';

CREATE TABLE IF NOT EXISTS public.torneio_cda_participante (
  torneio_id uuid NOT NULL REFERENCES public.torneio_cda (id) ON DELETE CASCADE,
  user_name text NOT NULL,
  apelido text NOT NULL,
  player_id_bko text,
  PRIMARY KEY (torneio_id, user_name)
);

COMMENT ON COLUMN public.torneio_cda_participante.user_name IS
  'User Name CDA (externalName no BKO), ex.: 1990329.';

CREATE TABLE IF NOT EXISTS public.torneio_cda_ranking (
  torneio_id uuid NOT NULL REFERENCES public.torneio_cda (id) ON DELETE CASCADE,
  user_name text NOT NULL,
  apelido text NOT NULL,
  posicao integer NOT NULL,
  rodadas_jogadas integer NOT NULL DEFAULT 0,
  rodadas_ganhas integer NOT NULL DEFAULT 0,
  valor_apostado numeric(14, 2) NOT NULL DEFAULT 0,
  pontos bigint NOT NULL DEFAULT 0,
  sincronizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (torneio_id, user_name)
);

CREATE INDEX IF NOT EXISTS idx_torneio_cda_ranking_posicao
  ON public.torneio_cda_ranking (torneio_id, posicao);

CREATE TABLE IF NOT EXISTS public.torneio_cda_consolidado (
  torneio_id uuid PRIMARY KEY REFERENCES public.torneio_cda (id) ON DELETE CASCADE,
  rodadas_jogadas integer NOT NULL DEFAULT 0,
  rodadas_ganhas integer NOT NULL DEFAULT 0,
  valor_apostado numeric(14, 2) NOT NULL DEFAULT 0,
  sincronizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.torneio_cda_atividade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  torneio_id uuid NOT NULL REFERENCES public.torneio_cda (id) ON DELETE CASCADE,
  user_name text NOT NULL,
  apelido text NOT NULL,
  game_id text NOT NULL,
  game_type text NOT NULL,
  table_name text NOT NULL,
  valor_net numeric(14, 2) NOT NULL,
  mensagem text NOT NULL,
  ocorrido_em timestamptz NOT NULL,
  UNIQUE (torneio_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_torneio_cda_atividade_ocorrido
  ON public.torneio_cda_atividade (torneio_id, ocorrido_em DESC);

-- RLS — leitura pública só em torneio ativo
ALTER TABLE public.torneio_cda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneio_cda_participante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneio_cda_ranking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneio_cda_consolidado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneio_cda_atividade ENABLE ROW LEVEL SECURITY;

CREATE POLICY torneio_cda_select_publico ON public.torneio_cda
  FOR SELECT TO anon, authenticated
  USING (ativo = true);

CREATE POLICY torneio_cda_participante_select_publico ON public.torneio_cda_participante
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.torneio_cda t
      WHERE t.id = torneio_id AND t.ativo = true
    )
  );

CREATE POLICY torneio_cda_ranking_select_publico ON public.torneio_cda_ranking
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.torneio_cda t
      WHERE t.id = torneio_id AND t.ativo = true
    )
  );

CREATE POLICY torneio_cda_consolidado_select_publico ON public.torneio_cda_consolidado
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.torneio_cda t
      WHERE t.id = torneio_id AND t.ativo = true
    )
  );

CREATE POLICY torneio_cda_atividade_select_publico ON public.torneio_cda_atividade
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.torneio_cda t
      WHERE t.id = torneio_id AND t.ativo = true
    )
  );

CREATE POLICY torneio_cda_service_all ON public.torneio_cda
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY torneio_cda_participante_service_all ON public.torneio_cda_participante
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY torneio_cda_ranking_service_all ON public.torneio_cda_ranking
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY torneio_cda_consolidado_service_all ON public.torneio_cda_consolidado
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY torneio_cda_atividade_service_all ON public.torneio_cda_atividade
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed inicial — participantes de teste; substitua user_name/apelido antes do evento real
INSERT INTO public.torneio_cda (slug, nome, periodo_inicio, periodo_fim, ativo)
VALUES (
  'cda-vip-setembro-2026',
  'Torneio VIP Casa de Apostas e Spin Gaming — Setembro 2026',
  '2026-09-01 03:00:00+00',
  '2026-10-01 02:59:59+00',
  false
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.torneio_cda_participante (torneio_id, user_name, apelido, player_id_bko)
SELECT t.id, v.user_name, v.apelido, v.player_id_bko
FROM public.torneio_cda t
CROSS JOIN (
  VALUES
    ('1990329', 'Nathan', 'casadeapostas.if_dgc.L011_358_56.CDA-1990329'),
    ('1989697', 'Daci', 'casadeapostas.if_dgc.L011_358_56.CDA-1989697'),
    ('1713222', 'Gusti', 'casadeapostas.if_dgc.L011_358_56.CDA-1713222'),
    ('2152775', 'Matrix00', 'casadeapostas.if_dgc.L011_358_56.CDA-2152775'),
    ('2032222', 'DG', 'casadeapostas.if_dgc.L011_358_56.CDA-2032222')
) AS v(user_name, apelido, player_id_bko)
WHERE t.slug = 'cda-vip-setembro-2026'
ON CONFLICT (torneio_id, user_name) DO UPDATE
SET apelido = EXCLUDED.apelido,
    player_id_bko = EXCLUDED.player_id_bko;
