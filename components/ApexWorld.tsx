"use client";

/**
 * ApexWorld - the Apex app's CURRENT main screen, replicated for the site.
 * Layers: app-blue backdrop → clickable orb core (ring + particles, same tap
 * cycle) → ReasoningWeb (verbatim copy from the app: circuit traces, orbit
 * rings, the full asymmetric roster, ambient motes) → OrbStatusBar (equalizer
 * + STANDBY cluster at the bottom).
 * Clicking any node opens the site's AGENT OVERVIEW window template; the
 * orb's tap cycle drives the whole web (standby → processing → speaking).
 */

import { PERSONALITIES, type Personality, type Turn } from "@/lib/personality";
import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Eye, Sparkles } from "lucide-react";
import ApexHeroOrb, { type OrbState } from "./ApexHeroOrb";
import ReasoningWebJs from "./ReasoningWeb";
import ShaderBackgroundJs from "./ShaderBackground";
import OrbStatusBar from "./OrbStatusBar";
import HumanoidFace from "./HumanoidFace";

export type NodeSel = { name: string; key: string; color: string };

// the copied .jsx defaults onSelect to null, which TS infers as `null | undefined`
const ReasoningWeb = ReasoningWebJs as unknown as React.ComponentType<{
  state?: string; trace?: unknown; mode?: string; coreless?: boolean;
  onSelect?: (n: NodeSel) => void; light?: boolean;
}>;
const ShaderBackground = ShaderBackgroundJs as unknown as React.ComponentType<{
  opacity?: number; voiceActive?: boolean; gold?: boolean;
}>;
type AgentInfo = {
  role: string;
  caps: string[];
  asks?: string[];
  status: "online" | "standby" | "integration";
};

/* Mirrors the ROSTER in ReasoningWeb.jsx (a verbatim copy from the Apex app, so
   it is not edited here). Backs the visually-hidden agent list that gives the
   decorative SVG graph a keyboard and screen-reader equivalent - keep in sync if
   the copy's roster changes. */
export const ROSTER: { key: string; name: string; color: string }[] = [
  { key: "chief_of_staff", name: "Chief of staff", color: "#00e5ff" },
  { key: "memory",         name: "Memory",         color: "#00e5ff" },
  { key: "strategist",     name: "Strategist",     color: "#00e5ff" },
  { key: "researcher",     name: "Researcher",     color: "#00e5ff" },
  { key: "finance",        name: "Finance",        color: "#00e5ff" },
  { key: "editor",         name: "Editor",         color: "#00e5ff" },
  { key: "sales",          name: "Sales",          color: "#f5a623" },
  { key: "marketing",      name: "Marketing",      color: "#f5a623" },
  { key: "ops",            name: "Ops",            color: "#f5a623" },
  { key: "social_media",   name: "Social",         color: "#f5a623" },
  { key: "engineering",    name: "Engineering",    color: "#f5a623" },
  { key: "design",         name: "Design",         color: "#f5a623" },
  { key: "developer",      name: "Developer",      color: "#f5a623" },
  { key: "analytics",      name: "Analytics",      color: "#7f9bb3" },
  { key: "crm",            name: "CRM",            color: "#7f9bb3" },
  { key: "calendar",       name: "Calendar",       color: "#7f9bb3" },
  { key: "email",          name: "Email",          color: "#7f9bb3" },
  { key: "drive",          name: "Drive",          color: "#7f9bb3" },
];

/* Overview data per ReasoningWeb roster id - the site's template content */
export const INFO: Record<string, AgentInfo> = {
  chief_of_staff: { role: "Right hand - runs the day", status: "online",
    caps: ["Prioritizes the day and keeps loose ends closed", "Routes every request to the right specialist", "Escalates only what truly needs a human"],
    asks: ["What needs attention today?", "Chase the open quotes"] },
  memory: { role: "Long-term memory", status: "online",
    caps: ["Remembers every client, project and decision", "Feeds context into every task automatically", "Learns preferences over time"],
    asks: ["What did we decide about X?", "History with this client"] },
  strategist: { role: "Big-picture thinking", status: "online",
    caps: ["Weekly strategy reviews", "Goal and milestone tracking", "Spots opportunities and risks early"],
    asks: ["Where should we double down?"] },
  researcher: { role: "Deep research", status: "online",
    caps: ["Market and competitor research", "Technical deep-dives", "Source-checked summaries"],
    asks: ["Research this market", "Compare these suppliers"] },
  finance: { role: "Money watch", status: "online",
    caps: ["Revenue and pipeline tracking", "Pricing sanity checks", "Monthly performance recaps"],
    asks: ["How was this month?", "Is this quote priced right?"] },
  editor: { role: "Quality gate", status: "online",
    caps: ["Rewrites and tightens every draft", "Keeps the brand voice consistent", "Final pass before anything ships"],
    asks: ["Polish this post", "Tighten this email"] },
  sales: { role: "Deal closer", status: "online",
    caps: ["Follow-ups for every lead", "Warm-outreach drafts", "Pipeline nudges so nothing goes cold"],
    asks: ["Draft a follow-up", "Who went quiet?"] },
  marketing: { role: "Growth engine", status: "online",
    caps: ["Campaign generation", "Pricing analysis", "Brand positioning and content calendar"],
    asks: ["Generate campaign", "Competitor research"] },
  ops: { role: "Business operator", status: "online",
    caps: ["Client quotes and proposals", "Project scoping and timelines", "Supplier sourcing"],
    asks: ["Draft client quote", "Build project scope"] },
  social_media: { role: "Voice of the brand", status: "online",
    caps: ["Writes posts and captions", "Creates reel scripts", "Posts to Instagram, LinkedIn and Facebook"],
    asks: ["Write post caption", "Plan content week"] },
  engineering: { role: "Engineering brain", status: "online",
    caps: ["3D-print settings and materials", "Tolerances and fit", "Laser power and speed guidance"],
    asks: ["Review STL file", "Calculate tolerances"] },
  design: { role: "Visual workshop", status: "online",
    caps: ["Background removal and replacement", "Text overlays", "Resize for social media", "Filters and enhancement"],
    asks: ["Remove background", "Resize for IG"] },
  developer: { role: "Keeper of the build log", status: "standby",
    caps: ["Keeps Apex's development log", "Recaps what shipped - day / week / month", "Future: builds Apex itself"],
    asks: ["Recap last week"] },
  analytics: { role: "Numbers feed", status: "integration",
    caps: ["Performance metrics across every channel", "Feeds the weekly reviews"] },
  crm: { role: "Client memory bank", status: "integration",
    caps: ["Every lead and client in one pipeline", "Stage tracking from first contact to paid"] },
  calendar: { role: "Schedule sense", status: "integration",
    caps: ["Knows the calendar", "Reminders and follow-up timing"] },
  email: { role: "Inbox hands", status: "integration",
    caps: ["Inbox triage and reply drafts", "Not connected yet"] },
  drive: { role: "File access", status: "integration",
    caps: ["Reads and files documents", "Not connected yet"] },
};

const STATUS_LINE: Record<AgentInfo["status"], { color: string; text: string }> = {
  online: { color: "#34d399", text: "Planned capability - not connected" },
  standby: { color: "#c9a84c", text: "Standby - in active development" },
  integration: { color: "#7f9bb3", text: "Integration - not connected" },
};

/* ── AGENT OVERVIEW window - the site's template (the app opens live cockpits) ── */
export function AgentOverview({ sel, onClose }: { sel: NodeSel; onClose: () => void }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ sx: number; sy: number } | null>(null);
  const info = INFO[sel.key] ?? { role: "Specialist", status: "online" as const, caps: ["Part of the Apex core"] };
  const c = sel.color;
  const status = STATUS_LINE[info.status];

  useEffect(() => {
    setPos({ x: Math.max(8, window.innerWidth / 2 - 170), y: Math.max(90, window.innerHeight * 0.16) });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Move focus into the window when it opens and hand it back on close, so the
  // keyboard does not stay stranded on the agent list behind it.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pos) return;
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => { if (opener && document.contains(opener)) opener.focus(); };
  }, [pos]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!pos) return;
    dragRef.current = { sx: e.clientX - pos.x, sy: e.clientY - pos.y };
    const move = (ev: MouseEvent) => {
      if (dragRef.current) setPos({ x: ev.clientX - dragRef.current.sx, y: ev.clientY - dragRef.current.sy });
    };
    const up = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  if (!pos) return null;
  return (
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label={`${sel.name} overview`} style={{
      position: "fixed", left: pos.x, top: pos.y,
      width: "min(340px, 92vw)", zIndex: 60,
      background: "rgba(4,3,12,0.92)",
      backdropFilter: "blur(24px)",
      border: `1px solid ${c}44`,
      borderRadius: 16,
      boxShadow: `0 0 40px ${c}18, 0 8px 32px rgba(0,0,0,0.6)`,
      overflow: "hidden",
    }}>
      {/* header - drag handle */}
      <div onMouseDown={onMouseDown} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
        borderBottom: `1px solid ${c}22`, cursor: "grab", userSelect: "none",
        background: `linear-gradient(135deg, ${c}0a 0%, transparent 100%)`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: `${c}14`,
          border: `1px solid ${c}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, boxShadow: `0 0 10px ${c}` }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", color: c }}>{sel.name.toUpperCase()}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{info.role}</div>
        </div>
        <button onClick={onClose} aria-label="Close"
          style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "6px 8px", transition: "color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >×</button>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", color: `${c}99`, marginBottom: 8, fontFamily: "var(--font-mono)" }}>WHAT IT HANDLES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {info.caps.map((cap) => (
              <div key={cap} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: `${c}99`, marginTop: 6, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.55 }}>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {info.asks && info.asks.length > 0 && (
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.14em", color: `${c}99`, marginBottom: 8, fontFamily: "var(--font-mono)" }}>EXAMPLE REQUESTS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {info.asks.map((task) => (
                <span key={task} style={{
                  padding: "4px 10px", background: `${c}0d`, border: `1px solid ${c}2a`,
                  borderRadius: 20, fontSize: 10.5, color: `${c}cc`,
                }}>{task}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 7, borderTop: `1px solid ${c}1a`, paddingTop: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: status.color, boxShadow: `0 0 8px ${status.color}` }} />
          <span style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>{status.text}</span>
        </div>
      </div>
    </div>
  );
}

/* ── The world ── */
export default function ApexWorld() {
  const [selected, setSelected] = useState<NodeSel | null>(null);
  const [reduced, setReduced] = useState(false);

  // A tap cycles idle → thinking → speaking → idle. That state drives the
  // backdrop, the light-cast and the reasoning web's activity level.
  const [showState, setShowState] = useState<OrbState>("idle");
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orbState: OrbState = showState;

  const showStateRef = useRef(showState);
  useEffect(() => { showStateRef.current = showState; }, [showState]);

  const [isAwake, setIsAwake] = useState(false);
  const isAwakeRef = useRef(isAwake);
  useEffect(() => { isAwakeRef.current = isAwake; }, [isAwake]);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [showHumanoid, setShowHumanoid] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [personality, setPersonality] = useState<Personality>("balanced");
  const personalityRef = useRef<Personality>("balanced");
  const [language, setLanguage] = useState("en-US");
  const [turns, setTurns] = useState<Turn[]>([]);
  const historyRef = useRef<Turn[]>([]);
  const [notice, setNotice] = useState("");
  const busyRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [lastAudio, setLastAudio] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const finish = () => {
    busyRef.current = false;
    audioRef.current = null;
    const state = isAwakeRef.current ? "listening" : "idle";
    showStateRef.current = state;
    setShowState(state);
    if (isAwakeRef.current) { try { recognitionRef.current?.start(); } catch {} }
  };
  const stop = () => {
    isAwakeRef.current = false;
    setIsAwake(false);
    requestRef.current?.abort();
    if (audioRef.current) { audioRef.current.onended = null; audioRef.current.pause(); }
    try { recognitionRef.current?.abort(); } catch {}
    finish();
  };
  useEffect(() => () => {
    requestRef.current?.abort();
    audioRef.current?.pause();
  }, []);

  const boost = () => {
    if (isAwakeRef.current || busyRef.current) { stop(); return; }
    isAwakeRef.current = true;
    showStateRef.current = "listening";
    setIsAwake(true);
    setShowState("listening");
  };

  const isFaceCommand = (text: string) => {
    const t = text.toLowerCase();
    return (
      t.includes("face") ||
      t.includes("humanoid") ||
      t.includes("avatar") ||
      t.includes("materialize") ||
      t.includes("look like") ||
      t.includes("who are you") ||
      t.includes("reveal") ||
      t.includes("show me you")
    );
  };

  const isDismissFaceCommand = (text: string) => {
    const t = text.toLowerCase();
    return (
      t.includes("hide face") ||
      t.includes("close face") ||
      t.includes("dismiss face") ||
      t.includes("back to orb") ||
      t.includes("hide humanoid") ||
      t.includes("exit face")
    );
  };

  const processCommand = async (transcript: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setNotice("");
    if (isDismissFaceCommand(transcript)) setShowHumanoid(false);
    else if (isFaceCommand(transcript)) setShowHumanoid(true);
    showStateRef.current = "thinking";
    setShowState("thinking");
    try { recognitionRef.current?.stop(); } catch {}
    const history = historyRef.current;
    const pending: Turn[] = [...history, { role: "user", text: transcript }];
    setTurns(pending);
    setChatOpen(true);
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const res = await fetch('/api/apex', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: transcript, history, personality: personalityRef.current }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok || data.error) throw new Error(data.error || "Request failed.");
      if (data.text) {
        historyRef.current = [...pending, { role: "assistant" as const, text: data.text }].slice(-12);
        setTurns(historyRef.current);
      }
      if (data.voiceError) setNotice(data.voiceError);
      if (!data.audioBase64) { finish(); return; }
      const audio = new Audio(`data:${data.audioMimeType || "audio/mpeg"};base64,${data.audioBase64}`);
      setLastAudio(audio.src);
      audioRef.current = audio;
      audio.onplaying = () => { if (controller.signal.aborted) { audio.pause(); return; } showStateRef.current = "speaking"; setShowState("speaking"); };
      audio.onended = finish;
      audio.onerror = () => { setNotice("Audio playback failed. Read the reply below."); finish(); };
      try { await audio.play(); } catch { if (controller.signal.aborted) return; setNotice("Browser blocked automatic playback. Press Play voice below."); finish(); }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setNotice(err instanceof Error ? err.message : "APEX could not process that request.");
      finish();
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    processCommand(chatInput.trim());
    setChatInput("");
    setChatOpen(true);
  };

  useEffect(() => {
    if (!isAwake) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice("Voice input is unavailable in this browser. Use the message box.");
      setChatOpen(true);
      stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = false;
    
    recognition.onresult = async (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      const hasWakeWord = transcript.includes("apex");
      if (hasWakeWord && !busyRef.current) {
        processCommand(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setNotice("Microphone unavailable: " + event.error + ". You can type instead.");
        setChatOpen(true);
        stop();
      }
    };

    recognition.onend = () => {
      if (isAwakeRef.current && showStateRef.current === "listening") {
        try { recognition.start(); } catch (e) {}
      }
    };

    try { recognition.start(); } catch(e) {}

    return () => {
      try { recognition.stop(); } catch (e) {}
    };
  }, [isAwake, language]);

  useEffect(() => () => { if (showTimer.current) clearTimeout(showTimer.current); }, []);

  // Single entry point for opening an agent, shared by the SVG graph and the
  // hidden accessible list, so both routes behave identically.
  const openAgent = (n: NodeSel) => {
    setSelected(n);
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // orb tap cycle → the web's activity level (same states the app streams)
  const webState = orbState === "thinking" ? "processing" : orbState === "speaking" ? "speaking" : "standby";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", userSelect: "none" }}>
      {/* backdrop - the app's EXACT stack (Chat.jsx dark mode): base radial page
          gradient, waves at 0.12, the cyan breathing glow behind the orb, and the
          dark moat disc directly behind the particle cloud that makes it pop. */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 95% 88% at 50% 42%, #122c43 0%, #0c1d30 38%, #07111f 72%, #050b14 100%)",
      }} />

      {/* background waves - the app's WebGL shader at the app's opacity */}
      {!reduced && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <ShaderBackground opacity={0.12} voiceActive={orbState === "speaking"} gold={false} />
        </div>
      )}

      {showHumanoid && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
          <HumanoidFace state={orbState} onComplete={() => setShowHumanoid(false)} />
        </div>
      )}

      {/* cyan LIGHT-CAST - app copy exactly: mixBlendMode screen (only ever LIFTS the
          navy, never darkens), brightens while speaking. The app has NO dark moat disc
          in dark mode - that layer is its light-theme "reactor well" only. */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", mixBlendMode: "screen",
        background: `radial-gradient(circle at 50% 42%, rgba(13,210,255,${orbState === "speaking" ? 0.30 : 0.18}) 0%, rgba(13,170,228,0.08) 30%, rgba(8,17,31,0) 62%)`,
        transition: "background 0.6s ease",
      }} />

      {/* the reasoning web - app z-order: web (z13) sits BELOW the orb canvas (z15),
          so the bloom haze washes over the lines near the centre, exactly like the app */}
      {/* ReasoningWeb is a verbatim copy from the Apex app: its 18 agent nodes are
          imperative SVG hit-areas with no tabindex, inside an svg[role=img] that
          collapses the whole graph into a single image. Rather than edit the copy,
          the graph is marked decorative here and the same onSelect path is exposed
          through the equivalent list of real buttons below. */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>
        <ReasoningWeb
          state={webState}
          mode="full"
          coreless
          onSelect={(n: NodeSel) => { openAgent(n); }}
        />
      </div>

      {/* Keyboard and screen-reader equivalent of the agent graph. */}
      <nav className="visually-hidden" aria-label="Apex agents">
        <ul>
          {ROSTER.map((a) => (
            <li key={a.key}>
              <button type="button" onClick={() => openAgent({ key: a.key, name: a.name, color: a.color })}>
                {a.name} - {INFO[a.key]?.role ?? "Specialist"}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* the core - painted ABOVE the web (app order); display-only, the tap target
          is the circular disc below so agent nodes near the ring stay clickable */}
      <div style={{ position: "absolute", left: "50%", top: "50%", width: "min(560px, 58vw)", height: "min(500px, 56vw, 70vh)", transform: "translate(-50%, -50%)", zIndex: 3, pointerEvents: "none" }}>
        <ApexHeroOrb state={orbState} interactive={false} />
      </div>

      {/* central tap disc - covers the ring only (nodes orbit outside it) */}
      <div
        role="button"
        tabIndex={0}
        aria-label={isAwake || busyRef.current ? "Stop APEX" : "Start listening for Apex"}
        onClick={boost}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); boost(); } }}
        onMouseDown={(e) => e.preventDefault()}
        style={{
          position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          width: "min(340px, 36vw)", height: "min(340px, 36vw)", borderRadius: "50%",
          zIndex: 4, cursor: "pointer", background: "transparent", border: "none", userSelect: "none",
        }}
      />

      {/* equalizer + STANDBY cluster */}
      <OrbStatusBar state={orbState} />

      {/* Chat and Action Controls */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 50, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
        {chatOpen && (
          <section aria-label="APEX conversation" style={{ width: "min(360px, 88vw)", maxHeight: "50vh", overflowY: "auto", padding: 16, borderRadius: 16, background: "rgba(4,8,15,.95)", color: "#d5eaf4", border: "1px solid #176079", fontSize: 13 }}>
            <label>Personality <select aria-label="Personality" value={personality} onChange={e => { const mode = e.target.value as Personality; personalityRef.current = mode; setPersonality(mode); }}>
              {Object.keys(PERSONALITIES).map(mode => <option key={mode} value={mode}>{mode}</option>)}
            </select></label>
            <label style={{ display: "block", marginTop: 8 }}>Voice input <select aria-label="Voice input language" value={language} disabled={isAwake} onChange={e => setLanguage(e.target.value)}><option value="en-US">English</option><option value="ms-MY">Bahasa Melayu</option></select></label>
            <p>Tap the orb, then say “Apex” followed by your request. Tap again to stop.</p>
            <p style={{ opacity: .65 }}>Conversation and drafts · External tools not connected</p>
            <button type="button" onClick={stop}>Stop</button>{" "}
            <button type="button" onClick={() => { stop(); historyRef.current = []; setTurns([]); setLastAudio(null); setNotice(""); }}>Clear conversation</button>
            {lastAudio && <button type="button" onClick={() => {
              if (busyRef.current) return;
              busyRef.current = true;
              showStateRef.current = "speaking"; setShowState("speaking");
              try { recognitionRef.current?.stop(); } catch {}
              const audio = new Audio(lastAudio); audioRef.current = audio;
              audio.onended = finish;
              audio.onerror = () => { setNotice("Playback failed. Check your audio output device."); finish(); };
              audio.play().catch(() => { setNotice("Playback failed. Check your browser sound permissions."); finish(); });
            }}>Play voice</button>}
            {notice && <p role="alert" style={{ color: "#ffd291" }}>{notice}</p>}
            <div aria-live="polite">{turns.map((t, i) => <p key={i} style={{ whiteSpace: "pre-wrap", userSelect: "text" }}><strong>{t.role === "user" ? "You" : "APEX"}: </strong>{t.text}</p>)}</div>
          </section>
        )}
        {chatOpen && (
          <form onSubmit={handleChatSubmit} style={{ 
            display: "flex", 
            background: "rgba(4,8,15,0.85)", 
            backdropFilter: "blur(12px)", 
            border: "1px solid rgba(13,210,255,0.2)", 
            borderRadius: 24,
            padding: "4px 8px 4px 16px",
            width: "min(320px, 80vw)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
          }}>
            <input 
              aria-label="Message APEX"
              maxLength={6000}
              disabled={orbState === "thinking" || orbState === "speaking"}
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              placeholder="Message APEX or ask to see face..." 
              autoFocus
              style={{
                background: "transparent",
                border: "none",
                color: "#f0ede8",
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                outline: "none",
                flex: 1,
                padding: "8px 0"
              }}
            />
            <button type="submit" aria-label="Send message" disabled={orbState === "thinking" || orbState === "speaking"} style={{
              background: "transparent",
              border: "none",
              color: "rgba(13,210,255,0.8)",
              cursor: "pointer",
              padding: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Send size={18} />
            </button>
          </form>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button 
            onClick={() => {
              const next = !showHumanoid;
              setShowHumanoid(next);

            }}
            title="Materialize Neural Humanoid Face"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 14px",
              height: 48,
              borderRadius: 24,
              background: showHumanoid ? "rgba(255,154,60,0.2)" : "rgba(13,210,255,0.12)",
              border: `1px solid ${showHumanoid ? "rgba(255,154,60,0.5)" : "rgba(13,210,255,0.35)"}`,
              color: showHumanoid ? "#ff9a3c" : "rgba(13,210,255,0.95)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = showHumanoid ? "rgba(255,154,60,0.3)" : "rgba(13,210,255,0.22)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = showHumanoid ? "rgba(255,154,60,0.2)" : "rgba(13,210,255,0.12)" }}
          >
            <Eye size={16} />
            <span>{showHumanoid ? "CLOSE FACE" : "SHOW FACE"}</span>
          </button>

          <button 
            aria-label="Toggle conversation"
            onClick={() => setChatOpen(!chatOpen)}
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "rgba(13,210,255,0.1)",
              border: "1px solid rgba(13,210,255,0.3)",
              color: "rgba(13,210,255,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(13,210,255,0.2)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(13,210,255,0.1)" }}
          >
            {chatOpen ? <X size={20} /> : <MessageSquare size={20} />}
          </button>
        </div>
      </div>

      {selected && <AgentOverview sel={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
