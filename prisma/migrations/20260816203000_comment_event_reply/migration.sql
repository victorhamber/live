-- AlterTable
ALTER TABLE "CommentEvent" ADD COLUMN "inReplyToId" TEXT;

-- CreateIndex
CREATE INDEX "CommentEvent_inReplyToId_idx" ON "CommentEvent"("inReplyToId");
