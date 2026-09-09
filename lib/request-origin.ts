/** Match the browser-visible Host, since nextUrl may use a server bind address. */
export function allowedOrigin(headers: Headers, requestUrl: URL, extraOrigins = "") {
  const raw = headers.get("origin");
  if (!raw) return true; // CLI clients have no browser origin.
  try {
    const origin = new URL(raw);
    if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== raw) return false;
    if (extraOrigins.split(",").map(s => s.trim()).filter(Boolean).includes(origin.origin)) return true;
    const host = headers.get("host") || requestUrl.host;
    const expected = new URL(`${requestUrl.protocol}//${host}`);
    return origin.origin === expected.origin;
  } catch { return false; }
}
