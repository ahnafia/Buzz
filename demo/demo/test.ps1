try {
    Write-Host "Running ProfileFeaturesTest..." -ForegroundColor Green
    & .\mvnw.cmd test -Dtest=ProfileFeaturesTest
    Write-Host "Test completed!" -ForegroundColor Green
} catch {
    Write-Host "Error running test: $_" -ForegroundColor Red
}
Read-Host "Press Enter to exit"