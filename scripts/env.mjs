import fs from "node:fs";
import path from "node:path";

export function loadEnvFile(fileName = ".env.local") {
  const envPath = path.join(process.cwd(), fileName);

  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

export function getRequiredEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}
