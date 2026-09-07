import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import {
  clearCustomFiles,
  customSiteRoot,
  extractCustomZip,
  findIndexHtml,
  isAllowedCustomFile,
  listCustomFiles,
  writeCustomFile,
} from "@/lib/custom-site";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function guard() {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  if (!(await guard())) return jsonError("Não autorizado", 401);
  const { id } = await ctx.params;
  const page = await db.page.findUnique({ where: { id }, select: { id: true, customHtml: true } });
  if (!page) return jsonError("Página não encontrada", 404);
  return Response.json({ customHtml: page.customHtml, files: listCustomFiles(id) });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  if (!(await guard())) return jsonError("Não autorizado", 401);
  const { id } = await ctx.params;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) return jsonError("Página não encontrada", 404);

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError("Envie o arquivo em multipart");

  if (String(form.get("action") || "") === "clear") {
    clearCustomFiles(id);
    return Response.json({ ok: true, files: [], customHtml: page.customHtml });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Selecione um HTML ou um ZIP");
  if (file.size > 20 * 1024 * 1024) return jsonError("Arquivo maior que 20 MB");

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith(".zip")) {
      const files = extractCustomZip(id, buffer);
      const indexName = findIndexHtml(files);
      let customHtml = page.customHtml;
      if (indexName) {
        customHtml = fs.readFileSync(path.join(customSiteRoot(id), indexName), "utf8");
        await db.page.update({
          where: { id },
          data: { customHtml, template: "custom" },
        });
      } else {
        await db.page.update({ where: { id }, data: { template: "custom" } });
      }
      return Response.json({ ok: true, files, customHtml, index: indexName });
    }

    if (!isAllowedCustomFile(name) || !(name.endsWith(".html") || name.endsWith(".htm"))) {
      return jsonError("Envie um arquivo .html ou .zip");
    }
    if (buffer.length > 1.5 * 1024 * 1024) return jsonError("HTML maior que 1,5 MB");
    const customHtml = buffer.toString("utf8");
    writeCustomFile(id, file.name.replace(/\\/g, "/").split("/").pop() || "index.html", buffer);
    await db.page.update({
      where: { id },
      data: { customHtml, template: "custom" },
    });
    return Response.json({ ok: true, files: listCustomFiles(id), customHtml });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Falha ao importar o site");
  }
}
