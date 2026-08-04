# Monitor lobby Esportiva Bet — Agendador de Tarefas (Windows / rede BR).
#
# 1) Crie .env.monitor na raiz (ou reutilize o das outras lobbies):
#      SUPABASE_URL=https://xxx.supabase.co
#      SUPABASE_SERVICE_ROLE_KEY=eyJ...
# 2) Agendador → disparar este .ps1 a cada 1 hora (America/Sao_Paulo).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$envFile = Join-Path $root ".env.monitor"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $name = $matches[1].Trim()
      $val = $matches[2].Trim().Trim('"')
      Set-Item -Path "env:$name" -Value $val
    }
  }
}

node (Join-Path $root "scripts\monitor-lobby-esportiva-run.mjs")
exit $LASTEXITCODE
