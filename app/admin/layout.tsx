import Link from "next/link";
import { getAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/admin/LogoutButton";
import "../globals.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/login");

  return (
    <div className="min-h-screen">
      <style
        dangerouslySetInnerHTML={{
          __html:
            "button:not(:disabled),a,select{cursor:pointer!important}button:disabled{cursor:not-allowed!important}",
        }}
      />
      <aside className="fixed inset-y-0 left-0 z-20 w-60 border-r border-[#2a2f3a] bg-[#12151b] p-4">
        <Link href="/admin" className="block text-lg font-semibold">
          Live Pages
        </Link>
        <p className="mt-1 truncate text-xs text-[#9aa0a6]">{admin.email}</p>
        <nav className="mt-8 grid gap-1 text-sm">
          <Link className="rounded-lg px-3 py-2 hover:bg-[#1d222c]" href="/admin">
            Páginas
          </Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-[#1d222c]" href="/admin/comments">
            Comentários
          </Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-[#1d222c]" href="/admin/leads">
            Leads
          </Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-[#1d222c]" href="/admin/settings">
            Configurações
          </Link>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <LogoutButton />
        </div>
      </aside>
      <div className="relative z-10 ml-60 p-6">{children}</div>
    </div>
  );
}
