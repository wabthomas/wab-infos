#!/bin/bash
# Le site public tourne via node server.js (port 3010), pas via Passenger.
# touch tmp/restart.txt ne recharge pas ce processus.
set -euo pipefail
APP_DIR="${1:-$HOME/wab-infos/apps/web}"
NODE_BIN="/opt/alt/alt-nodejs20/root/usr/bin/node"
pid="$(ps -u "$(whoami)" -o pid=,cmd= | awk '/alt-nodejs20\/root\/usr\/bin\/node server.js/ {print $1; exit}')"
if [ -z "${pid}" ]; then
  echo "web-node-absent"
  exit 0
fi
cwd="$(readlink "/proc/${pid}/cwd" 2>/dev/null || true)"
if [ "${cwd}" != "${APP_DIR}" ]; then
  echo "web-node-unchanged ${cwd}"
  exit 0
fi
kill "${pid}"
sleep 2
cd "${APP_DIR}"
NODE_ENV=production PORT=3010 nohup "${NODE_BIN}" server.js >> server-restart.log 2>&1 &
echo "web-node-restarted:$!"
