# Monitor lobby CDA — wrapper para Agendador de Tarefas (Telecom / Windows).
# Carrega .env.monitor-cda na mesma pasta do script ou na raiz do repositório.

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$root = Split-Path -Parent $scriptDir
Set-Location $root

$envCandidates = @(
  (Join-Path $scriptDir ".env.monitor-cda"),
  (Join-Path $root ".env.monitor-cda"),
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
Write-Host "Início lobby CDA (Brasília): $($ts.ToString('yyyy-MM-dd HH:mm:ss'))"

node (Join-Path $scriptDir "monitor-lobby-cda-run.mjs") @args
exit $LASTEXITCODE
