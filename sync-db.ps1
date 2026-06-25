# Sincronizador de Banco — Workflow Cloud (Produção)
Write-Host "--- Iniciando Sincronizacao Cloud ---" -ForegroundColor Cyan

$ProjectRef = "knetdzogemmoheqtittl"
$TypesFile = "$PSScriptRoot/packages/supabase/src/database.types.ts"

# 1. Gera os tipos do TypeScript a partir do banco remoto
Write-Host "1. Gerando types do Supabase Cloud ($ProjectRef)..." -ForegroundColor Yellow
$types = npx supabase gen types typescript --project-id $ProjectRef --schema public 2>$null
if ($LASTEXITCODE -ne 0 -or -not $types) {
    Write-Host "❌ Falha ao gerar types. Verifique se o projeto está linkado: npx supabase link --project-ref $ProjectRef" -ForegroundColor Red
    exit 1
}

[System.IO.File]::WriteAllText($TypesFile, ($types -join "`n"), [System.Text.UTF8Encoding]::new($false))
Write-Host "   Types salvos em: $TypesFile" -ForegroundColor DarkGreen

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

