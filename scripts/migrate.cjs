const { createHash, randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function migrationDirs() {
  const root = path.join(__dirname, "..", "prisma", "migrations");
  return fs
    .readdirSync(root)
    .filter((name) => {
      const full = path.join(root, name);
      return name !== "migration_lock.toml" && fs.statSync(full).isDirectory();
    })
    .sort();
}

function statementsFrom(sql) {
  return sql
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith("-->"));
}

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);

  const root = path.join(__dirname, "..", "prisma", "migrations");
  for (const name of migrationDirs()) {
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "");
    const already = await prisma.$queryRawUnsafe(
      `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = '${safeName}' LIMIT 1`
    );
    if (Array.isArray(already) && already.length) continue;

    const sql = fs.readFileSync(path.join(root, name, "migration.sql"), "utf8");
    for (const statement of statementsFrom(sql)) {
      await prisma.$executeRawUnsafe(statement);
    }

    const checksum = createHash("sha256").update(sql).digest("hex");
    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ('${id}', '${checksum}', CURRENT_TIMESTAMP, '${safeName}', NULL, NULL, CURRENT_TIMESTAMP, 1)`
    );
    console.log("Migration applied:", safeName);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
