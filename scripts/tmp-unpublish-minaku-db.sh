#!/bin/bash
set -euo pipefail
cd "$HOME/wab-infos/apps/cms"
HOST=$(grep '^DATABASE_HOST=' .env | cut -d= -f2- | tr -d '\r')
PORT=$(grep '^DATABASE_PORT=' .env | cut -d= -f2- | tr -d '\r')
NAME=$(grep '^DATABASE_NAME=' .env | cut -d= -f2- | tr -d '\r')
USER=$(grep '^DATABASE_USERNAME=' .env | cut -d= -f2- | tr -d '\r')
export PGPASSWORD=$(grep '^DATABASE_PASSWORD=' .env | cut -d= -f2- | tr -d '\r')
DOC=kn90v3fwathiqwnuld5oacht

echo "== before =="
psql -h "$HOST" -p "$PORT" -U "$USER" -d "$NAME" -c \
  "SELECT id, published_at IS NOT NULL AS live, status FROM articles WHERE document_id = '$DOC' ORDER BY id;"

echo "== delete published rows =="
psql -h "$HOST" -p "$PORT" -U "$USER" -d "$NAME" -c \
  "DELETE FROM articles WHERE document_id = '$DOC' AND published_at IS NOT NULL;"

echo "== set draft status =="
psql -h "$HOST" -p "$PORT" -U "$USER" -d "$NAME" -c \
  "UPDATE articles SET status = 'draft', scheduled_at = NULL WHERE document_id = '$DOC' AND published_at IS NULL;"

echo "== after =="
psql -h "$HOST" -p "$PORT" -U "$USER" -d "$NAME" -c \
  "SELECT id, published_at IS NOT NULL AS live, status FROM articles WHERE document_id = '$DOC' ORDER BY id;"

unset PGPASSWORD
