$root = $PSScriptRoot

Write-Host "Starting 5Rivers Apps..." -ForegroundColor Cyan

Write-Host "[1/3] Starting Server (port 4000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\5rivers.server'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "[2/3] Starting UI (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\5rivers.app.ui'; npm run dev" -WindowStyle Normal

Write-Host "[3/3] Starting Agent CLI..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\5rivers.app.agent'; npm run cli" -WindowStyle Normal

Write-Host ""
Write-Host "All apps started in separate windows." -ForegroundColor Green
Write-Host "  Server : http://localhost:4000" -ForegroundColor White
Write-Host "  UI     : http://localhost:5173" -ForegroundColor White
Write-Host "  Agent  : see Agent window" -ForegroundColor White
