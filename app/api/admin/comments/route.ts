import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

async function guard() {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!(await guard())) return jsonError("Não autorizado", 401);
  const url = request.nextUrl;
  const pageId = url.searchParams.get("pageId") || undefined;
  const visibility = url.searchParams.get("visibility") || "active";
  const q = url.searchParams.get("q") || undefined;

  const comments = await db.comment.findMany({
    where: {
      pageId,
      ...(visibility === "active" || visibility === "all" || !visibility
        ? { visibility: { not: "deleted" } }
        : { visibility }),
      ...(q
        ? {
            OR: [
              { text: { contains: q } },
              { authorName: { contains: q } },
              { visitor: { name: { contains: q } } },
              { visitor: { email: { contains: q } } },
            ],
          }
        : {}),
    },
    include: {
      visitor: true,
      page: { select: { title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 400,
  });

  return Response.json({ comments });
}

export async function PATCH(request: NextRequest) {
  if (!(await guard())) return jsonError("Não autorizado", 401);
  const body = await request.json().catch(() => null);
  const id = String(body?.id || "");
  const visibility = String(body?.visibility || "");
  if (!id || !["public", "author_only", "deleted"].includes(visibility)) {
    return jsonError("Dados inválidos");
  }

  if (visibility === "deleted") {
    await db.moderationLog.deleteMany({ where: { commentId: id } });
    await db.comment.delete({ where: { id } });
    return Response.json({ ok: true, deleted: true });
  }

  const comment = await db.comment.update({
    where: { id },
    data: { visibility },
  });
  await db.moderationLog.create({
    data: { commentId: id, action: visibility, reason: "ação manual do administrador" },
  });
  return Response.json({ comment });
}

export async function DELETE(request: NextRequest) {
  if (!(await guard())) return jsonError("Não autorizado", 401);
  const pageId = request.nextUrl.searchParams.get("pageId") || undefined;
  const result = await db.comment.deleteMany({
    where: {
      pageId,
      visibility: "deleted",
    },
  });
  return Response.json({ ok: true, count: result.count });
}
