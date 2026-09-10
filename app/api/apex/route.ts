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
  return NextResponse.json(result);
}
