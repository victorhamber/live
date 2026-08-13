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
  const interested = request.nextUrl.searchParams.get("interested") === "1";
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const pageId = request.nextUrl.searchParams.get("pageId") || undefined;

  const visitors = await db.visitor.findMany({
    where: {
      pageId,
      leadStatus: interested
        ? { in: ["interested", "objection", "contact"] }
        : status || undefined,
    },
    include: {
      page: { select: { title: true, slug: true } },
      comments: { orderBy: { createdAt: "desc" }, take: 8 },
      notes: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return Response.json({ visitors });
}

export async function PATCH(request: NextRequest) {
  if (!(await guard())) return jsonError("Não autorizado", 401);
  const body = await request.json().catch(() => null);
  const id = String(body?.id || "");
  const leadStatus = String(body?.leadStatus || "");
  const allowed = ["new", "interested", "objection", "contact", "customer", "not_interested"];
  if (!id || !allowed.includes(leadStatus)) return jsonError("Dados inválidos");

  const visitor = await db.visitor.update({ where: { id }, data: { leadStatus } });
  return Response.json({ visitor });
}
