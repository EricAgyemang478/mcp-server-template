import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { callTool } from "./helpers.js";

// Point the notes tools at a throwaway directory so tests never touch real state.
const TMP_DIR = path.join(os.tmpdir(), `mcp-notes-test-${process.pid}`);

before(() => {
  process.env.STATE_DIR = TMP_DIR;
});

after(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

test("note_set then note_get round-trips a value", async () => {
  await callTool("note_set", { key: "greeting", value: "hi there" });
  const got = await callTool("note_get", { key: "greeting" });
  assert.equal(got, "hi there");
});

test("note_list includes saved keys; note_delete removes them", async () => {
  await callTool("note_set", { key: "alpha", value: "1" });
  const listed = JSON.parse(await callTool("note_list", {}));
  assert.ok(listed.keys.includes("alpha"));

  await callTool("note_delete", { key: "alpha" });
  const after = JSON.parse(await callTool("note_list", {}));
  assert.ok(!after.keys.includes("alpha"));
});

test("note_get reports a missing key clearly", async () => {
  const out = await callTool("note_get", { key: "does-not-exist" });
  assert.match(out, /No note found/);
});
