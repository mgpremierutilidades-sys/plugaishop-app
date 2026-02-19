param(
  [string]$ProjectRoot = (Resolve-Path ".").Path,
  [int]$LoopSeconds = 30,
  [switch]$Fast
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
Set-Location $ProjectRoot

$aiDir  = Join-Path $ProjectRoot "scripts\ai"
$outDir = Join-Path $aiDir "_out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$runtimeOut = Join-Path $outDir "gh-queue-worker.runtime.out.log"
$runtimeErr = Join-Path $outDir "gh-queue-worker.runtime.err.log"

function LogOut([string]$m){
  $ts = (Get-Date).ToString("s")
  [System.IO.File]::AppendAllText($runtimeOut, "[$ts] [GH-QUEUE] $m`n", [System.Text.Encoding]::UTF8)
}
function LogErr([string]$m){
  $ts = (Get-Date).ToString("s")
  [System.IO.File]::AppendAllText($runtimeErr, "[$ts] [GH-QUEUE] $m`n", [System.Text.Encoding]::UTF8)
}

# Avoid interactive/pager/update noise
$env:GH_PAGER = "cat"
$env:GH_NO_UPDATE_NOTIFIER = "1"
$env:GIT_TERMINAL_PROMPT = "0"

# --- Load config
$cfgPath = Join-Path $aiDir "config.json"
if (!(Test-Path $cfgPath)) { throw "config.json não encontrado: $cfgPath" }

$cfg = Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
$repo = $cfg.queue.repo
if (-not $repo) { throw "cfg.queue.repo vazio (config.json)" }

$labelQueue      = $cfg.queue.label_queue
$labelProcessing = $cfg.queue.label_processing
$labelDone       = $cfg.queue.label_done
$labelFailed     = $cfg.queue.label_failed

$pollSeconds = [int]$cfg.queue.poll_seconds
$maxPerCycle = [int]$cfg.queue.max_per_cycle
if ($Fast) { $pollSeconds = 5 }

$ghTimeoutSec = if ($Fast) { 12 } else { 20 }

# --- CRITICAL: use absolute gh.exe path (prevents alias/function recursion)
$ghExe = (Get-Command gh -ErrorAction Stop).Source

LogOut "BOOT | Repo=$repo | Poll=$pollSeconds | MaxPerCycle=$maxPerCycle | LoopSeconds=$LoopSeconds | Fast=$Fast | GhTimeoutSec=$ghTimeoutSec | GhExe=$ghExe"

function Exec-Process {
  param(
    [Parameter(Mandatory=$true)][string]$FileName,
    [Parameter(Mandatory=$true)][string[]]$Args,
    [int]$TimeoutSeconds = 20
  )

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FileName
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError  = $true
  $psi.CreateNoWindow = $true

  foreach ($a in $Args) { [void]$psi.ArgumentList.Add($a) }

  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi

  if (-not $p.Start()) { throw "failed to start: $FileName" }

  $exited = $p.WaitForExit($TimeoutSeconds * 1000)
  if (-not $exited) {
    try { $p.Kill($true) } catch {}
    throw "TIMEOUT ${TimeoutSeconds}s: $FileName $($Args -join ' ')"
  }

  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()

  return [pscustomobject]@{
    ExitCode = $p.ExitCode
    StdOut   = $stdout
    StdErr   = $stderr
  }
}

function Gh {
  param([Parameter(Mandatory=$true)][string[]]$Args)

  $res = Exec-Process -FileName $ghExe -Args $Args -TimeoutSeconds $ghTimeoutSec

  if (-not [string]::IsNullOrWhiteSpace($res.StdErr)) {
    LogErr "gh stderr (exit=$($res.ExitCode)) args=[$($Args -join ' ')] err=[$($res.StdErr.Trim())]"
  }

  if ($res.ExitCode -ne 0) {
    LogErr "gh FAILED exit=$($res.ExitCode) args=[$($Args -join ' ')] out=[$($res.StdOut.Trim())]"
    throw "gh failed exit=$($res.ExitCode)"
  }

  return $res.StdOut
}

function Ensure-JsonArray {
  param([string]$text)
  if ([string]::IsNullOrWhiteSpace($text)) { return "[]" }
  $t = $text.Trim()
  if ($t.StartsWith("[")) { return $t }

  $start = $t.IndexOf("[")
  $end   = $t.LastIndexOf("]")
  if ($start -ge 0 -and $end -gt $start) {
    return $t.Substring($start, $end - $start + 1)
  }
  return "[]"
}

$stopAt = (Get-Date).AddSeconds($LoopSeconds)

while ((Get-Date) -lt $stopAt) {
  try {
    LogOut "LIST begin"
    $raw = Gh @("issue","list","-R",$repo,"-l",$labelQueue,"-L","50","--json","number,title")
    $jsonText = Ensure-JsonArray $raw
    LogOut ("LIST ok | bytes=" + $jsonText.Length)

    $issues = $jsonText | ConvertFrom-Json
    $count = @($issues).Count
    LogOut "CYCLE | queue_count=$count"

    if ($count -le 0) {
      Start-Sleep -Seconds $pollSeconds
      continue
    }

    $picked = @($issues | Select-Object -First $maxPerCycle)
    foreach ($it in $picked) {
      $n = [int]$it.number
      $t = [string]$it.title
      LogOut "PICK | #$n | $t"

      LogOut "EDIT begin | #$n -> processing"
      Gh @("issue","edit",$n,"-R",$repo,"--remove-label",$labelQueue,"--add-label",$labelProcessing) | Out-Null
      LogOut "EDIT ok | #$n -> $labelProcessing"

      LogOut "EDIT begin | #$n -> done"
      Gh @("issue","edit",$n,"-R",$repo,"--add-label",$labelDone,"--remove-label",$labelProcessing) | Out-Null
      LogOut "EDIT ok | #$n -> $labelDone"
    }
  } catch {
    $etype = $_.Exception.GetType().FullName
    LogErr "ERROR | type=$etype | msg=$($_.Exception.Message)"
    if ($_.ScriptStackTrace) { LogErr ("STACK | " + $_.ScriptStackTrace.Replace("`r","").Replace("`n"," | ")) }
  }

  Start-Sleep -Seconds $pollSeconds
}

LogOut "EXIT | LoopSeconds elapsed"
exit 0
