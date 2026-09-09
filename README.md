# APEX voice and personality setup

This branch connects the HUD to Gemini conversation and Fish Audio speech using voice
`e6b437b389c34041856d56d3cde1f494`.

Requires Node.js 20.9 or newer.

1. Copy `.env.example` to `.env.local` and enter `GEMINI_API_KEY` and `FISH_AUDIO_API_KEY`.
2. Set `GEMINI_MODEL` to a model available to your account if the example is unavailable.
3. Run `npm install`, then `npm run dev`.
4. Open the chat button to choose balanced, focused or conversational personality.
5. Choose English or Bahasa Melayu before enabling the microphone. Tap the orb and say
   “Apex” followed by your request. Tap again or use Stop to interrupt.

The browser must support SpeechRecognition, with microphone permission on localhost or HTTPS.
Recognition uses the browser's speech service; it is not an offline wake-word detector.
Show Face opens a code-rendered cyan particle bust with an angular robot faceplate.
Particles spiral into the figure over roughly five seconds. Re-form restarts it, Pause
freezes it, and reduced-motion preferences skip the formation animation. Status follows
APEX's current state. No image download or API call is needed to open the avatar.

If your browser blocks automatic audio, use Play voice in the conversation panel.
If a reverse proxy changes the public host or protocol, set APEX_ALLOWED_ORIGINS to the
exact public URL (for example https://apex.example.com), then restart the server.
Localhost requests are matched to the incoming Host rather than the internal bind address.

Recent conversation (up to 12 messages) stays in tab memory and clears on refresh or Clear conversation.
Fish failures show the text reply and an error; no substitute voice is used. MP3 playback
starts after the audio response arrives, not as a streamed response.

Keys belong only in the server environment, never in NEXT_PUBLIC variables or Git.
Use a private/local instance or deployment access protection: this project does not yet
include user authentication or a durable quota limiter for public usage.

This is the conversation/voice foundation. Hermes Agent, autonomous execution, persistent
memory, Gmail, calendar and the other pictured integrations are not connected. The previous
hard-coded Antigravity call has been replaced by documented Gemini text generation; no
remote execution is claimed. Face controls remain local UI actions.

API references: [Fish Audio TTS](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech),
[Gemini generation](https://ai.google.dev/gemini-api/docs/generate-content/text-generation).

---

# APEX-UI

An animated **autonomous-agent orb + reasoning-graph** interface — the front-end of
[Apex](https://reznikov-engineering.com/apex), released open source.

Tap the orb to cycle its state (idle → thinking → speaking); the reasoning web reacts,
agent nodes orbit the core, and clicking any node opens an overview card. The orb ring,
agent graph and status bar are **hand-written SVG / CSS**; the cyan particle core is a
small `react-three-fiber` scene (skipped under `prefers-reduced-motion`); and the WebGL
shader backdrop + the overview lamp panel are **MIT community components from
[21st.dev](https://21st.dev/community/components)** (see [CREDITS](./CREDITS.md)).

> Built with Next.js 15 + React 19. Runtime deps: `lucide-react` (icons) and
> `three` / `@react-three/fiber` / `@react-three/postprocessing` (the particle core) —
> all MIT-licensed.

## Demo

```bash
npm install
npm run dev
# open http://localhost:3000
```

Then `npm run build` for a production build, or deploy to Vercel in one click.

## What's inside

| Piece | What it does |
|-------|--------------|
| `ApexOrb` | The golden ring frame, waveform and orbit dots (pure SVG) |
| `ApexCore3D` | The cyan particle core (`react-three-fiber` + bloom) |
| `ApexHeroOrb` | Stacks the SVG ring + the particle core, scaled to fit |
| `ReasoningWeb` | The agent constellation — circuit traces, orbit rings, 18-node roster |
| `OrbStatusBar` | The equalizer + STANDBY cluster along the bottom |
| `ShaderBackground` | Animated WebGL "plasma waves" backdrop (MIT component from 21st.dev — see CREDITS) |
| `ApexWorld` | Composes the above; owns the tap-state cycle and the agent overview cards |
| `ApexOverviewPanel` | Top-left HUD: live clock, weather, and social links |
| `app/api/weather` | Keyless [open-meteo](https://open-meteo.com) proxy for the panel's weather |

## Customise

- **Social links** → edit `TILES` in `components/ApexOverviewPanel.tsx`.
- **Weather** → auto-detects the **visitor's** city on Vercel (geo headers); edit `FALLBACK` in `app/api/weather/route.ts` to change the off-Vercel / localhost default.
- **Agents & copy** → the `ROSTER` and `INFO` maps in `components/ApexWorld.tsx`.
- **Backdrop** → the shader in `components/ShaderBackground.jsx`; its opacity/tint are set where `<ShaderBackground>` is used in `ApexWorld.tsx`.

## Accessibility

The decorative SVG graph is mirrored by a real, keyboard-navigable agent list
(`.visually-hidden`), the orb and every control are focusable, and the whole thing
respects `prefers-reduced-motion`.

## Not included (on purpose)

This repo is the **UI only**. The production Apex page also has a spoken-voice layer and a
"story" narrative — those are personal recordings and private copy, so they are intentionally
left out. The orb stays fully interactive without them.

## License

Code is released under the **[MIT License](./LICENSE)** — use it, fork it, ship it.

The **name "Apex" and the Reznikov Engineering branding are not part of this license.**
If you build on this, please use your own product name and branding.

---

Made by [Ruben Mouradian — Reznikov Engineering](https://reznikov-engineering.com).
If you use it, a link back is appreciated (not required).
