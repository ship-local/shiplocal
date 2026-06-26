#!/usr/bin/env bash
# Apply Prisma migrations on production (Postgres runs inside Docker).
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="docker/.env"
COMPOSE_FILE="docker/docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy POSTGRES_PASSWORD from your backup." >&2
  exit 1
fi

echo "Rebuilding server image (ensures migration files are current)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build server

echo "Applying migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec server \
  sh -c 'cd /app/apps/server && npx prisma migrate deploy'

echo "Migration status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec server \
  sh -c 'cd /app/apps/server && npx prisma migrate status'

echo "Health:"
curl -s http://127.0.0.1:4000/health
echo
