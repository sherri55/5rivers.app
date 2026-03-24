$body = @{
  email = "info@5riverstruckinginc.ca"
  password = "Demo123!"
  organizationSlug = "demo"
} | ConvertTo-Json

$resp  = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $body
$token = $resp.token
$headers = @{ Authorization = "Bearer $token" }

$ids = @(
  "job_1759774511791_5zi47uhnq",
  "job_1761440773391_5arpj78bt"
)

foreach ($id in $ids) {
  try {
    $job = Invoke-RestMethod -Uri "http://localhost:4000/api/jobs/$id" -Headers $headers
    Write-Host "FOUND: $id"
    Write-Host "  date=$($job.jobDate)  startTime=$($job.startTime)  endTime=$($job.endTime)  company=$($job.companyName)  dispatcher=$($job.dispatcherName)"
  } catch {
    Write-Host "NOT IN SQL: $id"
  }
}
