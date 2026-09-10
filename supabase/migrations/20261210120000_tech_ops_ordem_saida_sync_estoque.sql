-- Tech Ops — Ordem de Saída sincroniza Gestão de Estoque (Em Uso / Manutenção).
-- Ao aprovar OS interna/externa: equipamentos → em_uso; itens → +quantidade_em_uso.
-- OS manutenção: equipamentos → manutencao.
-- Ao confirmar retorno ou cancelar OS aberta: reverte.
-- Backfill: OS abertas e concluídas sem retorno ainda não aplicadas.

BEGIN;

ALTER TABLE public.tech_ops_ordem_saida
  ADD COLUMN IF NOT EXISTS estoque_aplicado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tech_ops_ordem_saida.estoque_aplicado IS
  'True após sincronizar itens/equipamentos da OS na Gestão de Estoque (idempotente).';

CREATE OR REPLACE FUNCTION public._tech_ops_os_destino_estudio_slug(p_destino_chave text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_destino_chave IS NULL OR btrim(p_destino_chave) = '' THEN NULL
    WHEN p_destino_chave LIKE 'estudio:%' THEN NULLIF(btrim(substr(p_destino_chave, 9)), '')
    WHEN p_destino_chave IN ('academy', 'ocr', 'shuffler_room', 'estoque') THEN NULL
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.tech_ops_ordem_saida_sincronizar_estoque(
  p_ordem_id uuid,
  p_acao text,
  p_autor_nome text DEFAULT 'Sistema'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_os public.tech_ops_ordem_saida%ROWTYPE;
  v_estudio text;
  v_item record;
  v_status_equip text;
  v_detalhe text;
  v_autor text := NULLIF(btrim(COALESCE(p_autor_nome, '')), '');
BEGIN
  IF p_acao NOT IN ('alocar', 'devolver') THEN
    RAISE EXCEPTION 'ação inválida';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public._tech_ops_ordem_saida_pode_atualizar(p_ordem_id)
    OR public._tech_ops_ordem_saida_pode_nova()
    OR public._tech_ops_estoque_perm('edit')
  ) THEN
    RAISE EXCEPTION 'sem permissão';
  END IF;

  SELECT * INTO v_os
  FROM public.tech_ops_ordem_saida
  WHERE id = p_ordem_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ordem não encontrada';
  END IF;

  v_autor := COALESCE(v_autor, 'Sistema');
  v_estudio := public._tech_ops_os_destino_estudio_slug(v_os.destino_chave);

  -- Só aceita slug que exista em estudios_spin (FK).
  IF v_estudio IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.estudios_spin e WHERE e.slug = v_estudio
  ) THEN
    v_estudio := NULL;
  END IF;

  IF p_acao = 'alocar' THEN
    IF v_os.estoque_aplicado THEN
      RETURN;
    END IF;

    v_status_equip := CASE WHEN v_os.tipo = 'manutencao' THEN 'manutencao' ELSE 'em_uso' END;
    v_detalhe := CASE
      WHEN v_os.tipo = 'manutencao' THEN 'Alocado via Ordem de Saída (manutenção)'
      WHEN v_os.sem_retorno THEN 'Alocado via Ordem de Saída (sem retorno)'
      ELSE 'Alocado via Ordem de Saída'
    END;

    FOR v_item IN
      SELECT entidade_tipo, entidade_id, quantidade, label_snapshot
      FROM public.tech_ops_ordem_saida_itens
      WHERE ordem_id = p_ordem_id
    LOOP
      IF v_item.entidade_tipo = 'equipamento' THEN
        UPDATE public.tech_ops_estoque_equipamentos e
        SET
          status = v_status_equip,
          estudio_slug = CASE WHEN v_status_equip = 'em_uso' THEN v_estudio ELSE e.estudio_slug END
        WHERE e.id = v_item.entidade_id
          AND e.ativo = true
          AND e.status = 'estoque';

        IF FOUND THEN
          INSERT INTO public.tech_ops_estoque_historico (entidade_tipo, entidade_id, acao, detalhe, autor_nome)
          VALUES (
            'equipamento',
            v_item.entidade_id,
            CASE WHEN v_status_equip = 'manutencao' THEN 'Manutenção' ELSE 'Em uso' END,
            v_detalhe || COALESCE(' — ' || NULLIF(v_item.label_snapshot, ''), ''),
            v_autor
          );
        END IF;

      ELSIF v_item.entidade_tipo = 'item' THEN
        UPDATE public.tech_ops_estoque_itens i
        SET
          quantidade_em_uso = i.quantidade_em_uso + v_item.quantidade,
          estudio_slug = COALESCE(v_estudio, i.estudio_slug)
        WHERE i.id = v_item.entidade_id
          AND i.ativo = true;

        IF FOUND THEN
          INSERT INTO public.tech_ops_estoque_historico (entidade_tipo, entidade_id, acao, detalhe, autor_nome)
          VALUES (
            'item',
            v_item.entidade_id,
            'Em uso',
            v_detalhe || ' — qtd ' || v_item.quantidade::text
              || COALESCE(' — ' || NULLIF(v_item.label_snapshot, ''), ''),
            v_autor
          );
        END IF;
      END IF;
      -- Lotes de jogo: sem status Em Uso na Gestão de Estoque (fora deste sync).
    END LOOP;

    UPDATE public.tech_ops_ordem_saida
    SET estoque_aplicado = true
    WHERE id = p_ordem_id;

  ELSE
    -- devolver
    IF NOT v_os.estoque_aplicado THEN
      RETURN;
    END IF;

    v_detalhe := 'Devolvido ao estoque via Ordem de Saída';

    FOR v_item IN
      SELECT entidade_tipo, entidade_id, quantidade, label_snapshot
      FROM public.tech_ops_ordem_saida_itens
      WHERE ordem_id = p_ordem_id
    LOOP
      IF v_item.entidade_tipo = 'equipamento' THEN
        UPDATE public.tech_ops_estoque_equipamentos e
        SET status = 'estoque', estudio_slug = NULL
        WHERE e.id = v_item.entidade_id
          AND e.ativo = true
          AND e.status IN ('em_uso', 'manutencao');

        IF FOUND THEN
          INSERT INTO public.tech_ops_estoque_historico (entidade_tipo, entidade_id, acao, detalhe, autor_nome)
          VALUES (
            'equipamento',
            v_item.entidade_id,
            'Estoque',
            v_detalhe || COALESCE(' — ' || NULLIF(v_item.label_snapshot, ''), ''),
            v_autor
          );
        END IF;

      ELSIF v_item.entidade_tipo = 'item' THEN
        UPDATE public.tech_ops_estoque_itens i
        SET
          quantidade_em_uso = GREATEST(0, i.quantidade_em_uso - v_item.quantidade),
          estudio_slug = CASE
            WHEN GREATEST(0, i.quantidade_em_uso - v_item.quantidade) = 0 THEN NULL
            ELSE i.estudio_slug
          END
        WHERE i.id = v_item.entidade_id
          AND i.ativo = true;

        IF FOUND THEN
          INSERT INTO public.tech_ops_estoque_historico (entidade_tipo, entidade_id, acao, detalhe, autor_nome)
          VALUES (
            'item',
            v_item.entidade_id,
            'Estoque',
            v_detalhe || ' — qtd ' || v_item.quantidade::text
              || COALESCE(' — ' || NULLIF(v_item.label_snapshot, ''), ''),
            v_autor
          );
        END IF;
      END IF;
    END LOOP;

    UPDATE public.tech_ops_ordem_saida
    SET estoque_aplicado = false
    WHERE id = p_ordem_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.tech_ops_ordem_saida_sincronizar_estoque(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tech_ops_ordem_saida_sincronizar_estoque(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.tech_ops_ordem_saida_sincronizar_estoque(uuid, text, text) IS
  'Aplica ou reverte Em Uso/Manutenção na Gestão de Estoque a partir dos itens da OS (SECURITY DEFINER).';

-- Backfill direto (migration não tem auth.uid())
DO $$
DECLARE
  v_os public.tech_ops_ordem_saida%ROWTYPE;
  v_estudio text;
  v_item record;
  v_status_equip text;
BEGIN
  FOR v_os IN
    SELECT *
    FROM public.tech_ops_ordem_saida
    WHERE estoque_aplicado = false
      AND (
        status = 'aberta'
        OR (status = 'concluida' AND sem_retorno = true)
      )
    FOR UPDATE
  LOOP
    v_estudio := public._tech_ops_os_destino_estudio_slug(v_os.destino_chave);
    IF v_estudio IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.estudios_spin e WHERE e.slug = v_estudio
    ) THEN
      v_estudio := NULL;
    END IF;

    v_status_equip := CASE WHEN v_os.tipo = 'manutencao' THEN 'manutencao' ELSE 'em_uso' END;

    FOR v_item IN
      SELECT entidade_tipo, entidade_id, quantidade, label_snapshot
      FROM public.tech_ops_ordem_saida_itens
      WHERE ordem_id = v_os.id
    LOOP
      IF v_item.entidade_tipo = 'equipamento' THEN
        UPDATE public.tech_ops_estoque_equipamentos e
        SET
          status = v_status_equip,
          estudio_slug = CASE WHEN v_status_equip = 'em_uso' THEN v_estudio ELSE e.estudio_slug END
        WHERE e.id = v_item.entidade_id
          AND e.ativo = true
          AND e.status = 'estoque';

        IF FOUND THEN
          INSERT INTO public.tech_ops_estoque_historico (entidade_tipo, entidade_id, acao, detalhe, autor_nome)
          VALUES (
            'equipamento',
            v_item.entidade_id,
            CASE WHEN v_status_equip = 'manutencao' THEN 'Manutenção' ELSE 'Em uso' END,
            'Backfill OS — ' || COALESCE(NULLIF(v_item.label_snapshot, ''), 'equipamento'),
            'Sistema'
          );
        END IF;
      ELSIF v_item.entidade_tipo = 'item' THEN
        UPDATE public.tech_ops_estoque_itens i
        SET
          quantidade_em_uso = i.quantidade_em_uso + v_item.quantidade,
          estudio_slug = COALESCE(v_estudio, i.estudio_slug)
        WHERE i.id = v_item.entidade_id
          AND i.ativo = true;

        IF FOUND THEN
          INSERT INTO public.tech_ops_estoque_historico (entidade_tipo, entidade_id, acao, detalhe, autor_nome)
          VALUES (
            'item',
            v_item.entidade_id,
            'Em uso',
            'Backfill OS — qtd ' || v_item.quantidade::text,
            'Sistema'
          );
        END IF;
      END IF;
    END LOOP;

    UPDATE public.tech_ops_ordem_saida
    SET estoque_aplicado = true
    WHERE id = v_os.id;
  END LOOP;
END;
$$;

COMMIT;
