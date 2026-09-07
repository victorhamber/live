-- AlterTable
ALTER TABLE "Page" ADD COLUMN "template" TEXT NOT NULL DEFAULT 'youtube';
ALTER TABLE "Page" ADD COLUMN "ctaLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Page" ADD COLUMN "ctaUrl" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "anonId" TEXT NOT NULL,
    "visitorId" TEXT,
    "referrer" TEXT NOT NULL DEFAULT '',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "identified" BOOLEAN NOT NULL DEFAULT false,
    "commented" BOOLEAN NOT NULL DEFAULT false,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Visit_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Visit_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Visit_pageId_startedAt_idx" ON "Visit"("pageId", "startedAt");

-- CreateIndex
CREATE INDEX "Visit_pageId_anonId_idx" ON "Visit"("pageId", "anonId");

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsEvent_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_pageId_createdAt_idx" ON "AnalyticsEvent"("pageId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_pageId_type_idx" ON "AnalyticsEvent"("pageId", "type");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_visitId_idx" ON "AnalyticsEvent"("visitId");
