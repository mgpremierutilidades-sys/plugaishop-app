# scripts/expo-start-tunnel.ps1
$ErrorActionPreference = "Stop"

$env:EXPO_PUBLIC_FF_CART_PERF_V21 = "1"
$env:EXPO_PUBLIC_FF_CART_TRACKING_V21 = "1"

Write-Host "Starting Expo (tunnel) with flags:"
Write-Host " - EXPO_PUBLIC_FF_CART_PERF_V21=$env:EXPO_PUBLIC_FF_CART_PERF_V21"
Write-Host " - EXPO_PUBLIC_FF_CART_TRACKING_V21=$env:EXPO_PUBLIC_FF_CART_TRACKING_V21"
Write-Host ""

npx expo start -c --tunnel
