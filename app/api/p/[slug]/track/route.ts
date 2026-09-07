import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/utils";
import { readVisitorSessionId } from "@/lib/session";

type Ctx = { params: Promise<{ slug: string }> };

const SESSION_MS = 30 * 60 * 1000;
const TYPES = new Set(["pageview", "heartbeat", "leave", "identify", "comment", "click"]);
const STORE_EVENT = new Set(["pageview", "identify", "comment", "click"]);

function clip(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const page = await db.page.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!page || page.status !== "published") return jsonError("Página não encontrada", 404);

  const body = await request.json().catch(() => null);
  const type = clip(body?.type, 20);
  if (!TYPES.has(type)) return jsonError("Evento inválido");

  const anonId = clip(body?.anonId, 64);
  if (anonId.length < 8) return jsonError("Visitante inválido");

  const now = new Date();
  const visitId = clip(body?.visitId, 40);
  const referrer = clip(body?.referrer, 300);
  const label = clip(body?.label, 80);
  const url = clip(body?.url, 500);

  let visitorId: string | undefined;
  const sessionId = await readVisitorSessionId();
  if (sessionId) {
    const visitor = await db.visitor.findUnique({ where: { sessionId }, select: { id: true, pageId: true } });
    if (visitor && visitor.pageId === page.id) visitorId = visitor.id;
  }

  let visit =
    visitId
      ? await db.visit.findFirst({ where: { id: visitId, pageId: page.id } })
      : null;

  if (!visit) {
    visit = await db.visit.findFirst({
      where: { pageId: page.id, anonId },
      orderBy: { lastSeenAt: "desc" },
    });
    if (visit && now.getTime() - visit.lastSeenAt.getTime() > SESSION_MS) {
      visit = null;
    }
    if (visit && type === "pageview" && now.getTime() - visit.startedAt.getTime() > SESSION_MS) {
      visit = null;
    }
  }

  if (!visit) {
    visit = await db.visit.create({
      data: {
        pageId: page.id,
        anonId,
        visitorId,
        referrer,
        identified: type === "identify" || Boolean(visitorId),
        commented: type === "comment",
        clicked: type === "click",
        clickCount: type === "click" ? 1 : 0,
      },
    });
  } else {
    const durationSec = Math.max(visit.durationSec, Math.floor((now.getTime() - visit.startedAt.getTime()) / 1000));
    visit = await db.visit.update({
      where: { id: visit.id },
      data: {
        lastSeenAt: now,
        durationSec,
        visitorId: visit.visitorId || visitorId,
        identified: visit.identified || type === "identify" || Boolean(visitorId),
        commented: visit.commented || type === "comment",
        clicked: visit.clicked || type === "click",
        clickCount: type === "click" ? { increment: 1 } : undefined,
        referrer: visit.referrer || referrer,
      },
    });
  }

  if (STORE_EVENT.has(type)) {
    await db.analyticsEvent.create({
      data: {
        pageId: page.id,
        visitId: visit.id,
        type,
        label,
        url,
      },
    });
  }

  return Response.json({ ok: true, visitId: visit.id });
}
