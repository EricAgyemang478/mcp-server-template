import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTextTools } from "./text.js";
import { registerWeatherTools } from "./weather.js";
import { registerNoteTools } from "./notes.js";

/**
 * Single registration point for every tool group.
 *
 * To add a tool: create `src/tools/<name>.ts` exporting a
 * `register<Name>Tools(server)` function, then add one line here. The rest of
 * the system (server, transport, tests, Docker) needs no changes.
 */
export function registerAllTools(server: McpServer): void {
  registerTextTools(server);
  registerWeatherTools(server);
  registerNoteTools(server);
}
