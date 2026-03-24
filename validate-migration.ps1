$body = @{
  email = "info@5riverstruckinginc.ca"
  password = "Demo123!"
  organizationSlug = "demo"
} | ConvertTo-Json

$resp  = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $body
$token = $resp.token
$h     = @{ Authorization = "Bearer $token" }

function Get-All($url) {
  $page = 1; $all = @()
  do {
    $r = Invoke-RestMethod -Uri "http://localhost:4000/api/$url&page=$page&limit=200" -Headers $h
    $data = if ($r.data) { $r.data } elseif ($r.jobs) { $r.jobs } else { @() }
    $all += $data
    $total = if ($r.total) { $r.total } else { $data.Count }
    $page++
  } while ($all.Count -lt $total -and $data.Count -gt 0)
  return $all
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  5RIVERS MIGRATION VALIDATION REPORT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ── JOBS ────────────────────────────────────────────────────────
Write-Host "[ JOBS ]" -ForegroundColor Yellow
$jobs = Get-All "jobs?sortBy=jobDate&order=desc"
Write-Host "  Total jobs: $($jobs.Count)"

$noJobType     = $jobs | Where-Object { -not $_.jobTypeId }
$noJobTypeName = $jobs | Where-Object { $_.jobTypeId -and -not $_.jobTypeTitle }
$noCompany     = $jobs | Where-Object { $_.jobTypeId -and -not $_.companyName }
$noDriver      = $jobs | Where-Object { -not $_.driverId }
$noStart       = $jobs | Where-Object { -not $_.startTime }
$noEnd         = $jobs | Where-Object { -not $_.endTime }
$noAmount      = $jobs | Where-Object { $null -eq $_.amount }
$unpaidJob     = $jobs | Where-Object { -not $_.jobPaid }
$unpaidDriver  = $jobs | Where-Object { -not $_.driverPaid }

Write-Host "  ❌ Missing jobTypeId:    $($noJobType.Count)"
Write-Host "  ❌ Missing jobTypeTitle: $($noJobTypeName.Count)"
Write-Host "  ❌ Missing companyName:  $($noCompany.Count)"
Write-Host "  ⚠️  Missing driver:      $($noDriver.Count)"
Write-Host "  ⚠️  Missing startTime:   $($noStart.Count)"
Write-Host "  ⚠️  Missing endTime:     $($noEnd.Count)"
Write-Host "  ⚠️  Missing amount:      $($noAmount.Count)"
Write-Host "  ℹ️  Job unpaid:          $($unpaidJob.Count)"
Write-Host "  ℹ️  Driver unpaid:       $($unpaidDriver.Count)"

if ($noJobType.Count -gt 0) {
  Write-Host "`n  Jobs missing jobTypeId:" -ForegroundColor Red
  $noJobType | ForEach-Object { Write-Host "    - $($_.id)  date=$($_.jobDate?.ToString('yyyy-MM-dd'))" }
}
if ($noJobTypeName.Count -gt 0) {
  Write-Host "`n  Jobs with jobTypeId but no title (broken FK):" -ForegroundColor Red
  $noJobTypeName | ForEach-Object { Write-Host "    - $($_.id)  jobTypeId=$($_.jobTypeId)" }
}
if ($noCompany.Count -gt 0) {
  Write-Host "`n  Jobs with jobType but no company (broken FK):" -ForegroundColor Red
  $noCompany | ForEach-Object { Write-Host "    - $($_.id)  jobTypeId=$($_.jobTypeId)" }
}

# ── JOB TYPES ───────────────────────────────────────────────────
Write-Host "`n[ JOB TYPES ]" -ForegroundColor Yellow
$jts = Get-All "job-types?limit=200"
Write-Host "  Total job types: $($jts.Count)"
$jtNoCompany = $jts | Where-Object { -not $_.companyId }
Write-Host "  ❌ Missing companyId: $($jtNoCompany.Count)"
if ($jtNoCompany.Count -gt 0) {
  $jtNoCompany | ForEach-Object { Write-Host "    - $($_.id)  title=$($_.title)" }
}

# ── COMPANIES ───────────────────────────────────────────────────
Write-Host "`n[ COMPANIES ]" -ForegroundColor Yellow
$companies = Get-All "companies?limit=200"
Write-Host "  Total companies: $($companies.Count)"
$companies | ForEach-Object { Write-Host "    • $($_.name)" }

# ── DRIVERS ─────────────────────────────────────────────────────
Write-Host "`n[ DRIVERS ]" -ForegroundColor Yellow
$drivers = Get-All "drivers?limit=200"
Write-Host "  Total drivers: $($drivers.Count)"

# ── DISPATCHERS ─────────────────────────────────────────────────
Write-Host "`n[ DISPATCHERS ]" -ForegroundColor Yellow
$dispatchers = Get-All "dispatchers?limit=200"
Write-Host "  Total dispatchers: $($dispatchers.Count)"
$dispatchers | ForEach-Object { Write-Host "    • $($_.name)" }

# ── UNITS ───────────────────────────────────────────────────────
Write-Host "`n[ UNITS ]" -ForegroundColor Yellow
$units = Get-All "units?limit=200"
Write-Host "  Total units: $($units.Count)"

# ── INVOICES ────────────────────────────────────────────────────
Write-Host "`n[ INVOICES ]" -ForegroundColor Yellow
$invoices = Get-All "invoices?limit=200"
Write-Host "  Total invoices: $($invoices.Count)"
$invPaid   = $invoices | Where-Object { $_.status -eq 'Received' }
$invRaised = $invoices | Where-Object { $_.status -eq 'Raised' }
$invPend   = $invoices | Where-Object { $_.status -eq 'Pending' -or -not $_.status }
Write-Host "  Received: $($invPaid.Count)  Raised: $($invRaised.Count)  Pending: $($invPend.Count)"

# ── SPECIFIC JOB CHECK ──────────────────────────────────────────
Write-Host "`n[ SPECIFIC JOB CHECK: job_1765735189232_x4kycdryo ]" -ForegroundColor Yellow
$job = Invoke-RestMethod -Uri "http://localhost:4000/api/jobs/job_1765735189232_x4kycdryo" -Headers $h
Write-Host "  jobTypeId:    $($job.jobTypeId)"
Write-Host "  jobTypeTitle: $($job.jobTypeTitle)"
Write-Host "  companyName:  $($job.companyName)"
Write-Host "  driverName:   $($job.driverName)"
Write-Host "  startTime:    $($job.startTime)"
Write-Host "  endTime:      $($job.endTime)"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  VALIDATION COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
