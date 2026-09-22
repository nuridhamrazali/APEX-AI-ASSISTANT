# Validation — Astra / orb-only update
- npm test: 10 passing tests. Includes Responses SSE, low reasoning configuration, encrypted reasoning continuity, function call IDs, missing key, incomplete/truncated streams, and HTTP error handling.
- npm run check: passed.
- npm run build: passed, Next.js production standalone output.
- node tests/http-smoke.mjs: passed against mocked Ollama provider: authentication, origin protection, memory CRUD, SSE tool execution, history, authenticated HUD HTML.
- Humanoid component, controls, triggers, and four image assets removed. Orb/map retained.
Limits: No live OpenAI call, API credentials, Docker execution, browser animation inspection, or public deployment was verified in this update. Model availability and billing require the user's API project. Provider tests use mocked responses.
