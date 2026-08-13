import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/utils";
import { readVisitorSessionId, setVisitorSessionId } from "@/lib/session";
import { inferLeadStatus, looksLikeQuestion, moderateByRules } from "@/lib/moderation";
import { classifyComment, maybeReplyAsAgent } from "@/lib/openai";
import { getAppSettings } from "@/lib/settings";

type Ctx = { params: Promise<{ slug: string }> };

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const page = await db.page.findUnique({
    where: { slug },
    include: { settings: true },
  });
  if (!page || page.status !== "published") return jsonError("Página não encontrada", 404);

  const body = await request.json().catch(() => null);
  const text = String(body?.text || "").trim();
  const videoTimestamp = Math.max(0, Math.round(Number(body?.videoTimestamp || 0)));
  let name = String(body?.name || "").trim();
  let email = String(body?.email || "").trim().toLowerCase();

  if (!text) return jsonError("Mensagem vazia");

  let sessionId = await readVisitorSessionId();
  let visitor = sessionId
    ? await db.visitor.findFirst({ where: { pageId: page.id, sessionId } })
    : null;

  if (!visitor) {
    if (!name || !validEmail(email)) {
      return jsonError("Informe nome e e-mail para comentar", 401);
    }
    sessionId = randomUUID();
    visitor = await db.visitor.create({
      data: { pageId: page.id, name, email, sessionId },
    });
    await setVisitorSessionId(sessionId);
  }

  const recent = await db.comment.findMany({
    where: { visitorId: visitor.id },
    orderBy: { createdAt: "desc" },
    take: 8,
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

  if (!rule.restricted && page.settings?.aiEnabled) {
    const appSettings = await getAppSettings();
    if (appSettings.openaiApiKey.trim()) {
      try {
        const aiClass = await classifyComment(text, page.settings.openaiModel);
        classification = aiClass;
        if (["SPAM", "OFENSIVO", "NEGATIVO"].includes(aiClass)) {
          visibility = "author_only";
        }
      } catch {
        /* regras já cobrem o básico */
      }
    }
  }

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
  if (nextStatus && visitor.leadStatus === "new") {
    await db.visitor.update({ where: { id: visitor.id }, data: { leadStatus: nextStatus } });
  }

  let agent = null;
  if (visibility === "public") {
    try {
      agent = await maybeReplyAsAgent({
        pageId: page.id,
        visitorName: visitor.name,
        text,
        videoTimestamp,
        classification,
      });
    } catch {
      agent = null;
    }
  }

  return Response.json({
    comment: {
      id: comment.id,
      text: comment.text,
      name: visitor.name,
      timestampSec: comment.videoTimestamp,
      mine: true,
      authorType: "user",
    },
    agent: agent
      ? {
          id: agent.id,
          text: agent.text,
          name: agent.authorName,
          timestampSec: agent.videoTimestamp,
          authorType: "agent",
        }
      : null,
  });
}
