const MAX_HEAD_HTML = 32_000;

export function clipHeadHtml(value: unknown) {
  return String(value ?? "").slice(0, MAX_HEAD_HTML);
}

export function injectHeadHtml(html: string, snippet: string) {
  const head = snippet.trim();
  if (!head) return html;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${head}\n</head>`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (open) => `${open}\n<head>\n${head}\n</head>`);
  }
  return `<head>\n${head}\n</head>\n${html}`;
}
