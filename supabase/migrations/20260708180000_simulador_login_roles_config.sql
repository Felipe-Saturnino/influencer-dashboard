-- Matriz configurável: quais perfis simuláveis cada perfil pode escolher no Simulador de Login.

BEGIN;

CREATE TABLE IF NOT EXISTS public.simulador_login_roles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_role     text        NOT NULL,
  simulavel_role  text        NOT NULL,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (viewer_role, simulavel_role)
);

CREATE INDEX IF NOT EXISTS idx_simulador_login_roles_viewer
  ON public.simulador_login_roles (viewer_role);

COMMENT ON TABLE public.simulador_login_roles IS
  'Perfis que cada perfil (viewer_role) pode simular na página Simulador de Login. Admin ignora a matriz (vê todos os simuláveis).';

ALTER TABLE public.simulador_login_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo em simulador_login_roles"
  ON public.simulador_login_roles
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Usuário lê perfis simuláveis do próprio perfil"
  ON public.simulador_login_roles
  FOR SELECT
  USING (
    viewer_role = (SELECT p.role::text FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Seed: paridade com comportamento anterior (todos os simuláveis para cada perfil editável em Permissões).
INSERT INTO public.simulador_login_roles (viewer_role, simulavel_role)
SELECT v.role, s.role
FROM (
  VALUES
    ('executivo'), ('gestor'), ('rh'), ('figurino'), ('comunicacao'), ('performance_coach'),
    ('service_manager'), ('customer_service'), ('tech_ops'), ('shift_leader'), ('prestador'),
    ('operador'), ('agencia'), ('influencer'), ('afiliado'), ('investidor')
) AS v(role)
CROSS JOIN (
  VALUES
    ('gestor'), ('rh'), ('figurino'), ('comunicacao'), ('performance_coach'),
    ('service_manager'), ('customer_service'), ('tech_ops'), ('shift_leader'), ('prestador'),
    ('operador'), ('agencia'), ('influencer'), ('afiliado'), ('investidor')
) AS s(role)
ON CONFLICT (viewer_role, simulavel_role) DO NOTHING;

COMMIT;
