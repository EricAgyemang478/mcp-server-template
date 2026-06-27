/**
 * Logging that writes to **stderr only**.
 *
 * An MCP stdio server speaks JSON-RPC over stdout, so anything written to
 * stdout that isn't a protocol message will corrupt the stream and break the
 * client. All diagnostics therefore go to stderr.
 */
type Level = "debug" | "info" | "warn" | "error";

const RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = RANK[(process.env.LOG_LEVEL as Level) ?? "info"] ?? RANK.info;

function emit(level: Level, message: string, meta?: unknown): void {
  if (RANK[level] < threshold) return;
  const base = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  const line = meta === undefined ? base : `${base} ${JSON.stringify(meta)}`;
  process.stderr.write(line + "\n");
}

export const logger = {
  debug: (message: string, meta?: unknown) => emit("debug", message, meta),
  info: (message: string, meta?: unknown) => emit("info", message, meta),
  warn: (message: string, meta?: unknown) => emit("warn", message, meta),
  error: (message: string, meta?: unknown) => emit("error", message, meta),
};
