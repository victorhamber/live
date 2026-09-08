import { after, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/utils";
import { readVisitorIdentity, rememberVisitor } from "@/lib/session";
import { inferLeadStatus, looksLikeQuestion, moderateByRules, wantsAgentReply } from "@/lib/moderation";
import { classifyComment, maybeReplyAsAgent } from "@/lib/openai";
import { getAppSettings } from "@/lib/settings";
import { pageIsViewable } from "@/lib/pages";
import { upsertLeadVisitor, validLeadEmail, visitorForPage } from "@/lib/leads";

type Ctx = { params: Promise<{ slug: string }> };

async function refineInBackground(opts: {
  commentId: string;
  pageId: string;
  visitorId: string;
  visitorName: string;
  text: string;
  videoTimestamp: number;
  classification: string;
  visibility: string;
  aiEnabled: boolean;
  openaiModel: string;
  leadStatus: string;
}) {
  let classification = opts.classification;
  let visibility = opts.visibility;
  const appSettings = opts.aiEnabled ? await getAppSettings() : { openaiApiKey: "" };
  const hasKey = Boolean(appSettings.openaiApiKey.trim());

  const shouldReplyNow =
    opts.aiEnabled && hasKey && visibility === "public" && wantsAgentReply(opts.text, opts.classification);
  const replyPromise = shouldReplyNow
    ? maybeReplyAsAgent({
        pageId: opts.pageId,
        visitorName: opts.visitorName,
        text: opts.text,
        videoTimestamp: opts.videoTimestamp,
        classification: opts.classification,
      }).catch(() => null)
    : Promise.resolve(null);

  if (opts.aiEnabled && hasKey && visibility === "public") {
    try {
      const aiClass = await classifyComment(opts.text, opts.openaiModel);
      classification = aiClass;
      if (["SPAM", "OFENSIVO", "NEGATIVO"].includes(aiClass)) {
        visibility = "author_only";
      }
    } catch {
      /* regras já cobrem o básico */
    }
  }

  if (looksLikeQuestion(opts.text) && classification === "NORMAL") {
    classification = "DUVIDA";
  }

  if (classification !== opts.classification || visibility !== opts.visibility) {
    await db.comment.update({
      where: { id: opts.commentId },
      data: {
        classification,
        visibility,
        inboxStatus: visibility === "public" ? "approved" : "restricted",
      },
    });
    await db.moderationLog.create({
      data: {
        commentId: opts.commentId,
        action: visibility,
        reason: classification,
      },
    });
  }

  const nextStatus = inferLeadStatus(classification, opts.text);
  if (nextStatus && opts.leadStatus === "new") {
    await db.visitor.update({ where: { id: opts.visitorId }, data: { leadStatus: nextStatus } });
  }

  await replyPromise;

  if (
    !shouldReplyNow &&
    opts.aiEnabled &&
    hasKey &&
    visibility === "public" &&
    wantsAgentReply(opts.text, classification)
  ) {
    await maybeReplyAsAgent({
      pageId: opts.pageId,
      visitorName: opts.visitorName,
      text: opts.text,
      videoTimestamp: opts.videoTimestamp,
      classification,
    }).catch(() => null);
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const page = await db.page.findUnique({
    where: { slug },
    include: { settings: true },
  });
  if (!page || !pageIsViewable(page)) return jsonError("Página não encontrada", 404);

  const body = await request.json().catch(() => null);
  const text = String(body?.text || "").trim();
  const videoTimestamp = Math.max(0, Math.round(Number(body?.videoTimestamp || 0)));
  let name = String(body?.name || "").trim();
  let email = String(body?.email || "").trim().toLowerCase();

  if (!text) return jsonError("Mensagem vazia");

  const identity = await readVisitorIdentity();
  let visitor = identity ? await visitorForPage(page.id, identity) : null;

  if (!visitor) {
    if (!name || !validLeadEmail(email)) {
      return jsonError("Informe nome e e-mail para comentar", 401);
    }
    visitor = await upsertLeadVisitor(page.id, name, email, false);
  } else if (name && name !== visitor.name) {
    visitor = await db.visitor.update({ where: { id: visitor.id }, data: { name } });
  }
  await rememberVisitor(visitor);

  const recent = await db.comment.findMany({
    where: { visitorId: visitor.id },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { text: true, createdAt: true },
  });

  const flood = recent[0] && Date.now() - recent[0].createdAt.getTime() < 2500;
  const rule = flood
    ? { restricted: true, classification: "SPAM" as const, reason: "flood" }
    : moderateByRules(
        text,
        recent.map((c) => c.text)
      );

  let classification: string = rule.classification;
  let visibility = rule.restricted ? "author_only" : "public";

  if (looksLikeQuestion(text) && classification === "NORMAL") {
    classification = "DUVIDA";
  }

  const comment = await db.comment.create({
    data: {
      pageId: page.id,
      visitorId: visitor.id,
      videoTimestamp,
      text,
      classification,
      visibility,
      authorType: "user",
      authorName: visitor.name,
      inboxStatus: visibility === "public" ? "approved" : "restricted",
    },
  });

  await db.moderationLog.create({
    data: {
      commentId: comment.id,
      action: visibility,
      reason: rule.reason || classification,
    },
  });

  const nextStatus = inferLeadStatus(classification, text);
  let leadStatus = visitor.leadStatus;
  if (nextStatus && leadStatus === "new") {
    await db.visitor.update({ where: { id: visitor.id }, data: { leadStatus: nextStatus } });
    leadStatus = nextStatus;
  }

  const visitorId = visitor.id;
  const visitorName = visitor.name;
  after(() =>
    refineInBackground({
      commentId: comment.id,
      pageId: page.id,
      visitorId,
      visitorName,
      text,
      videoTimestamp,
      classification,
      visibility,
      aiEnabled: Boolean(page.settings?.aiEnabled),
      openaiModel: page.settings?.openaiModel || "gpt-4o-mini",
      leadStatus,
    }).catch(() => undefined)
  );

  return Response.json({
    comment: {
      id: comment.id,
      text: comment.text,
      name: visitor.name,
      timestampSec: comment.videoTimestamp,
      mine: true,
      authorType: "user",
    },
    agent: null,
  });
}
