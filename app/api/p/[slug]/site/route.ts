import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { buildCustomHtml } from "@/lib/custom-site";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const page = await db.page.findUnique({
    where: { slug },
    include: { agent: true, actions: true },
  });
  if (!page || page.status !== "published" || page.template !== "custom") {
    return new Response("Não encontrado", { status: 404 });
  }

  const html = buildCustomHtml({
    slug: page.slug,
    title: page.title,
    videoTitle: page.videoTitle,
    description: page.description,
    brandName: page.brandName,
    customHtml: page.customHtml,
    vturbPlayerId: page.vturbPlayerId,
    vturbScriptUrl: page.vturbScriptUrl,
    ctaLabel: page.ctaLabel,
    ctaUrl: page.ctaUrl,
    viewersBase: page.viewersBase,
    chatNote: page.chatNote,
    channelAvatar: page.channelAvatar,
    agent: page.agent,
    actions: page.actions,
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
