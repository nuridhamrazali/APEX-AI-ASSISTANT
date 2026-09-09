import { NextRequest, NextResponse } from "next/server";
import { allowedOrigin } from "@/lib/request-origin";
import { spokenText } from "@/lib/personality";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  if (!allowedOrigin(req.headers, req.nextUrl, process.env.APEX_ALLOWED_ORIGINS)) return NextResponse.json({ error: "Page address not allowed." }, { status: 403 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || typeof body.text !== "string" || !body.text.trim() || body.text.length > 50000) return NextResponse.json({ error: "Invalid voice text." }, { status: 400 });
  const text = body.text;
  const configured = Number(process.env.FISH_AUDIO_SPEED || "1.15");
  const speed = Number.isFinite(configured) ? Math.min(2, Math.max(.5, configured)) : 1.15;
  const key = process.env.FISH_AUDIO_API_KEY;
  if (!key) return NextResponse.json({ audioBase64: null, voiceError: "Fish Audio is not configured. Add FISH_AUDIO_API_KEY on the server." });
  try {
    const audio = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", model: process.env.FISH_AUDIO_MODEL || "s2.1-pro-free" },
      body: JSON.stringify({ text: spokenText(text), reference_id: process.env.FISH_AUDIO_VOICE_ID || "e6b437b389c34041856d56d3cde1f494", format: "mp3", prosody: { speed } }),
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(45000)]),
    });
    if (!audio.ok) throw new Error("Voice unavailable");
    const bytes = await audio.arrayBuffer();
    if (!bytes.byteLength) throw new Error("Empty audio");
    return NextResponse.json({ audioBase64: Buffer.from(bytes).toString("base64"), audioMimeType: "audio/mpeg" });
  } catch {
    return NextResponse.json({ audioBase64: null, voiceError: "Fish Audio could not speak this reply. Check voice access, API key and quota. Your reply is available below." });
  }
}
