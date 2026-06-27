# MCP Server Template

[![CI](https://img.shields.io/github/actions/workflow/status/your-handle/mcp-server-template/ci.yml?branch=main&label=CI)](https://github.com/your-handle/mcp-server-template/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-34d399)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933)](.nvmrc)

A production-ready starting point for a [Model Context Protocol](https://modelcontextprotocol.io)
server: **typed tools with schema-validated inputs, real tests, a multi-stage
Docker image, and a CI pipeline** — the boring parts done right so the next MCP
server starts at mile 10.

It ships with three example tools that cover the shapes you'll actually build:
a **pure** tool, a **networked** tool, and a **stateful** tool.

## Features

- 🧩 **Modular tools** — one file per tool group, registered in one place
- ✅ **Schema-validated inputs** via [zod](https://zod.dev) — bad calls fail fast
- 🧪 **Real tests** — an in-memory client/server harness, no mocks ([`node:test`](https://nodejs.org/api/test.html))
- 🐳 **Multi-stage Docker** image that runs as a non-root user
- 🤖 **CI** — format, type-check, test, build, and a Docker build, on every push/PR
- 🔇 **Protocol-safe logging** — stdout is reserved for MCP; logs go to stderr
- 🔑 **No secrets in the repo** — config via env, with a `.env.example`

## Quickstart

```bash
nvm use            # or Node 20+
npm install
npm run dev        # run the server over stdio (Ctrl-C to stop)
npm test           # run the test suite
npm run build      # compile to dist/
```

## Example tools

| Tool                                                  | Kind      | What it shows                                               |
| ----------------------------------------------------- | --------- | ----------------------------------------------------------- |
| `text_stats`                                          | pure      | Validated input → structured output, no side effects        |
| `get_weather`                                         | networked | External API (Open-Meteo, no key), timeouts, error handling |
| `note_set` / `note_get` / `note_list` / `note_delete` | stateful  | File-backed persistence shared across tools                 |

## Adding your own tool

This is the whole point of the template — it's a three-step change:

1. Create `src/tools/my-thing.ts`:

   ```ts
   import { z } from "zod";
   import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
   import { text } from "../lib/result.js";

   export function registerMyThingTools(server: McpServer): void {
     server.tool(
       "greet",
       "Say hello to someone.",
       { name: z.string().describe("Who to greet") },
       async ({ name }) => text(`Hello, ${name}!`),
     );
   }
   ```

2. Register it in [`src/tools/index.ts`](src/tools/index.ts) (one line).
3. Done — transport, validation, error handling, tests, and Docker need no changes.

## Connect it to a client

Build first (`npm run build`), then point your MCP client at `dist/index.js`.
Example config (e.g. Claude Desktop) in [`examples/mcp-config.json`](examples/mcp-config.json):

```json
{
  "mcpServers": {
    "template": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-template/dist/index.js"]
    }
  }
}
```

## Architecture

A short, layered design — entrypoint → server factory → tool groups → small
shared libs. Construction is separate from transport, which is what makes it
both testable and easy to extend. Full write-up with a request-lifecycle diagram
in **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

## Testing

`npm test` builds the real server, connects a real MCP client over an in-memory
transport, and exercises tools end to end (schema validation included). Network
tools aren't hit in CI — tests stay fast and deterministic.

## Docker

```bash
docker build -t mcp-server-template .
docker run --rm -i mcp-server-template   # -i: MCP talks over stdio
```

## Project structure

```
src/
├── index.ts          # entrypoint: load env, build server, connect stdio
├── server.ts         # buildServer() — construction, transport-agnostic
├── lib/
│   ├── logger.ts     # stderr-only logging
│   ├── result.ts     # text() / errorResult() content helpers
│   ├── http.ts       # fetchJson() with timeout
│   └── env.ts        # minimal .env loader
└── tools/
    ├── index.ts      # registerAllTools() — add new groups here
    ├── text.ts       # pure tool
    ├── weather.ts    # networked tool
    └── notes.ts      # stateful tool
test/                 # in-memory client/server tests
```

## License

[MIT](./LICENSE) © Eric Opoku
