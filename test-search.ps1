$body = @{
  email = "info@5riverstruckinginc.ca"
  password = "Demo123!"
  organizationSlug = "demo"
} | ConvertTo-Json

$resp  = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $body
$token = $resp.token
$headers = @{ Authorization = "Bearer $token" }

# Test 1: Search for Wroom on Oct 3 using filter_search + filter_jobDate
Write-Host "=== Test 1: filter_search=Wroom + filter_jobDate=2025-10-03 ==="
$r1 = Invoke-RestMethod -Uri "http://localhost:4000/api/jobs?filter_search=Wroom&filter_jobDate=2025-10-03&limit=10" -Headers $headers
Write-Host "Total: $($r1.total)"
$r1.data | ForEach-Object { Write-Host "  $($_.id)  date=$($_.jobDate.Substring(0,10))  company=$($_.companyName)  dispatcher=$($_.dispatcherName)" }

# Test 2: Search for Wroom on Oct 3 using dateFrom/dateTo
Write-Host ""
Write-Host "=== Test 2: filter_search=Wroom + filter_dateFrom=2025-10-03 + filter_dateTo=2025-10-03 ==="
$r2 = Invoke-RestMethod -Uri "http://localhost:4000/api/jobs?filter_search=Wroom&filter_dateFrom=2025-10-03&filter_dateTo=2025-10-03&limit=10" -Headers $headers
Write-Host "Total: $($r2.total)"
$r2.data | ForEach-Object { Write-Host "  $($_.id)  date=$($_.jobDate.Substring(0,10))  company=$($_.companyName)  dispatcher=$($_.dispatcherName)" }

# Test 3: Just Oct 3 without search
Write-Host ""
Write-Host "=== Test 3: filter_dateFrom=2025-10-03 + filter_dateTo=2025-10-03 (no search) ==="
$r3 = Invoke-RestMethod -Uri "http://localhost:4000/api/jobs?filter_dateFrom=2025-10-03&filter_dateTo=2025-10-03&limit=10" -Headers $headers
Write-Host "Total: $($r3.total)"
$r3.data | ForEach-Object { Write-Host "  $($_.id)  date=$($_.jobDate.Substring(0,10))  company=$($_.companyName)  dispatcher=$($_.dispatcherName)" }

# Test 4: Just filter_jobDate=2025-10-03 (the LIKE approach)
Write-Host ""
Write-Host "=== Test 4: filter_jobDate=2025-10-03 (LIKE approach) ==="
$r4 = Invoke-RestMethod -Uri "http://localhost:4000/api/jobs?filter_jobDate=2025-10-03&limit=10" -Headers $headers
Write-Host "Total: $($r4.total)"
$r4.data | ForEach-Object { Write-Host "  $($_.id)  date=$($_.jobDate.Substring(0,10))  company=$($_.companyName)  dispatcher=$($_.dispatcherName)" }
