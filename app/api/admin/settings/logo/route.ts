import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { db } from "@/lib/db";
import { getAppSettings } from "@/lib/settings";
import { saveSiteLogo } from "@/lib/branding";

const ALLOWED: Record<string, string> = {
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/webp": "image/webp",
  "image/svg+xml": "image/svg+xml",
  "image/x-icon": "image/x-icon",
  "image/vnd.microsoft.icon": "image/x-icon",
};

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("Não autorizado", 401);
  }

  const form = await request.formData();
  const file = form.get("logo");
  if (!(file instanceof File) || file.size < 1) {
    return jsonError("Envie um arquivo de imagem");
  }
  if (file.size > 2 * 1024 * 1024) {
    return jsonError("A logo deve ter no máximo 2 MB");
  }

  const mime = ALLOWED[file.type];
  if (!mime) {
    return jsonError("Use PNG, JPG, WEBP, SVG ou ICO");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await saveSiteLogo(buffer, mime);
  const current = await getAppSettings();
  await db.appSettings.update({
    where: { id: current.id },
    data: { logoMimeType: mime },
  });

  return Response.json({ ok: true, hasLogo: true });
}
