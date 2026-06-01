# Checklist — GitHub Actions vs tarefas no PC

## Troca de computador (clone Git) **não desativa** workflows na nuvem

`git clone` no PC novo **não altera** nada em **GitHub → Actions**. Os jobs diários abaixo rodam em **`ubuntu-latest`** nos servidores do GitHub, não na sua máquina:

| Workflow | Horário alvo (BRT) | Cron (UTC) |
|----------|-------------------|------------|
| Sync Métricas CDA (4h) | ~4h | `0 7 * * *` |
| Relatório Diário Diretoria | ~6h | `0 9 * * *` |
| E-mail Agenda Diária | ~6h10 | `10 9 * * *` |
| Sync Spin na Rede RSS | ~6h20 | `20 9 * * *` |
| Sync Social Media KPIs | ~6h30 | `30 9 * * *` |

**O que a troca de PC pode quebrar** (só estes):

| O quê | Onde rodava | O que fazer no PC novo |
|-------|-------------|------------------------|
| Runner **self-hosted** (Lobby Blaze manual) | PC antigo | Reinstalar runner em **Settings → Actions → Runners** ou usar só o script + Agendador de Tarefas |
| **Agendador de Tarefas** — `scripts/run-monitor-lobby-blaze.ps1` | PC antigo | Recriar tarefa horária apontando para o script (ver `docs/SETUP-MONITOR-LOBBY-BLAZE.md`) |
| Scripts locais / `.env.monitor` | PC antigo | Copiar `.env.monitor` / `.env.monitor-cda` (não versionados) para o novo PC |

Lobby Blaze/CDA em produção costumam ser **Telecom + cron**, não GitHub cloud (Blaze retorna HTTP 451 em datacenter).

---

## Como verificar se o problema é GitHub (não o app)

1. Abra **https://github.com/Felipe-Saturnino/influencer-dashboard/actions**
2. Filtro **Event: schedule** e data de hoje (horário de Brasília).
3. Para cada workflow da tabela acima, confira se houve run **hoje** e se terminou **success**.

Se **não aparecer run** no dia → o GitHub **não disparou** (fila/atraso ou vários crons no mesmo minuto — ver abaixo).

Se aparecer **failure** → abrir o run e ler o passo que falhou (ex.: Checkout, curl, secrets).

Secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.) ficam em **Settings → Secrets and variables → Actions** no GitHub — **não** vêm no clone.

---

## Limitações conhecidas do GitHub Actions

- Agendamentos são **melhor esforço** (atrasos de minutos ou horas são normais).
- Vários workflows no **mesmo minuto** (`0 9 * * *`) competem na fila; alguns podem **não rodar** no dia.
- Schedules só contam na **branch padrão** (`main`) — arquivos em `.github/workflows/` precisam estar em `main`.
- Repositório inativo por 60 dias pode pausar schedules (improvável se há pushes recentes).

Mitigações no repositório:

- Crons **escalonados** (minutos diferentes em 9h UTC).
- Workflow **Daily jobs watchdog** — às 9h30 BRT verifica runs do dia e dispara de novo o que faltar.

Alternativa estável: **Supabase Edge Functions → Schedules** com fuso `America/Sao_Paulo` (ver `docs/SETUP-RELATORIO-DIARIO-DIRETORIA.md`).

---

## Recuperação manual (quando a manhã falhou)

Em **Actions**, para cada workflow: **Run workflow** → branch `main`.

Ordem sugerida: CDA → Spin RSS → Social → Relatório Diretoria → E-mail Agenda.

---

## Histórico consultado (exemplo 26/05/2026)

Na API pública do GitHub, no dia **2026-05-26** (schedule):

- Relatório Diretoria — **success** (com atraso ~9h16 BRT)
- Sync Social — **failure** (Checkout)
- CDA, E-mail Agenda, Spin RSS — **sem run** naquele dia (último sucesso em 25/05)

Isso confirma falha de **orquestração GitHub**, não desativação por clone local.
