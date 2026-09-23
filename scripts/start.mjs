import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
const output = resolve(".next/standalone");
if (!existsSync(output + "/server.js")) {
  console.error("Run npm run build first.");
  process.exit(1);
}
cpSync(".next/static", output + "/.next/static", { recursive: true });
if (existsSync("public"))
  cpSync("public", output + "/public", { recursive: true });
const child = spawn(process.execPath, [output + "/server.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATA_DIR: resolve(process.env.DATA_DIR || "./data"),
    HOSTNAME: process.env.BIND_HOST || "127.0.0.1",
    PORT: process.env.PORT || "3000",
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
