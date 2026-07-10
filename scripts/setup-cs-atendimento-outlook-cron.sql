# Script manual — cron CS Outlook (pg_cron)

Use se preferir aplicar fora das migrations ou repetir após rotacionar a service role.

## 1. Secrets no Vault (SQL Editor — uma vez)

Substitua os valores entre aspas.

```sql
SELECT vault.create_secret(
  'https://SEU_PROJETO.supabase.co',
  'supabase_project_url',
  'URL base do projeto — cron CS Outlook'
);

SELECT vault.create_secret(
  'SUA_SUPABASE_SERVICE_ROLE_KEY',
  'supabase_service_role_key',
  'Service role — cron CS Outlook'
);
```

Opcional (se `CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET` estiver na Edge Function):

```sql
SELECT vault.create_secret(
  'SEU_INGEST_SECRET',
  'cs_atendimento_outlook_ingest_secret',
  'Header ingest CS Outlook'
);
```

## 2. Aplicar migration

```bash
supabase db push
```

Ou rode o conteúdo de `supabase/migrations/20260710150000_cs_atendimento_outlook_pg_cron.sql` no SQL Editor.

## 3. Validar job

```sql
SELECT jobid, jobname, schedule, active FROM cron.job
WHERE jobname = 'ingest-cs-atendimento-outlook-5min';
```

Deve retornar `*/5 * * * *` e `active = true`.

## 4. Validar execução

Após 5–10 min:

- Supabase → Edge Functions → `ingest-cs-atendimento-outlook` → **Invocations**
- Ou `sync_logs` com `integracao_slug = 'cs_atendimento_outlook'`

## Rotacionar service role

1. Atualize o secret no Vault (ou crie novo e remova o antigo).
2. Não é necessário alterar o job — ele lê o Vault a cada execução.
