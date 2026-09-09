import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import os from "node:os";
import type { Turn } from "./personality";
export type HermesReply = { text: string; harness: "hermes"; memorySaved: boolean; memoryNote: string };
let worker: ChildProcessWithoutNullStreams | undefined;
let busy = false;
let idle: ReturnType<typeof setTimeout> | undefined;

export function runHermes(prompt: string, history: Turn[], system: string, signal?: AbortSignal): Promise<HermesReply> {
  if (busy) return Promise.reject(new Error("APEX is processing another request. Please wait or stop it first."));
  if (signal?.aborted) return Promise.reject(new Error("Request stopped."));
  busy = true;
  clearTimeout(idle);
  return new Promise((resolve, reject) => {
    if (!worker || worker.killed || worker.exitCode !== null) {
      const source = process.env.HERMES_SOURCE_DIR || path.join(os.homedir(), "hermes-agent");
      const python = process.env.HERMES_PYTHON || path.join(source, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
      worker = spawn(/* turbopackIgnore: true */ python, [path.join(process.cwd(), "bridge/hermes_runner.py"), "--worker"], {
        shell: false, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: "utf-8", HERMES_SOURCE_DIR: source },
      });
      worker.stdout.setEncoding("utf8");
      worker.stderr.resume();
      worker.stdin.on("error", () => {});
      worker.on("error", () => {}); // per-request handler below reports failures
    }
    const child = worker;
    let output = "", settled = false;
    const done = (error?: Error, result?: HermesReply) => {
      if (settled) return;
      settled = true; busy = false; clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      child.stdout.off("data", data); child.off("error", failure); child.off("close", closed);
      if (error) {
        child.kill(); if (worker === child) worker = undefined;
        reject(error);
      } else {
        idle = setTimeout(() => { if (worker === child && !busy) { child.kill(); worker = undefined; } }, 300000);
        idle.unref(); resolve(result!);
      }
    };
    const failure = () => done(new Error("Cannot start Hermes. Check HERMES_PYTHON and HERMES-SETUP.md."));
    const closed = () => done(new Error("Hermes stopped before returning a reply."));
    const abort = () => done(new Error("Request stopped."));
    const data = (chunk: string) => {
      output += chunk;
      if (output.length > 2000000) return done(new Error("Hermes response exceeded the limit."));
      const end = output.indexOf("\n");
      if (end < 0) return;
      try {
        const result = JSON.parse(output.slice(0, end));
        if (result.error) return done(new Error(result.error));
        if (typeof result.text !== "string" || !result.text.trim()) return done(new Error("Hermes returned no reply."));
        done(undefined, result);
      } catch { done(new Error("Invalid Hermes response.")); }
    };
    const timer = setTimeout(() => done(new Error("Hermes took too long. The submitted message may already be saved in Obsidian.")), 240000);
    child.stdout.on("data", data); child.once("error", failure); child.once("close", closed);
    signal?.addEventListener("abort", abort, { once: true });
    child.stdin.write(JSON.stringify({ prompt, history, system }) + "\n");
  });
}
