# Carga GP KPI (Grafana → ClickHouse → Supabase) — wrapper Windows.
# Carrega .env.gp-kpi na pasta do script ou na raiz do repositório.
#
# Exemplos:
#   .\scripts\run-gp-kpi-grafana.ps1 --de=2026-07-01 --ate=2026-07-30 --dry-run
#   .\scripts\run-gp-kpi-grafana.ps1 --de=2026-07-01 --ate=2026-07-30

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
Write-Host "Início carga GP KPI (Brasília): $($ts.ToString('yyyy-MM-dd HH:mm:ss'))"

node (Join-Path $scriptDir "grafana-gp-kpi-run.mjs") @args
exit $LASTEXITCODE
