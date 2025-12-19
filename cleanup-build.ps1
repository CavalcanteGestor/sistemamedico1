# Script de limpeza para build
Write-Host "🧹 Limpando projeto..." -ForegroundColor Cyan

# Remover diretório debug
if (Test-Path "app\api\debug") {
    Write-Host "Removendo app\api\debug..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "app\api\debug"
    Write-Host "✅ app\api\debug removido" -ForegroundColor Green
}

# Remover cache do Next.js
if (Test-Path ".next") {
    Write-Host "Removendo .next..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next"
    Write-Host "✅ .next removido" -ForegroundColor Green
}

# Remover node_modules/.cache se existir
if (Test-Path "node_modules\.cache") {
    Write-Host "Removendo node_modules\.cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✅ Cache do node_modules removido" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Limpeza concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "Execute agora: npm run build" -ForegroundColor Cyan

