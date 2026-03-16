# Backfill Histórico e Automação Diária — Sync de Métricas CDA

## 1. Comando para backfill histórico (legado)

Use para preencher `influencer_metricas` com dados de um período passado. Execute **uma vez** para o legado e, depois, a automação diária cuida dos novos dias.

### cURL (Windows PowerShell / Linux / Mac)

Substitua `SUPABASE_URL` e `SUPABASE_ANON_KEY` pelos valores do seu projeto (`.env` ou Supabase Dashboard):

```powershell
$url = "$env:VITE_SUPABASE_URL/functions/v1/sync-metricas"
$key = $env:VITE_SUPABASE_ANON_KEY
$body = @{
  data_inicio = "2025-12-01"
  data_fim = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
  skip_orfaos = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method Post -Headers @{
  "Authorization" = "Bearer $key"
  "Content-Type" = "application/json"
} -Body $body
```

### Comando direto (substitua os placeholders)

```powershell
# Backfill de 2025-12-01 até ontem
Invoke-RestMethod -Uri "https://SEU_PROJECT_REF.supabase.co/functions/v1/sync-metricas" -Method Post `
  -Headers @{
    "Authorization" = "Bearer SUA_ANON_KEY"
    "Content-Type" = "application/json"
  } `
  -Body '{"data_inicio":"2025-12-01","data_fim":"2026-03-15","skip_orfaos":false}'
```

### Script PowerShell salvo (`scripts/backfill-sync.ps1`)

Para rodar o backfill manualmente ou via **Agendador de Tarefas** (Task Scheduler):

```powershell
# scripts/backfill-sync.ps1
$url = $env:SUPABASE_SYNC_URL   # Ex: https://xxx.supabase.co/functions/v1/sync-metricas
$key = $env:SUPABASE_ANON_KEY

$hoje = Get-Date
$ontem = $hoje.AddDays(-1).ToString("yyyy-MM-dd")
$inicio = "2025-12-01"

$body = @{ data_inicio = $inicio; data_fim = $ontem; skip_orfaos = $false } | ConvertTo-Json

try {
  $r = Invoke-RestMethod -Uri $url -Method Post -Headers @{
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
  } -Body $body
  Write-Host "Sync OK: $($r.fase1_influencers.registros_upserted) registros"
} catch {
  Write-Host "Erro: $_"
  exit 1
}
```

Defina as variáveis de ambiente antes de rodar:

```powershell
$env:SUPABASE_SYNC_URL = "https://SEU_PROJECT_REF.supabase.co/functions/v1/sync-metricas"
$env:SUPABASE_ANON_KEY = "sua-anon-key"
.\scripts\backfill-sync.ps1
```

---

## 2. Automação diária às 4h da manhã

### Opção A: GitHub Actions (recomendado)

O workflow `.github/workflows/sync-metricas-daily.yml` executa o sync diariamente às **4h (horário de Brasília)**.

**Configuração:**

1. No repositório GitHub: **Settings** → **Secrets and variables** → **Actions**
2. Crie os secrets:
   - `SUPABASE_URL`: `https://SEU_PROJECT_REF.supabase.co`
   - `SUPABASE_ANON_KEY`: sua anon key (ou `SUPABASE_SERVICE_ROLE_KEY` se preferir)

O workflow usa `SUPABASE_URL` + `/functions/v1/sync-metricas` para chamar a Edge Function.

### Opção B: Agendador de Tarefas (Windows)

1. Abra **Agendador de Tarefas**
2. **Criar Tarefa Básica**
3. Disparo: **Diariamente** às **04:00**
4. Ação: **Iniciar um programa**
   - Programa: `powershell.exe`
   - Argumentos: `-ExecutionPolicy Bypass -File "C:\caminho\para\influencer-dashboard\scripts\backfill-sync.ps1"`
5. Nas **Propriedades** da tarefa, em **Condições**, defina variáveis de ambiente para `SUPABASE_SYNC_URL` e `SUPABASE_ANON_KEY` (ou use um `.env` carregado no script)

---

## Resumo do fluxo

| Etapa | O quê | Quando |
|-------|-------|--------|
| Backfill legado | Rodar comando/script acima com `data_inicio`/`data_fim` do período desejado | Uma vez |
| Automação diária | Sync às 4h traz dados do dia anterior | Todo dia |
| Mapear na Gestão de Links | Clicar em mapear → sync roda automaticamente para aquela UTM | Cada mapeamento |
