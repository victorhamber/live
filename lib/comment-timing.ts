/** Extra seconds a real viewer would take to hear a point, think and type. */
export const MAX_REACTION_DELAY_SEC = 50;

const DELAY_BY_TYPE: Record<string, [number, number]> = {
  filler: [16, 32],
  benefit: [22, 40],
  testimonial: [24, 44],
  question: [26, 48],
  objection: [28, 50],
};

function stableHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function playbackDelaySec(type: string, seed: string) {
  const [min, max] = DELAY_BY_TYPE[(type || "").toLowerCase()] || [20, 42];
  return min + (stableHash(seed) % (max - min + 1));
}

export function commentAppearAt(topicSec: number, type: string, seed: string) {
  return Math.max(0, Math.round(Number(topicSec) || 0)) + playbackDelaySec(type, seed);
}

export function snapToTopicSec(timestampSec: number, transcriptSecs: number[]) {
  if (!transcriptSecs.length) return Math.max(0, Math.round(timestampSec));
  let topic = transcriptSecs[0];
  for (const sec of transcriptSecs) {
    if (sec <= timestampSec) topic = sec;
    else break;
  }
  return topic;
}

export function spaceTopicTimestamps<T extends { timestampSec: number }>(events: T[], minGapSec: number) {
  const gap = Math.max(6, minGapSec);
  const ordered = [...events].sort((a, b) => a.timestampSec - b.timestampSec);
  for (let i = 1; i < ordered.length; i++) {
    const minAt = ordered[i - 1].timestampSec + gap;
    if (ordered[i].timestampSec < minAt) {
      ordered[i] = { ...ordered[i], timestampSec: minAt };
    }
  }
  return ordered;
}

export function compactTranscript<T>(rows: T[], max = 280): T[] {
  if (rows.length <= max) return rows;
  const out: T[] = [];
  const step = rows.length / max;
  for (let i = 0; i < max; i++) {
    out.push(rows[Math.min(rows.length - 1, Math.floor(i * step))]);
  }
  if (out[out.length - 1] !== rows[rows.length - 1]) {
    out.push(rows[rows.length - 1]);
  }
  return out;
}

export function formatClock(sec: number) {
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
