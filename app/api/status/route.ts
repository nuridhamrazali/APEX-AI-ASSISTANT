import { guard, failure } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    guard(req);
    if ((process.env.LLM_PROVIDER || "openai") === "openai") {
      const model = process.env.OPENAI_MODEL || "gpt-6-astra";
      let connected = false;
      if (process.env.OPENAI_API_KEY) {
        try {
          const r = await fetch("https://api.openai.com/v1/models/" + encodeURIComponent(model), {
            headers: {Authorization: "Bearer " + process.env.OPENAI_API_KEY},
            signal: AbortSignal.timeout(5000),
          });
          connected = r.ok;
        } catch {}
      }
      return Response.json({
        provider: "OpenAI", model, connected, models: connected ? [model] : [],
        reasoning: process.env.OPENAI_REASONING_EFFORT || "low",
        memory: "SQLite · local lexical search",
        tts: process.env.ELEVENLABS_API_KEY ? "elevenlabs" : "browser",
      });
    }
    let connected = false;
    let models: string[] = [];
    try {
      const h: Record<string, string> = {};
      if (process.env.OLLAMA_API_KEY)
        h.Authorization = `Bearer ${process.env.OLLAMA_API_KEY}`;
      const r = await fetch(
        `${(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "")}/api/tags`,
        { headers: h, signal: AbortSignal.timeout(3000) },
      );
      if (r.ok) {
        const d = await r.json();
        models = (d.models || []).map((m: { name: string }) => m.name);
        connected = true;
      }
    } catch {}
    return Response.json({
      provider: "Ollama",
      model: process.env.OLLAMA_MODEL || "qwen3:4b",
      connected,
      models,
      memory: "SQLite · local lexical search",
      tts: process.env.ELEVENLABS_API_KEY ? "elevenlabs" : "browser",
    });
  } catch (e) {
    return failure(e);
  }
}
