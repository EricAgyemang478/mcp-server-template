/**
 * Tiny HTTP helper around the global `fetch` (Node 18+) that every networked
 * tool should use, so timeouts and error handling are consistent instead of
 * re-implemented per tool.
 */
export interface FetchOptions {
  /** Abort the request after this many milliseconds. */
  timeoutMs?: number;
}

export async function fetchJson<T = unknown>(url: string, opts: FetchOptions = {}): Promise<T> {
  const { timeoutMs = 8000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
