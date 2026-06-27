import fs from "node:fs";
import path from "node:path";

/**
 * Minimal `.env` loader — no dependency. Reads `KEY=value` lines from a file and
 * sets them on `process.env` *without* overriding variables already present
 * (so real environment / secret-manager values always win).
 */
export function loadEnv(file = ".env"): void {
  let content: string;
  try {
    content = fs.readFileSync(path.resolve(file), "utf8");
  } catch {
    return; // no .env file — environment defaults apply
  }

  for (const line of content.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && match[1] && !(match[1] in process.env)) {
      process.env[match[1]] = match[2];
    }
  }
}
