# APEX with local Ollama replies (Windows)

Ollama supplies the model; Hermes remains the agent harness and Obsidian remains
conversation memory. No Gemini key is used in Ollama mode. Fish Audio is separate:
its voice still requires available credits. Local inference has no cloud token bill,
but uses your PC's RAM/GPU/electricity and may be slower on limited hardware.

## 1. Install and download

Install [Ollama for Windows](https://ollama.com/download/windows), launch it, and
reopen PowerShell. Download this tool-capable starting model:

```powershell
ollama pull qwen3:4b
ollama run qwen3:4b "Reply with: Ollama is ready."
```

Keep Ollama running. If it is not serving, run `ollama serve` in a separate terminal.
If it reports that port 11434 is already in use, the app may already be serving.
The first download and first model load can take time. Model runtime needs more
memory than its download size. A larger model may improve task reliability if your
PC has enough memory; set OLLAMA_MODEL to the exact downloaded model name.

## 2. Update APEX and select Ollama

Stop APEX with Ctrl+C, then:

```powershell
cd C:\Users\ming\Desktop\APEX-fixed
git pull --ff-only
notepad .env.local
```

Add or replace these entries (one entry for each name):

```dotenv
APEX_MODEL_PROVIDER=ollama
OLLAMA_MODEL=qwen3:4b
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
```

Keep your existing HERMES_SOURCE_DIR, HERMES_PYTHON, OBSIDIAN_VAULT_PATH and Fish
Audio settings. Old Gemini/HERMES provider keys and URLs are ignored in Ollama mode.
Do not overwrite your whole .env.local with .env.example. If Hermes is not installed,
complete step 2 of [HERMES-SETUP.md](HERMES-SETUP.md), and configure its Python/source
paths and the Obsidian vault as described there. No separate Hermes server is needed.

## 3. Run and check memory

```powershell
npm run dev
```

Open http://localhost:3000 and type a short question first. Then ask APEX to remember
a test project name, check the saved note in Obsidian, clear the conversation screen,
and ask for that name again. Voice and humanoid controls use this same harness.

If a request fails, confirm `ollama list` contains the exact OLLAMA_MODEL, check the
Ollama app is running and verify the Hermes Python and writable vault paths. Local
models must support tool calls for Hermes's Obsidian search. Stop/restart APEX after
changing .env.local. Ollama runs on the same PC as the APEX server in this setup.

To restore a cloud model, set APEX_MODEL_PROVIDER=custom and configure the existing
HERMES_MODEL, HERMES_BASE_URL and HERMES_API_KEY (or GEMINI_API_KEY) entries.

Validated with bridge tests using a fake Hermes agent; local inference speed and
Windows installation require testing on your PC.

References: [Ollama compatibility API](https://docs.ollama.com/api/openai-compatibility),
[Qwen3 4B model](https://ollama.com/library/qwen3:4b).
