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

COMMENT ON COLUMN public.torneio_cda_participante.apelido IS
  'Nome travado para a UI pública (não é Screen Name do BKO); o sync não sobrescreve.';

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

COMMENT ON COLUMN public.torneio_cda_ranking.apelido IS
  'Cópia do nome travado do participante no momento do sync — exibido na página pública.';

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

-- RLS — leitura pública só em torneio ativo (DROP IF EXISTS permite reexecutar no SQL Editor)
ALTER TABLE public.torneio_cda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneio_cda_participante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneio_cda_ranking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneio_cda_consolidado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneio_cda_atividade ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS torneio_cda_select_publico ON public.torneio_cda;
DROP POLICY IF EXISTS torneio_cda_participante_select_publico ON public.torneio_cda_participante;
DROP POLICY IF EXISTS torneio_cda_ranking_select_publico ON public.torneio_cda_ranking;
DROP POLICY IF EXISTS torneio_cda_consolidado_select_publico ON public.torneio_cda_consolidado;
DROP POLICY IF EXISTS torneio_cda_atividade_select_publico ON public.torneio_cda_atividade;
DROP POLICY IF EXISTS torneio_cda_service_all ON public.torneio_cda;
DROP POLICY IF EXISTS torneio_cda_participante_service_all ON public.torneio_cda_participante;
DROP POLICY IF EXISTS torneio_cda_ranking_service_all ON public.torneio_cda_ranking;
DROP POLICY IF EXISTS torneio_cda_consolidado_service_all ON public.torneio_cda_consolidado;
DROP POLICY IF EXISTS torneio_cda_atividade_service_all ON public.torneio_cda_atividade;

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

-- Seed — participantes do evento 03/09/2026 (Screen Name em apelido; sync atualiza no dia)
INSERT INTO public.torneio_cda (slug, nome, periodo_inicio, periodo_fim, ativo)
VALUES (
  'cda-vip-setembro-2026',
  'Torneio VIP Casa de Apostas e Spin Gaming — Setembro 2026',
  '2026-09-03 03:00:00+00',
  '2026-09-04 02:59:59.999+00',
  false
)
ON CONFLICT (slug) DO UPDATE
SET nome = EXCLUDED.nome,
    periodo_inicio = EXCLUDED.periodo_inicio,
    periodo_fim = EXCLUDED.periodo_fim,
    updated_at = now();

INSERT INTO public.torneio_cda_participante (torneio_id, user_name, apelido, player_id_bko)
SELECT t.id, v.user_name, v.apelido, v.player_id_bko
FROM public.torneio_cda t
CROSS JOIN (
  VALUES
    ('2205336', 'Alessandro Tomazelli', 'casadeapostas.if_dgc.L011_358_56.CDA-2205336'),
    ('2204772', 'Eliane Luiza', 'casadeapostas.if_dgc.L011_358_56.CDA-2204772'),
    ('2204766', 'Fernando Luis', 'casadeapostas.if_dgc.L011_358_56.CDA-2204766'),
    ('2204764', 'Flavio Luis', 'casadeapostas.if_dgc.L011_358_56.CDA-2204764'),
    ('2204743', 'Humberto dos Anjos', 'casadeapostas.if_dgc.L011_358_56.CDA-2204743'),
    ('2204823', 'Pedro Alexandre', 'casadeapostas.if_dgc.L011_358_56.CDA-2204823'),
    ('2204769', 'Flavio Hirata', 'casadeapostas.if_dgc.L011_358_56.CDA-2204769'),
    ('2204759', 'Rodrigo Junqueira', 'casadeapostas.if_dgc.L011_358_56.CDA-2204759'),
    ('2207973', 'Renato Dias', 'casadeapostas.if_dgc.L011_358_56.CDA-2207973'),
    ('2204755', 'Luiz Viveiros', 'casadeapostas.if_dgc.L011_358_56.CDA-2204755'),
    ('2208185', 'Miqueas Marcelo', 'casadeapostas.if_dgc.L011_358_56.CDA-2208185'),
    ('548736', 'Rodrigo Simonini', 'casadeapostas.if_dgc.L011_358_56.CDA-548736'),
    ('2208087', 'Bruno Yela', 'casadeapostas.if_dgc.L011_358_56.CDA-2208087'),
    ('770840', 'João Vitor', 'casadeapostas.if_dgc.L011_358_56.CDA-770840'),
    ('2210427', 'Luis Carlos', 'casadeapostas.if_dgc.L011_358_56.CDA-2210427'),
    ('2210442', 'Matheus Tonetti', 'casadeapostas.if_dgc.L011_358_56.CDA-2210442'),
    ('2210443', 'Bruno Hopf', 'casadeapostas.if_dgc.L011_358_56.CDA-2210443'),
    ('2210445', 'Marcos Alexandre', 'casadeapostas.if_dgc.L011_358_56.CDA-2210445')
) AS v(user_name, apelido, player_id_bko)
WHERE t.slug = 'cda-vip-setembro-2026'
ON CONFLICT (torneio_id, user_name) DO UPDATE
SET apelido = EXCLUDED.apelido,
    player_id_bko = EXCLUDED.player_id_bko;
