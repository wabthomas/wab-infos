# Fix monorepo hoisting: link @strapi/strapi into root node_modules
$rootStrapi = Join-Path $PSScriptRoot "..\node_modules\@strapi\strapi"
$cmsStrapi = Join-Path $PSScriptRoot "..\apps\cms\node_modules\@strapi\strapi"

if (-not (Test-Path $cmsStrapi)) {
    Write-Error "Installez d'abord les dependances CMS: cd apps/cms && npm install"
    exit 1
}

if (Test-Path $rootStrapi) {
    Write-Host "Lien Strapi deja present."
    exit 0
}

$parent = Split-Path $rootStrapi -Parent
if (-not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

cmd /c mklink /J "$rootStrapi" "$cmsStrapi" | Out-Null
Write-Host "Lien Strapi cree: node_modules/@strapi/strapi -> apps/cms/node_modules/@strapi/strapi"
