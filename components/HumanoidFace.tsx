"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
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
  // Smooth cyberpunk shield and tall swept fins, rendered as particle contours.
  const shield = new Path2D("M 241 225 Q 350 129 459 225 L 478 348 Q 467 452 405 497 L 295 497 Q 233 452 222 348 Z");
  g.save(); g.clip(shield);
  for(let y=182;y<506;y+=7) {
    path(`M 210 ${y} Q 350 ${y+22} 490 ${y}`, "#174652", .65);
  }
  for(let i=0;i<7;i++) {
    const x=261+i*28;
    path(`M ${x} 177 Q ${x-26} 312 ${x+8} 492`,i%3===0?"#376b81":"#18323e",1);
  }
  g.restore();
  path("M 241 225 Q 350 129 459 225 L 478 348 Q 467 452 405 497 L 295 497 Q 233 452 222 348 Z", "#66b8ce", 2);
  const panels = [
    "M 238 276 L 174 72 L 193 47 L 222 72 L 283 202 L 296 272 L 259 281 L 261 328 Z",
    "M 462 276 L 526 72 L 507 47 L 478 72 L 417 202 L 404 272 L 441 281 L 439 328 Z",
    "M 185 75 L 243 243 L 277 259 L 259 200 L 215 93",
    "M 515 75 L 457 243 L 423 259 L 441 200 L 485 93",
    "M 240 284 L 223 298 L 216 349 L 238 400",
    "M 460 284 L 477 298 L 484 349 L 462 400",
    "M 240 416 L 267 460 L 303 492 L 350 509 L 397 492 L 433 460 L 460 416",
    "M 280 393 L 291 466 L 317 485 L 383 485 L 409 466 L 420 393",
    "M 323 420 L 333 474 L 367 474 L 377 420",
  ];
  panels.forEach(d=>path(d,"#84cee2",1.6));
  // Side connectors, luminous jaw modules, and fine fin vents.
  for(const side of [-1,1]) {
    const x=(offset:number)=>350+side*offset;
    path(`M ${x(137)} 266 L ${x(154)} 280 L ${x(163)} 346 L ${x(143)} 374`,"#476976",2);
    path(`M ${x(157)} 303 L ${x(174)} 314 L ${x(174)} 376 L ${x(151)} 403`,"#73aabb",1.5);
    path(`M ${x(159)} 386 L ${x(148)} 415 L ${x(130)} 441`,"#9ff1ff",6);
    for(let i=0;i<5;i++) {
      const offset=110+i*6;
      path(`M ${x(offset)} ${175-i*5} L ${x(offset-4)} ${191-i*5} L ${x(offset-8)} ${191-i*5}`,"#68bbd4",1.3);
    }
  }
  // Twin forehead markings and a single continuous curved LED strip.
  path("M 322 191 L 334 227 L 337 216 L 343 244", "#d3f6ff",3.2);
  path("M 378 191 L 366 227 L 363 216 L 357 244", "#d3f6ff",3.2);
  path("M 241 365 Q 350 396 459 365", "#328baf",11);
  path("M 241 365 Q 350 396 459 365", "#bcf7ff",4);
  for (let side of [-1,1]) for(let i=0;i<4;i++) {
    let x=350+side*(30+i*11);
    path(`M ${x+side*24} 491 L ${x+side*17} 550 L ${x+side*8} 571 L ${x+side*18} 598 L ${x-side*6} 642 L ${350+side*9} 711`,i===0?"#ffd08b":"#ad6932",1.8);
  }
  const pixels=g.getImageData(0,0,700,900).data;
  const particles: Particle[]=[];
  let seed=93;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let y=40;y<890;y+=2) for(let x=4;x<696;x+=2) {
    const p=(y*700+x)*4;
    if(pixels[p+3]<35) continue;
    particles.push({x,y,angle:rand()*Math.PI*2,radius:260+rand()*350,delay:rand()*.28,color:`rgb(${pixels[p]},${pixels[p+1]},${pixels[p+2]})`,size:.55+rand()*.7});
  }
  return { particles, contours:c };
}

export default function HumanoidFace({ onComplete, state="idle" }: {onComplete?:()=>void;state?:OrbState}) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const stateRef=useRef(state); stateRef.current=state;
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
    const render=(now:number)=>{
      elapsed+=Math.min(now-previous,50);
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
      // Cyan visor energy follows processing and speech.
      const energy=active==="speaking"?.7+Math.sin(motion*12)*.2:active==="thinking"?.6+Math.sin(motion*6)*.2:.26;
      const glow=ctx.createRadialGradient(350,388,2,350,388,86);
      glow.addColorStop(0,`rgba(45,191,255,${energy*progress})`);glow.addColorStop(1,"rgba(20,120,255,0)");
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
    <canvas ref={canvasRef} aria-label="Cyan particle humanoid with cyberpunk shield mask, forming from a spiral" style={{width:"100%",height:"100%"}} />
    <div style={{position:"absolute",top:25,left:25,fontSize:11,letterSpacing:3}}>A P E X <span style={{display:"block",fontSize:9,opacity:.45,marginTop:9}}>NEURAL PROJECTION</span></div>
    <button autoFocus onClick={onComplete} style={{...buttonStyle,position:"absolute",top:20,right:20}}><X size={14}/>RETURN TO ORB</button>
    <div role="status" style={{position:"absolute",bottom:28,left:0,right:0,textAlign:"center",fontSize:11,letterSpacing:3,color:formed?"#83d5e9":"#efb46d"}}>STATUS : {label}</div>
  </div>;
}
