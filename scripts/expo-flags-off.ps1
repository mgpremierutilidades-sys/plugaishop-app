# scripts/expo-flags-off.ps1
$ErrorActionPreference = "Stop"

Remove-Item Env:EXPO_PUBLIC_FF_CART_PERF_V21 -ErrorAction SilentlyContinue
Remove-Item Env:EXPO_PUBLIC_FF_CART_TRACKING_V21 -ErrorAction SilentlyContinue

Write-Host "Feature flags cleared:"
Write-Host " - EXPO_PUBLIC_FF_CART_PERF_V21 removed"
Write-Host " - EXPO_PUBLIC_FF_CART_TRACKING_V21 removed"
Write-Host ""

npx expo start -c --tunnel
