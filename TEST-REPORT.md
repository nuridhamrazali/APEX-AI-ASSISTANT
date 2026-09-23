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

## Speech-detected mic and daily sidebar
- 13 backend tests passed, including weather authentication/coordinate validation, city-to-weather routing, and day-range inclusion/exclusion.
- Production build and TypeScript checks passed.
- Browser checks passed: no mic during silence; speech start/end toggles icon; interim text sends no requests; final transcript submitted exactly once; detection resumes after response; Stop; Add event opens Reminders; location selection renders weather; no mobile horizontal overflow or page errors. Recognition, LLM replies, and weather were mocked for these browser checks.
- Actual-device microphone, live weather service access, GPS permission, and live Astra billing/model access remain unverified.

## Historical ON THIS DAY correction
- 15 tests passed, including calendar validation (leap day), sourced event mapping, unsafe source URL exclusion and upstream failure handling. Provider responses mocked.
- Daily sidebar now requests historical events by local month/day and refreshes at date rollover. Reminder panel remains separate.
- No live Wikipedia response or midnight browser simulation was verified in this correction.
