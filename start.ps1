param(
  [string]$Profile = ""   # e.g. .\start.ps1 -Profile deepseek
)

$root = $PSScriptRoot

# Pass the profile to the agent process via env var (picked up by config.ts)
if ($Profile) {
  $env:AGENT_PROFILE = $Profile
  Write-Host "Agent profile: $Profile" -ForegroundColor Magenta
} else {
  Remove-Item Env:AGENT_PROFILE -ErrorAction SilentlyContinue
}

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
Write-Host "Starting 5Rivers (server + UI + agent + Telegram) in this window..." -ForegroundColor Cyan
Write-Host "  Server  : http://localhost:4000" -ForegroundColor White
Write-Host "  UI      : http://localhost:5173" -ForegroundColor White
Write-Host "  Agent   : interactive prompt (CLI + Telegram bot)" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop everything." -ForegroundColor DarkGray
Write-Host ""

Set-Location $root
npm start
