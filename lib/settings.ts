import { db } from "./db";

const ID = "default";

export async function getAppSettings() {
  return db.appSettings.upsert({
    where: { id: ID },
    update: {},
    create: { id: ID, openaiApiKey: "", openaiModel: "gpt-4o-mini" },
  });
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
