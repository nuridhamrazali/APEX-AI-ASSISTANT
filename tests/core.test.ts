import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
const temp = mkdtempSync(join(tmpdir(), "apex-test-"));
process.env.DATA_DIR = temp;
process.env.LLM_PROVIDER = "ollama";
process.env.APP_PASSWORD = "test-password-long";
process.env.SESSION_SECRET = "a".repeat(64);
process.env.APP_ORIGIN = "http://localhost:3000";
import {
  db,
  saveNote,
  searchNotes,
  append,
  history,
  acquire,
  release,
  tickTasks,
} from "../lib/store";
import { session, valid, guard, jsonBody } from "../lib/auth";
import { turn } from "../lib/turn";
after(() => {
  db().close();
  rmSync(temp, { recursive: true, force: true });
});
test("signed session rejects tampering and unauthenticated access", () => {
  const s = session();
  assert.equal(valid(s), true);
  assert.equal(valid(s + "x"), false);
  assert.throws(() => guard(new Request("http://localhost:3000/api/memory")));
  assert.throws(() =>
    guard(
      new Request("http://localhost:3000/api/memory", {
        method: "POST",
        headers: {
          cookie: `apex_session=${s}`,
          origin: "https://evil.example",
        },
      }),
    ),
  );
});
test("oversized JSON bodies are rejected", async () => {
  await assert.rejects(
    jsonBody(
      new Request("http://localhost:3000", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "x".repeat(70000),
      }),
    ),
  );
});
test("notes retrieve, edit, and delete without an embedding provider", () => {
  const n = saveNote("Learning", "I am learning Kubernetes.");
  assert.equal(searchNotes("Kubernetes")[0].id, n.id);
  saveNote("Learning", "I am learning Docker.", n.id);
  assert.equal(searchNotes("Kubernetes").length, 0);
  assert.equal(searchNotes("Docker").length, 1);
  db().prepare("DELETE FROM notes WHERE id=?").run(n.id);
  assert.equal(searchNotes("Docker").length, 0);
});
test("history and active locks are isolated by conversation", () => {
  const a = randomUUID(),
    b = randomUUID();
  append(a, "user", "private");
  assert.equal(history(a).length, 1);
  assert.equal(history(b).length, 0);
  assert.equal(acquire(a, "one"), true);
  assert.equal(acquire(a, "two"), false);
  release(a, "wrong");
  assert.equal(acquire(a, "two"), false);
  release(a, "one");
  assert.equal(acquire(a, "two"), true);
  release(a, "two");
});
test("reminder verification is atomic and idempotent", () => {
  const id = randomUUID();
  db()
    .prepare("INSERT INTO tasks(id,title,due) VALUES(?,?,?)")
    .run(id, "test", 1);
  assert.equal(tickTasks(2), 1);
  assert.equal(tickTasks(3), 0);
  assert.equal(
    db().prepare("SELECT count(*) AS n FROM events WHERE task_id=?").get(id)?.n,
    1,
  );
});
test("streaming tool request executes before final output and persists answer", async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    requests++;
    if (requests === 2) assert.equal(body.messages.at(-1).role, "tool");
    const chunks =
      requests === 1
        ? [
            {
              message: {
                role: "assistant",
                content: "",
                tool_calls: [
                  {
                    function: {
                      name: "current_time",
                      arguments: { timeZone: "Asia/Kuala_Lumpur" },
                    },
                  },
                ],
              },
              done: true,
            },
          ]
        : [
            { message: { content: "The time " }, done: false },
            { message: { content: "is available." }, done: true },
          ];
    return new Response(chunks.map((c) => JSON.stringify(c)).join("\n") + "\n");
  };
  try {
    const id = randomUUID(),
      events = [];
    for await (const e of turn(
      id,
      "What time is it?",
      new AbortController().signal,
    ))
      events.push(e);
    assert.equal(requests, 2);
    assert.ok(
      events.find(
        (e) => e.type === "tool.finished" && e.name === "current_time" && e.ok,
      ),
    );
    assert.equal(events.at(-1)?.type, "run.completed");
    assert.equal(history(id).at(-1)?.content, "The time is available.");
  } finally {
    globalThis.fetch = original;
  }
});
test("truncated provider stream cannot report success", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: { content: "partial" } }) + "\n");
  try {
    await assert.rejects(async () => {
      for await (const _ of turn(
        randomUUID(),
        "hi",
        new AbortController().signal,
      )) {
      }
    }, /before completion/);
  } finally {
    globalThis.fetch = original;
  }
});
