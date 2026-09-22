# Personal Assistant — local memory edition

Integrated from [nuridhamrazali/APEX-AI-ASSISTANT](https://github.com/nuridhamrazali/APEX-AI-ASSISTANT). Preserves the existing HUD, orb, graph, and humanoid animation while adding streaming chat, local SQLite memory, Markdown import/export, reminders, and password sign-in.

**Start with [BEGINNER-GUIDE.md](BEGINNER-GUIDE.md).** Node 24 and a running Ollama model are required. No memory API key or subscription is needed.

```sh
npm ci
npm run setup
ollama pull qwen3:4b
npm run dev
```

Open http://localhost:3000 and use APP_PASSWORD from .env.local.

Production: `npm run build` then `npm start`, or use the included Docker Compose stack. Public deployment needs a persistent Node/Docker host and a reachable model service. It is not a static/serverless deployment.

Model tools: current time, saved-note search, local reminder listing, and Wikipedia title/link search. Other graph nodes are retained visual categories and are marked unconnected. Saves/edits use the Memory and Reminders panels. Browser speech is available without a provider key; optional ElevenLabs output requires your own account. No arbitrary shell execution, email sending, cloud drives, autonomous coding, or push notifications are claimed.

History is durable, with a bounded recent context per conversation. Memory uses lexical retrieval over the newest 200 notes. Obsidian integration is explicit Markdown import/export, not live synchronization.

UI code retains the upstream MIT license and attribution in [LICENSE](LICENSE), [CREDITS.md](CREDITS.md), and [UPSTREAM-README.md](UPSTREAM-README.md). Upstream product names and branding are not covered by that code license. This is a personal derivative, not the official Reznikov Engineering service.
