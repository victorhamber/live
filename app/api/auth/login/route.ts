import { NextRequest } from "next/server";
import { createAdminSession, verifyAdminCredentials } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { ensureAdmin } from "@/lib/ensure-admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "");
  const password = String(body?.password || "");
  if (!email || !password) return jsonError("Informe e-mail e senha");

  await ensureAdmin();

  const user = await verifyAdminCredentials(email, password);
  if (!user) return jsonError("Credenciais inválidas", 401);

  await createAdminSession(user.id, user.email);
  return Response.json({ ok: true });
}
