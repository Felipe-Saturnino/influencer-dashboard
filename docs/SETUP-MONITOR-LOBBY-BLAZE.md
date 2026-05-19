# Monitor de lobby — Blaze

Automação horária da posição das mesas Spin no Cassino Ao Vivo da Blaze (sem UI).

## Identificadores no cadastro

| Coluna | Uso |
|--------|-----|
| `mesa_identificacao` | ID **interno Spin** (estúdio) |
| `mesa_identificacao_operadora` | ID no **catálogo da operadora** (ex.: game `id` na API Blaze) |

O job `monitor-lobby-blaze` cruza o lobby usando **`mesa_identificacao_operadora`**.

## Pré-requisitos

1. Migrations aplicadas:
   - `20260518140000_lobby_monitor.sql`
   - `20260518150000_mesas_spin_identificacao_operadora.sql`
2. Cinco mesas em `mesas_spin_cadastro` para `blaze`, cada uma com **ambos** os IDs preenchidos.
3. Edge Function implantada no Supabase.

### IDs Blaze (operadora) — referência

| Mesa | `mesa_identificacao_operadora` |
|------|--------------------------------|
| Roleta | `500617` |
| Speed Baccarat | `500616` |
| Blackjack 1 | `501109` |
| Blackjack VIP | `501110` |
| Blackjack 2 | `500615` |

Script para preencher IDs da operadora em linhas existentes: `scripts/manual-supabase-mesas-spin-blaze-lobby-ids.sql`

## Deploy da função

```bash
supabase functions deploy monitor-lobby-blaze
```

**Secret opcional:** `MONITOR_LOBBY_BLAZE_INGEST_SECRET`

## Teste

POST `monitor-lobby-blaze` com body `{"dry_run": true}` — não grava; retorna posições no JSON.

## Agendamento

`.github/workflows/monitor-lobby-blaze-hourly.yml` (requer commit no GitHub + secrets).

## Tabelas

- `lobby_monitor_execucao`
- `lobby_monitor_posicao` (inclui `mesa_identificacao` Spin + `mesa_identificacao_operadora`)
