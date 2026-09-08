import { NextRequest } from "next/server";
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
import { getAppSettings } from "@/lib/settings";
import { randomUUID } from "crypto";

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

async function ingest(request: NextRequest, raw: unknown) {
  const settings = await getAppSettings();
  if (!settings.leadWebhookSecret) {
    return json({ error: "Webhook ainda não configurado em Configurações" }, 400);
  }

  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const given = webhookSecretFrom(request, body);
  if (!secretsMatch(given, settings.leadWebhookSecret)) {
    return json({ error: "Segredo inválido" }, 401);
  }

  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = parseLeadPayload({ ...(body || {}), ...query });
  const email = parsed.email.toLowerCase();
  const name = parsed.name;
  if (!validLeadEmail(email) || !name) {
    return json({ error: "Envie nome e e-mail válidos" }, 400);
  }

  const slug = String(query.page || query.slug || body?.page || body?.slug || "").trim();
  let visitor: { sessionId: string; email: string; name: string; pageId?: string } = {
    sessionId: randomUUID(),
    email,
    name,
  };
  if (slug) {
    const page = await db.page.findUnique({ where: { slug }, select: { id: true, slug: true } });
    if (page) {
      const saved = await upsertLeadVisitor(page.id, name, email, true);
      visitor = saved;
    }
  }

  const token = await signLeadToken(visitor);
  const origin = publicOrigin(request);
  return json({
    ok: true,
    visitor: { name, email },
    token,
    origin,
  });
}

export async function GET(request: NextRequest) {
  return ingest(request, null);
}

export async function POST(request: NextRequest) {
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
  return ingest(request, raw);
}
