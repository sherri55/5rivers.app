$body = @{
  email = "info@5riverstruckinginc.ca"
  password = "Demo123!"
  organizationSlug = "demo"
} | ConvertTo-Json

$resp  = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body $body
$token = $resp.token
$headers = @{ Authorization = "Bearer $token" }

$job = Invoke-RestMethod -Uri "http://localhost:4000/api/jobs/job_1752178528531_l5048qnb7" -Headers $headers
$job | ConvertTo-Json -Depth 6
