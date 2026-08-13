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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
