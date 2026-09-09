import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import type { Turn } from "./personality";
export type HermesReply = { text: string; harness: "hermes"; memorySaved: boolean; memoryNote: string };
export function runHermes(prompt: string, history: Turn[], system: string, signal?: AbortSignal): Promise<HermesReply> {
  const source = process.env.HERMES_SOURCE_DIR || path.join(os.homedir(), "hermes-agent");
  const python = process.env.HERMES_PYTHON || path.join(source, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  return new Promise((resolve, reject) => {
    const child = spawn(/* turbopackIgnore: true */ python, [path.join(process.cwd(), "bridge/hermes_runner.py")], {
      shell: false, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: "utf-8", HERMES_SOURCE_DIR: source }, signal,
    });
    child.stdout.setEncoding("utf8");
    let output = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("Hermes took too long. Your submitted message may already be saved in Obsidian.")); }, 240000);
    child.stdout.on("data", chunk => {
      output += chunk.toString();
      if (output.length > 2000000) { child.kill(); reject(new Error("Hermes reply exceeded the response limit.")); }
    });
    // Drain output without logging private provider requests or conversation data.
    child.stderr.resume();
    child.stdin.on("error", () => {});
    child.on("error", () => { clearTimeout(timer); reject(new Error("Cannot start Hermes. Complete HERMES-SETUP.md and check HERMES_PYTHON in .env.local.")); });
    child.on("close", () => {
      clearTimeout(timer);
      try {
        const result = JSON.parse(output);
        if (result.error) throw new Error(result.error);
        if (typeof result.text !== "string" || !result.text.trim()) throw new Error("Hermes returned no reply.");
        resolve(result);
      } catch (error) { reject(error instanceof Error ? error : new Error("Invalid Hermes response.")); }
    });
    child.stdin.end(JSON.stringify({ prompt, history, system }));
  });
}
