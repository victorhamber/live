import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/utils";
import { readVisitorIdentity } from "@/lib/session";
import { findVisitorOnPage } from "@/lib/leads";
import { pageIsViewable } from "@/lib/pages";

type Ctx = { params: Promise<{ slug: string }> };

type CachedPage = { id: string; status: string; mode: string; template: string; customHtml: string; at: number };
const pageCache = new Map<string, CachedPage>();
const PAGE_TTL_MS = 20_000;

async function getViewablePage(slug: string) {
  const hit = pageCache.get(slug);
  if (hit && Date.now() - hit.at < PAGE_TTL_MS) return pageIsViewable(hit) ? hit : null;
  const page = await db.page.findUnique({
    where: { slug },
    select: { id: true, status: true, mode: true, template: true, customHtml: true },
  });
  if (!page) return null;
  const cached = { ...page, at: Date.now() };
  pageCache.set(slug, cached);
  return pageIsViewable(cached) ? cached : null;
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const t = Math.max(0, Number(request.nextUrl.searchParams.get("t") || 0));
  const fromRaw = request.nextUrl.searchParams.get("from");
  const fromT = fromRaw != null && fromRaw !== "" ? Number(fromRaw) : NaN;
  const incremental = Number.isFinite(fromT) && fromT >= 0;

  const page = await getViewablePage(slug);
  if (!page) return jsonError("Página não encontrada", 404);

  const identity = await readVisitorIdentity();
  const visitorOnPage = identity ? await findVisitorOnPage(page.id, identity) : null;

  const timeFilter = incremental
    ? { gt: fromT, lte: t }
    : { lte: t };

  const events =
    page.mode === "simulation"
      ? await db.commentEvent.findMany({
          where: { pageId: page.id, timestampSec: timeFilter },
          orderBy: { timestampSec: incremental ? "asc" : "desc" },
          take: incremental ? 40 : 80,
        })
      : [];

  const visibilityOr = [
    { visibility: "public" },
    visitorOnPage ? { visibility: "author_only", visitorId: visitorOnPage.id } : undefined,
  ].filter(Boolean) as object[];

  const comments = await db.comment.findMany({
    where: {
      pageId: page.id,
      AND: [
        incremental
          ? {
              OR: [
                { videoTimestamp: timeFilter },
                { createdAt: { gte: new Date(Date.now() - 20_000) } },
              ],
            }
          : { videoTimestamp: timeFilter },
        { OR: visibilityOr },
      ],
    },
    include: { visitor: { select: { name: true } } },
    orderBy: { videoTimestamp: incremental ? "asc" : "desc" },
    take: incremental ? 40 : 80,
  });

  const eventRows = incremental ? events : [...events].reverse();
  const commentRows = incremental ? comments : [...comments].reverse();

  return Response.json({
    events: eventRows.map((e) => ({
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
    comments: commentRows.map((c) => ({
      id: c.id,
      kind: "comment",
      timestampSec: c.videoTimestamp,
      text: c.text,
      name: c.authorType === "agent" ? c.authorName : c.visitor?.name || c.authorName || "Visitante",
      authorType: c.authorType,
      mine: visitorOnPage ? c.visitorId === visitorOnPage.id : false,
    })),
    visitor: visitorOnPage ? { name: visitorOnPage.name, email: visitorOnPage.email } : null,
  });
}
