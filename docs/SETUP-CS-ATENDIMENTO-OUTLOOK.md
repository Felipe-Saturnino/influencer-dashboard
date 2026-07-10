# CS Atendimento — ingestão Outlook (`contato@spingaming.com.br`)

Lê a **Inbox** da caixa oficial via **Microsoft Graph** (app-only) e cria chamados na aba **E-mail** (`cs_chamado_criar_email`).

> **Importante:** enviar e-mail para `contato@` **não** cria chamado sozinho. A Edge Function `ingest-cs-atendimento-outlook` precisa estar **publicada**, com **secrets do Graph** configurados, e ser **executada** (cron a cada 5 min, botão **Sync** no Status Técnico ou POST manual). Se não houver **nenhuma invocação** no Supabase → Edge Functions → Logs, a ingestão nunca rodou.

## Pré-requisitos (TI — concluídos)

| Item | Status esperado |
|------|-----------------|
| Caixa **contato@spingaming.com.br** | Caixa dedicada (não lista nem caixa pessoal) |
| App Azure AD | **Application permissions** `Mail.Read` + admin consent |
| Application Access Policy | `RestrictAccess` só para `contato@spingaming.com.br` |
| `Test-ApplicationAccessPolicy` | **Granted** em contato@ · **Denied** em outras caixas |

**AppId confirmado pela TI:** `743a19bf-c96a-4acb-ba45-446269f864ef`

## Banco (Supabase)

Aplicar migration:

- `20260708140000_cs_atendimento_email.sql`

(RPC `cs_chamado_criar_email`, bucket `cs-atendimento-email`, tabela `cs_chamado_anexos`.)

Migration de integração (Status Técnico + `sync_logs`):

- `20260710130000_integrations_cs_atendimento_outlook.sql`

## Edge Function

**Nome:** `ingest-cs-atendimento-outlook`

**Ficheiros (mesmo nível que `index.ts`):**

- `index.ts`
- `common.ts`
- `graphOutlook.ts`
- `auth.ts`

Deploy: Supabase Dashboard → Edge Functions → criar/atualizar os 4 ficheiros → **Deploy updates**, ou:

```bash
supabase functions deploy ingest-cs-atendimento-outlook
```

Em `supabase/config.toml`: `verify_jwt = false` (autorização interna na função).

## Secrets (Supabase → Edge Functions → Secrets)

| Secret | Obrigatório | Valor |
|--------|-------------|--------|
| `CS_OUTLOOK_TENANT_ID` | Sim | Directory (tenant) ID do Azure |
| `CS_OUTLOOK_CLIENT_ID` | Sim | `743a19bf-c96a-4acb-ba45-446269f864ef` |
| `CS_OUTLOOK_CLIENT_SECRET` | Sim | Client secret do app (valor do portal Azure) |
| `CS_OUTLOOK_MAILBOX` | Não | Padrão: `contato@spingaming.com.br` |
| `CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET` | Recomendado | String aleatória longa — protege chamadas manuais/cron |

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ANON_KEY` são injetados automaticamente pelo Supabase.

**Autorização:** Bearer `service_role` (cron GitHub Actions), header `x-cs-atendimento-outlook-ingest-secret`, ou sessão logada com permissão **Editar** em **Status Técnico** (disparo pelo botão **Sync** na plataforma).

## Comportamento

1. Autentica no Graph (`client_credentials`, scope `https://graph.microsoft.com/.default`).
2. Lista mensagens da **Inbox** (`modo` padrão: **não lidas**).
3. Ignora remetente = própria caixa `contato@`.
4. Dedupe por `internetMessageId` → coluna `email_message_id`.
5. Faz upload de anexos (`fileAttachment`) no bucket `cs-atendimento-email`.
6. Chama `cs_chamado_criar_email` → protocolo `EMAIL-ANO/NNNN`, status **Aberto**.
7. Marca o e-mail como **lido** no Outlook após sucesso.

## Teste manual (PowerShell)

Substitua `PROJETO`, `SERVICE_ROLE` e, se configurado, `INGEST_SECRET`.

```powershell
$headers = @{
  "Authorization" = "Bearer SERVICE_ROLE"
  "Content-Type"  = "application/json"
}
# Opcional se CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET estiver definido:
# $headers["x-cs-atendimento-outlook-ingest-secret"] = "INGEST_SECRET"

$body = @{
  dry_run = $true
  max_messages = 5
} | ConvertTo-Json

Invoke-RestMethod `
  -Method POST `
  -Uri "https://PROJETO.supabase.co/functions/v1/ingest-cs-atendimento-outlook" `
  -Headers $headers `
  -Body $body
```

Resposta esperada (`dry_run: true`): `encontrados`, `criados` (simulação), sem gravar no banco.

Teste real:

```powershell
$body = @{ max_messages = 10 } | ConvertTo-Json
# mesmo Invoke-RestMethod sem dry_run
```

## Backfill (e-mails já na caixa)

Mensagens **já lidas** não entram no modo padrão. Opções:

1. Marcar como não lidos no Outlook (só os que devem virar chamado), ou
2. Chamar com `modo: "recent"` (dedupe no banco):

```json
{
  "modo": "recent",
  "since_hours": 168,
  "max_messages": 50
}
```

## Cron (produção)

Workflow GitHub Actions: `.github/workflows/ingest-cs-atendimento-outlook-5min.yml` (a cada **5 minutos**).

Secrets no repositório: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e, se usar, `CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET`.

Disparo manual na plataforma: **Status Técnico** → integração **CS Atendimento (Outlook)** → **Sync**.

Alternativa HTTP:

```http
POST /functions/v1/ingest-cs-atendimento-outlook
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
Content-Type: application/json

{}
```

Body vazio = processa até **25** e-mails **não lidos**.

## Validação na plataforma

1. Enviar e-mail de teste para **contato@spingaming.com.br**.
2. Executar a function (cron ou POST manual).
3. **Customer Success → Atendimento → aba E-mail** — chamado `EMAIL-…` em **Aberto**.
4. **Ver** — remetente, assunto, corpo, anexos (se houver).

## Troubleshooting

| Sintoma | Causa provável |
|---------|----------------|
| `Não foi possível autenticar no Microsoft Graph` | Tenant/Client/Secret incorretos ou admin consent pendente |
| `Não foi possível listar e-mails` | `Mail.Read` application permission ou Application Access Policy |
| `AccessCheckResult: Denied` no teste TI | App sem policy na caixa correta |
| Chamado não aparece | Function não deployada ou nunca executada (zero invocações); e-mail já **lido** (usar `modo: "recent"`); migration e-mail não aplicada |
| Duplicado ignorado | Mesmo `internetMessageId` já em `cs_chamados` (esperado) |

Logs: Supabase → Edge Functions → `ingest-cs-atendimento-outlook` → **Logs**.
