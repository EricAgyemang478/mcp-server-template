import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildServer } from "../src/server.js";

/**
 * Spin up the real server and a real client connected by an in-memory transport
 * pair, run a test body, then tear both down. This exercises the actual MCP
 * request/response path — schema validation included — with no mocking.
 */
export async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const server = buildServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);

  try {
    return await fn(client);
  } finally {
    await client.close();
    await server.close();
  }
}

/** Call a tool and return its concatenated text content. */
export async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  return withClient(async (client) => {
    const result = await client.callTool({ name, arguments: args });
    const content = (result.content ?? []) as Array<{ type: string; text?: string }>;
    return content.map((part) => part.text ?? "").join("");
  });
}
