# Carga SM sinais (Grafana → ClickHouse → Supabase) — wrapper Windows.
# Usa o mesmo .env.gp-kpi (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
#
# Exemplos:
#   .\scripts\run-sm-sinais-grafana.ps1 --arquivo=tmp/sm-sinais-2026-07-01-08-06.json --dry-run
#   .\scripts\run-sm-sinais-grafana.ps1 --arquivo=tmp/sm-sinais-2026-07-01-08-06.json

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$root = Split-Path -Parent $scriptDir
Set-Location $root

$envCandidates = @(
  (Join-Path $scriptDir ".env.gp-kpi"),
  (Join-Path $root ".env.gp-kpi")
)
foreach ($envFile in $envCandidates) {
  if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
      if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $val = $matches[2].Trim().Trim('"')
        Set-Item -Path "env:$name" -Value $val
      }
    }
    break
  }
}

$ts = [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId(
  (Get-Date),
  "E. South America Standard Time"
)
Write-Host "Início carga SM sinais (Brasília): $($ts.ToString('yyyy-MM-dd HH:mm:ss'))"

node (Join-Path $scriptDir "grafana-sm-sinais-run.mjs") @args
exit $LASTEXITCODE
