import { readSiteLogo } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function GET() {
  const logo = await readSiteLogo();
  if (!logo) return new Response(null, { status: 404 });
  return new Response(logo.bytes, {
    headers: {
      "Content-Type": logo.mimeType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
