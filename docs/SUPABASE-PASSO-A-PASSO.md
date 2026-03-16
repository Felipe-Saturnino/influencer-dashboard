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

## Passo 5 — Função RPC (com colunas calculadas no banco)

1. Abra o arquivo **`docs/passo5-rpc-get_metricas_financeiro.sql`** no VS Code/Cursor.
2. Selecione todo o conteúdo (Ctrl+A).
3. Copie e cole no SQL Editor do Supabase.
4. Execute.

Importante: copie do arquivo `.sql`, não de diff/comparação do Git.

---

## Passo 6 — Permissões da função

```sql
GRANT EXECUTE ON FUNCTION get_metricas_financeiro(int, int, uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION get_metricas_financeiro(int, int, uuid, boolean) TO authenticated;
```

---

## Pronto

Depois de rodar todos os passos com sucesso, avise aqui que verifico o código para o commit.
