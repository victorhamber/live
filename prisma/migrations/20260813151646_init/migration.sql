-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "mode" TEXT NOT NULL DEFAULT 'simulation',
    "videoTitle" TEXT NOT NULL DEFAULT '',
    "channelName" TEXT NOT NULL DEFAULT '',
    "channelHandle" TEXT NOT NULL DEFAULT '',
    "channelAvatar" TEXT NOT NULL DEFAULT 'AT',
    "description" TEXT NOT NULL DEFAULT '',
    "brandName" TEXT NOT NULL DEFAULT 'AutoFintech',
    "vturbPlayerId" TEXT NOT NULL DEFAULT '',
    "vturbScriptUrl" TEXT NOT NULL DEFAULT '',
    "thumbnailUrl" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "viewersBase" INTEGER NOT NULL DEFAULT 2284,
    "chatNote" TEXT NOT NULL DEFAULT 'Use o chat para tirar dúvidas. Mercado financeiro envolve risco.',
    "aiInstructions" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Suporte',
    "avatar" TEXT NOT NULL DEFAULT 'SP',
    "personality" TEXT NOT NULL DEFAULT 'técnico/comercial',
    "goal" TEXT NOT NULL DEFAULT 'responder dúvidas',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Agent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeBase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "KnowledgeBase_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    CONSTRAINT "AgentLink_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    CONSTRAINT "AgentAction_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranscriptSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "timestampSec" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "TranscriptSegment_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "timestampSec" INTEGER NOT NULL,
    "commentText" TEXT NOT NULL,
    "commentType" TEXT NOT NULL DEFAULT 'comment',
    "authorType" TEXT NOT NULL DEFAULT 'ai',
    "authorName" TEXT NOT NULL DEFAULT '',
    "authorColor" TEXT NOT NULL DEFAULT '#1e6b45',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isSuperchat" BOOLEAN NOT NULL DEFAULT false,
    "superAmount" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommentEvent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PageSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoGenerateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "agentReplyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxMessagesPerMinute" INTEGER NOT NULL DEFAULT 6,
    "minIntervalSec" INTEGER NOT NULL DEFAULT 8,
    "creativity" REAL NOT NULL DEFAULT 0.7,
    "allowedCommentTypes" TEXT NOT NULL DEFAULT 'question,objection,benefit,testimonial,filler',
    "openaiModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "dailyApiLimit" INTEGER NOT NULL DEFAULT 100,
    CONSTRAINT "PageSettings_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "leadStatus" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Visitor_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "visitorId" TEXT,
    "videoTimestamp" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "classification" TEXT NOT NULL DEFAULT 'NORMAL',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "authorType" TEXT NOT NULL DEFAULT 'user',
    "authorName" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModerationLog_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeadNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadNote_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_pageId_key" ON "Agent"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBase_pageId_key" ON "KnowledgeBase"("pageId");

-- CreateIndex
CREATE INDEX "TranscriptSegment_pageId_timestampSec_idx" ON "TranscriptSegment"("pageId", "timestampSec");

-- CreateIndex
CREATE INDEX "CommentEvent_pageId_timestampSec_idx" ON "CommentEvent"("pageId", "timestampSec");

-- CreateIndex
CREATE UNIQUE INDEX "PageSettings_pageId_key" ON "PageSettings"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_sessionId_key" ON "Visitor"("sessionId");

-- CreateIndex
CREATE INDEX "Visitor_pageId_email_idx" ON "Visitor"("pageId", "email");

-- CreateIndex
CREATE INDEX "Comment_pageId_createdAt_idx" ON "Comment"("pageId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_pageId_videoTimestamp_idx" ON "Comment"("pageId", "videoTimestamp");
