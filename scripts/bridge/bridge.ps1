# PowerShell client for Plugaishop Local Bridge (corrigido)

param(
  [string]$BaseUrl = "http://127.0.0.1:8732",
  [string]$Token = $env:PLUGAISHOP_BRIDGE_TOKEN
)

function Invoke-BridgePost {
  param(
    [string]$Path,
    [object]$Body
  )
  if (-not $Token) { throw "Missing token. Set env PLUGAISHOP_BRIDGE_TOKEN." }
  $uri = "$BaseUrl$Path"
  $json = ($Body | ConvertTo-Json -Depth 30)
  return Invoke-RestMethod -Method Post -Uri $uri -Headers @{ "X-Bridge-Token" = $Token } -ContentType "application/json" -Body $json
}

function Bridge-Tree {
  param([string]$Path=".", [int]$MaxEntries=2000)
  Invoke-BridgePost -Path "/repo/tree" -Body @{ path=$Path; maxEntries=$MaxEntries } | ConvertTo-Json -Depth 10
}

function Bridge-Cat {
  param([string]$Path, [int]$MaxBytes=200000)
  Invoke-BridgePost -Path "/repo/read" -Body @{ path=$Path; maxBytes=$MaxBytes } | ConvertTo-Json -Depth 10
}

function Bridge-Search {
  param([string]$Query, [int]$MaxHits=50)
  Invoke-BridgePost -Path "/repo/search" -Body @{ query=$Query; maxHits=$MaxHits } | ConvertTo-Json -Depth 10
}

function Bridge-GitStatus {
  Invoke-BridgePost -Path "/git/status" -Body @{} | ConvertTo-Json -Depth 10
}

function Bridge-GitDiff {
  param([switch]$Staged, [string[]]$Paths=@())
  $body = @{ staged=[bool]$Staged; paths=$Paths }
  Invoke-BridgePost -Path "/git/diff" -Body $body | ConvertTo-Json -Depth 10
}

function Bridge-ApplyPlan {
  param([string]$PlanPath, [switch]$DryRun=$true)
  $plan = Get-Content -Raw -Path $PlanPath | ConvertFrom-Json
  $plan | Add-Member -NotePropertyName "dryRun" -NotePropertyValue ([bool]$DryRun) -Force
  Invoke-BridgePost -Path "/plan/apply" -Body $plan | ConvertTo-Json -Depth 30
}

function Bridge-ValidatePatch {
  param([string]$PatchPath)
  $patchText = Get-Content -Raw -Path $PatchPath
  Invoke-BridgePost -Path "/patch/validate" -Body @{ patch=$patchText } | ConvertTo-Json -Depth 30
}

function Bridge-ApplyPatch {
  param([string]$PatchPath, [switch]$DryRun=$true, [switch]$Force=$false)
  $patchText = Get-Content -Raw -Path $PatchPath
  Invoke-BridgePost -Path "/patch/apply" -Body @{ patch=$patchText; dryRun=[bool]$DryRun; force=[bool]$Force } | ConvertTo-Json -Depth 30
}

function Bridge-RevertPatch {
  param([string]$PatchPath, [switch]$DryRun=$true, [switch]$Force=$false)
  $patchText = Get-Content -Raw -Path $PatchPath
  Invoke-BridgePost -Path "/patch/revert" -Body @{ patch=$patchText; dryRun=[bool]$DryRun; force=[bool]$Force } | ConvertTo-Json -Depth 30
}

function Bridge-Bundle {
  param(
    [string]$OutPath = "_share\bridge-context.txt"
  )

  $tree = (Invoke-BridgePost -Path "/repo/tree" -Body @{ path="."; maxEntries=4000 }).entries
  New-Item -ItemType Directory -Force -Path (Split-Path $OutPath) | Out-Null

  $sb = New-Object System.Text.StringBuilder
  $null = $sb.AppendLine("PLUGAISHOP BRIDGE CONTEXT")
  $null = $sb.AppendLine("GeneratedAt: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
  $null = $sb.AppendLine("")
  $null = $sb.AppendLine("=== TREE (filtered/allowlisted) ===")
  foreach ($p in $tree) { $null = $sb.AppendLine($p) }

  $keyFiles = @("package.json","tsconfig.json","README.md","app/_layout.tsx","app/index.tsx")
  $null = $sb.AppendLine("")
  $null = $sb.AppendLine("=== KEY FILES ===")
  foreach ($kf in $keyFiles) {
    try {
      $r = Invoke-BridgePost -Path "/repo/read" -Body @{ path=$kf; maxBytes=200000 }
      if ($r.ok) {
        $null = $sb.AppendLine("")
        $null = $sb.AppendLine("PATH: $($r.path)")
        $null = $sb.AppendLine('```')
        $null = $sb.AppendLine($r.content)
        $null = $sb.AppendLine('```')
      }
    } catch {
      # ignore
    }
  }

  [IO.File]::WriteAllText($OutPath, $sb.ToString(), [Text.Encoding]::UTF8)
  Write-Host "OK: $OutPath"
}

# Command router
$cmd = $args[0]
switch ($cmd) {
  "tree" {
    if ($args.Count -ge 2) { Bridge-Tree -Path $args[1] } else { Bridge-Tree -Path "." }
  }
  "cat" {
    if ($args.Count -ge 2) { Bridge-Cat -Path $args[1] } else { Write-Host "Usage: bridge.ps1 cat <path>" }
  }
  "search" {
    if ($args.Count -ge 2) { Bridge-Search -Query $args[1] } else { Write-Host "Usage: bridge.ps1 search <query>" }
  }
  "git-status" { Bridge-GitStatus }
  "git-diff" { Bridge-GitDiff }
  "bundle" { Bridge-Bundle }
  "apply-plan" {
    if ($args.Count -ge 2) {
      $planPath = $args[1]
      $dry = $true
      if ($args -contains "--write") { $dry = $false }
      Bridge-ApplyPlan -PlanPath $planPath -DryRun:$dry
    } else {
      Write-Host "Usage: bridge.ps1 apply-plan <plan.json> [--write]"
    }
  }
  "validate-patch" {
    if ($args.Count -ge 2) {
      Bridge-ValidatePatch -PatchPath $args[1]
    } else {
      Write-Host "Usage: bridge.ps1 validate-patch <patch.diff>"
    }
  }
  "apply-patch" {
    if ($args.Count -ge 2) {
      $patchPath = $args[1]
      $dry = $true
      $force = $false
      if ($args -contains "--write") { $dry = $false }
      if ($args -contains "--force") { $force = $true }
      Bridge-ApplyPatch -PatchPath $patchPath -DryRun:$dry -Force:$force
    } else {
      Write-Host "Usage: bridge.ps1 apply-patch <patch.diff> [--write] [--force]"
    }
  }
  "revert-patch" {
    if ($args.Count -ge 2) {
      $patchPath = $args[1]
      $dry = $true
      $force = $false
      if ($args -contains "--write") { $dry = $false }
      if ($args -contains "--force") { $force = $true }
      Bridge-RevertPatch -PatchPath $patchPath -DryRun:$dry -Force:$force
    } else {
      Write-Host "Usage: bridge.ps1 revert-patch <patch.diff> [--write] [--force]"
    }
  }
  default {
    Write-Host "Usage:"
    Write-Host "  .\\scripts\\bridge\\bridge.ps1 tree [path]"
    Write-Host "  .\\scripts\\bridge\\bridge.ps1 cat <path>"
    Write-Host "  .\\scripts\\bridge\\bridge.ps1 search <query>"
    Write-Host "  .\\scripts\\bridge\\bridge.ps1 git-status"
    Write-Host "  .\\scripts\\bridge\\bridge.ps1 git-diff"
    Write-Host "  .\\scripts\\bridge\\bridge.ps1 bundle"
    Write-Host "  .\\scripts\\bridge\\bridge.ps1 apply-plan <plan.json>                (dry-run)"
    Write-Host "  .\\scripts\\bridge\\bridge.ps1 apply-plan <plan.json> --write        (writes)"
    Write-Host "  .\\scripts\\bridge\\bridge.ps1 validate-patch <patch.diff>"
    Write-Host "  .\\scripts\\bridge\\bridge.ps1 apply-patch <patch.diff>              (dry-run)"
    Write-Host "  .\\scripts\\bridge\\bridge.ps1 apply-patch <patch.diff> --write      (writes)"
    Write-Host "  .\\scripts\\bridge\\bridge.ps1 revert-patch <patch.diff>             (dry-run)"
    Write-Host "  .\\scripts\\bridge\\bridge.ps1 revert-patch <patch.diff> --write     (reverts)"
    Write-Host "Options:"
    Write-Host "  --force  (bypass clean worktree guardrail; use carefully)"
  }
}