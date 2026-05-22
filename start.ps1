param(
  # -Mode  : local | web   (default: local)
  # -Model : which model to use when Mode is web
  #          web → deepseek (default) | deepseek-r | gemini | gemini-pro | google | groq
  #          "google" is an alias for "gemini".
  [ValidateSet("local","web","")]
  [string]$Mode  = "",
  [ValidateSet("","deepseek","deepseek-r","gemini","gemini-pro","google","groq")]
  [string]$Model = ""
)

$root = $PSScriptRoot

# ── Map common aliases to canonical profile names ────────────────────────────
# "google" is the natural shorthand users will type for Gemini.
$modelAliases = @{
  "google" = "gemini"
}
$canonicalModel = if ($Model -and $modelAliases.ContainsKey($Model.ToLower())) {
  $modelAliases[$Model.ToLower()]
} else {
  $Model
}

# ── Resolve Mode + Model → profile name ──────────────────────────────────────
$resolvedProfile = ""
switch ($Mode.ToLower()) {
  "local" { $resolvedProfile = "local" }
  "web"   { $resolvedProfile = if ($canonicalModel) { $canonicalModel } else { "deepseek" } }
  default { $resolvedProfile = "" }   # no override — use default in agent.profiles.json
}

if ($resolvedProfile) {
  $env:AGENT_PROFILE = $resolvedProfile
  $modeLabel = if ($Mode) { $Mode } else { "default" }
  $modelLabel = if ($Model) { " / $Model" } else { "" }
  Write-Host "  Agent:   mode=$modeLabel$modelLabel  (profile: $resolvedProfile)" -ForegroundColor Magenta
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
$agentMode = if ($resolvedProfile) { "$resolvedProfile profile" } else { "default profile" }
Write-Host "  Agent   : CLI + Telegram  ($agentMode)" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop everything." -ForegroundColor DarkGray
Write-Host ""

Set-Location $root
npm start
