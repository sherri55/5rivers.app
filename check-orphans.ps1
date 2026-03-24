$body = @{
  email = "info@5riverstruckinginc.ca"
  password = "Demo123!"
  organizationSlug = "demo"
} | ConvertTo-Json

$resp  = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $body
$token = $resp.token
$headers = @{ Authorization = "Bearer $token" }

# Get all jobtypes to check which ones have missing companyId
$jobtypes = Invoke-RestMethod -Uri "http://localhost:4000/api/job-types?limit=200" -Headers $headers
Write-Host "=== JOB TYPES ==="
Write-Host "Total: $($jobtypes.total)"
$missing = $jobtypes.data | Where-Object { -not $_.companyId }
Write-Host "Missing companyId: $($missing.Count)"
$missing | ForEach-Object { Write-Host "  - $($_.id)  title: $($_.title)" }

# Get jobs with no jobTypeId (first page)
$jobs = Invoke-RestMethod -Uri "http://localhost:4000/api/jobs?limit=200" -Headers $headers
Write-Host ""
Write-Host "=== JOBS ==="
Write-Host "Total jobs: $($jobs.total)"
$noType = $jobs.jobs | Where-Object { -not $_.jobTypeId }
Write-Host "Jobs with no jobTypeId: $($noType.Count)"
$noType | ForEach-Object { Write-Host "  - $($_.id)  date: $($_.jobDate)" }
