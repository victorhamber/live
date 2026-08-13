"use client";

import { FormEvent, useEffect, useState } from "react";

export default function SettingsPage() {
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [hasKey, setHasKey] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    setOpenaiApiKey(data.openaiApiKey || "");
    setOpenaiModel(data.openaiModel || "gpt-4o-mini");
    setHasKey(Boolean(data.hasKey));
    setLogoUrl(data.logoUrl || "");
  }

  useEffect(() => {
    load().catch(() => setMessage("Não foi possível carregar as configurações"));
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
    if (!res.ok) {
      setSaving(false);
      setMessage(data.error || "Erro ao salvar");
      return;
    }
    setOpenaiApiKey(data.openaiApiKey || "");
    setOpenaiModel(data.openaiModel || "gpt-4o-mini");
    setHasKey(Boolean(data.hasKey));

    if (logoFile) {
      const form = new FormData();
      form.append("logo", logoFile);
      const upload = await fetch("/api/admin/settings/logo", { method: "POST", body: form });
      const uploaded = await upload.json();
      if (!upload.ok) {
        setSaving(false);
        setMessage(uploaded.error || "Erro ao enviar a logo");
        return;
      }
      setLogoFile(null);
    }

    await load();
    setSaving(false);
    setMessage("Configurações salvas");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <p className="mt-1 text-sm text-[#9aa0a6]">
        Logo do site, ícone da aba do navegador e chave da OpenAI.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm">
          Logo do site
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-full object-cover bg-[#0f1115]" />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#0f1115] text-xs text-[#9aa0a6]">
                —
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
          </div>
          <span className="text-xs text-[#9aa0a6]">PNG, JPG, WEBP, SVG ou ICO. Até 2 MB. Aparece na live e na aba do navegador.</span>
        </label>
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
