import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonError, parseTranscript, slugify } from "@/lib/utils";
import { dropOrphanAgentReplies } from "@/lib/scripted-replies";
import { isPageTemplate } from "@/lib/templates";
import { ensureLeadWebhookSecret } from "@/lib/leads";
import { nextPageStatus } from "@/lib/pages";

async function guard() {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!(await guard())) return jsonError("Não autorizado", 401);
  const { id } = await ctx.params;
  await dropOrphanAgentReplies(id);
  const page = await db.page.findUnique({
    where: { id },
    include: {
      agent: true,
      knowledgeBase: true,
      settings: true,
      links: true,
      actions: true,
      transcript: { orderBy: { timestampSec: "asc" } },
      commentEvents: { orderBy: { timestampSec: "asc" } },
    },
  });
  if (!page) return jsonError("Página não encontrada", 404);
  const leadWebhookSecret = await ensureLeadWebhookSecret(page.id, page.leadWebhookSecret);
  return Response.json({ page: { ...page, leadWebhookSecret } });
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  if (!(await guard())) return jsonError("Não autorizado", 401);
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body) return jsonError("JSON inválido");

  const current = await db.page.findUnique({ where: { id } });
  if (!current) return jsonError("Página não encontrada", 404);

  let slug = current.slug;
  if (body.slug) {
    slug = slugify(String(body.slug)) || current.slug;
    if (slug !== current.slug) {
      const clash = await db.page.findUnique({ where: { slug } });
      if (clash) return jsonError("Slug já existe");
    }
  }

  const template = isPageTemplate(body.template) ? body.template : current.template;
  const customHtml = body.customHtml != null ? String(body.customHtml) : current.customHtml;
  const status = nextPageStatus({
    template,
    customHtml,
    requested: body.status != null ? String(body.status) : current.status,
    current: current.status,
  });

  const page = await db.page.update({
    where: { id },
    data: {
      title: body.title ?? current.title,
      slug,
      status,
      mode: body.mode ?? current.mode,
      videoTitle: body.videoTitle ?? current.videoTitle,
      channelName: body.channelName ?? current.channelName,
      channelHandle: body.channelHandle ?? current.channelHandle,
      channelAvatar: body.channelAvatar ?? current.channelAvatar,
      description: body.description ?? current.description,
      brandName: body.brandName ?? current.brandName,
      vturbPlayerId: body.vturbPlayerId ?? current.vturbPlayerId,
      vturbScriptUrl: body.vturbScriptUrl ?? current.vturbScriptUrl,
      thumbnailUrl: body.thumbnailUrl ?? current.thumbnailUrl,
      language: body.language ?? current.language,
      viewersBase: Number(body.viewersBase ?? current.viewersBase),
      chatNote: body.chatNote ?? current.chatNote,
      aiInstructions: body.aiInstructions ?? current.aiInstructions,
      template,
      ctaLabel: body.ctaLabel != null ? String(body.ctaLabel) : current.ctaLabel,
      ctaUrl: body.ctaUrl != null ? String(body.ctaUrl) : current.ctaUrl,
      customHtml,
      leadWebhookSecret:
        typeof body.leadWebhookSecret === "string" && body.leadWebhookSecret.trim()
          ? body.leadWebhookSecret.trim()
          : current.leadWebhookSecret || (await ensureLeadWebhookSecret(current.id, current.leadWebhookSecret)),
      agent: {
        upsert: {
          create: {
            name: body.agentName || "Suporte",
            avatar: body.agentAvatar || "SP",
            personality: body.agentPersonality || "técnico/comercial",
            goal: body.agentGoal || "responder dúvidas",
            enabled: body.agentEnabled !== false,
          },
          update: {
            name: body.agentName ?? undefined,
            avatar: body.agentAvatar ?? undefined,
            personality: body.agentPersonality ?? undefined,
            goal: body.agentGoal ?? undefined,
            enabled: body.agentEnabled ?? undefined,
          },
        },
      },
      knowledgeBase: {
        upsert: {
          create: { content: body.knowledge || "" },
          update: { content: body.knowledge ?? undefined },
        },
      },
      settings: {
        upsert: {
          create: {
            aiEnabled: body.aiEnabled ?? true,
            autoGenerateEnabled: body.autoGenerateEnabled ?? true,
            agentReplyEnabled: body.agentReplyEnabled ?? true,
            maxMessagesPerMinute: Number(body.maxMessagesPerMinute ?? 6),
            minIntervalSec: Number(body.minIntervalSec ?? 8),
            creativity: Number(body.creativity ?? 0.7),
            allowedCommentTypes: body.allowedCommentTypes || "question,objection,benefit,testimonial,filler",
            openaiModel: body.openaiModel || "gpt-4o-mini",
            temperature: Number(body.temperature ?? 0.7),
            dailyApiLimit: Number(body.dailyApiLimit ?? 100),
          },
          update: {
            aiEnabled: body.aiEnabled ?? undefined,
            autoGenerateEnabled: body.autoGenerateEnabled ?? undefined,
            agentReplyEnabled: body.agentReplyEnabled ?? undefined,
            maxMessagesPerMinute: body.maxMessagesPerMinute != null ? Number(body.maxMessagesPerMinute) : undefined,
            minIntervalSec: body.minIntervalSec != null ? Number(body.minIntervalSec) : undefined,
            creativity: body.creativity != null ? Number(body.creativity) : undefined,
            allowedCommentTypes: body.allowedCommentTypes ?? undefined,
            openaiModel: body.openaiModel ?? undefined,
            temperature: body.temperature != null ? Number(body.temperature) : undefined,
            dailyApiLimit: body.dailyApiLimit != null ? Number(body.dailyApiLimit) : undefined,
          },
        },
      },
    },
  });

  if (typeof body.transcriptRaw === "string") {
    const segments = parseTranscript(body.transcriptRaw);
    await db.transcriptSegment.deleteMany({ where: { pageId: id } });
    if (segments.length) {
      await db.transcriptSegment.createMany({
        data: segments.map((s) => ({ pageId: id, timestampSec: s.timestampSec, text: s.text })),
      });
    }
  }

  if (Array.isArray(body.links)) {
    await db.agentLink.deleteMany({ where: { pageId: id } });
    const links = body.links.filter((l: { label?: string; url?: string }) => l.label && l.url);
    if (links.length) {
      await db.agentLink.createMany({
        data: links.map((l: { label: string; url: string }) => ({
          pageId: id,
          label: String(l.label),
          url: String(l.url),
        })),
      });
    }
  }

  if (Array.isArray(body.actions)) {
    await db.agentAction.deleteMany({ where: { pageId: id } });
    const actions = body.actions.filter((a: { key?: string; label?: string; url?: string }) => a.key && a.url);
    if (actions.length) {
      await db.agentAction.createMany({
        data: actions.map((a: { key: string; label: string; url: string }) => ({
          pageId: id,
          key: String(a.key).replace(/^\//, ""),
          label: String(a.label || a.key),
          url: String(a.url),
        })),
      });
    }
  }

  return Response.json({ page });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await guard())) return jsonError("Não autorizado", 401);
  const { id } = await ctx.params;
  await db.page.delete({ where: { id } });
  return Response.json({ ok: true });
}
