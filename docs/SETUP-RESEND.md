# Configuração do Resend — Data Intelligence (Spin Gaming)

Guia para configurar o Resend e os e-mails do sistema.

---

## 1. Criar conta no Resend

1. Acesse https://resend.com/signup
2. Crie a conta e confirme o e-mail
3. Dashboard: https://resend.com

---

## 2. Obter API Key

1. Resend Dashboard → **API Keys** → **Create API Key**
2. Nome: `Data Intelligence` (ou marca exibida no remetente)
3. Permissão: **Sending access**
4. Copie a chave (`re_...`) — exibida apenas uma vez

---

## 3. Configurar domínio (produção)

O domínio **`data-intelligence.spingaming.com.br`** (ou o que estiver no Resend) deve estar **Verified** com registros DNS (SPF, DKIM).

Remetentes usados pelo código (fallback se o Secret estiver vazio):

| Uso | Endereço |
|-----|----------|
| Crons (relatório diretoria, agenda do dia) | `relatorios@data-intelligence.spingaming.com.br` |
| Transacionais (conta nova, reset de senha, alertas) | `sistema@data-intelligence.spingaming.com.br` |

Formato nos Secrets: `Data Intelligence <relatorios@data-intelligence.spingaming.com.br>`

---

## 4. Supabase Secrets

**Supabase** → **Project Settings** → **Edge Functions** → **Secrets**:

| Secret | Obrigatório | Descrição |
|--------|-------------|-----------|
| `RESEND_API_KEY` | Sim | Chave da API Resend |
| `RESEND_FROM_RELATORIOS` | Recomendado | Remetente dos crons. Ex.: `Data Intelligence <relatorios@data-intelligence.spingaming.com.br>` |
| `RESEND_FROM_SISTEMA` | Recomendado | Remetente transacional. Ex.: `Data Intelligence <sistema@data-intelligence.spingaming.com.br>` |
| `RESEND_FROM` | Legado | Se `RESEND_FROM_RELATORIOS` estiver vazio, os crons usam este valor |
| `RELATORIO_DIRETORIA_DESTINATARIOS` | Sim* | E-mails da diretoria (`relatorio-diario-diretoria`), separados por vírgula |
| `EMAIL_AGENDA_DESTINATARIOS` | Sim† | E-mails do time operacional (`email-agenda-diaria`), separados por vírgula |

\* Ver `docs/SETUP-RELATORIO-DIARIO-DIRETORIA.md`.

† Deploy: `supabase functions deploy email-agenda-diaria`.

**Funções que usam `sistema@…`:** `criar-usuario`, `recuperar-senha`, `criar-afiliado-network`, `sync-rh-prestador-auth-user`, `admin-usuario-acao` (reset senha).

**Funções que usam `relatorios@…` (via `RESEND_FROM_RELATORIOS`):** `relatorio-diario-diretoria`, `email-agenda-diaria`.

---

## 5. Deploy

```bash
supabase functions deploy relatorio-diario-diretoria
supabase functions deploy email-agenda-diaria
supabase functions deploy criar-usuario
supabase functions deploy recuperar-senha
supabase functions deploy criar-afiliado-network
supabase functions deploy sync-rh-prestador-auth-user
supabase functions deploy sync-metricas-cda
supabase functions deploy enviar-email-teste  # preview transacionais (exige EMAIL_TESTE_SECRET)
```

---

## 6. Teste

### 6.1 E-mail boas-vindas (sem criar usuário)

1. Secret **`EMAIL_TESTE_SECRET`** (string longa) no Supabase.
2. Deploy `enviar-email-teste` (ver acima).
3. PowerShell — substitua `SEU_PROJETO`, anon key e secret:

```powershell
$url = "https://SEU_PROJETO.supabase.co/functions/v1/enviar-email-teste"
$key = "sua-anon-key"
$body = @{
  secret = "valor-de-EMAIL_TESTE_SECRET"
  template = "boas_vindas"
  to = "felipe.saturnino@spingaming.com.br"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method Post `
  -Headers @{ Authorization = "Bearer $key"; apikey = $key; "Content-Type" = "application/json" } `
  -Body $body
```

Detalhes: `docs/SETUP-CRIAR-USUARIO.md`.

### 6.2 Relatório diretoria (destinatário de teste)

```powershell
$url = "https://SEU_PROJETO.supabase.co/functions/v1/relatorio-diario-diretoria"
$key = "sua-anon-key"
Invoke-RestMethod -Uri $url -Method Post -Headers @{
  "Authorization" = "Bearer $key"
  "Content-Type" = "application/json"
} -Body '{"destinatarios": ["seu@email.com"]}'
```
