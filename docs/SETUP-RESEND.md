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

Para enviar para qualquer e-mail (não só testes):

1. Resend → **Domains** → **Add Domain**
2. Informe o domínio (ex: `spingaming.com.br`)
3. Adicione os registros DNS indicados (MX, SPF, DKIM)
4. Aguarde verificação (status **Verified**)
5. Use o endereço verificado em `RESEND_FROM`

Sem domínio verificado, use `onboarding@resend.dev` (limitado a testes).

---

## 4. Supabase Secrets

**Supabase** → **Project Settings** → **Edge Functions** → **Secrets**:

| Secret | Obrigatório | Descrição |
|--------|-------------|-----------|
| `RESEND_API_KEY` | Sim | Chave da API Resend |
| `RESEND_FROM` | Produção | Ex: `Data Intelligence <noreply@spingaming.com.br>` |
| `RELATORIO_DIRETORIA_DESTINATARIOS` | Sim* | E-mails da diretoria (função `relatorio-diario-diretoria`), separados por vírgula |
| `EMAIL_AGENDA_DESTINATARIOS` | Sim† | E-mails do time operacional (função `email-agenda-diaria`), separados por vírgula |
| `EMAIL_AGENDA_FROM` | Não | Remetente só para a agenda; se vazio, usa `RESEND_FROM` |

\* Para o relatório diário. Ver `docs/SETUP-RELATORIO-DIARIO-DIRETORIA.md`.

† Para o e-mail apenas com **Agenda do dia**. Deploy: `supabase functions deploy email-agenda-diaria`.

**Automático:** após fazer merge na branch padrão, o workflow `.github/workflows/email-agenda-diaria.yml` dispara diariamente (mesmo horário aproximado do relatório da diretoria: 9h UTC). É possível rodar à mão em **Actions → E-mail Agenda Diária → Run workflow**. Sem esse ficheiro no remoto, o envio da agenda é só manual (botão no Status Técnico).

---

## 5. Deploy

```bash
supabase functions deploy relatorio-diario-diretoria
supabase functions deploy email-agenda-diaria
supabase functions deploy criar-usuario   # se usar boas-vindas
supabase functions deploy sync-metricas   # se usar alerta 403
```

---

## 6. Teste

```powershell
$url = "https://SEU_PROJETO.supabase.co/functions/v1/relatorio-diario-diretoria"
$key = "sua-anon-key"
Invoke-RestMethod -Uri $url -Method Post -Headers @{
  "Authorization" = "Bearer $key"
  "Content-Type" = "application/json"
} -Body '{"destinatarios": ["seu@email.com"]}'
```
