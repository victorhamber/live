import { db } from "./db";
import type { AppSettings } from "@prisma/client";
import { randomBytes } from "crypto";

const ID = "default";

let cached: { value: AppSettings; at: number } | null = null;
const TTL_MS = 15_000;

export async function getAppSettings() {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const value = await db.appSettings.upsert({
    where: { id: ID },
    update: {},
    create: { id: ID, openaiApiKey: "", openaiModel: "gpt-4o-mini" },
  });
  cached = { value, at: Date.now() };
  return value;
}

export function invalidateAppSettings() {
  cached = null;
}

export async function ensureAppLeadWebhookSecret(current?: string | null) {
  if (current) return current;
  const secret = randomBytes(24).toString("hex");
  const settings = await db.appSettings.update({
    where: { id: ID },
    data: { leadWebhookSecret: secret },
  });
  cached = { value: settings, at: Date.now() };
  return secret;
}

export function maskApiKey(key: string) {
  const value = key.trim();
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 5)}••••${value.slice(-4)}`;
}

export function isMaskedKey(value: string) {
  return value.includes("•") || value.includes("...");
}
