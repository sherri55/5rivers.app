$body = @{
  model = "qwen2.5:7b"
  messages = @(@{ role = "user"; content = "say hi" })
  stream = $false
} | ConvertTo-Json -Depth 5

Write-Host "Testing /api/chat..."
try {
  $r = Invoke-RestMethod -Uri "http://192.168.68.63:11434/api/chat" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 120
  Write-Host "SUCCESS: $($r.message.content)"
} catch {
  Write-Host "FAILED /api/chat: $_"
}

Write-Host ""
Write-Host "Testing /api/generate..."
$body2 = @{
  model = "qwen2.5:7b"
  prompt = "say hi"
  stream = $false
} | ConvertTo-Json

try {
  $r2 = Invoke-RestMethod -Uri "http://192.168.68.63:11434/api/generate" -Method POST -ContentType "application/json" -Body $body2 -TimeoutSec 120
  Write-Host "SUCCESS: $($r2.response)"
} catch {
  Write-Host "FAILED /api/generate: $_"
}
