# Fluxo: utm_metricas_diarias e mapeamento sem novo sync

## Resumo

Métricas por UTM por dia ficam em `utm_metricas_diarias`. Ao mapear na Gestão de Links, a RPC `aplicar_mapeamento_utm` copia esses dados para `influencer_metricas` **sem nova chamada à API**.

---

## Ordem de execução (limpeza + fresh start)

### 1. Migração

Execute no **Supabase SQL Editor**:

```
docs/migration-utm-metricas-diarias.sql
```

Isso cria a tabela `utm_metricas_diarias` e a função `aplicar_mapeamento_utm`.

### 2. Limpeza

```sql
TRUNCATE TABLE influencer_metricas;
TRUNCATE TABLE utm_aliases;
TRUNCATE TABLE utm_metricas_diarias;  -- opcional se tabela nova (já vazia)
```

### 3. Deploy da Edge Function

Atualizar a função `sync-metricas` no Supabase (código local) e fazer o deploy.

### 4. Sync legado (1x)

Rodar o backfill para preencher `utm_metricas_diarias` e `utm_aliases`:

```powershell
.\scripts\backfill-sync.ps1
```

Ou via Status Técnico → Executar Sync (com período amplo).

### 5. Automação diária 4h

Configurar GitHub Actions (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) ou Task Scheduler.

---

## Fluxo dia a dia

| Momento | O que acontece |
|---------|----------------|
| **4h** | Sync roda, busca dia anterior na CDA. Grava em `utm_metricas_diarias` (todas as UTMs) e em `utm_aliases` (órfãs). Para mapeados, também grava em `influencer_metricas`. |
| **Gestão de Links** | Usuário mapeia UTM → RPC `aplicar_mapeamento_utm` copia `utm_metricas_diarias` → `influencer_metricas`. Sem nova chamada à API. |
| **Fallback** | Se `utm_metricas_diarias` não tiver dados (ex.: sync ainda não rodou), a Gestão de Links chama o sync como antes. |

---

## Tabelas

| Tabela | Conteúdo |
|--------|----------|
| **utm_metricas_diarias** | Uma linha por UTM por dia. `influencer_id` NULL = órfã; preenchido = mapeado. |
| **utm_aliases** | Uma linha por UTM com totais. Órfãs (pendente) e mapeadas (com influencer_id). |
| **influencer_metricas** | Uma linha por influencer por dia. Usada nos relatórios. |

---

## Pré-requisito

`CDA_USE_REPORTING_API=true` — a tabela `utm_metricas_diarias` só é preenchida quando o sync usa a Reporting API (que retorna breakdown diário).
