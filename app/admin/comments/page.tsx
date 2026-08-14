"use client";

import { useEffect, useState } from "react";

type CommentRow = {
  id: string;
  text: string;
  classification: string;
  visibility: string;
  inboxStatus?: string;
  authorType: string;
  authorName: string;
  videoTimestamp: number;
  createdAt: string;
  visitor: { id: string; name: string; email: string } | null;
  page: { title: string; slug: string };
};

const TABS = [
  { id: "pending", label: "Pendentes" },
  { id: "approved", label: "Aprovados" },
  { id: "restricted", label: "Restritos" },
] as const;

export default function CommentsInbox() {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [inbox, setInbox] = useState<(typeof TABS)[number]["id"]>("approved");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/comments?inbox=${inbox}&q=${encodeURIComponent(q)}`);
    const data = await res.json().catch(() => ({}));
    setComments(data.comments || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbox]);

  async function setVis(id: string, next: string) {
    if (busyId) return;
    setBusyId(id);
    setMessage("");
    const previous = comments;
    setComments((rows) => rows.filter((c) => c.id !== id));
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

  const grouped = comments.reduce<Record<string, CommentRow[]>>((acc, c) => {
    const key = c.visitor?.email || c.authorName || "sem-usuario";
    acc[key] = acc[key] || [];
    acc[key].push(c);
    return acc;
  }, {});

  const emptyLabel =
    inbox === "pending"
      ? "Nenhum comentário pendente."
      : inbox === "approved"
        ? "Nenhum comentário aprovado."
        : "Nenhum comentário restrito.";

  return (
    <div>
      <h1 className="text-2xl font-semibold">Comentários</h1>
      <p className="text-sm text-[#9aa0a6]">
        Comentário comum entra aprovado e o agente responde na hora. Só link, ofensa e spam vão para Restritos.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setInbox(tab.id)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              inbox === tab.id ? "bg-[#3ea6ff] text-[#0f1115]" : "bg-[#171a21] text-[#9aa0a6]"
            }`}
            style={{ cursor: "pointer" }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          className="rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 text-sm"
          placeholder="Buscar nome, e-mail ou texto"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button
          type="button"
          onClick={load}
          className="rounded-lg bg-[#3ea6ff] px-3 py-2 text-sm text-[#0f1115]"
          style={{ cursor: "pointer" }}
        >
          Filtrar
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-[#f87171]">{message}</p> : null}
      <div className="mt-6 grid gap-4">
        {Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-[#9aa0a6]">{emptyLabel}</p>
        ) : null}
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
                  <span className="text-[#9aa0a6]">
                    {c.videoTimestamp}s · {c.classification} · {c.visibility}
                  </span>
                  <br />
                  {c.text}
                </p>
                <div className="relative z-20 mt-3 flex flex-wrap gap-2">
                  {inbox !== "approved" ? (
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      className="rounded-lg border border-[#34d399]/40 bg-[#0f1115] px-3 py-2 text-sm text-[#34d399] hover:bg-[#34d399]/10 disabled:opacity-50"
                      style={{ cursor: busyId === c.id ? "wait" : "pointer" }}
                      onClick={() => setVis(c.id, "public")}
                    >
                      Aprovar
                    </button>
                  ) : null}
                  {inbox !== "restricted" ? (
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      className="rounded-lg border border-[#fbbf24]/40 bg-[#0f1115] px-3 py-2 text-sm text-[#fbbf24] hover:bg-[#fbbf24]/10 disabled:opacity-50"
                      style={{ cursor: busyId === c.id ? "wait" : "pointer" }}
                      onClick={() => setVis(c.id, "author_only")}
                    >
                      Restringir
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    className="rounded-lg border border-[#f87171]/40 bg-[#0f1115] px-3 py-2 text-sm text-[#f87171] hover:bg-[#f87171]/10 disabled:opacity-50"
                    style={{ cursor: busyId === c.id ? "wait" : "pointer" }}
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
