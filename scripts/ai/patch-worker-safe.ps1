param([string]$WorkerPath)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (!(Test-Path $WorkerPath)) { throw "Worker not found: $WorkerPath" }

$src = Get-Content $WorkerPath -Raw -Encoding UTF8

function Find-ParamBlockEnd([string]$text) {
  # acha "param(" no começo (ignorando espaços/linhas)
  $m = [regex]::Match($text, '(?ms)^\s*param\s*\(')
  if (-not $m.Success) { return -1 }

  $i = $m.Index + $m.Length
  $depth = 1

  while ($i -lt $text.Length) {
    $ch = $text[$i]
    if ($ch -eq '(') { $depth++ }
    elseif ($ch -eq ')') {
      $depth--
      if ($depth -eq 0) { return $i } # índice do ')'
    }
    $i++
  }
  return -1
}

# 1) injeta helper depois do param(...) (sem regex frágil)
if ($src -notmatch '(?m)^\s*function\s+GetCfg\s*\{') {
  $end = Find-ParamBlockEnd $src
  if ($end -lt 0) { throw "Não consegui localizar o fim do param(...) no worker." }

  $helper = @"
function GetCfg {
  param(
    [Parameter(Mandatory=`$true)] `$Obj,
    [Parameter(Mandatory=`$true)] [string] `$Name,
    `$Default = `$null
  )
  if (`$null -eq `$Obj) { return `$Default }
  `$p = `$Obj.PSObject.Properties[`$Name]
  if (`$p) { return `$p.Value }
  return `$Default
}

"@

  $insertPos = $end + 1
  $src = $src.Substring(0, $insertPos) + "`r`n" + $helper + $src.Substring($insertPos)
}

# 2) substitui só as linhas que estão dando pau nos seus logs
$src = [regex]::Replace($src, '\$labelFailed\s*=\s*\$cfg\.queue\.label_failed',
  '$labelFailed = GetCfg $cfg.queue "label_failed" (GetCfg $cfg.queue "label_fail" "ai:failed")')

$src = [regex]::Replace($src, '\$branchPrefix\s*=\s*\$cfg\.git\.branch_prefix',
  '$branchPrefix = GetCfg $cfg.git "branch_prefix" "ai/issue-"')

$src = [regex]::Replace($src, '\$commitPrefix\s*=\s*\$cfg\.git\.commit_prefix',
  '$commitPrefix = GetCfg $cfg.git "commit_prefix" "ai:"')

$src = [regex]::Replace($src, '\$baseBranch\s*=\s*\$cfg\.git\.pr_base_branch',
  '$baseBranch = GetCfg $cfg.git "pr_base_branch" (GetCfg $cfg.git "base_branch" "develop")')

Set-Content -Path $WorkerPath -Value $src -Encoding UTF8
Write-Host "[patch-worker-safe] OK"
