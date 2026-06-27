#!/usr/bin/env node
/**
 * mcp-server-template — a production-ready Model Context Protocol server.
 *
 * The MCP client launches this process and talks to it over stdio using
 * JSON-RPC. stdout is reserved for that protocol; all logging goes to stderr.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer, SERVER_INFO } from "./server.js";
import { loadEnv } from "./lib/env.js";
import { logger } from "./lib/logger.js";

loadEnv();

async function main(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(`${SERVER_INFO.name} v${SERVER_INFO.version} ready on stdio`);
}

main().catch((err) => {
  logger.error("Fatal error starting server", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
