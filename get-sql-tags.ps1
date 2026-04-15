$resp = Invoke-RestMethod "https://mcr.microsoft.com/v2/mssql/server/tags/list"
Write-Host "Total tags: $($resp.tags.Count)"
$resp.tags | Select-Object -First 30 | ForEach-Object { Write-Host $_ }
