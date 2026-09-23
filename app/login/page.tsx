"use client";
import { useState } from "react";
export default function Login() {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login-page">
      <form
        className="assistant-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const r = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            location.href = "/";
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>Personal Assistant</h1>
        <p>Your HUD. Your private memory.</p>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        {error && (
          <p role="alert" className="assistant-error">
            {error}
          </p>
        )}
        <small>
          First start? Run npm run setup in the project folder. Your password is
          stored in .env.local.
        </small>
      </form>
    </main>
  );
}
