import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/utils";
import { readVisitorSessionId } from "@/lib/session";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const page = await db.page.findUnique({ where: { slug } });
  if (!page || page.status !== "published") return jsonError("Página não encontrada", 404);

  const sessionId = await readVisitorSessionId();
  const visitor = sessionId
    ? await db.visitor.findFirst({ where: { pageId: page.id, sessionId } })
    : null;

  return Response.json({
    visitor: visitor ? { name: visitor.name, email: visitor.email } : null,
  });
}
