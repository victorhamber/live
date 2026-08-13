import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getAppSettings } from "./settings";

export function uploadsDir() {
  return path.join(process.cwd(), "data", "uploads");
}

export function logoFilePath() {
  return path.join(uploadsDir(), "logo");
}

export async function hasSiteLogo() {
  const settings = await getAppSettings();
  return Boolean(settings.logoMimeType);
}

export async function saveSiteLogo(buffer: Buffer, mimeType: string) {
  await mkdir(uploadsDir(), { recursive: true });
  await writeFile(logoFilePath(), buffer);
  return mimeType;
}

export async function readSiteLogo() {
  const settings = await getAppSettings();
  if (!settings.logoMimeType) return null;
  try {
    const bytes = await readFile(logoFilePath());
    return { bytes, mimeType: settings.logoMimeType };
  } catch {
    return null;
  }
}
