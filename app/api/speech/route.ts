import { z } from "zod";
import { guard, failure, jsonBody, HttpError } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    guard(req);
    const { text } = z
      .object({ text: z.string().min(1).max(2500) })
      .strict()
      .parse(await jsonBody(req));
    if (!process.env.ELEVENLABS_API_KEY)
      throw new HttpError(
        409,
        "Use browser speech. No cloud voice is configured.",
      );
    const voice = encodeURIComponent(
      process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB",
    );
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
        }),
        signal: AbortSignal.any([req.signal, AbortSignal.timeout(30000)]),
      },
    );
    if (!r.ok)
      throw new HttpError(
        502,
        `Voice provider returned ${r.status}. Use browser voice or check your account.`,
      );
    return new Response(r.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
