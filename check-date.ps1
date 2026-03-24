$body = @{ email = "info@5riverstruckinginc.ca"; password = "Demo123!"; organizationSlug = "demo" } | ConvertTo-Json
$token = (Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $body).token
$headers = @{ Authorization = "Bearer $token" }

$raw = Invoke-RestMethod -Uri "http://localhost:4000/api/jobs?filter_dateFrom=2025-10-03&filter_dateTo=2025-10-03&limit=50" -Headers $headers
Write-Host "=== Response keys ==="
$raw | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name
Write-Host ""
Write-Host "=== Full response ==="
$raw | ConvertTo-Json -Depth 4
