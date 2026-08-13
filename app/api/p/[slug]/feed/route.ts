import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/utils";
import { readVisitorSessionId } from "@/lib/session";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const t = Math.max(0, Number(request.nextUrl.searchParams.get("t") || 0));
  const page = await db.page.findUnique({ where: { slug } });
  if (!page || page.status !== "published") return jsonError("Página não encontrada", 404);

  const sessionId = await readVisitorSessionId();
  const visitor = sessionId
    ? await db.visitor.findFirst({ where: { pageId: page.id, sessionId } })
    : null;

  const events =
    page.mode === "simulation"
      ? await db.commentEvent.findMany({
          where: { pageId: page.id, timestampSec: { lte: t } },
          orderBy: { timestampSec: "asc" },
        })
      : [];

  const comments = await db.comment.findMany({
    where: {
      pageId: page.id,
      videoTimestamp: { lte: t },
      OR: [
        { visibility: "public" },
        visitor ? { visibility: "author_only", visitorId: visitor.id } : undefined,
      ].filter(Boolean) as object[],
    },
    include: { visitor: { select: { name: true } } },
    orderBy: { videoTimestamp: "asc" },
    take: 250,
  });

  return Response.json({
    events: events.map((e) => ({
      id: e.id,
      kind: "event",
      timestampSec: e.timestampSec,
      text: e.commentText,
      name: e.authorName,
      color: e.authorColor,
      type: e.commentType,
      isSuperchat: e.isSuperchat,
      superAmount: e.superAmount,
      authorType: e.authorType,
    })),
    comments: comments.map((c) => ({
      id: c.id,
      kind: "comment",
      timestampSec: c.videoTimestamp,
      text: c.text,
      name: c.authorType === "agent" ? c.authorName : c.visitor?.name || c.authorName || "Visitante",
      authorType: c.authorType,
      mine: visitor ? c.visitorId === visitor.id : false,
    })),
    visitor: visitor ? { name: visitor.name, email: visitor.email } : null,
  });
}
