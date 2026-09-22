# Backend integration

The existing Next.js HUD is preserved. AssistantConsole owns conversation controls and sends real state changes to ApexWorld. Tool events illuminate ReasoningWeb through its existing trace contract. HumanoidFace reads the current system state rather than claiming permanent processing.

## Request path

1. Password sign-in sets an HMAC-signed, HttpOnly, SameSite=Strict session cookie.
2. POST /api/apex validates origin, session, payload and conversation UUID.
3. SQLite acquires a conversation lease for the bounded request duration.
4. The orchestrator loads recent history and matching saved notes.
5. Ollama streams NDJSON; the provider adapter validates completion and translates output to typed application events.
6. A bounded tool loop runs allowlisted, validated functions and returns their actual results to the model.
7. SSE sends text/tool/run events to the HUD. Abort signals flow upstream.
8. The final successful answer is stored. Partial answers from failed runs are shown with an error in the current UI but are not saved as completed responses.

## Persistence

Node 24 built-in SQLite with WAL and a busy timeout. Tables: messages, notes, tasks, events, locks. One owner; one app replica. Use a persistent local disk, not ephemeral serverless storage. Recent context is limited to 16 messages, with per-message clipping; this version does not summarize older conversations. Imported notes are contextual data, not system instructions.

## Voice

Browser one-utterance recognition and system TTS are the default. Optional ElevenLabs uses an authenticated server endpoint and correct MP3 content type. Playback start/end drives Speaking; analyser values drive humanoid glow for cloud audio. Stop cancels model fetch, microphone recognition, cloud playback and speech synthesis; stale run callbacks are ignored.

## Scheduling

The reminder worker uses a SQLite transaction to mark due tasks and insert one event per task. The uniqueness constraint provides idempotence. UI polling is the delivery mechanism; no email/push delivery or general autonomous action executor is included.

## Deployment

Docker Compose includes app, reminder worker and private Ollama. Memory and model volumes survive restarts. Bind the app on loopback and place an HTTPS reverse proxy in front. Set APP_ORIGIN to the exact public origin; cookie Secure follows its HTTPS scheme. Keep provider keys and the session secret server-side. Multi-user/replicated deployments require additional authorization boundaries, shared rate limiting and a suitable database design.
