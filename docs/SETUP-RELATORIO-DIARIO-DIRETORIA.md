# Relatório Diário — Diretoria (Aquisição)

E-mail automático enviado **todo dia pela manhã (~6h BRT via GitHub Actions)** para a diretoria.

**Assunto:** `Relatório Diário - {data} | Aquisição`

## Conteúdo

1. **Consolidado de Resultados (MTD)** — mês de referência = mês de `dataOntem`
   - Legenda: `Consolidado MTD - até dia {última data com linha no Overview Spin}`
   - Resultado por Operadoras (linha TOTAL + **todas as operadoras ativas** parceiras)
   - Resultado de Streamers (visão global; **Investimento** = `get_investimento_pago`, mesma regra do Overview Streamers — ciclos pagos por `data_fim`)
   - Resultado de Mídias Sociais (investimento = Meta Ads)
2. **Posicionamento** — última leitura antes do envio
   - **Mesas Dedicadas:** Mesa · Blaze · CDA — posição **somente** por **ID Spin** dedicado ligado à operadora (sem fallback por nome); sem leitura → —
   - **Mesas Network:** Mesa · Blaze · CDA · Esportiva · Jonbet (match exclusivo por ID Spin network)
3. **Streamers**
   - Agenda do dia (`dataHoje`)
   - Resultado de Influencers do dia anterior (`dataOntem`)

**Layout:** card fluido `max-width: 960px` (100% no mobile).
---

## Configuração

### 1. Supabase Secrets

| Secret | Descrição |
|-------|-----------|
| `RESEND_API_KEY` | Chave da API Resend (ver `docs/SETUP-RESEND.md`) |
| `RESEND_FROM_RELATORIOS` | Remetente (ex: `Data Intelligence <relatorios@data-intelligence.spingaming.com.br>`) — ou legado `RESEND_FROM` |
| `RELATORIO_DIRETORIA_DESTINATARIOS` | E-mails separados por vírgula (ex: `dir1@empresa.com,dir2@empresa.com`) |

### 2. Deploy

```bash
supabase functions deploy relatorio-diario-diretoria
```

### 3. Automação pela manhã (BRT)

#### Opção A — GitHub Actions (apenas manual / backup)

O workflow `.github/workflows/relatorio-diario-diretoria.yml` **não** usa mais `schedule` (a fila do GitHub falhava manhãs inteiras e duplicaria o e-mail). Use **Run workflow** ou o Status Técnico.

**Agendamento PRINCIPAL:** **Opção B (pg_cron)** — `scripts/COLE-NO-SUPABASE-daily-edge-jobs-pg-cron.sql` (~6h BRT).

**Secrets no GitHub (só para disparo manual):** `SUPABASE_URL`, `SUPABASE_ANON_KEY`

#### Opção B — Supabase pg_cron (recomendado / pontual)

1. Garanta no Vault: `supabase_project_url` + `supabase_service_role_key` (mesmo do cron CS Outlook — `scripts/setup-cs-atendimento-outlook-cron.sql`).
2. Cole no SQL Editor: `scripts/COLE-NO-SUPABASE-daily-edge-jobs-pg-cron.sql` (job `daily-relatorio-diario-diretoria`, cron `0 9 * * *` UTC ≈ 6h BRT).
3. Valide: `SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname LIKE 'daily-%';`

Alternativa na UI: **Edge Functions** → `relatorio-diario-diretoria` → **Schedules** (se disponível no plano), fuso **America/Sao_Paulo**.

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

- **Header:** Relatório Diário — Aquisição + data
- **Bloco 1:** Consolidado MTD até a última data do Overview Spin (operadoras ativas, streamers, mídias sociais)
- **Bloco 2:** Posicionamento — Mesas Dedicadas + Mesas Network
- **Bloco 3:** Agenda do dia + influencers D-1
- **Footer:** Timestamp de envio

Layout amplo (`960px`) e responsivo para PC, tablet e celular.
