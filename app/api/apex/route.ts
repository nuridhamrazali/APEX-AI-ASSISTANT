import { runHermes, type HermesReply } from "@/lib/hermes";
import { NextRequest, NextResponse } from "next/server";
import { allowedOrigin } from "@/lib/request-origin";
import { PERSONALITIES, systemPrompt, spokenText, type Personality, type Turn } from "@/lib/personality";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(req: NextRequest) {
  if (!allowedOrigin(req.headers, req.nextUrl, process.env.APEX_ALLOWED_ORIGINS)) return NextResponse.json({ error: "This page address is not allowed. Open APEX at the server address, or add your exact public URL to APEX_ALLOWED_ORIGINS on the server." }, { status: 403 });
  let body;
  try { body = JSON.parse(await req.text()); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 6000) {
    return NextResponse.json({ error: "Enter a message of 1–6000 characters." }, { status: 400 });
  }
  const history: Turn[] = Array.isArray(body.history) ? body.history.slice(-12) : [];
  if (history.some(t => !t || !["user", "assistant"].includes(t.role) || typeof t.text !== "string" || t.text.length > 12000)) {
    return NextResponse.json({ error: "Invalid conversation history." }, { status: 400 });
  }
  const mode: Personality = Object.prototype.hasOwnProperty.call(PERSONALITIES, body.personality ?? "") ? body.personality : "balanced";
  let result: HermesReply;
  try {
    result = await runHermes(body.prompt.trim(), history, systemPrompt(mode), req.signal);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Hermes failed to respond." }, { status: 502 });
  }
  const { text } = result;
  const key = process.env.FISH_AUDIO_API_KEY;
  if (!key) return NextResponse.json({ ...result, audioBase64: null, voiceError: "Fish Audio is not configured. Add FISH_AUDIO_API_KEY on the server." });
  try {
    const audio = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", model: process.env.FISH_AUDIO_MODEL || "s2.1-pro-free" },
      body: JSON.stringify({ text: spokenText(text), reference_id: process.env.FISH_AUDIO_VOICE_ID || "e6b437b389c34041856d56d3cde1f494", format: "mp3", prosody: { speed: 0.95 } }),
      signal: AbortSignal.timeout(45000),
    });
    if (!audio.ok) throw new Error("Voice unavailable");
    const bytes = await audio.arrayBuffer();
    if (!bytes.byteLength) throw new Error("Empty audio");
    return NextResponse.json({ ...result, audioBase64: Buffer.from(bytes).toString("base64"), audioMimeType: "audio/mpeg" });
  } catch {
    return NextResponse.json({ ...result, audioBase64: null, voiceError: "Fish Audio could not speak this reply. Check voice access, API key and quota. Your reply is available below." });
  }
}
