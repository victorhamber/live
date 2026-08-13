"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@local.test");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Falha no login");
      return;
    }
    router.push(params.get("next") || "/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-[#2a2f3a] bg-[#171a21] p-6 shadow-xl"
      >
        <p className="text-sm text-[#9aa0a6]">Painel</p>
        <h1 className="mt-1 text-2xl font-semibold">Live Pages</h1>
        <label className="mt-6 block text-sm text-[#9aa0a6]">E-mail</label>
        <input
          className="mt-1 w-full rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 outline-none focus:border-[#3ea6ff]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <label className="mt-4 block text-sm text-[#9aa0a6]">Senha</label>
        <input
          className="mt-1 w-full rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 outline-none focus:border-[#3ea6ff]"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />
        {error ? <p className="mt-3 text-sm text-[#f87171]">{error}</p> : null}
        <button
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-[#3ea6ff] px-3 py-2 font-medium text-[#0f1115] disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
