"use client";
import { useEffect, useRef, useState } from "react";
import { createParser } from "eventsource-parser";
import { z } from "zod";
import type { OrbState } from "./ApexHeroOrb";
type Msg = { role: string; content: string };
type Note = { id: string; title: string; content: string };
type Task = { id: string; title: string; due: number; status: string };
const eventSchema = z.object({
  version: z.literal(1),
  runId: z.string().uuid(),
  seq: z.number().int(),
  event: z.object({
    type: z.string(),
    text: z.string().optional(),
    name: z.string().optional(),
    callId: z.string().optional(),
    ok: z.boolean().optional(),
    message: z.string().optional(),
    helper: z.string().optional(),
  }),
});
async function api(
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
) {
  const r = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) {
    location.href = "/login";
    throw new Error("Sign in required");
  }
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}
export default function AssistantConsole({
  onState,
  onFace,
  onTrace,
}: {
  onState: (s: OrbState) => void;
  onFace: (v: boolean) => void;
  onTrace: (helper: string) => void;
}) {
  const [open, setOpen] = useState(true),
    [tab, setTab] = useState("chat"),
    [text, setText] = useState(""),
    [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState("Standby"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [voice, setVoice] = useState(false),
    [lang, setLang] = useState("en-US");
  const [provider, setProvider] = useState<{
      model: string;
      connected: boolean;
      tts: string;
    } | null>(null),
    [log, setLog] = useState<string[]>([]);
  const [memory, setMemory] = useState<Note[]>([]),
    [editId, setEditId] = useState<string | undefined>(),
    [title, setTitle] = useState(""),
    [content, setContent] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]),
    [taskTitle, setTaskTitle] = useState(""),
    [due, setDue] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]),
    [voiceName, setVoiceName] = useState("");
  const id = useRef(""),
    generation = useRef(0),
    abort = useRef<AbortController | null>(null),
    recognition = useRef<any>(null),
    audio = useRef<HTMLAudioElement | null>(null),
    ctx = useRef<AudioContext | null>(null),
    cleanupAudio = useRef<() => void>(() => {}),
    msgEnd = useRef<HTMLDivElement | null>(null);
  const listenRef = useRef<() => void>(() => {});
  listenRef.current = () => listen();
  const state = (s: OrbState, label: string) => {
    onState(s);
    setStatus(label);
  };
  function stop() {
    generation.current++;
    abort.current?.abort();
    recognition.current?.abort();
    recognition.current = null;
    audio.current?.pause();
    cleanupAudio.current();
    window.speechSynthesis?.cancel();
    setBusy(false);
    state("idle", "Stopped");
  }
  useEffect(() => {
    id.current =
      localStorage.getItem("apex.conversation") || crypto.randomUUID();
    localStorage.setItem("apex.conversation", id.current);
    api(`/api/history?id=${id.current}`)
      .then((d) => setMessages(d.messages))
      .catch((e) => setError(e.message));
    api("/api/status")
      .then(setProvider)
      .catch((e) => setError(e.message));
    const update = () => setVoices(window.speechSynthesis?.getVoices() || []);
    update();
    window.speechSynthesis?.addEventListener("voiceschanged", update);
    const mic = () => listenRef.current();
    window.addEventListener("assistant:listen", mic);
    return () => {
      generation.current++;
      abort.current?.abort();
      recognition.current?.abort();
      audio.current?.pause();
      cleanupAudio.current();
      window.speechSynthesis?.cancel();
      ctx.current?.close();
      window.speechSynthesis?.removeEventListener("voiceschanged", update);
      window.removeEventListener("assistant:listen", mic);
    };
    // Mic button in the HUD uses the latest language through the console button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    msgEnd.current?.scrollIntoView({ block: "nearest" });
  }, [messages, status]);
  useEffect(() => {
    if (tab === "memory")
      api("/api/memory")
        .then((d) => setMemory(d.notes))
        .catch((e) => setError(e.message));
  }, [tab]);
  useEffect(() => {
    const refresh = () =>
      api("/api/tasks")
        .then((d) => setTasks(d.tasks))
        .catch(() => {});
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, []);
  async function speak(value: string, token: number) {
    const spoken = value
      .replace(/```[\s\S]*?```/g, " Code is shown in the conversation. ")
      .replace(/[#*_`]/g, "")
      .slice(0, 2400);
    if (!spoken.trim() || generation.current !== token) return;
    if (provider?.tts === "elevenlabs") {
      state("thinking", "Preparing speech");
      try {
        const r = await fetch("/api/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: spoken }),
          signal: abort.current?.signal,
        });
        if (!r.ok)
          throw new Error(
            "Cloud voice failed; choose browser voice in server settings.",
          );
        const blob = await r.blob();
        if (generation.current !== token) return;
        const url = URL.createObjectURL(blob),
          a = new Audio(url);
        audio.current = a;
        const context = (ctx.current ||= new AudioContext());
        await context.resume();
        const source = context.createMediaElementSource(a),
          analyser = context.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(context.destination);
        let frame = 0;
        const values = new Float32Array(analyser.fftSize);
        const tick = () => {
          analyser.getFloatTimeDomainData(values);
          let n = 0;
          for (const v of values) n += v * v;
          document.documentElement.style.setProperty(
            "--voice-level",
            String(Math.min(1, Math.sqrt(n / values.length) * 5)),
          );
          frame = requestAnimationFrame(tick);
        };
        cleanupAudio.current = () => {
          cancelAnimationFrame(frame);
          source.disconnect();
          analyser.disconnect();
          URL.revokeObjectURL(url);
          document.documentElement.style.setProperty("--voice-level", "0");
        };
        a.onplaying = () => {
          if (generation.current === token) {
            state("speaking", "Speaking");
            tick();
          }
        };
        a.onended = () => {
          cleanupAudio.current();
          if (generation.current === token) state("idle", "Standby");
        };
        a.onerror = () => {
          cleanupAudio.current();
          if (generation.current === token) {
            setError("Audio could not play. Your text answer is available.");
            state("idle", "Audio error");
          }
        };
        await a.play();
        return;
      } catch (e) {
        if (generation.current !== token) return;
        setError(e instanceof Error ? e.message : "Voice failed");
        state("idle", "Voice unavailable");
        return;
      }
    }
    if (!window.speechSynthesis) {
      setError("Speech output is unavailable in this browser.");
      return;
    }
    const u = new SpeechSynthesisUtterance(spoken);
    u.lang = lang;
    u.voice = voices.find((v) => v.name === voiceName) || null;
    u.onstart = () => {
      if (generation.current === token) state("speaking", "Speaking");
    };
    u.onend = () => {
      if (generation.current === token) state("idle", "Standby");
    };
    u.onerror = () => {
      if (generation.current === token) state("idle", "Speech stopped");
    };
    window.speechSynthesis.speak(u);
  }
  async function send(prompt: string) {
    if (!prompt.trim()) return;
    stop();
    const token = generation.current;
    abort.current = new AbortController();
    setBusy(true);
    setError("");
    setLog([]);
    setTab("chat");
    setOpen(true);
    state("thinking", "Thinking");
    setMessages((m) => [
      ...m,
      { role: "user", content: prompt },
      { role: "assistant", content: "" },
    ]);
    let answer = "",
      terminal = false,
      run = "",
      last = 0;
    const lower = prompt.toLowerCase();
    if (/hide (face|humanoid)|back to orb/.test(lower)) onFace(false);
    else if (/show.*face|materialize|show.*humanoid/.test(lower)) onFace(true);
    try {
      const r = await fetch("/api/apex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, conversationId: id.current }),
        signal: abort.current.signal,
      });
      if (!r.ok || !r.body) {
        const d = await r.json();
        throw new Error(d.error || "Chat failed");
      }
      const parser = createParser({
        onEvent(raw) {
          if (generation.current !== token) return;
          const e = eventSchema.parse(JSON.parse(raw.data));
          if (run && run !== e.runId) return;
          run = e.runId;
          if (e.seq <= last) return;
          last = e.seq;
          const v = e.event;
          if (v.type === "text.delta") {
            answer += v.text || "";
            setMessages((m) => [
              ...m.slice(0, -1),
              { role: "assistant", content: answer },
            ]);
          }
          if (v.type === "model.started") state("thinking", "Thinking");
          if (v.type === "tool.started") {
            state("thinking", `Running ${v.name}`);
            onTrace(v.helper || "chief_of_staff");
            setLog((l) => [...l, `▶ ${v.name}`]);
          }
          if (v.type === "tool.finished")
            setLog((l) => [...l, `${v.ok ? "✓" : "✕"} ${v.name}`]);
          if (v.type === "run.completed") terminal = true;
          if (v.type === "run.failed" || v.type === "run.cancelled")
            throw new Error(v.message || "Request ended");
        },
      });
      const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
      try {
        while (true) {
          const p = await reader.read();
          if (p.done) break;
          parser.feed(p.value);
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      if (!terminal) throw new Error("Connection ended before completion");
      if (generation.current !== token) return;
      state("idle", "Standby");
      setBusy(false);
      if (voice) await speak(answer, token);
    } catch (e) {
      if (generation.current !== token) return;
      setError(e instanceof Error ? e.message : "Request failed");
      state("idle", "Error");
      setBusy(false);
    }
  }
  function listen() {
    stop();
    setError("");
    const R =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!R) {
      setError(
        "Use Chrome or Edge for microphone input, or type your message.",
      );
      setOpen(true);
      return;
    }
    const r = new R();
    recognition.current = r;
    const token = generation.current;
    r.lang = lang;
    r.continuous = false;
    r.interimResults = false;
    r.onstart = () => {
      if (generation.current === token) state("listening", "Listening");
    };
    r.onresult = (e: any) => {
      if (generation.current === token) send(e.results[0][0].transcript);
    };
    r.onerror = (e: any) => {
      if (generation.current === token) {
        setError(`Microphone: ${e.error}. Check browser permissions.`);
        state("idle", "Microphone stopped");
      }
    };
    r.onend = () => {
      if (generation.current === token) state("idle", "Standby");
    };
    try {
      r.start();
    } catch {
      setError("Microphone could not start.");
    }
  }
  async function save() {
    try {
      await api("/api/memory", { id: editId, title, content });
      setMemory((await api("/api/memory")).notes);
      setEditId(undefined);
      setTitle("");
      setContent("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function download(n: Note) {
    const url = URL.createObjectURL(
      new Blob([`# ${n.title}\n\n${n.content}\n`], { type: "text/markdown" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${n.title.replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 80) || "note"}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <aside className="assistant-console" aria-label="Assistant controls">
      {open && (
        <section className="assistant-panel">
          <header>
            <strong>PERSONAL ASSISTANT</strong>
            <button onClick={() => setOpen(false)} aria-label="Hide panel">
              ×
            </button>
          </header>
          <nav>
            {["chat", "memory", "reminders", "settings"].map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                onClick={() => {
                  setTab(t);
                  setError("");
                }}
              >
                {t}
              </button>
            ))}
          </nav>
          <div className="assistant-status" role="status">
            {status} ·{" "}
            {provider?.connected ? provider.model : "Model disconnected"}
          </div>
          {error && (
            <p className="assistant-error" role="alert">
              {error}
            </p>
          )}
          {tab === "chat" && (
            <>
              <div
                className="assistant-messages"
                role="log"
                aria-label="Conversation"
              >
                {messages.length === 0 && (
                  <p>
                    Type a message, or press Mic. Save useful facts in Memory so
                    they can be recalled later.
                  </p>
                )}
                {messages.map((m, i) => (
                  <article key={i} data-role={m.role}>
                    <small>{m.role === "user" ? "YOU" : "ASSISTANT"}</small>
                    <div>{m.content || "…"}</div>
                  </article>
                ))}
                <div ref={msgEnd} />
              </div>
              {log.length > 0 && (
                <details className="assistant-tools">
                  <summary>Tool activity ({log.length})</summary>
                  {log.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </details>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(text);
                  setText("");
                }}
              >
                <input
                  aria-label="Message"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={6000}
                  placeholder="Ask anything…"
                />
                <button disabled={busy || !text.trim()}>Send</button>
              </form>
              <button
                disabled={busy}
                onClick={() => {
                  stop();
                  id.current = crypto.randomUUID();
                  localStorage.setItem("apex.conversation", id.current);
                  setMessages([]);
                  setError("");
                }}
              >
                New conversation
              </button>
            </>
          )}
          {tab === "memory" && (
            <div className="assistant-scroll">
              <p>
                Private notes · no embedding API. Import or export Markdown for
                Obsidian. Search uses matching words.
              </p>
              <input
                aria-label="Note title"
                placeholder="Title"
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                aria-label="Note content"
                placeholder="A preference or fact to remember"
                value={content}
                maxLength={24000}
                onChange={(e) => setContent(e.target.value)}
              />
              <button
                onClick={save}
                disabled={!title.trim() || !content.trim()}
              >
                {editId ? "Update note" : "Save note"}
              </button>
              {editId && (
                <button
                  onClick={() => {
                    setEditId(undefined);
                    setTitle("");
                    setContent("");
                  }}
                >
                  Cancel edit
                </button>
              )}
              <label>
                Import .md
                <input
                  type="file"
                  accept=".md,.txt"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 24000) {
                      setError("Choose a note smaller than 24 KB.");
                      return;
                    }
                    setEditId(undefined);
                    setTitle(f.name.replace(/\.(md|txt)$/, ""));
                    setContent(await f.text());
                  }}
                />
              </label>
              {memory.map((n) => (
                <article key={n.id}>
                  <strong>{n.title}</strong>
                  <p>{n.content.slice(0, 160)}</p>
                  <button
                    onClick={() => {
                      setEditId(n.id);
                      setTitle(n.title);
                      setContent(n.content);
                    }}
                  >
                    Edit
                  </button>
                  <button onClick={() => download(n)}>Export .md</button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete note “${n.title}”?`)) return;
                      try {
                        await api("/api/memory", { id: n.id }, "DELETE");
                        setMemory((m) => m.filter((x) => x.id !== n.id));
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
          )}
          {tab === "reminders" && (
            <div className="assistant-scroll">
              <p>
                Reminders are saved on the server. Due items appear here; this
                version does not send push notifications.
              </p>
              <input
                aria-label="Reminder"
                placeholder="Reminder"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
              <input
                aria-label="Due date and time"
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
              <button
                onClick={async () => {
                  try {
                    await api("/api/tasks", {
                      title: taskTitle,
                      due: new Date(due).getTime(),
                    });
                    setTasks((await api("/api/tasks")).tasks);
                    setTaskTitle("");
                    setDue("");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
                disabled={!taskTitle || !due}
              >
                Save reminder
              </button>
              {tasks.map((t) => (
                <article key={t.id}>
                  <strong>{t.title}</strong>
                  <p>
                    {new Date(t.due).toLocaleString()} ·{" "}
                    {t.status === "completed" ? "DUE" : t.status}
                  </p>
                  {t.status === "pending" && (
                    <button
                      onClick={async () => {
                        try {
                          await api("/api/tasks", { id: t.id }, "DELETE");
                          setTasks((await api("/api/tasks")).tasks);
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
          {tab === "settings" && (
            <div className="assistant-scroll">
              <label>
                <input
                  type="checkbox"
                  checked={voice}
                  onChange={(e) => setVoice(e.target.checked)}
                />{" "}
                Read answers aloud
              </label>
              <label>
                Speech language
                <select value={lang} onChange={(e) => setLang(e.target.value)}>
                  <option value="en-US">English</option>
                  <option value="ms-MY">Bahasa Melayu</option>
                </select>
              </label>
              <label>
                Browser voice
                <select
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                >
                  <option value="">System default</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Voice output: {provider?.tts || "browser"}. Browser microphone
                recognition may use the browser vendor’s online service.
              </p>
              <button
                onClick={() =>
                  api("/api/status")
                    .then(setProvider)
                    .catch((e) => setError(e.message))
                }
              >
                Check model connection
              </button>
              <p>
                Model and server configuration: .env.local. Memory is stored in
                data/assistant.sqlite.
              </p>
              <button
                onClick={async () => {
                  stop();
                  await api("/api/auth", {}, "DELETE");
                  location.href = "/login";
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </section>
      )}
      <div className="assistant-toolbar">
        <span>{status}</span>
        <button onClick={listen}>Mic</button>
        <button onClick={stop}>Stop</button>
        <button onClick={() => onFace(true)}>Avatar</button>
        <button onClick={() => setOpen(!open)}>{open ? "Hide" : "Chat"}</button>
      </div>
    </aside>
  );
}
