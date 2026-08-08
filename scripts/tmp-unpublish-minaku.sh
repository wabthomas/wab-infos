#!/bin/bash
set -e
CMS=~/wab-infos/apps/cms
PORT=$(grep '^PORT=' "$CMS/.env" | cut -d= -f2 | tr -d '\r')
echo "PORT=$PORT"
DOC=kn90v3fwathiqwnuld5oacht

# Token from redaction env if present
TOKEN=""
if [ -f ~/wab-infos/apps/redaction/.env.local ]; then
  TOKEN=$(grep '^STRAPI_API_TOKEN=' ~/wab-infos/apps/redaction/.env.local | cut -d= -f2- | tr -d '\r' | head -1)
fi
AUTH=()
if [ -n "$TOKEN" ]; then
  AUTH=(-H "Authorization: Bearer $TOKEN")
fi

echo "== local actions/unpublish =="
curl -s -w "\nHTTP:%{http_code}\n" -X POST "${AUTH[@]}" \
  "http://127.0.0.1:${PORT}/api/articles/${DOC}/actions/unpublish" || true

echo "== check published =="
curl -s "http://127.0.0.1:${PORT}/api/articles?filters[slug][\$eq]=rdc-detention-de-minaku-et-shadary-un-transfert-judiciaire-qui-ne-dissipe-pas-le-flou&fields[0]=publishedAt&fields[1]=status&status=published&pagination[pageSize]=2" || true
echo
