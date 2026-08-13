-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "openaiApiKey" TEXT NOT NULL DEFAULT '',
    "openaiModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "logoMimeType" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSettings" ("id", "openaiApiKey", "openaiModel", "updatedAt") SELECT "id", "openaiApiKey", "openaiModel", "updatedAt" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
