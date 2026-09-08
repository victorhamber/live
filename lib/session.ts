import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "live_session";

export type VisitorIdentity = {
  sid: string;
  email: string;
  name: string;
};

function secret() {
  const value = process.env.AUTH_SECRET || "dev-secret";
  return new TextEncoder().encode(value);
}

export async function setVisitorIdentity(identity: VisitorIdentity) {
  const token = await new SignJWT({
    sid: identity.sid,
    em: identity.email || "",
    nm: identity.name || "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(identity.sid)
    .setExpirationTime("30d")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function setVisitorSessionId(sessionId: string, extra?: { email?: string; name?: string }) {
  const current = extra?.email || extra?.name ? extra : await readVisitorIdentity();
  await setVisitorIdentity({
    sid: sessionId,
    email: extra?.email || current?.email || "",
    name: extra?.name || current?.name || "",
  });
}

export async function readVisitorIdentity(): Promise<VisitorIdentity | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secret());
    const sid = String(payload.sid || payload.sub || "");
    const email = String(payload.em || "").trim().toLowerCase();
    const name = String(payload.nm || "").trim();
    if (!sid && !email) return null;
    return { sid, email, name };
  } catch {
    if (raw.length > 10) return { sid: raw, email: "", name: "" };
    return null;
  }
}

export async function getVisitorSessionId() {
  const identity = await readVisitorIdentity();
  return identity?.sid || null;
}

export async function readVisitorSessionId() {
  const identity = await readVisitorIdentity();
  return identity?.sid || null;
}

export async function rememberVisitor(visitor: { sessionId: string; email: string; name: string }) {
  await setVisitorIdentity({
    sid: visitor.sessionId,
    email: visitor.email,
    name: visitor.name,
  });
}
