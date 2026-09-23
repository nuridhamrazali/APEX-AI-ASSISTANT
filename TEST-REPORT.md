# Validation — Astra / orb-only update
- npm test: 10 passing tests. Includes Responses SSE, low reasoning configuration, encrypted reasoning continuity, function call IDs, missing key, incomplete/truncated streams, and HTTP error handling.
- npm run check: passed.
- npm run build: passed, Next.js production standalone output.
- node tests/http-smoke.mjs: passed against mocked Ollama provider: authentication, origin protection, memory CRUD, SSE tool execution, history, authenticated HUD HTML.
- Humanoid component, controls, triggers, and four image assets removed. Orb/map retained.
Limits: No live OpenAI call, API credentials, Docker execution, browser animation inspection, or public deployment was verified in this update. Model availability and billing require the user's API project. Provider tests use mocked responses.

## Reference-video HUD update
- Production build and TypeScript checks: passed.
- Existing 10 backend tests: passed.
- Chromium browser checks: collapsed initial chat, Core/Agents switch, SSE activity feed, completed/failed result indicators, visible errors with chat closed, Stop clearing result, and no horizontal overflow at 390px. Provider responses were mocked. No browser page errors.
- Actual desktop screenshot captured at 1600×900 and visually reviewed.
- Microphone permissions, live speech recognition/voice output, and paid Astra calls were not exercised. A 100% visual or functional match to the camera recording is not claimed. See VIDEO-REFERENCE.md.
