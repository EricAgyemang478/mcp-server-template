import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { text } from "../lib/result.js";

/**
 * A pure, deterministic tool — the simplest shape: validated input in,
 * structured JSON out, no side effects, no network. Great unit-test target.
 */
export function registerTextTools(server: McpServer): void {
  server.tool(
    "text_stats",
    "Count characters, words, and lines in a piece of text.",
    {
      text: z.string().describe("The text to analyze"),
    },
    async ({ text: input }) => {
      const trimmed = input.trim();
      return text({
        characters: input.length,
        charactersNoSpaces: input.replace(/\s/g, "").length,
        words: trimmed ? trimmed.split(/\s+/).length : 0,
        lines: input ? input.split(/\r\n|\r|\n/).length : 0,
      });
    },
  );
}
