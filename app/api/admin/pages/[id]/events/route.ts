import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { rebuildScriptedAgentReplies, deleteScriptedEventAndReplies, dropOrphanAgentReplies } from "@/lib/scripted-replies";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Não autorizado", 401);
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const action = String(body?.action || "");
  const page = await db.page.findUnique({ where: { id }, select: { id: true } });
  if (!page) return jsonError("Página não encontrada", 404);

  if (action === "delete") {
    const eventId = String(body?.eventId || "");
    if (!eventId) return jsonError("Evento inválido");
    const event = await db.commentEvent.findFirst({ where: { id: eventId, pageId: id } });
    if (!event) return jsonError("Evento não encontrado", 404);
    await deleteScriptedEventAndReplies(id, eventId);
    await dropOrphanAgentReplies(id);
    const commentEvents = await db.commentEvent.findMany({
      where: { pageId: id },
      orderBy: { timestampSec: "asc" },
    });
    return Response.json({ ok: true, commentEvents });
  }

  if (action === "replies") {
    try {
      const replies = await rebuildScriptedAgentReplies(id);
      return Response.json({ ok: true, replies });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Falha ao gerar respostas");
    }
  }

  return jsonError("Ação inválida");
}
