import { NextRequest } from "next/server";
import fs from "fs";
import { db } from "@/lib/db";
import { mimeFor, safeCustomFile } from "@/lib/custom-site";

type Ctx = { params: Promise<{ slug: string; path: string[] }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug, path: parts } = await ctx.params;
  const page = await db.page.findUnique({
    where: { slug },
    select: { id: true, status: true, template: true },
  });
  if (!page || page.status !== "published" || page.template !== "custom") {
    return new Response("Não encontrado", { status: 404 });
  }

  const full = safeCustomFile(page.id, parts.join("/"));
  if (!full || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
    return new Response("Não encontrado", { status: 404 });
  }

  const body = fs.readFileSync(full);
  return new Response(body, {
    headers: {
      "Content-Type": mimeFor(full),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
