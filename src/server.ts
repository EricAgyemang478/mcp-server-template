import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.js";

export const SERVER_INFO = {
  name: "mcp-server-template",
  version: "1.0.0",
} as const;

/**
 * Build a fully-configured MCP server with all tools registered, but **not**
 * connected to any transport. Keeping construction separate from transport is
 * the key design choice: the entrypoint wires it to stdio for real use, while
 * tests wire the same server to an in-memory transport — identical code path,
 * no mocks.
 */
export function buildServer(): McpServer {
  const server = new McpServer(SERVER_INFO);
  registerAllTools(server);
  return server;
}
