Write-Host "Testing Java compilation..."
Set-Location $PSScriptRoot
& .\mvnw.cmd compile
Write-Host "Compilation test complete."
Read-Host "Press Enter to continue"