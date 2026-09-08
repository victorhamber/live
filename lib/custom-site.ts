import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { initials } from "@/lib/utils";
import { CUSTOM_STARTER_HTML, getPageTemplate } from "@/lib/templates";

const ALLOWED_EXT = new Set([
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".map",
  ".json",
  ".txt",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".mp4",
  ".webm",
  ".mp3",
  ".pdf",
]);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

export type CustomPageInput = {
  slug: string;
  title: string;
  videoTitle: string;
  description: string;
  brandName: string;
  customHtml: string;
  vturbPlayerId: string;
  vturbScriptUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  viewersBase: number;
  chatNote: string;
  channelAvatar: string;
  agent?: { name: string; avatar: string } | null;
  actions?: { label: string; url: string }[];
};

export function customSiteRoot(pageId: string) {
  return path.join(process.cwd(), "data", "custom", pageId);
}

export function isAllowedCustomFile(filePath: string) {
  return ALLOWED_EXT.has(path.extname(filePath).toLowerCase());
}

export function mimeFor(filePath: string) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

export function safeCustomFile(pageId: string, relativePath: string) {
  const root = path.resolve(customSiteRoot(pageId));
  const cleaned = decodeURIComponent(relativePath)
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  if (!cleaned) return null;
  const full = path.resolve(root, cleaned);
  if (!full.startsWith(root + path.sep) && full !== root) return null;
  if (!isAllowedCustomFile(full)) return null;
  return full;
}

export function listCustomFiles(pageId: string) {
  const root = customSiteRoot(pageId);
  if (!fs.existsSync(root)) return [] as string[];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(path.relative(root, full).replace(/\\/g, "/"));
    }
  };
  walk(root);
  return out.sort();
}

export function clearCustomFiles(pageId: string) {
  const root = customSiteRoot(pageId);
  fs.rmSync(root, { recursive: true, force: true });
}

export function writeCustomFile(pageId: string, relativePath: string, contents: Buffer) {
  const full = safeCustomFile(pageId, relativePath);
  if (!full) return null;
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
  return path.relative(customSiteRoot(pageId), full).replace(/\\/g, "/");
}

function assetBase(slug: string) {
  return `/api/p/${encodeURIComponent(slug)}/file/`;
}

function rewriteAssetUrls(html: string, slug: string) {
  const base = assetBase(slug);
  return html.replace(
    /(\s(?:href|src|poster|action)=["'])(?!https?:|\/\/|data:|mailto:|tel:|#|\/api\/|\/live\.|\/admin)([^"']+)(["'])/gi,
    (_all, start, url, end) => {
      const cleaned = String(url).replace(/^\.\//, "").replace(/^\//, "");
      return `${start}${base}${cleaned}${end}`;
    }
  );
}

function playerHtml(page: CustomPageInput) {
  if (!page.vturbPlayerId) {
    return `<div style="display:grid;place-items:center;height:100%;color:#aaa">Player não configurado</div>`;
  }
  const script = page.vturbScriptUrl
    ? `<script src="${page.vturbScriptUrl}" async></script>`
    : "";
  return `<vturb-smartplayer id="${page.vturbPlayerId}" style="display:block;margin:0 auto;width:100%;height:100%"></vturb-smartplayer>${script}`;
}

function ctaHtml(page: CustomPageInput) {
  const action = page.actions?.find((item) => item.url);
  const url = page.ctaUrl || action?.url;
  if (!url) return "";
  const label = page.ctaLabel || action?.label || "Quero participar";
  return `<a class="live-cta" data-track-label="CTA" href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function chatHtml(page: CustomPageInput) {
  const views = page.viewersBase.toLocaleString("pt-BR");
  return `
<link rel="stylesheet" href="/live.css?v=7" />
<div class="chat-side" style="position:static;height:min(70vh,560px);max-width:420px">
  <div class="chat-header"><span class="live-dot"></span> Chat <span class="chat-viewers-count">(<span id="chat-viewers">${views}</span>)</span></div>
  <div class="chat-messages" id="chat-messages"></div>
  <div class="chat-input-area">
    <div class="chat-input-row">
      <div class="chat-input-avatar" id="user-avatar">VC</div>
      <input type="text" class="chat-input" id="chat-input" placeholder="Envie uma mensagem..." maxlength="200" />
      <button class="send-btn" id="send-btn" type="button" aria-label="Enviar">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
      </button>
    </div>
    <div class="chat-note">${escapeHtml(page.chatNote)}</div>
  </div>
</div>
<div class="modal" id="identity-modal" hidden>
  <div class="modal-card">
    <h2>Entre no chat</h2>
    <p>Informe seu nome e e-mail para comentar.</p>
    <input id="identity-name" placeholder="Seu nome" />
    <input id="identity-email" type="email" placeholder="Seu e-mail" />
    <button type="button" id="identity-submit">Continuar</button>
  </div>
</div>
<div class="toast" id="toast"></div>`;
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyPlaceholders(html: string, page: CustomPageInput) {
  const title = page.videoTitle || page.title;
  return html
    .replaceAll("{{title}}", escapeHtml(title))
    .replaceAll("{{brand}}", escapeHtml(page.brandName))
    .replaceAll("{{description}}", page.description || "")
    .replaceAll("{{player}}", playerHtml(page))
    .replaceAll("{{cta}}", ctaHtml(page))
    .replaceAll("{{chat}}", chatHtml(page))
    .replaceAll("{{assets}}", assetBase(page.slug));
}

function injectRuntime(html: string, page: CustomPageInput) {
  const tpl = getPageTemplate("custom");
  const config = {
    slug: page.slug,
    viewersBase: page.viewersBase,
    mode: "custom",
    agentName: page.agent?.name || "Suporte",
    agentAvatar: page.agent?.avatar || initials(page.agent?.name || "SP"),
    template: "custom",
    viewsLabel: tpl.viewsLabel,
  };
  const snippet = `\n<script>window.__LIVE__=${JSON.stringify(config)};</script>\n<script src="/live.js?v=11" defer></script>\n`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${snippet}</body>`);
  return html + snippet;
}

export function buildCustomHtml(page: CustomPageInput) {
  const source = page.customHtml.trim() || CUSTOM_STARTER_HTML;
  return injectRuntime(rewriteAssetUrls(applyPlaceholders(source, page), page.slug), page);
}

export function extractCustomZip(pageId: string, zipBuffer: Buffer) {
  clearCustomFiles(pageId);
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
  if (!entries.length) throw new Error("O ZIP está vazio");

  const names = entries.map((entry) => entry.entryName.replace(/\\/g, "/"));
  const prefix = commonTopFolder(names);
  const written: string[] = [];

  for (const entry of entries) {
    const raw = entry.entryName.replace(/\\/g, "/");
    const relative = prefix && raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
    if (!relative || relative.endsWith("/")) continue;
    if (!isAllowedCustomFile(relative)) continue;
    const saved = writeCustomFile(pageId, relative, entry.getData());
    if (saved) written.push(saved);
  }

  if (!written.length) throw new Error("Nenhum arquivo permitido no ZIP");
  return written;
}

function commonTopFolder(names: string[]) {
  const tops = new Set(
    names
      .map((name) => name.replace(/^\.?\//, "").split("/")[0])
      .filter(Boolean)
  );
  if (tops.size !== 1) return "";
  const top = [...tops][0];
  const allNested = names.every((name) => name.replace(/^\.?\//, "").includes("/"));
  return allNested ? `${top}/` : "";
}

export function findIndexHtml(files: string[]) {
  const lower = files.map((file) => file.toLowerCase());
  const exact = lower.findIndex((file) => file === "index.html" || file === "index.htm");
  if (exact >= 0) return files[exact];
  const nested = lower.findIndex((file) => file.endsWith("/index.html") || file.endsWith("/index.htm"));
  if (nested >= 0) return files[nested];
  return files.find((file) => file.toLowerCase().endsWith(".html") || file.toLowerCase().endsWith(".htm")) || null;
}
