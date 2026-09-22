import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const key = () => process.env.SESSION_SECRET || "";
const mac = (s: string) => createHmac("sha256", key()).update(s).digest("hex");
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function configured() {
  return key().length >= 32 && (process.env.APP_PASSWORD || "").length >= 12;
}
export function session() {
  const value = `${Date.now() + 7 * 86400000}.${randomBytes(16).toString("hex")}`;
  return `${value}.${mac(value)}`;
}
export function valid(token: string) {
  if (!configured()) return false;
  const [exp, nonce, sig] = token.split(".");
  return (
    !!sig && Number(exp) > Date.now() && equal(sig, mac(`${exp}.${nonce}`))
  );
}
export function guard(req: Request) {
  if (!configured())
    throw new HttpError(
      503,
      "Run npm run setup to create your private sign-in configuration.",
    );
  const token =
    req.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("apex_session="))
      ?.slice(13) || "";
  if (!valid(token)) throw new HttpError(401, "Please sign in.");
  if (req.method !== "GET") origin(req);
}
export function origin(req: Request) {
  const expected = new URL(process.env.APP_ORIGIN || "http://localhost:3000")
    .origin;
  if (req.headers.get("origin") !== expected)
    throw new HttpError(403, "Request origin does not match APP_ORIGIN.");
}
export async function jsonBody(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "JSON required");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) {
        await reader.cancel();
        throw new HttpError(413, "Request too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
export function failure(e: unknown) {
  if (e instanceof HttpError)
    return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof Error && e.name === "ZodError")
    return Response.json({ error: "Invalid request fields" }, { status: 400 });
  console.error("Request failed", e instanceof Error ? e.message : "unknown");
  return Response.json(
    { error: "Request failed. Check the server logs." },
    { status: 500 },
  );
}
