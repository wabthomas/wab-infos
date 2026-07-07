# Déploiement Wab-infos → N0C via SSH (Windows).
# Usage:
#   npm run deploy:web
#   npm run deploy:redaction
#   npm run deploy:remote          (web + rédaction, sans rebuild local)
#   powershell -File scripts/deploy-remote.ps1 ssh
#   powershell -File scripts/deploy-remote.ps1 exec -- "cd ~/wab-infos && git pull"
param(
  [Parameter(Position = 0)]
  [ValidateSet('web', 'redaction', 'cms', 'all', 'ssh', 'exec', 'upload')]
  [string]$Target = 'web',

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Rest
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$DeployEnv = Join-Path $RepoRoot 'deploy\.env.deploy'

function Read-DeployEnv {
  if (-not (Test-Path $DeployEnv)) {
    throw "Fichier deploy/.env.deploy manquant. Lancez : npm run deploy:setup"
  }
  $vars = @{}
  Get-Content $DeployEnv | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $eq = $line.IndexOf('=')
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim()
    $vars[$key] = $val
  }
  return $vars
}

function Get-SshTarget {
  param([hashtable]$Env)
  $sshAlias = $Env['DEPLOY_SSH_HOST']
  if (-not $sshAlias) { $sshAlias = 'wab-noc' }
  return $sshAlias
}

function Get-RemotePath {
  param([hashtable]$Env)
  $path = $Env['DEPLOY_REMOTE_PATH']
  if (-not $path) { $path = '~/wab-infos' }
  return $path
}

function Invoke-Remote {
  param([string]$SshHost, [string]$Command)
  ssh $SshHost $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Commande SSH échouée (code $LASTEXITCODE)"
  }
}

function Send-File {
  param([string]$SshHost, [string]$LocalPath, [string]$RemotePath)
  if (-not (Test-Path $LocalPath)) {
    throw "Fichier local introuvable : $LocalPath"
  }
  scp $LocalPath "${SshHost}:${RemotePath}"
  if ($LASTEXITCODE -ne 0) {
    throw "scp échoué pour $LocalPath"
  }
}

function Restart-RemotePassenger {
  param([string]$SshHost, [string]$RemoteBase, [string]$AppRelativePath)
  Invoke-Remote -SshHost $SshHost -Command "mkdir -p $RemoteBase/$AppRelativePath/tmp && touch $RemoteBase/$AppRelativePath/tmp/restart.txt && echo restart Passenger: $AppRelativePath"
}

$envVars = Read-DeployEnv
$sshHost = Get-SshTarget -Env $envVars
$remoteBase = Get-RemotePath -Env $envVars

Push-Location $RepoRoot
try {
  switch ($Target) {
    'ssh' {
      ssh $sshHost
      return
    }
    'exec' {
      $cmd = ($Rest -join ' ').Trim()
      if (-not $cmd) { throw 'Usage: deploy-remote.ps1 exec -- "votre commande"' }
      Invoke-Remote -SshHost $sshHost -Command $cmd
      return
    }
    'upload' {
      $file = $Rest[0]
      if (-not $file) { throw 'Usage: deploy-remote.ps1 upload -- web-next-build.tar.gz' }
      $local = if ([IO.Path]::IsPathRooted($file)) { $file } else { Join-Path $RepoRoot $file }
      Send-File -SshHost $sshHost -LocalPath $local -RemotePath "$remoteBase/$(Split-Path -Leaf $local)"
      return
    }
    'web' {
      Write-Host 'Build web + pack + upload + extraction + restart...' -ForegroundColor Cyan
      npm run build:web:pack
      Send-File -SshHost $sshHost -LocalPath (Join-Path $RepoRoot 'web-next-build.tar.gz') -RemotePath "$remoteBase/web-next-build.tar.gz"
      Invoke-Remote -SshHost $sshHost -Command "cd $remoteBase && tar -xzf web-next-build.tar.gz -C apps/web && test -f apps/web/.next/BUILD_ID && echo web unpack OK"
      Restart-RemotePassenger -SshHost $sshHost -RemoteBase $remoteBase -AppRelativePath 'apps/web'
      Write-Host 'Deploiement web termine (Passenger redemarre via tmp/restart.txt).' -ForegroundColor Green
    }
    'redaction' {
      Write-Host 'Build redaction + pack + upload + extraction + restart...' -ForegroundColor Cyan
      npm run build:redaction:pack
      Send-File -SshHost $sshHost -LocalPath (Join-Path $RepoRoot 'redaction-next-build.tar.gz') -RemotePath "$remoteBase/redaction-next-build.tar.gz"
      Invoke-Remote -SshHost $sshHost -Command "cd $remoteBase && tar -xzf redaction-next-build.tar.gz -C apps/redaction && bash scripts/noc-npm-install.sh redaction"
      Restart-RemotePassenger -SshHost $sshHost -RemoteBase $remoteBase -AppRelativePath 'apps/redaction'
      Write-Host 'Deploiement redaction termine (Passenger redemarre via tmp/restart.txt).' -ForegroundColor Green
    }
    'cms' {
      if (-not (Test-Path (Join-Path $RepoRoot 'cms-build.tar.gz'))) {
        Write-Host 'Pack CMS...' -ForegroundColor Cyan
        npm run build:cms
        npm run pack:cms-build
      }
      Send-File -SshHost $sshHost -LocalPath (Join-Path $RepoRoot 'cms-build.tar.gz') -RemotePath "$remoteBase/cms-build.tar.gz"
      Invoke-Remote -SshHost $sshHost -Command "cd $remoteBase && rm -rf apps/cms/dist && tar -xzf cms-build.tar.gz -C apps/cms"
      Restart-RemotePassenger -SshHost $sshHost -RemoteBase $remoteBase -AppRelativePath 'apps/cms'
      Write-Host 'Deploiement CMS termine (Passenger redemarre via tmp/restart.txt).' -ForegroundColor Green
    }
    'all' {
      & $PSCommandPath web
      & $PSCommandPath redaction
      Write-Host 'Deploiement web + redaction termine.' -ForegroundColor Green
    }
  }
} finally {
  Pop-Location
}
