# Checklist — GitHub Actions vs tarefas no PC

## Troca de computador (clone Git) **não desativa** workflows na nuvem

`git clone` no PC novo **não altera** nada em **GitHub → Actions**.

### Jobs diários da manhã — fonte PRINCIPAL = **Supabase pg_cron**

Desde 2026-08, CDA / e-mails / Spin RSS / Comercial **não dependem** do `schedule` do GitHub (fila instável — manhãs sem run). Agende com:

`scripts/COLE-NO-SUPABASE-daily-edge-jobs-pg-cron.sql`

(mesmo Vault `supabase_project_url` + `supabase_service_role_key` do cron CS Outlook).

| Job | Horário alvo (BRT) | Cron UTC (pg_cron) |
|-----|-------------------|--------------------|
| Sync Métricas CDA Influencers | ~4h | `0 7 * * *` |
| Sync Métricas CDA Afiliados | ~4h05 | `5 7 * * *` |
| Relatório Diário Diretoria | ~6h | `0 9 * * *` |
| E-mail Agenda Diária | ~6h10 | `10 9 * * *` |
| Sync Spin na Rede RSS | ~6h20 | `20 9 * * *` |
| Sync Comercial SPA | ~7h30 | `30 10 * * *` |
| Validate Comercial Domínios | ~8h | `0 11 * * *` |
| Enrich Comercial CNPJ | ~8h30 | `30 11 * * *` |

Workflows correspondentes no GitHub ficam só com **`workflow_dispatch`** (teste / Status Técnico / backup manual). **Não** reativar `schedule` nos e-mails — duplicaria envio.

### Ainda no GitHub Actions (schedule)

| Workflow | Horário alvo (BRT) | Cron (UTC) | Nota |
|----------|-------------------|------------|------|
| Sync Social Media KPIs | ~6h30 | `30 9 * * *` | ETL Python + secrets Meta — não cabe em pg_cron puro |
| Daily jobs watchdog | ~8h / 9h30 / 12h | `0 11`, `30 12`, `0 15` | Re-dispara **só** Social KPIs se faltar sucesso no dia |
| Painel Notícias RSS | horário | `5 * * * *` | Horário (menos afetado) |
| CS Outlook | — | **pg_cron** `*/5` | Já confiável no Supabase |

**O que a troca de PC pode quebrar** (só estes):

| O quê | Onde rodava | O que fazer no PC novo |
|-------|-------------|------------------------|
| Runner **self-hosted** (Lobby Blaze manual) | PC antigo | Reinstalar runner em **Settings → Actions → Runners** ou usar só o script + Agendador de Tarefas |
| **Agendador de Tarefas** — `scripts/run-monitor-lobby-blaze.ps1` | PC antigo | Recriar tarefa horária apontando para o script (ver `docs/SETUP-MONITOR-LOBBY-BLAZE.md`) |
| Scripts locais / `.env.monitor` | PC antigo | Copiar `.env.monitor` / `.env.monitor-cda` (não versionados) para o novo PC |

Lobby Blaze/CDA em produção costumam ser **Telecom + cron**, não GitHub cloud (Blaze retorna HTTP 451 em datacenter).

---

## Como verificar se o problema é GitHub vs Supabase

1. **Edge diários (CDA, e-mails, RSS, Comercial):** Supabase → **Database → Cron Jobs** (`daily-%`) + **Edge Functions → Invocations** / Status Técnico (`sync_logs`).
2. **Social KPIs:** **https://github.com/Felipe-Saturnino/influencer-dashboard/actions** → Sync Social Media KPIs → Event schedule ou Run workflow.
3. Se **pg_cron** não listar `daily-%`, cole `scripts/COLE-NO-SUPABASE-daily-edge-jobs-pg-cron.sql` (Vault precisa dos secrets).

Secrets dos workflows manuais (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.) ficam em **Settings → Secrets and variables → Actions** — **não** vêm no clone.

---

## Limitações conhecidas do GitHub Actions

- Agendamentos são **melhor esforço** (atrasos de minutos ou **dias sem run**).
- Vários workflows no **mesmo minuto** competem na fila.
- Schedules só na **branch padrão** (`main`).
- O **watchdog** também usa schedule — por isso os Edge jobs migraram para **pg_cron**.

---

## Recuperação manual (quando a manhã falhou)

1. Confirmar jobs `daily-%` ativos no Supabase Cron.
2. Status Técnico → Sync nos cards, ou Actions → **Run workflow** (branch `main`).
3. Social: Actions → Sync Social Media KPIs → Run workflow; ou aguardar o watchdog.

Ordem sugerida se tudo falhou: CDA → Spin RSS → Social → Relatório Diretoria → E-mail Agenda → Comercial.
