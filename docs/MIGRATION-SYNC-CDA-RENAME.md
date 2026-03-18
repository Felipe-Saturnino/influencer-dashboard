# Migração: sync-metricas → sync-metricas-cda

**Data:** 2025-03-18  
**Resumo:** Renomeio da Edge Function para identificar a integração CDA; correção da agregação de múltiplas UTMs.

---

## O que mudou

1. **Edge Function:** `sync-metricas` → `sync-metricas-cda`
   - Nome deixa explícito que é a integração da Casa de Apostas (CDA).
   - Quando houver outras operadoras (Bet Nacional, Blaze), cada uma terá sua função (ex.: `sync-metricas-bet-nacional`).

2. **Agregação de múltiplas UTMs:**
   - Antes: cada UTM sobrescrevia a anterior em `influencer_metricas`.
   - Agora: todas as UTMs do mesmo influencer na mesma operadora são **somadas** antes do upsert.

3. **RPC `aplicar_mapeamento_utm`:**
   - Ao mapear uma UTM na Gestão de Links, re-agrega **todas** as UTMs do influencer naquela operadora e faz upsert com a soma.

4. **Dashboards:** filtro por operadora passou a restringir também a query de `influencer_metricas` (não só a lista de influencers).

---

## Passos para deploy

### 1. Aplicar migration SQL

Execute no **Supabase SQL Editor**:

```
supabase/migrations/20250318_aplicar_mapeamento_utm_agregar.sql
```

### 2. Deploy da nova Edge Function

```bash
# Remover a função antiga (opcional; pode coexistir durante transição)
# supabase functions delete sync-metricas

# Deploy da nova função
supabase functions deploy sync-metricas-cda
```

### 3. Atualizar Secrets (se necessário)

Os secrets continuam os mesmos: `CDA_INFLUENCERS_API_KEY`, `SMARTICO_*`, etc. Nenhuma alteração necessária.

### 4. GitHub Actions / workflow diário

O workflow `.github/workflows/sync-metricas-daily.yml` já foi atualizado para chamar `sync-metricas-cda`. Após o próximo push, o workflow usará a nova função.

### 5. Variável de ambiente (backfill manual)

Se usar `SUPABASE_SYNC_URL` ou `VITE_SUPABASE_URL` em scripts, a URL agora é:

```
https://SEU_PROJECT.supabase.co/functions/v1/sync-metricas-cda
```

---

## Reverter (se necessário)

Para voltar à função antiga temporariamente:

1. Manter `sync-metricas` no Supabase (não deletar até confirmar que a nova está estável).
2. Alterar Status Técnico e Gestão de Links para invocar `sync-metricas` em vez de `sync-metricas-cda`.

---

## Referências

- `docs/ESPECIFICACAO-AGREGACAO-UTM-MULTIOPERADORA.md`
- `docs/COMANDO-BACKFILL-SYNC.md`
