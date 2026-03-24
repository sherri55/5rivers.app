# Test tool calling capability
$body = @{
  model = "qwen2.5:7b"
  messages = @(@{ role = "user"; content = "What is the weather in Toronto?" })
  stream = $false
  tools = @(
    @{
      type = "function"
      function = @{
        name = "get_weather"
        description = "Get the weather for a city"
        parameters = @{
          type = "object"
          properties = @{
            city = @{ type = "string"; description = "City name" }
          }
          required = @("city")
        }
      }
    }
  )
} | ConvertTo-Json -Depth 10

Write-Host "Testing tool calling with qwen2.5:7b..."
try {
  $r = Invoke-RestMethod -Uri "http://192.168.68.63:11434/api/chat" `
    -Method POST -ContentType "application/json" -Body $body -TimeoutSec 120
  Write-Host "SUCCESS"
  Write-Host "Response: $($r | ConvertTo-Json -Depth 5)"
} catch {
  Write-Host "FAILED: $($_.Exception.Message)"
  Write-Host "Response: $($_.ErrorDetails.Message)"
}
