import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/utils";
import { readVisitorIdentity, rememberVisitor } from "@/lib/session";
import { claimPageVisitor, parseLeadPayload, publicOrigin, validLeadEmail, visitorForPage } from "@/lib/leads";
import { pageIsViewable } from "@/lib/pages";

type Ctx = { params: Promise<{ slug: string }> };

async function viewablePage(slug: string) {
  const page = await db.page.findUnique({ where: { slug } });
  if (!page || !pageIsViewable(page)) return null;
  return page;
}

function visitorJson(visitor: { name: string; email: string } | null) {
  return visitor ? { name: visitor.name, email: visitor.email } : null;
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const page = await viewablePage(slug);
  if (!page) return jsonError("Página não encontrada", 404);

  const sp = request.nextUrl.searchParams;
  const token = (sp.get("s") || sp.get("lead") || "").trim();
  const parsed = parseLeadPayload(Object.fromEntries(sp.entries()));
  const wantsRedirect = ["1", "true", "live"].includes((sp.get("redirect") || "").toLowerCase());

  if (token || validLeadEmail(parsed.email)) {
    try {
      const visitor = await claimPageVisitor(page.id, token, {
        email: parsed.email,
        name: parsed.name || parsed.email.split("@")[0] || "Visitante",
      });
      if (!visitor) {
        return jsonError(token ? "Token inválido ou expirado" : "Não foi possível identificar o visitante", 400);
      }
      await rememberVisitor(visitor);
      if (wantsRedirect) {
        return NextResponse.redirect(`${publicOrigin(request)}/${page.slug}`);
      }
      return Response.json({ ok: true, visitor: visitorJson(visitor) });
    } catch {
      return jsonError("Token inválido ou expirado", 400);
    }
  }

  const identity = await readVisitorIdentity();
  const visitor = identity ? await visitorForPage(page.id, identity) : null;
  if (visitor) await rememberVisitor(visitor);

  return Response.json({ visitor: visitorJson(visitor) });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const page = await viewablePage(slug);
  if (!page) return jsonError("Página não encontrada", 404);

  const body = await request.json().catch(() => ({}));
  const token = String(body?.token || body?.s || "").trim();
  const parsed = parseLeadPayload(body);

  try {
    const visitor = await claimPageVisitor(page.id, token, parsed);
    if (!visitor) {
      const identity = await readVisitorIdentity();
      const fromCookie = identity ? await visitorForPage(page.id, identity) : null;
      if (!fromCookie) return jsonError("Não foi possível identificar o visitante", 400);
      await rememberVisitor(fromCookie);
      return Response.json({ ok: true, visitor: visitorJson(fromCookie) });
    }
    await rememberVisitor(visitor);
    return Response.json({
      ok: true,
      visitor: visitorJson(visitor),
    });
  } catch {
    return jsonError("Token inválido ou expirado", 400);
  }
}
