# Backfill Sync - Métricas CDA
# Uso: .\backfill-sync.ps1
# Variáveis: SUPABASE_SYNC_URL (ou SUPABASE_URL) e SUPABASE_ANON_KEY

$base = if ($env:SUPABASE_SYNC_URL) { $env:SUPABASE_SYNC_URL }
        elseif ($env:SUPABASE_URL) { $env:SUPABASE_URL.TrimEnd("/") + "/functions/v1/sync-metricas" }
        elseif ($env:VITE_SUPABASE_URL) { $env:VITE_SUPABASE_URL.TrimEnd("/") + "/functions/v1/sync-metricas" }
        else { $null }
$key = $env:SUPABASE_ANON_KEY ?? $env:VITE_SUPABASE_ANON_KEY

if (-not $base -or -not $key) {
  Write-Host "Erro: Defina SUPABASE_SYNC_URL (ou VITE_SUPABASE_URL) e SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY)"
  exit 1
}

$ontem = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
$inicio = "2025-12-01"

$body = @{ data_inicio = $inicio; data_fim = $ontem; skip_orfaos = $false } | ConvertTo-Json

try {
  $r = Invoke-RestMethod -Uri $base -Method Post -Headers @{
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
  } -Body $body
  $regs = $r.fase1_influencers.registros_upserted
  Write-Host "Sync OK: $regs registros | periodo $inicio -> $ontem"
} catch {
  Write-Host "Erro: $_"
  exit 1
}
