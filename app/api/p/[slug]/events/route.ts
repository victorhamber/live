import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/utils";
import { commentAppearAt } from "@/lib/comment-timing";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const t = Math.max(0, Number(request.nextUrl.searchParams.get("t") || 0));
  const page = await db.page.findUnique({ where: { slug } });
  if (!page || page.status !== "published") return jsonError("Página não encontrada", 404);
  if (page.mode !== "simulation") return Response.json({ events: [] });

  const events = await db.commentEvent.findMany({
    where: { pageId: page.id, timestampSec: { lte: t } },
    orderBy: { timestampSec: "asc" },
  });

  return Response.json({
    events: events
      .map((e) => {
        const appearAt = commentAppearAt(e.timestampSec, e.commentType, e.commentText);
        return {
          id: e.id,
          timestampSec: appearAt,
          text: e.commentText,
          name: e.authorName,
          color: e.authorColor,
          type: e.commentType,
          isSuperchat: e.isSuperchat,
          superAmount: e.superAmount,
        };
      })
      .filter((e) => e.timestampSec <= t),
  });
}
