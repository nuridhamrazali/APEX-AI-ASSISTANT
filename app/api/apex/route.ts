import { z } from "zod";
import { randomUUID } from "node:crypto";
import { guard, jsonBody, failure, HttpError } from "@/lib/auth";
import { acquire, release } from "@/lib/store";
import { turn, type RunEvent } from "@/lib/turn";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    guard(req);
    const { prompt, conversationId } = z
      .object({
        prompt: z.string().trim().min(1).max(6000),
        conversationId: z.string().uuid(),
      })
      .strict()
      .parse(await jsonBody(req));
    const runId = randomUUID();
    if (!acquire(conversationId, runId))
      throw new HttpError(
        409,
        "A response is already running in this conversation.",
      );
    const abort = new AbortController(),
      signal = AbortSignal.any([
        req.signal,
        abort.signal,
        AbortSignal.timeout(180000),
      ]);
    let seq = 0;
    const encoder = new TextEncoder();
    const encode = (event: RunEvent) =>
      encoder.encode(
        `data: ${JSON.stringify({ version: 1, runId, seq: ++seq, event })}\n\n`,
      );
    const iterator = turn(conversationId, prompt, signal);
    const body = new ReadableStream<Uint8Array>({
      async pull(c) {
        try {
          const n = await iterator.next();
          if (n.done) {
            release(conversationId, runId);
            c.close();
          } else c.enqueue(encode(n.value));
        } catch (e) {
          release(conversationId, runId);
          c.enqueue(
            encode({
              type: signal.aborted ? "run.cancelled" : "run.failed",
              message: signal.aborted
                ? "Request stopped or timed out."
                : e instanceof Error
                  ? e.message
                  : "Request failed",
            }),
          );
          c.close();
        }
      },
      async cancel() {
        abort.abort();
        await iterator.return(undefined);
        release(conversationId, runId);
      },
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
