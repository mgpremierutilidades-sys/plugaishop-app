param(
  [Parameter(Mandatory=$true)]
  [string]$ExternalRepoPath,   # Ex: E:\plugaishop-app

  [Parameter(Mandatory=$true)]
  [string]$TargetRepoPath      # Ex: C:\plugaishop-app
)

$ErrorActionPreference = "Stop"

function Assert-Command([string]$cmd) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    throw "Comando '$cmd' não encontrado. Instale/configure antes (Git)."
  }
}

function Assert-IsGitRepo([string]$path) {
  if (-not (Test-Path $path)) { throw "Pasta não existe: $path" }
  if (-not (Test-Path (Join-Path $path ".git"))) { throw "Não encontrei .git em: $path" }
}

function Run-Git([string]$repoPath, [string[]]$gitArgs) {
  Push-Location $repoPath
  try {
    & git @gitArgs | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "Falha: git $($gitArgs -join ' ')"
    }
  } finally {
    Pop-Location
  }
}

function Get-Git([string]$repoPath, [string[]]$gitArgs) {
  Push-Location $repoPath
  try {
    $out = & git @gitArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw "Falha: git $($gitArgs -join ' ')`n$out"
    }
    return $out
  } finally {
    Pop-Location
  }
}

function Timestamp() { (Get-Date).ToString("yyyyMMdd-HHmmss") }

Assert-Command "git"
Assert-IsGitRepo $ExternalRepoPath
Assert-IsGitRepo $TargetRepoPath

Write-Host "==> Repo SSD:     $ExternalRepoPath"
Write-Host "==> Repo Notebook:$TargetRepoPath"

# A) Se SSD tem alterações locais, stasha (inclui untracked)
$extStatus = (Get-Git $ExternalRepoPath @("status","--porcelain")).Trim()
if ($extStatus.Length -gt 0) {
  $stashName = "auto-stash-import-" + (Timestamp)
  Write-Host "==> SSD com alterações locais. Criando stash: $stashName"
  Run-Git $ExternalRepoPath @("stash","push","-u","-m",$stashName) | Out-Null
} else {
  Write-Host "==> SSD limpo (sem alterações locais)."
}

# B) Cria bundle com tudo (branches/tags + stash se existir)
$tmp = Join-Path $env:TEMP "plugaishop-transfer"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$bundle = Join-Path $tmp ("plugaishop-" + (Timestamp) + ".bundle")

Write-Host "==> Gerando bundle: $bundle"
Run-Git $ExternalRepoPath @("bundle","create",$bundle,"--all") | Out-Null

# C) Garante destino limpo para merge previsível
$dstStatus = (Get-Git $TargetRepoPath @("status","--porcelain")).Trim()
if ($dstStatus.Length -gt 0) {
  throw "Repo do notebook NÃO está limpo. Commite/stashe ou limpe antes de importar. (git status)"
}

Write-Host "==> Fetch do bundle como remote 'ssd/*'..."
Run-Git $TargetRepoPath @("fetch",$bundle,"refs/*:refs/remotes/ssd/*") | Out-Null

$ssdHead = (Get-Git $TargetRepoPath @("rev-parse","ssd/HEAD")).Trim()
$importBranch = "import/ssd-" + (Timestamp)

Write-Host "==> Criando branch de import: $importBranch"
Run-Git $TargetRepoPath @("checkout","-b",$importBranch,$ssdHead) | Out-Null

# Detecta branch padrão (origin/HEAD -> main/master)
$defaultBranch = "main"
try {
  $originHead = (Get-Git $TargetRepoPath @("symbolic-ref","refs/remotes/origin/HEAD")).Trim()
  $defaultBranch = ($originHead -split "/")[-1]
} catch {}

Write-Host "==> Voltando para branch padrão: $defaultBranch"
Run-Git $TargetRepoPath @("checkout",$defaultBranch) | Out-Null
Run-Git $TargetRepoPath @("pull","--ff-only") | Out-Null

Write-Host "==> Merge do import para $defaultBranch (merge commit rastreável)"
try {
  Run-Git $TargetRepoPath @("merge","--no-ff",$importBranch,"-m","Merge SSD import ($importBranch)") | Out-Null
} catch {
  Write-Host ""
  Write-Host "!! Conflito detectado no merge."
  Write-Host "Resolva no VS Code e finalize com:"
  Write-Host "  git add -A"
  Write-Host "  git commit"
  Write-Host "Se quiser abortar:"
  Write-Host "  git merge --abort"
  throw
}

Write-Host ""
Write-Host "✅ Import concluído."
Write-Host "Se o SSD tinha stash, ele veio junto. Veja com: git stash list"
