export type ModelMessage = {
  role: string;
  content: string;
  tool_calls?: unknown[];
  tool_name?: string;
};
export type ModelChunk = {
  message?: {
    content?: string;
    tool_calls?: { function: { name: string; arguments: unknown } }[];
  };
  done?: boolean;
  done_reason?: string;
  error?: string;
};
export async function* modelStream(
  messages: ModelMessage[],
  tools: unknown[],
  signal: AbortSignal,
): AsyncGenerator<ModelChunk> {
  const base = (
    process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"
  ).replace(/\/$/, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.OLLAMA_API_KEY)
    headers.Authorization = `Bearer ${process.env.OLLAMA_API_KEY}`;
  let res: Response;
  try {
    res = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "qwen3:4b",
        messages,
        tools,
        stream: true,
        think: false,
        keep_alive: "10m",
        options: { num_ctx: 8192, num_predict: 1200 },
      }),
    });
  } catch {
    signal.throwIfAborted();
    throw new Error(
      "Cannot reach Ollama. Start Ollama and check OLLAMA_BASE_URL.",
    );
  }
  if (!res.ok || !res.body)
    throw new Error(
      `Ollama returned HTTP ${res.status}. Check the model is downloaded and supports tools.`,
    );
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let pending = "";
  let done = false;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      pending += part.value;
      if (pending.length > 262144) throw new Error("Model event too large");
      let n: number;
      while ((n = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, n);
        pending = pending.slice(n + 1);
        if (!line.trim()) continue;
        const c: ModelChunk = JSON.parse(line);
        if (c.error) throw new Error(c.error.slice(0, 200));
        done ||= !!c.done;
        yield c;
      }
    }
    if (pending.trim()) {
      const c: ModelChunk = JSON.parse(pending);
      if (c.error) throw new Error(c.error.slice(0, 200));
      done ||= !!c.done;
      yield c;
    }
    if (!done) throw new Error("Model connection ended before completion");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
