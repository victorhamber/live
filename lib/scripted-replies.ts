import { db } from "./db";
import { generateScriptedAgentReplies, scriptedNeedsReply } from "./openai";

export async function rebuildScriptedAgentReplies(pageId: string) {
  const page = await db.page.findUnique({
    where: { id: pageId },
    include: { agent: true, knowledgeBase: true, settings: true, links: true, actions: true },
  });
  if (!page?.agent?.enabled) return 0;
  if (!page.settings?.agentReplyEnabled || !page.settings.aiEnabled) return 0;

  await db.commentEvent.deleteMany({ where: { pageId, authorType: "agent" } });

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
