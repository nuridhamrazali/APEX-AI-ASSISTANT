# Your personal assistant — beginner guide

This edition connects the HUD from `nuridhamrazali/APEX-AI-ASSISTANT` to a real backend. It is a single-owner assistant, not a multi-user SaaS.

## What works

- The original orb, agent graph, and humanoid materialization.
- Streamed text, visible tool activity, Stop, and conversation history.
- Free local SQLite memory with editable notes and Markdown import/export.
- Keyless local Ollama inference, after you install and download a model.
- Browser microphone input and browser speech; optional ElevenLabs speech.
- Local reminders with a durable worker and an in-app list.
- Private password sign-in and persistent Docker volumes.

Memory does not need an API key, a vector service, or a subscription. Obsidian is optional. Its local vault is a normal folder of Markdown files.

## 1. Install the prerequisites on Windows

1. Install **Node.js 24 LTS** from https://nodejs.org/ . Close and reopen PowerShell afterward.
2. Install Ollama from https://ollama.com/download . Start the Ollama application.
3. Extract the ZIP into a normal writable folder, for example `C:\AI\APEX-Assistant`.
4. Open that folder in File Explorer, click the address bar, type `powershell`, and press Enter.
5. Check Node:

```powershell
node --version
```

It should start with `v24.`. This version uses Node's built-in SQLite, so an older Node version will fail.

## 2. Download your local model

```powershell
ollama pull qwen3:4b
ollama list
```

The download is several gigabytes. Keep enough disk space available. CPU inference can be slow; model speed depends on your PC. A GPU helps. This is local inference, not a free hosted inference service.

The default model is configurable in `.env.local` using `OLLAMA_MODEL`. Choose an installed model that supports Ollama tool calling. The app requests `think:false` and keeps the model warm for ten minutes.

## 3. Install and generate private settings

In your extracted project folder:

```powershell
npm ci
npm run setup
```

Setup creates `.env.local` with a unique password and session secret. It never overwrites an existing file.

Open `.env.local` in Notepad. Copy the value after `APP_PASSWORD=` for signing in. Do not publish this file or send its contents in chat. You can replace that password with your own long password (at least 12 characters). Restart the app after configuration changes.

The default values should work on your PC:

```dotenv
APP_ORIGIN=http://localhost:3000
DATA_DIR=./data
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:4b
```

Leave cloud API keys blank to use local chat and browser speech.

## 4. Start the app

```powershell
npm run dev
```

Open **http://localhost:3000** and sign in using `APP_PASSWORD`.

Use this exact address: `localhost` and `127.0.0.1` are different web origins. A mismatch with `APP_ORIGIN` prevents sign-in for security.

For the optimized production version:

```powershell
npm run build
npm start
```

Stop the development server with Ctrl+C before starting the production server. Both use port 3000.

If port 3000 is occupied, close the old server. To intentionally change the production port, add `PORT=3001` and change `APP_ORIGIN=http://localhost:3001` in `.env.local`.

## 5. Test your first conversation

1. Type: `What time is it in Asia/Kuala_Lumpur? Use the time tool.`
2. Watch Thinking, the agent graph highlight, and Tool activity.
3. The answer appears as it streams.
4. Click Stop to cancel an ongoing response or speech.
5. Click Avatar, or ask `show me your face`, to display the existing humanoid animation.
6. Click its return button to go back to the orb.

The humanoid is an on-screen avatar. It does not represent a physical body.

## 6. Use memory and Obsidian

Open **Memory**. Add a title such as `Study plans`, then write a few useful facts. Click Save note. Ask about those facts in chat, using similar keywords.

Memory uses lexical matching, not semantic vector embeddings. It searches the newest 200 notes and retrieves up to five relevant excerpts. It will not reliably match unrelated wording or translations. This keeps setup small and entirely keyless. Avoid placing credentials in notes: retrieved notes become part of model context.

- **Edit** changes the saved note.
- **Delete** removes the note after confirmation.
- **Export .md** downloads one note for your Obsidian vault.
- **Import .md** loads a note into the editor; click Save note to persist it.

Optional bulk import/export, while the app is stopped:

```powershell
npm run obsidian -- import "C:\Users\YourName\Documents\MyVault"
npm run obsidian -- export "C:\Users\YourName\Documents\AssistantExport"
```

The script handles top-level `.md` files only, up to 200 imports per run and 24 KB per note. It skips symlinks. Import updates the same path's imported record. Export does not overwrite existing files; use a fresh export folder for a new snapshot. This is explicit one-way import/export, **not live two-way synchronization**. You do not need Obsidian Sync.

A server deployed online cannot read your laptop's vault automatically. Import notes through the browser, or deliberately copy a chosen vault folder to the server.

## 7. Voice

Open Settings and enable **Read answers aloud**. Choose English or Bahasa Melayu and a system voice. Click Mic (or the orb) to record one utterance; there is no always-on wake-word requirement.

Use Chrome or Edge if microphone recognition is unavailable elsewhere. Permit microphone access. On an online deployment, use HTTPS. Browser recognition may send audio to the browser vendor's recognition service; it is not guaranteed offline. Browser TTS voices depend on the operating system.

Optional ElevenLabs output: set `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, and `ELEVENLABS_MODEL` in `.env.local`. This uses your own account and may incur charges. Restart the app. MP3 audio is now served as `audio/mpeg` rather than incorrectly labelled WAV.

The current UI speaks after the final text answer. Cloud audio is buffered before playback, so this is not full-duplex or minimum-latency speech-to-speech. Cloud playback drives the audio analyser and humanoid glow. Browser speech drives speaking state only: browsers do not expose its audio waveform here. Text still works when voice fails.

## 8. Reminders and the worker

Open Reminders, enter a title and a future date/time, and save. Times are entered in the browser's local time and stored as UTC timestamps.

For due reminders to be processed while the browser is closed, open a second terminal in the project folder:

```powershell
npm run worker
```

The worker records due reminders atomically in SQLite. Restarting it does not duplicate reminder events. Open the app to view the due items. The UI polls every ten seconds and also catches up due items if the worker was stopped. There are no email, push, or phone notifications in this edition.

This worker is a durable reminder foundation, not an autonomous computer-control agent. The model's tools are intentionally read-only. Save notes and reminders in their respective panels.

## 9. Docker deployment on your own computer or a server

Install Docker with Compose. Run setup first so `.env.local` exists.

```powershell
docker compose up -d --build
docker compose exec ollama ollama pull qwen3:4b
docker compose logs -f app
```

Open http://localhost:3000 . The Compose configuration starts the app, reminder worker, and a private Ollama service. It uses CPU inference by default. Model data and assistant memory use separate persistent volumes. Ollama is not exposed publicly.

Docker is optional for local Windows usage. The Docker image must be built on the destination machine or its build service; the source ZIP is not a preinstalled container image.

## 10. Put it online

This build requires a **long-running Node 24 or Docker server with persistent disk**, plus enough resources for Ollama or a reachable private Ollama server. Static hosting alone cannot run it. Do not deploy its local SQLite file to an ephemeral serverless filesystem. The built-in Sites host cannot directly run this Node/Ollama/SQLite Docker stack.

For a Linux VPS with Docker installed:

1. Upload/extract this project, or clone the implementation branch.
2. Generate `.env.local` using `npm run setup` on a Node 24 machine, then securely place it on the server.
3. Set `APP_ORIGIN=https://assistant.your-domain.example` to your real domain.
4. Start `docker compose up -d --build` and pull the model using the command above.
5. Point your domain to the VPS and configure an HTTPS reverse proxy to `127.0.0.1:3000`.
6. Keep exactly one app replica for this personal SQLite deployment.
7. Ensure your proxy permits streaming responses and a request duration of at least 180 seconds.

A host-installed Caddy can use this configuration (replace the example domain):

```caddyfile
assistant.your-domain.example {
    reverse_proxy 127.0.0.1:3000 {
        flush_interval -1
    }
}
```

Only expose the HTTPS proxy. Keep Ollama and the database private. No provider passwords are included in this ZIP. If you use remote Ollama instead, change the Compose `OLLAMA_BASE_URL` override and configure any required server authentication. A cloud app cannot use your laptop's `localhost` address.

An actual live deployment requires access to your chosen hosting account/server. Creating this ZIP or a GitHub branch does not publish a live service.

## 11. Backup and restore

Local version: stop both the web app and worker, then copy the entire `data` folder to a safe location. It contains conversations, notes, reminders, and SQLite journal files. Back up `.env.local` separately and privately.

Docker: stop app and worker before taking a snapshot of the `assistant-data` volume. Keep the volume; do not run `docker compose down -v` unless you intend to delete your data. Restore the volume before restarting services.

Exporting Markdown backs up notes only, not conversation history or reminders.

## Troubleshooting

| Problem | Fix |
|---|---|
| Cannot reach Ollama | Start Ollama; check `ollama list` and `OLLAMA_BASE_URL`. |
| Model HTTP 404 | Run `ollama pull` for the exact `OLLAMA_MODEL`. |
| Response is slow | Use a smaller tool-capable model, shorter chats, or a GPU. |
| Invalid origin / cannot sign in | Match browser URL to `APP_ORIGIN`, including scheme and port. |
| SQLite import error | Install Node 24 and reinstall with `npm ci`. |
| Password setup error | Run `npm run setup`; check `.env.local`; restart. |
| No microphone | Use a supported browser, grant permission, use localhost or HTTPS. |
| No sound | Enable Read answers aloud; choose a system voice; check browser autoplay. |
| Reminder not notifying phone | This edition stores due items in-app; push notifications are not implemented. |
| Memory misses a fact | Save a short note and ask with matching keywords. |
| New conversation cannot find old chat | Notes persist globally; recent transcript context is per conversation. |

## Checks

```powershell
npm test
npm run build
```

Tests exercise authentication, input limits, memory CRUD/retrieval, conversation locks, durable reminders, and the streamed model/tool loop with a mocked provider. A successful build is not a real-model or real-microphone test. See TEST-REPORT.md for the checks performed during packaging.
