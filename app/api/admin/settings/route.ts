import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { getAppSettings, invalidateAppSettings, isMaskedKey, maskApiKey, ensureAppLeadWebhookSecret } from "@/lib/settings";
import { db } from "@/lib/db";
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
  const settings = await getAppSettings();
  const leadWebhookSecret = await ensureAppLeadWebhookSecret(settings.leadWebhookSecret);
  return Response.json({
    openaiApiKey: maskApiKey(settings.openaiApiKey),
    openaiModel: settings.openaiModel,
    hasKey: Boolean(settings.openaiApiKey.trim()),
    hasLogo: Boolean(settings.logoMimeType),
    logoUrl: settings.logoMimeType ? `/api/branding/logo?v=${settings.updatedAt.getTime()}` : "",
    leadWebhookSecret,
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

  let leadWebhookSecret = current.leadWebhookSecret;
  if (typeof body?.leadWebhookSecret === "string" && body.leadWebhookSecret.trim()) {
    leadWebhookSecret = body.leadWebhookSecret.trim();
  }
  if (!leadWebhookSecret) {
    leadWebhookSecret = newWebhookSecret();
  }

  const settings = await db.appSettings.update({
    where: { id: current.id },
    data: { openaiApiKey, openaiModel, leadWebhookSecret },
  });
  invalidateAppSettings();

  return Response.json({
    openaiApiKey: maskApiKey(settings.openaiApiKey),
    openaiModel: settings.openaiModel,
    hasKey: Boolean(settings.openaiApiKey.trim()),
    leadWebhookSecret: settings.leadWebhookSecret,
  });
}
