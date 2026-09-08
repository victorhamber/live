import Link from "next/link";
import { db } from "@/lib/db";
import { getPageTemplate } from "@/lib/templates";
import { pageIsViewable } from "@/lib/pages";

export default async function AdminHome() {
  const pages = await db.page.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { comments: true, visitors: true, commentEvents: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Páginas</h1>
          <p className="text-sm text-[#9aa0a6]">Crie lives/VSL com chat sincronizado</p>
        </div>
        <Link href="/admin/pages/new" className="rounded-lg bg-[#3ea6ff] px-4 py-2 font-medium text-[#0f1115]">
          Nova página
        </Link>
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-[#2a2f3a]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#171a21] text-[#9aa0a6]">
            <tr>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Modelo</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Modo</th>
              <th className="px-4 py-3 font-medium">Chat</th>
              <th className="px-4 py-3 font-medium">Funil</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#9aa0a6]">
                  Nenhuma página ainda. Crie a primeira.
                </td>
              </tr>
            ) : (
              pages.map((p) => (
                <tr key={p.id} className="border-t border-[#2a2f3a]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pages/${p.id}`} className="font-medium text-[#3ea6ff]">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#9aa0a6]">{getPageTemplate(p.template).name}</td>
                  <td className="px-4 py-3 text-[#9aa0a6]">
                    {pageIsViewable(p) ? (
                      <a className="underline" href={`/${p.slug}`} target="_blank" rel="noreferrer">
                        /{p.slug}
                      </a>
                    ) : (
                      `/${p.slug}`
                    )}
                  </td>
                  <td className="px-4 py-3">{p.status === "published" ? "Publicada" : "Rascunho"}</td>
                  <td className="px-4 py-3">{p.mode === "real" ? "Real" : "Simulação"}</td>
                  <td className="px-4 py-3 text-[#9aa0a6]">
                    {p._count.comments} reais · {p._count.commentEvents} IA · {p._count.visitors} usuários
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/pages/${p.id}/stats`} className="text-[#3ea6ff]">
                      Estatísticas
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
