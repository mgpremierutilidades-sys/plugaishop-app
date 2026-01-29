# scripts/expo-start-lan.ps1
$ErrorActionPreference = "Stop"

$env:EXPO_PUBLIC_FF_CART_PERF_V21 = "1"
$env:EXPO_PUBLIC_FF_CART_TRACKING_V21 = "1"

Write-Host "Starting Expo (LAN) with flags:"
Write-Host " - EXPO_PUBLIC_FF_CART_PERF_V21=$env:EXPO_PUBLIC_FF_CART_PERF_V21"
Write-Host " - EXPO_PUBLIC_FF_CART_TRACKING_V21=$env:EXPO_PUBLIC_FF_CART_TRACKING_V21"
Write-Host ""

npx expo start -c --lan
