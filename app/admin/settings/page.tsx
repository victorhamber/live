"use client";

import { FormEvent, useEffect, useState } from "react";

export default function SettingsPage() {
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setOpenaiApiKey(data.openaiApiKey || "");
        setOpenaiModel(data.openaiModel || "gpt-4o-mini");
        setHasKey(Boolean(data.hasKey));
      })
      .catch(() => setMessage("Não foi possível carregar as configurações"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openaiApiKey, openaiModel }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error || "Erro ao salvar");
      return;
    }
    setOpenaiApiKey(data.openaiApiKey || "");
    setOpenaiModel(data.openaiModel || "gpt-4o-mini");
    setHasKey(Boolean(data.hasKey));
    setMessage("Configurações salvas");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <p className="mt-1 text-sm text-[#9aa0a6]">
        A chave da OpenAI fica no banco e só é usada no servidor. Não precisa colocar no EasyPanel.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <label className="grid gap-1 text-sm">
          Chave da API OpenAI
          <input
            className="rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 font-mono"
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
          <span className="text-xs text-[#9aa0a6]">
            {hasKey ? "Chave cadastrada. Cole uma nova para substituir." : "Nenhuma chave cadastrada ainda."}
          </span>
        </label>
        <label className="grid gap-1 text-sm">
          Modelo
          <input
            className="rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2"
            value={openaiModel}
            onChange={(e) => setOpenaiModel(e.target.value)}
            placeholder="gpt-4o-mini"
          />
        </label>
        {message ? <p className="text-sm text-[#34d399]">{message}</p> : null}
        <button disabled={saving} className="w-fit rounded-lg bg-[#3ea6ff] px-4 py-2 font-medium text-[#0f1115]">
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
