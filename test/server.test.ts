import { test } from "node:test";
import assert from "node:assert/strict";
import { withClient } from "./helpers.js";

test("server advertises all expected tools", async () => {
  await withClient(async (client) => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);

    for (const expected of [
      "text_stats",
      "get_weather",
      "note_set",
      "note_get",
      "note_list",
      "note_delete",
    ]) {
      assert.ok(names.includes(expected), `missing tool: ${expected}`);
    }
  });
});

test("every tool exposes a description and input schema", async () => {
  await withClient(async (client) => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      assert.ok(tool.description && tool.description.length > 0, `${tool.name} has no description`);
      assert.equal(tool.inputSchema.type, "object", `${tool.name} has no object input schema`);
    }
  });
});

test("invalid arguments are rejected by schema validation", async () => {
  await withClient(async (client) => {
    // text_stats requires `text: string`; omit it.
    const result = await client.callTool({ name: "text_stats", arguments: {} });
    assert.equal(result.isError, true);
  });
});
