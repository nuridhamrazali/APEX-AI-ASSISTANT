"use client";

import { useEffect, useRef, useState } from "react";
import { X, RotateCcw, Play, Pause, Activity } from "lucide-react";

export interface HumanoidFaceProps {
  onComplete?: () => void;
}

export default function HumanoidFace({ onComplete }: HumanoidFaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("INITIALIZING");
  const pausedRef = useRef(false);
  const restartTriggerRef = useRef<() => void>(() => {});

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let DPR = Math.min(window.devicePixelRatio || 1, 2);

    let TW = 1024;
    let TH = 478;
    let scale = 1;
    let ox = 0;
    let oy = 0;

    let particles: {
      tx: number;
      ty: number;
      r: number;
      g: number;
      b: number;
      lum: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      ph: number;
      tw: number;
    }[] = [];

    let start = performance.now();
    let animationFrame: number;

    const fit = () => {
      scale = Math.min(W / TW, H / TH);
      ox = (W - TW * scale) / 2;
      oy = (H - TH * scale) / 2;
    };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.floor(W * DPR);
      c.height = Math.floor(H * DPR);
      c.style.width = W + "px";
      c.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      fit();
    };

    window.addEventListener("resize", resize);

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const ease = (t: number) => {
      t = clamp(t, 0, 1);
      return t * t * (3 - 2 * t);
    };

    const isTargetPixel = (r: number, g: number, b: number, a: number) => {
      if (a < 40) return false;
      const max = Math.max(r, g, b);
      if (max < 18) return false;
      const cyan = b > 110 && g > 70 && b >= r * 1.08 && g >= r * 0.9;
      const orange = r > 120 && g > 50 && r >= b * 1.45 && g >= b * 1.08;
      return cyan || orange || max > 170;
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/humanoid.png";

    const buildParticles = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        TW = img.naturalWidth;
        TH = img.naturalHeight;
        fit();
      }

      const off = document.createElement("canvas");
      off.width = TW;
      off.height = TH;
      const o = off.getContext("2d");
      if (!o) return;
      o.drawImage(img, 0, 0, TW, TH);
      const data = o.getImageData(0, 0, TW, TH).data;
      const candidates: [number, number, number, number, number, number][] = [];

      for (let y = 0; y < TH; y++) {
        for (let x = 0; x < TW; x++) {
          const i = (y * TW + x) * 4;
          const r = data[i],
            g = data[i + 1],
            b = data[i + 2],
            a = data[i + 3];
          if (!isTargetPixel(r, g, b, a)) continue;
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          const copies = lum > 0.78 ? 4 : lum > 0.48 ? 2 : 1;
          for (let k = 0; k < copies; k++) candidates.push([x, y, r, g, b, lum]);
        }
      }

      const MAX = 26000;
      const take = Math.min(MAX, candidates.length);
      particles = new Array(take);

      for (let i = 0; i < take; i++) {
        const q = candidates[(Math.random() * candidates.length) | 0];
        const a = Math.random() * Math.PI * 2;
        const rr = Math.min(TW, TH) * (0.18 + Math.random() * 0.7);
        particles[i] = {
          tx: q[0],
          ty: q[1],
          r: q[2],
          g: q[3],
          b: q[4],
          lum: q[5],
          x: TW * 0.5 + Math.cos(a) * rr + (Math.random() - 0.5) * TW * 0.8,
          y: TH * 0.5 + Math.sin(a) * rr + (Math.random() - 0.5) * TH * 0.75,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: q[5] > 0.75 ? 0.8 + Math.random() * 0.9 : 0.35 + Math.random() * 0.9,
          ph: Math.random() * Math.PI * 2,
          tw: 0.75 + Math.random() * 0.65,
        };
      }

      // Bright-pixel reinforcement keeps the fine cyan wireframe crisp.
      for (let y = 0; y < TH; y += 2) {
        for (let x = 0; x < TW; x += 2) {
          const i = (y * TW + x) * 4,
            r = data[i],
            g = data[i + 1],
            b = data[i + 2],
            a = data[i + 3];
          if (a > 40 && Math.max(r, g, b) > 205 && Math.random() < 0.35 && particles.length < 30000) {
            particles.push({
              tx: x,
              ty: y,
              r,
              g,
              b,
              lum: 1,
              x: Math.random() * TW,
              y: Math.random() * TH,
              vx: (Math.random() - 0.5) * 0.4,
              vy: (Math.random() - 0.5) * 0.4,
              size: 0.7 + Math.random() * 1.0,
              ph: Math.random() * Math.PI * 2,
              tw: 0.8 + Math.random() * 0.5,
            });
          }
        }
      }
    };

    const drawParticles = (t: number, stage: number) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        const tx = ox + p.tx * scale,
          ty = oy + p.ty * scale;
        const px = ox + p.x * scale,
          py = oy + p.y * scale;
        const dx = tx - px,
          dy = ty - py;

        const attract = 0.00008 + stage * 0.0029;
        const swirl = 0.055 * (1 - stage * 0.55);

        p.vx += dx * attract + Math.cos(t * 0.0011 + p.ph) * swirl;
        p.vy += dy * attract + Math.sin(t * 0.001 + p.ph) * swirl;
        p.vx *= 0.946;
        p.vy *= 0.946;
        p.x += p.vx + Math.cos(t * 0.0006 + p.ph) * (1 - stage) * 0.9;
        p.y += p.vy + Math.sin(t * 0.0008 + p.ph) * (1 - stage) * 0.7;

        const shimmer = 0.68 + 0.32 * Math.sin(t * 0.002 * p.tw + p.ph);
        const alpha = (0.09 + 0.91 * stage) * shimmer * p.lum;
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
        const s = p.size * (0.65 + 0.35 * stage);
        ctx.fillRect(ox + p.x * scale, oy + p.y * scale, s, s);
      }
      ctx.restore();
    };

    const drawReferenceAssist = (amount: number) => {
      if (amount <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = amount;
      ctx.drawImage(img, ox, oy, TW * scale, TH * scale);
      ctx.restore();
    };

    const drawHUD = (t: number, amount: number, isProcessing: boolean) => {
      if (amount < 0.45) return;
      const x = ox + TW * scale * 0.7;
      const y = oy + TH * scale * 0.255;
      const w = TW * scale * 0.285;
      const h = TH * scale * 0.2;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(65,220,255,${0.36 * amount})`;
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w * 0.68, y + h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 32 * scale, y);
      ctx.lineTo(x + 58 * scale, y - 18 * scale);
      ctx.lineTo(x + 93 * scale, y - 18 * scale);
      ctx.strokeStyle = `rgba(65,220,255,${0.26 * amount})`;
      ctx.stroke();

      const q = (t * 0.00012) % 1;
      ctx.beginPath();
      ctx.moveTo(x + q * w, y + h * 0.66);
      ctx.lineTo(x + q * w + 56 * scale, y + h * 0.66);
      ctx.strokeStyle = `rgba(115,232,255,${0.82 * amount})`;
      ctx.stroke();

      ctx.font = `${Math.max(13, Math.floor(22 * scale))}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = `rgba(165,240,255,${0.95 * amount})`;
      ctx.fillText(isProcessing ? "STATUS : PROCESSING" : "STATUS : INITIALIZING", x + 17 * scale, y + h * 0.54);
      ctx.restore();
    };

    const render = (now: number) => {
      if (!pausedRef.current) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        const duration = 14000;
        const u = clamp((now - start) / duration, 0, 1);
        let stage: number;
        if (u < 0.12) stage = ease(u / 0.12) * 0.02;
        else if (u < 0.25) stage = 0.02 + ease((u - 0.12) / 0.13) * 0.16;
        else if (u < 0.43) stage = 0.18 + ease((u - 0.25) / 0.18) * 0.3;
        else if (u < 0.61) stage = 0.48 + ease((u - 0.43) / 0.18) * 0.29;
        else if (u < 0.77) stage = 0.77 + ease((u - 0.61) / 0.16) * 0.18;
        else if (u < 0.86) stage = 0.95 + ease((u - 0.77) / 0.09) * 0.05;
        else stage = 1;

        if (stage >= 0.86) {
          setCurrentStatus("PROCESSING");
        } else {
          setCurrentStatus("INITIALIZING");
        }

        drawParticles(now, stage);

        // At the very end, microscopic image-derived assist overlay
        const assist = stage > 0.88 ? ((stage - 0.88) / 0.12) * 0.16 : 0;
        drawReferenceAssist(assist);

        drawHUD(now, stage, stage >= 0.86);
      }
      animationFrame = requestAnimationFrame(render);
    };

    restartTriggerRef.current = () => {
      start = performance.now();
      for (const p of particles) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.min(TW, TH) * (0.18 + Math.random() * 0.7);
        p.x = TW * 0.5 + Math.cos(a) * rr + (Math.random() - 0.5) * TW * 0.8;
        p.y = TH * 0.5 + Math.sin(a) * rr + (Math.random() - 0.5) * TH * 0.75;
        p.vx = (Math.random() - 0.5) * 0.5;
        p.vy = (Math.random() - 0.5) * 0.5;
      }
    };

    img.onload = () => {
      resize();
      buildParticles();
      animationFrame = requestAnimationFrame(render);
    };

    if (img.complete && img.naturalWidth > 0) {
      resize();
      buildParticles();
      animationFrame = requestAnimationFrame(render);
    }

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  const handleRestart = () => {
    restartTriggerRef.current();
  };

  const handleTogglePause = () => {
    pausedRef.current = !pausedRef.current;
    setIsPaused(pausedRef.current);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "#000",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", display: "block", background: "#000" }} />

      {/* Top HUD return bar */}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 18,
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 10,
        }}
      >
        <button
          onClick={onComplete}
          style={{
            background: "rgba(0,12,20,.82)",
            color: "#a8efff",
            border: "1px solid rgba(60,215,255,.42)",
            padding: "8px 15px",
            borderRadius: "4px",
            letterSpacing: "1.4px",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "var(--font-mono, monospace)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            backdropFilter: "blur(8px)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,35,50,.95)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,12,20,.82)")}
        >
          <X size={14} />
          <span>RETURN TO ORB</span>
        </button>
      </div>

      {/* Bottom UI controls exactly matching the provided script buttons */}
      <div
        style={{
          position: "fixed",
          left: 18,
          bottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 8,
          zIndex: 10,
        }}
      >
        <button
          id="restart"
          onClick={handleRestart}
          style={{
            background: "rgba(0,12,20,.72)",
            color: "#a8efff",
            border: "1px solid rgba(60,215,255,.42)",
            padding: "8px 13px",
            borderRadius: "4px",
            letterSpacing: "1.4px",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "var(--font-mono, monospace)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,35,50,.9)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,12,20,.72)")}
        >
          <RotateCcw size={12} />
          <span>RESTART</span>
        </button>

        <button
          id="pause"
          onClick={handleTogglePause}
          style={{
            background: "rgba(0,12,20,.72)",
            color: "#a8efff",
            border: "1px solid rgba(60,215,255,.42)",
            padding: "8px 13px",
            borderRadius: "4px",
            letterSpacing: "1.4px",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "var(--font-mono, monospace)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,35,50,.9)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,12,20,.72)")}
        >
          {isPaused ? <Play size={12} /> : <Pause size={12} />}
          <span>{isPaused ? "RESUME" : "PAUSE"}</span>
        </button>
      </div>
    </div>
  );
}
