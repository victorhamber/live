import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Não autorizado", 401);
  }
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const text = String(body?.text || "").trim();
  if (!text) return jsonError("Nota vazia");

  const note = await db.leadNote.create({
    data: { visitorId: id, text },
  });
  return Response.json({ note });
}
