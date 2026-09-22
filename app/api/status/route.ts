import { guard, failure } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    guard(req);
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
