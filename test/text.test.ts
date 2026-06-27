import { test } from "node:test";
import assert from "node:assert/strict";
import { callTool } from "./helpers.js";

test("text_stats counts characters, words, and lines", async () => {
  const out = await callTool("text_stats", { text: "hello world\nsecond line" });
  const data = JSON.parse(out);
  assert.equal(data.words, 4);
  assert.equal(data.lines, 2);
  assert.equal(data.characters, "hello world\nsecond line".length);
});

test("text_stats handles empty input", async () => {
  const out = await callTool("text_stats", { text: "" });
  const data = JSON.parse(out);
  assert.equal(data.words, 0);
  assert.equal(data.characters, 0);
});
