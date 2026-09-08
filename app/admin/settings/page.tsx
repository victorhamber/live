"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

export default function SettingsPage() {
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [hasKey, setHasKey] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [leadWebhookSecret, setLeadWebhookSecret] = useState("");
  const [customHeadHtml, setCustomHeadHtml] = useState("");
  const [origin, setOrigin] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    setOpenaiApiKey(data.openaiApiKey || "");
    setOpenaiModel(data.openaiModel || "gpt-4o-mini");
    setHasKey(Boolean(data.hasKey));
    setLogoUrl(data.logoUrl || "");
    setLeadWebhookSecret(data.leadWebhookSecret || "");
    setCustomHeadHtml(typeof data.customHeadHtml === "string" ? data.customHeadHtml : "");
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    load().catch(() => setMessage("Não foi possível carregar as configurações"));
  }, []);

  const webhookUrl = useMemo(
    () =>
      origin
        ? `${origin}/api/lead?secret=${encodeURIComponent(leadWebhookSecret)}`
        : `/api/lead?secret=${leadWebhookSecret}`,
    [origin, leadWebhookSecret]
  );
  const loginQuery = "?email={{email}}&name={{name}}";

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copiado");
    } catch {
      setMessage("Não foi possível copiar");
    }
  }

  function rotateSecret() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const secret = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    setLeadWebhookSecret(secret);
    setMessage("Novo segredo gerado. Salve para aplicar.");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openaiApiKey, openaiModel, leadWebhookSecret, customHeadHtml }),
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
    if (data.leadWebhookSecret) setLeadWebhookSecret(data.leadWebhookSecret);
    if (typeof data.customHeadHtml === "string") setCustomHeadHtml(data.customHeadHtml);

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
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <p className="mt-1 text-sm text-[#9aa0a6]">
        Webhook de captura, código no <code>&lt;head&gt;</code> (pixel), logo e chave da OpenAI.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div className="rounded-xl border border-[#2a2f3a] p-4">
          <p className="font-medium">Webhook de captura (site todo)</p>
          <p className="mt-1 text-sm text-[#9aa0a6]">
            Uma URL só, vale para todas as páginas. Cole no webhook extra da Trajettu. O destino
            depois do cadastro continua sendo o que você já escolhe no formulário — esta tela não
            troca essa página.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[#9aa0a6]">
            <li>
              Cole a URL do webhook em <strong className="text-[#e5e7eb]">Webhooks (Opcional)</strong>.
            </li>
            <li>
              No destino do formulário, mantenha a página que você quiser (funil, VSL, live…).
            </li>
            <li>
              Só acrescente <code>{loginQuery}</code> no final dessa URL de destino, para a pessoa já
              entrar identificada e o cookie valer nas outras lives.
            </li>
          </ol>
          <label className="mt-3 grid gap-1 text-sm">
            URL do webhook
            <div className="flex gap-2">
              <input
                className="w-full rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 font-mono text-xs"
                readOnly
                value={webhookUrl}
              />
              <button
                type="button"
                className="shrink-0 rounded-lg border border-[#2a2f3a] px-3 text-sm"
                onClick={() => copyText(webhookUrl)}
              >
                Copiar
              </button>
            </div>
          </label>
          <label className="mt-3 grid gap-1 text-sm">
            Segredo
            <div className="flex gap-2">
              <input
                className="w-full rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 font-mono text-xs"
                value={leadWebhookSecret}
                onChange={(e) => setLeadWebhookSecret(e.target.value)}
              />
              <button type="button" className="shrink-0 rounded-lg border border-[#2a2f3a] px-3 text-sm" onClick={rotateSecret}>
                Gerar
              </button>
            </div>
          </label>
          <label className="mt-3 grid gap-1 text-sm">
            Acrescente no final da URL de destino do formulário
            <div className="flex gap-2">
              <input
                className="w-full rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 font-mono text-xs"
                readOnly
                value={loginQuery}
              />
              <button
                type="button"
                className="shrink-0 rounded-lg border border-[#2a2f3a] px-3 text-sm"
                onClick={() => copyText(loginQuery)}
              >
                Copiar
              </button>
            </div>
          </label>
          <p className="mt-3 text-sm text-[#9aa0a6]">
            Exemplo: se o destino já é <code>{origin || "https://seu-site"}/funil</code>, fica{" "}
            <code>
              {origin || "https://seu-site"}/funil{loginQuery}
            </code>
            . O webhook só avisa o servidor; quem manda a pessoa para a página é o formulário.
          </p>
        </div>
        <label className="grid gap-1 text-sm">
          Código no {"<head>"} de todo o site
          <textarea
            className="min-h-36 rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 font-mono text-xs"
            value={customHeadHtml}
            onChange={(e) => setCustomHeadHtml(e.target.value)}
            placeholder={'<script defer src="https://..."></script>'}
            spellCheck={false}
          />
          <span className="text-xs text-[#9aa0a6]">
            Cole aqui o pixel, Trajettu, GTM ou qualquer HTML que deve ir no <code>&lt;head&gt;</code>{" "}
            de todas as páginas (lives, HTML personalizado, login e painel). Não precisa de vídeo nem
            transcrição. Até 32 KB.
          </span>
        </label>
        <label className="grid gap-2 text-sm">
          Logo do site
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <span className="inline-block h-12 w-12 overflow-hidden rounded-full bg-[#0f1115]">
                <img src={logoUrl} alt="Logo" className="h-12 w-12 object-cover" />
              </span>
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
