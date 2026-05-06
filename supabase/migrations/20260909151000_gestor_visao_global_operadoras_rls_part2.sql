BEGIN;

-- Parte 2: banca de jogo, playbook/guia, roteiro, dealers — políticas sem segregação por operadora para gestor (equivalente à 20260908120000).

DROP POLICY IF EXISTS "banca_jogo_select_admin_gestor" ON public.banca_jogo_solicitacoes;
CREATE POLICY "banca_jogo_select_admin_gestor"
  ON public.banca_jogo_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('banca_jogo', 'view')
  );

DROP POLICY IF EXISTS "banca_jogo_update_staff" ON public.banca_jogo_solicitacoes;
CREATE POLICY "banca_jogo_update_staff"
  ON public.banca_jogo_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('banca_jogo', 'edit')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('banca_jogo', 'edit')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'executivo')
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
      AND operadora_slug IN (
        SELECT s.scope_ref FROM public.user_scopes s
        WHERE s.user_id = auth.uid() AND s.scope_type = 'operadora'
      )
    )
  );

DROP POLICY IF EXISTS "banca_jogo_delete_admin_gestor" ON public.banca_jogo_solicitacoes;
CREATE POLICY "banca_jogo_delete_admin_gestor"
  ON public.banca_jogo_solicitacoes FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._gestor_page_perm('banca_jogo', 'delete')
  );

DROP POLICY IF EXISTS "Admin gestor executivo leem guia_confirmacoes" ON public.guia_confirmacoes;
CREATE POLICY "Admin gestor executivo leem guia_confirmacoes"
  ON public.guia_confirmacoes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo'))
    OR public._gestor_page_perm('playbook_influencers', 'view')
  );

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_select ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_select
  ON public.roteiro_mesa_campanhas FOR SELECT TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'view'));

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_insert ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_insert
  ON public.roteiro_mesa_campanhas FOR INSERT TO authenticated
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'create'));

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_update ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_update
  ON public.roteiro_mesa_campanhas FOR UPDATE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'edit'))
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'edit'));

DROP POLICY IF EXISTS roteiro_mesa_campanhas_gestor_delete ON public.roteiro_mesa_campanhas;
CREATE POLICY roteiro_mesa_campanhas_gestor_delete
  ON public.roteiro_mesa_campanhas FOR DELETE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'delete'));

DROP POLICY IF EXISTS "Operador_executivo leem e escrevem campanhas das suas operadoras" ON public.roteiro_mesa_campanhas;
CREATE POLICY "Operador_executivo leem e escrevem campanhas das suas operadoras"
  ON public.roteiro_mesa_campanhas FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_scopes
      WHERE user_scopes.user_id = auth.uid()
        AND user_scopes.scope_type = 'operadora'
        AND user_scopes.scope_ref = roteiro_mesa_campanhas.operadora_slug
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'executivo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_scopes
      WHERE user_scopes.user_id = auth.uid()
        AND user_scopes.scope_type = 'operadora'
        AND user_scopes.scope_ref = roteiro_mesa_campanhas.operadora_slug
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'executivo')
    )
  );

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_select ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_select
  ON public.roteiro_mesa_sugestoes FOR SELECT TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'view'));

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_insert ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_insert
  ON public.roteiro_mesa_sugestoes FOR INSERT TO authenticated
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'create'));

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_update ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_update
  ON public.roteiro_mesa_sugestoes FOR UPDATE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'edit'))
  WITH CHECK (public._gestor_page_perm('roteiro_mesa', 'edit'));

DROP POLICY IF EXISTS roteiro_mesa_sugestoes_gestor_delete ON public.roteiro_mesa_sugestoes;
CREATE POLICY roteiro_mesa_sugestoes_gestor_delete
  ON public.roteiro_mesa_sugestoes FOR DELETE TO authenticated
  USING (public._gestor_page_perm('roteiro_mesa', 'delete'));

DROP POLICY IF EXISTS "Operador_executivo leem e escrevem roteiro das suas operadoras" ON public.roteiro_mesa_sugestoes;
CREATE POLICY "Operador_executivo leem e escrevem roteiro das suas operadoras"
  ON public.roteiro_mesa_sugestoes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_scopes
      WHERE user_scopes.user_id = auth.uid()
        AND user_scopes.scope_type = 'operadora'
        AND user_scopes.scope_ref = roteiro_mesa_sugestoes.operadora_slug
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'executivo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_scopes
      WHERE user_scopes.user_id = auth.uid()
        AND user_scopes.scope_type = 'operadora'
        AND user_scopes.scope_ref = roteiro_mesa_sugestoes.operadora_slug
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'executivo')
    )
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_select_staff" ON public.roteiro_mesa_solicitacoes;
CREATE POLICY "roteiro_mesa_sol_select_staff"
  ON public.roteiro_mesa_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('roteiro_mesa', 'view')
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_insert_staff" ON public.roteiro_mesa_solicitacoes;
CREATE POLICY "roteiro_mesa_sol_insert_staff"
  ON public.roteiro_mesa_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
      )
      OR public._gestor_page_perm('roteiro_mesa', 'create')
    )
    AND EXISTS (
      SELECT 1 FROM public.roteiro_mesa_sugestoes g
      WHERE g.id = sugestao_id AND g.operadora_slug = operadora_slug
    )
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_update_staff" ON public.roteiro_mesa_solicitacoes;
CREATE POLICY "roteiro_mesa_sol_update_staff"
  ON public.roteiro_mesa_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('roteiro_mesa', 'edit')
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_msg_select" ON public.roteiro_mesa_solicitacao_mensagens;
CREATE POLICY "roteiro_mesa_sol_msg_select"
  ON public.roteiro_mesa_solicitacao_mensagens FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roteiro_mesa_solicitacoes s
      WHERE s.id = roteiro_mesa_solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
          )
          OR public._gestor_page_perm('roteiro_mesa', 'view')
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_msg_insert" ON public.roteiro_mesa_solicitacao_mensagens;
CREATE POLICY "roteiro_mesa_sol_msg_insert"
  ON public.roteiro_mesa_solicitacao_mensagens FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roteiro_mesa_solicitacoes s
      WHERE s.id = solicitacao_id
        AND (
          (
            (
              EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
              )
              OR public._gestor_page_perm('roteiro_mesa', 'create')
              OR public._gestor_page_perm('roteiro_mesa', 'edit')
            )
            AND autor = 'gestor'
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND autor = 'operadora'
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "roteiro_mesa_sol_msg_update_visto" ON public.roteiro_mesa_solicitacao_mensagens;
CREATE POLICY "roteiro_mesa_sol_msg_update_visto"
  ON public.roteiro_mesa_solicitacao_mensagens FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roteiro_mesa_solicitacoes s
      WHERE s.id = roteiro_mesa_solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
          )
          OR public._gestor_page_perm('roteiro_mesa', 'view')
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "roteiro_camp_sol_select_staff" ON public.roteiro_campanha_solicitacoes;
CREATE POLICY "roteiro_camp_sol_select_staff"
  ON public.roteiro_campanha_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('roteiro_mesa', 'view')
  );

DROP POLICY IF EXISTS "roteiro_camp_sol_insert_staff" ON public.roteiro_campanha_solicitacoes;
CREATE POLICY "roteiro_camp_sol_insert_staff"
  ON public.roteiro_campanha_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
      )
      OR public._gestor_page_perm('roteiro_mesa', 'create')
    )
    AND EXISTS (
      SELECT 1 FROM public.roteiro_mesa_campanhas c
      WHERE c.id = campanha_id AND c.operadora_slug = operadora_slug
    )
  );

DROP POLICY IF EXISTS "roteiro_camp_sol_update_staff" ON public.roteiro_campanha_solicitacoes;
CREATE POLICY "roteiro_camp_sol_update_staff"
  ON public.roteiro_campanha_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('roteiro_mesa', 'edit')
  );

DROP POLICY IF EXISTS "roteiro_camp_sol_msg_select" ON public.roteiro_campanha_solicitacao_mensagens;
CREATE POLICY "roteiro_camp_sol_msg_select"
  ON public.roteiro_campanha_solicitacao_mensagens FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roteiro_campanha_solicitacoes s
      WHERE s.id = roteiro_campanha_solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
          )
          OR public._gestor_page_perm('roteiro_mesa', 'view')
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "roteiro_camp_sol_msg_insert" ON public.roteiro_campanha_solicitacao_mensagens;
CREATE POLICY "roteiro_camp_sol_msg_insert"
  ON public.roteiro_campanha_solicitacao_mensagens FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roteiro_campanha_solicitacoes s
      WHERE s.id = solicitacao_id
        AND (
          (
            (
              EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
              )
              OR public._gestor_page_perm('roteiro_mesa', 'create')
              OR public._gestor_page_perm('roteiro_mesa', 'edit')
            )
            AND autor = 'gestor'
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND autor = 'operadora'
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "roteiro_camp_sol_msg_update_visto" ON public.roteiro_campanha_solicitacao_mensagens;
CREATE POLICY "roteiro_camp_sol_msg_update_visto"
  ON public.roteiro_campanha_solicitacao_mensagens FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roteiro_campanha_solicitacoes s
      WHERE s.id = roteiro_campanha_solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
          )
          OR public._gestor_page_perm('roteiro_mesa', 'view')
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "dealer_sol_select_staff" ON public.dealer_solicitacoes;
CREATE POLICY "dealer_sol_select_staff"
  ON public.dealer_solicitacoes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('gestao_dealers', 'view')
  );

DROP POLICY IF EXISTS "dealer_sol_update_staff" ON public.dealer_solicitacoes;
CREATE POLICY "dealer_sol_update_staff"
  ON public.dealer_solicitacoes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
    )
    OR public._gestor_page_perm('gestao_dealers', 'edit')
  );

DROP POLICY IF EXISTS "sol_msg_select" ON public.solicitacao_mensagens;
CREATE POLICY "sol_msg_select"
  ON public.solicitacao_mensagens FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dealer_solicitacoes s
      WHERE s.id = solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
          )
          OR public._gestor_page_perm('gestao_dealers', 'view')
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "sol_msg_insert" ON public.solicitacao_mensagens;
CREATE POLICY "sol_msg_insert"
  ON public.solicitacao_mensagens FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dealer_solicitacoes s
      WHERE s.id = solicitacao_id
        AND (
          (
            (
              EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
              )
              OR public._gestor_page_perm('gestao_dealers', 'create')
              OR public._gestor_page_perm('gestao_dealers', 'edit')
            )
            AND autor = 'gestor'
          )
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND autor = 'operadora'
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "sol_msg_update_visto" ON public.solicitacao_mensagens;
CREATE POLICY "sol_msg_update_visto"
  ON public.solicitacao_mensagens FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dealer_solicitacoes s
      WHERE s.id = solicitacao_mensagens.solicitacao_id
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'executivo')
          )
          OR public._gestor_page_perm('gestao_dealers', 'view')
          OR (
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operador')
            AND s.operadora_slug IN (
              SELECT us.scope_ref FROM public.user_scopes us
              WHERE us.user_id = auth.uid() AND us.scope_type = 'operadora'
            )
          )
        )
    )
  );

DROP FUNCTION IF EXISTS public._auth_tem_scope_operadora_slug(text);

COMMIT;
