# Architecture

This document explains how the server is put together, how a request flows
through it, and **why** each decision was made.

## What MCP is, in one paragraph

The [Model Context Protocol](https://modelcontextprotocol.io) is a standard way
for an AI client (Claude Desktop, an IDE, an agent) to discover and call
**tools** exposed by a server. The client launches the server as a subprocess
and they exchange [JSON-RPC](https://www.jsonrpc.org/) messages over **stdio**
(stdin/stdout). The client asks "what tools do you have?" (`tools/list`) and
"run this one with these arguments" (`tools/call`); the server validates,
executes, and returns content. This template is one such server.

## Layered design

```
┌─────────────────────────────────────────────────────────────┐
│  MCP client (Claude Desktop / IDE / agent)                    │
└───────────────┬───────────────────────────────────────────────┘
                │  JSON-RPC over stdio
┌───────────────▼───────────────────────────────────────────────┐
│  index.ts        entrypoint: loadEnv() → buildServer() → connect│
├────────────────────────────────────────────────────────────────┤
│  server.ts       buildServer(): construct McpServer, register   │
│                  tools — transport-agnostic                     │
├────────────────────────────────────────────────────────────────┤
│  tools/index.ts  registerAllTools(): one call per tool group    │
│  tools/*.ts      each tool: name + description + zod schema +    │
│                  handler                                        │
├────────────────────────────────────────────────────────────────┤
│  lib/            shared building blocks                         │
│   logger.ts (stderr)  result.ts (content)  http.ts  env.ts      │
└────────────────────────────────────────────────────────────────┘
```

The dependency direction only ever points **down**: tools use `lib`, the server
wires up tools, the entrypoint wires the server to a transport. Nothing lower
knows about anything higher, which keeps each layer independently testable.

## Request lifecycle

What happens when the model calls `get_weather`:

1. **Client → server (stdin).** The client writes a JSON-RPC `tools/call`
   message: `{ name: "get_weather", arguments: { city: "Austin" } }`.
2. **Transport decodes it.** `StdioServerTransport` reads the line and hands the
   parsed request to the `McpServer`.
3. **Schema validation.** The SDK looks up the tool, validates `arguments`
   against its **zod** schema, and applies defaults (`units` → `"fahrenheit"`).
   Invalid input never reaches your handler — it's rejected as an error result.
4. **Handler runs.** Your async function executes — here it calls Open-Meteo via
   `fetchJson` (which enforces a timeout), then shapes the response.
5. **Result is wrapped.** The handler returns `text(...)`, i.e. MCP `content`.
   Expected failures return `errorResult(...)` (`isError: true`); unexpected
   throws are caught by the SDK and returned as protocol errors — the process
   never crashes on one bad call.
6. **Server → client (stdout).** The transport serializes the result back over
   stdout. Meanwhile, any `logger.*` output went to **stderr**, so it never
   corrupts the protocol stream.

## Why these choices

**High-level `McpServer`, not the low-level `Server`.**
The SDK offers a low-level API (register raw `tools/list` and `tools/call`
handlers yourself) and a high-level one (`server.tool(name, desc, schema, fn)`).
The high-level API generates the tool listing and JSON Schema from your zod
shape and wires validation automatically, so there's a single source of truth
per tool and far less boilerplate to get wrong.

**zod for input schemas.**
Tools receive arguments from a model, so inputs are untrusted. zod gives runtime
validation, defaults, and — through the SDK — the JSON Schema the client uses to
know how to call the tool. One definition drives validation, typing, and
discovery.

**`buildServer()` is separate from the transport.**
This is the most important decision. Construction (which tools exist) is
isolated from connection (how bytes move). Production wires the server to
`StdioServerTransport`; tests wire the _same_ server to an `InMemoryTransport`
and drive it with a real MCP `Client`. Tests therefore exercise the genuine
request path — schema validation and all — with **no mocks**.

**stdio transport + stderr-only logging.**
stdio is MCP's default and needs no networking or ports. The non-obvious
consequence: **stdout is the protocol channel**, so a stray `console.log` would
corrupt it. All diagnostics go through `logger`, which writes to stderr.

**Modular tools with a single registration point.**
Each tool group is a self-contained `register*Tools(server)` file; `tools/index.ts`
is the one place that lists them. Adding a tool is "new file + one line," and no
other layer changes. This is what makes it a _template_ rather than an example.

**Errors: return vs throw.**
Two failure modes, handled deliberately. _Expected_ problems (a city that
doesn't exist) return `errorResult(...)` so the model gets a readable reason and
can adjust. _Unexpected_ problems (network blip) are left to throw; the SDK
converts them to error responses and the server keeps running. One bad call can
never take the process down.

**`node:test` + `tsx`, no test framework.**
The standard library test runner plus `tsx` (which resolves the project's
NodeNext `.js` import specifiers to `.ts` sources) keeps the dependency tree
small and the toolchain boring. Fewer moving parts, nothing to keep in sync.

**NodeNext ESM + `tsc` build.**
Native ES modules and Node's own resolution — the modern default, no bundler in
the loop. `tsc` emits `dist/`, and the `bin` entry is the compiled
`dist/index.js`.

**Multi-stage Docker, non-root.**
The build stage compiles TypeScript with full dev dependencies; the runtime
stage copies only `dist/` plus production dependencies and runs as the image's
non-root `node` user. The result is a smaller, lower-privilege image. There's no
`EXPOSE` because the server talks over stdio, not a port.

## Extending it

- **New tool:** add `src/tools/<name>.ts` exporting `register<Name>Tools`, then
  one line in `src/tools/index.ts`.
- **New shared capability** (a DB client, an API wrapper): add it under `src/lib`
  and import it from the tools that need it.
- **Config/secrets:** read from `process.env` (loaded by `lib/env.ts`); document
  the variable in `.env.example`. Never hard-code or commit secrets.
- **Other transports:** swap `StdioServerTransport` in `index.ts` for another
  (e.g. an HTTP/SSE transport) without touching `buildServer()` or any tool.
