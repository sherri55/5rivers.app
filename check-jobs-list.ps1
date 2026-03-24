$body = @{
  email = "info@5riverstruckinginc.ca"
  password = "Demo123!"
  organizationSlug = "demo"
} | ConvertTo-Json

$resp  = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $body
$token = $resp.token
$headers = @{ Authorization = "Bearer $token" }

$jobs = Invoke-RestMethod -Uri "http://localhost:4000/api/jobs?limit=5&sortBy=jobDate&order=desc" -Headers $headers

Write-Host "Response keys: $($jobs | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name)"
Write-Host "Total: $($jobs.total)"
Write-Host ""
$jobs | ConvertTo-Json -Depth 3 | Select-String "startTime|endTime|jobDate|companyName" | Select-Object -First 20
