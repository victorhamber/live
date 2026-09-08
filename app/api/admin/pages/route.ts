import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonError, slugify } from "@/lib/utils";
import { newWebhookSecret } from "@/lib/leads";

async function guard() {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

export async function GET() {
  if (!(await guard())) return jsonError("Não autorizado", 401);
  const pages = await db.page.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { comments: true, visitors: true, commentEvents: true } },
    },
  });
  return Response.json({ pages });
}

export async function POST(request: NextRequest) {
  if (!(await guard())) return jsonError("Não autorizado", 401);
  const body = await request.json().catch(() => null);
  const title = String(body?.title || "").trim();
  if (!title) return jsonError("Título obrigatório");

  let slug = slugify(String(body?.slug || title));
  if (!slug) slug = `pagina-${Date.now()}`;

  const exists = await db.page.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString().slice(-4)}`;

  const page = await db.page.create({
    data: {
      title,
      slug,
      leadWebhookSecret: newWebhookSecret(),
      agent: { create: { name: "Suporte" } },
      knowledgeBase: { create: { content: "" } },
      settings: { create: {} },
    },
  });
  return Response.json({ page });
}
