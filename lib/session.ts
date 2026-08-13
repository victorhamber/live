import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "live_session";

function secret() {
  const value = process.env.AUTH_SECRET || "dev-secret";
  return new TextEncoder().encode(value);
}

export async function getVisitorSessionId() {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function setVisitorSessionId(sessionId: string) {
  const token = await new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sessionId)
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

export async function readVisitorSessionId() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secret());
    return (payload.sid as string) || payload.sub || null;
  } catch {
    return raw.length > 10 ? raw : null;
  }
}
