// Explicit one-way import/export; never auto-overwrites the user's vault.
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  lstatSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { notes, saveNote } from "../lib/store";
const [mode, folder] = process.argv.slice(2);
if (!folder || !["import", "export"].includes(mode)) {
  console.error("Usage: npm run obsidian -- import|export /path/to/folder");
  process.exit(1);
}
const root = resolve(folder);
mkdirSync(root, { recursive: true });
let count = 0;
if (mode === "export")
  for (const n of notes()) {
    const filename = join(
      root,
      `${n.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)}-${n.id}.md`,
    );
    try {
      writeFileSync(filename, `# ${n.title}\n\n${n.content}\n`, { flag: "wx" });
      count++;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
  }
else {
  for (const f of readdirSync(root).sort()) {
    if (count >= 200) break;
    const path = join(root, f),
      stat = lstatSync(path);
    if (
      !f.endsWith(".md") ||
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.size > 24000
    )
      continue;
    const hex = createHash("sha256").update(path).digest("hex");
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
    saveNote(f.replace(/\.md$/, ""), readFileSync(path, "utf8"), id);
    count++;
  }
}
console.log(
  `${mode}: ${count} notes. Top-level Markdown only; existing exported files are preserved.`,
);
