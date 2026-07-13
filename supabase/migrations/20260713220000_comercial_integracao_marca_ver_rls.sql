-- Integração: leitura de empresa e contatos para o modal Ver (mesmo do Pipeline B2B).

BEGIN;

DROP POLICY IF EXISTS comercial_empresas_select_integracao ON public.comercial_empresas;
CREATE POLICY comercial_empresas_select_integracao ON public.comercial_empresas
  FOR SELECT TO authenticated
  USING (public._comercial_integracao_perm('view'));

DROP POLICY IF EXISTS comercial_contatos_select_integracao ON public.comercial_marca_contatos;
CREATE POLICY comercial_contatos_select_integracao ON public.comercial_marca_contatos
  FOR SELECT TO authenticated
  USING (public._comercial_integracao_perm('view'));

COMMIT;
