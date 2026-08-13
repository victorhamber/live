import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; sqliteReady?: boolean };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

async function enableSqliteFastPath() {
  if (globalForPrisma.sqliteReady) return;
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("file:")) return;
  try {
    await db.$queryRawUnsafe("PRAGMA journal_mode=WAL");
    await db.$queryRawUnsafe("PRAGMA busy_timeout=5000");
    await db.$queryRawUnsafe("PRAGMA synchronous=NORMAL");
    globalForPrisma.sqliteReady = true;
  } catch {
    /* ignore if not sqlite */
  }
}

void enableSqliteFastPath();
