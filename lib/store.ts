import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";

export const dataDir = () => resolve(process.env.DATA_DIR || "./data");
let instance: DatabaseSync | undefined;
export function db() {
  if (instance) return instance;
  mkdirSync(dataDir(), { recursive: true });
  const d = new DatabaseSync(join(dataDir(), "assistant.sqlite"));
  d.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, conversation TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation,id);
    CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, updated TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, title TEXT NOT NULL, due INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', completed INTEGER);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, task_id TEXT UNIQUE, content TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS locks(conversation TEXT PRIMARY KEY, token TEXT NOT NULL, expires INTEGER NOT NULL);
  `);
  instance = d;
  return d;
}
export type Message = { role: "user" | "assistant"; content: string };
export type Note = {
  id: string;
  title: string;
  content: string;
  updated: string;
};
export function history(id: string): Message[] {
  return (
    db()
      .prepare(
        "SELECT role, content FROM messages WHERE conversation=? ORDER BY id DESC LIMIT 16",
      )
      .all(id) as Message[]
  ).reverse();
}
export function append(id: string, role: string, content: string) {
  db()
    .prepare("INSERT INTO messages(conversation,role,content) VALUES(?,?,?)")
    .run(id, role, content.slice(0, 24000));
}
export function notes(): Note[] {
  return db()
    .prepare("SELECT * FROM notes ORDER BY updated DESC LIMIT 200")
    .all() as Note[];
}
export function saveNote(
  title: string,
  content: string,
  id: string = randomUUID(),
) {
  db()
    .prepare(
      `INSERT INTO notes(id,title,content) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,content=excluded.content,updated=CURRENT_TIMESTAMP`,
    )
    .run(id, title, content);
  return { id, title, content };
}
export function searchNotes(query: string) {
  const words = [
    ...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []),
  ].slice(0, 12);
  if (!words.length) return [];
  // Small personal vault: lexical retrieval without an embedding service.
  return notes()
    .map((n) => ({
      ...n,
      score: words.reduce(
        (s, w) =>
          s +
          (n.title.toLowerCase().includes(w) ? 3 : 0) +
          (n.content.toLowerCase().includes(w) ? 1 : 0),
        0,
      ),
    }))
    .filter((n) => n.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content.slice(0, 1800),
    }));
}
export function acquire(id: string, token: string) {
  return (
    db()
      .prepare(
        `INSERT INTO locks VALUES(?,?,?) ON CONFLICT(conversation) DO UPDATE SET token=excluded.token,expires=excluded.expires WHERE locks.expires < ?`,
      )
      .run(id, token, Date.now() + 190000, Date.now()).changes === 1
  );
}
export function release(id: string, token: string) {
  db()
    .prepare("DELETE FROM locks WHERE conversation=? AND token=?")
    .run(id, token);
}
export function tickTasks(now = Date.now()) {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const due = d
      .prepare("SELECT id,title FROM tasks WHERE status='pending' AND due<=?")
      .all(now) as { id: string; title: string }[];
    for (const t of due) {
      d.prepare(
        "INSERT OR IGNORE INTO events(task_id,content,created) VALUES(?,?,?)",
      ).run(t.id, t.title, now);
      d.prepare(
        "UPDATE tasks SET status='completed',completed=? WHERE id=?",
      ).run(now, t.id);
    }
    d.exec("COMMIT");
    return due.length;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
