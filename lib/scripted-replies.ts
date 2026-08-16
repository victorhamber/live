import { db } from "./db";
import { generateScriptedAgentReplies, scriptedNeedsReply } from "./openai";

export async function dropOrphanAgentReplies(pageId: string) {
  const events = await db.commentEvent.findMany({
    where: { pageId },
    select: { id: true, authorType: true, inReplyToId: true },
  });
  const ids = new Set(events.map((e) => e.id));
  const orphanIds = events
    .filter((e) => e.authorType === "agent" && e.inReplyToId && !ids.has(e.inReplyToId))
    .map((e) => e.id);
  if (!orphanIds.length) return 0;
  await db.commentEvent.deleteMany({ where: { pageId, id: { in: orphanIds } } });
  return orphanIds.length;
}

export async function deleteScriptedEventAndReplies(pageId: string, eventId: string) {
  const event = await db.commentEvent.findFirst({ where: { id: eventId, pageId } });
  if (!event) return false;

  const ids = new Set<string>([eventId]);
  const linked = await db.commentEvent.findMany({
    where: { pageId, inReplyToId: eventId },
    select: { id: true },
  });
  for (const row of linked) ids.add(row.id);

  if (event.authorType !== "agent") {
    const nearby = await db.commentEvent.findMany({
      where: {
        pageId,
        authorType: "agent",
        timestampSec: { gt: event.timestampSec, lte: event.timestampSec + 30 },
      },
      select: { id: true, inReplyToId: true },
    });
    for (const row of nearby) {
      if (row.inReplyToId && row.inReplyToId !== eventId) continue;
      ids.add(row.id);
    }
  }

  await db.commentEvent.deleteMany({
    where: { pageId, id: { in: [...ids] } },
  });
  await dropOrphanAgentReplies(pageId);
  return true;
}

export async function rebuildScriptedAgentReplies(pageId: string) {
  const page = await db.page.findUnique({
    where: { id: pageId },
    include: { agent: true, knowledgeBase: true, settings: true, links: true, actions: true },
  });
  if (!page?.agent?.enabled) return 0;
  if (!page.settings?.agentReplyEnabled || !page.settings.aiEnabled) return 0;

  await db.commentEvent.deleteMany({ where: { pageId, authorType: "agent" } });
  await dropOrphanAgentReplies(pageId);

  const questions = await db.commentEvent.findMany({
    where: { pageId, authorType: "ai" },
    orderBy: { timestampSec: "asc" },
  });
  const need = questions.filter((q) => scriptedNeedsReply(q.commentType, q.commentText));
  if (!need.length) return 0;

  const replies = await generateScriptedAgentReplies({
    questions: need.map((q) => ({
      id: q.id,
      name: q.authorName,
      text: q.commentText,
      type: q.commentType,
    })),
    knowledge: page.knowledgeBase?.content || "",
    agentName: page.agent.name,
    personality: page.agent.personality,
    goal: page.agent.goal,
    links: page.links,
    actions: page.actions,
    model: page.settings.openaiModel,
  });

  let count = 0;
  for (let i = 0; i < need.length; i++) {
    const text = replies[need[i].id];
    if (!text) continue;
    await db.commentEvent.create({
      data: {
        pageId,
        timestampSec: need[i].timestampSec + 12 + (i % 8),
        commentText: text,
        commentType: "reply",
        authorType: "agent",
        authorName: page.agent.name,
        authorColor: "#0369a1",
        inReplyToId: need[i].id,
      },
    });
    count += 1;
  }
  return count;
}
