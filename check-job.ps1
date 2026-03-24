$body = @{
  email = "info@5riverstruckinginc.ca"
  password = "Demo123!"
  organizationSlug = "demo"
} | ConvertTo-Json

$resp = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $body
$token = $resp.token
Write-Host "Token acquired: $($token.Substring(0,30))..."

$jobId = $args[0]
$job = Invoke-RestMethod -Uri "http://localhost:4000/api/jobs/$jobId" -Headers @{ Authorization = "Bearer $token" }
$job | ConvertTo-Json -Depth 6
