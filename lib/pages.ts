export function isCustomHtmlReady(page: {
  template?: string | null;
  customHtml?: string | null;
}) {
  return page.template === "custom" && Boolean(page.customHtml?.trim());
}

export function pageIsViewable(page: {
  status: string;
  template?: string | null;
  customHtml?: string | null;
}) {
  return page.status === "published" || isCustomHtmlReady(page);
}

export function nextPageStatus(opts: {
  template: string;
  customHtml: string;
  requested?: string | null;
  current: string;
}) {
  const requested = opts.requested ?? opts.current;
  if (isCustomHtmlReady({ template: opts.template, customHtml: opts.customHtml }) && requested !== "draft") {
    return "published";
  }
  if (
    isCustomHtmlReady({ template: opts.template, customHtml: opts.customHtml }) &&
    opts.current === "draft" &&
    requested === "draft"
  ) {
    return "published";
  }
  return requested || opts.current;
}
