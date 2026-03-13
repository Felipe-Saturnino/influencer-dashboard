# Análise: Edge Function sync-metricas vs Alterações no Banco

**Data:** 2025-03-12  
**Versão analisada:** v1.2.1  
**Integração:** Casa de Apostas (CDA) — https://admin.aff.casadeapostas.bet.br/573703#/

---

## Resumo Executivo

As migrações aplicadas no banco (operadora_slug, UNIQUE, remoção de ggr) **quebram** a integração atual. O sync-metricas precisa de **ajustes obrigatórios** para funcionar corretamente com o schema atual.

---

## Problemas Encontrados

### 1. **influencer_metricas — CRÍTICO**

| Aspecto | Estado atual do sync | Schema após migrações | Impacto |
|---------|----------------------|------------------------|---------|
| **operadora_slug** | Não enviado | Obrigatório (FK para operadoras) | Upsert falha ou insere NULL, gerando duplicatas |
| **onConflict** | `'influencer_id,data'` | UNIQUE(influencer_id, data, operadora_slug) | Conflito não reconhecido → erro ou linhas duplicadas |

**Migrações relevantes:**
- `docs/migration-influencer-metricas-operadora.sql` — adiciona coluna `operadora_slug`
- `docs/migration-influencer-metricas-unique.sql` — constraint `(influencer_id, data, operadora_slug)`

**Documentação:** `docs/INTEGRACAO-INFLUENCER-METRICAS.md` exige:
- Incluir `operadora_slug: 'casa_apostas'` em todo upsert
- Usar `onConflict: ['influencer_id', 'data', 'operadora_slug']`

---

### 2. **utm_aliases — RECOMENDADO**

| Aspecto | Estado atual do sync | Schema após migrações | Impacto |
|---------|----------------------|------------------------|---------|
| **operadora_slug** | Não enviado | Coluna existente (FK operadoras) | Registros órfãos sem identificação de operadora |
| **ggr** | ✅ Excluído corretamente | Coluna removida | OK — sync já está correto |

**Migrações relevantes:**
- `docs/migration-utm-aliases-operadora.sql` — adiciona `operadora_slug`
- `docs/migration-utm-aliases-drop-ggr.sql` — remove ggr (coluna gerada/calculada)

**Recomendação:** Incluir `operadora_slug: 'casa_apostas'` no upsert de órfãos para consistência.

---

### 3. **O que está correto**

- ✅ Exclusão de `ggr` no upsert de `utm_aliases` (v1.2.1)
- ✅ Exclusão de `ggr` no upsert de `influencer_metricas` (coluna gerada)
- ✅ Headers e payload da API Plywood CDA
- ✅ Fluxo Fase 1 (influencers mapeados) e Fase 2 (UTMs órfãos)
- ✅ Alerta de token 403 via Resend
- ✅ Uso de `label_id` 573703

---

## Correções Necessárias

1. **upsertMetricas:** adicionar `operadora_slug: 'casa_apostas'` em cada row e alterar `onConflict`.
2. **detectarERegistrarOrfaos:** adicionar `operadora_slug: 'casa_apostas'` no payload do upsert.

---

## Verificação Pós-Deploy

Após aplicar as correções, executar no Supabase SQL Editor:

```sql
-- Novos registros devem ter operadora_slug preenchido
SELECT operadora_slug, COUNT(*) 
FROM influencer_metricas 
WHERE data >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY operadora_slug;
```

Resultado esperado: `casa_apostas | N` (N = quantidade de registros).
