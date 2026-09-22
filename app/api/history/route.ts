import { z } from "zod";
import { guard, failure } from "@/lib/auth";
import { history } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    guard(req);
    const id = z.string().uuid().parse(new URL(req.url).searchParams.get("id"));
    return Response.json({ messages: history(id) });
  } catch (e) {
    return failure(e);
  }
}
