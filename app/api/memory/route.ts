import { z } from "zod";
import { guard, failure, jsonBody } from "@/lib/auth";
import { db, notes, saveNote } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    guard(req);
    return Response.json({ notes: notes() });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    guard(req);
    const n = z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().trim().min(1).max(200),
        content: z.string().trim().min(1).max(24000),
      })
      .strict()
      .parse(await jsonBody(req));
    return Response.json(saveNote(n.title, n.content, n.id));
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request) {
  try {
    guard(req);
    const { id } = z
      .object({ id: z.string().uuid() })
      .parse(await jsonBody(req));
    db().prepare("DELETE FROM notes WHERE id=?").run(id);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
