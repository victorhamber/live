"use client";

import { useEffect, useState } from "react";

type Visitor = {
  id: string;
  name: string;
  email: string;
  leadStatus: string;
  updatedAt: string;
  page: { title: string; slug: string };
  comments: { id: string; text: string; classification: string; createdAt: string }[];
  notes: { id: string; text: string; createdAt: string }[];
};

const statuses = [
  { id: "new", label: "Novo" },
  { id: "interested", label: "Interessado" },
  { id: "objection", label: "Objeção" },
  { id: "contact", label: "Contato solicitado" },
  { id: "customer", label: "Cliente" },
  { id: "not_interested", label: "Não interessado" },
];

export default function LeadsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [interested, setInterested] = useState(false);
  const [status, setStatus] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});

  async function load() {
    const qs = new URLSearchParams();
    if (interested) qs.set("interested", "1");
    if (status) qs.set("status", status);
    const res = await fetch(`/api/admin/leads?${qs.toString()}`);
    const data = await res.json();
    setVisitors(data.visitors || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interested, status]);

  async function changeStatus(id: string, leadStatus: string) {
    await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, leadStatus }),
    });
    load();
  }

  async function addNote(id: string) {
    const text = (note[id] || "").trim();
    if (!text) return;
    await fetch(`/api/admin/leads/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setNote((n) => ({ ...n, [id]: "" }));
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Leads</h1>
      <p className="text-sm text-[#9aa0a6]">Usuários que comentaram, com status comercial e notas internas.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={interested} onChange={(e) => setInterested(e.target.checked)} />
          Só quem demonstrou interesse
        </label>
        <select className="rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-6 grid gap-4">
        {visitors.map((v) => (
          <section key={v.id} className="rounded-xl border border-[#2a2f3a] bg-[#171a21] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{v.name}</p>
                <p className="text-sm text-[#9aa0a6]">
                  {v.email} · {v.page.title}
                </p>
              </div>
              <select
                className="rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 text-sm"
                value={v.leadStatus}
                onChange={(e) => changeStatus(v.id, e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 text-sm">
              {v.comments.map((c) => (
                <p key={c.id} className="border-t border-[#2a2f3a] py-2">
                  <span className="text-[#9aa0a6]">{c.classification} · </span>
                  {c.text}
                </p>
              ))}
            </div>
            <div className="mt-2 space-y-1 text-xs text-[#9aa0a6]">
              {v.notes.map((n) => (
                <p key={n.id}>Nota: {n.text}</p>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 text-sm"
                placeholder="Observação interna"
                value={note[v.id] || ""}
                onChange={(e) => setNote((n) => ({ ...n, [v.id]: e.target.value }))}
              />
              <button className="rounded-lg bg-[#3ea6ff] px-3 py-2 text-sm text-[#0f1115]" onClick={() => addNote(v.id)}>
                Salvar nota
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
