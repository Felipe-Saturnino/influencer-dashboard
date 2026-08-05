# Monitor lobby Jonbet — para Agendador de Tarefas do Windows (rede local, evita HTTP 451).
#
# 1) Crie .env.monitor na raiz do projeto (não versionar):
#      SUPABASE_URL=https://xxx.supabase.co
#      SUPABASE_SERVICE_ROLE_KEY=eyJ...
# 2) Agendador de Tarefas → disparar este .ps1 a cada 1 hora.

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

node (Join-Path $root "scripts\monitor-lobby-jonbet-run.mjs")
exit $LASTEXITCODE
