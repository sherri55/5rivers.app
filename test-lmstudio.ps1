$body = @{
  model = "nvidia/nemotron-3-nano-4b"
  messages = @(@{ role = "user"; content = "hello" })
  stream = $false
  tools = @(@{
    type = "function"
    function = @{
      name = "test_tool"
      description = "A test tool"
      parameters = @{ type = "object"; properties = @{} }
    }
  })
} | ConvertTo-Json -Depth 10

Write-Host "Testing LM Studio tool calling..."
try {
  $r = Invoke-RestMethod -Uri "http://localhost:1234/v1/chat/completions" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 60
  Write-Host "SUCCESS"
  $r | ConvertTo-Json -Depth 5
} catch {
  Write-Host "FAILED: $($_.Exception.Message)"
  Write-Host "Body: $($_.ErrorDetails.Message)"
}
