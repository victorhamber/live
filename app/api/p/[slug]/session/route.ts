import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/utils";
import { readVisitorSessionId, setVisitorSessionId } from "@/lib/session";
import { claimPageVisitor, parseLeadPayload, publicOrigin, validLeadEmail } from "@/lib/leads";

type Ctx = { params: Promise<{ slug: string }> };

async function publishedPage(slug: string) {
  const page = await db.page.findUnique({ where: { slug } });
  if (!page || page.status !== "published") return null;
  return page;
}

function visitorJson(visitor: { name: string; email: string } | null) {
  return visitor ? { name: visitor.name, email: visitor.email } : null;
}

async function applyClaim(
  pageId: string,
  token: string,
  parsed: { email: string; name: string }
) {
  try {
    return await claimPageVisitor(pageId, token, parsed);
  } catch (error) {
    if (error instanceof Error && error.message === "other-page") {
      throw error;
    }
    throw new Error("invalid-token");
  }
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const page = await publishedPage(slug);
  if (!page) return jsonError("Página não encontrada", 404);

  const sp = request.nextUrl.searchParams;
  const token = (sp.get("s") || sp.get("lead") || "").trim();
  const parsed = parseLeadPayload(Object.fromEntries(sp.entries()));
  const wantsRedirect = ["1", "true", "live"].includes((sp.get("redirect") || "").toLowerCase());

  if (token || (validLeadEmail(parsed.email) && parsed.name)) {
    try {
      const visitor = await applyClaim(page.id, token, parsed);
      if (!visitor) {
        return jsonError(token ? "Token inválido ou expirado" : "Não foi possível identificar o visitante", 400);
      }
      await setVisitorSessionId(visitor.sessionId);
      if (wantsRedirect) {
        return NextResponse.redirect(`${publicOrigin(request)}/${page.slug}`);
      }
      return Response.json({ ok: true, visitor: visitorJson(visitor) });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "other-page") return jsonError("Token de outra sala", 400);
      return jsonError("Token inválido ou expirado", 400);
    }
  }

  const sessionId = await readVisitorSessionId();
  const visitor = sessionId
    ? await db.visitor.findFirst({ where: { pageId: page.id, sessionId } })
    : null;

  return Response.json({ visitor: visitorJson(visitor) });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const page = await publishedPage(slug);
  if (!page) return jsonError("Página não encontrada", 404);

  const body = await request.json().catch(() => ({}));
  const token = String(body?.token || body?.s || "").trim();
  const parsed = parseLeadPayload(body);

  try {
    const visitor = await applyClaim(page.id, token, parsed);
    if (!visitor) return jsonError("Não foi possível identificar o visitante", 400);
    await setVisitorSessionId(visitor.sessionId);
    return Response.json({
      ok: true,
      visitor: visitorJson(visitor),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "other-page") return jsonError("Token de outra sala", 400);
    return jsonError("Token inválido ou expirado", 400);
  }
}
