# Diagnóstico operacional — Status Técnico

Leitura de jobs, secrets, smoke de Edge Functions e pings vivos — **sem** disparar sync nem e-mails. Resultado gravado em `tech_logs` e visível em **Logs Recentes** (faixa **48h** após a execução). Só o **resumo** e as linhas de **atenção/falha** são gravados; checks OK entram só no contador do resumo.

## Deploy (painel Supabase)

Crie **dois ficheiros** no mesmo nível em `platform-health-check`:

| Ficheiro | Origem no repo |
|----------|----------------|
| `index.ts` | `supabase/functions/platform-health-check/index.ts` |
| `platformHealthDiagnostics.ts` | `supabase/functions/platform-health-check/platformHealthDiagnostics.ts` |

**Deploy updates** após colar ambos. Manter `platformHealthDiagnostics.ts` alinhado a `src/lib/platformHealthDiagnostics.ts`.

CLI alternativa:

```bash
supabase functions deploy platform-health-check
```

## Autorização

- **UI:** permissão **Editar** em Status Técnico (`perm.canEditarOk`).
- **Edge:** perfil `admin` ou `role_permissions.can_editar` = `sim` / `proprios` para `status_tecnico`.

## O que a execução cobre

| Suíte | Exemplos | Não faz |
|-------|----------|---------|
| **A — Infra** | PostgREST, Auth, Storage (buckets essenciais), OPTIONS em todas as Edge Functions, pg_cron | Alterar dados |
| **B — Jobs** | `sync_logs` **por slug**, pipeline social, e-mails do dia, fallback lobby nas 9 operadoras, métricas CDA D-1 | Disparar Sync |
| **C — Pings** | Resend `/domains`, GitHub repo, Microsoft Graph (Inbox CS), CDA Reporting (1 dia, só GET), Brasil API, HEAD RSS / gov.br SPA | Enviar e-mail ou scrape de lobby |
| **D — Conflitos** | Slug esperado sem linha em `integrations`, CIDR de check-in vazio, secret de ingestão de lobby ausente | Corrigir sozinho |

Timeout por ping ~8s; smoke OPTIONS ~4s; orçamento total ~45s (o que não couber vira aviso «não deu tempo»).

## Secrets verificados no diagnóstico

| Probe nos logs | Secret(s) | Severidade se falhar |
|----------------|-----------|----------------------|
| Configuração CDA | `CDA_INFLUENCERS_API_KEY` ou `CDA_USE_REPORTING_API` | Erro |
| Configuração CDA Afiliados | `CDA_AFILIADOS_API_KEY` | Erro |
| Configuração Social Media | `GITHUB_TOKEN` + `GITHUB_REPO` | Aviso |
| Resend — API Key | `RESEND_API_KEY` | Erro |
| E-mail transacional — remetente | `RESEND_FROM_SISTEMA` | Aviso (fallback no código) |
| E-mail cron — remetente | `RESEND_FROM_RELATORIOS` ou `RESEND_FROM` legado | Aviso |
| Senha padrão | `SENHA_PADRAO` (mín. 8 caracteres) | Erro |
| Destinatários — Relatório | `RELATORIO_DIRETORIA_DESTINATARIOS` | Aviso |
| Destinatários — Agenda | `EMAIL_AGENDA_DESTINATARIOS` | Aviso |
| Microsoft Graph | `CS_OUTLOOK_TENANT_ID` / `CLIENT_ID` / `CLIENT_SECRET` | Erro se incompleto |
| Ingestão lobby | `MONITOR_LOBBY_*_INGEST_SECRET` | Aviso se ausente |

Probes de e-mail transacional/cron **só aparecem** se `RESEND_API_KEY` estiver configurada. Pings HTTP 401/403 = **erro** (chave recusada); timeout/5xx = **aviso**.

## Lógica partilhada

| Caminho | Uso |
|---------|-----|
| `src/lib/platformHealthDiagnostics.ts` | Fonte canónica — app React e Vitest |
| `supabase/functions/platform-health-check/platformHealthDiagnostics.ts` | Cópia para deploy manual / Deno |
| `supabase/functions/platform-health-check/index.ts` | Handler HTTP |
| `tests/unit/lib/platformHealthDiagnostics.test.ts` | Testes unitários |

## Tipos em Logs Recentes

| `tipo` | Significado |
|--------|-------------|
| `diagnostico_plataforma` | Resumo da execução (sempre gravado) |
| `diagnostico_aviso` | Atenção (job atrasado, secret opcional, timeout) |
| `diagnostico_erro` | Falha (secret obrigatório, 401/403, última execução com falha) |

`diagnostico_ok` continua no código para contagem; **não** é inserido em `tech_logs` para não poluir a lista.

## Relação com Vitest

`npm test` valida helpers e probes — **não** substitui executar **Diagnóstico da Plataforma** no ambiente com secrets reais.
