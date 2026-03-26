# Relatório Diário — Diretoria

E-mail automático enviado **todo dia pela manhã (~6h BRT via GitHub Actions)** para a diretoria, contendo:

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

### 3. Automação pela manhã (BRT)

#### Opção A — GitHub Actions (repositório)

O workflow `.github/workflows/relatorio-diario-diretoria.yml` dispara às **9h UTC** (= **6h em Brasília**, fuso `America/Sao_Paulo`). A ideia é **antecipar** o disparo: como o GitHub costuma **atrasar** execuções agendadas, começar às 6h BRT faz com que, mesmo com atraso, o e-mail tenda a sair **ainda de manhã**.

**Secrets no GitHub:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Importante — leia antes de confiar no horário:** o GitHub agenda em **UTC** (`0 9 * * *` = 09:00 UTC ≈ **6h em Brasília**), mas a fila é **“melhor esforço”** (atrasos de minutos ou horas). O histórico de Actions mostra o **horário real** de início do job — veja o passo *Horário da execução* nos logs. O workflow precisa estar na **branch padrão** do repositório.

**Para horário fixo e previsível**, use a **Opção B ou C** abaixo; você pode **desativar** o `schedule` do GitHub (mantendo `workflow_dispatch` para testes).

#### Opção B — Supabase (mais pontual)

No **Supabase Dashboard** → **Edge Functions** → `relatorio-diario-diretoria` → **Schedules** (se disponível no seu plano): agende **diariamente às 06:00** (ou o horário desejado) com fuso **America/Sao_Paulo**, `POST`, body `{}`, com **anon key** ou conforme a UI.

#### Opção C — Cron externo

Serviço de cron HTTP (ex.: **06:00** `America/Sao_Paulo`) fazendo `POST` para:

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
