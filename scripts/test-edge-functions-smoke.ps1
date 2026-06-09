# Smoke test — Edge Functions deployadas no Supabase (após deploy manual no painel).
# Não altera dados. Envia OPTIONS em cada URL; 204/200 = function respondeu.
#
# Uso (na raiz do repo, PowerShell):
#   $env:VITE_SUPABASE_URL = "https://SEU_PROJETO.supabase.co"
#   $env:VITE_SUPABASE_ANON_KEY = "sua-anon-key"
#   .\scripts\test-edge-functions-smoke.ps1
#
# Opcional: carrega .env local se existir (linhas VITE_SUPABASE_*).

param(
  [string]$SupabaseUrl = $env:VITE_SUPABASE_URL,
  [string]$AnonKey = $env:VITE_SUPABASE_ANON_KEY
)

$ErrorActionPreference = "Stop"

function Load-DotEnv {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return }
  Get-Content $Path | ForEach-Object {
    if ($_ -match '^\s*VITE_SUPABASE_URL\s*=\s*(.+)\s*$') { $script:SupabaseUrl = $matches[1].Trim().Trim('"').Trim("'") }
    if ($_ -match '^\s*VITE_SUPABASE_ANON_KEY\s*=\s*(.+)\s*$') { $script:AnonKey = $matches[1].Trim().Trim('"').Trim("'") }
  }
}

Load-DotEnv (Join-Path $PSScriptRoot "..\.env")

if (-not $SupabaseUrl -or -not $AnonKey) {
  Write-Host "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou crie .env na raiz)." -ForegroundColor Red
  exit 1
}

$base = $SupabaseUrl.TrimEnd("/")

$functions = @(
  "platform-health-check",
  "sync-metricas-cda",
  "trigger-social-kpis",
  "sync-spin-na-rede-rss",
  "sync-painel-noticias-rss",
  "monitor-lobby-blaze",
  "monitor-lobby-cda",
  "criar-usuario",
  "atualizar-perfil",
  "admin-usuario-acao",
  "recuperar-senha",
  "criar-usuario-scout",
  "criar-afiliado-network",
  "sync-rh-prestador-auth-user",
  "aprovar-pagamento",
  "prestador-ponto",
  "prospecto-scout-site",
  "prospecto-afiliados-network-site",
  "relatorio-diario-diretoria",
  "email-agenda-diaria"
)

Write-Host ""
Write-Host "Smoke test Edge Functions — $base" -ForegroundColor Cyan
Write-Host ("-" * 60)

$ok = 0
$fail = 0

foreach ($name in $functions) {
  $url = "$base/functions/v1/$name"
  try {
    $resp = Invoke-WebRequest -Uri $url -Method Options -Headers @{
      apikey = $AnonKey
      Authorization = "Bearer $AnonKey"
    } -TimeoutSec 30 -UseBasicParsing
    $code = [int]$resp.StatusCode
    if ($code -in 200, 204) {
      Write-Host "[OK]   $name ($code)" -ForegroundColor Green
      $ok++
    } else {
      Write-Host "[??]   $name ($code)" -ForegroundColor Yellow
      $fail++
    }
  } catch {
    $code = $null
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    if ($code -eq 404) {
      Write-Host "[404]  $name — function não encontrada (não deployada?)" -ForegroundColor Red
    } elseif ($code -in 502, 503, 500) {
      Write-Host "[ERR]  $name ($code) — function quebrou ao carregar (ficheiro auxiliar em falta? ver Logs no Supabase)" -ForegroundColor Red
    } else {
      Write-Host "[FAIL] $name — $($_.Exception.Message)" -ForegroundColor Red
    }
    $fail++
  }
}

Write-Host ("-" * 60)
Write-Host "Resumo: $ok OK, $fail com problema(s)." -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "OPTIONS só confirma que a function existe e arranca." -ForegroundColor DarkGray
Write-Host "Testes reais de e-mail/sync: use Status Tecnico e o roteiro em supabase/functions/README.md (secao Testes)." -ForegroundColor DarkGray
Write-Host ""

exit $(if ($fail -eq 0) { 0 } else { 1 })
