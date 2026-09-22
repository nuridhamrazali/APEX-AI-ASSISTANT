import { z } from "zod";
import { guard, failure, jsonBody } from "@/lib/auth";
import { db, tickTasks } from "@/lib/store";
import { addReminder } from "@/lib/tools";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    guard(req);
    tickTasks();
    return Response.json({
      tasks: db()
        .prepare("SELECT * FROM tasks ORDER BY due DESC LIMIT 100")
        .all(),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    guard(req);
    const a = z
      .object({
        title: z.string().trim().min(1).max(300),
        due: z
          .number()
          .int()
          .min(Date.now())
          .max(Date.now() + 366 * 86400000),
      })
      .strict()
      .parse(await jsonBody(req));
    return Response.json(addReminder(a.title, a.due));
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
    db()
      .prepare(
        "UPDATE tasks SET status='cancelled' WHERE id=? AND status='pending'",
      )
      .run(id);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
