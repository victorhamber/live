"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erro ao criar");
      return;
    }
    router.push(`/admin/pages/${data.page.id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">Nova página</h1>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <label className="grid gap-1 text-sm">
          Título
          <input
            className="rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          Slug (opcional)
          <input
            className="rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="minha-live"
          />
        </label>
        {error ? <p className="text-sm text-[#f87171]">{error}</p> : null}
        <button className="rounded-lg bg-[#3ea6ff] px-4 py-2 font-medium text-[#0f1115]">Criar</button>
      </form>
    </div>
  );
}
