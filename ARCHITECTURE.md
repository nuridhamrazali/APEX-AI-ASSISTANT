# Architecture
Browser HUD → authenticated POST /api/apex → SSE events → orb state and tool traces.
Server turn runner retrieves SQLite notes/history, then selects LLM_PROVIDER (default openai).
OpenAI uses /v1/responses, gpt-6-astra, low reasoning, store:false, and encrypted reasoning continuity within each tool loop. Output text streams immediately. Function arguments are parsed only after response completion, validated by the tool registry, and executed with timeouts. Original call IDs link results to requests. Loops are limited to five rounds and eight tools. Incomplete streams cannot report success.
Only read-only tools are model-accessible. Memory edits and reminder creation require user actions in authenticated panels. SQLite stores final conversation text, notes, reminders, and verification events; provider reasoning is not persisted.
Optional Ollama uses its existing NDJSON adapter. Voice uses browser recognition/synthesis or optional ElevenLabs audio. The humanoid UI and assets were removed; orb/map state remains event-driven.
App and worker share persistent DATA_DIR. Session cookies are signed; mutation routes check origin. This is a single-owner application requiring HTTPS for public deployment.
