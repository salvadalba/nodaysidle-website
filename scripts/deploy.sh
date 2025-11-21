#!/usr/bin/env bash
set -euo pipefail
HOST="${HOST:-78.46.140.156}"
USER="${USER:-deploy}"
DOCROOT="${DOCROOT:-/var/www/nodaysidle}"
ssh "${USER}@${HOST}" "mkdir -p ~/backups && tar -czf ~/backups/nodaysidle-$(date +%F).tgz ${DOCROOT}"
rsync -avz --delete site/ "${USER}@${HOST}:${DOCROOT}/"
echo "Deployed to ${USER}@${HOST}:${DOCROOT}"
