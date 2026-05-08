# -----------------------------------------------------------------------------
# backup-db.ps1 - SQL Server database backup, source-control friendly.
#
# Scripts the 5Rivers SQL Server database (schema + data) to a single .sql
# file under database/backups/. Plain text so git diffs are reviewable.
#
# Outputs:
#   database/backups/5rivers-YYYYMMDD-HHMMSS.sql   (timestamped snapshot)
#   database/backups/latest.sql                    (always the newest copy)
#
# Usage:
#   .\backup-db.ps1                  # default: schema + data
#   .\backup-db.ps1 -SchemaOnly      # schema only, no INSERTs (small file)
#   .\backup-db.ps1 -NoTimestamp     # overwrite latest.sql only, no archive
#   .\backup-db.ps1 -Commit          # auto-`git add` + commit the new files
#
# Reads the connection string from 5rivers.server\.env (DATABASE_URL=...).
# -----------------------------------------------------------------------------

[CmdletBinding()]
param(
  [switch]$SchemaOnly,
  [switch]$NoTimestamp,
  [switch]$Commit
)

$ErrorActionPreference = 'Stop'
$root      = $PSScriptRoot
$envFile   = Join-Path $root '5rivers.server\.env'
$backupDir = Join-Path $root 'database\backups'

# -- 1. Parse DATABASE_URL ----------------------------------------------------
if (-not (Test-Path $envFile)) {
  throw "Cannot find $envFile - adjust the path or run from the repo root."
}

$dbUrl = (Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1) -replace '^DATABASE_URL=', ''
if (-not $dbUrl) { throw "DATABASE_URL not found in $envFile" }

# Quick parser for "Server=...;Database=...;User Id=...;Password=...;..."
$conn = @{}
foreach ($pair in $dbUrl -split ';') {
  if ($pair -match '^\s*([^=]+?)\s*=\s*(.*)\s*$') {
    $conn[$matches[1].Trim().ToLower()] = $matches[2].Trim()
  }
}

$server   = $conn['server']
$database = $conn['database']
$user     = $conn['user id']
$password = $conn['password']

if (-not ($server -and $database)) {
  throw "Could not parse Server/Database from DATABASE_URL."
}

Write-Host "Server  : $server"        -ForegroundColor DarkGray
Write-Host "Database: $database"      -ForegroundColor DarkGray
Write-Host "Mode    : $(if ($SchemaOnly) { 'schema only' } else { 'schema + data' })" -ForegroundColor DarkGray

# -- 2. Ensure SqlServer module + SMO -----------------------------------------
if (-not (Get-Module -ListAvailable -Name SqlServer)) {
  Write-Host "Installing SqlServer PowerShell module (one-time)..." -ForegroundColor Yellow
  Install-Module -Name SqlServer -Scope CurrentUser -AllowClobber -Force
}
Import-Module SqlServer -DisableNameChecking | Out-Null

# -- 3. Connect ---------------------------------------------------------------
$srvConn = New-Object Microsoft.SqlServer.Management.Common.ServerConnection
$srvConn.ServerInstance = $server
if ($user -and $password) {
  $srvConn.LoginSecure = $false
  $srvConn.Login       = $user
  $srvConn.Password    = $password
} else {
  $srvConn.LoginSecure = $true
}
# Mirror the .env's TrustServerCertificate=true
$srvConn.TrustServerCertificate = $true

$srv = New-Object Microsoft.SqlServer.Management.Smo.Server($srvConn)
$db  = $srv.Databases[$database]
if (-not $db) { throw "Database '$database' not found on '$server'." }

# -- 4. Configure scripter ----------------------------------------------------
$scripter = New-Object Microsoft.SqlServer.Management.Smo.Scripter($srv)
$opt = $scripter.Options
$opt.ScriptSchema           = $true
$opt.ScriptData             = -not $SchemaOnly
$opt.ScriptDrops            = $false
$opt.IncludeIfNotExists     = $true
$opt.WithDependencies       = $true
$opt.Indexes                = $true
$opt.Triggers               = $true
$opt.ClusteredIndexes       = $true
$opt.NonClusteredIndexes    = $true
$opt.DriAll                 = $true       # foreign keys, primary keys, defaults, checks
$opt.ExtendedProperties     = $true
$opt.AnsiPadding            = $false
$opt.Encoding               = [System.Text.Encoding]::UTF8
$opt.ToFileOnly             = $true
$opt.AppendToFile           = $false
$opt.IncludeHeaders         = $true
$opt.NoCommandTerminator    = $false
$opt.ScriptBatchTerminator  = $true

# -- 5. Output paths ----------------------------------------------------------
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$archiveFile = Join-Path $backupDir "$database-$timestamp.sql"
$latestFile  = Join-Path $backupDir 'latest.sql'

$outFile = if ($NoTimestamp) { $latestFile } else { $archiveFile }
$opt.FileName = $outFile

# -- 6. Collect objects to script (tables + views + sprocs + functions) -------
$objects = @()
$objects += $db.Tables           | Where-Object { -not $_.IsSystemObject }
$objects += $db.Views            | Where-Object { -not $_.IsSystemObject }
$objects += $db.StoredProcedures | Where-Object { -not $_.IsSystemObject }
$objects += $db.UserDefinedFunctions | Where-Object { -not $_.IsSystemObject }

Write-Host "Scripting $($objects.Count) object(s) -> $outFile" -ForegroundColor Cyan

# -- 7. Run the scripter ------------------------------------------------------
$urns = $objects | ForEach-Object { $_.Urn }
$scripter.EnumScript($urns) | Out-Null

# -- 8. Copy archive -> latest.sql so we always have a stable diff anchor -----
if (-not $NoTimestamp) {
  Copy-Item -Path $archiveFile -Destination $latestFile -Force
}

$size = [math]::Round((Get-Item $outFile).Length / 1KB, 1)
Write-Host "Backup complete - $size KB" -ForegroundColor Green
Write-Host "   $outFile" -ForegroundColor White
if (-not $NoTimestamp) {
  Write-Host "   $latestFile (copy of latest)" -ForegroundColor White
}

# -- 9. Optional: commit to git -----------------------------------------------
if ($Commit) {
  Push-Location $root
  try {
    git add database/backups/ | Out-Null
    $msg = "db: backup snapshot $timestamp"
    git commit -m $msg
    Write-Host "Committed: $msg" -ForegroundColor Green
  } catch {
    Write-Warning "Commit failed: $_"
  } finally {
    Pop-Location
  }
}
