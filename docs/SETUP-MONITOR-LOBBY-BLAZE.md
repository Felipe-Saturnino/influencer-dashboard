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

## HTTP 451 na Edge (teste direto no painel Supabase)

A Blaze costuma **bloquear IPs de datacenter** (Supabase Edge, alguns clouds) com **HTTP 451**. No seu PC o mesmo URL responde 200.

**Não teste só com POST vazio na Edge.** Use um destes caminhos:

### A) Script local (recomendado para teste)

Com a função já implantada e secrets no ambiente:

```bash
SUPABASE_URL=https://SEU_PROJETO.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
node scripts/monitor-lobby-blaze-run.mjs --dry-run
```

Sem `--dry-run` grava no banco.

### B) GitHub Actions

Workflow **Monitor Lobby Blaze (hourly)** → **Run workflow** (opção dry run disponível).

Secrets: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

O script busca a Blaze no runner e chama a Edge com `blaze_lobby` no body (a Edge só processa e grava).

### C) Edge com lobby pronto (avançado)

POST `monitor-lobby-blaze` com `blaze_lobby` + `blaze_paginas_lidas` (array já montado) — útil se outro serviço fizer o fetch.

## Agendamento

`.github/workflows/monitor-lobby-blaze-hourly.yml` — fetch no GitHub Actions, não na Edge.

## Tabelas

- `lobby_monitor_execucao`
- `lobby_monitor_posicao` (inclui `mesa_identificacao` Spin + `mesa_identificacao_operadora`)
