$root = $PSScriptRoot

Write-Host "Stopping existing 5Rivers processes..." -ForegroundColor Red

# Kill processes on ports 4000 (server) and 5173 (UI)
foreach ($port in @(4000, 5173)) {
  $pids = netstat -ano | Select-String "LISTENING" | Select-String ":$port\s" |
    ForEach-Object { ($_ -split '\s+')[-1] } | Where-Object { $_ -match '^\d+$' } | Select-Object -Unique
  foreach ($p in $pids) {
    Write-Host "  Killing process on port $port (PID $p)..." -ForegroundColor DarkRed
    Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue
  }
}

# Kill node processes running our specific scripts
$targets = @("5rivers.server", "5rivers.app.ui", "5rivers.app.agent")
Get-WmiObject Win32_Process -Filter "name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $cmd = $_.CommandLine; $targets | Where-Object { $cmd -like "*$_*" } } |
  ForEach-Object {
    Write-Host "  Killing node process PID $($_.ProcessId)..." -ForegroundColor DarkRed
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Start-Sleep -Seconds 2
Write-Host ""
Write-Host "Starting 5Rivers Apps..." -ForegroundColor Cyan

Write-Host "[1/3] Starting Server (port 4000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = '5Rivers Server'; cd '$root\5rivers.server'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "[2/3] Starting UI (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = '5Rivers UI'; cd '$root\5rivers.app.ui'; npm run dev" -WindowStyle Normal

Write-Host "[3/3] Starting Agent CLI + Telegram Bot..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = '5Rivers Agent'; cd '$root\5rivers.app.agent'; npm run cli" -WindowStyle Normal

Write-Host ""
Write-Host "All apps started in separate windows." -ForegroundColor Green
Write-Host "  Server  : http://localhost:4000" -ForegroundColor White
Write-Host "  UI      : http://localhost:5173" -ForegroundColor White
Write-Host "  Agent   : see Agent window (Telegram bot runs inside it)" -ForegroundColor White
