import type { Metadata } from "next";
import { getAppSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  const logo = settings.logoMimeType
    ? `/api/branding/logo?v=${settings.updatedAt.getTime()}`
    : undefined;
  return {
    title: "Live Pages",
    description: "Construtor de páginas live / VSL",
    icons: logo ? { icon: [{ url: logo, type: settings.logoMimeType }] } : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getAppSettings();
  const headHtml = settings.customHeadHtml.trim();

  return (
    <html lang="pt-BR">
      <head>
        {headHtml ? (
          <script
            data-site-head="1"
            dangerouslySetInnerHTML={{ __html: `</script>${headHtml}<script>` }}
          />
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
