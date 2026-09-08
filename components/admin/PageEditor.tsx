"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CUSTOM_STARTER_HTML, PAGE_TEMPLATES } from "@/lib/templates";

type LinkItem = { label: string; url: string };
type ActionItem = { key: string; label: string; url: string };
type EventItem = {
  id: string;
  timestampSec: number;
  commentText: string;
  authorName: string;
  commentType: string;
  authorType?: string;
  inReplyToId?: string | null;
};

type PagePayload = {
  id: string;
  title: string;
  slug: string;
  status: string;
  mode: string;
  videoTitle: string;
  channelName: string;
  channelHandle: string;
  channelAvatar: string;
  description: string;
  brandName: string;
  vturbPlayerId: string;
  vturbScriptUrl: string;
  thumbnailUrl: string;
  template: string;
  ctaLabel: string;
  ctaUrl: string;
  customHtml: string;
  leadWebhookSecret: string;
  language: string;
  viewersBase: number;
  chatNote: string;
  aiInstructions: string;
  agent: { name: string; avatar: string; personality: string; goal: string; enabled: boolean } | null;
  knowledgeBase: { content: string } | null;
  settings: {
    aiEnabled: boolean;
    autoGenerateEnabled: boolean;
    agentReplyEnabled: boolean;
    maxMessagesPerMinute: number;
    minIntervalSec: number;
    creativity: number;
    allowedCommentTypes: string;
    openaiModel: string;
    temperature: number;
    dailyApiLimit: number;
  } | null;
  links: LinkItem[];
  actions: ActionItem[];
  transcript: { timestampSec: number; text: string }[];
  commentEvents: EventItem[];
};

const tabs = ["Vídeo", "Transcrição", "Produto", "Agente", "Chat", "IA"] as const;

function fieldClass() {
  return "w-full rounded-lg border border-[#2a2f3a] bg-[#0f1115] px-3 py-2 text-sm";
}

export function PageEditor({ initial }: { initial: PagePayload }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Vídeo");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingReplies, setGeneratingReplies] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: initial.title,
    slug: initial.slug,
    status: initial.status,
    mode: initial.mode,
    videoTitle: initial.videoTitle,
    channelName: initial.channelName,
    channelHandle: initial.channelHandle,
    channelAvatar: initial.channelAvatar,
    description: initial.description,
    brandName: initial.brandName,
    vturbPlayerId: initial.vturbPlayerId,
    vturbScriptUrl: initial.vturbScriptUrl,
    thumbnailUrl: initial.thumbnailUrl,
    template: initial.template || "youtube",
    ctaLabel: initial.ctaLabel || "",
    ctaUrl: initial.ctaUrl || "",
    customHtml: initial.customHtml || "",
    leadWebhookSecret: initial.leadWebhookSecret || "",
    language: initial.language,
    viewersBase: initial.viewersBase,
    chatNote: initial.chatNote,
    aiInstructions: initial.aiInstructions,
    agentName: initial.agent?.name || "Suporte",
    agentAvatar: initial.agent?.avatar || "SP",
    agentPersonality: initial.agent?.personality || "técnico/comercial",
    agentGoal: initial.agent?.goal || "responder dúvidas",
    agentEnabled: initial.agent?.enabled ?? true,
    knowledge: initial.knowledgeBase?.content || "",
    aiEnabled: initial.settings?.aiEnabled ?? true,
    autoGenerateEnabled: initial.settings?.autoGenerateEnabled ?? true,
    agentReplyEnabled: initial.settings?.agentReplyEnabled ?? true,
    maxMessagesPerMinute: initial.settings?.maxMessagesPerMinute ?? 6,
    minIntervalSec: initial.settings?.minIntervalSec ?? 8,
    creativity: initial.settings?.creativity ?? 0.7,
    allowedCommentTypes: initial.settings?.allowedCommentTypes || "question,objection,benefit,testimonial,filler",
    openaiModel: initial.settings?.openaiModel || "gpt-4o-mini",
    temperature: initial.settings?.temperature ?? 0.7,
    dailyApiLimit: initial.settings?.dailyApiLimit ?? 100,
    transcriptRaw: initial.transcript.map((s) => `${Math.floor(s.timestampSec / 60)}:${String(s.timestampSec % 60).padStart(2, "0")} ${s.text}`).join("\n"),
    links: (initial.links.length ? initial.links : [{ label: "", url: "" }]) as LinkItem[],
    actions: (initial.actions.length
      ? initial.actions
      : [
          { key: "checkout", label: "Checkout", url: "" },
          { key: "suporte", label: "Suporte", url: "" },
        ]) as ActionItem[],
  });
  const [events, setEvents] = useState(initial.commentEvents);
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    fetch(`/api/admin/pages/${initial.id}/custom`)
      .then((res) => res.json())
      .then((data) => setFiles(data.files || []))
      .catch(() => undefined);
  }, [initial.id]);

  const payload = useMemo(() => form, [form]);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/admin/pages/${initial.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error || "Erro ao salvar");
      return;
    }
    setMessage("Salvo");
    if (data.page?.leadWebhookSecret) set("leadWebhookSecret", data.page.leadWebhookSecret);
    router.refresh();
  }

  async function generate() {
    setGenerating(true);
    setMessage("");
    await save();
    const res = await fetch(`/api/admin/pages/${initial.id}/generate`, { method: "POST" });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setMessage(data.error || "Falha na geração");
      return;
    }
    setMessage(`${data.count} comentários gerados${data.replies ? ` · ${data.replies} respostas do agente` : ""}`);
    const fresh = await fetch(`/api/admin/pages/${initial.id}`);
    const body = await fresh.json();
    setEvents(body.page.commentEvents || []);
  }

  async function generateReplies() {
    setGeneratingReplies(true);
    setMessage("");
    await save();
    const res = await fetch(`/api/admin/pages/${initial.id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replies" }),
    });
    const data = await res.json().catch(() => ({}));
    setGeneratingReplies(false);
    if (!res.ok) {
      setMessage(data.error || "Falha ao gerar respostas do agente");
      return;
    }
    setMessage(`${data.replies || 0} respostas do agente geradas`);
    const fresh = await fetch(`/api/admin/pages/${initial.id}`);
    const body = await fresh.json();
    setEvents(body.page.commentEvents || []);
  }

  async function deleteEvent(eventId: string) {
    const res = await fetch(`/api/admin/pages/${initial.id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", eventId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "Não foi possível excluir");
      return;
    }
    if (Array.isArray(data.commentEvents)) {
      setEvents(data.commentEvents);
      return;
    }
    setEvents((rows) => rows.filter((ev) => ev.id !== eventId && ev.inReplyToId !== eventId));
  }

  async function removePage() {
    if (!confirm("Excluir esta página?")) return;
    await fetch(`/api/admin/pages/${initial.id}`, { method: "DELETE" });
    router.push("/admin");
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function uploadCustom(file: File) {
    setUploading(true);
    setMessage("");
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/admin/pages/${initial.id}/custom`, { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setMessage(data.error || "Falha ao enviar o site");
      return;
    }
    set("template", "custom");
    if (typeof data.customHtml === "string") set("customHtml", data.customHtml);
    setFiles(data.files || []);
    setMessage(data.files?.length ? `Site importado · ${data.files.length} arquivos` : "HTML importado");
  }

  async function clearCustomFiles() {
    if (!confirm("Remover os arquivos enviados deste site?")) return;
    const body = new FormData();
    body.append("action", "clear");
    const res = await fetch(`/api/admin/pages/${initial.id}/custom`, { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "Não foi possível limpar");
      return;
    }
    setFiles([]);
    setMessage("Arquivos removidos");
  }

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
    set("leadWebhookSecret", secret);
    setMessage("Novo segredo gerado. Salve a página para aplicar.");
  }

  return (
    <form onSubmit={save} className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{form.title || "Página"}</h1>
          <p className="text-sm text-[#9aa0a6]">/{form.slug}</p>
        </div>
        <div className="flex gap-2">
          <a className="rounded-lg border border-[#2a2f3a] px-3 py-2 text-sm" href={`/admin/pages/${initial.id}/stats`}>
            Estatísticas
          </a>
          {form.status === "published" ? (
            <a className="rounded-lg border border-[#2a2f3a] px-3 py-2 text-sm" href={`/${form.slug}`} target="_blank">
              Ver live
            </a>
          ) : null}
          <button type="button" onClick={removePage} className="rounded-lg border border-[#f87171]/40 px-3 py-2 text-sm text-[#f87171]">
            Excluir
          </button>
          <button disabled={saving} className="rounded-lg bg-[#3ea6ff] px-4 py-2 font-medium text-[#0f1115]">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
      {message ? <p className="mt-3 text-sm text-[#34d399]">{message}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 text-sm ${tab === t ? "bg-[#3ea6ff] text-[#0f1115]" : "bg-[#171a21] text-[#9aa0a6]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4">
        {tab === "Vídeo" && (
          <>
            <div>
              <p className="mb-2 text-sm font-medium">Modelo da sala</p>
              <p className="mb-3 text-sm text-[#9aa0a6]">Cada modelo muda a estrutura da sala: posição do vídeo, do chat e do botão — não só as cores.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PAGE_TEMPLATES.map((tpl) => {
                  const active = form.template === tpl.id;
                  return (
                    <button
                      type="button"
                      key={tpl.id}
                      onClick={() => {
                        set("template", tpl.id);
                        if (tpl.id === "custom" && !form.customHtml) set("customHtml", CUSTOM_STARTER_HTML);
                      }}
                      className={`rounded-xl border p-3 text-left ${active ? "border-[#3ea6ff] bg-[#3ea6ff]/10" : "border-[#2a2f3a] bg-[#0f1115]"}`}
                    >
                      <div className="text-sm font-semibold">{tpl.name}</div>
                      <p className="mt-1 text-xs leading-5 text-[#9aa0a6]">{tpl.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            {form.template === "custom" ? (
              <div className="rounded-xl border border-[#2a2f3a] bg-[#0f1115] p-4">
                <p className="text-sm font-medium">Site personalizado</p>
                <p className="mt-1 text-sm text-[#9aa0a6]">
                  Envie um arquivo <strong>.html</strong> ou um <strong>.zip</strong> com o site inteiro (HTML, CSS, JS e imagens).
                  Use <code className="text-[#3ea6ff]">{"{{player}}"}</code>, <code className="text-[#3ea6ff]">{"{{cta}}"}</code>,{" "}
                  <code className="text-[#3ea6ff]">{"{{chat}}"}</code>, <code className="text-[#3ea6ff]">{"{{title}}"}</code> e{" "}
                  <code className="text-[#3ea6ff]">{"{{description}}"}</code> se quiser encaixar o player, o botão ou o chat da live.
                </p>
                <label className="mt-3 block text-sm">
                  HTML ou ZIP
                  <input
                    className="mt-1 block w-full text-sm"
                    type="file"
                    accept=".html,.htm,.zip"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCustom(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {uploading ? <p className="mt-2 text-sm text-[#9aa0a6]">Enviando...</p> : null}
                {files.length ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-[#9aa0a6]">{files.length} arquivos no site</p>
                      <button type="button" className="text-sm text-[#f87171]" onClick={clearCustomFiles}>
                        Limpar arquivos
                      </button>
                    </div>
                    <div className="mt-2 max-h-32 overflow-auto rounded-lg border border-[#2a2f3a] p-2 font-mono text-xs text-[#9aa0a6]">
                      {files.map((file) => (
                        <div key={file}>{file}</div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <label className="mt-4 grid gap-1 text-sm">
                  HTML da página
                  <textarea
                    className={fieldClass() + " min-h-[320px] font-mono text-xs"}
                    value={form.customHtml}
                    onChange={(e) => set("customHtml", e.target.value)}
                    placeholder="Cole o HTML aqui ou envie um arquivo"
                  />
                </label>
              </div>
            ) : null}
            <label className="grid gap-1 text-sm">Título interno<input className={fieldClass()} value={form.title} onChange={(e) => set("title", e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Slug<input className={fieldClass()} value={form.slug} onChange={(e) => set("slug", e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Título do vídeo<input className={fieldClass()} value={form.videoTitle} onChange={(e) => set("videoTitle", e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Texto do botão (CTA)<input className={fieldClass()} value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="Quero participar" /></label>
            <label className="grid gap-1 text-sm">URL do botão (CTA)<input className={fieldClass()} value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="https://..." /></label>
            <p className="text-xs text-[#9aa0a6]">Se a URL do CTA ficar vazia, o primeiro botão de ação do agente (com link) é usado na sala.</p>
            <label className="grid gap-1 text-sm">Marca / logo<input className={fieldClass()} value={form.brandName} onChange={(e) => set("brandName", e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Canal<input className={fieldClass()} value={form.channelName} onChange={(e) => set("channelName", e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Subtítulo do canal<input className={fieldClass()} value={form.channelHandle} onChange={(e) => set("channelHandle", e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Iniciais do avatar<input className={fieldClass()} value={form.channelAvatar} onChange={(e) => set("channelAvatar", e.target.value)} /></label>
            <label className="grid gap-1 text-sm">ID do player VTurb<input className={fieldClass()} value={form.vturbPlayerId} onChange={(e) => set("vturbPlayerId", e.target.value)} placeholder="vid-..." /></label>
            <label className="grid gap-1 text-sm">URL do script VTurb<input className={fieldClass()} value={form.vturbScriptUrl} onChange={(e) => set("vturbScriptUrl", e.target.value)} placeholder="https://scripts.converteai.net/..." /></label>
            <label className="grid gap-1 text-sm">Thumbnail URL<input className={fieldClass()} value={form.thumbnailUrl} onChange={(e) => set("thumbnailUrl", e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Descrição<textarea className={fieldClass() + " min-h-40"} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
          </>
        )}

        {tab === "Transcrição" && (
          <label className="grid gap-1 text-sm">
            Legenda com minutagem (uma linha por trecho: 01:20 texto)
            <textarea
              className={fieldClass() + " min-h-[420px] font-mono"}
              value={form.transcriptRaw}
              onChange={(e) => set("transcriptRaw", e.target.value)}
              placeholder={"00:05 Abertura das vagas\n01:20 Para quem o sistema não é indicado"}
            />
          </label>
        )}

        {tab === "Produto" && (
          <>
            <label className="grid gap-1 text-sm">
              Base de conhecimento
              <textarea className={fieldClass() + " min-h-64"} value={form.knowledge} onChange={(e) => set("knowledge", e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              Instruções para a IA gerar comentários
              <textarea className={fieldClass() + " min-h-40"} value={form.aiInstructions} onChange={(e) => set("aiInstructions", e.target.value)} />
            </label>
          </>
        )}

        {tab === "Agente" && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.agentEnabled} onChange={(e) => set("agentEnabled", e.target.checked)} />
              Agente respondendo
            </label>
            <label className="grid gap-1 text-sm">Nome<input className={fieldClass()} value={form.agentName} onChange={(e) => set("agentName", e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Avatar (iniciais)<input className={fieldClass()} value={form.agentAvatar} onChange={(e) => set("agentAvatar", e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Personalidade<input className={fieldClass()} value={form.agentPersonality} onChange={(e) => set("agentPersonality", e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Objetivo<input className={fieldClass()} value={form.agentGoal} onChange={(e) => set("agentGoal", e.target.value)} /></label>
            <div>
              <p className="mb-2 text-sm">Links autorizados</p>
              {form.links.map((l, i) => (
                <div key={i} className="mb-2 grid grid-cols-2 gap-2">
                  <input className={fieldClass()} placeholder="Rótulo" value={l.label} onChange={(e) => {
                    const links = [...form.links];
                    links[i] = { ...l, label: e.target.value };
                    set("links", links);
                  }} />
                  <input className={fieldClass()} placeholder="https://..." value={l.url} onChange={(e) => {
                    const links = [...form.links];
                    links[i] = { ...l, url: e.target.value };
                    set("links", links);
                  }} />
                </div>
              ))}
              <button type="button" className="text-sm text-[#3ea6ff]" onClick={() => set("links", [...form.links, { label: "", url: "" }])}>
                + link
              </button>
            </div>
            <div>
              <p className="mb-2 text-sm">Ações (/checkout, /suporte...)</p>
              {form.actions.map((a, i) => (
                <div key={i} className="mb-2 grid grid-cols-3 gap-2">
                  <input className={fieldClass()} placeholder="checkout" value={a.key} onChange={(e) => {
                    const actions = [...form.actions];
                    actions[i] = { ...a, key: e.target.value };
                    set("actions", actions);
                  }} />
                  <input className={fieldClass()} placeholder="Checkout" value={a.label} onChange={(e) => {
                    const actions = [...form.actions];
                    actions[i] = { ...a, label: e.target.value };
                    set("actions", actions);
                  }} />
                  <input className={fieldClass()} placeholder="https://..." value={a.url} onChange={(e) => {
                    const actions = [...form.actions];
                    actions[i] = { ...a, url: e.target.value };
                    set("actions", actions);
                  }} />
                </div>
              ))}
              <button type="button" className="text-sm text-[#3ea6ff]" onClick={() => set("actions", [...form.actions, { key: "", label: "", url: "" }])}>
                + ação
              </button>
            </div>
          </>
        )}

        {tab === "Chat" && (
          <>
            <label className="grid gap-1 text-sm">
              Status
              <select className={fieldClass()} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="draft">Rascunho</option>
                <option value="published">Publicada</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Modo
              <select className={fieldClass()} value={form.mode} onChange={(e) => set("mode", e.target.value)}>
                <option value="simulation">Simulação (IA + reais)</option>
                <option value="real">Real (só usuários reais)</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">Idioma<input className={fieldClass()} value={form.language} onChange={(e) => set("language", e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Viewers base<input type="number" className={fieldClass()} value={form.viewersBase} onChange={(e) => set("viewersBase", Number(e.target.value))} /></label>
            <label className="grid gap-1 text-sm">Nota do chat<input className={fieldClass()} value={form.chatNote} onChange={(e) => set("chatNote", e.target.value)} /></label>
            <div className="rounded-xl border border-[#2a2f3a] p-4">
              <p className="font-medium">Login automático por captura</p>
              <p className="mt-1 text-sm text-[#9aa0a6]">
                O formulário do anúncio continua enviando os dados para o Meta. Configure um webhook extra para esta live: quando a pessoa se cadastrar, ela já entra logada e não precisa informar nome e e-mail de novo para comentar.
              </p>
              <label className="mt-3 grid gap-1 text-sm">
                URL do webhook
                <div className="flex gap-2">
                  <input className={fieldClass()} readOnly value={origin ? `${origin}/api/p/${form.slug}/lead` : `/api/p/${form.slug}/lead`} />
                  <button type="button" className="shrink-0 rounded-lg border border-[#2a2f3a] px-3 text-sm" onClick={() => copyText(`${origin}/api/p/${form.slug}/lead`)}>
                    Copiar
                  </button>
                </div>
              </label>
              <label className="mt-3 grid gap-1 text-sm">
                Segredo
                <div className="flex gap-2">
                  <input className={fieldClass()} value={form.leadWebhookSecret} onChange={(e) => set("leadWebhookSecret", e.target.value)} />
                  <button type="button" className="shrink-0 rounded-lg border border-[#2a2f3a] px-3 text-sm" onClick={rotateSecret}>
                    Gerar
                  </button>
                </div>
              </label>
              <label className="mt-3 grid gap-1 text-sm">
                URL de obrigado / redirect da live
                <div className="flex gap-2">
                  <input
                    className={fieldClass()}
                    readOnly
                    value={origin ? `${origin}/${form.slug}?email={{email}}&name={{name}}` : `/${form.slug}?email={{email}}&name={{name}}`}
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-[#2a2f3a] px-3 text-sm"
                    onClick={() => copyText(`${origin}/${form.slug}?email={{email}}&name={{name}}`)}
                  >
                    Copiar
                  </button>
                </div>
              </label>
              <p className="mt-3 text-sm text-[#9aa0a6]">
                Envie POST ou GET com nome e e-mail. Autentique com <code>Authorization: Bearer</code>, <code>X-Webhook-Secret</code> ou <code>?secret=</code>. A resposta traz <code>loginUrl</code> para redirecionar a pessoa já logada.
              </p>
              <pre className="mt-3 overflow-auto rounded-lg bg-[#0f1115] p-3 text-xs text-[#d1d5db]">{`{
  "name": "Maria Silva",
  "email": "maria@email.com"
}`}</pre>
            </div>
          </>
        )}

        {tab === "IA" && (
          <>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.aiEnabled} onChange={(e) => set("aiEnabled", e.target.checked)} /> IA ligada</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.autoGenerateEnabled} onChange={(e) => set("autoGenerateEnabled", e.target.checked)} /> Geração automática</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.agentReplyEnabled} onChange={(e) => set("agentReplyEnabled", e.target.checked)} /> Agente responde</label>
            <label className="grid gap-1 text-sm">Modelo<input className={fieldClass()} value={form.openaiModel} onChange={(e) => set("openaiModel", e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Temperatura<input type="number" step="0.1" className={fieldClass()} value={form.temperature} onChange={(e) => set("temperature", Number(e.target.value))} /></label>
            <label className="grid gap-1 text-sm">Intervalo mínimo (s)<input type="number" className={fieldClass()} value={form.minIntervalSec} onChange={(e) => set("minIntervalSec", Number(e.target.value))} /></label>
            <label className="grid gap-1 text-sm">Máx. msgs/min<input type="number" className={fieldClass()} value={form.maxMessagesPerMinute} onChange={(e) => set("maxMessagesPerMinute", Number(e.target.value))} /></label>
            <label className="grid gap-1 text-sm">Limite diário de API<input type="number" className={fieldClass()} value={form.dailyApiLimit} onChange={(e) => set("dailyApiLimit", Number(e.target.value))} /></label>
            <label className="grid gap-1 text-sm">Tipos permitidos<input className={fieldClass()} value={form.allowedCommentTypes} onChange={(e) => set("allowedCommentTypes", e.target.value)} /></label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={generating} onClick={generate} className="w-fit rounded-lg bg-[#34d399] px-4 py-2 font-medium text-[#0f1115]" style={{ cursor: "pointer" }}>
                {generating ? "Gerando..." : "Gerar comentários com IA"}
              </button>
              <button type="button" disabled={generatingReplies || events.length === 0} onClick={generateReplies} className="w-fit rounded-lg border border-[#3ea6ff] px-4 py-2 font-medium text-[#3ea6ff]" style={{ cursor: "pointer" }}>
                {generatingReplies ? "Respondendo..." : "Gerar respostas do agente"}
              </button>
            </div>
            <p className="text-sm text-[#9aa0a6]">
              O agente responde perguntas e objeções fake na timeline, alguns segundos depois. Exclua as que não quiser.
            </p>
            <div className="rounded-xl border border-[#2a2f3a] p-3">
              <p className="mb-2 text-sm text-[#9aa0a6]">{events.length} eventos na timeline</p>
              <div className="max-h-80 overflow-auto text-sm">
                {events.map((ev) => (
                  <div key={ev.id} className="flex items-start justify-between gap-3 border-t border-[#2a2f3a] py-2">
                    <div>
                      <span className="text-[#9aa0a6]">
                        {ev.timestampSec}s · {ev.authorName} · {ev.commentType}
                        {ev.authorType === "agent" ? " · agente" : ""}
                      </span>
                      <div>{ev.commentText}</div>
                    </div>
                    <a
                      href="#excluir-evento"
                      role="button"
                      className="shrink-0 text-sm text-[#f87171] underline underline-offset-4"
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.preventDefault();
                        deleteEvent(ev.id);
                      }}
                    >
                      Excluir
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </form>
  );
}
