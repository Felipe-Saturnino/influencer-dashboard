# Relatório Diário — Diretoria

E-mail automático enviado **todo dia às 9h (BRT)** para a diretoria, contendo:

1. **Agenda do dia** — lives agendadas para hoje
2. **Consolidado do dia anterior** — resultados de influencers (lives, horas, views, acessos, registros, FTDs, depósitos, GGR)

---

## Configuração

### 1. Supabase Secrets

| Secret | Descrição |
|-------|-----------|
| `RESEND_API_KEY` | Chave da API Resend (ver `docs/SETUP-RESEND.md`) |
| `RESEND_FROM` | Remetente (ex: `Acquisition Hub <noreply@spingaming.com.br>`) |
| `RELATORIO_DIRETORIA_DESTINATARIOS` | E-mails separados por vírgula (ex: `dir1@empresa.com,dir2@empresa.com`) |

### 2. Deploy

```bash
supabase functions deploy relatorio-diario-diretoria
```

### 3. Automação às 9h (BRT)

#### Opção A — GitHub Actions (repositório)

O workflow `.github/workflows/relatorio-diario-diretoria.yml` dispara às **12h UTC** (= **9h em Brasília**, fuso `America/Sao_Paulo`).

**Secrets no GitHub:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Importante:** o agendamento do GitHub **não garante** o minuto exato; pode haver atraso de alguns minutos (documentação oficial). O workflow precisa estar na **branch padrão** do repositório. Nos logs da Action, o passo *Horário da execução* mostra UTC e Brasília no momento do run.

#### Opção B — Supabase (mais pontual)

No **Supabase Dashboard** → **Edge Functions** → `relatorio-diario-diretoria` → **Schedules** (se disponível no seu plano): crie um agendamento **diário às 09:00** com fuso **America/Sao_Paulo**, chamando a função (método e corpo iguais ao workflow: `POST` com `{}` e autorização com **anon key** ou conforme a UI).

Assim o disparo fica alinhado ao horário de Brasília sem depender da fila do GitHub.

#### Opção C — Cron externo

Serviço de cron HTTP (ex.: agendamento diário **09:00** `America/Sao_Paulo`) fazendo `POST` para:

`https://SEU_PROJETO.supabase.co/functions/v1/relatorio-diario-diretoria`

com headers `Authorization: Bearer <ANON_KEY>`, `apikey: <ANON_KEY>`, `Content-Type: application/json` e body `{}`.

---

## Teste manual

```powershell
$url = "https://SEU_PROJETO.supabase.co/functions/v1/relatorio-diario-diretoria"
$key = $env:VITE_SUPABASE_ANON_KEY

Invoke-RestMethod -Uri $url -Method Post -Headers @{
  "Authorization" = "Bearer $key"
  "Content-Type" = "application/json"
} -Body '{"destinatarios": ["seu@email.com"]}'
```

---

## Conteúdo do e-mail

- **Header:** Título + data
- **Agenda:** Tabela com horário, influencer, plataforma, link
- **Consolidado:** Tabela por influencer com métricas do dia anterior
- **Totais:** Resumo em destaque (lives, horas, views, FTDs, depósitos, GGR)
- **Footer:** Timestamp de envio

Layout profissional, adequado para apresentação à diretoria.
