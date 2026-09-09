"use client";
import { useEffect, useRef, useState } from "react";
import { X, RotateCcw, Pause, Play } from "lucide-react";
import type { OrbState } from "./ApexHeroOrb";

type Particle = { x: number; y: number; angle: number; radius: number; delay: number; color: string; size: number };
const CYAN = "#57ddff";

// Code-native contours: a scan-line bust with an angular helmet and vented faceplate.
function buildFigure() {
  const c = document.createElement("canvas"); c.width = 700; c.height = 900;
  const g = c.getContext("2d")!;
  const path = (d: string, color = CYAN, width = 1.1) => {
    g.strokeStyle = color; g.lineWidth = width; g.stroke(new Path2D(d));
  };
  // Neck, shoulders and chest sweep outward in nested data contours.
  for (let i = 0; i < 35; i++) {
    const k = i * 4.3;
    path(`M ${251-k*.2} ${454+k*.12} C ${246-k*.2} ${558+k*.6},${263-k*.6} ${570+k},${161-k} ${603+k} C ${63-k*.6} ${630+k},${29-k*.2} ${674+k},${20-k*.2} 891`, i%5===0?"#77eaff":"#24778e", i%5===0?1.9:1);
    path(`M ${449+k*.2} ${454+k*.12} C ${454+k*.2} ${558+k*.6},${437+k*.6} ${570+k},${539+k} ${603+k} C ${637+k*.6} ${630+k},${671+k*.2} ${674+k},${680+k*.2} 891`, i%5===0?"#77eaff":"#24778e", i%5===0?1.9:1);
  }
  for (let i=0;i<19;i++) {
    const y=550+i*15;
    path(`M 258 ${y} Q 350 ${y+115} 442 ${y}`,"#1b7089");
  }
  // Rounded holographic cranium under the faceted armor.
  for (let i=0;i<38;i++) {
    const y=146+i*9;
    const w=137*Math.sqrt(Math.max(.03,1-Math.pow((y-319)/181,2)));
    path(`M ${350-w} ${y} Q 350 ${y-35} ${350+w} ${y}`,i%5===0?"#69dcf8":"#226a80");
  }
  path("M 230 339 C 206 270 220 170 268 131 Q 350 75 432 131 C 480 170 494 270 470 339 L 448 452 L 385 508 L 315 508 L 252 452 Z",CYAN,2.5);
  // Helmet fins, crown, jaw, eye sockets and mouth guard.
  const armor = [
    "M 220 307 L 197 174 L 217 149 L 249 271 L 263 285",
    "M 480 307 L 503 174 L 483 149 L 451 271 L 437 285",
    "M 321 126 L 333 103 L 367 103 L 379 126 L 372 250 L 350 275 L 328 250 Z",
    "M 239 271 L 288 245 L 323 273 L 350 283 L 377 273 L 412 245 L 461 271",
    "M 237 329 L 263 339 L 274 403 L 318 446 L 350 459 L 382 446 L 426 403 L 437 339 L 463 329",
    "M 249 347 L 280 365 L 277 408 L 321 460 L 350 477 L 379 460 L 423 408 L 420 365 L 451 347",
    "M 279 357 L 310 336 L 350 354 L 390 336 L 421 357 L 407 417 L 350 455 L 293 417 Z",
    "M 310 336 L 322 312 L 350 320 L 378 312 L 390 336",
    "M 350 354 L 350 455",
    "M 215 310 L 208 364 L 230 397 L 248 390",
    "M 485 310 L 492 364 L 470 397 L 452 390",
  ];
  armor.forEach(d=>path(d,"#8eeaff",2));
  for(let i=0;i<9;i++) {
    const y=365+i*7;
    path(`M ${289+i*.9} ${y} L 350 ${y+20} L ${411-i*.9} ${y}`,i%3===0?"#ffc078":"#bd692c",1.4);
  }
  // Slender luminous eyes.
  ["M 264 292 L 321 301 L 311 316 L 275 309 Z", "M 436 292 L 379 301 L 389 316 L 425 309 Z"].forEach(d=>{
    g.fillStyle="#b9f6ff";g.fill(new Path2D(d));path(d,"#e1fcff",2);
  });
  for (let side of [-1,1]) for(let i=0;i<4;i++) {
    let x=350+side*(30+i*11);
    path(`M ${x+side*24} 491 L ${x+side*17} 550 L ${x+side*8} 571 L ${x+side*18} 598 L ${x-side*6} 642 L ${350+side*9} 711`,i===0?"#ffd08b":"#ad6932",1.8);
  }
  const pixels=g.getImageData(0,0,700,900).data;
  const particles: Particle[]=[];
  let seed=93;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let y=90;y<890;y+=2) for(let x=4;x<696;x+=2) {
    const p=(y*700+x)*4;
    if(pixels[p+3]<35) continue;
    particles.push({x,y,angle:rand()*Math.PI*2,radius:260+rand()*350,delay:rand()*.28,color:`rgb(${pixels[p]},${pixels[p+1]},${pixels[p+2]})`,size:.55+rand()*.7});
  }
  return { particles, contours:c };
}

export default function HumanoidFace({ onComplete, state="idle" }: {onComplete?:()=>void;state?:OrbState}) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const stateRef=useRef(state); stateRef.current=state;
  const pausedRef=useRef(false);
  const [paused,setPaused]=useState(false);
  const restartRef=useRef(()=>{});
  const [formed,setFormed]=useState(false);
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas) return;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    const {particles,contours}=buildFigure();
    let w=innerWidth,h=innerHeight,raf=0,elapsed=0,previous=performance.now(),complete=false;
    const reduced=matchMedia("(prefers-reduced-motion: reduce)");
    const resize=()=>{w=innerWidth;h=innerHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);};
    resize();addEventListener("resize",resize);
    restartRef.current=()=>{elapsed=0;complete=false;setFormed(false);};
    const render=(now:number)=>{
      if(!pausedRef.current) elapsed+=Math.min(now-previous,50);
      previous=now;
      const t=elapsed/1000;
      const progress=reduced.matches?1:Math.min(t/5.2,1);
      if(progress===1&&!complete){complete=true;setFormed(true);}
      ctx.fillStyle="#010508";ctx.fillRect(0,0,w,h);
      const scale=Math.min(w/760,(h-65)/900);
      const ox=(w-700*scale)/2,oy=(h-900*scale)/2+15;
      ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
      const active=stateRef.current;
      const motion=reduced.matches?0:t;
      // Thin concentric listening rings around the bust.
      for(let i=0;i<6;i++){
        const r=190+i*43+(active==="listening"?Math.sin(motion*1.8-i)*7:0);
        ctx.beginPath();ctx.ellipse(350,345,r,r*.97,0,0,Math.PI*2);
        ctx.strokeStyle=`rgba(48,177,216,${active==="listening"?.14:.055})`;ctx.lineWidth=.65;ctx.stroke();
      }
      ctx.globalCompositeOperation="lighter";
      // Visible spiral streams contract while data settles onto its final contours.
      for(const p of particles){
        const u=Math.max(0,Math.min(1,(progress-p.delay)/(1-p.delay)));
        const blend=u*u*(3-2*u);
        const angle=p.radius*.012+Math.floor(p.angle/(Math.PI*2/3))*(Math.PI*2/3)+p.delay*.8+motion*2.4+(1-blend)*4;
        const r=p.radius*(1-blend*.8);
        const sx=350+Math.cos(angle)*r,sy=410+Math.sin(angle)*r*.63;
        const jitter=progress===1&&!reduced.matches?Math.sin(motion*2+p.angle)*.45:0;
        const x=sx+(p.x-sx)*blend+jitter,y=sy+(p.y-sy)*blend;
        ctx.globalAlpha=.48+blend*.43;ctx.fillStyle=p.color;ctx.fillRect(x,y,p.size,p.size);
      }
      if(progress>.86){
        ctx.globalAlpha=(progress-.86)/.14*.8;ctx.filter="blur(4px)";ctx.drawImage(contours,0,0);
        ctx.filter="none";ctx.globalAlpha=(progress-.86)/.14*.55;ctx.drawImage(contours,0,0);
      }
      ctx.globalAlpha=1;
      // Orange energy glow follows processing/speech, with a restrained idle pulse.
      const energy=active==="speaking"?.7+Math.sin(motion*12)*.2:active==="thinking"?.6+Math.sin(motion*6)*.2:.26;
      const glow=ctx.createRadialGradient(350,388,2,350,388,86);
      glow.addColorStop(0,`rgba(255,145,30,${energy*progress})`);glow.addColorStop(1,"rgba(255,90,0,0)");
      ctx.fillStyle=glow;ctx.fillRect(264,302,172,172);
      // Scattered data points continue orbiting the assembled silhouette.
      for(let i=0;i<110;i++){
        const a=i*2.399+motion*.14,r=185+(i%11)*17;
        ctx.fillStyle=i%9===0?"#d0914b":"#3997b1";ctx.globalAlpha=.2+(i%4)*.1;
        ctx.fillRect(350+Math.cos(a)*r,380+Math.sin(a)*r*1.25,1.1,1.1);
      }
      ctx.restore();raf=requestAnimationFrame(render);
    };
    raf=requestAnimationFrame(render);
    return()=>{cancelAnimationFrame(raf);removeEventListener("resize",resize);};
  },[]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==="Escape")onComplete?.();};addEventListener("keydown",key);return()=>removeEventListener("keydown",key);},[onComplete]);
  const label=!formed?"MATERIALIZING":state==="thinking"?"PROCESSING":state==="speaking"?"SPEAKING":state==="listening"?"LISTENING":"STANDBY";
  const buttonStyle={display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#071922cc",border:"1px solid #235365",borderRadius:8,color:"#b4eaf4",cursor:"pointer",fontSize:11,letterSpacing:1};
  return <div role="dialog" aria-label="APEX particle avatar" style={{position:"fixed",inset:0,background:"#010508",color:"#a6dbe8",fontFamily:"var(--font-mono, monospace)"}}>
    <canvas ref={canvasRef} aria-label="Cyan particle humanoid with angular robot mask, forming from a spiral" style={{width:"100%",height:"100%"}} />
    <div style={{position:"absolute",top:25,left:25,fontSize:11,letterSpacing:3}}>A P E X <span style={{display:"block",fontSize:9,opacity:.45,marginTop:9}}>NEURAL PROJECTION</span></div>
    <button autoFocus onClick={onComplete} style={{...buttonStyle,position:"absolute",top:20,right:20}}><X size={14}/>RETURN TO ORB</button>
    <div role="status" style={{position:"absolute",bottom:85,left:0,right:0,textAlign:"center",fontSize:11,letterSpacing:3,color:formed?"#83d5e9":"#efb46d"}}>STATUS : {label}</div>
    <div style={{position:"absolute",bottom:24,left:0,right:0,display:"flex",justifyContent:"center",gap:10}}>
      <button onClick={()=>restartRef.current()} style={buttonStyle}><RotateCcw size={13}/>REFORM</button>
      <button onClick={()=>{pausedRef.current=!pausedRef.current;setPaused(pausedRef.current);}} style={buttonStyle}>{paused?<Play size={13}/>:<Pause size={13}/>} {paused?"RESUME":"PAUSE"}</button>
    </div>
  </div>;
}
