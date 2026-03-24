$body = @{ email = "info@5riverstruckinginc.ca"; password = "Demo123!"; organizationSlug = "demo" } | ConvertTo-Json
$token = (Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $body).token
$headers = @{ Authorization = "Bearer $token" }

# Check how many jobs have null startTime or endTime
$jobs = Invoke-RestMethod -Uri "http://localhost:4000/api/jobs?limit=200" -Headers $headers
$all = $jobs.data
$noStart = $all | Where-Object { -not $_.startTime }
$noEnd   = $all | Where-Object { -not $_.endTime }

Write-Host "=== Jobs missing startTime: $($noStart.Count) ==="
$noStart | ForEach-Object {
  Write-Host "  $($_.id) | $(([datetime]$_.jobDate).ToString('yyyy-MM-dd')) | $($_.companyName) | $($_.driverName)"
}

Write-Host ""
Write-Host "=== Jobs missing endTime: $($noEnd.Count) ==="
$noEnd | ForEach-Object {
  Write-Host "  $($_.id) | $(([datetime]$_.jobDate).ToString('yyyy-MM-dd')) | $($_.companyName) | $($_.driverName)"
}
