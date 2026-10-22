#!/usr/bin/env bash
# Purge automatique des caches Next.js (images + fetch) pour éviter le quota disque.
# Usage : bash scripts/cleanup-next-caches.sh
# Cron conseillé : 0 3 * * * bash $HOME/wab-infos/scripts/cleanup-next-caches.sh

set -u

ROOT="${WAB_INFOS_ROOT:-$HOME/wab-infos}"
LOG="${ROOT}/logs/cleanup-next-caches.log"
LOCK="${ROOT}/tmp/cleanup-next-caches.lock"
MAX_IMAGE_DIRS="${MAX_IMAGE_DIRS:-2000}"
MAX_FETCH_ENTRIES="${MAX_FETCH_ENTRIES:-8000}"
STALE_DAYS="${STALE_DAYS:-7}"

mkdir -p "$(dirname "$LOG")" "$(dirname "$LOCK")" "$ROOT/tmp"

if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK"
  flock -n 9 || exit 0
fi

ts() { date -u +'%Y-%m-%dT%H:%M:%SZ'; }

log() {
  echo "$(ts) $*" | tee -a "$LOG" >/dev/null
  # garder le log court
  if [ -f "$LOG" ] && [ "$(wc -c < "$LOG" 2>/dev/null || echo 0)" -gt 200000 ]; then
    tail -n 200 "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"
  fi
}

count_entries() {
  local dir="$1"
  if [ ! -d "$dir" ]; then
    echo 0
    return
  fi
  # maxdepth 1 : rapide même avec des dizaines de milliers d’entrées
  find "$dir" -mindepth 1 -maxdepth 1 2>/dev/null | wc -l | tr -d ' '
}

# Renomme puis recrée un dossier vide ; suppression lourde en arrière-plan.
rotate_dir() {
  local dir="$1"
  local reason="$2"
  [ -d "$dir" ] || return 0
  local parent base stamp old
  parent="$(dirname "$dir")"
  base="$(basename "$dir")"
  stamp="$(date +%Y%m%d%H%M%S)-$$"
  old="${parent}/${base}-old-${stamp}"
  log "rotate ${dir} (${reason})"
  mv "$dir" "$old" 2>/dev/null || {
    log "WARN mv failed ${dir}"
    return 1
  }
  mkdir -p "$dir"
  # nettoyage non bloquant
  nohup rm -rf "$old" >/dev/null 2>&1 &
}

purge_stale_files() {
  local dir="$1"
  [ -d "$dir" ] || return 0
  # fichiers / sous-dossiers non touchés depuis STALE_DAYS
  local removed
  removed="$(find "$dir" -mindepth 1 -maxdepth 1 -mtime "+${STALE_DAYS}" 2>/dev/null | wc -l | tr -d ' ')"
  if [ "${removed:-0}" -gt 0 ]; then
    find "$dir" -mindepth 1 -maxdepth 1 -mtime "+${STALE_DAYS}" -exec rm -rf {} + 2>/dev/null || true
    log "stale purge ${dir}: ~${removed} entrées >${STALE_DAYS}j"
  fi
}

# Anciennes rotations abandonnées
cleanup_old_rotations() {
  local cache_root="$1"
  [ -d "$cache_root" ] || return 0
  find "$cache_root" -maxdepth 1 \( -name 'images-old-*' -o -name 'fetch-cache-old-*' \) -mtime +1 \
    -exec rm -rf {} + 2>/dev/null || true
}

process_app() {
  local app="$1"
  local cache="${ROOT}/${app}/.next/cache"
  [ -d "${ROOT}/${app}/.next" ] || return 0
  mkdir -p "${cache}/images" "${cache}/fetch-cache"
  cleanup_old_rotations "$cache"

  local images="${cache}/images"
  local fetch="${cache}/fetch-cache"
  local n_images n_fetch
  n_images="$(count_entries "$images")"
  n_fetch="$(count_entries "$fetch")"
  log "${app}: images=${n_images} fetch=${n_fetch}"

  if [ "${n_images:-0}" -gt "$MAX_IMAGE_DIRS" ]; then
    rotate_dir "$images" "images>${MAX_IMAGE_DIRS}"
  else
    purge_stale_files "$images"
  fi

  if [ "${n_fetch:-0}" -gt "$MAX_FETCH_ENTRIES" ]; then
    rotate_dir "$fetch" "fetch>${MAX_FETCH_ENTRIES}"
  else
    purge_stale_files "$fetch"
  fi
}

log "START cleanup-next-caches"
process_app "apps/web"
process_app "apps/redaction"
# Archives de build laissées après deploy
find "$ROOT" -maxdepth 1 -type f \( -name 'web-next-build.tar.gz' -o -name 'redaction-next-build.tar.gz' -o -name 'cms-build.tar.gz' \) -mtime +1 -delete 2>/dev/null || true
log "DONE cleanup-next-caches"
