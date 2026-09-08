import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  parseLeadPayload,
  publicOrigin,
  secretsMatch,
  signLeadToken,
  upsertLeadVisitor,
  validLeadEmail,
  webhookSecretFrom,
} from "@/lib/leads";

type Ctx = { params: Promise<{ slug: string }> };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Secret, X-Api-Key",
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: cors });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

async function ingest(request: NextRequest, slug: string, raw: unknown) {
  const page = await db.page.findUnique({
    where: { slug },
    select: { id: true, slug: true, leadWebhookSecret: true },
  });
  if (!page) return json({ error: "Página não encontrada" }, 404);
  if (!page.leadWebhookSecret) {
    return json({ error: "Webhook ainda não configurado nesta live" }, 400);
  }

  const given = webhookSecretFrom(request, raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null);
  if (!secretsMatch(given, page.leadWebhookSecret)) {
    return json({ error: "Segredo inválido" }, 401);
  }

  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = parseLeadPayload({ ...(typeof raw === "object" && raw ? raw : {}), ...query });
  const email = parsed.email.toLowerCase();
  const name = parsed.name;
  if (!validLeadEmail(email) || !name) {
    return json({ error: "Envie nome e e-mail válidos" }, 400);
  }

  const visitor = await upsertLeadVisitor(page.id, name, email, true);
  const token = await signLeadToken(visitor);
  const origin = publicOrigin(request);
  const loginUrl = `${origin}/api/p/${page.slug}/session?s=${encodeURIComponent(token)}&redirect=1`;
  const liveUrl = `${origin}/${page.slug}?s=${encodeURIComponent(token)}`;
  const wantsRedirect = ["1", "true", "yes"].includes((request.nextUrl.searchParams.get("redirect") || "").toLowerCase());

  if (wantsRedirect) {
    return NextResponse.redirect(loginUrl);
  }

  return json({
    ok: true,
    loginUrl,
    liveUrl,
    visitor: { name: visitor.name, email: visitor.email },
  });
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  return ingest(request, slug, null);
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const contentType = request.headers.get("content-type") || "";
  let raw: unknown = null;
  if (contentType.includes("application/json")) {
    raw = await request.json().catch(() => null);
  } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (form) raw = Object.fromEntries(form.entries());
  } else {
    raw = await request.json().catch(() => null);
  }
  return ingest(request, slug, raw);
}
