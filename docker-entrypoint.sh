#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/data/prod.db"
fi

mkdir -p /app/data
node ./scripts/migrate.cjs
exec node server.js
