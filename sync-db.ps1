# Sincronizador de Banco para IA
Write-Host "--- Iniciando Sincronizacao ---" -ForegroundColor Cyan

# Procura por .env.local ou .env
$envPath = ""
if (Test-Path "apps/web/.env.local") {
    $envPath = "apps/web/.env.local"
} elseif (Test-Path "apps/web/.env") {
    $envPath = "apps/web/.env"
} else {
    Write-Host "❌ Nem .env.local nem .env encontrados em apps/web/" -ForegroundColor Red
    exit 1
}

# Carrega variáveis do arquivo
Write-Host "Carregando variáveis de $envPath..." -ForegroundColor Yellow
Get-Content $envPath | ForEach-Object {
    if ($_ -notmatch '^#' -and $_ -match '^(.+)=(.+)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}

# 1. Gera os tipos do TypeScript
Write-Host "1. Lendo estrutura do banco no Docker..." -ForegroundColor Yellow
$types = npx supabase gen types typescript --local
[System.IO.File]::WriteAllText("$PSScriptRoot/packages/supabase/src/database.types.ts", ($types -join "`n"), [System.Text.UTF8Encoding]::new($false))

# 2. Valida os tipos gerados
Write-Host "2. Validando tipos TypeScript..." -ForegroundColor Yellow
pnpm check-types --filter "@repo/supabase" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: check-types falhou apos sync. Verificar manualmente." -ForegroundColor DarkYellow
} else {
    Write-Host "   TypeScript: OK" -ForegroundColor DarkGreen
}

Write-Host "OK: Sincronizacao Concluida!" -ForegroundColor Green
Write-Host "Dica: Use #database.types.ts como contexto no Windsurf/Cursor." -ForegroundColor DarkCyan

