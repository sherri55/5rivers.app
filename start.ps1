$root = $PSScriptRoot

Write-Host "Stopping existing 5Rivers processes..." -ForegroundColor Red

# Kill processes on ports 4000 (server) and 5173 (UI)
foreach ($port in @(4000, 5173)) {
  $result = netstat -ano | Select-String ":$port\s"
  if ($result) {
    $pid = ($result -split '\s+')[-1]
    if ($pid -match '^\d+$') {
      Write-Host "  Killing process on port $port (PID $pid)..." -ForegroundColor DarkRed
      Stop-Process -Id ([int]$pid) -Force -ErrorAction SilentlyContinue
    }
  }
}

# Close any powershell windows titled "5Rivers *"
Get-Process -Name "powershell","powershell_ise" -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowTitle -match "^5Rivers" } |
  ForEach-Object {
    Write-Host "  Closing window: $($_.MainWindowTitle)" -ForegroundColor DarkRed
    $_.CloseMainWindow() | Out-Null
  }

Start-Sleep -Seconds 2
Write-Host ""
Write-Host "Starting 5Rivers Apps..." -ForegroundColor Cyan

Write-Host "[1/3] Starting Server (port 4000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = '5Rivers Server'; cd '$root\5rivers.server'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "[2/3] Starting UI (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = '5Rivers UI'; cd '$root\5rivers.app.ui'; npm run dev" -WindowStyle Normal

Write-Host "[3/3] Starting Agent CLI..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = '5Rivers Agent'; cd '$root\5rivers.app.agent'; npm run cli" -WindowStyle Normal

Write-Host ""
Write-Host "All apps started in separate windows." -ForegroundColor Green
Write-Host "  Server : http://localhost:4000" -ForegroundColor White
Write-Host "  UI     : http://localhost:5173" -ForegroundColor White
Write-Host "  Agent  : see Agent window" -ForegroundColor White
