#!/usr/bin/env bash
# One deploy of the backend on the EC2 box: what lessons 163–168 typed by hand, in order.
# Run by hand over SSH, or by the CD job (GitHub Actions → SSM Run Command) after CI passes.
#
#   bash ~/campusly/backend/deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."            # backend/
COMPOSE=(docker compose -f docker-compose.prod.yml)
HEALTH_URL=${HEALTH_URL:-https://api.campusly.uz/graphql}

echo "==> Code"
git pull --ff-only                 # never merges on the server: the box only follows develop
git log -1 --format='    %h %s'

echo "==> Settings (SSM → .env.production)"
bash deploy/env-from-ssm.sh

echo "==> Build"
# The tools image too: a new migration or seed change must run with the new code
"${COMPOSE[@]}" --profile tools build

echo "==> Database migrations"
"${COMPOSE[@]}" run --rm tools pnpm prisma migrate deploy

echo "==> Restart api + batch (redis and caddy keep running)"
"${COMPOSE[@]}" up -d
docker image prune -f >/dev/null   # old image layers would fill the 20 GB disk

echo "==> Health"
for attempt in $(seq 1 20); do
  body=$(curl -s -m 5 "$HEALTH_URL" -H 'content-type: application/json' \
    -H 'apollo-require-preflight: true' -d '{"query":"{ health { status } }"}' || true)
  if [[ $body == *'"status":"ok"'* ]]; then
    echo "    ok (attempt $attempt)"
    exit 0
  fi
  sleep 3
done
echo "    health is not ok: $body" >&2
"${COMPOSE[@]}" logs --tail 30 api >&2
exit 1
