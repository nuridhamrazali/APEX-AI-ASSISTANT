# Beginner guide — APEX with Astra
## 1. Install and configure
Install Node.js 24. Extract this project, open a terminal in its folder, then run:
```sh
npm ci
npm run setup
```
Setup creates .env.local and prints your login password. Keep it private. Edit .env.local:
```dotenv
LLM_PROVIDER=openai
OPENAI_API_KEY=your_private_key
OPENAI_MODEL=gpt-6-astra
OPENAI_REASONING_EFFORT=low
```
Keep APP_PASSWORD, SESSION_SECRET, APP_ORIGIN and DATA_DIR from setup. For an existing installation, add these four model settings to your existing file; do not overwrite your credentials.

Astra requires API access and billed usage. “Light” means low reasoning in this project. Model availability depends on your API project. No live paid call was made while preparing this update. ChatGPT subscriptions do not supply this server's API key. Never commit .env.local or paste a key into chat.

## 2. Start and test
```sh
npm run dev
```
Visit http://localhost:3000 and log in. Ask “What time is it in Kuala Lumpur?” Check that Thinking changes to Tool Running and that an answer arrives. The orb and agent map remain; there is no humanoid or Avatar button.
A connected status means the API model lookup succeeded; a paid generation still depends on quota and billing.
Run automated checks with:
```sh
npm test
npm run check
npm run build
```

## 3. Free memory and Obsidian
SQLite saves history, notes, and reminders in DATA_DIR. It uses local keyword retrieval, not paid embeddings. Add a note in Memory, then ask about it.
Obsidian is optional: your Markdown vault is an editable source for notes. Inspect scripts/obsidian.ts for its import command and run:
```sh
npm run obsidian -- import /absolute/path/to/vault
```
Only import notes you want the assistant to use. Relevant notes and recent conversation text are sent to OpenAI when Astra is selected. Back up the data directory with the app stopped.

## 4. Voice and reminders
Tap the core (or enable speech detection in Settings), allow microphone access, then speak. Browser speech recognition availability varies and may use the browser vendor's servers. Default spoken output uses browser speech synthesis. Optional ElevenLabs settings enable paid audio output.
Use the Reminders panel for reminder creation. Start the worker in a second terminal:
```sh
npm run worker
```
The worker records due reminders locally; it does not send emails or push notifications. Tools can search notes, read the time, list reminders, and search Wikipedia. Other map nodes are visual categories, not connected services.

## 5. Production deployment
Use a Node.js 24 server with persistent disk, or Docker:
```sh
docker compose up --build -d
```
This starts the app and reminder worker. Astra mode does not start Ollama.
For native Node hosting:
```sh
npm run build
npm start
# In another supervised process:
npm run worker
```
Put an HTTPS reverse proxy in front of port 3000. Set APP_ORIGIN to the exact public HTTPS origin; restart after changing configuration. Keep SSE buffering disabled and allow responses lasting up to three minutes. Persist DATA_DIR across releases. Store API credentials in the host's secret settings. Do not expose the database, worker, or model server publicly.
A host and its credentials have not been selected here; the repository changes do not themselves publish a live deployment.

## 6. Optional free local brain
Install Ollama and download a tool-capable model:
```sh
ollama pull qwen3:4b
```
Set LLM_PROVIDER=ollama, OLLAMA_MODEL=qwen3:4b, OLLAMA_BASE_URL=http://127.0.0.1:11434. Restart APEX. This is an explicit alternative; failed Astra calls do not silently switch providers.
Docker users use:
```sh
docker compose --profile local up --build -d
docker compose exec ollama ollama pull qwen3:4b
```
Compose supplies the internal Ollama URL. Your machine still supplies memory, compute, and electricity.

## Troubleshooting
- HTTP 401: check the server API key.
- HTTP 403/404: check project permissions and model access.
- HTTP 429: check rate limits and API billing/quota.
- Missing key: edit .env.local or host secrets and restart.
- Stream ends early: retry a shorter request; interrupted answers are not saved as completed.
- Microphone unavailable: use localhost or HTTPS and a browser supporting speech recognition.

## Reference-video controls
The HUD starts with Chat closed. Click Chat to type or open Memory/Reminders/Settings; click Close to return to the canvas. Core hides the agent graph; Agents brings it back. The microphone icon appears only when speech is detected, and the graph temporarily fades during detected speech. Browser permission is required. Enable spoken replies in Settings if desired.
Tool activity is available beside the open Chat panel. The left sidebar now contains the daily overview. The right indicator means RESPONSE COMPLETE, not that every external action succeeded. Tool failures are marked separately in the feed. Stop cancels activity. The map nodes do not automatically create third-party integrations.
See VIDEO-REFERENCE.md for what could and could not be established from the supplied recording.

## Speech-detected mic and daily overview
Tap the core or enable **Settings → Enable speech detection** once per page session. The mic icon remains hidden during silence. Detected speech shows the icon and listening state; interim text is not submitted. A final utterance is sent once. Detection pauses while APEX thinks or speaks, then resumes. Stop disables it. No wake word is configured: finalized speech while enabled is treated as a request. The browser's own microphone permission/use indicator remains visible as required by the browser. Some recognition implementations use online services; actual device and browser behavior can vary.

Choose **Set location** on the left, search your city, and select the correct result. Alternatively, choose **Use device location** and allow location permission. The device option is labeled Current location; city search supplies the city name. The selection is remembered only in this browser. Coordinates are sent through the APEX server to Open-Meteo for weather, refreshed every ten minutes. The clock and today's event boundaries use this device's local timezone, even if you select weather for another city.

**ON THIS DAY** shows historical events from the same month and day across previous years. It uses the device's local date, updates at midnight, and shows up to five Wikipedia events with years and source links. It needs an internet connection but no AI API key. If unavailable, use Retry history. Personal reminders remain in Chat → Reminders and are separate from this historical panel.


References: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition and https://open-meteo.com/en/docs/geocoding-api
