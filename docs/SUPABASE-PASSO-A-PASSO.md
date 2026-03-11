# Supabase — SQLs para Dashboard Financeiro (passo a passo)

Execute cada bloco abaixo **no SQL Editor do Supabase**, um de cada vez, na ordem.  
Após cada execução, verifique se aparece "Success" no canto inferior.

---

## Passo 1 — Coluna withdrawal_count

Se a tabela `influencer_metricas` já tiver a coluna `withdrawal_count`, você pode pular este passo. Caso contrário, execute:

```sql
ALTER TABLE influencer_metricas
ADD COLUMN IF NOT EXISTS withdrawal_count integer DEFAULT 0;
```

---

## Passo 2 — Índice 1 (influencer + data)

```sql
CREATE INDEX IF NOT EXISTS idx_influencer_metricas_influencer_data
  ON influencer_metricas (influencer_id, data);
```

---

## Passo 3 — Índice 2 (data)

```sql
CREATE INDEX IF NOT EXISTS idx_influencer_metricas_data
  ON influencer_metricas (data);
```

---

## Passo 4 — View (agregação mensal)

```sql
CREATE OR REPLACE VIEW v_influencer_metricas_mensal AS
SELECT
  influencer_id,
  EXTRACT(YEAR FROM data)::int AS ano,
  EXTRACT(MONTH FROM data)::int AS mes,
  SUM(COALESCE(ftd_count, 0))::bigint AS ftd_count,
  SUM(COALESCE(ftd_total, 0))::numeric AS ftd_total,
  SUM(COALESCE(deposit_count, 0))::bigint AS deposit_count,
  SUM(COALESCE(deposit_total, 0))::numeric AS deposit_total,
  SUM(COALESCE(withdrawal_count, 0))::bigint AS withdrawal_count,
  SUM(COALESCE(withdrawal_total, 0))::numeric AS withdrawal_total,
  SUM(COALESCE(ggr, 0))::numeric AS ggr
FROM influencer_metricas
GROUP BY influencer_id, EXTRACT(YEAR FROM data), EXTRACT(MONTH FROM data);
```

---

## Passo 5 — Função RPC

```sql
CREATE OR REPLACE FUNCTION get_metricas_financeiro(
  p_ano int DEFAULT NULL,
  p_mes int DEFAULT NULL,
  p_influencer_id uuid DEFAULT NULL,
  p_historico boolean DEFAULT false
)
RETURNS TABLE (
  influencer_id uuid,
  ano int,
  mes int,
  ftd_count bigint,
  ftd_total numeric,
  deposit_count bigint,
  deposit_total numeric,
  withdrawal_count bigint,
  withdrawal_total numeric,
  ggr numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_historico THEN
    RETURN QUERY
    SELECT
      v.influencer_id,
      NULL::int AS ano,
      NULL::int AS mes,
      SUM(v.ftd_count)::bigint,
      SUM(v.ftd_total)::numeric,
      SUM(v.deposit_count)::bigint,
      SUM(v.deposit_total)::numeric,
      SUM(v.withdrawal_count)::bigint,
      SUM(v.withdrawal_total)::numeric,
      SUM(v.ggr)::numeric
    FROM v_influencer_metricas_mensal v
    WHERE (p_influencer_id IS NULL OR v.influencer_id = p_influencer_id)
    GROUP BY v.influencer_id
    ORDER BY v.influencer_id;
  ELSE
    RETURN QUERY
    SELECT
      v.influencer_id,
      v.ano,
      v.mes,
      v.ftd_count,
      v.ftd_total,
      v.deposit_count,
      v.deposit_total,
      v.withdrawal_count,
      v.withdrawal_total,
      v.ggr
    FROM v_influencer_metricas_mensal v
    WHERE v.ano = p_ano AND v.mes = p_mes
      AND (p_influencer_id IS NULL OR v.influencer_id = p_influencer_id)
    ORDER BY v.influencer_id;
  END IF;
END;
$$;
```

---

## Passo 6 — Permissões da função

```sql
GRANT EXECUTE ON FUNCTION get_metricas_financeiro(int, int, uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION get_metricas_financeiro(int, int, uuid, boolean) TO authenticated;
```

---

## Pronto

Depois de rodar todos os passos com sucesso, avise aqui que verifico o código para o commit.
