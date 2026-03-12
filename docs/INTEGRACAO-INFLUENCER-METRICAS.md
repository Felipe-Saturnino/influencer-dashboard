# Integração: influencer_metricas

A tabela `influencer_metricas` **não é preenchida pelo app** (influencer-dashboard). Os dados vêm de integrações externas (APIs das operadoras, Edge Functions, jobs, etc.).

---

## Coluna `operadora_slug`

Desde a migração de operadoras, toda linha em `influencer_metricas` deve incluir `operadora_slug` indicando a operadora de origem dos dados.

### Regras

1. **Casa de Apostas:** Ao inserir/atualizar dados vindos da API da Casa de Apostas, incluir:
   ```json
   { "operadora_slug": "casa_apostas" }
   ```

2. **Outras operadoras:** Ao implementar integrações com Blaze, Bet Nacional, Spin Gaming, etc., usar o slug cadastrado na tabela `operadoras`:
   - `blaze`
   - `bet_nacional`
   - `casa_apostas`
   - `spin_gaming`
   - (ou o slug que estiver em `operadoras`)

3. **Backfill:** Os registros antigos (anteriores à migração) foram preenchidos com `operadora_slug = 'casa_apostas'` no script `docs/migration-influencer-metricas-operadora.sql`.

---

## Exemplo de payload (INSERT / UPSERT)

```json
{
  "influencer_id": "uuid-do-influencer",
  "data": "2025-03-12",
  "operadora_slug": "casa_apostas",
  "ftd_count": 5,
  "ftd_total": 1250.00,
  "deposit_count": 12,
  "deposit_total": 3500.00,
  "withdrawal_count": 3,
  "withdrawal_total": 800.00,
  "ggr": 450.00
}
```

### Colunas esperadas em influencer_metricas

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| influencer_id | uuid | sim | ID do influencer |
| data | date | sim | Data da métrica |
| operadora_slug | text | sim* | Slug da operadora (FK para operadoras) |
| ftd_count | integer | - | Quantidade de FTDs |
| ftd_total | numeric | - | Valor total FTD |
| deposit_count | integer | - | Quantidade de depósitos |
| deposit_total | numeric | - | Valor total depósitos |
| withdrawal_count | integer | - | Quantidade de saques |
| withdrawal_total | numeric | - | Valor total saques |
| ggr | numeric | - | GGR |

*Após migração e backfill; antes pode ser nullable para compatibilidade.

---

## Onde implementar

O código da integração com Casa de Apostas **não está neste repositório**. Pode estar em:

- Supabase Edge Functions
- Serviço separado (backend)
- Cron job ou pipeline de dados
- Outro projeto no Acquisition Hub

Ao localizar o código que faz INSERT/UPDATE em `influencer_metricas`, adicione `operadora_slug` em todo insert/upsert conforme a origem dos dados.

---

## Verificação

Após ajustar a integração, valide no Supabase:

```sql
SELECT operadora_slug, COUNT(*) 
FROM influencer_metricas 
WHERE data >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY operadora_slug;
```

Novos registros devem aparecer com `operadora_slug` preenchido.
