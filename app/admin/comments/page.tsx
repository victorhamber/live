"use client";

import { useEffect, useState } from "react";

type CommentRow = {
  id: string;
  text: string;
  classification: string;
  visibility: string;
  authorType: string;
  authorName: string;
  videoTimestamp: number;
  createdAt: string;
  visitor: { id: string; name: string; email: string } | null;
  page: { title: string; slug: string };
};

export default function CommentsInbox() {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [visibility, setVisibility] = useState("active");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/comments?visibility=${visibility}&q=${encodeURIComponent(q)}`);
    const data = await res.json().catch(() => ({}));
    setComments(data.comments || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibility]);

  async function setVis(id: string, next: string) {
    if (busyId) return;
    setBusyId(id);
    setMessage("");
    const previous = comments;
    if (next === "deleted") {
      setComments((rows) => rows.filter((c) => c.id !== id));
    } else {
      setComments((rows) => rows.map((c) => (c.id === id ? { ...c, visibility: next } : c)));
    }
    try {
      const res = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setVisibility", id, visibility: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setComments(previous);
        setMessage(data.error || "Não foi possível atualizar o comentário");
      }
    } catch {
      setComments(previous);
      setMessage("Falha de rede ao atualizar o comentário");
    } finally {
      setBusyId("");
    }
  }

  async function purgeDeleted() {
    setMessage("");
    try {
      const res = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purgeDeleted" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "Não foi possível limpar os excluídos");
      }
    } catch {
      setMessage("Falha de rede ao limpar os excluídos");
    }
    load();
  }

  const grouped = comments.reduce<Record<string, CommentRow[]>>((acc, c) => {
    const key = c.visitor?.email || c.authorName || "sem-usuario";
    acc[key] = acc[key] || [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-semibold">Comentários</h1>
      <p className="text-sm text-[#9aa0a6]">Agrupados por usuário. Aprove, restrinja ou exclua.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          className="rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 text-sm"
          placeholder="Buscar nome, e-mail ou texto"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select
          className="rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 text-sm"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          <option value="active">Todos</option>
          <option value="public">Públicos</option>
          <option value="author_only">Restritos</option>
        </select>
        <button type="button" onClick={load} className="rounded-lg bg-[#3ea6ff] px-3 py-2 text-sm text-[#0f1115]">
          Filtrar
        </button>
        <button type="button" onClick={purgeDeleted} className="rounded-lg border border-[#2a2f3a] px-3 py-2 text-sm text-[#f87171]">
          Limpar excluídos
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-[#f87171]">{message}</p> : null}
      <div className="mt-6 grid gap-4">
        {Object.entries(grouped).map(([key, rows]) => (
          <section key={key} className="relative z-10 rounded-xl border border-[#2a2f3a] bg-[#171a21] p-4">
            <div className="mb-3">
              <p className="font-medium">{rows[0].visitor?.name || rows[0].authorName}</p>
              <p className="text-sm text-[#9aa0a6]">
                {rows[0].visitor?.email || "sem e-mail"} · {rows[0].page.title}
              </p>
            </div>
            {rows.map((c) => (
              <div key={c.id} className="relative z-10 border-t border-[#2a2f3a] py-3 text-sm">
                <p className="break-words">
                  <span className="text-[#9aa0a6]">{c.videoTimestamp}s · {c.classification} · {c.visibility}</span>
                  <br />
                  {c.text}
                </p>
                <div className="relative z-20 mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    className="cursor-pointer rounded-lg border border-[#34d399]/40 bg-[#0f1115] px-3 py-2 text-sm text-[#34d399] hover:bg-[#34d399]/10 disabled:opacity-50"
                    onClick={() => setVis(c.id, "public")}
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    className="cursor-pointer rounded-lg border border-[#fbbf24]/40 bg-[#0f1115] px-3 py-2 text-sm text-[#fbbf24] hover:bg-[#fbbf24]/10 disabled:opacity-50"
                    onClick={() => setVis(c.id, "author_only")}
                  >
                    Restringir
                  </button>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    className="cursor-pointer rounded-lg border border-[#f87171]/40 bg-[#0f1115] px-3 py-2 text-sm text-[#f87171] hover:bg-[#f87171]/10 disabled:opacity-50"
                    onClick={() => setVis(c.id, "deleted")}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
