import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (Number(process.versions.node.split(".")[0]) !== 24) {
  console.error("Install Node.js 24 LTS before running setup.");
  process.exit(1);
}
if (existsSync(".env.local")) {
  console.log(
    ".env.local already exists; kept unchanged. Open it to find your APP_PASSWORD.",
  );
  process.exit(0);
}
const env = readFileSync(".env.example", "utf8")
  .replace(
    "APP_PASSWORD=CHANGE_ME",
    "APP_PASSWORD=" + randomBytes(18).toString("base64url"),
  )
  .replace(
    "SESSION_SECRET=CHANGE_ME",
    "SESSION_SECRET=" + randomBytes(32).toString("hex"),
  );
writeFileSync(".env.local", env, { mode: 0o600 });
console.log(
  "Created .env.local with a unique password and session secret. Open that file to copy APP_PASSWORD, then run npm run dev.",
);
