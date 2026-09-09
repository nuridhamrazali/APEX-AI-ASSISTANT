# APEX: Hermes harness + Obsidian memory (Windows)

The web app runs Nous Research's actual `AIAgent` Python library in a reusable worker.
Hermes controls its reasoning/tool loop. Gemini is the default model provider, Fish
Audio speaks, and Obsidian opens the saved conversation Markdown files.

## 1. Update APEX

In PowerShell:

```powershell
cd C:\Users\ming\Desktop\APEX-fixed
git pull --ff-only
npm ci
```

Node.js 20.9+ is required. Run this locally; the Python runtime and writable vault
are not supported by this integration on Vercel/serverless hosting.

## 2. Install the Hermes Python environment once

Install uv if `uv --version` does not work:

```powershell
winget install --id astral-sh.uv -e
```

Reopen PowerShell after installing uv, then:

```powershell
cd $env:USERPROFILE
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
git checkout 8077206073aec7ed8561d861c8975e7164bfadca
uv sync
```

If that folder already contains Hermes, do not clone over it. Use your existing
checkout and set HERMES_SOURCE_DIR and HERMES_PYTHON accordingly. The pinned source
above is the API revision inspected for this adapter; other versions may change APIs.
Source/environment installation can take several minutes.

## 3. Put the keys in the APEX project root

```powershell
notepad C:\Users\ming\Desktop\APEX-fixed\.env.local
```

Create it if asked. Save as `.env.local`, not `.env.local.txt`. Use:

```dotenv
GEMINI_API_KEY=replace_with_your_key
FISH_AUDIO_API_KEY=replace_with_your_key
FISH_AUDIO_VOICE_ID=e6b437b389c34041856d56d3cde1f494
FISH_AUDIO_MODEL=s2.1-pro-free
HERMES_SOURCE_DIR=C:/Users/ming/hermes-agent
HERMES_PYTHON=C:/Users/ming/hermes-agent/.venv/Scripts/python.exe
HERMES_MODEL=gemini-3.8-flash
HERMES_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
OBSIDIAN_VAULT_PATH=C:/Users/ming/Documents/APEX-Memory
```

Use a model available to your Gemini account if that model is unavailable. For a
separate OpenAI-compatible provider, set HERMES_API_KEY, HERMES_BASE_URL and
HERMES_MODEL together. No API keys belong in GitHub, the browser, or Obsidian notes.

## 4. Open the vault and start APEX

Create `C:\Users\ming\Documents\APEX-Memory`, then in Obsidian select **Open folder
as vault** and choose that folder. No Obsidian API key or community plugin is needed.

```powershell
cd C:\Users\ming\Desktop\APEX-fixed
npm run dev
```

Open http://localhost:3000. No separate Hermes server command is needed: APEX starts
Hermes's Python process when you send a message.

## 5. Test persistence

Send: “Remember that my test project's name is Blue Lantern.” Wait for the reply.
Look in `APEX/Conversations` in Obsidian for the saved Markdown note. Refresh APEX,
then ask: “What is my test project's name?” Hermes can call `apex_obsidian_search`
and also receives relevant excerpts automatically. `Clear screen` does not erase
saved notes. Delete a note in Obsidian to remove it from subsequent vault searches;
clear the on-screen context as well if you want to stop using it immediately.

## What memory means here

Every new user turn that reaches the Python bridge is saved before inference; the
full final answer is appended before voice generation. Failed turns have an error
marker. Voice playback and UI-only face controls are not archived. Previous ChatGPT
conversations and sessions before this feature are not automatically imported.

The vault is the source of truth and survives closing APEX/restarting the PC.
Retrieval ranks words in all APEX conversation notes and returns bounded excerpts;
it is not semantic search, perfect recall, or loading every conversation into the
model at once. Editing/deleting notes changes future retrieval. Only
`APEX/Conversations/*.md` is searched, not unrelated personal vault folders.

The configured Gemini (or other model) provider receives the current conversation
and retrieved excerpts. The local vault is plain text; use your normal backups and
file permissions. Hermes's own memory/context-file loading is disabled so there are
not two competing memory stores.

Currently enabled tool: **Obsidian conversation search**. Hermes runs the real tool
loop, but terminal, email, calendar, publishing and other integrations are not enabled
by this adapter. They must be integrated explicitly rather than shown as connected.
Stopping interrupts the bridge; a submitted user message can remain in the vault if
the model was interrupted before answering.

Validation: build/TypeScript, API contract tests, and isolated filesystem/bridge tests
with a fake model. Live model/voice calls and Windows Hermes installation require
local setup and credentials and have not been tested here.

References: [Hermes library](https://hermes-agent.nousresearch.com/docs/guides/python-library),
[Gemini compatibility](https://ai.google.dev/gemini-api/docs/openai),
[Obsidian storage](https://help.obsidian.md/Files+and+folders/How+Obsidian+stores+data).

## Response speed

The Python worker stays warm for five minutes after a reply; each turn still uses
a fresh agent with the current history. The first request after startup, stopping,
an error, or five minutes idle reloads Hermes and may be slower. Text appears before
Fish Audio generation finishes. Speech still waits for the complete MP3.

Set `FISH_AUDIO_SPEED=1.15` in `.env.local` for a brisk voice (default); use `1.0`
for normal speed or `1.25` for faster delivery. Restart `npm run dev` after changing it.
The selected voice and API service affect perceived pace and response time; these
changes do not guarantee a specific latency.
