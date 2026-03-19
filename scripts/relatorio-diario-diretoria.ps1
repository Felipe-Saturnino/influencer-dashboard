# Teste manual do relatório diário para a diretoria
# Variáveis: SUPABASE_RELATORIO_URL, SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY)

$url = $env:SUPABASE_RELATORIO_URL
if (-not $url) { $url = "$env:VITE_SUPABASE_URL/functions/v1/relatorio-diario-diretoria" }
$key = $env:SUPABASE_ANON_KEY
if (-not $key) { $key = $env:VITE_SUPABASE_ANON_KEY }

if (-not $url -or -not $key) {
  Write-Host "Defina SUPABASE_RELATORIO_URL (ou VITE_SUPABASE_URL) e SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY)"
  exit 1
}

try {
  $r = Invoke-RestMethod -Uri $url -Method Post -Headers @{
    "Authorization" = "Bearer $key"
    "Content-Type"  = "application/json"
  } -Body '{}'
  Write-Host "Relatório enviado: $($r.total_agenda) na agenda, $($r.total_influencers) influencers, para $($r.destinatarios -join ', ')"
} catch {
  Write-Host "Erro: $_"
  exit 1
}
