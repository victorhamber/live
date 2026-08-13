import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { getAppSettings, isMaskedKey, maskApiKey } from "@/lib/settings";
import { db } from "@/lib/db";

async function guard() {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

export async function GET() {
  if (!(await guard())) return jsonError("Não autorizado", 401);
  const settings = await getAppSettings();
  return Response.json({
    openaiApiKey: maskApiKey(settings.openaiApiKey),
    openaiModel: settings.openaiModel,
    hasKey: Boolean(settings.openaiApiKey.trim()),
  });
}

export async function PUT(request: NextRequest) {
  if (!(await guard())) return jsonError("Não autorizado", 401);
  const body = await request.json().catch(() => null);
  const current = await getAppSettings();

  let openaiApiKey = current.openaiApiKey;
  if (typeof body?.openaiApiKey === "string") {
    const next = body.openaiApiKey.trim();
    if (next && !isMaskedKey(next)) {
      openaiApiKey = next;
    }
  }

  const openaiModel =
    typeof body?.openaiModel === "string" && body.openaiModel.trim()
      ? body.openaiModel.trim()
      : current.openaiModel;

  const settings = await db.appSettings.update({
    where: { id: current.id },
    data: { openaiApiKey, openaiModel },
  });

  return Response.json({
    openaiApiKey: maskApiKey(settings.openaiApiKey),
    openaiModel: settings.openaiModel,
    hasKey: Boolean(settings.openaiApiKey.trim()),
  });
}
