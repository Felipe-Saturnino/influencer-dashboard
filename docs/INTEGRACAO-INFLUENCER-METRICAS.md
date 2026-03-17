# Integração: influencer_metricas e utm_aliases

As tabelas `influencer_metricas` e `utm_aliases` **não são preenchidas pelo app** (influencer-dashboard). Os dados vêm de integrações externas (APIs das operadoras, Edge Functions, jobs, etc.).

---

## Fluxo: utm_aliases → influencer_metricas

### O que cria linhas em influencer_metricas?

**Apenas a Edge Function `sync-metricas`** (e integrações semelhantes). Não há trigger no banco — toda inserção/atualização passa pela função.

### Passo a passo

1. **utm_aliases** recebe UTMs de duas formas:
   - **Fase 2 do sync:** UTMs órfãos detectados na API da CDA são inseridos com `status='pendente'`
   - **Gestão de Links:** Usuário mapeia um UTM pendente para um influencer → `status='mapeado'`, `influencer_id` preenchido

2. **sync-metricas (Fase 1):** Para cada influencer com `influencer_perfil.utm_source` preenchido, busca métricas na CDA e faz upsert em `influencer_metricas`.

3. **sync-metricas (Fase 1b):** Para cada `utm_aliases` com `status='mapeado'` e `influencer_id`, cujo `utm_source` é diferente do perfil do influencer:
   - Busca métricas na CDA para aquele `utm_source`
   - Faz upsert em `influencer_metricas` com `influencer_id` do alias

4. **Quando mapear na Gestão de Links:** É necessário clicar em **"Executar Sync"** em Plataforma → Status Técnico para que as métricas apareçam nos dashboards. A função não dispara automaticamente ao mapear.

### Pré-requisitos para o Sync funcionar

**Opção A — Plywood (padrão):**
- **SMARTICO_USERNAME** + **SMARTICO_PASSWORD** (recomendado): Autenticação Basic — prioridade quando ambos configurados.
- **CDA_INFLUENCERS_API_KEY:** Chave API da plataforma CDA. Alternativa se Basic auth não funcionar.
- **SMARTICO_TOKEN** (fallback): Token de sessão (expira). Use apenas se Basic e API key não estiverem disponíveis.
- **SMARTICO_LABEL_ID:** (opcional, default 573703)

**Opção B — Reporting API (recomendado se Plywood retorna 403):**
- **CDA_USE_REPORTING_API:** `true` — ativa a [Reporting API](https://help.theaffiliateplatform.com/apis-and-configurations/reporting-api).
- **CDA_INFLUENCERS_API_KEY:** Obrigatório. Chave obtida em Account Settings no perfil CDA.
- **SMARTICO_REPORTING_API_URL:** (opcional) URL base. Default: `https://boapi.smartico.ai`. Para CDA, verificar em Account Settings — pode ser `https://boapi.aff.casadeapostas.bet.br`.
- **CDA_AUTH_FORMAT:** (opcional) `Bearer` (default) ou `direct` — para API key (vale para Plywood e Reporting API).

- Edge Function `sync-metricas` implantada (v1.8.0+)

### Erro "Edge Function returned a non-2xx status code"

Significa que a função falhou. Possíveis causas:

| Causa | Solução |
|-------|---------|
| CDA_INFLUENCERS_API_KEY ou SMARTICO_TOKEN não configurado | Supabase → Edge Functions → Secrets → adicionar CDA_INFLUENCERS_API_KEY (recomendado) ou SMARTICO_TOKEN |
| Erro 403 (credencial inválida) na Plywood | Usar **Reporting API**: CDA_USE_REPORTING_API=true + CDA_INFLUENCERS_API_KEY (chave em Account Settings no perfil CDA) |
| Erro 403 na Reporting API | Verificar CDA_INFLUENCERS_API_KEY; conferir SMARTICO_REPORTING_API_URL se CDA usar domínio próprio |
| Outros erros | Ver logs em Supabase → Edge Functions → sync-metricas → Logs |

---

## utm_aliases

Ao inserir/atualizar UTMs vindos da API de uma operadora, incluir `operadora_slug` e **não enviar** `ggr` (coluna removida; o app calcula total_deposit - total_withdrawal):

```json
{ "utm_source": "Zvelo234", "operadora_slug": "casa_apostas", "total_ftds": 5, "total_deposit": 1250, "total_withdrawal": 800, ... }
```

Migração: `docs/migration-utm-aliases-operadora.sql`. Para remover ggr: `docs/migration-utm-aliases-drop-ggr.sql` (executar após a integração parar de enviar ggr).

---

## influencer_metricas

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

**Importante:** Não enviar `ggr`. É coluna calculada (GENERATED = deposit_total - withdrawal_total).

Use **UPSERT** com conflito em `(influencer_id, data, operadora_slug)` para evitar duplicatas ao rodar a integração múltiplas vezes no mesmo dia.

```json
{
  "influencer_id": "uuid-do-influencer",
  "data": "2025-03-12",
  "operadora_slug": "casa_apostas",
  "fonte": "api",
  "ftd_count": 5,
  "ftd_total": 1250.00,
  "deposit_count": 12,
  "deposit_total": 3500.00,
  "withdrawal_count": 3,
  "withdrawal_total": 800.00
}
```

### Colunas esperadas em influencer_metricas

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| influencer_id | uuid | sim | ID do influencer |
| data | date | sim | Data da métrica |
| operadora_slug | text | sim* | Slug da operadora (FK para operadoras) |
| fonte | text | sim | Origem: `api` (sync automático) ou `manual` |
| ftd_count | integer | - | Quantidade de FTDs |
| ftd_total | numeric | - | Valor total FTD |
| deposit_count | integer | - | Quantidade de depósitos |
| deposit_total | numeric | - | Valor total depósitos |
| withdrawal_count | integer | - | Quantidade de saques |
| withdrawal_total | numeric | - | Valor total saques |
| ggr | numeric | — | **Não inserir.** Calculado automaticamente (deposit_total - withdrawal_total). |

*Após migração e backfill; antes pode ser nullable para compatibilidade.

---

## Onde implementar

O código da integração com Casa de Apostas **não está neste repositório**. Pode estar em:

- Supabase Edge Functions
- Serviço separado (backend)
- Cron job ou pipeline de dados
- Outro projeto no Acquisition Hub

Ao localizar o código que faz INSERT/UPDATE em `influencer_metricas`:

1. Adicione `operadora_slug` em todo insert/upsert conforme a origem dos dados.
2. **Não envie** a coluna `ggr` (ela é gerada automaticamente pelo banco).
3. Use **UPSERT** com `onConflict: "influencer_id, data, operadora_slug"` para evitar duplicatas. A constraint UNIQUE está em `docs/migration-influencer-metricas-unique.sql`.

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
