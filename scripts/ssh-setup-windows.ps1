# Configure SSH local pour deployer Wab-infos sur N0C (Windows).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/ssh-setup-windows.ps1
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$KeyPrivate = Join-Path $env:USERPROFILE '.ssh\wab-infos-noc'
$KeyPublic = "$KeyPrivate.pub"
$SshConfig = Join-Path $env:USERPROFILE '.ssh\config'
$DeployEnvExample = Join-Path $RepoRoot 'deploy\.env.deploy.example'
$DeployEnv = Join-Path $RepoRoot 'deploy\.env.deploy'

Write-Host ''
Write-Host '=== Wab-infos - configuration SSH (N0C) ===' -ForegroundColor Cyan
Write-Host ''

if (-not (Test-Path $KeyPrivate)) {
  Write-Host 'Cle introuvable. Generation...' -ForegroundColor Yellow
  $sshDir = Split-Path $KeyPrivate
  if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir | Out-Null
  }
  ssh-keygen -t ed25519 -f $KeyPrivate -C 'wab-infos-deploy@noc' -N '""'
}

$pubKey = Get-Content -Raw $KeyPublic
Write-Host 'Cle publique (a coller dans N0C > SSH > Cles SSH) :' -ForegroundColor Green
Write-Host ''
Write-Host $pubKey.Trim()
Write-Host ''

try {
  Set-Clipboard -Value $pubKey.Trim()
  Write-Host 'Copiee dans le presse-papiers.' -ForegroundColor DarkGray
} catch {
  Write-Host 'Copiez la cle manuellement.' -ForegroundColor DarkGray
}

if (-not (Test-Path $DeployEnv)) {
  Copy-Item $DeployEnvExample $DeployEnv
  Write-Host 'Fichier cree : deploy/.env.deploy (a completer)' -ForegroundColor Yellow
} else {
  Write-Host 'deploy/.env.deploy deja present' -ForegroundColor DarkGray
}

if (-not (Select-String -Path $SshConfig -Pattern '^\s*Host\s+wab-noc\s*$' -Quiet -ErrorAction SilentlyContinue)) {
  $block = @"

# Wab-infos - deploiement N0C
Host wab-noc
  HostName ssh.votre-serveur.planethoster.net
  User votre_user_cpanel
  IdentityFile ~/.ssh/wab-infos-noc
  IdentitiesOnly yes
  ServerAliveInterval 60

"@
  Add-Content -Path $SshConfig -Value $block -Encoding utf8
  Write-Host "Bloc Host wab-noc ajoute a $SshConfig" -ForegroundColor Yellow
  Write-Host 'Editez HostName et User avec les valeurs N0C.' -ForegroundColor Yellow
} else {
  Write-Host 'Host wab-noc deja present dans ~/.ssh/config' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Etapes suivantes :' -ForegroundColor Cyan
Write-Host '  1. N0C : coller la cle publique'
Write-Host '  2. Editer ~/.ssh/config (HostName + User)'
Write-Host '  3. Editer deploy/.env.deploy si besoin'
Write-Host '  4. Tester : npm run ssh:noc'
Write-Host '  5. Deployer : npm run deploy:web'
Write-Host ''
