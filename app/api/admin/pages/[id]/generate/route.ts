import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonError, colorForName } from "@/lib/utils";
import { generateTimedComments } from "@/lib/openai";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Não autorizado", 401);
  }

  const { id } = await ctx.params;
  const page = await db.page.findUnique({
    where: { id },
    include: { transcript: { orderBy: { timestampSec: "asc" } }, knowledgeBase: true, settings: true },
  });
  if (!page) return jsonError("Página não encontrada", 404);
  if (!page.settings?.aiEnabled || !page.settings.autoGenerateEnabled) {
    return jsonError("Geração automática está desligada nesta página");
  }
  if (!page.transcript.length) {
    return jsonError("Adicione a transcrição com minutagem antes de gerar");
  }

  const events = await generateTimedComments({
    pageTitle: page.title,
    instructions: page.aiInstructions,
    knowledge: page.knowledgeBase?.content || "",
    transcript: page.transcript,
    allowedTypes: page.settings.allowedCommentTypes,
    temperature: page.settings.temperature,
    model: page.settings.openaiModel,
  });

  await db.commentEvent.deleteMany({ where: { pageId: id, authorType: "ai" } });
  if (events.length) {
    await db.commentEvent.createMany({
      data: events.map((e) => ({
        pageId: id,
        timestampSec: e.timestampSec,
        commentText: e.commentText,
        commentType: e.commentType,
        authorType: "ai",
        authorName: e.authorName,
        authorColor: colorForName(e.authorName),
      })),
    });
  }

  return Response.json({ count: events.length });
}
