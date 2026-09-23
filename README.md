# APEX Assistant
APEX orb and agent map connected to streaming chat, visible tool execution, SQLite memory, voice, and reminders. The previous humanoid, its controls, and image assets have been removed.

Default brain: OpenAI `gpt-6-astra` with `reasoning.effort: low` through the Responses API. “Light” is interpreted as low reasoning, not a separate model name. OpenAI API usage is billed and requires a server-side API key and model access. SQLite memory needs no subscription or API key. Optional Ollama supports local inference without an API subscription.

Read [BEGINNER-GUIDE.md](BEGINNER-GUIDE.md) for setup and deployment. See [ARCHITECTURE.md](ARCHITECTURE.md) for the event pipeline.

```sh
npm ci
npm run setup
# Edit .env.local: add OPENAI_API_KEY. Keep the generated password and secret.
npm run dev
```

Open http://localhost:3000 and log in with the generated password. Never put the OpenAI key in browser code or a NEXT_PUBLIC variable.

Production requires Node.js 24, persistent disk, and a running reminder worker. Deployment is not a static website export. See the guide for Docker and HTTPS setup.
