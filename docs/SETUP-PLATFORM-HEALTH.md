# Diagnóstico operacional — Status Técnico

Leitura de integrações, jobs recentes e presença de secrets — **sem** disparar sync nem e-mails. Resultado gravado em `tech_logs` e visível em **Logs Recentes** na mesma página.

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

Probes de e-mail transacional/cron **só aparecem** se `RESEND_API_KEY` estiver configurada.

Integrações ativas (`integrations`), sync_logs, pipeline social, envios de e-mail do dia e histórico 24h continuam na mesma execução.

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
| `diagnostico_plataforma` | Resumo da execução |
| `diagnostico_ok` | Check sem problema |
| `diagnostico_aviso` | Atenção (ex.: secret opcional ausente, job atrasado) |
| `diagnostico_erro` | Falha (ex.: CDA ou RESEND_API_KEY ausente) |

## Relação com Vitest

`npm test` valida helpers e probes — **não** substitui executar **Diagnóstico da Plataforma** no ambiente com secrets reais.
