import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { text } from "../lib/result.js";

/**
 * A stateful tool group backed by a JSON file under STATE_DIR. Demonstrates
 * persistence and several related tools sharing one resource. The path is read
 * per-call (not cached at import) so it stays configurable and test-friendly.
 */
type Notes = Record<string, string>;

function notesFile(): string {
  return path.join(process.env.STATE_DIR ?? "state", "notes.json");
}

function readNotes(): Notes {
  try {
    return JSON.parse(fs.readFileSync(notesFile(), "utf8")) as Notes;
  } catch {
    return {};
  }
}

function writeNotes(notes: Notes): void {
  const file = notesFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(notes, null, 2));
}

export function registerNoteTools(server: McpServer): void {
  server.tool(
    "note_set",
    "Save or overwrite a note by key.",
    { key: z.string().min(1), value: z.string() },
    async ({ key, value }) => {
      const notes = readNotes();
      notes[key] = value;
      writeNotes(notes);
      return text(`Saved note "${key}".`);
    },
  );

  server.tool("note_get", "Read a note by key.", { key: z.string().min(1) }, async ({ key }) => {
    const notes = readNotes();
    return key in notes ? text(notes[key] ?? "") : text(`No note found for "${key}".`);
  });

  server.tool("note_list", "List all saved note keys.", {}, async () => {
    const keys = Object.keys(readNotes());
    return text({ count: keys.length, keys });
  });

  server.tool(
    "note_delete",
    "Delete a note by key.",
    { key: z.string().min(1) },
    async ({ key }) => {
      const notes = readNotes();
      if (!(key in notes)) return text(`No note found for "${key}".`);
      delete notes[key];
      writeNotes(notes);
      return text(`Deleted note "${key}".`);
    },
  );
}
