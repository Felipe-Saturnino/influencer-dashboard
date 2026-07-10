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

### Teste no Supabase Dashboard (único método confiável)

O painel **ignora headers customizados** (Authorization/apikey). Use o **secret no body**:

**1. Criar secret (uma vez)**

Edge Functions → **Secrets** → adicione:

| Nome | Valor |
|------|--------|
| `CS_ATENDIMENTO_OUTLOOK_INGEST_SECRET` | string longa aleatória (ex.: gere no 1Password) |

**2. Publicar os 4 ficheiros** (obrigatório — se faltar `auth.ts`, a function quebra com **500**):

- `index.ts`, `common.ts`, `graphOutlook.ts`, **`auth.ts`**

Edge Functions → Details → **Enforce JWT Verification = OFF**.

**3. Passo A — só autorização** (POST, Role postgres ou anonymous, **sem headers**):

```json
{
  "auth_probe": true,
  "ingest_secret": "COLE_AQUI_O_MESMO_VALOR_DO_SECRET"
}
```

Esperado: **200** + `"ok": true` + `"mensagem": "Autorização OK…"`.

**4. Passo B — testar Microsoft Graph**:

```json
{
  "test_graph": true,
  "ingest_secret": "COLE_AQUI_O_MESMO_VALOR_DO_SECRET"
}
```

Esperado: **200** + `"Conexão Microsoft Graph OK"`.  
**500** aqui = secrets Azure (`CS_OUTLOOK_*`) — não é mais erro de auth.

**Plataforma:** admin → **Status Técnico** → **CS - Caixa de Contato (Outlook)** → **Sync** (usa sessão logada, não precisa do ingest secret).

### Troubleshooting 403 / 500

| Sintoma | Causa | Ação |
|---------|--------|------|
| **403** + só «Edge function returned an error» **sem JSON** | Gateway (JWT Verification **ON**) ou token do Role postgres | Desligar **Enforce JWT Verification**; usar body com `ingest_secret` |
| **403** + JSON `"erro": "…"` | Auth interna (secret errado, anon, sem permissão) | Conferir `ingest_secret` igual ao Secret; ver `auth_diagnostico` |
| **500** genérico sem JSON | Deploy incompleto (`auth.ts` em falta) ou crash ao arrancar | Republicar **4 ficheiros**; ver Logs da function |
| **500** + JSON `"test_graph": true` | Graph / Azure | Conferir `CS_OUTLOOK_*`; secret Azure = **Value**, não Secret ID |
| Headers com service_role **nunca funcionam** no Test | Limitação do painel Supabase | Usar **body** `ingest_secret` (acima) |

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

**Diagnóstico Graph (recomendado após atualizar secrets):**

```powershell
$headers = @{
  "Authorization" = "Bearer SERVICE_ROLE"
  "Content-Type"  = "application/json"
}
$body = @{ test_graph = $true } | ConvertTo-Json

Invoke-RestMethod `
  -Method POST `
  -Uri "https://PROJETO.supabase.co/functions/v1/ingest-cs-atendimento-outlook" `
  -Headers $headers `
  -Body $body
```

Resposta OK: `"ok": true`, `"mensagem": "Conexão Microsoft Graph OK…"`.  
Resposta erro: campos `etapa` (`secrets` | `token` | `mailbox`), `azure_erro`, `azure_detalhe`, `avisos_secrets` e `secrets.client_secret_parece_secret_id`.

> Após alterar secrets no Supabase, **redeploy** da function (`supabase functions deploy ingest-cs-atendimento-outlook`) ou aguarde 1–2 min para novas instâncias.

### Ingestão simulada

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

### Principal — Supabase `pg_cron` (recomendado, a cada 5 min)

Migration: `20260710150000_cs_atendimento_outlook_pg_cron.sql`

**Passo a passo:**

1. No **SQL Editor**, gravar secrets no Vault (substituir valores):

```sql
SELECT vault.create_secret(
  'https://SEU_PROJETO.supabase.co',
  'supabase_project_url',
  'URL base — cron CS Outlook'
);
SELECT vault.create_secret(
  'SUA_SUPABASE_SERVICE_ROLE_KEY',
  'supabase_service_role_key',
  'Service role — cron CS Outlook'
);
```

2. Aplicar a migration (`supabase db push` ou SQL Editor).

3. Confirmar o job:

```sql
SELECT jobid, jobname, schedule, active FROM cron.job
WHERE jobname = 'ingest-cs-atendimento-outlook-5min';
```

Detalhes: `scripts/setup-cs-atendimento-outlook-cron.sql`.

### Backup / manual — GitHub Actions

Workflow: `.github/workflows/ingest-cs-atendimento-outlook-5min.yml` (melhor esforço; **não** substitui o pg_cron).

Se o schedule do GitHub **não disparar** (comum em repo privado):

- **Settings → Actions → General → Allow scheduled workflows** — deve estar **ativado**
- O workflow precisa estar na branch **`main`**
- Mesmo assim, o GitHub pode **atrasar ou pular** runs frequentes

Secrets no GitHub: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

Disparo manual na plataforma: **Status Técnico** → **CS - Caixa de Contato (Outlook)** → **Sync**.

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
| `Não foi possível autenticar no Microsoft Graph` / HTTP 500 | Secrets Azure no **Supabase → Edge Functions → Secrets** (não GitHub). Rode `test_graph: true` (acima) para ver `azure_detalhe`. |
| `client_secret_parece_secret_id: true` | Colou **Secret ID** (UUID) em vez do **Value** do client secret no Azure — gere secret novo e copie o Value |
| `AADSTS7000215` / `invalid_client` | Client secret inválido ou expirado |
| `etapa: mailbox` / ErrorAccessDenied | Token OK, mas **Application Access Policy** ou **Mail.Read** (Application) — TI deve validar `Test-ApplicationAccessPolicy` em contato@ |
| Secrets atualizados e erro persiste | Redeploy: `supabase functions deploy ingest-cs-atendimento-outlook` |
| `AccessCheckResult: Denied` no teste TI | App sem policy na caixa correta |
| Chamado não aparece | Function não deployada ou nunca executada; e-mail já **lido** (usar `modo: "recent"`); migration e-mail não aplicada |
| Cron GitHub não roda após 30 min | Normal em repo privado — usar **pg_cron** (migration `20260710150000`) + Vault; ativar **Allow scheduled workflows** se quiser manter GitHub como backup |
| Duplicado ignorado | Mesmo `internetMessageId` já em `cs_chamados` (esperado) |

Logs: Supabase → Edge Functions → `ingest-cs-atendimento-outlook` → **Logs**.
