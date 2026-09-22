import {
  configured,
  equal,
  origin,
  jsonBody,
  failure,
  HttpError,
  session,
} from "@/lib/auth";
export const runtime = "nodejs";
const attempts = { count: 0, reset: 0 };
export async function POST(req: Request) {
  try {
    origin(req);
    if (!configured()) throw new HttpError(503, "Run npm run setup first.");
    if (Date.now() > attempts.reset) {
      attempts.count = 0;
      attempts.reset = Date.now() + 60000;
    }
    if (++attempts.count > 10)
      throw new HttpError(429, "Too many sign-in attempts. Wait one minute.");
    const b = await jsonBody(req);
    if (
      typeof b.password !== "string" ||
      !equal(b.password, process.env.APP_PASSWORD!)
    )
      throw new HttpError(401, "Incorrect password.");
    const secure =
      new URL(process.env.APP_ORIGIN || "http://localhost:3000").protocol ===
      "https:";
    return Response.json(
      { ok: true },
      {
        headers: {
          "Set-Cookie": `apex_session=${session()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${secure ? "; Secure" : ""}`,
        },
      },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request) {
  try {
    origin(req);
    return Response.json(
      { ok: true },
      {
        headers: {
          "Set-Cookie":
            "apex_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
        },
      },
    );
  } catch (e) {
    return failure(e);
  }
}
