-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "inboxStatus" TEXT NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "Comment_pageId_inboxStatus_idx" ON "Comment"("pageId", "inboxStatus");
