import { randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

function jwtSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
}

export function newWebhookSecret() {
  return randomBytes(24).toString("hex");
}

export function secretsMatch(given: string, expected: string) {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function publicOrigin(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`.replace(/\/$/, "");
}

function flatten(source: unknown, into: Record<string, unknown> = {}) {
  if (!source || typeof source !== "object") return into;
  if (Array.isArray(source)) {
    for (const item of source) {
      if (item && typeof item === "object") {
        const rec = item as Record<string, unknown>;
        const key = String(rec.name || rec.key || rec.field || rec.label || "").trim();
        const value = rec.value ?? rec.val ?? rec.answer;
        if (key && value != null && typeof value !== "object") {
          into[key.toLowerCase()] = value;
          continue;
        }
        flatten(item, into);
      }
    }
    return into;
  }
  const rec = source as Record<string, unknown>;
  for (const [key, value] of Object.entries(rec)) {
    if (value && typeof value === "object") {
      flatten(value, into);
      continue;
    }
    into[key.toLowerCase()] = value;
  }
  return into;
}

function pick(map: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = map[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function prettyName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (/[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(trimmed)) return trimmed;
  return trimmed.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

export function parseLeadPayload(input: unknown) {
  const map = flatten(input);
  const email = pick(map, ["email", "e-mail", "e_mail", "mail", "email_address", "emailaddress"]).toLowerCase();
  const first = pick(map, ["first_name", "firstname", "primeiro_nome", "primeironome", "fn"]);
  const last = pick(map, ["last_name", "lastname", "sobrenome", "ultimonome", "ln"]);
  const name = prettyName(
    pick(map, ["full_name", "fullname", "nome_completo", "nomecompleto", "nome"]) ||
      [first, last].filter(Boolean).join(" ").trim() ||
      pick(map, ["name"])
  );
  return { email, name };
}

export function validLeadEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function upsertLeadVisitor(pageId: string, name: string, email: string, fromWebhook = false) {
  const existing = await db.visitor.findFirst({
    where: { pageId, email },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    return db.visitor.update({
      where: { id: existing.id },
      data: {
        name: name || existing.name,
        leadStatus: existing.leadStatus === "new" && fromWebhook ? "interested" : existing.leadStatus,
      },
    });
  }
  return db.visitor.create({
    data: {
      pageId,
      name,
      email,
      sessionId: randomUUID(),
      leadStatus: fromWebhook ? "interested" : "new",
    },
  });
}

export async function signLeadToken(visitor: { sessionId: string; email: string; pageId: string }) {
  return new SignJWT({ sid: visitor.sessionId, em: visitor.email, pid: visitor.pageId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(jwtSecret());
}

export async function readLeadToken(token: string) {
  const { payload } = await jwtVerify(token, jwtSecret());
  return {
    sessionId: String(payload.sid || payload.sub || ""),
    email: String(payload.em || ""),
    pageId: String(payload.pid || ""),
  };
}

export function webhookSecretFrom(request: NextRequest, body: Record<string, unknown> | null) {
  const header = request.headers.get("authorization") || "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  return (
    bearer ||
    request.headers.get("x-webhook-secret") ||
    request.headers.get("x-api-key") ||
    request.nextUrl.searchParams.get("secret") ||
    String(body?.secret || "")
  );
}

export async function ensureLeadWebhookSecret(pageId: string, current?: string | null) {
  if (current) return current;
  const secret = newWebhookSecret();
  await db.page.update({ where: { id: pageId }, data: { leadWebhookSecret: secret } });
  return secret;
}

export async function claimPageVisitor(
  pageId: string,
  token: string,
  parsed: { email: string; name: string }
) {
  if (token) {
    const claim = await readLeadToken(token);
    if (claim.pageId && claim.pageId !== pageId) {
      throw new Error("other-page");
    }
    let visitor = claim.sessionId
      ? await db.visitor.findFirst({ where: { pageId, sessionId: claim.sessionId } })
      : null;
    if (!visitor && claim.email) {
      visitor = await db.visitor.findFirst({
        where: { pageId, email: claim.email },
        orderBy: { createdAt: "asc" },
      });
    }
    return visitor;
  }
  if (validLeadEmail(parsed.email) && parsed.name) {
    return upsertLeadVisitor(pageId, parsed.name, parsed.email, false);
  }
  return null;
}
