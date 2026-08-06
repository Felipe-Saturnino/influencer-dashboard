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

**Dedicadas** (estúdio Blaze):

| Mesa | `mesa_identificacao_operadora` |
|------|--------------------------------|
| Roleta | `500617` |
| Speed Baccarat | `500616` |
| Blackjack 1 | `501109` |
| Blackjack VIP | `501110` |
| Blackjack 2 | `500615` |

**Network** (Sports Club — cadastrar **ID Blaze** na mesa do estúdio network):

| Mesa na Blaze | `mesa_identificacao_operadora` |
|---------------|--------------------------------|
| Futebol Brasileiro Sports Club | `542821` |
| Roleta Brasileira Sports Club | `542822` |
| Blackjack Sports Club | `542819` |
| Baccarat Sports Club | `542820` |

Script para preencher IDs dedicados em linhas existentes: `scripts/manual-supabase-mesas-spin-blaze-lobby-ids.sql`

## Deploy da função

```bash
supabase functions deploy monitor-lobby-blaze
```

**Secret opcional:** `MONITOR_LOBBY_BLAZE_INGEST_SECRET`

## HTTP 451 — bloqueio de IP (Edge, GitHub cloud)

A Blaze responde **HTTP 451** para IPs de **datacenter** (Supabase Edge, runners `ubuntu-latest` no Azure). **Não** usar workflow agendado na nuvem do GitHub — foi removido do repositório.

**Produção:** job da **Telecom** (ou servidor BR) com `scripts/monitor-lobby-blaze-run.mjs`. Alternativas abaixo só para teste ou backup.

### A) Script no seu PC (recomendado)

1. Implante a Edge Function `monitor-lobby-blaze`.
2. Crie `.env.monitor` na raiz (não commitar):

```env
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

3. Teste:

```bash
node scripts/monitor-lobby-blaze-run.mjs --dry-run
```

4. Agendador de Tarefas (Windows): a cada 1h execute `scripts\run-monitor-lobby-blaze.ps1`.

O script busca a Blaze na sua rede e chama a Edge só para **calcular posições e gravar** (`blaze_lobby` no body).

### B) GitHub Actions self-hosted

1. [Instale um runner](https://docs.github.com/actions/hosting-your-own-runners/managing-self-hosted-runners) na sua máquina Windows.
2. Workflow: **Monitor Lobby Blaze (self-hosted)** → Run workflow.
3. Mesmos secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

### C) Proxy (avançado)

Secret `HTTPS_PROXY` no workflow (proxy residencial BR). O script `monitor-lobby-blaze-run.mjs` usa `undici` se a variável existir.

### D) Painel Supabase / Edge direto

POST vazio na Edge → 451. Não usar para teste.

## Agendamento automático

| Onde rodar | Como |
|------------|------|
| **Telecom / infra BR** (recomendado) | Cron + `monitor-lobby-blaze-run.mjs` |
| Runner self-hosted (opcional) | Workflow `monitor-lobby-blaze-self-hosted.yml` — só manual |
| ~~GitHub cloud hourly~~ | **Removido** — 451 em `ubuntu-latest` |

## Tabelas

- `lobby_monitor_execucao` — inclui `pior_mesa_*` e `jogos_a_frente_pior_mesa` (todos os jogos não-Spin acima da mesa Spin com maior P na coleta)
- `lobby_monitor_posicao` (inclui `mesa_identificacao` Spin + `mesa_identificacao_operadora`)

Migration: `20260521120000_lobby_monitor_pior_mesa_vitrine.sql`. Preenchido na Edge ao processar `blaze_lobby` (script Telecom inalterado).

## Status Técnico (Plataforma)

- Integração cadastrada em `integrations` com slug **`lobby_blaze`** e nome **Lobby Blaze** (migration `20260522120000_integrations_lobby_blaze.sql`).
- Cada execução bem-sucedida da Edge grava também em `sync_logs` (`registros_inseridos` = mesas localizadas).
- Na página **Status Técnico**, botão **Sync** dispara `monitor-lobby-blaze` (pode falhar com HTTP 451 na Edge; o job agendado no PC/GitHub continua sendo o caminho principal).
