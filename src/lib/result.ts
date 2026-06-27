import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Wrap any value as MCP text content. Strings pass through; everything else is
 * pretty-printed JSON so the model receives clean, structured output.
 */
export function text(value: unknown): CallToolResult {
  const body = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text", text: body }] };
}

/**
 * An expected, recoverable failure (e.g. "city not found"). Returned with
 * `isError: true` so the model can read the reason and adjust — as opposed to a
 * thrown exception, which the SDK turns into a protocol-level error.
 */
export function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
