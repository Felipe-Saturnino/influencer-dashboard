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

### 3. GitHub Actions

O workflow `.github/workflows/relatorio-diario-diretoria.yml` executa às 9h BRT.

**Secrets no GitHub:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`

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
