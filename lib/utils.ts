export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function parseTimestamp(value: string): number | null {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const parts = trimmed.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export type TranscriptLine = { timestampSec: number; text: string };

export function parseTranscript(raw: string): TranscriptLine[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const result: TranscriptLine[] = [];
  for (const line of lines) {
    const match = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?|\d+)\]?\s*[-–—]?\s*(.+)$/);
    if (!match) continue;
    const sec = parseTimestamp(match[1]);
    if (sec === null) continue;
    result.push({ timestampSec: sec, text: match[2].trim() });
  }
  return result;
}

export const AVATAR_COLORS = [
  "#b5451b",
  "#1e6b45",
  "#5c1d8a",
  "#1a4a7a",
  "#7b1fa2",
  "#b71c1c",
  "#1b5e20",
  "#6a1b9a",
  "#01579b",
  "#bf360c",
  "#0f766e",
  "#e64a19",
  "#00695c",
  "#880e4f",
  "#4527a0",
];

export function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
