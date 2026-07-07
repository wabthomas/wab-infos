# Demarre PostgreSQL via Laragon (sans Docker)
$pgCtl = "C:\laragon\bin\postgresql\postgresql\bin\pg_ctl.exe"
$dataDir = "C:\laragon\data\postgresql"
$logFile = "C:\laragon\data\postgresql\postgresql.log"
$psql = "C:\laragon\bin\postgresql\postgresql\bin\psql.exe"

if (-not (Test-Path $pgCtl)) {
    Write-Error "PostgreSQL Laragon introuvable. Installez-le via Laragon > Menu > PostgreSQL."
    exit 1
}

$ready = & "C:\laragon\bin\postgresql\postgresql\bin\pg_isready.exe" -h 127.0.0.1 -p 5432 2>&1
if ($ready -match "accepting|accepte") {
    Write-Host "PostgreSQL est deja demarre."
} else {
    Write-Host "Demarrage de PostgreSQL..."
    & $pgCtl -D $dataDir -l $logFile start
    Start-Sleep -Seconds 2
}

$dbExists = & $psql -U postgres -h 127.0.0.1 -p 5432 -tc "SELECT 1 FROM pg_database WHERE datname='wab_infos'"
if (-not ($dbExists -match "1")) {
    Write-Host "Creation de la base wab_infos..."
    & $psql -U postgres -h 127.0.0.1 -p 5432 -c "CREATE DATABASE wab_infos;"
    & $psql -U postgres -h 127.0.0.1 -p 5432 -d wab_infos -f "$PSScriptRoot\database\init.sql"
}

Write-Host "PostgreSQL pret - base wab_infos disponible sur localhost:5432"
