#!/usr/bin/env bash
# Applique les migrations du module RH sur la base PostgreSQL dédiée.
#
# Usage :
#   bash scripts/setup-rh-database.sh 'postgresql://user:pass@host:5432/redaction_rh'
#   bash scripts/setup-rh-database.sh "$REDACTION_RH_DATABASE_URL"
#
# La base doit avoir été créée dans le panneau N0C (PostgreSQL). Le script refuse
# toute base dont le nom ne contient pas « rh », pour éviter de viser la base Strapi.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATABASE_URL="${1:-${REDACTION_RH_DATABASE_URL:-}}"

if [ -z "$DATABASE_URL" ]; then
  echo "Usage: bash scripts/setup-rh-database.sh '<postgres-url>'"
  echo "   ou: REDACTION_RH_DATABASE_URL='postgresql://...' bash scripts/setup-rh-database.sh"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "❌ psql introuvable sur le serveur."
  exit 1
fi

DB_NAME="$(psql "$DATABASE_URL" -Atc 'select current_database()')"
case "$DB_NAME" in
  *rh*) ;;
  *)
    echo "❌ Refus : la base « $DB_NAME » ne ressemble pas à une base RH dédiée."
    echo "   Créez une base nommée par exemple redaction_rh dans N0C."
    exit 1
    ;;
esac

SCHEMA_EXISTS="$(psql "$DATABASE_URL" -Atc "select 1 from information_schema.schemata where schema_name='redaction_rh'")"
if [ "$SCHEMA_EXISTS" = "1" ]; then
  echo "❌ Le schéma redaction_rh existe déjà dans « $DB_NAME »."
  echo "   Les migrations ne doivent être exécutées qu'une seule fois."
  exit 1
fi

MIGRATIONS=(
  rh-initial
  rh-prestations
  rh-absences
  rh-account-links
  rh-declarations
  # Onglet « Accès et sécurité » : même avec les rôles RH désactivés, l'écran
  # lit role_grants. Sans cette table : « Impossible de charger les droits ».
  rh-roles
  # Onglet « Rapports » visible par défaut pour les admins RH : sans cette
  # migration, les exports échouent.
  rh-rapports
  rh-fiches
)

for migration in "${MIGRATIONS[@]}"; do
  file="$ROOT_DIR/docs/sql/${migration}.sql"
  if [ ! -f "$file" ]; then
    echo "❌ Migration manquante : $file"
    exit 1
  fi
  echo "→ ${migration}.sql"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$file"
done

echo ""
echo "✅ Migrations RH appliquées sur « $DB_NAME »."
echo "Tables créées :"
psql "$DATABASE_URL" -Atc "select table_name from information_schema.tables where table_schema='redaction_rh' order by 1" | sed 's/^/   - /'
echo ""
echo "Prochaine étape : redéployer la rédaction, puis vérifier /rh avec un compte super-admin."
