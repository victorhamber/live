#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/data/prod.db"
fi

mkdir -p /app/data
node node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma
exec node server.js
